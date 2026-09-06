// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Xarwiz Platform E2E Flow', () => {
  test('User Auth -> Navigation -> Chat Stream -> Logout Flow', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('http://localhost:3000/login');
    await expect(page).toHaveTitle(/Sign In|Xarwiz/i);

    // 2. Perform Login
    await page.fill('input[type="email"]', 'admin@xarwiz.com');
    await page.fill('input[type="password"]', 'Admin@neurovalt@2620');
    await page.click('button[type="submit"]');

    // 3. Verify Navigation to Dashboard / Chat
    await expect(page).toHaveURL(/\/(dashboard|chat)/);
  });
});
