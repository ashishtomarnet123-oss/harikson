import crypto from 'crypto';

/**
 * Derive 32-byte encryption key from a secret string.
 * Decodes 64-character hexadecimal strings into exactly 32 raw bytes;
 * otherwise derives 32 bytes using SHA-256.
 */
function deriveKey(secret?: string | null): Buffer | null {
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
 * Falls back to PAYMENT_ENCRYPTION_KEY, TENANT_MASTER_KEY, or JWT_SECRET for backward compatibility.
 */
export function getEmailEncryptionKey(): Buffer {
  const primary = process.env.EMAIL_ENCRYPTION_KEY;
  if (primary && primary.trim() !== '') {
    const trimmed = primary.trim();
    if (trimmed.length < 32) {
      throw new Error('EMAIL_ENCRYPTION_KEY must be at least 32 characters in length');
    }
    const key = deriveKey(trimmed);
    if (key) return key;
  }

  if (process.env.NODE_ENV === 'test') {
    return deriveKey('test-secret-key-for-unit-tests-only-32b')!;
  }

  throw new Error('EMAIL_ENCRYPTION_KEY is required to encrypt credentials. Fallback keys are disbarred for new encryption.');
}

/**
 * Get all candidate decryption keys for backward-compatible decryption.
 */
function getDecryptionKeyCandidates(): Buffer[] {
  const candidates: Buffer[] = [];
  const seen = new Set<string>();

  const addKey = (secret?: string | null) => {
    if (secret && typeof secret === 'string' && secret.trim() !== '' && !seen.has(secret.trim())) {
      seen.add(secret.trim());
      const k = deriveKey(secret.trim());
      if (k) candidates.push(k);
    }
  };

  addKey(process.env.EMAIL_ENCRYPTION_KEY);
  addKey(process.env.PAYMENT_ENCRYPTION_KEY);
  addKey(process.env.TENANT_MASTER_KEY);
  addKey(process.env.JWT_SECRET);

  if (candidates.length === 0 && process.env.NODE_ENV === 'test') {
    candidates.push(deriveKey('test-secret-key-for-unit-tests-only-32b')!);
  }

  return candidates;
}

/**
 * Encrypt sensitive secret using AES-256-GCM.
 * Output format: enc:v1:<ivHex>:<authTagHex>:<ciphertextHex>
 */
export function encryptSecret(plaintext: string | null | undefined): string | null | undefined {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext;
  }
  const str = String(plaintext);
  if (str.startsWith('enc:v1:')) {
    return str;
  }

  const key = getEmailEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV
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
export function decryptSecret(ciphertext: string | null | undefined): string | null | undefined {
  if (ciphertext === null || ciphertext === undefined || ciphertext === '') {
    return ciphertext;
  }
  const str = String(ciphertext);
  if (!str.startsWith('enc:v1:')) {
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

  let lastError: any = null;
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
export function maskApiKey(apiKey?: string | null): string | null {
  if (!apiKey || typeof apiKey !== 'string') return null;
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 5)}••••${trimmed.slice(-4)}`;
}

/**
 * Redact sensitive fields from SMTP configuration before returning in API responses.
 */
export function redactSmtpConfig(config: Record<string, any> | null): Record<string, any> | null {
  if (!config) return null;
  const clone = { ...config };

  const hasPassword = Boolean(clone.smtp_pass && String(clone.smtp_pass).trim() !== '');
  const hasResendApiKey = Boolean(clone.resend_api_key && String(clone.resend_api_key).trim() !== '');

  delete clone.smtp_pass;
  clone.has_password = hasPassword;

  if (clone.resend_api_key) {
    clone.resend_api_key_masked = maskApiKey(clone.resend_api_key);
    delete clone.resend_api_key;
  }
  clone.has_resend_api_key = hasResendApiKey;

  return clone;
}
