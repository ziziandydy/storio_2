import { test, expect } from '@playwright/test';

test('Guest can search and see results', async ({ page }) => {
  // Mock Search API
  await page.route('**/api/v1/search/?q=Dune', async route => {
    await route.fulfill({
      json: {
        results: [
          {
            title: 'Dune',
            media_type: 'movie',
            external_id: '123',
            source: 'tmdb',
            poster_path: '/dune.jpg',
            year: 2021
          }
        ],
        total: 1
      }
    });
  });

  // 1. Go to homepage and bypass splash/onboarding
  await page.goto('/');
  await page.evaluate(() => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    sessionStorage.setItem('hasSeenOnboarding', 'true');
  });
  await page.reload();

  await expect(page).toHaveTitle(/Storio/);

  // 2. Click Search (via FAB)
  const fabButton = page.locator('div.fixed.bottom-8.right-6 button');
  await expect(fabButton).toBeVisible();
  await fabButton.click();
  
  // Wait for the search link to be visible in the menu
  const searchLink = page.locator('a[href="/search"]');
  await expect(searchLink).toBeVisible({ timeout: 10000 });
  await searchLink.click();
  await expect(page).toHaveURL(/.*search/);

  // 3. Type "Dune" and Search
  const input = page.getByPlaceholder(/Search movies/i);
  await input.fill('Dune');
  await input.press('Enter');

  // 4. Wait for results
  const cards = page.locator('div.group'); 
  await expect(cards.first()).toBeVisible({ timeout: 10000 });

  // 5. Check if at least one result has a title
  await expect(page.locator('h3').first()).not.toBeEmpty();
});

test('Guest can add item to collection (Mock Flow)', async ({ page }) => {
  // Mock Search API
  await page.route('**/api/v1/search/?q=Matrix', async route => {
    await route.fulfill({
      json: {
        results: [
          {
            title: 'The Matrix',
            media_type: 'movie',
            external_id: '456',
            source: 'tmdb',
            poster_path: '/matrix.jpg',
            year: 1999
          }
        ],
        total: 1
      }
    });
  });

  // Mock Collection Add API
  await page.route('**/api/v1/collection/', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
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

  await page.goto('/');
  await page.evaluate(() => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    sessionStorage.setItem('hasSeenOnboarding', 'true');
  });
  await page.goto('/search');
  
  const input = page.getByPlaceholder(/Search movies/i);
  await input.fill('Matrix');
  await input.press('Enter');
  
  const cards = page.locator('div.group');
  await expect(cards.first()).toBeVisible({ timeout: 10000 });

  // Mock the alert
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('Successfully added');
    await dialog.accept();
  });

  // Click the card to reveal the overlay (Mobile/Touch behavior simulation)
  await cards.first().click();

  // Wait for the overlay button to become visible and clickable
  const addButton = page.locator('button:has-text("Add")').first();
  await expect(addButton).toBeVisible();
  await addButton.click({ force: true });
});