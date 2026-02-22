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
  await page.evaluate(() => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    sessionStorage.setItem('hasSeenOnboarding', 'true');
  });
  await page.reload(); // Reload to apply storage changes
  
  // Click FAB to open menu
  // The FAB button usually has a Plus icon initially
  const fabButton = page.locator('button').filter({ has: page.locator('svg') }).last(); 
  // A better selector would be based on class or aria-label if available, but let's try finding the main FAB button
  // In NavigationFAB.tsx, the button is: <button onClick={() => setIsOpen(!isOpen)} ... >
  
  // Wait for FAB to be visible
  await expect(fabButton).toBeVisible();
  await fabButton.click();

  // Check for Profile link or FAB menu items
  // Profile is in the header, always visible
  await expect(page.locator('a[href="/profile"]')).toBeVisible();
  
  // Search and Collection are in the FAB menu
  await expect(page.locator('a[href="/search"]')).toBeVisible();
  await expect(page.locator('a[href="/collection"]').last()).toBeVisible();
});
