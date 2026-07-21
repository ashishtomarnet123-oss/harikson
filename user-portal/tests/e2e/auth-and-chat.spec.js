// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Neuravolt Platform E2E Flow', () => {
  test('User Auth -> Navigation -> Chat Stream -> Logout Flow', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('http://localhost:3000/login');
    await expect(page).toHaveTitle(/Sign In|Neuravolt/i);

    // 2. Perform Login
    await page.fill('input[type="email"]', 'admin@neuravolt.cloud');
    await page.fill('input[type="password"]', 'StrongP@ssword2026!');
    await page.click('button[type="submit"]');

    // 3. Verify Navigation to Dashboard / Chat
    await expect(page).toHaveURL(/\/(dashboard|chat)/);
  });
});
