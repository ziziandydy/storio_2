import { test, expect } from '@playwright/test';


test.describe.skip('Monthly Sharing Flow', () => {
    // Use a user ID that we assume exists or the test e2e user
    const USER_ID = 'e2e-user';

    test.beforeEach(async ({ page, context }) => {
        // Top-Level Mock for E2E
        await page.addInitScript(() => {
            window.localStorage.setItem('E2E_TEST', 'true');
        });

        // Auth bypass inside tests (simplified for demonstration)
        await page.goto('/collection');
    });

    // Basic Integration Test to ensure the button is visible and clicking it opens the modal
    test('Share button opens MonthlyRecapModal', async ({ page }) => {

        // Pre-requisites: We need to make sure the user has items so that a Month label appears
        // Alternatively, wait until any share button exists (e.g. "FEB 2026")

        // We will just wait for the calendar grid to load. If it's empty, we might not see the share button.
        // Assuming our test user has memories, or the UI is rendering them.
        // For pure UI rendering test without db seeded:
        // We can intercept the API and mock an item!
        await page.route('**/api/v1/collection/', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'fake-id',
                        title: 'Fake Movie',
                        media_type: 'movie',
                        poster_path: '/fake-image.jpg',
                        created_at: '2026-02-15T10:00:00Z',
                        user_id: USER_ID
                    }
                ])
            });
        });

        // We also intercept the monthly stats API to return a mock response
        await page.route('**/api/v1/collection/stats/monthly*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    summary: { movie: 1, tv: 0, book: 0 },
                    items: [
                        {
                            id: 'fake-id',
                            title: 'Fake Movie',
                            media_type: 'movie',
                            poster_path: '/fake-image.jpg',
                            created_at: '2026-02-15T10:00:00Z'
                        }
                    ]
                })
            });
        });

        await page.goto('/collection');

        // Look for the share button next to a month header (e.g. FEB 2026)
        // The share button has a lucide-react Share2 icon, it's inside the MonthGrid header
        // We can target the button with className "p-2 rounded-full text-accent-gold"
        const shareButton = page.locator('button:has(.lucide-share2)').first();

        await expect(shareButton).toBeVisible();
        await shareButton.click();

        // Verify the Modal is open by checking for "Visual Style" translation or the actual template
        await expect(page.locator('text=Visual Style').first()).toBeVisible({ timeout: 5000 });

        // Verify one of the templates "Calendar" is a button
        await expect(page.getByRole('button', { name: /Calendar|行事曆/i })).toBeVisible();

        // Click Collage template
        await page.getByRole('button', { name: /Collage|海報牆/i }).click();

        // Ensure the Share/Download buttons are present
        const downloadButton = page.locator('button:has(.lucide-download)');
        await expect(downloadButton).toBeVisible();

        // Close the modal
        const closeBtn = page.locator('button:has(.lucide-x)');
        await closeBtn.click();

        // Should be closed
        await expect(page.locator('text=Visual Style').first()).not.toBeVisible();
    });
});
