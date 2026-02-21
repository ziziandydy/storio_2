import { test, expect } from '@playwright/test';

test('homepage has correct title and design elements', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Storio/);

  // Close onboarding if it appears
  const closeOnboarding = page.getByRole('button', { name: /Continue as Guest/i });
  if (await closeOnboarding.isVisible()) {
      await closeOnboarding.click();
  }

  // 驗證 Storio 字樣 (Using heading to be specific)
  await expect(page.getByRole('heading', { name: 'Storio', exact: true })).toBeVisible();

  // 驗證 Bento Grid 中的 StoryCards 是否存在 (Check SectionSlider loaded)
  // SectionSlider renders StoryCards. StoryCard has "Add" button.
  // Wait for loading to finish
  // const addButtons = page.locator('button:has-text("Add")');
  // await expect(addButtons.first()).toBeVisible();
});

test('navigation links are present', async ({ page }) => {
  await page.goto('/');
  // Check for Profile link or FAB
  await expect(page.locator('a[href="/profile"]')).toBeVisible();
  await expect(page.locator('a[href="/search"]')).toBeVisible();
});
