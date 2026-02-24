import { test, expect } from '@playwright/test';
import { setupE2EContext } from './utils';

test.describe('Home Page Flow', () => {

  test('homepage has correct title and design elements', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Storio/);

    // Close onboarding if it appears
    const closeOnboarding = page.getByRole('button', { name: /Continue as Guest/i });
    if (await closeOnboarding.isVisible()) {
      await closeOnboarding.click();
    }

    // Verify Storio text exists on the page
    const heading = page.getByRole('heading', { name: 'Storio', exact: true });
    await expect(heading).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    // Inject the robust setup to bypass splash screen and set standard fake Auth
    await setupE2EContext(page);
    await page.goto('/');

    // Ensure the page fully loaded and bypassed splash
    await expect(page.locator('h1').filter({ hasText: 'Storio' })).toBeVisible({ timeout: 10000 });

    // The NavigationFAB has a generic icon, we look for the button in the bottom right context
    const fabButton = page.locator('div.fixed.bottom-8.right-6 > button');
    await expect(fabButton).toBeVisible({ timeout: 10000 });
    await fabButton.click();

    // Check for Profile link - it's in the header (usually top right), always visible
    await expect(page.locator('a[href="/profile"]')).toBeVisible({ timeout: 10000 });

    // Search and Collection are in the FAB menu, which is now open
    await expect(page.locator('a[href="/search"]').first()).toBeVisible();
    await expect(page.locator('a[href="/collection"]').first()).toBeVisible();
  });
});
