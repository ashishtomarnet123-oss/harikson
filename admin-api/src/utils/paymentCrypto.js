import crypto from 'crypto';
import logger from './logger.js';

export function validatePaymentKeyConfig() {
  const paymentKey = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!paymentKey || paymentKey.length < 32) {
    logger.error('FATAL: PAYMENT_ENCRYPTION_KEY not set or too short (min 32 characters). Refusing to start with a hardcoded fallback encryption key for stored payment credentials.');
    process.exit(1);
  }
  return paymentKey;
}

let ENCRYPTION_KEY = null;
function getKey() {
  if (!ENCRYPTION_KEY) {
    ENCRYPTION_KEY = validatePaymentKeyConfig();
  }
  return ENCRYPTION_KEY;
}

export function encryptText(text) {
  if (!text) return null;
  const hashedKey = crypto.createHash('sha256').update(getKey()).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', hashedKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptText(encryptedText) {
  if (!encryptedText) return null;
  try {
    const hashedKey = crypto
      .createHash('sha256')
      .update(getKey())
      .digest();
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
  } catch (err) {
    logger.error('Failed to decrypt credentials:', err);
    return null;
  }
}

