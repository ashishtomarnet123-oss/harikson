import crypto from 'crypto';

export class MockStripeGateway {
  public secretKey: string;
  constructor(secretKey: string = 'sk_test_mock_stripe_key_12345') {
    this.secretKey = secretKey;
  }

  createCheckoutSession(params: { customerEmail: string; amount: number; currency: string; tenantId: string }) {
    return {
      id: `cs_test_${crypto.randomBytes(8).toString('hex')}`,
      object: 'checkout.session',
      customer_email: params.customerEmail,
      amount_total: params.amount,
      currency: params.currency.toLowerCase(),
      client_reference_id: params.tenantId,
      url: `https://checkout.stripe.com/c/pay/cs_test_mock`,
      payment_status: 'unpaid',
    };
  }

  generateWebhookSignature(payload: string, secret: string = 'whsec_mock_stripe'): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  verifyWebhookSignature(payload: string, header: string, secret: string = 'whsec_mock_stripe'): boolean {
    const parts = header.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const sigPart = parts.find((p) => p.startsWith('v1='));
    if (!timestampPart || !sigPart) return false;
    const t = timestampPart.split('=')[1];
    const expected = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
    return sigPart.split('=')[1] === expected;
  }
}

export class MockRazorpayGateway {
  public keyId: string;
  public keySecret: string;
  constructor(keyId: string = 'rzp_test_12345', keySecret: string = 'rzp_secret_67890') {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  createOrder(params: { amount: number; currency: string; receipt: string }) {
    return {
      id: `order_${crypto.randomBytes(8).toString('hex')}`,
      entity: 'order',
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      receipt: params.receipt,
      status: 'created',
    };
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = crypto.createHmac('sha256', this.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  }
}

export class MockPhonePeGateway {
  public merchantId: string;
  public saltKey: string;
  public saltIndex: number;
  constructor(merchantId: string = 'PGTESTPAYUAT', saltKey: string = 'mock-salt-key-phonepe', saltIndex: number = 1) {
    this.merchantId = merchantId;
    this.saltKey = saltKey;
    this.saltIndex = saltIndex;
  }

  generatePaymentRequest(params: { transactionId: string; amount: number; tenantId: string }) {
    const base64Payload = Buffer.from(
      JSON.stringify({
        merchantId: this.merchantId,
        merchantTransactionId: params.transactionId,
        amount: params.amount,
        merchantUserId: params.tenantId,
        redirectUrl: 'https://xarwiz.com/billing/callback',
        paymentInstrument: { type: 'PAY_PAGE' },
      })
    ).toString('base64');

    const checksum =
      crypto
        .createHash('sha256')
        .update(base64Payload + '/pg/v1/pay' + this.saltKey)
        .digest('hex') +
      '###' +
      this.saltIndex;

    return { base64Payload, checksum };
  }

  verifyCallbackChecksum(base64Response: string, receivedChecksum: string, endpoint: string = '/pg/v1/pay'): boolean {
    const calculated =
      crypto
        .createHash('sha256')
        .update(base64Response + endpoint + this.saltKey)
        .digest('hex') +
      '###' +
      this.saltIndex;
    return calculated === receivedChecksum;
  }
}

export class MockCashfreeGateway {
  public appId: string;
  public secretKey: string;
  constructor(appId: string = 'cf_app_mock_123', secretKey: string = 'cf_secret_mock_456') {
    this.appId = appId;
    this.secretKey = secretKey;
  }

  createOrder(params: { orderId: string; amount: number; customerEmail: string }) {
    return {
      order_id: params.orderId,
      order_amount: params.amount,
      order_currency: 'INR',
      order_status: 'ACTIVE',
      payment_session_id: `session_${crypto.randomBytes(8).toString('hex')}`,
    };
  }

  verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.secretKey)
      .update(timestamp + rawBody)
      .digest('base64');
    return expected === signature;
  }
}
