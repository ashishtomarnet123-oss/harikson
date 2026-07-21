import { pool } from '../admin.js';
import { sendInvoiceReceipt } from './email.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

/**
 * Unified Invoice Creation & Receipt Dispatch Service.
 * Inserts / updates invoice records in a DB transaction, then attempts to email receipt.
 */
export async function createInvoice(invoiceData, externalClient = null) {
  const client = externalClient || (await pool.connect());
  const isSelfManagedTx = !externalClient;

  try {
    if (isSelfManagedTx) {
      await client.query('BEGIN');
    }

    const {
      tenantId,
      subscriptionId = null,
      provider = 'stripe',
      providerInvoiceId,
      amount,
      currency = 'INR',
      status = 'paid',
      paidAt = new Date(),
      invoiceUrl = null,
      pdfUrl = null,
      planName = 'Enterprise AI OS Plan',
      paymentLast4 = '4242',
    } = invoiceData;

    // 1. Insert or update invoice in DB
    const invRes = await client.query(
      `INSERT INTO invoices (
        tenant_id, subscription_id, provider, provider_invoice_id, 
        amount, currency, status, paid_at, invoice_url, pdf_url
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (provider, provider_invoice_id) DO UPDATE SET
         status = EXCLUDED.status,
         paid_at = EXCLUDED.paid_at,
         invoice_url = EXCLUDED.invoice_url,
         pdf_url = EXCLUDED.pdf_url,
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId,
        subscriptionId,
        provider,
        providerInvoiceId,
        amount,
        currency,
        status,
        paidAt,
        invoiceUrl,
        pdfUrl,
      ]
    );

    const invoiceRow = invRes.rows[0];

    // 2. Fetch primary admin user email for tenant
    const userRes = await client.query(
      `SELECT email, name FROM users 
       WHERE tenant_id = $1 
       ORDER BY role = 'admin' DESC, created_at ASC 
       LIMIT 1`,
      [tenantId]
    );

    if (isSelfManagedTx) {
      await client.query('COMMIT');
    }

    // 3. Send email receipt (Best effort, non-blocking for DB commit)
    if (userRes.rows.length > 0) {
      const userEmail = userRes.rows[0].email;
      sendInvoiceReceipt(userEmail, {
        id: invoiceRow.id,
        amount: invoiceRow.amount,
        currency: invoiceRow.currency,
        status: invoiceRow.status,
        invoice_url: invoiceRow.invoice_url,
        pdf_url: invoiceRow.pdf_url,
        provider: invoiceRow.provider,
        provider_invoice_id: invoiceRow.provider_invoice_id,
        plan_name: planName,
        payment_last4: paymentLast4,
      }).catch((emailErr) => {
        logger.error(`[Invoice Email Error] Failed to send receipt for invoice ${invoiceRow.id}:`, emailErr);
      });
    } else {
      logger.warn(`[Invoice Warning] No primary email found for tenant ${tenantId}. Receipt not sent.`);
    }

    return invoiceRow;

  } catch (err) {
    if (isSelfManagedTx) {
      await client.query('ROLLBACK');
    }
    logger.error('[Create Invoice Transaction Error]:', err);
    throw err;
  } finally {
    if (isSelfManagedTx) {
      client.release();
    }
  }
}
