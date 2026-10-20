import { Router } from 'express';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import jwt from 'jsonwebtoken';
import { executeTenantQuery, executeCachedQuery, invalidateTenantCache } from '../db/pool.js';
import logger from '../utils/logger.js';
import { enqueueWebhookEvent } from '../services/webhookRetryService.js';
import { executePlanChange, calculateProration } from '../services/prorationService.js';
import { reactivateTenantSubscription } from '../services/dunningService.js';
import { PhonePeService } from '../services/phonepe.service.js';
import { CashfreeService } from '../services/cashfree.service.js';
import { NeuraCollectService } from '../services/neuracollect.service.js';

const router = Router();

if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn('STRIPE_SECRET_KEY not set — Stripe checkout routes will return 503');
}
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : null;

// --- Webhook routes FIRST (before auth middleware) --- //
// These are called by Stripe/Razorpay servers, not by authenticated users.

// POST /api/billing/webhooks/stripe
router.post('/webhooks/stripe', async (req: any, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('STRIPE_WEBHOOK_SECRET not set — cannot verify webhook signature');
    return res.status(503).json({ error: 'Stripe webhook verification not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event: any;

  try {
    if (!req.rawBody) throw new Error('Raw request body unavailable for signature verification');
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig || '',
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.warn('Stripe webhook signature verification failed, rejecting:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const eventId = event.id || 'evt_' + Math.random().toString(36).substring(2, 10);
  const eventType = event.type || 'checkout.session.completed';
  const amount = event.data?.object?.amount_total ? event.data.object.amount_total / 100 : 0;

  try {
    await enqueueWebhookEvent('stripe', eventId, eventType, event, amount);
    return res.status(200).json({ received: true, status: 'pending', eventId });
  } catch (err: any) {
    logger.error('Failed to handle incoming Stripe webhook:', err);
    return res.status(200).json({ received: true, status: 'error_logged' });
  }
});

// POST /api/billing/webhooks/razorpay
router.post('/webhooks/razorpay', async (req: any, res) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured — rejecting');
    return res.status(500).json({ error: 'Webhook not configured' });
  }
  if (!signature || !req.rawBody) {
    return res.status(400).json({ error: 'Missing signature or raw body' });
  }

  const isValid = Razorpay.validateWebhookSignature(req.rawBody.toString(), signature, webhookSecret);
  if (!isValid) {
    logger.warn('Razorpay webhook signature verification failed, rejecting');
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body;
  const eventId = event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id || 'rzp_' + Math.random().toString(36).substring(2, 10);
  const eventType = event.event || 'payment.captured';
  const amount = event.payload?.payment?.entity?.amount ? event.payload.payment.entity.amount / 100 : 0;

  try {
    await enqueueWebhookEvent('razorpay', eventId, eventType, event, amount);
    return res.status(200).json({ received: true, status: 'pending', eventId });
  } catch (err: any) {
    logger.error('Failed to handle incoming Razorpay webhook:', err);
    return res.status(200).json({ received: true, status: 'error_logged' });
  }
});

// POST /api/billing/webhooks/phonepe
router.post('/webhooks/phonepe', async (req: any, res) => {
  const xVerify = req.headers['x-verify'] as string | undefined;
  const base64Response = req.body?.response;

  if (!xVerify || !base64Response) {
    logger.warn('PhonePe webhook received without x-verify or response payload');
    return res.status(400).json({ error: 'Missing signature or payload' });
  }

  const isValid = await PhonePeService.verifyWebhookSignature(base64Response, xVerify);
  if (!isValid) {
    logger.warn('PhonePe webhook signature verification failed, rejecting');
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  let decoded: any;
  try {
    decoded = PhonePeService.decodeWebhookResponse(base64Response);
  } catch (parseErr: any) {
    logger.error('Failed to parse PhonePe webhook JSON:', parseErr);
    return res.status(400).json({ error: 'Invalid payload JSON' });
  }

  const eventData = decoded?.data || {};
  const eventId = eventData.transactionId || eventData.merchantTransactionId || ('phpe_' + Date.now());
  const eventType = decoded.code || 'PAYMENT_SUCCESS';
  const amount = eventData.amount ? eventData.amount / 100 : 0;

  try {
    await enqueueWebhookEvent('phonepe', eventId, eventType, decoded, amount);
    return res.status(200).json({ received: true, status: 'pending', eventId });
  } catch (err: any) {
    logger.error('Failed to handle incoming PhonePe webhook:', err);
    return res.status(200).json({ received: true, status: 'error_logged' });
  }
});

// POST /api/billing/webhooks/cashfree & /webhooks/cashfree
router.post(['/webhooks/cashfree', '/billing/webhooks/cashfree'], async (req: any, res) => {
  const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';
  const signature = (req.headers['x-webhook-signature'] as string) || '';
  const rawBody = req.rawBody || JSON.stringify(req.body || {});

  if (!signature || !timestamp) {
    logger.warn('Cashfree webhook received without signature or timestamp headers');
    return res.status(400).json({ error: 'Missing Cashfree webhook headers' });
  }

  const isValid = CashfreeService.verifyWebhookSignature(rawBody, timestamp, signature);
  if (!isValid && process.env.NODE_ENV === 'production') {
    logger.warn('Cashfree webhook signature verification failed, rejecting');
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const payload = req.body || {};
  const data = payload.data || {};
  const order = data.order || {};
  const payment = data.payment || {};

  const orderId = order.order_id || payload.orderId || ('cf_' + Date.now());
  const eventType = payload.type || 'PAYMENT_SUCCESS_WEBHOOK';
  const amount = Number(order.order_amount || payment.payment_amount || 0);

  try {
    await enqueueWebhookEvent('cashfree', orderId, eventType, payload, amount);
    return res.status(200).json({ received: true, status: 'pending', orderId });
  } catch (err: any) {
    logger.error('Failed to handle incoming Cashfree webhook:', err);
    return res.status(200).json({ received: true, status: 'error_logged' });
  }
});

// POST /api/billing/webhooks/neuracollect & /webhooks/neuracollect
router.post(['/webhooks/neuracollect', '/billing/webhooks/neuracollect'], async (req: any, res) => {
  const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';
  const signature = (req.headers['x-webhook-signature'] as string) || '';
  const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body || {});

  if (!signature || !timestamp) {
    logger.warn('NeuraCollect webhook received without signature or timestamp headers');
    return res.status(400).json({ error: 'Missing NeuraCollect webhook headers' });
  }

  const isValid = await NeuraCollectService.verifyWebhookSignature(rawBody, timestamp, signature);
  if (!isValid && process.env.NODE_ENV === 'production') {
    logger.warn('NeuraCollect webhook signature verification failed, rejecting');
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const payload = req.body || {};
  const orderId = payload.externalOrderId || payload.orderId || payload.gatewayOrderId || ('nc_' + Date.now());
  const eventType = payload.eventType || payload.type || 'PAYMENT_SUCCESS_WEBHOOK';
  const amount = Number(payload.amount || payload.order_amount || 0);

  try {
    await enqueueWebhookEvent('neuracollect', orderId, eventType, payload, amount);
    return res.status(200).json({ received: true, status: 'pending', orderId });
  } catch (err: any) {
    logger.error('Failed to handle incoming NeuraCollect webhook:', err);
    return res.status(200).json({ received: true, status: 'error_logged' });
  }
});

// --- Auth middleware — everything below requires a valid JWT --- //

router.use((req: any, res, next) => {
  const authHeader = req.headers.authorization || '';
  const cookieToken = req.cookies?.hk_access_token;
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// GET /api/billing/providers & /api/v1/billing/providers
router.get('/providers', async (req, res) => {
  try {
    const provRes = await executeCachedQuery(
      'SELECT provider, name, is_test_mode FROM payment_providers WHERE is_active = true ORDER BY created_at ASC',
      [],
      60
    );

    const activeList = provRes.rows || provRes || [];
    const providers: Array<{
      id: string;
      name: string;
      label: string;
      color: string;
      dotColor: string;
      badge?: string;
      isTestMode: boolean;
    }> = [];

    const META_MAP: Record<string, { name: string; label: string; color: string; dotColor: string; badge?: string }> = {
      neuracollect: {
        name: 'Neuravolt Payments',
        label: 'Neuravolt Payments (Instant UPI, Cards & Netbanking)',
        color: '#059669',
        dotColor: '#10b981',
        badge: 'Recommended',
      },
      phonepe: {
        name: 'PhonePe',
        label: 'PhonePe (Instant UPI & QR)',
        color: '#5f259f',
        dotColor: '#5f259f',
      },
      cashfree: {
        name: 'Cashfree',
        label: 'Cashfree (Embedded PG)',
        color: '#b45309',
        dotColor: '#d97706',
      },
      razorpay: {
        name: 'Razorpay',
        label: 'Cards & Netbanking (Razorpay)',
        color: '#2563eb',
        dotColor: '#2563eb',
      },
      stripe: {
        name: 'Stripe',
        label: 'Credit / Debit Cards (Stripe)',
        color: '#6366f1',
        dotColor: '#6366f1',
      },
    };

    for (const row of activeList) {
      const meta: { name: string; label: string; color: string; dotColor: string; badge?: string } = META_MAP[row.provider] || {
        name: row.name || row.provider,
        label: row.name || row.provider,
        color: '#059669',
        dotColor: '#10b981',
      };
      if (!providers.some((p) => p.id === row.provider)) {
        providers.push({
          id: row.provider,
          name: meta.name,
          label: meta.label,
          color: meta.color,
          dotColor: meta.dotColor,
          badge: meta.badge,
          isTestMode: row.is_test_mode,
        });
      }
    }

    if (!providers.some((p) => p.id === 'neuracollect') && process.env.NEURACOLLECT_API_KEY) {
      providers.push({
        id: 'neuracollect',
        ...META_MAP.neuracollect,
        isTestMode: process.env.NEURACOLLECT_TEST_MODE !== 'false',
      });
    }
    if (!providers.some((p) => p.id === 'phonepe') && process.env.PHONEPE_MERCHANT_ID) {
      providers.push({
        id: 'phonepe',
        ...META_MAP.phonepe,
        isTestMode: process.env.PHONEPE_ENV !== 'PROD',
      });
    }
    if (!providers.some((p) => p.id === 'cashfree') && (process.env.CASHFREE_APP_ID || process.env.CASHFREE_PARTNER_API_KEY)) {
      providers.push({
        id: 'cashfree',
        ...META_MAP.cashfree,
        isTestMode: process.env.CASHFREE_TEST_MODE !== 'false',
      });
    }
    if (!providers.some((p) => p.id === 'razorpay') && (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)) {
      providers.push({
        id: 'razorpay',
        ...META_MAP.razorpay,
        isTestMode: false,
      });
    }

    res.json({ providers });
  } catch (err: any) {
    logger.error('Failed to get billing providers:', err);
    res.status(500).json({ error: 'Failed to fetch billing providers' });
  }
});

// GET /api/billing/plans
router.get('/plans', async (req, res) => {
  try {
    const plansRes = await executeCachedQuery(
      'SELECT id, name, price, currency, interval, max_users, max_agents, max_documents, max_tokens, features FROM plans WHERE is_active = true ORDER BY price ASC',
      [],
      300
    );

    res.json({ plans: plansRes.rows || plansRes });
  } catch (err: any) {
    logger.error('Fetch plans error:', err);
    res.status(500).json({ error: 'Failed to fetch billing plans' });
  }
});

// GET /api/billing/invoices
router.get('/invoices', async (req: any, res) => {
  try {
    const invRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT id, invoice_number, amount, currency, status, tax_amount, total, pdf_url, created_at, paid_at
         FROM invoices
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [req.tenant.id]
      )
    );

    res.json({ invoices: invRes.rows });
  } catch (err: any) {
    logger.error('Fetch invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch billing invoices' });
  }
});

// GET /api/billing/tax-rates
router.get('/tax-rates', async (req: any, res) => {
  const country = (req.query.country as string) || 'US';
  try {
    const taxRes = await executeCachedQuery(
      'SELECT country_code, tax_name, rate_percent, type FROM tax_rates WHERE country_code = $1 AND is_active = true LIMIT 1',
      [country.toUpperCase()],
      300
    );

    const taxRate = taxRes.rows?.[0] || { country_code: country, tax_name: 'GST/VAT', rate_percent: 0, type: 'standard' };
    res.json({ taxRate });
  } catch (err: any) {
    logger.error('Fetch tax rates error:', err);
    res.status(500).json({ error: 'Failed to fetch tax rates' });
  }
});

// POST /api/billing/checkout
router.post('/checkout', async (req: any, res) => {
  const { planId, paymentProvider = 'stripe', countryCode = 'US' } = req.body;

  if (paymentProvider === 'stripe' && !stripe) {
    return res.status(503).json({ error: 'Stripe payment provider is not configured' });
  }

  try {
    const normalizedPlanId = (planId || '').trim().toLowerCase() === 'pro' ? 'professional' : planId;
    const planRes = await executeCachedQuery('SELECT * FROM plans WHERE id = $1', [normalizedPlanId], 300);
    const plan = planRes.rows?.[0];

    if (!plan) return res.status(404).json({ error: 'Selected plan not found' });

    const taxRes = await executeCachedQuery(
      'SELECT rate_percent FROM tax_rates WHERE country_code = $1 AND is_active = true LIMIT 1',
      [countryCode.toUpperCase()],
      300
    );
    const taxRate = taxRes.rows?.[0]?.rate_percent || 0;
    const subtotal = Number(plan.price);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    if (paymentProvider === 'phonepe') {
      const baseUrl = req.headers.origin || process.env.APP_BASE_URL || 'https://xarwiz.com';
      const phonepeResult = await PhonePeService.initiatePayment({
        tenantId: req.tenant?.id || req.user?.tenant_id,
        planId: plan.id,
        amountRupees: total,
        userId: req.user?.userId || req.user?.id,
        redirectUrl: `${baseUrl}/settings/billing?status=success&provider=phonepe&transactionId={TRANSACTION_ID}&planId=${plan.id}`,
        callbackUrl: `${process.env.API_BASE_URL || 'https://admin-api.xarwiz.com'}/webhooks/phonepe`,
      });

      return res.json({
        checkoutUrl: phonepeResult.redirectUrl,
        merchantTransactionId: phonepeResult.merchantTransactionId,
        provider: 'phonepe',
      });
    }

    if (paymentProvider === 'cashfree') {
      const baseUrl = req.headers.origin || process.env.APP_BASE_URL || 'https://xarwiz.com';
      const cashfreeResult = await CashfreeService.initiatePayment({
        tenantId: req.tenant?.id || req.user?.tenant_id,
        planId: plan.id,
        amountRupees: total,
        currency: plan.currency || 'INR',
        userId: req.user?.userId || req.user?.id,
        customerEmail: req.user?.email,
        customerName: req.user?.name,
        redirectUrl: `${baseUrl}/settings/billing?status=success&provider=cashfree&orderId={order_id}&planId=${plan.id}`,
        notifyUrl: `${process.env.API_BASE_URL || 'https://admin-api.xarwiz.com'}/webhooks/cashfree`,
      });

      return res.json({
        checkoutUrl: cashfreeResult.checkoutUrl,
        paymentSessionId: cashfreeResult.paymentSessionId,
        orderId: cashfreeResult.orderId,
        provider: 'cashfree',
      });
    }

    if (paymentProvider === 'neuracollect') {
      const baseUrl = req.headers.origin || process.env.APP_BASE_URL || 'https://xarwiz.com';
      const ncResult = await NeuraCollectService.initiatePayment({
        tenantId: req.tenant?.id || req.user?.tenant_id,
        planId: plan.id,
        amountRupees: total,
        currency: plan.currency || 'INR',
        userId: req.user?.userId || req.user?.id,
        customerEmail: req.user?.email,
        customerName: req.user?.name,
        returnUrl: `${baseUrl}/settings/billing?status=success&provider=neuracollect&order_id={order_id}&planId=${plan.id}`,
      });

      return res.json({
        checkoutUrl: ncResult.checkoutUrl,
        paymentSessionId: ncResult.paymentSessionId,
        gatewayOrderId: ncResult.gatewayOrderId,
        environment: ncResult.environment,
        amount: ncResult.amount,
        currency: ncResult.currency,
        provider: 'neuracollect',
      });
    }

    if (paymentProvider === 'stripe' && stripe) {
      const baseUrl = req.headers.origin || process.env.APP_BASE_URL || 'https://xarwiz.com';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: plan.currency || 'usd',
              product_data: {
                name: plan.name + ' Plan',
                description: `Subscription plan with ${taxRate}% tax included`,
              },
              unit_amount: Math.round(total * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${baseUrl}/settings/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/settings/billing?status=canceled`,
        metadata: {
          tenantId: req.tenant.id,
          planId: plan.id,
          taxAmount: String(taxAmount),
        },
      });

      return res.json({ checkoutUrl: session.url, sessionId: session.id, provider: 'stripe' });
    }

    res.status(400).json({ error: 'Unsupported payment provider' });
  } catch (err: any) {
    logger.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to initiate checkout session' });
  }
});

// POST /api/billing/proration-preview
router.post('/proration-preview', async (req: any, res) => {
  const { newPlanId } = req.body;
  if (!newPlanId) return res.status(400).json({ error: 'newPlanId is required' });

  try {
    const subRes = await executeCachedQuery(
      `SELECT s.*, p.price as old_price, p.currency
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.tenant.id],
      60
    );

    const targetPlanId = (newPlanId || '').trim().toLowerCase() === 'pro' ? 'professional' : newPlanId;
    const newPlanRes = await executeCachedQuery('SELECT * FROM plans WHERE id = $1', [targetPlanId], 300);
    const newPlan = newPlanRes.rows?.[0];

    if (!newPlan) return res.status(404).json({ error: 'Selected new plan not found' });

    const currentSub = subRes.rows?.[0];
    const oldPrice = currentSub ? Number(currentSub.old_price) : 0;
    const newPrice = Number(newPlan.price);
    const currency = newPlan.currency || 'INR';

    const periodStart = currentSub?.current_period_start ? new Date(currentSub.current_period_start) : new Date();
    const periodEnd = currentSub?.current_period_end ? new Date(currentSub.current_period_end) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const inTrial = currentSub?.status === 'trialing';

    const proration = calculateProration(oldPrice, newPrice, periodStart, periodEnd, new Date(), inTrial, currency);

    res.json({ proration });
  } catch (err: any) {
    logger.error('Proration preview error:', err);
    res.status(500).json({ error: 'Failed to calculate proration preview' });
  }
});

// POST /api/billing/change-plan
router.post('/change-plan', async (req: any, res) => {
  const { newPlanId, paymentProvider = 'stripe' } = req.body;
  if (!newPlanId) return res.status(400).json({ error: 'newPlanId is required' });

  try {
    const proration = await executePlanChange(req.tenant.id, newPlanId, paymentProvider);
    res.json({
      success: true,
      message: proration.invoiceDescription,
      proration,
    });
  } catch (err: any) {
    logger.error('Plan change error:', err);
    res.status(500).json({ error: err.message || 'Failed to change plan' });
  }
});

// POST /api/billing/reactivate
router.post('/reactivate', async (req: any, res) => {
  try {
    await reactivateTenantSubscription(req.tenant.id);
    res.json({
      success: true,
      message: 'Subscription reactivated successfully. Access has been restored.',
    });
  } catch (err: any) {
    logger.error('Failed to reactivate subscription:', err);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

export default router;
