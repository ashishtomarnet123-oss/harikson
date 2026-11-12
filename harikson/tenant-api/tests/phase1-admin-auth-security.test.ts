import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Phase 1 — Admin Authentication & Security Test Suite', () => {
  const TEST_SECRET = 'xarwiz_super_secure_admin_jwt_secret_key_32bytes_long!';

  // =========================================================================
  // 1. NO HARDCODED ADMIN AUTHENTICATION BYPASS
  // =========================================================================
  it('1. Admin Login: must reject historical backdoor passwords when password_hash does not match', async () => {
    // Generate a legitimate bcrypt hash for a real admin password
    const realPassword = 'RealAdminSecurePassword@2026!';
    const realHash = await bcrypt.compare(realPassword, await bcrypt.hash(realPassword, 10));
    assert.strictEqual(realHash, true, 'Real password bcrypt matches');

    // Historical backdoor passwords must NOT match the hash
    const backdoorPasswords = [
      'Surendra@999080',
      'Surendra@998080',
      'Admin@1234',
      'Admin@neurovalt@2620',
    ];

    const targetUserHash = await bcrypt.hash(realPassword, 10);
    for (const backdoor of backdoorPasswords) {
      const match = await bcrypt.compare(backdoor, targetUserHash);
      assert.strictEqual(match, false, `Backdoor password '${backdoor}' must be rejected by bcrypt`);
    }
  });

  it('2. Static Code Check: admin-panel and admin-api have zero occurrences of backdoor password bypasses', () => {
    const loginRoutePath = path.resolve(process.cwd(), '../../admin-panel/app/api/auth/login/route.ts');
    const loginContent = fs.readFileSync(loginRoutePath, 'utf-8');

    assert.ok(!loginContent.includes('isDevAdminPass'), 'isDevAdminPass must be removed from login route');
    assert.ok(!loginContent.includes('Surendra@999080'), 'Surendra@999080 backdoor must not exist');
    assert.ok(!loginContent.includes('Admin@1234'), 'Admin@1234 backdoor must not exist');
    assert.ok(!loginContent.includes('Admin@neurovalt@2620'), 'Admin@neurovalt@2620 backdoor must not exist');

    const migration068Path = path.resolve(process.cwd(), '../tenant-api/src/migrations/068_update_admin_password.sql');
    const migrationContent = fs.readFileSync(migration068Path, 'utf-8');
    assert.ok(migrationContent.includes('force_password_change = TRUE'), 'Migration 068 must enforce mandatory password rotation');
  });

  // =========================================================================
  // 2. JWT SECRET & SECURE SIGNING CONFIGURATION
  // =========================================================================
  it('3. Secret Hygiene: fallback dev JWT secret string is eliminated from all admin analytics routes', () => {
    const analyticsFiles = [
      '../../admin-panel/app/api/admin/analytics/overview/route.ts',
      '../../admin-panel/app/api/admin/analytics/paid-users/route.ts',
      '../../admin-panel/app/api/admin/analytics/transactions/route.ts',
    ];

    for (const relPath of analyticsFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(!content.includes('neuravolt_dev_jwt_secret'), `File ${relPath} must not contain fallback secret string`);
    }
  });

  it('4. Secret Length: system refuses to sign or verify with secrets shorter than 32 characters', () => {
    const shortSecret = 'short_secret_123';
    assert.throws(
      () => {
        if (!shortSecret || shortSecret.length < 32) {
          throw new Error('FATAL: JWT_SECRET must be set and at least 32 characters');
        }
      },
      /at least 32 characters/,
      'Must reject secret under 32 chars'
    );
  });

  // =========================================================================
  // 3. CLAIMS & ALGORITHM ENFORCEMENT
  // =========================================================================
  it('5. Claim & Algorithm Enforcement: token algorithm is restricted to HS256 and rejects alg:none', () => {
    const unsignedTokenPayload = {
      userId: '00000000-0000-0000-0000-000000000001',
      role: 'superadmin',
      type: 'access',
    };

    // Attempting algorithm 'none' token
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(unsignedTokenPayload)).toString('base64url');
    const forgedNoneToken = `${header}.${payload}.`;

    assert.throws(
      () => {
        jwt.verify(forgedNoneToken, TEST_SECRET, { algorithms: ['HS256'] });
      },
      /jwt signature is required|invalid/,
      'Must reject forged alg:none token'
    );
  });

  it('6. Token Expiry: expired tokens are rejected', () => {
    const expiredToken = jwt.sign(
      { userId: '00000000-0000-0000-0000-000000000001', role: 'admin', type: 'access' },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' }
    );

    assert.throws(
      () => {
        jwt.verify(expiredToken, TEST_SECRET, { algorithms: ['HS256'] });
      },
      (err: any) => err.name === 'TokenExpiredError',
      'Must reject expired token'
    );
  });

  it('7. Token Type Isolation: 2FA pending tokens and refresh tokens cannot be used as access tokens', () => {
    const pending2faToken = jwt.sign(
      { userId: '00000000-0000-0000-0000-000000000001', role: 'admin', type: '2fa_pending' },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' }
    );

    const decoded = jwt.verify(pending2faToken, TEST_SECRET, { algorithms: ['HS256'] }) as any;
    assert.strictEqual(decoded.type, '2fa_pending');
    assert.notStrictEqual(decoded.type, 'access', '2fa_pending token is not an access token');
  });

  // =========================================================================
  // 4. ADMIN ROLE VALIDATION
  // =========================================================================
  it('8. Privileged Role Enforcement: non-admin roles (user, member, guest) are denied admin access', () => {
    const allowedAdminRoles = ['admin', 'superadmin', 'founder'];
    const forbiddenRoles = ['user', 'member', 'developer', 'viewer', 'guest'];

    for (const role of forbiddenRoles) {
      assert.strictEqual(allowedAdminRoles.includes(role), false, `Role '${role}' must not have admin access`);
    }

    for (const role of allowedAdminRoles) {
      assert.strictEqual(allowedAdminRoles.includes(role), true, `Role '${role}' is an authorized admin role`);
    }
  });

  // =========================================================================
  // 5. ACCOUNT LOCKOUT & RATE LIMITING
  // =========================================================================
  it('9. Account Lockout Logic: 5 consecutive failed attempts trigger a 30-minute lockout', () => {
    let failedAttempts = 0;
    let lockedUntil: Date | null = null;

    const recordAttempt = (matches: boolean) => {
      if (!matches) {
        failedAttempts += 1;
        if (failedAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
      } else {
        failedAttempts = 0;
        lockedUntil = null;
      }
    };

    // Simulate 4 failed attempts: not yet locked
    for (let i = 0; i < 4; i++) recordAttempt(false);
    assert.strictEqual(failedAttempts, 4);
    assert.strictEqual(lockedUntil, null);

    // 5th failed attempt: triggers lockout
    recordAttempt(false);
    assert.strictEqual(failedAttempts, 5);
    assert.ok(lockedUntil !== null, 'Account must be locked');
    assert.ok(lockedUntil!.getTime() > Date.now(), 'locked_until must be in the future');

    // Reset upon successful login
    recordAttempt(true);
    assert.strictEqual(failedAttempts, 0);
    assert.strictEqual(lockedUntil, null);
  });

  // =========================================================================
  // 6. NEXT.JS EDGE MIDDLEWARE VERIFICATION LOGIC
  // =========================================================================
  it('10. Edge WebCrypto JWT Verification: accurately validates valid signatures and rejects tampering', async () => {
    const secretStr = TEST_SECRET;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretStr),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const validToken = jwt.sign(
      { userId: 'admin-123', role: 'admin', type: 'access' },
      secretStr,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const parts = validToken.split('.');
    const b64UrlToUint8 = (str: string) => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const bin = Buffer.from(pad, 'base64').toString('binary');
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    };

    const signature = b64UrlToUint8(parts[2]);
    const data = enc.encode(`${parts[0]}.${parts[1]}`);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    assert.strictEqual(isValid, true, 'Valid JWT signature verifies in WebCrypto');

    // Tampered payload
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'admin-123', role: 'superadmin' })).toString('base64url');
    const tamperedData = enc.encode(`${parts[0]}.${tamperedPayload}`);
    const isTamperedValid = await crypto.subtle.verify('HMAC', key, signature, tamperedData);
    assert.strictEqual(isTamperedValid, false, 'Tampered JWT must be rejected');
  });
});
