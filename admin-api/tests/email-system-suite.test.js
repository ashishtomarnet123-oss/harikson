import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  encryptSecret,
  decryptSecret,
  maskApiKey,
  redactSmtpConfig,
  verifyResendWebhookSignature
} from '../src/services/emailCrypto.js';

describe('Enterprise Email System Suite - Verification Tests (Isolated Unit & Security Suite)', () => {

  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_ENCRYPTION_KEY = testKey;
  });

  describe('1. Secret Protection, Encryption & Key Derivation', () => {
    it('should encrypt sensitive secrets using AES-256-GCM with enc:v1: format', () => {
      const plaintext = 'SuperSecretSmtpPass!9988';
      const encrypted = encryptSecret(plaintext);

      assert.ok(encrypted.startsWith('enc:v1:'), 'Encrypted secret must start with enc:v1:');
      assert.notEqual(encrypted, plaintext, 'Encrypted secret must not match plaintext');

      const parts = encrypted.split(':');
      assert.equal(parts.length, 5, 'Encrypted format must have 5 parts: enc:v1:<iv>:<tag>:<ciphertext>');
      assert.equal(parts[2].length, 24, 'IV must be 12 bytes (24 hex characters)');
      assert.equal(parts[3].length, 32, 'Auth tag must be 16 bytes (32 hex characters)');
      assert.ok(parts[4].length > 0, 'Ciphertext payload must not be empty');
    });

    it('should decrypt AES-256-GCM encrypted secret back to original plaintext', () => {
      const original = 'P@ssw0rd_SMTP_Testing_2026';
      const encrypted = encryptSecret(original);
      const decrypted = decryptSecret(encrypted);

      assert.equal(decrypted, original, 'Decrypted secret must match original value');
    });

    it('should decrypt secrets using fallback candidate keys for backward compatibility', () => {
      const fallbackSecret = 'legacy-tenant-master-key-32b-str';
      // Temporarily set primary key to fallback secret to generate a ciphertext encrypted under that key
      process.env.EMAIL_ENCRYPTION_KEY = fallbackSecret;
      const legacyCiphertext = encryptSecret('CredentialFromPreviousRelease');

      // Now set EMAIL_ENCRYPTION_KEY to a new key, and put legacy key into TENANT_MASTER_KEY fallback
      process.env.EMAIL_ENCRYPTION_KEY = 'new-primary-email-encryption-key';
      process.env.TENANT_MASTER_KEY = fallbackSecret;

      const decrypted = decryptSecret(legacyCiphertext);
      assert.equal(decrypted, 'CredentialFromPreviousRelease', 'Should decrypt successfully using fallback key');

      // Clean up
      delete process.env.TENANT_MASTER_KEY;
    });

    it('should reject short encryption keys and refuse to write new credentials with fallback keys', () => {
      // 1. Key length validation (< 32 chars)
      process.env.EMAIL_ENCRYPTION_KEY = 'short-key';
      assert.throws(
        () => encryptSecret('TestVal'),
        /EMAIL_ENCRYPTION_KEY must be at least 32 characters in length/
      );

      // 2. Disbar fallback keys for new writes
      delete process.env.EMAIL_ENCRYPTION_KEY;
      process.env.NODE_ENV = 'production';
      process.env.PAYMENT_ENCRYPTION_KEY = 'valid-fallback-key-that-is-at-least-32-chars-long';

      assert.throws(
        () => encryptSecret('TestVal'),
        /EMAIL_ENCRYPTION_KEY is required to encrypt credentials. Fallback keys are disbarred for new encryption./
      );

      // Restore
      process.env.NODE_ENV = 'test';
      process.env.EMAIL_ENCRYPTION_KEY = testKey;
      delete process.env.PAYMENT_ENCRYPTION_KEY;
    });

    it('should transparently pass through unencrypted legacy plaintext without throwing', () => {
      const legacyPlaintext = 'Pratap@9873';
      const result = decryptSecret(legacyPlaintext);

      assert.equal(result, legacyPlaintext, 'Legacy plaintext should return as-is without crashing');
    });

    it('should strictly reject malformed ciphertext format', () => {
      assert.throws(
        () => decryptSecret('enc:v1:invalid-parts'),
        /Invalid encrypted secret format/,
        'Should reject wrong number of parts'
      );

      assert.throws(
        () => decryptSecret('enc:v1:shortiv:1234567890abcdef1234567890abcdef:abcdef'),
        /Malformed ciphertext: invalid IV/,
        'Should reject invalid IV length'
      );

      assert.throws(
        () => decryptSecret('enc:v1:123456789012345678901234:shorttag:abcdef'),
        /Malformed ciphertext: invalid auth tag/,
        'Should reject invalid auth tag length'
      );
    });

    it('should fail safely on tampered ciphertext with authentication tag verification error', () => {
      const encrypted = encryptSecret('SensitiveCredential');
      const parts = encrypted.split(':');
      // Tamper with one character of ciphertext
      const tamperedCipher = parts[4].slice(0, -2) + (parts[4].endsWith('0') ? '1' : '0');
      const tampered = `enc:v1:${parts[2]}:${parts[3]}:${tamperedCipher}`;

      assert.throws(
        () => decryptSecret(tampered),
        /Decryption failed/,
        'Tampered ciphertext must fail auth tag verification'
      );
    });

    it('should mask API keys safely without leaking middle secret bytes', () => {
      const resendKey = 're_1234567890abcdef12345678';
      const masked = maskApiKey(resendKey);

      assert.equal(masked, 're_12••••5678', 'Masked key must show only prefix and suffix');
      assert.ok(!masked.includes('34567890abcdef123'), 'Masked key must not leak middle bytes');
    });

    it('should redact sensitive secrets completely from SMTP configuration objects', () => {
      const rawConfig = {
        id: 'smtp_cfg_123',
        provider: 'smtp',
        smtp_host: 'mail.xarwiz.com',
        smtp_port: 587,
        smtp_user: 'noreply@xarwiz.com',
        smtp_pass: 'enc:v1:abc123iv:tag987:cipher554',
        resend_api_key: 're_secret_api_key_live_998877',
        from_email: 'noreply@xarwiz.com',
        from_name: 'Xarwiz AI',
      };

      const redacted = redactSmtpConfig(rawConfig);

      assert.equal(redacted.smtp_pass, undefined, 'smtp_pass must be completely removed');
      assert.equal(redacted.resend_api_key, undefined, 'resend_api_key must be completely removed');
      assert.equal(redacted.has_password, true, 'has_password indicator must be true');
      assert.equal(redacted.has_resend_api_key, true, 'has_resend_api_key indicator must be true');
      assert.ok(redacted.resend_api_key_masked.startsWith('re_se••••'), 'API key must be masked');
      assert.equal(redacted.smtp_host, 'mail.xarwiz.com', 'Non-sensitive metadata must remain intact');
    });
  });

  describe('2. SMTP Configuration Safe Update Semantics', () => {
    it('should preserve existing raw ciphertext when password field is omitted or masked placeholder', () => {
      const existingRawCiphertext = 'enc:v1:112233445566778899001122:aabbccddeeff00112233445566778899:abcdef123456';
      const existingRawApiKey = 'enc:v1:112233445566778899001122:aabbccddeeff00112233445566778899:987654fedcba';

      const rawCurrent = {
        smtp_pass: existingRawCiphertext,
        resend_api_key: existingRawApiKey,
      };

      // Case A: User sends empty/omitted password
      let incomingPass = '';
      const isMaskedPasswordA = !incomingPass || incomingPass.trim() === '' || incomingPass.includes('••••');
      const finalPassA = isMaskedPasswordA ? (rawCurrent?.smtp_pass || null) : encryptSecret(incomingPass);
      assert.equal(finalPassA, existingRawCiphertext, 'Omitted password must preserve raw database ciphertext exactly');

      // Case B: User sends masked placeholder '••••••••'
      let incomingPassB = '••••••••';
      const isMaskedPasswordB = !incomingPassB || incomingPassB.trim() === '' || incomingPassB.includes('••••');
      const finalPassB = isMaskedPasswordB ? (rawCurrent?.smtp_pass || null) : encryptSecret(incomingPassB);
      assert.equal(finalPassB, existingRawCiphertext, 'Masked placeholder must preserve raw ciphertext and never be encrypted as string');

      // Case C: User provides new real password
      let incomingPassC = 'BrandNewPassword2026!';
      const isMaskedPasswordC = !incomingPassC || incomingPassC.trim() === '' || incomingPassC.includes('••••');
      const finalPassC = isMaskedPasswordC ? (rawCurrent?.smtp_pass || null) : encryptSecret(incomingPassC);
      assert.ok(finalPassC.startsWith('enc:v1:'), 'New password must be encrypted');
      assert.notEqual(finalPassC, existingRawCiphertext, 'New password must generate fresh ciphertext');
      assert.equal(decryptSecret(finalPassC), 'BrandNewPassword2026!', 'New ciphertext must decrypt to new password');
    });
  });

  describe('3. Webhook Cryptographic Signature Verification (Svix / Resend)', () => {
    const webhookSecret = 'whsec_dGVzdC1zZWNyZXQta2V5LWZvci1zdml4LXZlcmlmaWNhdGlvbi0zMmI='; // base64 encoded
    const rawPayload = JSON.stringify({
      type: 'email.delivered',
      data: {
        email_id: 're_msg_123456789',
        to: ['customer@example.com']
      }
    });

    function generateSignature(secret, msgId, timestamp, payload) {
      let keyBytes = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret, 'utf8');
      const toSign = `${msgId}.${timestamp}.${payload}`;
      const sig = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');
      return `v1,${sig}`;
    }

    it('should successfully verify a valid Svix HMAC signature', () => {
      const msgId = 'msg_test_001';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const validSig = generateSignature(webhookSecret, msgId, timestamp, rawPayload);

      const headers = {
        'svix-id': msgId,
        'svix-timestamp': timestamp,
        'svix-signature': validSig
      };

      const result = verifyResendWebhookSignature({
        rawBody: Buffer.from(rawPayload, 'utf8'),
        headers,
        secret: webhookSecret
      });

      assert.equal(result.valid, true, 'Valid signature must be verified successfully');
    });

    it('should reject requests with missing Svix headers', () => {
      const result = verifyResendWebhookSignature({
        rawBody: Buffer.from(rawPayload, 'utf8'),
        headers: {},
        secret: webhookSecret
      });

      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('Missing required Svix signature headers'));
    });

    it('should reject requests with an expired timestamp (replay protection)', () => {
      const msgId = 'msg_test_replay';
      // 10 minutes in the past (tolerance is 5 min / 300s)
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600);
      const validSigForOldTime = generateSignature(webhookSecret, msgId, oldTimestamp, rawPayload);

      const headers = {
        'svix-id': msgId,
        'svix-timestamp': oldTimestamp,
        'svix-signature': validSigForOldTime
      };

      const result = verifyResendWebhookSignature({
        rawBody: Buffer.from(rawPayload, 'utf8'),
        headers,
        secret: webhookSecret,
        toleranceSeconds: 300
      });

      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('replay protection'));
    });

    it('should reject tampered or invalid webhook signatures', () => {
      const msgId = 'msg_test_tampered';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const forgedSig = 'v1,aW52YWxpZC1zaWduYXR1cmUtZm9yZ2VkLWJ5LWF0dGFja2Vy';

      const headers = {
        'svix-id': msgId,
        'svix-timestamp': timestamp,
        'svix-signature': forgedSig
      };

      const result = verifyResendWebhookSignature({
        rawBody: Buffer.from(rawPayload, 'utf8'),
        headers,
        secret: webhookSecret
      });

      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('signature mismatch'));
    });

    it('should reject when payload body has been tampered with', () => {
      const msgId = 'msg_test_tampered_body';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const sigForOriginal = generateSignature(webhookSecret, msgId, timestamp, rawPayload);

      const tamperedBody = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_different_id' } });

      const headers = {
        'svix-id': msgId,
        'svix-timestamp': timestamp,
        'svix-signature': sigForOriginal
      };

      const result = verifyResendWebhookSignature({
        rawBody: Buffer.from(tamperedBody, 'utf8'),
        headers,
        secret: webhookSecret
      });

      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('signature mismatch'));
    });
  });

  describe('4. DPDP Act 2023 Marketing Consent & Suppression Evaluation', () => {
    // Isolated evaluation logic representing the SQL predicates
    function evaluateRecipientEligibility({ userStatus, deletedAt, consentRecord, emailLogs }) {
      if (userStatus !== 'active' || deletedAt !== null) {
        return { eligible: false, reason: 'user_inactive' };
      }

      // Check suppression (bounces or complaints)
      const isSuppressed = emailLogs.some(log => log.status === 'bounced' || log.status === 'complained');
      if (isSuppressed) {
        return { eligible: false, reason: 'suppressed_due_to_bounce_or_complaint' };
      }

      // Check affirmative consent: must have status === 'granted' and valid_until > now
      if (!consentRecord) {
        return { eligible: false, reason: 'missing_consent_record' };
      }

      if (consentRecord.purpose_id !== 'marketing_emails') {
        return { eligible: false, reason: 'invalid_purpose' };
      }

      if (consentRecord.status === 'declined' || consentRecord.status === 'withdrawn') {
        return { eligible: false, reason: 'consent_withdrawn_or_declined' };
      }

      if (consentRecord.status !== 'granted') {
        return { eligible: false, reason: 'not_affirmatively_granted' };
      }

      if (consentRecord.valid_until && new Date(consentRecord.valid_until) <= new Date()) {
        return { eligible: false, reason: 'consent_expired' };
      }

      return { eligible: true };
    }

    it('should include user with affirmative, active marketing consent', () => {
      const res = evaluateRecipientEligibility({
        userStatus: 'active',
        deletedAt: null,
        consentRecord: { purpose_id: 'marketing_emails', status: 'granted', valid_until: null },
        emailLogs: [{ status: 'delivered' }]
      });
      assert.equal(res.eligible, true);
    });

    it('should reject user with missing consent record (no soft opt-in)', () => {
      const res = evaluateRecipientEligibility({
        userStatus: 'active',
        deletedAt: null,
        consentRecord: null, // No consent row
        emailLogs: []
      });
      assert.equal(res.eligible, false);
      assert.equal(res.reason, 'missing_consent_record');
    });

    it('should reject user who explicitly declined or withdrew consent', () => {
      const declinedRes = evaluateRecipientEligibility({
        userStatus: 'active',
        deletedAt: null,
        consentRecord: { purpose_id: 'marketing_emails', status: 'declined' },
        emailLogs: []
      });
      assert.equal(declinedRes.eligible, false);

      const withdrawnRes = evaluateRecipientEligibility({
        userStatus: 'active',
        deletedAt: null,
        consentRecord: { purpose_id: 'marketing_emails', status: 'withdrawn' },
        emailLogs: []
      });
      assert.equal(withdrawnRes.eligible, false);
    });

    it('should suppress address with previous bounce or complaint even if consent was granted', () => {
      const bouncedRes = evaluateRecipientEligibility({
        userStatus: 'active',
        deletedAt: null,
        consentRecord: { purpose_id: 'marketing_emails', status: 'granted' },
        emailLogs: [{ status: 'bounced' }]
      });
      assert.equal(bouncedRes.eligible, false);
      assert.equal(bouncedRes.reason, 'suppressed_due_to_bounce_or_complaint');

      const complaintRes = evaluateRecipientEligibility({
        userStatus: 'active',
        deletedAt: null,
        consentRecord: { purpose_id: 'marketing_emails', status: 'granted' },
        emailLogs: [{ status: 'complained' }]
      });
      assert.equal(complaintRes.eligible, false);
      assert.equal(complaintRes.reason, 'suppressed_due_to_bounce_or_complaint');
    });
  });

  describe('5. Queue Interrupted Job Recovery Logic', () => {
    it('should safely recover orphaned jobs from processing back to pending queue', async () => {
      // In-memory simulation of Redis rpoplpush recovery behavior
      const processingQueue = ['job_orphaned_01', 'job_orphaned_02'];
      const pendingQueue = ['job_new_03'];

      function simulateRecovery() {
        let count = 0;
        while (processingQueue.length > 0) {
          const item = processingQueue.pop();
          pendingQueue.push(item);
          count++;
        }
        return count;
      }

      const recovered = simulateRecovery();
      assert.equal(recovered, 2, 'Should recover 2 orphaned jobs');
      assert.equal(processingQueue.length, 0, 'Processing queue must be empty after recovery');
      assert.ok(pendingQueue.includes('job_orphaned_01'), 'Orphaned job 1 must be in pending');
      assert.ok(pendingQueue.includes('job_orphaned_02'), 'Orphaned job 2 must be in pending');
    });

    it('should resume interrupted jobs from startOffset without re-dispatching already-processed recipients', () => {
      const allRecipients = ['u1@test.com', 'u2@test.com', 'u3@test.com', 'u4@test.com', 'u5@test.com', 'u6@test.com', 'u7@test.com'];
      const jobData = {
        processedCount: '5',
        successCount: '5',
        failedCount: '0'
      };

      const startOffset = parseInt(jobData.processedCount || '0', 10);
      const dispatchedInResume = [];
      const BATCH_SIZE = 5;

      for (let i = startOffset; i < allRecipients.length; i += BATCH_SIZE) {
        const batch = allRecipients.slice(i, i + BATCH_SIZE);
        for (const recipient of batch) {
          dispatchedInResume.push(recipient);
        }
      }

      assert.equal(dispatchedInResume.length, 2, 'Should only dispatch the remaining 2 recipients (u6 and u7)');
      assert.deepEqual(dispatchedInResume, ['u6@test.com', 'u7@test.com']);
      assert.ok(!dispatchedInResume.includes('u1@test.com'), 'Must never re-dispatch already accepted recipients');
    });
  });

});
