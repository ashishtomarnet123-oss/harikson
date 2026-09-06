import { Router } from 'express';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import jwt from 'jsonwebtoken';
import { executeTenantQuery, executeCachedQuery, invalidateTenantCache } from '../db/pool.js';
import logger from '../utils/logger.js';
import { enqueueWebhookEvent } from '../services/webhookRetryService.js';
import { executePlanChange, calculateProration } from '../services/prorationService.js';
import { reactivateTenantSubscription } from '../services/dunningService.js';

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

  const sig = req.headers['stripe-signature'];
  let event: any;

  try {
    if (!req.rawBody) throw new Error('Raw request body unavailable for signature verification');
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig || '',
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock'
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
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe payment provider is not configured' });
  }

  const { planId, paymentProvider = 'stripe', countryCode = 'US' } = req.body;

  try {
    const planRes = await executeCachedQuery('SELECT * FROM plans WHERE id = $1', [planId], 300);
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

    if (paymentProvider === 'stripe') {
      const baseUrl = req.headers.origin || process.env.APP_BASE_URL || 'https://app.neuravolt.cloud';
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

      return res.json({ checkoutUrl: session.url, sessionId: session.id });
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

    const newPlanRes = await executeCachedQuery('SELECT * FROM plans WHERE id = $1', [newPlanId], 300);
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
