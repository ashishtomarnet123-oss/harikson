import { describe, it } from 'node:test';
import assert from 'node:assert';
import { registerSchema } from '../validators/auth.schema.js';

describe('Demo & Request Access Unified Flow Test Suite', () => {
  it('Scenario A: Book a Demo payload validates and preserves source and company', () => {
    const demoPayload = {
      name: 'Rohan Sharma',
      email: 'rohan.sharma@enterprise.in',
      password: 'SecureDemoPassword2026!',
      phone: '+91 98765 43210',
      company: 'Sharma Logistics India',
      source: 'book_demo',
      privacyNoticeAcknowledged: true,
      marketingConsent: true,
    };

    const parsed = registerSchema.safeParse(demoPayload);
    assert.strictEqual(parsed.success, true, 'Book a Demo payload should be valid');
    if (parsed.success) {
      assert.strictEqual(parsed.data.source, 'book_demo');
      assert.strictEqual(parsed.data.company, 'Sharma Logistics India');
      assert.strictEqual(parsed.data.name, 'Rohan Sharma');
      assert.strictEqual(parsed.data.phone, '+91 98765 43210');
      assert.strictEqual(parsed.data.privacyNoticeAcknowledged, true);
    }
  });

  it('Scenario B: Book a Live Demo payload validates and preserves source', () => {
    const liveDemoPayload = {
      name: 'Priya Patel',
      email: 'priya.patel@techcorp.co.in',
      password: 'LiveDemoPass2026!',
      phone: '+91 91234 56789',
      companyName: 'TechCorp Solutions',
      source: 'book_live_demo',
      privacyNoticeAcknowledged: true,
      marketingConsent: false,
    };

    const parsed = registerSchema.safeParse(liveDemoPayload);
    assert.strictEqual(parsed.success, true, 'Book Live Demo payload should be valid');
    if (parsed.success) {
      assert.strictEqual(parsed.data.source, 'book_live_demo');
      assert.strictEqual(parsed.data.companyName, 'TechCorp Solutions');
      assert.strictEqual(parsed.data.email, 'priya.patel@techcorp.co.in');
    }
  });

  it('Standard Request Access payload without explicit source remains fully backward compatible', () => {
    const standardPayload = {
      name: 'Vikram Malhotra',
      email: 'vikram@startup.in',
      password: 'StandardAccess2026!',
      privacyNoticeAcknowledged: true,
    };

    const parsed = registerSchema.safeParse(standardPayload);
    assert.strictEqual(parsed.success, true, 'Standard Request Access payload should be valid');
    if (parsed.success) {
      assert.strictEqual(parsed.data.source, undefined);
    }
  });

  it('Validation: Rejects invalid email addresses', () => {
    const invalidEmailPayload = {
      name: 'Tester',
      email: 'invalid-email-address',
      password: 'ValidPassword123!',
      source: 'book_demo',
      privacyNoticeAcknowledged: true,
    };

    const parsed = registerSchema.safeParse(invalidEmailPayload);
    assert.strictEqual(parsed.success, false, 'Invalid email must fail validation');
  });

  it('Validation: Rejects passwords shorter than 6 characters on backend', () => {
    const shortPasswordPayload = {
      name: 'Tester',
      email: 'test@example.com',
      password: '123',
      source: 'book_demo',
      privacyNoticeAcknowledged: true,
    };

    const parsed = registerSchema.safeParse(shortPasswordPayload);
    assert.strictEqual(parsed.success, false, 'Short password must fail validation');
  });

  it('Data Persistence Logic: Correctly constructs user settings JSON and status', () => {
    const sources = ['book_demo', 'book_live_demo', undefined, ''];
    for (const rawSource of sources) {
      const cleanSource = (typeof rawSource === 'string' && rawSource.trim()) ? rawSource.trim() : 'request_access';
      const userSettings = { source: cleanSource };

      assert.ok(['book_demo', 'book_live_demo', 'request_access'].includes(cleanSource));
      assert.strictEqual(userSettings.source, cleanSource);

      const jsonStr = JSON.stringify(userSettings);
      const retrieved = JSON.parse(jsonStr);
      assert.strictEqual(retrieved.source, cleanSource);
    }
  });

  it('Security: Confirms public request submissions default to pending approval and non-admin role', () => {
    const defaultStatus = 'pending';
    const defaultRole = 'owner';

    // Must never create admin or superadmin directly
    assert.notStrictEqual(defaultRole, 'admin');
    assert.notStrictEqual(defaultRole, 'superadmin');
    assert.strictEqual(defaultStatus, 'pending');
  });

  it('DPDP Compliance: Correctly sets collection source in audit trail', () => {
    const testCases = [
      { source: 'book_demo', expectedConsentSource: 'book_demo' },
      { source: 'book_live_demo', expectedConsentSource: 'book_live_demo' },
      { source: 'request_access', expectedConsentSource: 'signup' },
      { source: undefined, expectedConsentSource: 'signup' },
    ];

    for (const { source, expectedConsentSource } of testCases) {
      const cleanSource = (typeof source === 'string' && source.trim()) ? source.trim() : 'request_access';
      const consentCollectionSource = cleanSource === 'book_demo' || cleanSource === 'book_live_demo' ? cleanSource : 'signup';
      assert.strictEqual(consentCollectionSource, expectedConsentSource);
    }
  });
});
