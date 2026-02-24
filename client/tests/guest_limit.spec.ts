import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('E2E_TEST', 'true');
  });
});


test('Guest limit is enforced when adding 11th item', async ({ page }) => {
  // Mock Search API
  await page.route(/\/api\/v1\/search\/.*LimitTest/i, async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
      return;
    }
    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
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
  await page.screenshot({ path: 'guest_limit_before_fill.png' });
  const input = page.locator('input[type="text"]');
  await input.fill('LimitTest');
  await input.press('Enter');

  // Wait for the card to appear
  // Use filter to ensure we get the StoryCard, not other elements with class 'group'
  const card = page.locator('div.group').filter({ hasText: 'Limit Item' }).first();
  await expect(card).toBeVisible({ timeout: 10000 });

  // Hover the card to reveal actions
  await card.hover();

  // Click the Add button
  const addButton = card.locator('button').filter({ hasText: /(Add|加入)/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click({ force: true });

  // Wait for modal to open (Check for header)
  const modalHeader = page.locator('h2').filter({ hasText: /(Add to Storio|加入 Storio)/i });
  await expect(modalHeader).toBeVisible({ timeout: 15000 });

  // Modal is open, click Save
  const saveButton = page.locator('button').filter({ hasText: /(Save|儲存)/i });
  await expect(saveButton).toBeVisible({ timeout: 15000 });
  await saveButton.click();

  // Expect GuestLimitModal to render with Capacity Reached message
  const limitMessage = page.getByText(/(Capacity Reached|Guest curators can store)/i);
  await expect(limitMessage.first()).toBeVisible({ timeout: 15000 });
});
