import crypto from 'crypto';

/**
 * Derive 32-byte encryption key from a secret string.
 * Decodes 64-character hexadecimal strings into exactly 32 raw bytes;
 * otherwise derives 32 bytes using SHA-256.
 */
function deriveKey(secret) {
  if (!secret || typeof secret !== 'string') return null;
  const trimmed = secret.trim();
  if (trimmed.length === 64 && /^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return crypto.createHash('sha256').update(trimmed).digest();
}

/**
 * Get primary encryption key.
 * Canonical environment variable: EMAIL_ENCRYPTION_KEY.
 * Fallback keys are strictly disbarred for new encryption; they are only used during decryption.
 */
export function getEmailEncryptionKey() {
  const primary = process.env.EMAIL_ENCRYPTION_KEY;
  if (primary && primary.trim() !== '') {
    const trimmed = primary.trim();
    if (trimmed.length < 32) {
      throw new Error('EMAIL_ENCRYPTION_KEY must be at least 32 characters in length');
    }
    return deriveKey(trimmed);
  }

  if (process.env.NODE_ENV === 'test') {
    return deriveKey('test-secret-key-for-unit-tests-only-32b');
  }

  throw new Error('EMAIL_ENCRYPTION_KEY is required to encrypt credentials. Fallback keys are disbarred for new encryption.');
}

/**
 * Get all candidate decryption keys for backward-compatible decryption.
 */
function getDecryptionKeyCandidates() {
  const candidates = [];
  const seen = new Set();

  const addKey = (secret) => {
    if (secret && typeof secret === 'string' && secret.trim() !== '' && !seen.has(secret.trim())) {
      seen.add(secret.trim());
      candidates.push(deriveKey(secret.trim()));
    }
  };

  addKey(process.env.EMAIL_ENCRYPTION_KEY);
  addKey(process.env.PAYMENT_ENCRYPTION_KEY);
  addKey(process.env.TENANT_MASTER_KEY);
  addKey(process.env.JWT_SECRET);

  if (candidates.length === 0 && process.env.NODE_ENV === 'test') {
    candidates.push(deriveKey('test-secret-key-for-unit-tests-only-32b'));
  }

  return candidates;
}

/**
 * Encrypt sensitive secret using AES-256-GCM.
 * Output format: enc:v1:<ivHex>:<authTagHex>:<ciphertextHex>
 */
export function encryptSecret(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext;
  }
  const str = String(plaintext);
  // If already encrypted with our v1 scheme, avoid double encryption
  if (str.startsWith('enc:v1:')) {
    return str;
  }

  const key = getEmailEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(str, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt AES-256-GCM encrypted secret.
 * If plaintext (does not start with enc:v1:), returns as-is for backward compatibility.
 * Attempts primary key first, then fallback candidate keys if authentication fails.
 */
export function decryptSecret(ciphertext) {
  if (ciphertext === null || ciphertext === undefined || ciphertext === '') {
    return ciphertext;
  }
  const str = String(ciphertext);
  if (!str.startsWith('enc:v1:')) {
    // Transparent fallback for existing unencrypted credentials in database
    return str;
  }

  const parts = str.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Invalid encrypted secret format');
  }

  const [, , ivHex, authTagHex, encryptedHex] = parts;
  if (!ivHex || ivHex.length !== 24 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
    throw new Error('Malformed ciphertext: invalid IV');
  }
  if (!authTagHex || authTagHex.length !== 32 || !/^[0-9a-fA-F]+$/.test(authTagHex)) {
    throw new Error('Malformed ciphertext: invalid auth tag');
  }
  if (!encryptedHex || encryptedHex.length === 0 || !/^[0-9a-fA-F]+$/.test(encryptedHex)) {
    throw new Error('Malformed ciphertext: invalid payload');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const candidates = getDecryptionKeyCandidates();
  if (candidates.length === 0) {
    throw new Error('Decryption failed: no encryption keys configured');
  }

  let lastError = null;
  for (const key of candidates) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      lastError = err;
      // Continue to next candidate key
    }
  }

  throw new Error('Decryption failed: authentication tag verification failed or invalid key');
}

/**
 * Mask API key (e.g. re_1234567890abcdef -> re_12...cdef)
 */
export function maskApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return null;
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 5)}••••${trimmed.slice(-4)}`;
}

/**
 * Redact sensitive fields from SMTP configuration before returning in API responses.
 * Never exposes raw smtp_pass or full API keys to the frontend.
 */
export function redactSmtpConfig(config) {
  if (!config) return null;
  const clone = { ...config };

  const hasPassword = Boolean(clone.smtp_pass && String(clone.smtp_pass).trim() !== '');
  const hasResendApiKey = Boolean(clone.resend_api_key && String(clone.resend_api_key).trim() !== '');

  // Delete raw password
  delete clone.smtp_pass;
  clone.has_password = hasPassword;

  // Mask Resend API key
  if (clone.resend_api_key) {
    clone.resend_api_key_masked = maskApiKey(clone.resend_api_key);
    delete clone.resend_api_key;
  }
  clone.has_resend_api_key = hasResendApiKey;

  return clone;
}

/**
 * Verify incoming Svix / Resend webhook signature using HMAC-SHA256.
 * Headers checked: svix-id, svix-timestamp, svix-signature.
 */
export function verifyResendWebhookSignature({ rawBody, headers = {}, secret, toleranceSeconds = 300 }) {
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return { valid: false, error: 'Webhook signing secret is not configured' };
  }

  const svixId = headers['svix-id'] || headers['Svix-Id'];
  const svixTimestamp = headers['svix-timestamp'] || headers['Svix-Timestamp'];
  const svixSignature = headers['svix-signature'] || headers['Svix-Signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { valid: false, error: 'Missing required Svix signature headers (svix-id, svix-timestamp, svix-signature)' };
  }

  const timestampSec = parseInt(svixTimestamp, 10);
  if (isNaN(timestampSec)) {
    return { valid: false, error: 'Invalid Svix timestamp header' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > toleranceSeconds) {
    return { valid: false, error: 'Webhook event timestamp outside tolerance window (replay protection)' };
  }

  let keyBytes;
  if (secret.startsWith('whsec_')) {
    keyBytes = Buffer.from(secret.slice(6), 'base64');
  } else {
    keyBytes = Buffer.from(secret, 'utf8');
  }

  let payloadString = '';
  if (Buffer.isBuffer(rawBody)) {
    payloadString = rawBody.toString('utf8');
  } else if (typeof rawBody === 'string') {
    payloadString = rawBody;
  } else if (rawBody !== undefined && rawBody !== null) {
    payloadString = JSON.stringify(rawBody);
  }

  const toSign = `${svixId}.${svixTimestamp}.${payloadString}`;
  const computedSignature = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');

  const signatures = svixSignature.split(' ');
  for (const sig of signatures) {
    const [version, signature] = sig.split(',');
    if (version === 'v1' && signature) {
      try {
        const sigBuf = Buffer.from(signature);
        const computedBuf = Buffer.from(computedSignature);
        if (sigBuf.length === computedBuf.length && crypto.timingSafeEqual(sigBuf, computedBuf)) {
          return { valid: true };
        }
      } catch {
        // Continue checking next candidate signature
      }
    }
  }

  return { valid: false, error: 'Webhook signature verification failed: signature mismatch' };
}

