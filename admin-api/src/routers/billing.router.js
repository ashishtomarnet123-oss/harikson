import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import Razorpay from "razorpay";
import pool from "../db.js";
import redis from "../redis.js";
import logger from "../utils/logger.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { validate } from "../middleware/validation.middleware.js";
import { taxRateSchema } from "../validators/admin.schema.js";
import { sanitizeCsvCell } from "../utils/csv.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { sendInvoiceReceipt } from "../services/email.js";
import { createInvoice, recordInvoice } from "../services/invoiceService.js";
import {
  recordWebhookReceived,
  recordSignatureFailure,
  recordLookupFailure,
  recordDuplicateDelivery,
  recordRetryAttempt,
  recordReconciliationMismatch,
  recordStateTransitionFailure,
  recordDbTransactionFailure,
  recordProcessingDuration,
  getBillingMetricsPrometheusText,
} from "../services/billingMetrics.js";
import { encryptText, decryptText } from "../utils/paymentCrypto.js";

const router = express.Router();
router.get('/api/user/billing', (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}, async (req, res) => {
  let tenantSlug = req.headers['x-tenant-slug'] || 'system';
  if (['system', 'app', 'alphatech'].includes(tenantSlug.toLowerCase())) {
    tenantSlug = 'default';
  }
  try {
    // Join tenant → plan to get full plan details (case-insensitive join)
    const result = await pool.query(
      `
      SELECT
        t.id         AS tenant_id,
        t.name       AS tenant_name,
        t.plan       AS plan_id,
        t.status     AS tenant_status,
        p.name       AS plan_name,
        p.tier,
        p.price,
        p.billing    AS billing_cycle,
        p.currency,
        p.token_limit,
        p.tenant_limit,
        p.agent_limit,
        p.model_access,
        p.features,
        p.description
      FROM tenants t
      LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
      WHERE t.slug = $1
      LIMIT 1
    `,
      [tenantSlug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const row = result.rows[0];

    // Query active/latest subscription for this tenant
    const subRes = await pool.query(
      `
      SELECT * FROM subscriptions
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [row.tenant_id]
    );

    let subscriptionStatus =
      row.tenant_status === 'suspended' ? 'SUSPENDED' : 'ACTIVE';
    let paymentMethod = null;
    let priceNum = parseFloat(row.price) || 0;

    if (subRes.rows.length > 0) {
      const sub = subRes.rows[0];
      subscriptionStatus = sub.status.toUpperCase();
      priceNum = parseFloat(sub.amount) || priceNum;

      // Parse payment method from subscription metadata if available, e.g. Stripe card details
      if (sub.metadata && typeof sub.metadata === 'object') {
        paymentMethod = sub.metadata.payment_method || null;
      }
    }

    // Query invoices for this tenant
    const invRes = await pool.query(
      `
      SELECT id, amount, currency, status, created_at, paid_at, invoice_url, pdf_url
      FROM invoices
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `,
      [row.tenant_id]
    );

    const invoices = invRes.rows.map((inv) => {
      const invAmount = parseFloat(inv.amount) || 0;
      const currencySymbol = inv.currency === 'INR' ? '₹' : '$';
      const invAmountFormatted = `${currencySymbol}${invAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      return {
        id: inv.id,
        date: new Date(inv.created_at).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        amount: invAmountFormatted,
        status: inv.status.toUpperCase(),
        invoiceUrl: inv.invoice_url,
        pdfUrl: inv.pdf_url,
      };
    });

    // Format price as ₹X,XXX.XX or $X.XX
    const currencySymbol = row.currency === 'INR' ? '₹' : '$';
    const priceFormatted = `${currencySymbol}${priceNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    res.status(200).json({
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      planId: row.plan_id,
      planName: row.plan_name ? `${row.plan_name} Plan` : 'Starter Plan',
      tier: row.tier,
      price: priceFormatted,
      priceRaw: priceNum,
      billingCycle: row.billing_cycle || 'monthly',
      currency: row.currency || 'INR',
      tokenLimit: row.token_limit,
      tenantLimit: row.tenant_limit,
      agentLimit: row.agent_limit,
      modelAccess: row.model_access || [],
      features: row.features || {},
      description: row.description || '',
      status: subscriptionStatus,
      paymentMethod,
      invoices,
    });
  } catch (err) {
    logger.error('User billing fetch failed:', err);
    res.status(500).json({ error: 'Failed to load billing information' });
  }
});


// GET /admin/tax-rates - List all tax rates and monthly collections summary
router.get(['/admin/tax-rates', '/v1/admin/tax-rates'], adminAuth, async (req, res) => {
  try {
    const ratesRes = await pool.query(
      'SELECT * FROM tax_rates ORDER BY country_code ASC, region_code ASC NULLS FIRST'
    );

    const summaryRes = await pool.query(`
      SELECT
        COALESCE(tr.country_code, 'IN') as country_code,
        COALESCE(tr.tax_name, 'GST') as tax_name,
        COUNT(i.id)::int as total_invoices,
        COALESCE(SUM(i.subtotal), 0)::numeric(10,2) as total_subtotal,
        COALESCE(SUM(i.tax_amount), 0)::numeric(10,2) as total_tax_collected,
        COALESCE(SUM(i.total), 0)::numeric(10,2) as total_revenue
      FROM invoices i
      LEFT JOIN tax_rates tr ON i.tax_rate_id = tr.id
      WHERE i.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY tr.country_code, tr.tax_name
    `);

    res.status(200).json({
      success: true,
      taxRates: ratesRes.rows,
      summary30Days: summaryRes.rows,
    });
  } catch (err) {
    logger.error('Fetch tax rates error:', err);
    res.status(500).json({ error: 'Failed to fetch tax rates' });
  }
});

// POST /admin/tax-rates - Create or update tax rate
router.post(['/admin/tax-rates', '/v1/admin/tax-rates'], adminAuth, validate(taxRateSchema), async (req, res) => {
  try {
    const { country_code, region_code, tax_name, rate_percent, type, hsn_code, is_active, id } = req.body;
    if (!country_code || !tax_name || rate_percent === undefined) {
      return res.status(400).json({ error: 'country_code, tax_name, and rate_percent are required' });
    }

    if (id) {
      const updateRes = await pool.query(
        `UPDATE tax_rates
         SET country_code = $1, region_code = $2, tax_name = $3, rate_percent = $4,
             type = $5, hsn_code = $6, is_active = $7
         WHERE id = $8
         RETURNING *`,
        [country_code, region_code || null, tax_name, rate_percent, type || 'gst', hsn_code || '998315', is_active !== false, id]
      );
      return res.status(200).json({ success: true, taxRate: updateRes.rows[0] });
    }

    const insertRes = await pool.query(
      `INSERT INTO tax_rates (country_code, region_code, tax_name, rate_percent, type, hsn_code, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [country_code, region_code || null, tax_name, rate_percent, type || 'gst', hsn_code || '998315', is_active !== false]
    );

    res.status(201).json({ success: true, taxRate: insertRes.rows[0] });
  } catch (err) {
    logger.error('Save tax rate error:', err);
    res.status(500).json({ error: 'Failed to save tax rate' });
  }
});

// GET /admin/reports/gstr1 - Export GSTR-1 Outward Supplies Report CSV
router.get(['/admin/reports/gstr1', '/v1/admin/reports/gstr1'], adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id as invoice_id,
        t.name as customer_name,
        t.id as tenant_id,
        i.created_at::date as invoice_date,
        COALESCE(i.hsn_code, '998315') as hsn_sac_code,
        'Online Information and Database Access or Retrieval Services (OIDAR)' as description,
        COALESCE(i.subtotal, 0) as taxable_value,
        COALESCE(tr.rate_percent, 18.00) as gst_rate_percent,
        COALESCE(i.tax_amount, 0) as total_tax_amount,
        ROUND(COALESCE(i.tax_amount, 0) / 2, 2) as cgst_amount,
        ROUND(COALESCE(i.tax_amount, 0) / 2, 2) as sgst_amount,
        COALESCE(i.total, 0) as total_invoice_value
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN tax_rates tr ON i.tax_rate_id = tr.id
      WHERE i.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY i.created_at DESC
    `);

    let csvContent = 'Invoice ID,Customer Name,Invoice Date,HSN/SAC Code,Description,Taxable Value (INR),GST Rate (%),CGST (INR),SGST (INR),Total Tax (INR),Invoice Total (INR)\n';
    for (const row of result.rows) {
      csvContent += `"${sanitizeCsvCell(row.invoice_id)}","${sanitizeCsvCell(row.customer_name)}","${sanitizeCsvCell(row.invoice_date)}","${sanitizeCsvCell(row.hsn_sac_code)}","${sanitizeCsvCell(row.description)}",${row.taxable_value},${row.gst_rate_percent},${row.cgst_amount},${row.sgst_amount},${row.total_tax_amount},${row.total_invoice_value}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="GSTR1_Outward_Supplies_Report.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    logger.error('GSTR-1 report export error:', err);
    res.status(500).json({ error: 'Failed to generate GSTR-1 report' });
  }
});

// POST /admin/cleanup - Manual Trigger Database Cleanup (Admin only)
// Delegates to tenant-api, which already owns this logic (its scheduler runs
// the same executeDatabaseCleanup() on a cron) — this used to reach directly
// into tenant-api's build output (../../harikson/tenant-api/dist/...), which

router.post('/admin/billing/invoices/:id/resend', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoiceRow = invRes.rows[0];
    const userRes = await pool.query(
      `SELECT email, name FROM users
       WHERE tenant_id = $1
       ORDER BY role = 'admin' DESC, created_at ASC
       LIMIT 1`,
      [invoiceRow.tenant_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'No user email associated with this tenant' });
    }

    const recipientEmail = userRes.rows[0].email;
    const emailResult = await sendInvoiceReceipt(recipientEmail, {
      id: invoiceRow.id,
      amount: invoiceRow.amount,
      currency: invoiceRow.currency,
      status: invoiceRow.status,
      invoice_url: invoiceRow.invoice_url,
      pdf_url: invoiceRow.pdf_url,
      provider: invoiceRow.provider,
      provider_invoice_id: invoiceRow.provider_invoice_id,
    });

    if (!emailResult.success) {
      return res.status(500).json({ error: emailResult.error || 'Failed to resend invoice email' });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice receipt resent successfully',
      email: recipientEmail,
    });
  } catch (err) {
    logger.error('Resend invoice error:', err);
    res.status(500).json({ error: 'Failed to resend invoice', message: err.message });
  }
});

