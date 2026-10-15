import crypto from 'crypto';
import axios from 'axios';
import { pool } from '../db/pool.js';
import logger from '../utils/logger.js';

export interface ICashfreeConfig {
  partnerApiKey: string;
  partnerMerchantId: string;
  appId?: string;
  secretKey?: string;
  webhookSecret?: string;
  isTestMode: boolean;
  baseUrl: string;
  checkoutBaseUrl: string;
  apiVersion: string;
}

export interface ICashfreeOrderInitParams {
  tenantId: string;
  planId: string;
  amountRupees: number;
  currency?: string;
  userId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  redirectUrl: string;
  notifyUrl?: string;
  partnerMerchantId?: string;
}

export interface ICashfreeOrderResult {
  success: boolean;
  orderId: string;
  cfOrderId?: string;
  paymentSessionId: string;
  orderStatus: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
}

export interface ICashfreeOrderStatusResult {
  success: boolean;
  orderId: string;
  cfOrderId?: string;
  orderStatus: string; // 'PAID' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  orderAmount: number;
  orderCurrency: string;
  customerDetails?: any;
  paymentSessionId?: string;
  rawResponse?: any;
}

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
    logger.warn('Cashfree credential decryption fallback:', err.message);
    return encryptedText;
  }
}

export class CashfreeService {
  public static readonly API_VERSION = '2023-08-01';

  /**
   * Fetch active Cashfree configuration from DB or fallback to environment variables.
   */
  public static async getConfig(): Promise<ICashfreeConfig> {
    try {
      const res = await pool.query(
        "SELECT * FROM payment_providers WHERE provider = 'cashfree' AND is_active = true ORDER BY created_at DESC LIMIT 1"
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        const partnerApiKey =
          decryptCredential(row.api_key_encrypted) ||
          process.env.CASHFREE_PARTNER_API_KEY ||
          '';
        const partnerMerchantId =
          row.merchant_id ||
          process.env.CASHFREE_PARTNER_MERCHANT_ID ||
          '';
        const appId =
          decryptCredential(row.api_key_encrypted) ||
          process.env.CASHFREE_APP_ID ||
          '';
        const secretKey =
          decryptCredential(row.api_secret_encrypted) ||
          process.env.CASHFREE_SECRET_KEY ||
          '';
        const webhookSecret =
          decryptCredential(row.webhook_secret_encrypted) ||
          partnerApiKey ||
          secretKey ||
          process.env.CASHFREE_WEBHOOK_SECRET ||
          '';
        const isTestMode = row.is_test_mode !== false;

        const baseUrl = isTestMode
          ? 'https://sandbox.cashfree.com/pg'
          : 'https://api.cashfree.com/pg';

        const checkoutBaseUrl = isTestMode
          ? 'https://payments-test.cashfree.com/order/#'
          : 'https://payments.cashfree.com/order/#';

        return {
          partnerApiKey,
          partnerMerchantId,
          appId,
          secretKey,
          webhookSecret,
          isTestMode,
          baseUrl,
          checkoutBaseUrl,
          apiVersion: this.API_VERSION,
        };
      }
    } catch (err: any) {
      logger.warn('Failed to query payment_providers for Cashfree, using env fallback:', err.message);
    }

    const isTestMode = process.env.CASHFREE_TEST_MODE !== 'false';
    const partnerApiKey = process.env.CASHFREE_PARTNER_API_KEY || '';
    const partnerMerchantId = process.env.CASHFREE_PARTNER_MERCHANT_ID || '';
    const appId = process.env.CASHFREE_APP_ID || '';
    const secretKey = process.env.CASHFREE_SECRET_KEY || '';

    return {
      partnerApiKey,
      partnerMerchantId,
      appId,
      secretKey,
      webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || partnerApiKey || secretKey,
      isTestMode,
      baseUrl: isTestMode ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg',
      checkoutBaseUrl: isTestMode
        ? 'https://payments-test.cashfree.com/order/#'
        : 'https://payments.cashfree.com/order/#',
      apiVersion: this.API_VERSION,
    };
  }

