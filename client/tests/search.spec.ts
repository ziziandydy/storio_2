import { test, expect } from '@playwright/test';
import { setupE2EContext } from './utils';

test.describe('Search Page Integration', () => {

  test.beforeEach(async ({ page }) => {
    await setupE2EContext(page);
  });

  test('should display results when user types query', async ({ page }) => {
    // 1. Intercept API call using wildcard
    await page.route('**/api/v1/search/**', async (route) => {
      const url = route.request().url().toLowerCase();

      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }

      if (!url.includes('dune')) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        json: {
          results: [{
            title: 'Dune: E2E Test Movie',
            media_type: 'movie',
            external_id: 'e2e-1',
            poster_path: '/placeholder.jpg',
            source: 'tmdb'
          }],
          total: 1
        }
      });
    });

    // 2. Go to Search Page
    await page.goto('/search');

    // 3. Type in Search Box
    const input = page.locator('input[type="text"]');
    await input.fill('Dune');
    await input.press('Enter');

    // 4. Wait for results
    // We expect the mocked title to appear in the StoryCard heading (h3)
    const resultTitle = page.locator('h3', { hasText: /Dune: E2E Test Movie/i });
    await expect(resultTitle).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no results', async ({ page }) => {
    await page.route('**/api/v1/search/**', async (route) => {
      const url = route.request().url().toLowerCase();

      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }

      if (!url.includes('nothing')) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        json: { results: [], total: 0 }
      });
    });

    await page.goto('/search');

    const input = page.locator('input[type="text"]');
    await input.fill('Nothing');
    await input.press('Enter');

    // Identifying the empty state text across different locales or generic message
    const emptyStateText = page.locator('p', { hasText: /(No results found|找不到相關結果)/i });
    await expect(emptyStateText).toBeVisible({ timeout: 10000 });
  });
});
