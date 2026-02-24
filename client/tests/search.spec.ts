import { test, expect } from '@playwright/test';

test.describe('Search Page Integration', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    await page.addInitScript(() => {
      window.localStorage.setItem('E2E_TEST', 'true');
    });
  });

  test('should display results when user types query', async ({ page }) => {
    // 1. Intercept API call to mock backend response
    await page.route('**/api/v1/search/**', async route => {
      const url = route.request().url();
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      if (!url.toLowerCase().includes('dune')) {
        await route.continue();
        return;
      }
      console.log('Intercepted:', route.request().method(), url);
      const json = {
        results: [
          {
            title: 'Dune: E2E Test Movie',
            media_type: 'movie',
            external_id: 'e2e-1',
            poster_path: 'https://via.placeholder.com/300',
            source: 'tmdb'
          }
        ],
        total: 1
      };
      await route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json });
    });

    // 2. Go to Search Page
    await page.goto('/search');

    // 3. Type in Search Box
    await page.screenshot({ path: 'search_before_fill.png' });
    const input = page.locator('input[type="text"]');
    await input.fill('Dune');
    await input.press('Enter');

    // 4. Wait for results (StoryCard)
    // We expect the mocked title to appear
    await expect(page.getByText('Dune: E2E Test Movie')).toBeVisible();
    // Source badge is hidden now, so we skip checking it
  });

  test('should show empty state when no results', async ({ page }) => {
    await page.route('**/api/v1/search/**', async route => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      const url = route.request().url();
      if (!url.toLowerCase().includes('nothing')) {
        await route.continue();
        return;
      }
      await route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: { results: [], total: 0 } });
    });

    await page.goto('/search');
    await page.screenshot({ path: 'search_empty_state_before.png' });
    const input = page.locator('input[type="text"]');
    await input.fill('Nothing'); // Update placeholder
    await input.press('Enter');

    await expect(page.getByText(/No matches found/i)).toBeVisible();
  });
});
