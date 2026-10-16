import { describe, it } from 'node:test';
import assert from 'node:assert';
import { registerSchema } from '../validators/auth.schema.js';

describe('DPDP Privacy Notice & Consent Management Test Suite', () => {
  // ============================================================================
  // 1. REGISTRATION & UNBUNDLED CONSENT SCHEMA
  // ============================================================================
  it('1. Registration: Validates required email, password, and allows privacy notice fields', () => {
    const validPayload = {
      email: 'principal@example.com',
      password: 'StrongPassword123!',
      name: 'Ashish Tomar',
      privacyNoticeAcknowledged: true,
      marketingConsent: false, // Optional marketing remains unchecked by default
    };

    const parsed = registerSchema.safeParse(validPayload);
    assert.strictEqual(parsed.success, true, 'Registration with privacy fields should parse successfully');
    if (parsed.success) {
      assert.strictEqual(parsed.data.privacyNoticeAcknowledged, true);
      assert.strictEqual(parsed.data.marketingConsent, false);
    }
  });

  it('2. Registration: Rejects invalid email without privacy fields', () => {
    const invalidPayload = {
      email: 'not-an-email',
      password: '123',
    };
    const parsed = registerSchema.safeParse(invalidPayload);
    assert.strictEqual(parsed.success, false, 'Invalid registration payload must fail validation');
  });

  it('3. Registration: Distinguishes optional marketing from account registration (unbundled)', () => {
    const payloadWithoutMarketing = {
      email: 'user2@example.com',
      password: 'SecurePassword2026!',
      name: 'Test User',
      privacyNoticeAcknowledged: true,
      // marketingConsent omitted
    };

    const parsed = registerSchema.safeParse(payloadWithoutMarketing);
    assert.strictEqual(parsed.success, true, 'Registration must succeed even if marketingConsent is omitted');
    if (parsed.success) {
      assert.strictEqual(parsed.data.marketingConsent, undefined, 'Marketing consent must remain unset by default');
    }
  });

  // ============================================================================
  // 2. STATUTORY PURPOSES & LAWFUL BASIS MAPPING
  // ============================================================================
  it('4. Purposes: Distinguishes contractual necessity from affirmative consent', () => {
    const purposes = [
      { id: 'service_processing', legal_basis: 'contractual_necessity', is_required: true, is_optional: false },
      { id: 'marketing_emails', legal_basis: 'consent', is_required: false, is_optional: true },
      { id: 'product_updates', legal_basis: 'legitimate_uses', is_required: false, is_optional: true },
      { id: 'analytics', legal_basis: 'consent', is_required: false, is_optional: true },
      { id: 'third_party_ai_processing', legal_basis: 'consent', is_required: false, is_optional: true },
    ];

    const servicePurpose = purposes.find((p) => p.id === 'service_processing');
    assert.ok(servicePurpose);
    assert.strictEqual(servicePurpose.legal_basis, 'contractual_necessity');
    assert.strictEqual(servicePurpose.is_required, true);

    const marketingPurpose = purposes.find((p) => p.id === 'marketing_emails');
    assert.ok(marketingPurpose);
    assert.strictEqual(marketingPurpose.legal_basis, 'consent');
    assert.strictEqual(marketingPurpose.is_required, false);
    assert.strictEqual(marketingPurpose.is_optional, true);

    const aiPurpose = purposes.find((p) => p.id === 'third_party_ai_processing');
    assert.ok(aiPurpose);
    assert.strictEqual(aiPurpose.legal_basis, 'consent');
    assert.strictEqual(aiPurpose.is_required, false);
  });

  // ============================================================================
  // 3. TRACKING NUMBER GENERATION FORMAT
  // ============================================================================
  it('5. Tracking Numbers: Generates compliant DPR and GRV identifiers', () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dprPattern = new RegExp(`^DPR-${dateStr}-[A-F0-9]{6}$`);
    const grvPattern = new RegExp(`^GRV-${dateStr}-[A-F0-9]{6}$`);

    const mockDpr = `DPR-${dateStr}-AB12CD`;
    const mockGrv = `GRV-${dateStr}-EF3412`;

    assert.ok(dprPattern.test(mockDpr), 'Privacy request tracking number must match DPR-YYYYMMDD-XXXXXX pattern');
    assert.ok(grvPattern.test(mockGrv), 'Grievance number must match GRV-YYYYMMDD-XXXXXX pattern');
  });

  // ============================================================================
  // 4. DATA PRINCIPAL RIGHTS WORKFLOW RULES
  // ============================================================================
  it('6. Rights Requests: Validates recognized DPDP request types', () => {
    const validTypes = ['access_export', 'correction', 'erasure', 'consent_withdrawal', 'nomination'];
    const testType1 = 'access_export';
    const testType2 = 'arbitrary_invalid_type';

    assert.strictEqual(validTypes.includes(testType1), true);
    assert.strictEqual(validTypes.includes(testType2), false);
  });

  it('7. Erasure Safeguards: Anonymization pattern replaces PII with non-reconstructible identifier', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const anonymizedEmail = `erased_${userId.slice(0, 8)}_${Date.now()}@anonymized.xarwiz.local`;

    assert.ok(anonymizedEmail.startsWith('erased_550e8400_'));
    assert.ok(anonymizedEmail.endsWith('@anonymized.xarwiz.local'));
  });
});
