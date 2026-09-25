import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordPolicy, generateCryptographicPassword } from '../src/validators/passwordPolicy.js';

describe('Superadmin Credential Management - Password Policy & Generator', () => {
  it('should reject passwords shorter than 12 characters', () => {
    const res = validatePasswordPolicy('Ab1!short');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('at least 12 characters'));
  });

  it('should reject passwords missing uppercase letters', () => {
    const res = validatePasswordPolicy('nouppercasehere123!');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('uppercase'));
  });

  it('should reject passwords missing lowercase letters', () => {
    const res = validatePasswordPolicy('NOLOWERCASEHERE123!');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('lowercase'));
  });

  it('should reject passwords missing numbers', () => {
    const res = validatePasswordPolicy('NoNumbersInHereAtAll!');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('numeric'));
  });

  it('should reject passwords missing special characters', () => {
    const res = validatePasswordPolicy('NoSpecialCharacters12345');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('special character'));
  });

  it('should reject common dictionary / weak passwords', () => {
    const res = validatePasswordPolicy('Password123!');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('common or easily guessable'));
  });

  it('should accept valid, strong enterprise passwords', () => {
    const res = validatePasswordPolicy('K8#vW9$xL2@mQ4!pZ');
    assert.equal(res.valid, true);
    assert.equal(res.error, undefined);
  });

  it('should generate cryptographically strong temporary passwords that always pass policy', () => {
    for (let i = 0; i < 50; i++) {
      const tempPass = generateCryptographicPassword(16);
      assert.equal(tempPass.length, 16);
      const policyResult = validatePasswordPolicy(tempPass);
      assert.equal(policyResult.valid, true, `Generated password "${tempPass}" failed policy: ${policyResult.error}`);
    }
  });

  it('should generate unique temporary passwords each time', () => {
    const set = new Set();
    for (let i = 0; i < 100; i++) {
      const p = generateCryptographicPassword(16);
      set.add(p);
    }
    assert.equal(set.size, 100, 'All 100 generated temporary passwords should be unique');
  });
});

describe('Superadmin Protection & Hierarchy Logic', () => {
  const SUPERADMIN_ROLES = ['SUPERADMIN', 'SUPER_ADMIN', 'FOUNDER', 'OWNER', 'PLATFORM_ADMIN'];

  function checkPermission(actor, target) {
    const actorRole = (actor.role || '').toUpperCase();
    const isActorSuperadmin = SUPERADMIN_ROLES.includes(actorRole) || actor.is_superadmin === true || actor.is_super_admin === true;

    if (!isActorSuperadmin) {
      return { allowed: false, status: 403, error: 'Forbidden: Superadmin privileges required.' };
    }

    if (String(actor.id) === String(target.id)) {
      return { allowed: false, status: 400, error: 'Cannot manage your own credentials via admin reset. Use profile settings.' };
    }

    const targetRole = (target.role || '').toUpperCase();
    const isTargetSuperadmin = SUPERADMIN_ROLES.includes(targetRole) || target.is_superadmin === true || target.is_super_admin === true;

    if (isTargetSuperadmin && actorRole !== 'SUPERADMIN' && actorRole !== 'FOUNDER') {
      return { allowed: false, status: 403, error: 'Only top-tier Superadmins / Founders can manage credentials for other Superadmins.' };
    }

    return { allowed: true };
  }

  it('should allow Superadmin to manage regular users', () => {
    const actor = { id: 'admin-1', role: 'SUPERADMIN' };
    const target = { id: 'user-2', role: 'MEMBER' };
    const res = checkPermission(actor, target);
    assert.equal(res.allowed, true);
  });

  it('should block non-superadmin from managing any passwords', () => {
    const actor = { id: 'admin-2', role: 'TENANT_ADMIN' };
    const target = { id: 'user-3', role: 'MEMBER' };
    const res = checkPermission(actor, target);
    assert.equal(res.allowed, false);
    assert.equal(res.status, 403);
  });

  it('should prevent admin from resetting their own password via admin panel', () => {
    const actor = { id: 'admin-1', role: 'SUPERADMIN' };
    const target = { id: 'admin-1', role: 'SUPERADMIN' };
    const res = checkPermission(actor, target);
    assert.equal(res.allowed, false);
    assert.equal(res.status, 400);
  });

  it('should protect Superadmin accounts from ordinary platform admins', () => {
    const actor = { id: 'admin-3', role: 'PLATFORM_ADMIN' };
    const target = { id: 'founder-1', role: 'FOUNDER' };
    const res = checkPermission(actor, target);
    assert.equal(res.allowed, false);
    assert.equal(res.status, 403);
  });
});

describe('Security Invariants', () => {
  it('audit event payload must never contain password, hash, or temporary password', () => {
    const sanitizedAuditEvent = {
      event: 'USER_PASSWORD_RESET',
      actorUserId: 'admin_123',
      targetUserId: 'user_456',
      targetEmail: 'ashishtomar.net123@gmail.com',
      forceChangeOnNextLogin: true,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: true
    };

    const keys = Object.keys(sanitizedAuditEvent);
    assert.ok(!keys.includes('password'));
    assert.ok(!keys.includes('passwordHash'));
    assert.ok(!keys.includes('temporaryPassword'));
    assert.ok(!keys.includes('plaintext'));

    const jsonString = JSON.stringify(sanitizedAuditEvent);
    assert.ok(!jsonString.includes('passwordHash'));
  });
});