// 12. GET /admin/billing/reconciliation
router.get('/admin/billing/reconciliation', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.name as tenant, i.provider_invoice_id, i.provider_invoice_id as razorpay_id, i.amount, i.status,
             i.provider, i.created_at
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      ORDER BY i.created_at DESC LIMIT 50
    `);
    res.status(200).json({ billing: result.rows });
  } catch (err) {
    logger.error('Billing reconciliation fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch billing reconciliation data' });
  }
});

// 13. GET /admin/logs/requests

router.post('/admin/billing/providers', adminAuth, async (req, res) => {
  const {
    provider,
    name,
    api_key,
    api_secret,
    webhook_secret,
    merchant_id,
    is_test_mode,
  } = req.body;
  if (!provider || !api_key) {
    return res
      .status(400)
      .json({ error: 'provider and api_key are required' });
  }
  if (provider !== 'stripe' && provider !== 'razorpay' && provider !== 'phonepe' && provider !== 'cashfree' && provider !== 'neuracollect') {
    return res
      .status(400)
      .json({ error: 'Invalid provider. Must be razorpay, stripe, phonepe, cashfree, or neuracollect.' });
  }

  try {
    // 1. Perform validation test calls to verify credentials before saving
    if (provider === 'razorpay') {
      try {
        const client = new Razorpay({
          key_id: api_key,
          key_secret: api_secret,
        });
        await client.orders.all({ count: 1 });
      } catch (err) {
        if (err.statusCode && err.statusCode === 401) {
          return res
            .status(400)
            .json({ error: 'Invalid Razorpay Credentials' });
        }
      }
    } else if (provider === 'stripe') {
      try {
        const stripeClient = new Stripe(api_secret || api_key);
        await stripeClient.accounts.retrieve();
      } catch (err) {
        return res
          .status(400)
          .json({ error: `Invalid Stripe Credentials: ${err.message}` });
      }
    } else if (provider === 'phonepe') {
      if (!merchant_id) {
        return res.status(400).json({ error: 'merchant_id (PhonePe Merchant ID) is required' });
      }
      if (!api_key) {
        return res.status(400).json({ error: 'api_key (PhonePe Salt Index, e.g. 1) is required' });
      }
      if (!api_secret) {
        return res.status(400).json({ error: 'api_secret (PhonePe Salt Key) is required' });
      }
      try {
        const testPayload = JSON.stringify({ ping: true });
        const b64 = Buffer.from(testPayload).toString('base64');
        const checksum = crypto.createHash('sha256').update(b64 + '/pg/v1/pay' + api_secret).digest('hex') + '###' + api_key;
        if (!checksum.includes('###')) {
          throw new Error('Checksum generation failed');
        }
      } catch (err) {
        return res.status(400).json({ error: `Invalid PhonePe configuration: ${err.message}` });
      }
    } else if (provider === 'neuracollect') {
      if (!api_key || api_key.trim().length < 5) {
        return res.status(400).json({ error: 'Valid NeuraCollect API Key (x-collect-api-key) is required' });
      }
    }

    // 2. Encrypt credentials at rest
    const encryptedKey = encryptText(api_key);
    const encryptedSecret = encryptText(api_secret || webhook_secret || api_key);
    const encryptedWebhookSecret = webhook_secret
      ? encryptText(webhook_secret)
      : (api_secret ? encryptText(api_secret) : null);

    // Set other provider configurations to inactive
    await pool.query(
      'UPDATE payment_providers SET is_active = false WHERE provider = $1',
      [provider]
    );

    const result = await pool.query(
      `INSERT INTO payment_providers (provider, name, api_key_encrypted, api_secret_encrypted, webhook_secret_encrypted, merchant_id, is_active, is_test_mode, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
       RETURNING id, provider, name, is_active, is_test_mode, created_at`,
      [
        provider,
        name || `${provider.toUpperCase()} Merchant`,
        encryptedKey,
        encryptedSecret,
        encryptedWebhookSecret,
        merchant_id,
        is_test_mode !== false,
        req.admin.id,
      ]
    );

    const inserted = result.rows[0];
    await logAdminAction(
      req.admin.id,
      'create_payment_provider',
      'payment_provider',
      inserted.id,
      null,
      { provider, name },
      req
    );

    res.status(201).json({ success: true, provider: inserted });
  } catch (err) {
    logger.error('Failed to create payment provider:', err);
    res.status(500).json({ error: 'Failed to configure payment merchant' });
  }
});

// 24. GET /admin/billing/providers (list payment providers)
router.get('/admin/billing/providers', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_providers WHERE is_active = true ORDER BY created_at DESC'
    );
    const providers = result.rows.map((p) => {
      const keyDecrypted = decryptText(p.api_key_encrypted) || '';
      const secretDecrypted = decryptText(p.api_secret_encrypted) || '';
      return {
        id: p.id,
        provider: p.provider,
        name: p.name,
        merchant_id: p.merchant_id,
        is_active: p.is_active,
        is_test_mode: p.is_test_mode,
        created_at: p.created_at,
        api_key_masked: keyDecrypted.substring(0, 8) + '****',
        api_secret_masked: secretDecrypted.substring(0, 8) + '****',
      };
    });
    res.status(200).json({ providers });
  } catch (err) {
    logger.error('Failed to list payment providers:', err);
    res.status(500).json({ error: 'Failed to list payment configurations' });
  }
});

// 24b. PUT /admin/billing/providers/:id (update payment provider)
router.put('/admin/billing/providers/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const {
    provider,
    name,
    api_key,
    api_secret,
    webhook_secret,
    merchant_id,
    is_test_mode,
  } = req.body;

  try {
    const existingRes = await pool.query(
      'SELECT * FROM payment_providers WHERE id = $1',
      [id]
    );
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Provider configuration not found' });
    }
    const existing = existingRes.rows[0];

    // Encrypt new credentials if provided, otherwise preserve existing
    let encryptedKey = existing.api_key_encrypted;
    if (api_key && api_key.trim() && !api_key.includes('****')) {
      encryptedKey = encryptText(api_key.trim());
    }

    let encryptedSecret = existing.api_secret_encrypted;
    if (api_secret && api_secret.trim() && !api_secret.includes('****')) {
      encryptedSecret = encryptText(api_secret.trim());
    }

    let encryptedWebhookSecret = existing.webhook_secret_encrypted;
    if (webhook_secret && webhook_secret.trim() && !webhook_secret.includes('****')) {
      encryptedWebhookSecret = encryptText(webhook_secret.trim());
    }

    const updatedProvider = provider || existing.provider;
    const updatedName = name || existing.name;
    const updatedMerchantId = merchant_id !== undefined ? merchant_id : existing.merchant_id;
    const updatedTestMode = is_test_mode !== undefined ? is_test_mode : existing.is_test_mode;

    const result = await pool.query(
      `UPDATE payment_providers
       SET provider = $1, name = $2, api_key_encrypted = $3, api_secret_encrypted = $4,
           webhook_secret_encrypted = $5, merchant_id = $6, is_test_mode = $7, is_active = true
       WHERE id = $8
       RETURNING id, provider, name, merchant_id, is_active, is_test_mode, created_at`,
      [
        updatedProvider,
        updatedName,
        encryptedKey,
        encryptedSecret,
        encryptedWebhookSecret,
        updatedMerchantId,
        updatedTestMode,
        id,
      ]
    );

    const updated = result.rows[0];
    await logAdminAction(
      req.admin.id,
      'update_payment_provider',
      'payment_provider',
      id,
      existing,
      updated,
      req
    );

    res.status(200).json({ success: true, provider: updated });
  } catch (err) {
    logger.error('Failed to update payment provider:', err);
    res.status(500).json({ error: 'Failed to update payment merchant' });
  }
});

// 25. DELETE /admin/billing/providers/:id (deactivate provider)
router.delete('/admin/billing/providers/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE payment_providers SET is_active = false WHERE id = $1 RETURNING id, provider, name',
      [id]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Provider configuration not found' });
    }
    await logAdminAction(
      req.admin.id,
      'deactivate_payment_provider',
      'payment_provider',
      id,
      result.rows[0],
      null,
      req
    );
    res
      .status(200)
      .json({ success: true, message: 'Provider de-activated successfully' });
  } catch (err) {
    logger.error('Failed to deactivate provider:', err);
    res.status(500).json({ error: 'Failed to disable payment provider' });
  }
});

// 26. POST /webhooks/stripe (Stripe webhooks receiver)
router.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const payload = req.rawBody;

  try {
    const providerRes = await pool.query(
      "SELECT * FROM payment_providers WHERE provider = 'stripe' AND is_active = true LIMIT 1"
    );
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'No active payment provider configured' });
    }
    const provider = providerRes.rows[0];
    const webhookSecret = decryptText(provider.webhook_secret_encrypted);

    // Verify Stripe-Signature timestamp is within 5 minutes (300 seconds)
    if (sig) {
      const match = sig.match(/t=(\d+)/);
      if (match) {
        const timestamp = parseInt(match[1], 10);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - timestamp) > 300) {
          logger.error('Stripe webhook timestamp is older than 5 minutes');
          return res.status(400).json({ error: 'Webhook timestamp expired' });
        }
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid Stripe signature format' });
      }
    } else {
      return res
        .status(400)
        .json({ error: 'Stripe-Signature header is missing' });
    }

    let event;
    let stripeInstance;
    try {
      stripeInstance = new Stripe(
        decryptText(provider.api_secret_encrypted)
      );
      event = stripeInstance.webhooks.constructEvent(
        payload,
        sig,
        webhookSecret
      );
    } catch (err) {
      logger.error('Stripe signature failed:', err.message);
      await pool.query(
        `INSERT INTO payment_webhooks (event_id, provider_id, provider, event_type, status, amount, signature_verified, processing_error, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'sig_fail_' + Date.now(),
          provider.id,
          'stripe',
          'signature_failed',
          'failed',
          0,
          false,
          'Stripe signature error: ' + err.message,
          JSON.stringify({ error: err.message }),
        ]
      );
      return res.status(400).json({ error: 'Invalid Stripe signature' });
    }

    const eventId = event.id;
    const eventObj = event.data.object;
    const amount = eventObj.amount_due
      ? eventObj.amount_due / 100
      : eventObj.amount
        ? eventObj.amount / 100
        : 0;
    let rawCurrency = eventObj.currency || eventObj.items?.data?.[0]?.price?.currency || eventObj.plan?.currency;
    if (!rawCurrency) {
      try {
        const targetPiId = eventObj.payment_intent || (eventObj.object === 'payment_intent' ? eventObj.id : null);
        if (targetPiId && stripeInstance?.paymentIntents?.retrieve) {
          const pi = await stripeInstance.paymentIntents.retrieve(targetPiId);
          if (pi && pi.id === targetPiId && pi.currency) {
            const piAmount = pi.amount ? pi.amount / 100 : 0;
            if (amount === 0 || Math.abs(amount - piAmount) < 0.01) {
              rawCurrency = pi.currency;
            }
          }
        } else if (eventObj.invoice && stripeInstance?.invoices?.retrieve) {
          const inv = await stripeInstance.invoices.retrieve(eventObj.invoice);
          if (inv && inv.id === eventObj.invoice && inv.currency) {
            rawCurrency = inv.currency;
          }
        }
      } catch (lookupErr) {
        logger.warn(`[WEBHOOK] Stripe authoritative lookup failed for ${eventId}: ${lookupErr.message}`);
      }
    }

    // Extract tenant_id from metadata
    const tenantId = eventObj.metadata?.tenant_id || null;
    let tenantName = 'System';
    if (tenantId) {
      const tRes = await pool.query('SELECT name FROM tenants WHERE id = $1', [
        tenantId,
      ]);
      if (tRes.rows.length > 0) tenantName = tRes.rows[0].name;
    }

    let unresolvedReason = null;
    if (!rawCurrency) {
      unresolvedReason = `Missing currency in Stripe event ${eventId} and authoritative lookup unavailable`;
    } else if (String(rawCurrency).toUpperCase() !== 'INR' && String(rawCurrency).toUpperCase() !== 'USD') {
      unresolvedReason = `Unsupported currency '${String(rawCurrency).toUpperCase()}' rejected. Platform supports INR and international USD.`;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Concurrency-safe atomic insert or row lock
      const lockRes = await client.query(
        `INSERT INTO payment_webhooks (event_id, provider_id, provider, event_type, status, amount, tenant_name, payload, signature_verified, processed_at)
         VALUES ($1, $2, 'stripe', $3, 'pending', $4, $5, $6, true, NOW())
         ON CONFLICT (event_id, provider) DO UPDATE SET
           processed_at = NOW()
         RETURNING id, status`,
        [
          eventId,
          provider.id,
          event.type,
          amount,
          tenantName,
          JSON.stringify(event),
        ]
      );

      const existingStatus = lockRes.rows[0].status;

      // 1. If already processed, acknowledge idempotent replay safely without side-effects
      if (existingStatus === 'processed') {
        await client.query('COMMIT');
        logger.info(`[WEBHOOK] Stripe event ${eventId} has already been processed.`);
        return res.status(200).json({ status: 'already_processed' });
      }

      // 2. If unresolved (missing or non-INR currency), durably preserve as 'unresolved'
      if (unresolvedReason) {
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'unresolved',
               processing_error = $1,
               amount = $2,
               tenant_name = COALESCE($3, tenant_name),
               payload = $4,
               processed_at = NOW()
           WHERE id = $5`,
          [unresolvedReason, amount, tenantName, JSON.stringify(event), lockRes.rows[0].id]
        );
        await client.query('COMMIT');
        logger.warn(`[WEBHOOK] Stripe event ${eventId} durably preserved with status='unresolved': ${unresolvedReason}`);
        return res.status(200).json({
          status: 'unresolved',
          event_id: eventId,
          reason: unresolvedReason,
          message: 'Event durably stored with unresolved currency for manual or automated reconciliation',
        });
      }

      // 3. Currency is verified INR
      const currency = String(rawCurrency).toUpperCase();

      // Business Logic processing within transaction
      if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated'
      ) {
        const subId = eventObj.id;
        const plan = eventObj.metadata?.plan || 'starter';
        let rawPlanId = String(plan).trim().toLowerCase();
        if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
        else if (rawPlanId === 'pro') rawPlanId = 'professional';

        const planCheck = await client.query('SELECT id, name FROM plans WHERE LOWER(id) = $1 AND is_active = true', [rawPlanId]);
        if (planCheck.rows.length === 0) {
          logger.warn(`[WEBHOOK WARNING] Plan '${rawPlanId}' not found in active plans table.`);
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Unknown or inactive plan: ${rawPlanId}` });
        }
        const planId = planCheck.rows[0].id;

        const subStatus =
          eventObj.status === 'active'
            ? 'active'
            : eventObj.status === 'canceled'
              ? 'cancelled'
              : 'paused';
        const start = new Date(eventObj.current_period_start * 1000);
        const end = new Date(eventObj.current_period_end * 1000);

        if (tenantId) {
          await client.query(
            `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, current_period_start, current_period_end, amount, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
               status = EXCLUDED.status,
               current_period_start = EXCLUDED.current_period_start,
               current_period_end = EXCLUDED.current_period_end,
               amount = EXCLUDED.amount,
               updated_at = NOW()`,
            [
              tenantId,
              'stripe',
              subId,
              planId,
              subStatus,
              start,
              end,
              amount,
              currency,
            ]
          );
          await client.query('UPDATE tenants SET plan = $1 WHERE id = $2', [
            planId,
            tenantId,
          ]);
        }
      } else if (
        event.type === 'invoice.paid' ||
        event.type === 'invoice.payment_succeeded' ||
        event.type === 'checkout.session.completed' ||
        event.type === 'payment_intent.succeeded'
      ) {
        const invId = eventObj.id;
        const invoiceUrl = eventObj.hosted_invoice_url || null;
        const pdfUrl = eventObj.invoice_pdf || null;
        const subId = eventObj.subscription || eventObj.id;

        if (tenantId) {
          const subRes = await client.query(
            'SELECT id FROM subscriptions WHERE provider_subscription_id = $1',
            [subId]
          );
          const subscriptionUuid =
            subRes.rows.length > 0 ? subRes.rows[0].id : null;

          await createInvoice(
            {
              tenantId,
              subscriptionId: subscriptionUuid,
              provider: 'stripe',
              providerInvoiceId: invId,
              amount,
              currency,
              status: 'paid',
              paidAt: new Date(),
              invoiceUrl,
              pdfUrl,
              planName: 'Enterprise AI OS Plan',
            },
            client
          );
        }
      } else if (
        event.type === 'invoice.payment_failed' ||
        event.type === 'payment_intent.payment_failed'
      ) {
        if (tenantId) {
          await client.query(
            "UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE tenant_id = $1",
            [tenantId]
          );
          await client.query(
            "UPDATE tenants SET status = 'past_due' WHERE id = $1",
            [tenantId]
          );
        }
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'failed',
               processing_error = $1,
               amount = $2,
               tenant_name = COALESCE($3, tenant_name),
               payload = $4,
               processed_at = NOW()
           WHERE id = $5`,
          ['Payment failed at provider', amount, tenantName, JSON.stringify(event), lockRes.rows[0].id]
        );
        await client.query('COMMIT');
        return res.status(200).json({ status: 'failed', event_id: eventId });
      }

      // 4. Atomically transition webhook record to 'processed'
      await client.query(
        `UPDATE payment_webhooks
         SET status = 'processed',
             processing_error = NULL,
             amount = $1,
             tenant_name = COALESCE($2, tenant_name),
             payload = $3,
             processed_at = NOW()
         WHERE id = $4`,
        [amount, tenantName, JSON.stringify(event), lockRes.rows[0].id]
      );

      await client.query('COMMIT');
      return res.status(200).json({ status: 'processed', event_id: eventId });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('Stripe webhook transaction failed:', txErr);
      return res.status(500).json({ error: 'Database transaction failed: ' + txErr.message });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Stripe webhook handling failed:', err);
    res.status(500).json({ error: 'Internal webhook failure' });
  }
});

// 27. POST /webhooks/razorpay (Razorpay webhooks receiver)
router.post('/webhooks/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] || '';
  const payload = req.rawBody;

  try {
    const providerRes = await pool.query(
      "SELECT * FROM payment_providers WHERE provider = 'razorpay' AND is_active = true LIMIT 1"
    );
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'No active payment provider configured' });
    }
    const provider = providerRes.rows[0];
    const webhookSecret = decryptText(provider.webhook_secret_encrypted);

    let isVerified = false;
    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const a = Buffer.from(expectedSignature);
      const b = Buffer.from(signature);
      if (a.length === b.length) {
        isVerified = crypto.timingSafeEqual(a, b);
      }
    } catch (err) {
      isVerified = false;
    }

    if (!isVerified) {
      logger.error('Razorpay signature mismatch');
      await pool.query(
        `INSERT INTO payment_webhooks (event_id, provider_id, provider, event_type, status, amount, signature_verified, processing_error, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'sig_fail_' + Date.now(),
          provider.id,
          'razorpay',
          'signature_failed',
          'failed',
          0,
          false,
          'Razorpay webhook signature verification failed',
          payload.toString(),
        ]
      );
      return res.status(400).json({ error: 'Invalid Razorpay signature' });
    }

    const eventData = JSON.parse(payload.toString());
    const eventType = eventData.event;
    const entity =
      eventData.payload?.payment?.entity ||
      eventData.payload?.subscription?.entity ||
      eventData.payload?.invoice?.entity;
    const eventId = eventData.id;

    // Extract tenant_id from notes
    const tenantId = entity?.notes?.tenant_id || null;
    let tenantName = 'System';
    if (tenantId) {
      const tRes = await pool.query('SELECT name FROM tenants WHERE id = $1', [
        tenantId,
      ]);
      if (tRes.rows.length > 0) tenantName = tRes.rows[0].name;
    }

    const amount = entity?.amount ? entity.amount / 100 : 0;
    let rawCurrency = entity?.currency || eventData?.payload?.payment?.entity?.currency || eventData?.payload?.subscription?.entity?.currency || eventData?.payload?.order?.entity?.currency;
    if (!rawCurrency) {
      const paymentId = entity?.id && String(entity.id).startsWith('pay_') ? entity.id : eventData?.payload?.payment?.entity?.id;
      const keyId = decryptText(provider.api_key_encrypted);
      const keySecret = decryptText(provider.api_secret_encrypted);
      if (paymentId && keyId && keySecret) {
        try {
          const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            headers: { Authorization: authHeader },
          });
          if (rzpRes.ok) {
            const rzpPayment = await rzpRes.json();
            if (rzpPayment && rzpPayment.id === paymentId && rzpPayment.currency) {
              const rzpAmount = rzpPayment.amount ? rzpPayment.amount / 100 : 0;
              if (amount === 0 || Math.abs(amount - rzpAmount) < 0.01) {
                rawCurrency = rzpPayment.currency;
              }
            }
          }
        } catch (lookupErr) {
          logger.warn(`[WEBHOOK] Razorpay authoritative lookup failed for ${paymentId}: ${lookupErr.message}`);
        }
      }
    }

    let unresolvedReason = null;
    if (!rawCurrency) {
      unresolvedReason = `Missing currency in Razorpay event ${eventId} and authoritative lookup unavailable`;
    } else if (String(rawCurrency).toUpperCase() !== 'INR') {
      unresolvedReason = `Non-INR currency '${String(rawCurrency).toUpperCase()}' rejected. Platform strictly operates in INR.`;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Concurrency-safe atomic insert or row lock
      const lockRes = await client.query(
        `INSERT INTO payment_webhooks (event_id, provider_id, provider, event_type, status, amount, tenant_name, payload, signature_verified, processed_at)
         VALUES ($1, $2, 'razorpay', $3, 'pending', $4, $5, $6, true, NOW())
         ON CONFLICT (event_id, provider) DO UPDATE SET
           processed_at = NOW()
         RETURNING id, status`,
        [
          eventId,
          provider.id,
          eventType,
          amount,
          tenantName,
          JSON.stringify(eventData),
        ]
      );

      const existingStatus = lockRes.rows[0].status;

      // 1. If already processed, acknowledge idempotent replay safely without side-effects
      if (existingStatus === 'processed') {
        await client.query('COMMIT');
        logger.info(
          `[WEBHOOK] Razorpay event ${eventId} has already been processed.`
        );
        return res.status(200).json({ status: 'already_processed' });
      }

      // 2. If unresolved (missing or non-INR currency), durably preserve as 'unresolved'
      if (unresolvedReason) {
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'unresolved',
               processing_error = $1,
               amount = $2,
               tenant_name = COALESCE($3, tenant_name),
               payload = $4,
               processed_at = NOW()
           WHERE id = $5`,
          [
            unresolvedReason,
            amount,
            tenantName,
            JSON.stringify(eventData),
            lockRes.rows[0].id,
          ]
        );
        await client.query('COMMIT');
        logger.warn(`[WEBHOOK] Razorpay event ${eventId} durably preserved with status='unresolved': ${unresolvedReason}`);
        return res.status(200).json({
          status: 'unresolved',
          event_id: eventId,
          reason: unresolvedReason,
          message: 'Event durably stored with unresolved currency for manual or automated reconciliation',
        });
      }

      // 3. If failed event
      if (eventType === 'payment.failed') {
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'failed',
               processing_error = $1,
               amount = $2,
               tenant_name = COALESCE($3, tenant_name),
               payload = $4,
               processed_at = NOW()
           WHERE id = $5`,
          ['Payment failed at provider', amount, tenantName, JSON.stringify(eventData), lockRes.rows[0].id]
        );
        await client.query('COMMIT');
        return res.status(200).json({ status: 'failed', event_id: eventId });
      }

      const currency = String(rawCurrency).toUpperCase();

      // Business logic processing within transaction
      if (tenantId) {
        if (
          eventType === 'subscription.activated' ||
          eventType === 'subscription.charged'
        ) {
          const subId = entity.id;
          const plan = entity.notes?.plan || 'starter';
          let rawPlanId = String(plan).trim().toLowerCase();
          if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
          else if (rawPlanId === 'pro') rawPlanId = 'professional';

          const planCheck = await client.query('SELECT id, name FROM plans WHERE LOWER(id) = $1 AND is_active = true', [rawPlanId]);
          if (planCheck.rows.length === 0) {
            logger.warn(`[WEBHOOK WARNING] Plan '${rawPlanId}' not found in active plans table.`);
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Unknown or inactive plan: ${rawPlanId}` });
          }
          const planId = planCheck.rows[0].id;
          const planDisplayName = planCheck.rows[0].name || (planId.charAt(0).toUpperCase() + planId.slice(1));

          const subStatus =
            entity.status === 'active' || entity.status === 'authenticated'
              ? 'active'
              : 'paused';
          const start = entity.current_start
            ? new Date(entity.current_start * 1000)
            : new Date();
          const end = entity.current_end
            ? new Date(entity.current_end * 1000)
            : new Date();

          await client.query(
            `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, current_period_start, current_period_end, amount, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
               status = EXCLUDED.status,
               current_period_start = EXCLUDED.current_period_start,
               current_period_end = EXCLUDED.current_period_end,
               amount = EXCLUDED.amount,
               updated_at = NOW()`,
            [
              tenantId,
              'razorpay',
              subId,
              planId,
              subStatus,
              start,
              end,
              amount,
              currency,
            ]
          );
          await client.query('UPDATE tenants SET plan = $1 WHERE id = $2', [
            planId,
            tenantId,
          ]);

          // Create invoice & send email receipt on subscription charge
          const subRes = await client.query(
            'SELECT id FROM subscriptions WHERE provider = $1 AND provider_subscription_id = $2',
            ['razorpay', subId]
          );
          const subscriptionUuid = subRes.rows.length > 0 ? subRes.rows[0].id : null;

          await createInvoice(
            {
              tenantId,
              subscriptionId: subscriptionUuid,
              provider: 'razorpay',
              providerInvoiceId: entity.payment_id || entity.invoice_id || subId,
              amount: amount || 0,
              currency,
              status: 'paid',
              paidAt: new Date(),
              planName: planDisplayName,
            },
            client
          );
        } else if (eventType === 'payment.captured' || eventType === 'order.paid') {
          const payId = entity.id || eventId;
          const plan = entity.notes?.plan || 'starter';
          let rawPlanId = String(plan).trim().toLowerCase();
          if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
          else if (rawPlanId === 'pro') rawPlanId = 'professional';

          const planCheck = await client.query('SELECT id, name FROM plans WHERE LOWER(id) = $1 AND is_active = true', [rawPlanId]);
          const canonicalPlanId = planCheck.rows[0]?.id || 'starter';
          const planDisplayName = planCheck.rows[0]?.name || 'Starter Plan';

          const subRes = await client.query(
            `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, current_period_start, current_period_end, amount, currency)
             VALUES ($1, 'razorpay', $2, $3, 'active', NOW(), NOW() + INTERVAL '30 days', $4, $5)
             ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
               status = 'active',
               current_period_end = NOW() + INTERVAL '30 days',
               amount = EXCLUDED.amount,
               updated_at = NOW()
             RETURNING id`,
            [tenantId, entity.order_id || payId, canonicalPlanId, amount, currency]
          );
          const subscriptionUuid = subRes.rows[0]?.id || null;

          await createInvoice(
            {
              tenantId,
              subscriptionId: subscriptionUuid,
              provider: 'razorpay',
              providerInvoiceId: payId,
              amount: amount || 0,
              currency,
              status: 'paid',
              paidAt: new Date(),
              planName: planDisplayName,
            },
            client
          );
          await client.query("UPDATE tenants SET plan = $1, status = 'active' WHERE id = $2", [canonicalPlanId, tenantId]);
        } else if (eventType === 'subscription.cancelled') {
          const subId = entity.id;
          await client.query(
            "UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE provider_subscription_id = $1",
            [subId]
          );
        }
      }

      // 4. Atomically transition webhook record to 'processed'
      await client.query(
        `UPDATE payment_webhooks
         SET status = 'processed',
             processing_error = NULL,
             amount = $1,
             tenant_name = COALESCE($2, tenant_name),
             payload = $3,
             processed_at = NOW()
         WHERE id = $4`,
        [amount, tenantName, JSON.stringify(eventData), lockRes.rows[0].id]
      );

      await client.query('COMMIT');
      return res.status(200).json({ status: 'processed' });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('Razorpay webhook transaction failed:', txErr);
      return res.status(500).json({ error: 'Database transaction failed: ' + txErr.message });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Razorpay webhook processing error:', err);
    res.status(500).json({ error: 'Internal webhook error' });
  }
});

// 27b. POST /webhooks/phonepe (PhonePe S2S webhooks receiver)
router.post('/webhooks/phonepe', async (req, res) => {
  const xVerify = req.headers['x-verify'] || '';
  const body = req.body || {};
  const base64Response = body.response;

  if (!base64Response) {
    logger.error('PhonePe webhook received without response payload');
    return res.status(400).json({ error: 'Missing response payload' });
  }

  try {
    const providerRes = await pool.query(
      "SELECT * FROM payment_providers WHERE provider = 'phonepe' AND is_active = true LIMIT 1"
    );
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'No active PhonePe provider configured' });
    }
    const provider = providerRes.rows[0];
    const saltKey = decryptText(provider.api_secret_encrypted);
    const saltIndex = decryptText(provider.api_key_encrypted) || '1';

    // Verify PhonePe signature: SHA256(base64Response + saltKey) + "###" + saltIndex
    const parts = (xVerify || '').split('###');
    const receivedChecksum = parts[0] || '';
    const receivedIndex = parts[1] || '';

    let isVerified = false;
    try {
      const calculatedChecksum = crypto
        .createHash('sha256')
        .update(base64Response + saltKey)
        .digest('hex');

      if (
        receivedChecksum.length === calculatedChecksum.length &&
        crypto.timingSafeEqual(Buffer.from(receivedChecksum), Buffer.from(calculatedChecksum)) &&
        (!receivedIndex || receivedIndex === saltIndex)
      ) {
        isVerified = true;
      }
    } catch (verErr) {
      isVerified = false;
    }

    if (!isVerified) {
      recordSignatureFailure('phonepe');
      logger.error('PhonePe webhook signature verification failed');
      await pool.query(
        `INSERT INTO payment_webhooks (event_id, provider_id, provider, event_type, status, amount, signature_verified, processing_error, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'sig_fail_' + Date.now(),
          provider.id,
          'phonepe',
          'signature_failed',
          'failed',
          0,
          false,
          'PhonePe webhook signature verification failed',
          JSON.stringify(body),
        ]
      );
      return res.status(400).json({ error: 'Invalid PhonePe signature' });
    }

    // Decode base64 response
    let decodedEvent;
    try {
      const decodedStr = Buffer.from(base64Response, 'base64').toString('utf8');
      decodedEvent = JSON.parse(decodedStr);
    } catch (parseErr) {
      logger.error('Failed to parse decoded PhonePe payload:', parseErr);
      return res.status(400).json({ error: 'Invalid decoded JSON' });
    }

    const eventData = decodedEvent.data || {};
    const merchantTxnId = eventData.merchantTransactionId || '';
    const phonepeTxnId = eventData.transactionId || merchantTxnId || ('phpe_' + Date.now());
    const eventType = decodedEvent.code || 'PAYMENT_SUCCESS';
    const amount = eventData.amount ? eventData.amount / 100 : 0;
    const isSuccess = Boolean(
      decodedEvent.success &&
      (eventData.state === 'COMPLETED' || eventData.responseCode === 'SUCCESS' || eventType === 'PAYMENT_SUCCESS')
    );
    const isFailed = Boolean(
      decodedEvent.success === false ||
      eventData.state === 'FAILED' ||
      eventData.responseCode === 'PAYMENT_ERROR' ||
      eventData.responseCode === 'AUTHORIZATION_FAILED'
    );
    const status = isSuccess ? 'processed' : (isFailed ? 'failed' : 'pending');

    // Parse tenantId and planId from merchantTransactionId: TXN_<tenantId>_<planId>_<timestamp>
    let tenantId = null;
    let planId = 'starter';
    const txnParts = merchantTxnId.split('_');
    if (txnParts.length >= 4) {
      tenantId = txnParts[1];
      planId = txnParts.slice(2, -1).join('_').toLowerCase();
    } else if (txnParts.length === 3) {
      tenantId = txnParts[1];
    }

    let rawCurrency = eventData.currency || eventData.paymentInstrument?.currency;
    if (!rawCurrency) {
      const merchantId = decryptText(provider.api_key_encrypted) || process.env.PHONEPE_MERCHANT_ID;
      const saltKey = decryptText(provider.api_secret_encrypted) || decryptText(provider.webhook_secret_encrypted) || process.env.PHONEPE_SALT_KEY;
      const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
      if (merchantId && saltKey && merchantTxnId) {
        try {
          const statusPath = `/pg/v1/status/${merchantId}/${merchantTxnId}`;
          const statusHash = crypto.createHash('sha256').update(statusPath + saltKey).digest('hex') + '###' + saltIndex;
          const host = process.env.PHONEPE_HOST_URL || (process.env.NODE_ENV === 'production' ? 'https://api.phonepe.com/apis/hermes' : 'https://api-preprod.phonepe.com/apis/pg-sandbox');
          const phRes = await fetch(`${host}${statusPath}`, {
            headers: {
              'Content-Type': 'application/json',
              'X-VERIFY': statusHash,
              'X-MERCHANT-ID': merchantId,
            },
          });
          if (phRes.ok) {
            const phJson = await phRes.json();
            if (phJson.success && phJson.data) {
              const phData = phJson.data;
              if (phData.transactionId && phData.amount) {
                const lookupAmount = phData.amount / 100;
                if (amount === 0 || Math.abs(amount - lookupAmount) < 0.01) {
                  rawCurrency = phData.currency || phData.paymentInstrument?.currency;
                }
              }
            }
          } else {
            recordLookupFailure('phonepe');
          }
        } catch (lookupErr) {
          recordLookupFailure('phonepe');
          logger.warn(`[WEBHOOK] PhonePe status lookup failed for ${merchantTxnId}: ${lookupErr.message}`);
        }
      }
    }

    let tenantName = 'System';
    if (tenantId) {
      const tRes = await pool.query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
      if (tRes.rows.length > 0) tenantName = tRes.rows[0].name;
    }

    let unresolvedReason = null;
    if (!rawCurrency) {
      unresolvedReason = `Missing currency in PhonePe event ${phonepeTxnId} and authoritative lookup unavailable`;
    } else if (String(rawCurrency).toUpperCase() !== 'INR') {
      unresolvedReason = `Non-INR currency '${String(rawCurrency).toUpperCase()}' rejected. Platform strictly operates in INR.`;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Concurrency-safe atomic insert or row lock
      const lockRes = await client.query(
        `INSERT INTO payment_webhooks (event_id, provider_id, provider, event_type, status, amount, tenant_name, payload, signature_verified, processed_at)
         VALUES ($1, $2, 'phonepe', $3, 'pending', $4, $5, $6, true, NOW())
         ON CONFLICT (event_id, provider) DO UPDATE SET
           processed_at = NOW()
         RETURNING id, status`,
        [
          phonepeTxnId,
          provider.id,
          eventType,
          amount,
          tenantName,
          JSON.stringify(decodedEvent),
        ]
      );

      const existingStatus = lockRes.rows[0].status;

      // 1. If already processed, acknowledge idempotent replay safely without side-effects
      if (existingStatus === 'processed') {
        await client.query('COMMIT');
        recordDuplicateDelivery('phonepe');
        recordWebhookReceived('phonepe', eventType, 'already_processed');
        logger.info(`[WEBHOOK] PhonePe event ${phonepeTxnId} has already been processed.`);
        return res.status(200).json({ status: 'already_processed' });
      }

      // 2. If unresolved (missing or non-INR currency), durably preserve as 'unresolved'
      if (unresolvedReason) {
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'unresolved',
               processing_error = $1,
               amount = $2,
               tenant_name = COALESCE($3, tenant_name),
               payload = $4,
               processed_at = NOW()
           WHERE id = $5`,
          [
            unresolvedReason,
            amount,
            tenantName,
            JSON.stringify(decodedEvent),
            lockRes.rows[0].id,
          ]
        );
        await client.query('COMMIT');
        recordWebhookReceived('phonepe', eventType, 'unresolved');
        logger.warn(`[WEBHOOK] PhonePe event ${phonepeTxnId} durably preserved with status='unresolved': ${unresolvedReason}`);
        return res.status(200).json({
          success: true,
          status: 'unresolved',
          event_id: phonepeTxnId,
          reason: unresolvedReason,
          message: 'Event durably stored with unresolved currency for manual or automated reconciliation',
        });
      }

      // 3. If failed event
      if (isFailed) {
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'failed',
               processing_error = $1,
               amount = $2,
               tenant_name = COALESCE($3, tenant_name),
               payload = $4,
               processed_at = NOW()
           WHERE id = $5`,
          ['Payment failed at provider', amount, tenantName, JSON.stringify(decodedEvent), lockRes.rows[0].id]
        );
        await client.query('COMMIT');
        recordWebhookReceived('phonepe', eventType, 'failed');
        return res.status(200).json({ status: 'failed', event_id: phonepeTxnId });
      }

      const currency = String(rawCurrency).toUpperCase();

      if (isSuccess && tenantId) {
        let rawPlanId = String(planId).trim().toLowerCase();
        if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
        else if (rawPlanId === 'pro') rawPlanId = 'professional';

        const planCheck = await client.query('SELECT id, name FROM plans WHERE LOWER(id) = $1 AND is_active = true', [rawPlanId]);
        if (planCheck.rows.length === 0) {
          logger.warn(`[WEBHOOK WARNING] Plan '${rawPlanId}' not found in active plans table.`);
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Unknown or inactive plan: ${rawPlanId}` });
        }
        const canonicalPlanId = planCheck.rows[0].id;
        const canonicalPlanName = planCheck.rows[0].name || (canonicalPlanId.charAt(0).toUpperCase() + canonicalPlanId.slice(1));

        await client.query(
          `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, current_period_start, current_period_end, amount, currency)
           VALUES ($1, $2, $3, $4, 'active', NOW(), NOW() + INTERVAL '30 days', $5, $6)
           ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
             status = 'active',
             current_period_start = NOW(),
             current_period_end = NOW() + INTERVAL '30 days',
             amount = EXCLUDED.amount,
             currency = EXCLUDED.currency,
             updated_at = NOW()`,
          [tenantId, 'phonepe', merchantTxnId, canonicalPlanId, amount, currency]
        );

        await client.query('UPDATE tenants SET plan = $1, status = \'active\', updated_at = NOW() WHERE id = $2', [
          canonicalPlanId,
          tenantId,
        ]);

        const subRes = await client.query(
          'SELECT id FROM subscriptions WHERE provider = $1 AND provider_subscription_id = $2',
          ['phonepe', merchantTxnId]
        );
        const subscriptionUuid = subRes.rows.length > 0 ? subRes.rows[0].id : null;

        await createInvoice(
          {
            tenantId,
            subscriptionId: subscriptionUuid,
            provider: 'phonepe',
            providerInvoiceId: phonepeTxnId,
            amount: amount || 0,
            currency,
            status: 'paid',
            paidAt: new Date(),
            planName: canonicalPlanName,
          },
          client
        );
      }

      // 4. Atomically transition webhook record to 'processed'
      await client.query(
        `UPDATE payment_webhooks
         SET status = 'processed',
             processing_error = NULL,
             amount = $1,
             tenant_name = COALESCE($2, tenant_name),
             payload = $3,
             processed_at = NOW()
         WHERE id = $4`,
        [amount, tenantName, JSON.stringify(decodedEvent), lockRes.rows[0].id]
      );

      await client.query('COMMIT');
      recordWebhookReceived('phonepe', eventType, 'processed');
      return res.status(200).json({ status: 'processed', success: true });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      recordDbTransactionFailure('phonepe_webhook_tx');
      logger.error('PhonePe webhook transaction failed:', txErr);
      return res.status(500).json({ error: 'Database transaction failed: ' + txErr.message });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('PhonePe webhook processing error:', err);
    res.status(500).json({ error: 'Internal webhook error' });
  }
});

// 27c. POST /webhooks/cashfree (Cashfree Embedded/Partner webhooks receiver)
router.post('/webhooks/cashfree', async (req, res) => {
  const timestamp = req.headers['x-webhook-timestamp'] || '';
  const signature = req.headers['x-webhook-signature'] || '';
  const body = req.body || {};
  const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(body);

  if (!signature || !timestamp) {
    logger.error('Cashfree webhook received without signature or timestamp headers');
    return res.status(400).json({ error: 'Missing Cashfree webhook signature or timestamp headers' });
  }

  try {
    const providerRes = await pool.query(
      "SELECT * FROM payment_providers WHERE provider = 'cashfree' AND is_active = true LIMIT 1"
    );
    let secret = '';
    let providerId = null;
    if (providerRes.rows.length > 0) {
      const provider = providerRes.rows[0];
      providerId = provider.id;
      secret = decryptText(provider.webhook_secret_encrypted) || decryptText(provider.api_key_encrypted) || decryptText(provider.api_secret_encrypted);
    }
    secret = secret || process.env.CASHFREE_PARTNER_API_KEY || process.env.CASHFREE_SECRET_KEY || '';

    // Verify Cashfree webhook signature
    let signatureVerified = false;
    if (secret) {
      const signedPayload = `${timestamp}${rawBody}`;
      const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('base64');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const sigBuf = Buffer.from(signature, 'utf8');
      if (expectedBuf.length === sigBuf.length && crypto.timingSafeEqual(expectedBuf, sigBuf)) {
        signatureVerified = true;
      }
    } else {
      signatureVerified = true; // sandbox fallback
    }

    if (!signatureVerified && process.env.NODE_ENV === 'production') {
      logger.warn('[WEBHOOK] Cashfree signature verification failed.');
      return res.status(400).json({ error: 'Invalid Cashfree signature' });
    }

    const payload = body;
    const data = payload.data || {};
    const order = data.order || {};
    const payment = data.payment || {};

    const orderId = order.order_id || payload.orderId || ('cf_' + Date.now());
    const cfPaymentId = payment.cf_payment_id || order.cf_order_id || orderId;
    const eventType = payload.type || 'PAYMENT_SUCCESS_WEBHOOK';
    const amount = Number(order.order_amount || payment.payment_amount || 0);
    let rawCurrency = order.order_currency || payment.payment_currency || payload.order_currency || payload.currency || data.order_currency;
    if (!rawCurrency) {
      const appId = decryptText(provider.api_key_encrypted) || process.env.CASHFREE_APP_ID;
      const secretKey = decryptText(provider.api_secret_encrypted) || decryptText(provider.webhook_secret_encrypted) || process.env.CASHFREE_SECRET_KEY;
      if (appId && secretKey && orderId) {
        try {
          const cfHost = process.env.CASHFREE_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');
          const cfRes = await fetch(`${cfHost}/orders/${orderId}`, {
            headers: {
              'x-client-id': appId,
              'x-client-secret': secretKey,
              'x-api-version': '2023-08-01',
            },
          });
          if (cfRes.ok) {
            const cfOrder = await cfRes.json();
            if (cfOrder && cfOrder.order_id === orderId && cfOrder.order_currency) {
              const cfOrderAmount = Number(cfOrder.order_amount || 0);
              if (amount === 0 || Math.abs(amount - cfOrderAmount) < 0.01) {
                rawCurrency = cfOrder.order_currency;
              }
            }
          }
        } catch (lookupErr) {
          logger.warn(`[WEBHOOK] Cashfree authoritative order lookup failed for ${orderId}: ${lookupErr.message}`);
        }
      }
    }

    let unresolvedReason = null;
    if (!rawCurrency) {
      unresolvedReason = `Missing currency in Cashfree event ${orderId} and authoritative lookup unavailable`;
    } else if (String(rawCurrency).toUpperCase() !== 'INR') {
      unresolvedReason = `Non-INR currency '${String(rawCurrency).toUpperCase()}' rejected. Platform strictly operates in INR.`;
    }

    const isSuccess = eventType === 'PAYMENT_SUCCESS_WEBHOOK' || payment.payment_status === 'SUCCESS' || order.order_status === 'PAID';
    const isFailed = eventType === 'PAYMENT_FAILED_WEBHOOK' || payment.payment_status === 'FAILED' || order.order_status === 'FAILED';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Concurrency-safe atomic insert or row lock
      const lockRes = await client.query(
        `INSERT INTO payment_webhooks (event_id, provider_id, provider, event_type, status, amount, payload, signature_verified, processed_at)
         VALUES ($1, $2, 'cashfree', $3, 'pending', $4, $5, $6, NOW())
         ON CONFLICT (event_id, provider) DO UPDATE SET
           processed_at = NOW()
         RETURNING id, status`,
        [orderId, providerId, eventType, amount, JSON.stringify(payload), signatureVerified]
      );

      const existingStatus = lockRes.rows[0].status;

      // 1. If already processed, acknowledge idempotent replay safely without side-effects
      if (existingStatus === 'processed') {
        await client.query('COMMIT');
        logger.info(`[WEBHOOK] Cashfree event ${orderId} has already been processed.`);
        return res.status(200).json({ status: 'already_processed' });
      }

      // 2. If unresolved (missing or non-INR currency), durably preserve as 'unresolved'
      if (unresolvedReason) {
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'unresolved',
               processing_error = $1,
               amount = $2,
               payload = $3,
               processed_at = NOW()
           WHERE id = $4`,
          [unresolvedReason, amount, JSON.stringify(payload), lockRes.rows[0].id]
        );
        await client.query('COMMIT');
        logger.warn(`[WEBHOOK] Cashfree event ${orderId} durably preserved with status='unresolved': ${unresolvedReason}`);
        return res.status(200).json({
          status: 'unresolved',
          event_id: orderId,
          reason: unresolvedReason,
          message: 'Event durably stored with unresolved currency for manual or automated reconciliation',
        });
      }

      // 3. If failed event
      if (isFailed) {
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'failed',
               processing_error = $1,
               amount = $2,
               payload = $3,
               processed_at = NOW()
           WHERE id = $4`,
          ['Payment failed or non-success at provider', amount, JSON.stringify(payload), lockRes.rows[0].id]
        );
        await client.query('COMMIT');
        return res.status(200).json({ status: 'failed', event_id: orderId });
      }

      const currency = String(rawCurrency).toUpperCase();

      let tenantId = order.order_tags?.tenant_id || payload.tenantId;
      let planId = (order.order_tags?.plan_id || payload.planId || 'starter').toLowerCase();

      if (!tenantId) {
        const subLookup = await client.query(
          "SELECT tenant_id, plan_id FROM subscriptions WHERE provider = 'cashfree' AND provider_subscription_id = $1",
          [orderId]
        );
        if (subLookup.rows.length > 0) {
          tenantId = subLookup.rows[0].tenant_id;
          planId = subLookup.rows[0].plan_id;
        }
      }

      if (tenantId && isSuccess) {
        let rawPlanId = String(planId).trim().toLowerCase();
        if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
        else if (rawPlanId === 'pro') rawPlanId = 'professional';

        const planCheck = await client.query('SELECT id, name FROM plans WHERE LOWER(id) = $1 AND is_active = true', [rawPlanId]);
        if (planCheck.rows.length === 0) {
          logger.warn(`[WEBHOOK WARNING] Cashfree plan '${rawPlanId}' not found in active plans table.`);
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Unknown or inactive plan: ${rawPlanId}` });
        }
        const canonicalPlanId = planCheck.rows[0].id;

        await client.query(
          `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, amount, currency, current_period_start, current_period_end, created_at, updated_at)
           VALUES ($1, 'cashfree', $2, $3, 'active', $4, $5, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
           ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
             status = 'active',
             current_period_end = NOW() + INTERVAL '30 days',
             amount = EXCLUDED.amount,
             currency = EXCLUDED.currency,
             updated_at = NOW()`,
          [tenantId, orderId, canonicalPlanId, amount, currency]
        );

        await client.query("UPDATE tenants SET plan = $1, status = 'active', updated_at = NOW() WHERE id = $2", [canonicalPlanId, tenantId]);

        const subRes = await client.query(
          'SELECT id FROM subscriptions WHERE provider = $1 AND provider_subscription_id = $2',
          ['cashfree', orderId]
        );
        const subscriptionUuid = subRes.rows.length > 0 ? subRes.rows[0].id : null;

        await recordInvoice(client, {
          tenantId,
          subscriptionId: subscriptionUuid,
          provider: 'cashfree',
          providerInvoiceId: cfPaymentId,
          amount: amount || 0,
          currency,
          status: 'paid',
          paidAt: new Date(),
          planName: canonicalPlanId.toUpperCase() + ' Plan',
          pdfUrl: `/admin/invoices/receipt/${cfPaymentId}`,
        });
      }

      // 4. Atomically transition webhook record to 'processed'
      await client.query(
        `UPDATE payment_webhooks
         SET status = 'processed',
             processing_error = NULL,
             amount = $1,
             payload = $2,
             processed_at = NOW()
         WHERE id = $3`,
        [amount, JSON.stringify(payload), lockRes.rows[0].id]
      );

      await client.query('COMMIT');
      logger.info(`[WEBHOOK] Successfully processed Cashfree order: ${orderId}`);
      return res.status(200).json({ status: 'success', event_id: orderId });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('Cashfree webhook transaction failed:', txErr);
      return res.status(500).json({ error: 'Database transaction failed: ' + txErr.message });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Cashfree webhook processing error:', err);
    res.status(500).json({ error: 'Internal webhook error' });
  }
});

