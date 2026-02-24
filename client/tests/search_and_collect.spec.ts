import { test, expect } from '@playwright/test';
import { setupE2EContext } from './utils';

test.describe('Search and Collect Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupE2EContext(page);
  });

  test('Guest can search and see results', async ({ page }) => {
    // 1. Glob-based Mock for Search API
    await page.route('**/api/v1/search/**', async (route) => {
      const url = route.request().url().toLowerCase();
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      if (url.includes('dune')) {
        await route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: {
            results: [{
              title: 'Dune',
              media_type: 'movie',
              external_id: '123',
              source: 'tmdb',
              poster_path: '/dune.jpg',
              year: 2021
            }],
            total: 1
          }
        });
      } else {
        await route.continue();
      }
    });

    // 2. Go to homepage with bypassed context
    await page.goto('/');

    // 3. Click Search (via FAB)
    const fabButton = page.locator('div.fixed.bottom-8.right-6 > button');
    await expect(fabButton).toBeVisible();
    await fabButton.click({ force: true });

    const searchLink = page.locator('a[href="/search"]');
    await expect(searchLink).toBeVisible({ timeout: 10000 });
    await searchLink.click();
    await expect(page).toHaveURL(/.*search/);

    // 4. Type "Dune" and Search
    const input = page.locator('input[type="text"]');
    await input.fill('Dune');
    await input.press('Enter');

    // 5. Wait for results
    const cards = page.locator('div.group');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Check if at least one result has a title
    await expect(page.locator('h3').first()).not.toBeEmpty();
  });

  test('Guest can add item to collection (Mock Flow)', async ({ page }) => {
    // Mock Search API
    await page.route('**/api/v1/search/**', async (route) => {
      const url = route.request().url().toLowerCase();
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      if (url.includes('matrix')) {
        await route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: {
            results: [{
              title: 'The Matrix',
              media_type: 'movie',
              external_id: '456',
              source: 'tmdb',
              poster_path: '/matrix.jpg',
              year: 1999
            }],
            total: 1
          }
        });
      } else {
        await route.continue();
      }
    });

    // Mock Collection Add API
    await page.route('**/api/v1/collection/**', async route => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: {
            id: 'uuid-1',
            title: 'The Matrix',
            media_type: 'movie'
          }
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/search');

    const input = page.locator('input[type="text"]');
    await input.fill('Matrix');
    await input.press('Enter');

    const cards = page.locator('div.group');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Hover or Click the card to reveal the overlay/details
    await cards.first().hover({ force: true });

    // The Add button is inside the card
    const addButton = cards.first().locator('button').filter({ hasText: /(Add|加入)/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click({ force: true });

    // Wait for modal to open
    const modalHeader = page.locator('h2').filter({ hasText: /(Add to Storio|加入 Storio)/i });
    await expect(modalHeader).toBeVisible({ timeout: 10000 });

    // Modal is open, click Save/Add
    const saveButton = page.locator('.fixed.inset-0 button').filter({ hasText: /(Save|儲存|Add|加入)/i }).last();
    await expect(saveButton).toBeVisible({ timeout: 10000 });

    // Catch the success
    await saveButton.click();
  });
});