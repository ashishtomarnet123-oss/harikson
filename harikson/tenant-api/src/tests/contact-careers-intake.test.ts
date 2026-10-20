import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'http';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import intakeRoutes, {
  checkIntakeRateLimit,
  setRedisClientForTest,
  resetRateLimitMapForTest,
  LUA_INCR_EXPIRE,
  MAX_SUBMISSIONS_PER_WINDOW,
} from '../routes/intake.routes.js';
import { registerSchema } from '../validators/auth.schema.js';
import { normalizePlanId } from '../routes/user.routes.js';
import fs from 'fs';
import path from 'path';

// Setup isolated Express test server with intake routes mounted
const app = express();
app.set('trust proxy', true);
app.use(express.json());

// Simple mock cookie parser
app.use((req: any, _res, next) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie: string) => {
    const idx = cookie.indexOf('=');
    if (idx > 0) {
      cookies[cookie.substring(0, idx).trim()] = cookie.substring(idx + 1).trim();
    }
  });
  req.cookies = cookies;
  next();
});

// Mount intake router under the canonical API paths
app.use('/api/v1/contact', intakeRoutes);
app.use('/api/v1/careers', intakeRoutes);
app.use('/api/v1/intake', intakeRoutes);
app.use('/api/v1/admin', intakeRoutes);

let server: any;
let port: number;
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'supersecretdevjwtkey_1234567890_harikson_secure_long_32chars';

// Helper to make HTTP requests against the test server
async function testRequest(
  method: string,
  urlPath: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const jsonBody = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (jsonBody) {
      reqHeaders['Content-Length'] = Buffer.byteLength(jsonBody).toString();
    }

    const req = request.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsedData: any = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch (_) {
            parsedData = rawData;
          }
          resolve({ status: res.statusCode || 500, data: parsedData, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (jsonBody) {
      req.write(jsonBody);
    }
    req.end();
  });
}

