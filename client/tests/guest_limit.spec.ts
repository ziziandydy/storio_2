import { test, expect } from '@playwright/test';

test('Guest limit is enforced when adding 11th item', async ({ page }) => {
  // Mock Search API
  await page.route('**/api/v1/search/?q=LimitTest', async route => {
    await route.fulfill({
      json: {
        results: [{ 
            title: 'Limit Item', 
            media_type: 'movie', 
            external_id: '999', 
            source: 'tmdb',
            poster_path: '/limit.jpg',
            year: 2024
        }]
      }
    });
  });

  // Mock Collection Check API (Not in collection yet)
  await page.route('**/api/v1/collection/check/999', async route => {
    await route.fulfill({
      json: { exists: false, instances: [] }
    });
  });

  // Mock AI Suggestions
  await page.route('**/api/v1/ai/suggestions', async route => {
    await route.fulfill({
      json: { suggestions: ['Classic', 'Masterpiece'] }
    });
  });

  // Mock Collection Add API to return 403 Forbidden
  await page.route('**/api/v1/collection/', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 403,
        json: { detail: 'Guest limit reached (10 items). Please register to collect more.' }
      });
    }
  });

  await page.goto('/search');
  const input = page.getByPlaceholder(/Search movies/i);
  await input.fill('LimitTest');
  await input.press('Enter');
  
  // Wait for the card to appear
  // Use filter to ensure we get the StoryCard, not other elements with class 'group'
  const card = page.locator('div.group').filter({ hasText: 'Limit Item' }).first();
  await expect(card).toBeVisible({ timeout: 10000 });

  // Hover the card to reveal actions
  await card.hover();

  // Click the Add button
  const addButton = card.getByRole('button', { name: /Add/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click({ force: true });

  // Wait for modal to open (Check for header)
  const modalHeader = page.getByRole('heading', { name: /Add to Storio/i });
  await expect(modalHeader).toBeVisible({ timeout: 15000 });

  // Modal is open, click Save
  // The button text is "Save to Storio"
  const saveButton = page.getByRole('button', { name: /Save to Storio/i });
  await expect(saveButton).toBeVisible({ timeout: 15000 });
  await saveButton.click();

  // Expect Toast with error message
  const toast = page.getByText(/Guest limit/i);
  await expect(toast).toBeVisible({ timeout: 10000 });
});
