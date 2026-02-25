import { test, expect } from '@playwright/test';
import { getTitleKeyByCount } from '../src/utils/leveling';

test.describe('Unit: Leveling Utility', () => {
    test('returns passerby for anonymous users regardless of count', () => {
        expect(getTitleKeyByCount(100, true)).toBe('passerby');
        expect(getTitleKeyByCount(0, true)).toBe('passerby');
    });

    test('returns correct title for registered users based on count', () => {
        expect(getTitleKeyByCount(0, false)).toBe('apprentice');
        expect(getTitleKeyByCount(9, false)).toBe('apprentice');
        expect(getTitleKeyByCount(10, false)).toBe('keeper');
        expect(getTitleKeyByCount(49, false)).toBe('keeper');
        expect(getTitleKeyByCount(50, false)).toBe('master');
        expect(getTitleKeyByCount(99, false)).toBe('master');
        expect(getTitleKeyByCount(100, false)).toBe('grandMaster');
    });
});

test.describe('Integration: Leveling UI Rendering', () => {
    test('Profile page handles default translation title (Passerby for guests)', async ({ page }) => {
        await page.goto('/profile');

        // Based on page.tsx implementation, it displays t.profile.titles[levelKey] which is 'Passerby' in EN
        const titleLocator = page.locator('p.tracking-widest.uppercase').filter({ hasText: /Passerby|路人甲/i }).first();

        // Check if the title is rendered
        await expect(titleLocator).toBeVisible({ timeout: 10000 });
    });
});
