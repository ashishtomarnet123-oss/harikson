import axios from 'axios';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import logger from '../utils/logger.js';

function decryptCredential(encryptedText: string | null | undefined): string {
  if (!encryptedText) return '';
  try {
    const rawKey =
      process.env.PAYMENT_ENCRYPTION_KEY ||
      process.env.WORKFLOW_CREDENTIAL_KEY ||
      process.env.TENANT_MASTER_KEY ||
      process.env.JWT_SECRET ||
      'xarwiz-default-secure-workflow-key-32b';
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest();
    const parts = encryptedText.split(':');
    if (parts.length < 3) return encryptedText;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', hashedKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    logger.warn('NeuraCollect credential decryption fallback:', err.message);
    return encryptedText;
  }
}

export interface NeuraCollectConfig {
  apiKey: string;
  webhookSecret: string;
  merchantId?: string;
  isTestMode: boolean;
  endpoint: string;
}

export interface NeuraCollectCheckoutParams {
  tenantId: string;
  planId: string;
  amountRupees: number;
  currency?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
}

export interface NeuraCollectCheckoutResponse {
  paymentSessionId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  environment: string;
  checkoutUrl?: string;
}

export class NeuraCollectService {
  private static readonly DEFAULT_ENDPOINT = 'https://teams.neuravolt.in/api/v1/collects/checkout/sessions';

  /**
   * Retrieve active NeuraCollect credentials from database or environment fallback
   */
  public static async getConfig(): Promise<NeuraCollectConfig> {
    try {
      const res = await pool.query(
        "SELECT * FROM payment_providers WHERE provider = 'neuracollect' AND is_active = true ORDER BY created_at DESC LIMIT 1"
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        const apiKey = decryptCredential(row.api_key_encrypted) || '';
        const webhookSecret = decryptCredential(row.webhook_secret_encrypted) || decryptCredential(row.api_secret_encrypted) || '';
        const merchantId = row.merchant_id || '';
        const isTestMode = row.is_test_mode !== false;

        return {
          apiKey: apiKey || process.env.NEURACOLLECT_API_KEY || '',
          webhookSecret: webhookSecret || process.env.NEURACOLLECT_WEBHOOK_SECRET || '',
          merchantId,
          isTestMode,
          endpoint: process.env.NEURACOLLECT_ENDPOINT || this.DEFAULT_ENDPOINT,
        };
      }
    } catch (err: any) {
      logger.warn('[NeuraCollectService] Failed to query payment_providers for NeuraCollect, using env fallback:', err.message);
    }

    return {
      apiKey: process.env.NEURACOLLECT_API_KEY || '',
      webhookSecret: process.env.NEURACOLLECT_WEBHOOK_SECRET || '',
      merchantId: process.env.NEURACOLLECT_MERCHANT_ID || '',
      isTestMode: process.env.NEURACOLLECT_TEST_MODE !== 'false',
      endpoint: process.env.NEURACOLLECT_ENDPOINT || this.DEFAULT_ENDPOINT,
    };
  }

  /**
   * Create Checkout Session on NeuraCollect
   */
  public static async initiatePayment(params: NeuraCollectCheckoutParams): Promise<NeuraCollectCheckoutResponse> {
    const config = await this.getConfig();

    if (!config.apiKey) {
      throw new Error('NeuraCollect is not configured. Please add your x-collect-api-key in the Admin Panel.');
    }

    const {
      tenantId,
      planId,
      amountRupees,
      currency = 'INR',
      userId,
      customerName = 'Valued Customer',
      customerEmail = 'billing@xarwiz.com',
      customerPhone = '9876543210',
      returnUrl,
    } = params;

    const shortTenant = tenantId.replace(/-/g, '').slice(0, 8);
    const shortPlan = planId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const externalOrderId = `nc_${shortTenant}_${shortPlan}_${Date.now()}`;

    const formattedAmount = amountRupees.toFixed(2);
    const effectiveReturnUrl = returnUrl || `https://xarwiz.com/settings/billing?status=success&provider=neuracollect&order_id={order_id}&planId=${planId}`;

    const payload = {
      orderId: externalOrderId,
      externalOrderId,
      amount: formattedAmount,
      currency,
      customer: {
        customerId: userId || tenantId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      returnUrl: effectiveReturnUrl,
    };

    logger.info({ externalOrderId, amount: formattedAmount, currency }, '[NeuraCollectService] Creating checkout session on NeuraCollect');

    try {
      const response = await axios.post(config.endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': config.merchantId || 'xarwiz',
          'x-app-id': config.merchantId || 'xarwiz',
          'x-api-key': config.apiKey,
          'x-collect-api-key': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`,
        },
        timeout: 15000,
      });

      const data = response.data || {};
      const checkoutUrl = data.checkoutUrl || data.redirectUrl || data.paymentLink || '';
      const paymentSessionId = data.paymentSessionId || data.payment_session_id || '';
      const gatewayOrderId = data.gatewayOrderId || data.order_id || externalOrderId;
      const environment = data.environment || (config.isTestMode ? 'TEST' : 'PRODUCTION');

      return {
        paymentSessionId,
        gatewayOrderId,
        amount: Number(formattedAmount),
        currency,
        environment,
        checkoutUrl: checkoutUrl || (paymentSessionId ? `https://payments.cashfree.com/order/#${paymentSessionId}` : effectiveReturnUrl),
      };
    } catch (err: any) {
      const errorData = err.response?.data || err.message;
      logger.error({ errorData }, '[NeuraCollectService] Failed to create checkout session');
      throw new Error(err.response?.data?.message || 'NeuraCollect checkout initiation failed');
    }
  }

  /**
   * Verify HMAC-SHA256 signature from NeuraCollect outbound webhook
   * Standard: crypto.createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('base64')
   */
  public static async verifyWebhookSignature(
    rawBody: string,
    timestamp: string,
    signature: string,
    secretKeyOverride?: string
  ): Promise<boolean> {
    try {
      let secret = secretKeyOverride;

      if (!secret) {
        const config = await this.getConfig();
        secret = config.webhookSecret;
      }

      if (!secret) {
        logger.warn('[NeuraCollectService] No secret configured for webhook signature verification');
        return false;
      }

      const signedPayload = `${timestamp}${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('base64');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const sigBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== sigBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, sigBuf);
    } catch (err: any) {
      logger.error({ err: err.message }, '[NeuraCollectService] Error during webhook signature verification');
      return false;
    }
  }
}

export default NeuraCollectService;
