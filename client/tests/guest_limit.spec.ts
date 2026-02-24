import { test, expect } from '@playwright/test';
import { setupE2EContext } from './utils';

test.describe('Guest Limit Enforcement', () => {

  test.beforeEach(async ({ page }) => {
    await setupE2EContext(page);
  });

  test('Guest limit is enforced when adding 11th item', async ({ page }) => {
    // 1. Mock Search API
    await page.route('**/api/v1/search/**', async (route) => {
      const url = route.request().url().toLowerCase();
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      if (url.includes('limittest')) {
        await route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: {
            results: [{
              title: 'Limit Item',
              media_type: 'movie',
              external_id: '999',
              source: 'tmdb',
              poster_path: '/limit.jpg',
              year: 2024
            }],
            total: 1
          }
        });
      } else {
        await route.continue();
      }
    });

    // 2. Mock Collection Check API (Not in collection yet)
    await page.route('**/api/v1/collection/check/999', async route => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        json: { exists: false, instances: [] }
      });
    });

    // 3. Mock AI Suggestions
    await page.route('**/api/v1/ai/suggestions/**', async route => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        json: { suggestions: ['Classic', 'Masterpiece'] }
      });
    });

    // 4. Mock Collection Add API to return 403 Forbidden
    await page.route('**/api/v1/collection/', async route => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: { detail: 'Guest limit reached (10 items). Please register to collect more.' }
        });
      }
    });

    // Start Flow
    await page.goto('/search');

    const input = page.locator('input[type="text"]');
    await input.fill('LimitTest');
    await input.press('Enter');

    // Wait for the card to appear
    const card = page.locator('div.group').filter({ hasText: 'Limit Item' }).first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Hover the card to reveal actions
    await card.hover();

    // Click the Add button
    const cardAddButton = card.locator('button').filter({ hasText: /(Add|加入)/i }).first();
    await expect(cardAddButton).toBeVisible({ timeout: 10000 });
    await cardAddButton.click({ force: true });

    // Wait for modal to open
    const modalHeader = page.locator('h2').filter({ hasText: /(Add to Storio|加入 Storio)/i });
    await expect(modalHeader).toBeVisible({ timeout: 15000 });

    // Modal is open, click Save/Add inside the Modal
    const saveButton = page.locator('.fixed.inset-0 button').filter({ hasText: /(Save|儲存|Add|加入)/i }).last();
    await expect(saveButton).toBeVisible({ timeout: 15000 });
    await saveButton.click();

    // Expect GuestLimitModal to render with Capacity Reached message
    const limitMessage = page.locator('text=/(Capacity Reached|Guest curators can store|Guest limit reached)/i');
    await expect(limitMessage.first()).toBeVisible({ timeout: 15000 });
  });
});
