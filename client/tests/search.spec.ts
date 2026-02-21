import { test, expect } from '@playwright/test';

test.describe('Search Page Integration', () => {
  
  test('should display results when user types query', async ({ page }) => {
    // 1. Intercept API call to mock backend response
    await page.route('**/api/v1/search/?q=Dune', async route => {
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
      await route.fulfill({ json });
    });

    // 2. Go to Search Page
    await page.goto('/search');

    // 3. Type in Search Box
    const input = page.getByPlaceholder(/Find a movie/i);
    await input.fill('Dune');

    // 4. Wait for results (StoryCard)
    // We expect the mocked title to appear
    await expect(page.getByText('Dune: E2E Test Movie')).toBeVisible();
    // Source badge is hidden now, so we skip checking it
  });

  test('should show empty state when no results', async ({ page }) => {
    await page.route('**/api/v1/search/?q=Nothing', async route => {
      await route.fulfill({ json: { results: [], total: 0 } });
    });

    await page.goto('/search');
    await page.getByPlaceholder(/Find a movie/i).fill('Nothing'); // Update placeholder

    await expect(page.getByText(/No .* entries found/i)).toBeVisible();
  });
});