// 27d. POST /webhooks/neuracollect (NeuraCollect webhooks receiver)
router.post('/webhooks/neuracollect', async (req, res) => {
  const timestamp = req.headers['x-webhook-timestamp'] || req.headers['x-timestamp'] || req.headers['timestamp'] || '';
  const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'] || req.headers['signature'] || '';
  const apiKeyHeader = req.headers['x-collect-api-key'] || req.headers['x-api-key'] || '';
  const body = req.body || {};
  const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(body);

  try {
    const providerRes = await pool.query(
      "SELECT * FROM payment_providers WHERE provider = 'neuracollect' AND is_active = true LIMIT 1"
    );
    let secret = '';
    let apiKey = '';
    let providerId = null;
    if (providerRes.rows.length > 0) {
      const provider = providerRes.rows[0];
      providerId = provider.id;
      secret = decryptText(provider.webhook_secret_encrypted) || decryptText(provider.api_secret_encrypted) || decryptText(provider.api_key_encrypted);
      apiKey = decryptText(provider.api_key_encrypted) || '';
    }
    secret = secret || process.env.NEURACOLLECT_WEBHOOK_SECRET || process.env.NEURACOLLECT_API_KEY || '';
    apiKey = apiKey || process.env.NEURACOLLECT_API_KEY || '';

    // Verify HMAC-SHA256 signature or API key header
    let signatureVerified = false;
    if (signature && timestamp && secret) {
      const signedPayload = `${timestamp}${rawBody}`;
      const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('base64');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const sigBuf = Buffer.from(signature, 'utf8');
      if (expectedBuf.length === sigBuf.length && crypto.timingSafeEqual(expectedBuf, sigBuf)) {
        signatureVerified = true;
      }
    } else if (apiKeyHeader && apiKey && apiKeyHeader === apiKey) {
      signatureVerified = true;
    } else if (!signature && !apiKeyHeader) {
      logger.info('[WEBHOOK] NeuraCollect webhook received without signature header - processing payload based on orderId');
      signatureVerified = true;
    }

    if (!signatureVerified && process.env.NODE_ENV === 'production' && signature) {
      logger.warn('[WEBHOOK] NeuraCollect signature verification failed.');
      return res.status(400).json({ error: 'Invalid NeuraCollect signature' });
    }

    const payload = body;
    const data = payload.data || {};
    const orderId = payload.externalOrderId || payload.orderId || data.order?.order_id || ('nc_' + Date.now());
    const paymentId = payload.gatewayOrderId || payload.paymentId || data.payment?.cf_payment_id || orderId;
    const eventType = payload.type || 'PAYMENT_SUCCESS_WEBHOOK';
    const amount = Number(payload.amount || data.order?.order_amount || data.payment?.payment_amount || 0);
    let rawCurrency = payload.currency || data.currency || data.order?.order_currency || data.order?.currency || data.payment?.currency || payload.data?.order?.currency;
    if (!rawCurrency) {
      const ncApiKey = apiKey || decryptText(provider.api_key_encrypted) || process.env.NEURACOLLECT_API_KEY;
      if (ncApiKey && orderId) {
        try {
          const ncHost = process.env.NEURACOLLECT_BASE_URL || 'https://collect.neuravolt.ai';
          const ncRes = await fetch(`${ncHost}/api/v1/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${ncApiKey}` },
          });
          if (ncRes.ok) {
            const ncOrder = await ncRes.json();
            if (ncOrder && (ncOrder.order_id === orderId || ncOrder.id === orderId) && ncOrder.currency) {
              const ncAmount = Number(ncOrder.amount || ncOrder.order_amount || 0);
              if (amount === 0 || Math.abs(amount - ncAmount) < 0.01) {
                rawCurrency = ncOrder.currency;
              }
            }
          }
        } catch (lookupErr) {
          logger.warn(`[WEBHOOK] NeuraCollect authoritative lookup failed for ${orderId}: ${lookupErr.message}`);
        }
      }
    }

    let unresolvedReason = null;
    if (!rawCurrency) {
      unresolvedReason = `Missing currency in NeuraCollect event ${orderId} and authoritative lookup unavailable`;
    } else if (String(rawCurrency).toUpperCase() !== 'INR') {
      unresolvedReason = `Non-INR currency '${String(rawCurrency).toUpperCase()}' rejected. Platform strictly operates in INR.`;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Concurrency-safe atomic insert or row lock
      const lockRes = await client.query(
        `INSERT INTO payment_webhooks (event_id, provider_id, provider, event_type, status, amount, payload, signature_verified, processed_at)
         VALUES ($1, $2, 'neuracollect', $3, 'pending', $4, $5, $6, NOW())
         ON CONFLICT (event_id, provider) DO UPDATE SET
           processed_at = NOW()
         RETURNING id, status`,
        [
          orderId,
          providerId,
          eventType,
          amount,
          JSON.stringify(payload),
          signatureVerified,
        ]
      );

      const existingStatus = lockRes.rows[0].status;

      // 1. If already processed, acknowledge idempotent replay safely without side-effects
      if (existingStatus === 'processed') {
        await client.query('COMMIT');
        logger.info(`[WEBHOOK] NeuraCollect order ${orderId} has already been processed.`);
        return res.status(200).json({ status: 'already_processed', event_id: orderId });
      }

      // 2. If unresolved (missing or non-INR currency), durably preserve as 'unresolved'
      if (unresolvedReason) {
        await client.query(
          `UPDATE payment_webhooks
           SET status = 'unresolved',
               processing_error = $1,
               payload = $2,
               amount = $3,
               processed_at = NOW()
           WHERE id = $4`,
          [unresolvedReason, JSON.stringify(payload), amount, lockRes.rows[0].id]
        );
        await client.query('COMMIT');
        logger.warn(`[WEBHOOK] NeuraCollect event ${orderId} durably preserved with status='unresolved': ${unresolvedReason}`);
        return res.status(200).json({
          status: 'unresolved',
          event_id: orderId,
          reason: unresolvedReason,
          message: 'Event durably stored with unresolved currency for manual or automated reconciliation',
        });
      }

      // 3. Currency is verified INR
      const currency = String(rawCurrency).toUpperCase();
      const isSuccess =
        eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
        eventType === 'PAYMENT_SUCCESS' ||
        payload.status === 'SUCCESS' ||
        data.payment?.payment_status === 'SUCCESS' ||
        data.order?.order_status === 'PAID';

      let tenantId = payload.tenantId || data.order?.order_tags?.tenant_id;
      let planId = (payload.planId || data.order?.order_tags?.plan_id || 'starter').toLowerCase();

      if (!tenantId && typeof orderId === 'string' && orderId.startsWith('nc_')) {
        const parts = orderId.split('_');
        if (parts.length >= 3) {
          const shortTenant = parts[1];
          const parsedPlan = parts[2];
          const matchRes = await client.query(
            `SELECT id FROM tenants WHERE REPLACE(id::text, '-', '') LIKE $1 LIMIT 1`,
            [`${shortTenant}%`]
          );
          if (matchRes.rows.length > 0) {
            tenantId = matchRes.rows[0].id;
            planId = parsedPlan.toLowerCase();
          }
        }
      }

      if (tenantId && isSuccess) {
        let rawPlanId = String(planId).trim().toLowerCase();
        if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
        else if (rawPlanId === 'pro') rawPlanId = 'professional';

        const planCheck = await client.query('SELECT id, name FROM plans WHERE LOWER(id) = $1 AND is_active = true', [rawPlanId]);
        if (planCheck.rows.length === 0) {
          logger.warn(`[WEBHOOK WARNING] NeuraCollect plan '${rawPlanId}' not found in active plans table.`);
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Unknown or inactive plan: ${rawPlanId}` });
        }
        const canonicalPlanId = planCheck.rows[0].id;

        await client.query(
          `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, amount, currency, current_period_start, current_period_end, created_at, updated_at)
           VALUES ($1, 'neuracollect', $2, $3, 'active', $4, $5, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
           ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
             status = 'active',
             current_period_end = NOW() + INTERVAL '30 days',
             amount = EXCLUDED.amount,
             updated_at = NOW()`,
          [tenantId, orderId, canonicalPlanId, amount, currency]
        );

        await client.query("UPDATE tenants SET plan = $1, status = 'active', updated_at = NOW() WHERE id = $2", [canonicalPlanId, tenantId]);

        const subRes = await client.query(
          'SELECT id FROM subscriptions WHERE provider = $1 AND provider_subscription_id = $2',
          ['neuracollect', orderId]
        );
        const subscriptionUuid = subRes.rows.length > 0 ? subRes.rows[0].id : null;

        await recordInvoice(client, {
          tenantId,
          subscriptionId: subscriptionUuid,
          provider: 'neuracollect',
          providerInvoiceId: paymentId,
          amount: amount || 0,
          currency,
          status: 'paid',
          paidAt: new Date(),
          planName: canonicalPlanId.toUpperCase() + ' Plan',
          pdfUrl: `/admin/invoices/receipt/${paymentId}`,
        });
      }

      // 4. Atomically transition webhook record to 'processed' (or 'failed')
      await client.query(
        `UPDATE payment_webhooks
         SET status = $1,
             processing_error = NULL,
             amount = $2,
             payload = $3,
             processed_at = NOW()
         WHERE id = $4`,
        [isSuccess ? 'processed' : 'failed', amount, JSON.stringify(payload), lockRes.rows[0].id]
      );

      await client.query('COMMIT');
      logger.info(`[WEBHOOK] Successfully processed NeuraCollect order: ${orderId}`);
      return res.status(200).json({ status: isSuccess ? 'success' : 'failed', event_id: orderId });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('NeuraCollect webhook transaction failed:', txErr);
      return res.status(500).json({ error: 'Database transaction failed: ' + txErr.message });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('NeuraCollect webhook processing error:', err);
    res.status(500).json({ error: 'Internal webhook error' });
  }
});

// 28. GET /admin/billing/webhooks (Retrieve logs)
router.get('/admin/billing/webhooks', adminAuth, async (req, res) => {
  const {
    provider,
    event_type,
    status,
    verified_only,
    limit = 50,
    offset = 0,
  } = req.query;
  try {
    let query = `SELECT w.id, w.event_id, w.provider, w.event_type, w.status, w.amount, w.tenant_name, w.payload, w.signature_verified, w.processing_error, w.processed_at, w.created_at
                 FROM payment_webhooks w WHERE 1=1`;
    const params = [];

    if (provider) {
      params.push(provider);
      query += ` AND w.provider = $${params.length}`;
    }
    if (event_type) {
      params.push(event_type);
      query += ` AND w.event_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND w.status = $${params.length}`;
    }
    if (verified_only === 'true') {
      query += ` AND w.signature_verified = true`;
    }

    params.push(parseInt(limit));
    query += ` ORDER BY w.created_at DESC LIMIT $${params.length}`;
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Count totals
    let countQuery = `SELECT COUNT(*) FROM payment_webhooks WHERE 1=1`;
    const countParams = [];
    if (provider) {
      countParams.push(provider);
      countQuery += ` AND provider = $${countParams.length}`;
    }
    if (event_type) {
      countParams.push(event_type);
      countQuery += ` AND event_type = $${countParams.length}`;
    }
    if (status) {
      countParams.push(status);
      countQuery += ` AND status = $${countParams.length}`;
    }
    if (verified_only === 'true') {
      countQuery += ` AND signature_verified = true`;
    }
    const countRes = await pool.query(countQuery, countParams);

    // Check active providers
    const provRes = await pool.query(
      'SELECT provider, is_test_mode FROM payment_providers WHERE is_active = true'
    );
    const active = {
      razorpay: provRes.rows.some((r) => r.provider === 'razorpay'),
      stripe: provRes.rows.some((r) => r.provider === 'stripe'),
    };

    res.status(200).json({
      webhooks: result.rows,
      total: parseInt(countRes.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
      providers_active: active,
      providers_modes: provRes.rows.reduce((acc, row) => {
        acc[row.provider] = row.is_test_mode ? 'test' : 'live';
        return acc;
      }, {}),
    });
  } catch (err) {
    logger.error('Failed to query payment webhooks:', err);
    res.status(500).json({ error: 'Failed to query webhook entries' });
  }
});

// GET /admin/billing/webhook-logs - Alias for webhook entries with date & status filters
router.get('/admin/billing/webhook-logs', adminAuth, async (req, res) => {
  const {
    provider,
    event_type,
    status,
    from_date,
    to_date,
    limit = 50,
    offset = 0,
  } = req.query;
  try {
    let query = `SELECT w.id, w.event_id, w.provider, w.event_type, w.status, w.amount, w.tenant_name, w.payload, w.signature_verified, w.processing_error, w.created_at, w.processed_at
                 FROM payment_webhooks w WHERE 1=1`;
    const params = [];

    if (provider) {
      params.push(provider);
      query += ` AND w.provider = $${params.length}`;
    }
    if (event_type) {
      params.push(event_type);
      query += ` AND w.event_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND w.status = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      query += ` AND w.created_at >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND w.created_at <= $${params.length}`;
    }

    params.push(parseInt(limit));
    query += ` ORDER BY w.created_at DESC LIMIT $${params.length}`;
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    let countQuery = `SELECT COUNT(*) FROM payment_webhooks WHERE 1=1`;
    const countParams = [];
    if (provider) {
      countParams.push(provider);
      countQuery += ` AND provider = $${countParams.length}`;
    }
    if (event_type) {
      countParams.push(event_type);
      countQuery += ` AND event_type = $${countParams.length}`;
    }
    if (status) {
      countParams.push(status);
      countQuery += ` AND status = $${countParams.length}`;
    }
    if (from_date) {
      countParams.push(from_date);
      countQuery += ` AND created_at >= $${countParams.length}`;
    }
    if (to_date) {
      countParams.push(to_date);
      countQuery += ` AND created_at <= $${countParams.length}`;
    }
    const countRes = await pool.query(countQuery, countParams);

    res.status(200).json({
      webhooks: result.rows,
      total: parseInt(countRes.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    logger.error('Failed to query payment webhook logs:', err);
    res.status(500).json({ error: 'Failed to query webhook logs' });
  }
});

/**
 * Safely reconciles a webhook event by re-verifying provider credentials,
 * querying authoritative provider APIs to resolve currency/status/amount,
 * and atomically executing subscription & invoice updates if verified INR.
 */
async function reconcileWebhookEvent(webhookRecord) {
  // 1. Signature verification check: Retries cannot bypass cryptographic verification
  if (!webhookRecord.signature_verified) {
    return {
      success: false,
      status: 'unverified_signature',
      error: 'Cannot retry webhook with unverified signature. Cryptographic verification is strictly required.',
    };
  }

  // 2. Already processed check: Idempotent return without duplicate side effects
  if (webhookRecord.status === 'processed') {
    return {
      success: true,
      status: 'already_processed',
      message: `Webhook event ${webhookRecord.event_id} is already processed.`,
      webhook: webhookRecord,
    };
  }

  const providerName = String(webhookRecord.provider).toLowerCase();
  const eventId = webhookRecord.event_id;
  const payload = typeof webhookRecord.payload === 'string'
    ? JSON.parse(webhookRecord.payload)
    : (webhookRecord.payload || {});

  // Fetch provider configuration
  const provRes = await pool.query(
    'SELECT * FROM payment_providers WHERE LOWER(provider) = $1 AND is_active = true LIMIT 1',
    [providerName]
  );
  const provider = provRes.rows.length > 0 ? provRes.rows[0] : null;

  let authoritativeCurrency = null;
  let authoritativeAmount = Number(webhookRecord.amount || 0);
  let isPaymentSuccessful = false;
  let providerPaymentId = eventId;
  let tenantId = webhookRecord.tenant_id || payload.tenantId || payload.metadata?.tenantId || payload.metadata?.tenant_id;
  let planId = payload.planId || payload.metadata?.planId || payload.metadata?.plan_id || payload.plan || 'starter';

  // Provider-specific authoritative resolution
  if (providerName === 'stripe') {
    const dataObj = payload.data?.object || payload.object || payload;
    const targetPiId = dataObj.payment_intent || (typeof dataObj.id === 'string' && dataObj.id.startsWith('pi_') ? dataObj.id : null);
    const targetInvId = dataObj.invoice || (typeof dataObj.id === 'string' && dataObj.id.startsWith('in_') ? dataObj.id : null);
    const targetCsId = typeof dataObj.id === 'string' && dataObj.id.startsWith('cs_') ? dataObj.id : null;

    tenantId = tenantId || dataObj.metadata?.tenant_id || dataObj.metadata?.tenantId;
    planId = planId || dataObj.metadata?.plan || dataObj.metadata?.plan_id || dataObj.metadata?.planId;

    let stripeInstance = null;
    const stripeKey = provider ? decryptText(provider.api_secret_encrypted) : process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      stripeInstance = new Stripe(stripeKey);
    }

    if (stripeInstance) {
      try {
        if (targetPiId && stripeInstance.paymentIntents?.retrieve) {
          const pi = await stripeInstance.paymentIntents.retrieve(targetPiId);
          if (pi && pi.id === targetPiId) {
            authoritativeCurrency = pi.currency;
            authoritativeAmount = pi.amount ? pi.amount / 100 : authoritativeAmount;
            isPaymentSuccessful = pi.status === 'succeeded';
            providerPaymentId = pi.id;
          }
        } else if (targetInvId && stripeInstance.invoices?.retrieve) {
          const inv = await stripeInstance.invoices.retrieve(targetInvId);
          if (inv && inv.id === targetInvId) {
            authoritativeCurrency = inv.currency;
            authoritativeAmount = inv.amount_paid ? inv.amount_paid / 100 : (inv.total ? inv.total / 100 : authoritativeAmount);
            isPaymentSuccessful = inv.status === 'paid';
            providerPaymentId = inv.id;
          }
        } else if (targetCsId && stripeInstance.checkout?.sessions?.retrieve) {
          const cs = await stripeInstance.checkout.sessions.retrieve(targetCsId);
          if (cs && cs.id === targetCsId) {
            authoritativeCurrency = cs.currency;
            authoritativeAmount = cs.amount_total ? cs.amount_total / 100 : authoritativeAmount;
            isPaymentSuccessful = cs.payment_status === 'paid';
            providerPaymentId = cs.id;
          }
        }
      } catch (err) {
        logger.warn(`[RECONCILIATION] Stripe lookup failed for ${eventId}: ${err.message}`);
      }
    }

    if (!authoritativeCurrency) {
      authoritativeCurrency = dataObj.currency;
    }
    if (!isPaymentSuccessful) {
      isPaymentSuccessful = dataObj.status === 'succeeded' || dataObj.status === 'paid' || dataObj.payment_status === 'paid';
    }
  } else if (providerName === 'razorpay') {
    const pEntity = payload.payload?.payment?.entity || payload.payment?.entity || payload;
    const paymentId = pEntity.id || payload.razorpay_payment_id;
    const orderId = pEntity.order_id || payload.razorpay_order_id;
    providerPaymentId = paymentId || orderId || eventId;
    tenantId = tenantId || pEntity.notes?.tenant_id || pEntity.notes?.tenantId;
    planId = planId || pEntity.notes?.plan_id || pEntity.notes?.planId;

    const rzpKeyId = provider ? decryptText(provider.api_key_encrypted) : process.env.RAZORPAY_KEY_ID;
    const rzpSecret = provider ? decryptText(provider.api_secret_encrypted) : process.env.RAZORPAY_KEY_SECRET;
    if (rzpKeyId && rzpSecret) {
      try {
        const rzp = new Razorpay({ key_id: rzpKeyId, key_secret: rzpSecret });
        if (paymentId && rzp.payments?.fetch) {
          const rzpPayment = await rzp.payments.fetch(paymentId);
          if (rzpPayment && rzpPayment.id === paymentId) {
            authoritativeCurrency = rzpPayment.currency;
            authoritativeAmount = rzpPayment.amount ? rzpPayment.amount / 100 : authoritativeAmount;
            isPaymentSuccessful = rzpPayment.status === 'captured' || rzpPayment.status === 'authorized';
          }
        }
      } catch (err) {
        logger.warn(`[RECONCILIATION] Razorpay lookup failed for ${eventId}: ${err.message}`);
      }
    }

    if (!authoritativeCurrency) {
      authoritativeCurrency = pEntity.currency;
    }
    if (!isPaymentSuccessful) {
      isPaymentSuccessful = pEntity.status === 'captured' || pEntity.status === 'authorized' || webhookRecord.event_type === 'payment.captured';
    }
  } else if (providerName === 'phonepe') {
    const pData = payload.data || {};
    const txnId = pData.merchantTransactionId || payload.merchantTransactionId || eventId;
    providerPaymentId = txnId;
    tenantId = tenantId || pData.merchantUserId || pData.merchantCustomerId;

    const merchantId = provider ? decryptText(provider.merchant_id_encrypted) : process.env.PHONEPE_MERCHANT_ID;
    const saltKey = provider ? decryptText(provider.api_secret_encrypted) : process.env.PHONEPE_SALT_KEY;
    const saltIndex = provider ? (decryptText(provider.api_key_encrypted) || '1') : (process.env.PHONEPE_SALT_INDEX || '1');
    const isTest = provider ? provider.is_test_mode : (process.env.NODE_ENV !== 'production');
    const phonepeHost = isTest ? 'https://api-preprod.phonepe.com/apis/pg-sandbox' : (process.env.PHONEPE_BASE_URL || 'https://api.phonepe.com/apis/hermes');

    if (merchantId && saltKey && txnId) {
      try {
        const statusEndpoint = `/pg/v1/status/${merchantId}/${txnId}`;
        const sha256 = crypto.createHash('sha256').update(statusEndpoint + saltKey).digest('hex');
        const xVerify = `${sha256}###${saltIndex}`;
        const resp = await fetch(`${phonepeHost}${statusEndpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify,
            'X-MERCHANT-ID': merchantId,
          },
        });
        if (resp.ok) {
          const statusBody = await resp.json();
          if (statusBody.success && (statusBody.code === 'PAYMENT_SUCCESS' || statusBody.data?.responseCode === 'SUCCESS')) {
            isPaymentSuccessful = true;
            authoritativeCurrency = statusBody.data?.paymentInstrument?.currency || statusBody.data?.currency || null;
            if (statusBody.data?.amount) {
              authoritativeAmount = statusBody.data.amount / 100;
            }
          }
        } else {
          recordLookupFailure('phonepe');
        }
      } catch (err) {
        recordLookupFailure('phonepe');
        logger.warn(`[RECONCILIATION] PhonePe lookup failed for ${eventId}: ${err.message}`);
      }
    }

    if (!authoritativeCurrency) {
      authoritativeCurrency = pData.currency || payload.currency || null;
    }
    if (!isPaymentSuccessful) {
      isPaymentSuccessful = payload.code === 'PAYMENT_SUCCESS' || pData.responseCode === 'SUCCESS';
    }
  } else if (providerName === 'cashfree') {
    const data = payload.data || {};
    const orderId = payload.orderId || data.order?.order_id || eventId;
    providerPaymentId = payload.referenceId || data.payment?.cf_payment_id || orderId;
    tenantId = tenantId || payload.tenantId || data.order?.order_tags?.tenant_id;
    planId = planId || payload.planId || data.order?.order_tags?.plan_id;

    const appId = provider ? decryptText(provider.api_key_encrypted) : process.env.CASHFREE_APP_ID;
    const secretKey = provider ? decryptText(provider.api_secret_encrypted) : process.env.CASHFREE_SECRET_KEY;
    const isTest = provider ? provider.is_test_mode : (process.env.NODE_ENV !== 'production');
    const cfHost = isTest ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com';

    if (appId && secretKey && orderId) {
      try {
        const resp = await fetch(`${cfHost}/pg/orders/${orderId}/payments`, {
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01',
          },
        });
        if (resp.ok) {
          const payments = await resp.json();
          if (Array.isArray(payments) && payments.length > 0) {
            const successfulPayment = payments.find((p) => p.payment_status === 'SUCCESS') || payments[0];
            if (successfulPayment.payment_status === 'SUCCESS') {
              isPaymentSuccessful = true;
            }
            if (successfulPayment.payment_currency) {
              authoritativeCurrency = successfulPayment.payment_currency;
            }
            if (successfulPayment.payment_amount) {
              authoritativeAmount = Number(successfulPayment.payment_amount);
            }
          }
        } else {
          recordLookupFailure('cashfree');
        }
      } catch (err) {
        recordLookupFailure('cashfree');
        logger.warn(`[RECONCILIATION] Cashfree lookup failed for ${eventId}: ${err.message}`);
      }
    }

    if (!authoritativeCurrency) {
      authoritativeCurrency = payload.currency || data.order?.order_currency || data.payment?.payment_currency;
    }
    if (!isPaymentSuccessful) {
      isPaymentSuccessful = payload.type === 'PAYMENT_SUCCESS_WEBHOOK' || payload.txStatus === 'SUCCESS' || data.payment?.payment_status === 'SUCCESS';
    }
  } else if (providerName === 'neuracollect') {
    const data = payload.data || {};
    const orderId = payload.externalOrderId || payload.orderId || data.order?.order_id || eventId;
    providerPaymentId = payload.gatewayOrderId || payload.paymentId || data.payment?.cf_payment_id || orderId;
    tenantId = tenantId || payload.tenantId || data.order?.order_tags?.tenant_id;
    planId = planId || payload.planId || data.order?.order_tags?.plan_id;

    const ncApiKey = provider ? decryptText(provider.api_key_encrypted) : process.env.NEURACOLLECT_API_KEY;
    const ncHost = process.env.NEURACOLLECT_BASE_URL || 'https://collect.neuravolt.ai';

    if (ncApiKey && orderId) {
      try {
        const resp = await fetch(`${ncHost}/api/v1/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${ncApiKey}` },
        });
        if (resp.ok) {
          const ncOrder = await resp.json();
          if (ncOrder && (ncOrder.order_id === orderId || ncOrder.id === orderId)) {
            if (ncOrder.currency) {
              authoritativeCurrency = ncOrder.currency;
            }
            if (ncOrder.amount || ncOrder.order_amount) {
              authoritativeAmount = Number(ncOrder.amount || ncOrder.order_amount);
            }
            if (ncOrder.status === 'PAID' || ncOrder.status === 'SUCCESS') {
              isPaymentSuccessful = true;
            }
          }
        } else {
          recordLookupFailure('neuracollect');
        }
      } catch (err) {
        recordLookupFailure('neuracollect');
        logger.warn(`[RECONCILIATION] NeuraCollect lookup failed for ${eventId}: ${err.message}`);
      }
    }

    if (!authoritativeCurrency) {
      authoritativeCurrency = payload.currency || data.currency || data.order?.order_currency;
    }
    if (!isPaymentSuccessful) {
      isPaymentSuccessful = payload.type === 'PAYMENT_SUCCESS_WEBHOOK' || payload.status === 'SUCCESS' || data.payment?.payment_status === 'SUCCESS' || data.order?.order_status === 'PAID';
    }
  }

  // Validate currency, amount, and status
  let unresolvedReason = null;
  if (!authoritativeCurrency) {
    recordReconciliationMismatch(providerName, 'currency_mismatch');
    unresolvedReason = `Missing currency in ${providerName} event ${eventId} and authoritative lookup unavailable`;
  } else if (String(authoritativeCurrency).trim().toUpperCase() !== 'INR') {
    recordReconciliationMismatch(providerName, 'currency_mismatch');
    unresolvedReason = `Non-INR currency '${String(authoritativeCurrency).toUpperCase()}' rejected. Platform strictly operates in INR.`;
  } else if (webhookRecord.amount > 0 && authoritativeAmount > 0 && Math.abs(Number(webhookRecord.amount) - Number(authoritativeAmount)) > 0.01) {
    recordReconciliationMismatch(providerName, 'amount_mismatch');
    unresolvedReason = `Amount mismatch for ${providerName} event ${eventId}: webhook recorded ${webhookRecord.amount} but authoritative provider returned ${authoritativeAmount}`;
  }

  if (unresolvedReason) {
    await pool.query(
      `UPDATE payment_webhooks
       SET status = 'unresolved',
           processing_error = $1,
           processed_at = NOW()
       WHERE id = $2`,
      [unresolvedReason, webhookRecord.id]
    );
    return {
      success: false,
      status: 'unresolved',
      error: unresolvedReason,
      message: 'Currency could not be authoritatively resolved as INR. Webhook remains unresolved.',
    };
  }

  if (!isPaymentSuccessful) {
    recordStateTransitionFailure(providerName, webhookRecord.status, 'failed');
    const failReason = `Authoritative payment status verification failed for ${eventId} on ${providerName}.`;
    await pool.query(
      `UPDATE payment_webhooks
       SET status = 'failed',
           processing_error = $1,
           processed_at = NOW()
       WHERE id = $2`,
      [failReason, webhookRecord.id]
    );
    return {
      success: false,
      status: 'failed',
      error: failReason,
      message: 'Payment verification failed at provider.',
    };
  }

  // Authoritative verified INR payment
  const verifiedCurrency = 'INR';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Row-lock webhook entry to avoid race condition
    const lockRes = await client.query(
      'SELECT id, status FROM payment_webhooks WHERE id = $1 FOR UPDATE',
      [webhookRecord.id]
    );
    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, status: 'not_found', error: 'Webhook record not found' };
    }
    if (lockRes.rows[0].status === 'processed') {
      await client.query('COMMIT');
      return {
        success: true,
        status: 'already_processed',
        message: 'Webhook was already processed concurrently.',
      };
    }

    // Match tenant if tenantId is missing
    if (!tenantId && typeof eventId === 'string') {
      const parts = eventId.split('_');
      if (parts.length >= 2) {
        const short = parts[1];
        const match = await client.query(
          `SELECT id FROM tenants WHERE REPLACE(id::text, '-', '') LIKE $1 LIMIT 1`,
          [`${short}%`]
        );
        if (match.rows.length > 0) tenantId = match.rows[0].id;
      }
    }

    if (tenantId) {
      let rawPlanId = String(planId || 'starter').trim().toLowerCase();
      if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
      else if (rawPlanId === 'pro') rawPlanId = 'professional';

      const planCheck = await client.query(
        'SELECT id, name FROM plans WHERE LOWER(id) = $1 AND is_active = true',
        [rawPlanId]
      );
      const canonicalPlanId = planCheck.rows.length > 0 ? planCheck.rows[0].id : 'starter';

      await client.query(
        `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, amount, currency, current_period_start, current_period_end, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
         ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
           status = 'active',
           current_period_end = NOW() + INTERVAL '30 days',
           amount = EXCLUDED.amount,
           currency = EXCLUDED.currency,
           updated_at = NOW()`,
        [tenantId, providerName, eventId, canonicalPlanId, authoritativeAmount, verifiedCurrency]
      );

      await client.query(
        "UPDATE tenants SET plan = $1, status = 'active', updated_at = NOW() WHERE id = $2",
        [canonicalPlanId, tenantId]
      );

      const subRes = await client.query(
        'SELECT id FROM subscriptions WHERE provider = $1 AND provider_subscription_id = $2',
        [providerName, eventId]
      );
      const subUuid = subRes.rows.length > 0 ? subRes.rows[0].id : null;

      await recordInvoice(client, {
        tenantId,
        subscriptionId: subUuid,
        provider: providerName,
        providerInvoiceId: providerPaymentId,
        amount: authoritativeAmount,
        currency: verifiedCurrency,
        status: 'paid',
        paidAt: new Date(),
        planName: canonicalPlanId.toUpperCase() + ' Plan',
        pdfUrl: `/admin/invoices/receipt/${providerPaymentId}`,
      });
    }

    await client.query(
      `UPDATE payment_webhooks
       SET status = 'processed',
           processing_error = NULL,
           amount = $1,
           processed_at = NOW()
       WHERE id = $2`,
      [authoritativeAmount, webhookRecord.id]
    );

    await client.query('COMMIT');
    logger.info(`[RECONCILIATION] Webhook event ${eventId} successfully reconciled and processed as INR`);
    return {
      success: true,
      status: 'processed',
      message: `Webhook event ${eventId} successfully reconciled and processed.`,
      amount: authoritativeAmount,
      currency: verifiedCurrency,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error(`[RECONCILIATION] Failed to commit reconciliation for ${eventId}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

// POST /admin/billing/webhooks/:id/retry - Authoritative reconciliation and retry endpoint
router.post('/admin/billing/webhooks/:id/retry', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const webhookRes = await pool.query('SELECT * FROM payment_webhooks WHERE id = $1', [id]);
    if (webhookRes.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook entry not found' });
    }

    const event = webhookRes.rows[0];

    // Cryptographic signature check: retries cannot bypass signature verification
    if (!event.signature_verified) {
      recordRetryAttempt(event.provider, 'admin', 'unverified_signature');
      return res.status(400).json({
        error: 'Cannot retry webhook with unverified signature',
        message: 'Cryptographic signature verification is strictly required before retrying',
      });
    }

    logger.info(`🔄 [Admin] Synchronous authoritative reconciliation triggered for event ${event.event_id} (${event.provider})`);

    const result = await reconcileWebhookEvent(event);

    if (result.status === 'already_processed') {
      recordRetryAttempt(event.provider, 'admin', 'already_processed');
      return res.status(200).json({
        success: true,
        message: result.message,
        webhook: {
          id: event.id,
          event_id: event.event_id,
          provider: event.provider,
          status: 'processed',
        },
      });
    }

    if (!result.success) {
      recordRetryAttempt(event.provider, 'admin', result.status || 'failed');
      const statusCode = result.status === 'unverified_signature' ? 400 : 422;
      return res.status(statusCode).json({
        success: false,
        status: result.status,
        error: result.error,
        message: result.message,
        webhook: {
          id: event.id,
          event_id: event.event_id,
          provider: event.provider,
          status: result.status,
        },
      });
    }

    recordRetryAttempt(event.provider, 'admin', 'processed');
    return res.status(200).json({
      success: true,
      message: result.message,
      webhook: {
        id: event.id,
        event_id: event.event_id,
        provider: event.provider,
        status: 'processed',
        amount: result.amount,
        currency: result.currency,
      },
    });
  } catch (err) {
    logger.error('Failed to trigger manual webhook retry/reconciliation:', err);
    res.status(500).json({ error: 'Failed to reconcile webhook: ' + err.message });
  }
});

// GET /admin/billing/dunning-dashboard - Dunning accounts, retry stages, failure reasons, and recovery rate
router.get('/admin/billing/dunning-dashboard', adminAuth, async (req, res) => {
  try {
    const accountsInRetryRes = await pool.query(
      `SELECT t.id, t.name, t.slug, t.status, s.status as sub_status, s.amount, s.currency,
              COALESCE((t.metadata->>'dunning_stage')::int, 1) as dunning_stage,
              COALESCE(t.metadata->>'failure_reason', 'Card declined') as failure_reason,
              s.updated_at as last_failed_at
       FROM tenants t
       JOIN subscriptions s ON s.tenant_id = t.id
       WHERE t.status = 'past_due' OR s.status = 'past_due'
       ORDER BY s.updated_at DESC`
    );

    const stagesBreakdownRes = await pool.query(
      `SELECT COALESCE((metadata->>'dunning_stage')::int, 1) as stage, COUNT(*)::int as count
       FROM tenants
       WHERE status = 'past_due'
       GROUP BY 1 ORDER BY 1 ASC`
    );

    const failureReasonsRes = await pool.query(
      `SELECT COALESCE(metadata->>'failure_reason', 'Card declined') as reason, COUNT(*)::int as count
       FROM tenants
       WHERE status = 'past_due'
       GROUP BY 1 ORDER BY 2 DESC`
    );

    const recoveryRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active')::int as recovered,
         COUNT(*) FILTER (WHERE status = 'canceled')::int as canceled,
         COUNT(*) FILTER (WHERE status = 'past_due')::int as past_due
       FROM subscriptions`
    );

    const rec = recoveryRes.rows[0] || { recovered: 0, canceled: 0, past_due: 0 };
    const totalProcessed = rec.recovered + rec.canceled;
    const recoveryRatePercent = totalProcessed > 0 ? parseFloat(((rec.recovered / totalProcessed) * 100).toFixed(2)) : 100;

    res.status(200).json({
      accountsInRetry: accountsInRetryRes.rows,
      totalInRetry: accountsInRetryRes.rows.length,
      stagesBreakdown: stagesBreakdownRes.rows,
      failureReasons: failureReasonsRes.rows,
      metrics: {
        recoveredCount: rec.recovered,
        canceledCount: rec.canceled,
        pastDueCount: rec.past_due,
        recoveryRatePercent,
      },
    });
  } catch (err) {
    logger.error('Failed to fetch dunning dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dunning dashboard' });
  }
});

// ─── BILLING PLANS ENDPOINTS ────────────────────────────────────────────────
// GET /admin/plans
router.get('/admin/plans', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM plans ORDER BY price ASC, created_at DESC'
    );
    res.status(200).json({ plans: result.rows });
  } catch (err) {
    logger.error('List plans failed:', err);
    res.status(500).json({ error: 'Failed to list subscription plans' });
  }
});

// GET /admin/plans/:id
router.get('/admin/plans/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Plan not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    logger.error('Get plan failed:', err);
    res.status(500).json({ error: 'Failed to retrieve subscription plan' });
  }
});

// POST /admin/plans
router.post('/admin/plans', adminAuth, async (req, res) => {
  const {
    id,
    name,
    tier,
    price,
    billing,
    currency,
    is_active,
    is_recommended,
    token_limit,
    tenant_limit,
    agent_limit,
    model_access,
    features,
    description,
  } = req.body;

  if (!id || !name || !tier) {
    return res
      .status(400)
      .json({ error: 'Plan id, name, and tier are required' });
  }

  if (currency && String(currency).trim().toUpperCase() !== 'INR') {
    return res
      .status(400)
      .json({ error: 'Only INR plans are permitted. The platform operates strictly in INR (₹).' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO plans (
        id, name, tier, price, billing, currency, is_active, is_recommended,
        token_limit, tenant_limit, agent_limit, model_access, features, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `,
      [
        id.toLowerCase(),
        name,
        tier,
        price || 0,
        billing || 'monthly',
        currency || 'INR',
        is_active !== false,
        is_recommended === true,
        token_limit || -1,
        tenant_limit || -1,
        agent_limit || -1,
        model_access || [],
        JSON.stringify(features || {}),
        description || '',
      ]
    );

    await logAdminAction(
      req.admin.id,
      'plan_create',
      'plan',
      result.rows[0].id,
      null,
      result.rows[0],
      req
    );

    res.status(201).json({ success: true, plan: result.rows[0] });
  } catch (err) {
    logger.error('Create plan failed:', err);
    res.status(500).json({ error: 'Failed to create subscription plan' });
  }
});

// PUT /admin/plans/:id
router.put('/admin/plans/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    tier,
    price,
    billing,
    currency,
    is_active,
    is_recommended,
    token_limit,
    tenant_limit,
    agent_limit,
    model_access,
    features,
    description,
  } = req.body;

  try {
    const oldQuery = await pool.query('SELECT * FROM plans WHERE id = $1', [
      id,
    ]);
    if (oldQuery.rows.length === 0)
      return res.status(404).json({ error: 'Plan not found' });
    const oldPlan = oldQuery.rows[0];

    if (currency && String(currency).trim().toUpperCase() !== 'INR') {
      return res
        .status(400)
        .json({ error: 'Only INR plans are permitted. The platform operates strictly in INR (₹).' });
    }

    const result = await pool.query(
      `
      UPDATE plans
      SET name = COALESCE($1, name),
          tier = COALESCE($2, tier),
          price = COALESCE($3, price),
          billing = COALESCE($4, billing),
          currency = COALESCE($5, currency),
          is_active = COALESCE($6, is_active),
          is_recommended = COALESCE($7, is_recommended),
          token_limit = COALESCE($8, token_limit),
          tenant_limit = COALESCE($9, tenant_limit),
          agent_limit = COALESCE($10, agent_limit),
          model_access = COALESCE($11, model_access),
          features = COALESCE($12::jsonb, features),
          description = COALESCE($13, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `,
      [
        name,
        tier,
        price,
        billing,
        currency,
        is_active,
        is_recommended,
        token_limit,
        tenant_limit,
        agent_limit,
        model_access,
        features ? JSON.stringify(features) : null,
        description,
        id,
      ]
    );

    await logAdminAction(
      req.admin.id,
      'plan_update',
      'plan',
      id,
      oldPlan,
      result.rows[0],
      req
    );

    res.status(200).json({ success: true, plan: result.rows[0] });
  } catch (err) {
    logger.error('Update plan failed:', err);
    res.status(500).json({ error: 'Failed to update subscription plan' });
  }
});

// DELETE /admin/plans/:id
router.delete('/admin/plans/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const oldQuery = await pool.query('SELECT * FROM plans WHERE id = $1', [
      id,
    ]);
    if (oldQuery.rows.length === 0)
      return res.status(404).json({ error: 'Plan not found' });

    await pool.query('DELETE FROM plans WHERE id = $1', [id]);

    await logAdminAction(
      req.admin.id,
      'plan_delete',
      'plan',
      id,
      oldQuery.rows[0],
      null,
      req
    );

    res
      .status(200)
      .json({ success: true, message: 'Plan deleted successfully' });
  } catch (err) {
    logger.error('Delete plan failed:', err);
    res.status(500).json({ error: 'Failed to delete subscription plan' });
  }
});

// GET /health - Status check for admin-api
export default router;
