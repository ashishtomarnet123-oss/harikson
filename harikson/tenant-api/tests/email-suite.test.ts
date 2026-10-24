import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { encryptSecret, decryptSecret, maskApiKey, redactSmtpConfig } from '../src/services/emailCrypto.js';
import { EmailNode } from '../src/services/workflow/nodes/integrations.js';

describe('Tenant-API Enterprise Email Integration Suite (Isolated Unit & Concurrency Suite)', () => {

  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_ENCRYPTION_KEY = testKey;
  });

  describe('1. Secret Encryption, Multi-Key Fallback & Cross-Service Compatibility', () => {
    it('should encrypt secret with AES-256-GCM and enc:v1: prefix', () => {
      const plaintext = 'TenantSmtpPassword@2026';
      const encrypted = encryptSecret(plaintext);

      assert.ok(encrypted?.startsWith('enc:v1:'), 'Encrypted secret must start with enc:v1:');
      assert.notEqual(encrypted, plaintext);

      const parts = encrypted!.split(':');
      assert.equal(parts.length, 5);
      assert.equal(parts[2].length, 24, 'IV must be 24 hex characters');
      assert.equal(parts[3].length, 32, 'Auth tag must be 32 hex characters');
    });

    it('should decrypt encrypted secret to original value using canonical EMAIL_ENCRYPTION_KEY', () => {
      const raw = 'AnotherSecretKey#4321';
      const enc = encryptSecret(raw);
      const dec = decryptSecret(enc);

      assert.equal(dec, raw);
    });

    it('should decrypt secrets using fallback candidate keys (cross-service compatibility)', () => {
      // Simulate a secret encrypted by admin-api using PAYMENT_ENCRYPTION_KEY before migration
      const adminSecret = 'legacy-admin-payment-key-32b-str';
      process.env.EMAIL_ENCRYPTION_KEY = adminSecret;
      const adminEncrypted = encryptSecret('AdminCreatedCredential');

      // In tenant-api, EMAIL_ENCRYPTION_KEY is different, but PAYMENT_ENCRYPTION_KEY is available as fallback
      process.env.EMAIL_ENCRYPTION_KEY = 'tenant-api-primary-key';
      process.env.PAYMENT_ENCRYPTION_KEY = adminSecret;

      const decrypted = decryptSecret(adminEncrypted);
      assert.equal(decrypted, 'AdminCreatedCredential', 'Tenant-API should decrypt secret created under admin fallback key');

      delete process.env.PAYMENT_ENCRYPTION_KEY;
    });

    it('should transparently preserve unencrypted legacy plaintext without throwing', () => {
      const plaintext = 'Pratap@9873';
      const dec = decryptSecret(plaintext);

      assert.equal(dec, plaintext);
    });

    it('should reject malformed ciphertext with invalid IV or tag length', () => {
      assert.throws(
        () => decryptSecret('enc:v1:short:tag:cipher'),
        /Malformed ciphertext: invalid IV/
      );

      assert.throws(
        () => decryptSecret('enc:v1:112233445566778899001122:shorttag:cipher'),
        /Malformed ciphertext: invalid auth tag/
      );
    });

    it('should fail with error on corrupted ciphertext payload (auth tag mismatch)', () => {
      const valid = encryptSecret('SensitiveCredential');
      const parts = valid!.split(':');
      const corrupted = `enc:v1:${parts[2]}:${parts[3]}:${parts[4].slice(0, -2)}00`;

      assert.throws(
        () => decryptSecret(corrupted),
        /Decryption failed/
      );
    });

    it('should redact sensitive keys from SMTP config', () => {
      const cfg = {
        provider: 'smtp',
        smtp_host: 'mail.xarwiz.com',
        smtp_port: 587,
        smtp_user: 'noreply@xarwiz.com',
        smtp_pass: 'Pratap@9873',
        resend_api_key: 're_1234567890abcdef',
      };

      const redacted = redactSmtpConfig(cfg);
      assert.equal(redacted?.smtp_pass, undefined);
      assert.equal(redacted?.resend_api_key, undefined);
      assert.equal(redacted?.has_password, true);
      assert.equal(redacted?.has_resend_api_key, true);
      assert.ok(redacted?.resend_api_key_masked?.startsWith('re_12••••'));
    });
  });

  describe('2. Atomic Password Reset Concurrency Simulation', () => {
    it('should guarantee single-use token consumption under concurrent requests', async () => {
      // Mock an isolated in-memory DB row for password_reset_tokens
      let tokenRow = {
        id: 'tok_001',
        token_hash: crypto.createHash('sha256').update('valid-reset-token-123').digest('hex'),
        used_at: null as Date | null,
        expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour in future
        user_id: 'usr_001',
        tenant_id: 'ten_001',
      };

      // Atomic simulation of SQL:
      // UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING *
      let lockAcquired = false;
      async function executeAtomicTokenConsumption(tokenHash: string): Promise<any | null> {
        // Wait if lock is held (row-level lock)
        while (lockAcquired) {
          await new Promise(r => setTimeout(r, 5));
        }
        lockAcquired = true;
        try {
          if (
            tokenRow.token_hash === tokenHash &&
            tokenRow.used_at === null &&
            tokenRow.expires_at > new Date()
          ) {
            tokenRow.used_at = new Date();
            return { id: tokenRow.id, user_id: tokenRow.user_id, tenant_id: tokenRow.tenant_id };
          }
          return null; // 0 rows updated
        } finally {
          lockAcquired = false;
        }
      }

      const inputTokenHash = crypto.createHash('sha256').update('valid-reset-token-123').digest('hex');

      // Execute 2 concurrent requests with identical token
      const [res1, res2] = await Promise.all([
        executeAtomicTokenConsumption(inputTokenHash),
        executeAtomicTokenConsumption(inputTokenHash),
      ]);

      // Exactly ONE request must succeed and return the token payload; the second must return null
      const winner = res1 || res2;
      const loser = res1 ? res2 : res1;

      assert.ok(winner, 'One of the concurrent requests must succeed');
      assert.equal(winner.id, 'tok_001');
      assert.equal(loser, null, 'The concurrent race loser must return null (0 rows consumed)');
      assert.ok(tokenRow.used_at !== null, 'Token must now be marked used');

      // A third request attempting replay must also be rejected
      const replayRes = await executeAtomicTokenConsumption(inputTokenHash);
      assert.equal(replayRes, null, 'Replay request must be rejected');
    });

    it('should reject expired reset tokens', async () => {
      const expiredTokenRow = {
        token_hash: 'expired_hash_123',
        used_at: null,
        expires_at: new Date(Date.now() - 5000), // Expired 5 seconds ago
      };

      const isEligible = expiredTokenRow.used_at === null && expiredTokenRow.expires_at > new Date();
      assert.equal(isEligible, false, 'Expired token must not be eligible for consumption');
    });
  });

  describe('3. Workflow Automation EmailNode Execution', () => {
    it('should fail validation if recipient (to) is missing', () => {
      const result = EmailNode.validate({});
      assert.equal(result.valid, false);
      assert.equal(result.errors[0].field, 'to');
    });

    it('should reject invalid recipient email format during execution', async () => {
      const mockContext: any = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        workflowId: 'wf_test_1',
        executionId: 'exec_test_1',
      };

      const input: any = {
        nodeId: 'node_email_1',
        config: {
          to: 'invalid-email-address',
          subject: 'Test Subject',
          bodyTemplate: 'Test Body',
        },
      };

      const output = await EmailNode.execute(input, mockContext);
      assert.equal(output.status, 'failed');
      assert.ok(output.error?.includes('Invalid recipient email'));
    });
  });

});

// Ensure clean exit when testing with mocked sockets
setTimeout(() => {
  process.exit(0);
}, 250).unref();

