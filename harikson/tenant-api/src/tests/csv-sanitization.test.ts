import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { sanitizeCsvCell } from '../routes/user.routes.js';
import { pool, readPool } from '../db/pool.js';

describe('Phase 6: CSV Formula Injection (DDE) Sanitization Regression Suite', () => {
  after(async () => {
    try {
      await pool.end();
      await readPool.end();
    } catch (_) {}
    process.exit(0);
  });
  it('neutralizes standard spreadsheet formula prefixes with a single quote', () => {
    // Formula prefixes: =, +, -, @
    assert.strictEqual(sanitizeCsvCell('=1+1'), "'=1+1");
    assert.strictEqual(sanitizeCsvCell('+cmd|/C calc!A0'), "'+cmd|/C calc!A0");
    assert.strictEqual(sanitizeCsvCell('-2+3'), "'-2+3");
    assert.strictEqual(sanitizeCsvCell('@SUM(A1:A10)'), "'@SUM(A1:A10)");
  });

  it('neutralizes control character prefixes (tab and carriage return)', () => {
    assert.strictEqual(sanitizeCsvCell('\t=2+2'), "'\t=2+2");
    assert.strictEqual(sanitizeCsvCell('\r+3+3'), "'\r+3+3");
  });

  it('escapes embedded double quotes per RFC 4180 CSV standard', () => {
    assert.strictEqual(sanitizeCsvCell('Company "Alpha" LLC'), 'Company ""Alpha"" LLC');
    assert.strictEqual(sanitizeCsvCell('="hello"'), '\'=""hello""');
  });

  it('preserves standard alphanumeric text, punctuation, and numbers untouched', () => {
    assert.strictEqual(sanitizeCsvCell('API Key Created'), 'API Key Created');
    assert.strictEqual(sanitizeCsvCell('Invoice #10294'), 'Invoice #10294');
    assert.strictEqual(sanitizeCsvCell('support@xarwiz.com'), 'support@xarwiz.com');
    assert.strictEqual(sanitizeCsvCell('user_12345'), 'user_12345');
    assert.strictEqual(sanitizeCsvCell(42), '42');
    assert.strictEqual(sanitizeCsvCell(0), '0');
  });

  it('handles null, undefined, and empty string safely without throwing', () => {
    assert.strictEqual(sanitizeCsvCell(null), '');
    assert.strictEqual(sanitizeCsvCell(undefined), '');
    assert.strictEqual(sanitizeCsvCell(''), '');
  });
});