// Generate valid test JWTs
function createTestToken(role: string, userId: string = 'test-user-id-123'): string {
  return jwt.sign({ userId, email: `${role}@test.xarwiz.com`, role }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

describe('Phase 3: Contact & Careers Lead Intake Test Suite', () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 3099;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
    await pool.end().catch(() => {});
    setTimeout(() => process.exit(0), 100);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CONTACT / SALES INQUIRY ENDPOINT
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 3B: Contact / Sales Enquiry Endpoint', () => {
    it('successfully persists a valid sales enquiry into contact_submissions without creating user or tenant', async () => {
      // Record baseline user and tenant counts
      const initialUsersRes = await pool.query('SELECT COUNT(*)::int as count FROM users');
      const initialTenantsRes = await pool.query('SELECT COUNT(*)::int as count FROM tenants');
      const initialSubsRes = await pool.query('SELECT COUNT(*)::int as count FROM subscriptions');

      const contactPayload = {
        name: 'Aarav Enterprise Lead',
        email: 'aarav.lead@bharatcorp.co.in',
        phone: '+91 98765 00001',
        company: 'Bharat Technologies Corp',
        teamSize: '50-250',
        inquiryType: 'enterprise_sales',
        message: 'Looking to deploy sovereign LLM infrastructure on-premise.',
        privacyNoticeAcknowledged: true,
      };

      const res = await testRequest('POST', '/api/v1/contact', contactPayload, {
        'x-forwarded-for': '203.0.113.10',
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.id, 'Submission ID should be returned');

      // Verify row exists in contact_submissions
      const dbRowRes = await pool.query('SELECT * FROM contact_submissions WHERE id = $1', [res.data.id]);
      assert.equal(dbRowRes.rows.length, 1);
      const row = dbRowRes.rows[0];
      assert.equal(row.name, 'Aarav Enterprise Lead');
      assert.equal(row.email, 'aarav.lead@bharatcorp.co.in');
      assert.equal(row.company, 'Bharat Technologies Corp');
      assert.equal(row.status, 'new');
      assert.equal(row.privacy_notice_acknowledged, true);
      assert.equal(row.privacy_notice_version, '2.0-dpdp');
      assert.ok(row.acknowledged_at, 'acknowledged_at timestamp must be populated');

      // Verify ZERO accounts, tenants, or subscriptions were created
      const finalUsersRes = await pool.query('SELECT COUNT(*)::int as count FROM users');
      const finalTenantsRes = await pool.query('SELECT COUNT(*)::int as count FROM tenants');
      const finalSubsRes = await pool.query('SELECT COUNT(*)::int as count FROM subscriptions');

      assert.equal(finalUsersRes.rows[0].count, initialUsersRes.rows[0].count, 'User count must NOT increase');
      assert.equal(finalTenantsRes.rows[0].count, initialTenantsRes.rows[0].count, 'Tenant count must NOT increase');
      assert.equal(finalSubsRes.rows[0].count, initialSubsRes.rows[0].count, 'Subscription count must NOT increase');
    });

    it('rejects contact submissions with invalid email address', async () => {
      const res = await testRequest('POST', '/api/v1/contact', {
        name: 'Invalid Email Tester',
        email: 'not-an-email',
        message: 'Hello Xarwiz',
        privacyNoticeAcknowledged: true,
      }, { 'x-forwarded-for': '203.0.113.11' });

      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes('valid work email'));
    });

    it('rejects contact submissions without privacy notice acknowledgement', async () => {
      const res = await testRequest('POST', '/api/v1/contact', {
        name: 'Privacy Decliner',
        email: 'decliner@example.com',
        message: 'No consent provided',
        privacyNoticeAcknowledged: false,
      }, { 'x-forwarded-for': '203.0.113.12' });

      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes('privacy notice'));
    });

    it('ignores client attempts to set privileged fields (e.g. status, id, role)', async () => {
      const res = await testRequest('POST', '/api/v1/contact', {
        name: 'Privilege Injection Attempt',
        email: 'injector@enterprise.in',
        status: 'qualified',
        role: 'superadmin',
        id: '00000000-0000-0000-0000-000000000000',
        message: 'Attempting to inject privileged status',
        privacyNoticeAcknowledged: true,
      }, { 'x-forwarded-for': '203.0.113.13' });

      assert.equal(res.status, 201);
      assert.notEqual(res.data.id, '00000000-0000-0000-0000-000000000000');

      const checkRow = await pool.query('SELECT status FROM contact_submissions WHERE id = $1', [res.data.id]);
      assert.equal(checkRow.rows[0].status, 'new', 'Status must default to "new", ignoring client parameter');
    });

    it('silently drops honeypot spam bot submissions without writing to database', async () => {
      const countBefore = await pool.query('SELECT COUNT(*)::int as count FROM contact_submissions');

      const res = await testRequest('POST', '/api/v1/contact', {
        name: 'Spam Bot 3000',
        email: 'spambot@auto-scrapers.net',
        message: 'Cheap SEO backlinks',
        privacyNoticeAcknowledged: true,
        _hp_website: 'http://malicious-spam-site.com',
      }, { 'x-forwarded-for': '203.0.113.14' });

      assert.equal(res.status, 201);
      const countAfter = await pool.query('SELECT COUNT(*)::int as count FROM contact_submissions');
      assert.equal(countAfter.rows[0].count, countBefore.rows[0].count, 'Honeypot entry must not be saved to DB');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CAREERS APPLICATION ENDPOINT
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 3C: Careers Application Endpoint', () => {
    it('successfully persists a job application into career_applications without creating user or tenant', async () => {
      const initialUsersRes = await pool.query('SELECT COUNT(*)::int as count FROM users');
      const initialTenantsRes = await pool.query('SELECT COUNT(*)::int as count FROM tenants');

      const careerPayload = {
        name: 'Devika Krishnan',
        email: 'devika.ai@engineering.org',
        phone: '+91 94444 12345',
        roleId: 'ai-infra',
        roleTitle: 'Senior AI Infrastructure Engineer',
        portfolioLinks: 'https://github.com/devika-ai https://linkedin.com/in/devika-krishnan',
        coverNote: 'Over 6 years designing distributed Kubernetes clusters and optimizing vLLM kernels.',
        privacyNoticeAcknowledged: true,
      };

      const res = await testRequest('POST', '/api/v1/careers', careerPayload, {
        'x-forwarded-for': '203.0.113.20',
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.id);

      // Verify row exists in career_applications
      const dbRowRes = await pool.query('SELECT * FROM career_applications WHERE id = $1', [res.data.id]);
      assert.equal(dbRowRes.rows.length, 1);
      const row = dbRowRes.rows[0];
      assert.equal(row.name, 'Devika Krishnan');
      assert.equal(row.email, 'devika.ai@engineering.org');
      assert.equal(row.role_id, 'ai-infra');
      assert.equal(row.role_title, 'Senior AI Infrastructure Engineer');
      assert.equal(row.status, 'submitted');
      assert.equal(row.privacy_notice_acknowledged, true);
      assert.equal(row.privacy_notice_version, '2.0-dpdp');
      assert.ok(row.acknowledged_at, 'acknowledged_at timestamp must be populated');

      // Verify ZERO accounts or tenants created
      const finalUsersRes = await pool.query('SELECT COUNT(*)::int as count FROM users');
      const finalTenantsRes = await pool.query('SELECT COUNT(*)::int as count FROM tenants');
      assert.equal(finalUsersRes.rows[0].count, initialUsersRes.rows[0].count);
      assert.equal(finalTenantsRes.rows[0].count, initialTenantsRes.rows[0].count);
    });

    it('rejects career application when portfolio or profile link is missing or invalid URL', async () => {
      const res = await testRequest('POST', '/api/v1/careers', {
        name: 'Candidate No Link',
        email: 'nolink@example.com',
        portfolioLinks: '',
        privacyNoticeAcknowledged: true,
      }, { 'x-forwarded-for': '203.0.113.21' });

      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes('URL'));
    });

    it('rejects career application when privacy notice is not acknowledged', async () => {
      const res = await testRequest('POST', '/api/v1/careers', {
        name: 'Candidate No Privacy',
        email: 'noprivacy@example.com',
        portfolioLinks: 'https://github.com/noprivacy',
        privacyNoticeAcknowledged: false,
      }, { 'x-forwarded-for': '203.0.113.22' });

      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes('privacy notice'));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. STAFF ADMINISTRATIVE REVIEW & ACCESS CONTROL
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 3E: Staff Review & Administrative Security Controls', () => {
    it('rejects unauthenticated requests to list contact submissions with 401', async () => {
      const res = await testRequest('GET', '/api/v1/admin/contact-submissions');
      assert.equal(res.status, 401);
    });

    it('rejects non-staff authenticated users (e.g. member) with 403 Forbidden', async () => {
      const memberToken = createTestToken('member');
      const res = await testRequest('GET', '/api/v1/admin/contact-submissions', undefined, {
        Authorization: `Bearer ${memberToken}`,
      });
      assert.equal(res.status, 403);
      assert.ok(res.data.error.includes('Staff administrative privileges required'));
    });

    it('allows authorized admin or superadmin to list contact submissions and update status', async () => {
      // 1. Seed a submission
      const insertRes = await pool.query(
        `INSERT INTO contact_submissions (name, email, message, privacy_notice_acknowledged, status)
         VALUES ('Admin Review Target', 'review.target@example.com', 'Ready for review', true, 'new')
         RETURNING id`
      );
      const submissionId = insertRes.rows[0].id;

      // 2. Query list as superadmin
      const adminToken = createTestToken('superadmin');
      const listRes = await testRequest('GET', '/api/v1/admin/contact-submissions?status=new', undefined, {
        Authorization: `Bearer ${adminToken}`,
      });

      assert.equal(listRes.status, 200);
      assert.ok(Array.isArray(listRes.data.submissions));
      const found = listRes.data.submissions.find((s: any) => s.id === submissionId);
      assert.ok(found, 'Should find the seeded submission');

      // 3. Update status as admin
      const updateRes = await testRequest(
        'PATCH',
        `/api/v1/admin/contact-submissions/${submissionId}/status`,
        { status: 'contacted' },
        { Authorization: `Bearer ${adminToken}` }
      );

      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.data.success, true);
      assert.equal(updateRes.data.submission.status, 'contacted');

      // Verify DB reflects updated status
      const verifyRow = await pool.query('SELECT status FROM contact_submissions WHERE id = $1', [submissionId]);
      assert.equal(verifyRow.rows[0].status, 'contacted');
    });

    it('rejects invalid status transitions with 400', async () => {
      const adminToken = createTestToken('admin');
      const insertRes = await pool.query(
        `INSERT INTO contact_submissions (name, email, message, privacy_notice_acknowledged, status)
         VALUES ('Status Tester', 'status.tester@example.com', 'Testing status', true, 'new')
         RETURNING id`
      );
      const submissionId = insertRes.rows[0].id;

      const res = await testRequest(
        'PATCH',
        `/api/v1/admin/contact-submissions/${submissionId}/status`,
        { status: 'invalid_status_xyz' },
        { Authorization: `Bearer ${adminToken}` }
      );

      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes('Invalid status'));
    });

    it('allows authorized staff to list and update career applications', async () => {
      // 1. Seed application
      const insertRes = await pool.query(
        `INSERT INTO career_applications (name, email, role_id, role_title, portfolio_links, privacy_notice_acknowledged, status)
         VALUES ('Candidate Staff Review', 'staff.candidate@example.com', 'infra-eng', 'Infra Engineer', 'https://github.com/candidate', true, 'submitted')
         RETURNING id`
      );
      const appDocId = insertRes.rows[0].id;

      const adminToken = createTestToken('admin');
      const listRes = await testRequest('GET', '/api/v1/admin/career-applications', undefined, {
        Authorization: `Bearer ${adminToken}`,
      });

      assert.equal(listRes.status, 200);
      assert.ok(Array.isArray(listRes.data.applications));

      const updateRes = await testRequest(
        'PATCH',
        `/api/v1/admin/career-applications/${appDocId}/status`,
        { status: 'interviewing' },
        { Authorization: `Bearer ${adminToken}` }
      );

      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.data.application.status, 'interviewing');
    });

    it('rejects expired JWT token with 401 Unauthorized', async () => {
      const expiredToken = jwt.sign(
        { userId: 'expired-user', email: 'expired@xarwiz.com', role: 'admin' },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' }
      );
      const res = await testRequest('GET', '/api/v1/admin/contact-submissions', undefined, {
        Authorization: `Bearer ${expiredToken}`,
      });
      assert.equal(res.status, 401);
      assert.ok(res.data.error.includes('expired') || res.data.error.includes('Unauthorized'));
    });

    it('rejects tampered or invalid JWT signature with 401 Unauthorized', async () => {
      const forgedToken = jwt.sign(
        { userId: 'forged-user', email: 'forged@xarwiz.com', role: 'admin' },
        'wrong_attacker_secret_key_12345678901234567'
      );
      const res = await testRequest('GET', '/api/v1/admin/contact-submissions', undefined, {
        Authorization: `Bearer ${forgedToken}`,
      });
      assert.equal(res.status, 401);
    });

    it('rejects user-controlled or invalid x-internal-secret with 401', async () => {
      const res = await testRequest('GET', '/api/v1/admin/contact-submissions', undefined, {
        'x-internal-secret': 'attacker_random_fake_secret_value_123',
      });
      assert.equal(res.status, 401);
    });

    it('permits access when valid x-internal-secret is provided', async () => {
      const originalSecret = process.env.INTERNAL_API_SECRET;
      const testSecret = 'configured_test_internal_secret_32chars_long!';
      process.env.INTERNAL_API_SECRET = testSecret;

      try {
        const res = await testRequest('GET', '/api/v1/admin/contact-submissions', undefined, {
          'x-internal-secret': testSecret,
        });
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.data.submissions));
      } finally {
        process.env.INTERNAL_API_SECRET = originalSecret;
      }
    });

    it('allows staff to retrieve single contact submission by ID and validates UUID format', async () => {
      const insertRes = await pool.query(
        `INSERT INTO contact_submissions (name, email, message, privacy_notice_acknowledged, status)
         VALUES ('Single Item Target', 'single.target@example.com', 'Single item lookup', true, 'new')
         RETURNING id`
      );
      const submissionId = insertRes.rows[0].id;

      const adminToken = createTestToken('admin');

      // Valid lookup
      const res = await testRequest('GET', `/api/v1/admin/contact-submissions/${submissionId}`, undefined, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.submission.id, submissionId);
      assert.equal(res.data.submission.name, 'Single Item Target');

      // Malformed UUID
      const badIdRes = await testRequest('GET', '/api/v1/admin/contact-submissions/not-a-valid-uuid', undefined, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.equal(badIdRes.status, 400);
      assert.ok(badIdRes.data.error.includes('Invalid submission ID format'));

      // Non-existent UUID
      const notFoundRes = await testRequest('GET', '/api/v1/admin/contact-submissions/00000000-0000-0000-0000-000000000000', undefined, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.equal(notFoundRes.status, 404);
    });

    it('allows staff to retrieve single career application by ID and validates UUID format', async () => {
      const insertRes = await pool.query(
        `INSERT INTO career_applications (name, email, role_id, role_title, portfolio_links, privacy_notice_acknowledged, status)
         VALUES ('Single App Target', 'single.app@example.com', 'ai-infra', 'AI Engineer', 'https://github.com/single', true, 'submitted')
         RETURNING id`
      );
      const appId = insertRes.rows[0].id;
      const adminToken = createTestToken('superadmin');

      // Valid lookup
      const res = await testRequest('GET', `/api/v1/admin/career-applications/${appId}`, undefined, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.application.id, appId);

      // Malformed UUID
      const badIdRes = await testRequest('GET', '/api/v1/admin/career-applications/bad-uuid', undefined, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.equal(badIdRes.status, 400);

      // Non-existent UUID
      const notFoundRes = await testRequest('GET', '/api/v1/admin/career-applications/00000000-0000-0000-0000-000000000000', undefined, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.equal(notFoundRes.status, 404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. REGRESSION & EXISTING FLOW INTEGRITY VERIFICATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Preservation of Existing Registration, Demo, & Commercial Flows', () => {
    it('preserves genuine registration and demo requests validation (book_demo & book_live_demo)', () => {
      const bookDemo = registerSchema.safeParse({
        name: 'Demo Preserved',
        email: 'demo.preserved@corp.in',
        password: 'Password123!',
        company: 'Preserved Corp',
        source: 'book_demo',
        privacyNoticeAcknowledged: true,
      });
      assert.equal(bookDemo.success, true);
      if (bookDemo.success) {
        assert.equal(bookDemo.data.source, 'book_demo');
      }

      const liveDemo = registerSchema.safeParse({
        name: 'Live Demo Preserved',
        email: 'live.demo@corp.in',
        password: 'Password123!',
        source: 'book_live_demo',
        privacyNoticeAcknowledged: true,
      });
      assert.equal(liveDemo.success, true);
    });

    it('preserves Phase 2 plan canonicalization (pro -> professional)', () => {
      assert.equal(normalizePlanId('pro'), 'professional');
      assert.equal(normalizePlanId('starter'), 'starter');
      assert.equal(normalizePlanId('free'), 'free');
    });

    it('confirms frontend contact.js and careers.js do not call /api/v1/auth/register or generate AutoLead passwords', () => {
      const contactCode = fs.readFileSync(path.resolve(process.cwd(), '../../user-portal/pages/contact.js'), 'utf8');
      const careersCode = fs.readFileSync(path.resolve(process.cwd(), '../../user-portal/pages/careers.js'), 'utf8');

      assert.ok(!contactCode.includes('/api/v1/auth/register'), 'contact.js must NOT call /api/v1/auth/register');
      assert.ok(!contactCode.includes('AutoLead_'), 'contact.js must NOT generate AutoLead_ passwords');
      assert.ok(contactCode.includes('/api/v1/contact'), 'contact.js must submit to /api/v1/contact');

      assert.ok(!careersCode.includes('/api/v1/auth/register'), 'careers.js must NOT call /api/v1/auth/register');
      assert.ok(!careersCode.includes('AutoLead_'), 'careers.js must NOT generate AutoLead_ passwords');
      assert.ok(careersCode.includes('/api/v1/careers'), 'careers.js must submit to /api/v1/careers');
    });

    it('confirms frontend forms initialize dpdpConsent to false for unambiguous affirmative action', () => {
      const contactCode = fs.readFileSync(path.resolve(process.cwd(), '../../user-portal/pages/contact.js'), 'utf8');
      const careersCode = fs.readFileSync(path.resolve(process.cwd(), '../../user-portal/pages/careers.js'), 'utf8');

      assert.ok(contactCode.includes('dpdpConsent: false'), 'contact.js must default dpdpConsent to false');
      assert.ok(contactCode.includes('privacyNoticeAcknowledged: !!formData.dpdpConsent'), 'contact.js must submit actual checkbox state');

      assert.ok(careersCode.includes('useState(false)'), 'careers.js must default dpdpConsent to false');
      assert.ok(careersCode.includes('privacyNoticeAcknowledged: !!dpdpConsent'), 'careers.js must submit actual checkbox state');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PHASE 3.1: RATE LIMITER ATOMICITY, CONCURRENCY, & REDIS FAILURE MODES
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 3.1: Rate Limiter Correctness & Atomic Concurrency (Tasks 1 & 3)', () => {
    beforeEach(() => {
      resetRateLimitMapForTest();
      setRedisClientForTest(null);
    });

    it('verifies LUA_INCR_EXPIRE script implements atomic increment and conditional expiry', () => {
      assert.ok(LUA_INCR_EXPIRE.includes('redis.call(\'INCR\', KEYS[1])'), 'Script must atomically increment key');
      assert.ok(LUA_INCR_EXPIRE.includes('redis.call(\'EXPIRE\', KEYS[1], ARGV[1])'), 'Script must set TTL on initial hit');
      assert.ok(LUA_INCR_EXPIRE.includes('TTL'), 'Script must verify TTL to avoid permanent keys without expiration');
    });

    it('enforces fixed-window rate limit under concurrent requests (10 allowed, 5 rejected)', async () => {
      resetRateLimitMapForTest();
      const testIp = '198.51.100.42';

      // Fire 15 concurrent check requests
      const promises = Array.from({ length: 15 }, () => checkIntakeRateLimit(testIp));
      const results = await Promise.all(promises);

      const allowedCount = results.filter((r) => r === true).length;
      const blockedCount = results.filter((r) => r === false).length;

      assert.equal(allowedCount, 10, 'Exactly 10 requests must be allowed in the 15-minute window');
      assert.equal(blockedCount, 5, 'Requests beyond 10 must be blocked');

      // Different IP address must be independent and allowed
      const differentIpAllowed = await checkIntakeRateLimit('198.51.100.43');
      assert.equal(differentIpAllowed, true, 'Different IP must have its own independent rate limit window');
    });

    it('returns HTTP 429 Too Many Requests when IP exceeds 10 submissions', async () => {
      resetRateLimitMapForTest();
      const burstIp = '203.0.113.77';

      // 10 valid submissions
      for (let i = 0; i < 10; i++) {
        const res = await testRequest(
          'POST',
          '/api/v1/contact',
          {
            name: `Burst User ${i}`,
            email: `burst${i}@example.com`,
            message: 'Burst test',
            privacyNoticeAcknowledged: true,
          },
          { 'x-forwarded-for': burstIp }
        );
        assert.equal(res.status, 201, `Request ${i + 1} should succeed`);
      }

      // 11th request must be rejected with 429
      const overflowRes = await testRequest(
        'POST',
        '/api/v1/contact',
        {
          name: 'Burst User 11',
          email: 'burst11@example.com',
          message: 'Burst test 11',
          privacyNoticeAcknowledged: true,
        },
        { 'x-forwarded-for': burstIp }
      );

      assert.equal(overflowRes.status, 429);
      assert.ok(overflowRes.data.error.includes('Too many submissions'));
    });

    it('safely falls back to single-node in-memory limiter when Redis operations fail', async () => {
      resetRateLimitMapForTest();

      // Mock Redis client that errors during eval
      const mockFailingRedis: any = {
        status: 'ready',
        eval: async () => {
          throw new Error('ECONNRESET: Redis connection terminated unexpectedly');
        },
      };

      setRedisClientForTest(mockFailingRedis);

      // Verify checkIntakeRateLimit catches the Redis failure, logs safe warning, and falls back to memory
      const result = await checkIntakeRateLimit('203.0.113.120');
      assert.equal(result, true, 'Fallback should allow initial request rather than dropping legitimate lead');

      // Verify memory fallback tracks subsequent counts
      for (let i = 1; i < 10; i++) {
        const allowed = await checkIntakeRateLimit('203.0.113.120');
        assert.equal(allowed, true);
      }

      // 11th request on fallback should be blocked
      const blockedOnFallback = await checkIntakeRateLimit('203.0.113.120');
      assert.equal(blockedOnFallback, false, 'In-memory fallback must still enforce the 10 request limit');

      setRedisClientForTest(null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. PHASE 3.1: TRUSTED PROXY & CLIENT IP DERIVATION (TASK 2)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 3.1: Trusted Proxy & Forwarded-IP Header Derivation (Task 2)', () => {
    it('demonstrates req.ip derivation under trust proxy = true vs trust proxy = 1', async () => {
      // 1. App with trust proxy = true (trusts all hops, reads leftmost IP)
      const appTrustAll = express();
      appTrustAll.set('trust proxy', true);
      let capturedIpAll = '';
      appTrustAll.get('/test-ip', (req, res) => {
        capturedIpAll = req.ip || '';
        res.json({ ip: req.ip });
      });

      let serverAll: any;
      const portAll = await new Promise<number>((resolve) => {
        serverAll = appTrustAll.listen(0, '127.0.0.1', () => {
          resolve((serverAll.address() as any).port);
        });
      });

      await new Promise<void>((resolve) => {
        request.get(
          {
            hostname: '127.0.0.1',
            port: portAll,
            path: '/test-ip',
            headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.195' },
          },
          (res) => {
            res.on('data', () => {});
            res.on('end', () => {
              serverAll.close();
              resolve();
            });
          }
        );
      });

      // Under trust proxy: true, Express extracts the leftmost address '1.2.3.4'
      assert.equal(capturedIpAll, '1.2.3.4', 'trust proxy: true extracts leftmost IP in X-Forwarded-For');

      // 2. App with trust proxy = 1 (trusts only 1 immediate reverse proxy hop)
      const appTrust1 = express();
      appTrust1.set('trust proxy', 1);
      let capturedIp1 = '';
      appTrust1.get('/test-ip', (req, res) => {
        capturedIp1 = req.ip || '';
        res.json({ ip: req.ip });
      });

      let server1: any;
      const port1 = await new Promise<number>((resolve) => {
        server1 = appTrust1.listen(0, '127.0.0.1', () => {
          resolve((server1.address() as any).port);
        });
      });

      await new Promise<void>((resolve) => {
        request.get(
          {
            hostname: '127.0.0.1',
            port: port1,
            path: '/test-ip',
            headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.195' },
          },
          (res) => {
            res.on('data', () => {});
            res.on('end', () => {
              server1.close();
              resolve();
            });
          }
        );
      });

      // Under trust proxy: 1, Express ignores the spoofed '1.2.3.4' and takes the 1-hop client '203.0.113.195'
      assert.equal(capturedIp1, '203.0.113.195', 'trust proxy: 1 rejects leftmost spoofed IP and takes 1-hop client IP');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. PHASE 3.1: PRIVACY ACKNOWLEDGEMENT EVIDENCE & NOTICE VERSIONING (TASK 4)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 3.1: Privacy Notice Acknowledgement Evidence & Database Defaults (Task 4)', () => {
    it('confirms database column default for privacy_notice_acknowledged is false in both tables', async () => {
      const contactDefaultRes = await pool.query(
        "SELECT column_default FROM information_schema.columns WHERE table_name = 'contact_submissions' AND column_name = 'privacy_notice_acknowledged'"
      );
      assert.equal(contactDefaultRes.rows[0].column_default, 'false', 'Database default must be false');

      const careerDefaultRes = await pool.query(
        "SELECT column_default FROM information_schema.columns WHERE table_name = 'career_applications' AND column_name = 'privacy_notice_acknowledged'"
      );
      assert.equal(careerDefaultRes.rows[0].column_default, 'false', 'Database default must be false');
    });

    it('rejects contact submissions with invalid, string-false, or null privacy acknowledgement', async () => {
      // 1. Missing
      const missingRes = await testRequest('POST', '/api/v1/contact', {
        name: 'Missing Consent',
        email: 'missing.consent@example.com',
      }, { 'x-forwarded-for': '203.0.113.201' });
      assert.equal(missingRes.status, 400);

      // 2. String 'false'
      const stringFalseRes = await testRequest('POST', '/api/v1/contact', {
        name: 'False Consent',
        email: 'false.consent@example.com',
        privacyNoticeAcknowledged: 'false',
      }, { 'x-forwarded-for': '203.0.113.202' });
      assert.equal(stringFalseRes.status, 400);

      // 3. Null
      const nullRes = await testRequest('POST', '/api/v1/contact', {
        name: 'Null Consent',
        email: 'null.consent@example.com',
        privacyNoticeAcknowledged: null,
      }, { 'x-forwarded-for': '203.0.113.203' });
      assert.equal(nullRes.status, 400);
    });

    it('persists privacy_notice_version, acknowledged_at, and separate marketing consent', async () => {
      const res = await testRequest('POST', '/api/v1/contact', {
        name: 'DPDP Evidence Test',
        email: 'dpdp.evidence@example.com',
        company: 'Sovereign Compliance Labs',
        privacyNoticeAcknowledged: true,
        privacyNoticeVersion: '2.0-dpdp',
        marketingConsent: false,
      }, { 'x-forwarded-for': '203.0.113.204' });

      assert.equal(res.status, 201);
      const rowRes = await pool.query(
        'SELECT privacy_notice_acknowledged, privacy_notice_version, acknowledged_at, marketing_consent FROM contact_submissions WHERE id = $1',
        [res.data.id]
      );
      assert.equal(rowRes.rows.length, 1);
      const row = rowRes.rows[0];

      assert.equal(row.privacy_notice_acknowledged, true);
      assert.equal(row.privacy_notice_version, '2.0-dpdp');
      assert.ok(row.acknowledged_at instanceof Date || typeof row.acknowledged_at === 'string');
      assert.equal(row.marketing_consent, false, 'Marketing consent must remain false and separate');
    });

    it('allows staff to review privacy_notice_version and acknowledged_at in staff listing endpoints', async () => {
      const adminToken = createTestToken('superadmin');
      const listRes = await testRequest('GET', '/api/v1/admin/contact-submissions?limit=5', undefined, {
        Authorization: `Bearer ${adminToken}`,
      });

      assert.equal(listRes.status, 200);
      const first = listRes.data.submissions[0];
      assert.ok(first);
      assert.ok('privacy_notice_version' in first, 'Staff review must expose privacy_notice_version');
      assert.ok('acknowledged_at' in first, 'Staff review must expose acknowledged_at');
    });
  });
});
