import crypto from 'crypto';

export const PROHIBITED_PASSWORDS = new Set([
  'password123!',
  'password1234!',
  'admin123456!',
  'admin1234567!',
  'welcome12345!',
  'welcome123456!',
  'changeme123!',
  'xarwiz123456!',
  'xarwizai12345!',
  '123456789012!',
  'qwerty123456!',
  'administrator!',
  'superadmin123!',
  'letmein123456!',
]);

/**
 * Validates a password against enterprise security policy.
 * Requirements:
 * - Minimum 12 characters, max 256
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * - Not in common dictionary / prohibited list
 */
export function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required and must be a string' };
  }

  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters long' };
  }

  if (password.length > 256) {
    return { valid: false, error: 'Password must not exceed 256 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z)' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter (a-z)' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one numeric digit (0-9)' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (e.g. !@#$%^&*)' };
  }

  if (PROHIBITED_PASSWORDS.has(password.toLowerCase().trim())) {
    return { valid: false, error: 'Password is too common or easily guessable. Please choose a stronger password.' };
  }

  return { valid: true };
}

/**
 * Generates a high-entropy cryptographically secure random password.
 * Guarantees compliance with password policy.
 */
export function generateCryptographicPassword(length = 16) {
  const effectiveLength = Math.max(12, length);
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous O, I
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // exclude ambiguous l
  const numbers = '23456789'; // exclude ambiguous 0, 1
  const symbols = '!@#$%^&*_-+=?';
  const allChars = upper + lower + numbers + symbols;

  let pwd = '';
  // Ensure at least one from each character class
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += numbers[crypto.randomInt(0, numbers.length)];
  pwd += symbols[crypto.randomInt(0, symbols.length)];

  for (let i = 4; i < effectiveLength; i++) {
    pwd += allChars[crypto.randomInt(0, allChars.length)];
  }

  // Cryptographically shuffle array
  const chars = pwd.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