  /**
   * Helper to construct appropriate request headers for Cashfree API requests.
   * Uses Partner Auth headers (x-partner-apikey, x-partner-merchantid) when available,
   * falling back to standard merchant headers (x-client-id, x-client-secret).
   */
  public static getRequestHeaders(config: ICashfreeConfig, merchantIdOverride?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-version': config.apiVersion,
    };

    const targetMerchantId = merchantIdOverride || config.partnerMerchantId;

    if (config.partnerApiKey && targetMerchantId) {
      headers['x-partner-apikey'] = config.partnerApiKey;
      headers['x-partner-merchantid'] = targetMerchantId;
    } else if (config.appId && config.secretKey) {
      headers['x-client-id'] = config.appId;
      headers['x-client-secret'] = config.secretKey;
    } else if (config.partnerApiKey) {
      headers['x-partner-apikey'] = config.partnerApiKey;
      if (targetMerchantId) {
        headers['x-partner-merchantid'] = targetMerchantId;
      }
    }

    return headers;
  }

  /**
   * Initiate a Cashfree Payment Order (Embedded / Partner PG).
   * Calls POST /orders on Cashfree Payment Gateway API.
   */
  public static async initiatePayment(params: ICashfreeOrderInitParams): Promise<ICashfreeOrderResult> {
    const config = await this.getConfig();

    // Unique order ID recognizable in webhooks and reconciliations
    const rawUuid = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const orderId = `cf_ord_${Date.now()}_${rawUuid}`;

    const sanitizedPhone = (params.customerPhone || '9999999999')
      .replace(/\D/g, '')
      .slice(-10) || '9999999999';

    const safeEmail = params.customerEmail || 'billing@harikson.ai';
    const safeName = params.customerName || 'Harikson Customer';
    const safeCustomerId = params.userId || `cust_${crypto.randomBytes(6).toString('hex')}`;
    const safeCurrency = (params.currency || 'INR').toUpperCase();
    const formattedAmount = Number(params.amountRupees.toFixed(2));

    const returnUrl = params.redirectUrl.includes('{order_id}')
      ? params.redirectUrl.replace('{order_id}', orderId)
      : `${params.redirectUrl}${params.redirectUrl.includes('?') ? '&' : '?'}orderId=${orderId}`;

    const requestBody: any = {
      order_id: orderId,
      order_amount: formattedAmount,
      order_currency: safeCurrency,
      customer_details: {
        customer_id: safeCustomerId,
        customer_email: safeEmail,
        customer_phone: sanitizedPhone,
        customer_name: safeName,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: params.notifyUrl || undefined,
        payment_methods: 'cc,dc,upi,nb,app,paylater',
      },
      order_note: `Subscription plan: ${params.planId} (Tenant: ${params.tenantId})`,
      order_tags: {
        tenant_id: params.tenantId,
        plan_id: params.planId,
      },
    };

    // Remove notify_url if undefined
    if (!requestBody.order_meta.notify_url) {
      delete requestBody.order_meta.notify_url;
    }

    const headers = this.getRequestHeaders(config, params.partnerMerchantId);

    logger.info(`[CashfreeService] Initiating order: ${orderId} amount: ${formattedAmount} ${safeCurrency}`);

    try {
      const response = await axios.post(`${config.baseUrl}/orders`, requestBody, {
        headers,
        timeout: 15000,
      });

      const data = response.data;
      const paymentSessionId = data.payment_session_id || '';
      const cfOrderId = data.cf_order_id ? String(data.cf_order_id) : undefined;
      const orderStatus = data.order_status || 'ACTIVE';

      // Cashfree pre-built checkout page URL:
      const checkoutUrl = data.payments?.url || `${config.checkoutBaseUrl}${paymentSessionId}`;

      return {
        success: true,
        orderId,
        cfOrderId,
        paymentSessionId,
        orderStatus,
        checkoutUrl,
        amount: formattedAmount,
        currency: safeCurrency,
      };
    } catch (err: any) {
      const errResponse = err.response?.data;
      logger.error('[CashfreeService] Order initiation failed:', errResponse || err.message);

      // In development / demo when live sandbox keys are not yet filled in,
      // return a graceful sandbox fallback session so developers can test UI flows
      if (!config.partnerApiKey && !config.appId) {
        logger.warn('[CashfreeService] Using simulated sandbox order session for development');
        const mockSessionId = `session_mock_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        return {
          success: true,
          orderId,
          cfOrderId: `cf_mock_${Date.now()}`,
          paymentSessionId: mockSessionId,
          orderStatus: 'ACTIVE',
          checkoutUrl: returnUrl,
          amount: formattedAmount,
          currency: safeCurrency,
        };
      }

      throw new Error(
        errResponse?.message ||
        errResponse?.error ||
        err.message ||
        'Cashfree order initiation failed'
      );
    }
  }

  /**
   * Fetch order status from Cashfree API.
   * Calls GET /orders/{order_id}
   */
  public static async getOrderStatus(orderId: string, merchantIdOverride?: string): Promise<ICashfreeOrderStatusResult> {
    const config = await this.getConfig();
    const headers = this.getRequestHeaders(config, merchantIdOverride);

    try {
      const response = await axios.get(`${config.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
        headers,
        timeout: 10000,
      });

      const data = response.data;
      return {
        success: true,
        orderId: data.order_id || orderId,
        cfOrderId: data.cf_order_id ? String(data.cf_order_id) : undefined,
        orderStatus: data.order_status || 'UNKNOWN',
        orderAmount: Number(data.order_amount || 0),
        orderCurrency: data.order_currency || 'INR',
        customerDetails: data.customer_details,
        paymentSessionId: data.payment_session_id,
        rawResponse: data,
      };
    } catch (err: any) {
      const errResponse = err.response?.data;
      logger.error(`[CashfreeService] Failed to fetch order status for ${orderId}:`, errResponse || err.message);

      // In local development / test without active live keys
      if (!config.partnerApiKey && !config.appId) {
        return {
          success: true,
          orderId,
          cfOrderId: `cf_mock_${Date.now()}`,
          orderStatus: 'PAID',
          orderAmount: 49.0,
          orderCurrency: 'INR',
          rawResponse: { simulated: true },
        };
      }

      return {
        success: false,
        orderId,
        orderStatus: 'UNKNOWN',
        orderAmount: 0,
        orderCurrency: 'INR',
        rawResponse: errResponse || { error: err.message },
      };
    }
  }

  /**
   * Verify Cashfree Partner Webhook Signature.
   * 
   * As per documentation:
   *   timestamp := req.headers['x-webhook-timestamp']
   *   signature := req.headers['x-webhook-signature']
   *   signedPayload := timestamp + rawBody
   *   expectedSignature := Base64Encode(HMACSHA256(signedPayload, partnerApiKey))
   */
  public static verifyWebhookSignature(
    rawBody: string | Buffer,
    timestamp: string | number,
    signature: string,
    secretKeyOverride?: string
  ): boolean {
    if (!timestamp || !signature) return false;

    try {
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
      const signedPayload = `${timestamp}${bodyStr}`;

      const secret =
        secretKeyOverride ||
        process.env.CASHFREE_PARTNER_API_KEY ||
        process.env.CASHFREE_SECRET_KEY ||
        process.env.CASHFREE_WEBHOOK_SECRET ||
        '';

      if (!secret) {
        logger.warn('[CashfreeService] No secret configured for webhook signature verification');
        return false;
      }

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
      logger.error('[CashfreeService] Error during webhook signature verification:', err.message);
      return false;
    }
  }
}
export default CashfreeService;
