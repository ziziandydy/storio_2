import { Page, Route } from '@playwright/test';

/**
 * Injects required local/session storage variables to bypass
 * the Splash Screen, Onboarding Modal, and Supabase Auth loaders.
 */
export async function setupE2EContext(page: Page) {
    await page.addInitScript(() => {
        window.sessionStorage.setItem('hasSeenSplash', 'true');
        window.sessionStorage.setItem('hasSeenOnboarding', 'true');
        window.localStorage.setItem('E2E_TEST', 'true');
    });
}

/**
 * Mocks a standard GET request, automatically injecting CORS headers
 * for OPTIONS preflight and the actual GET response.
 */
export async function mockCorsRoute(
    page: Page,
    urlPattern: string | RegExp,
    responseJson: any,
    status: number = 200
) {
    await page.route(urlPattern, async (route: Route) => {
        if (route.request().method() === 'OPTIONS') {
            await route.fulfill({
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': '*'
                }
            });
            return;
        }

        await route.fulfill({
            status,
            headers: { 'Access-Control-Allow-Origin': '*' },
            json: responseJson,
        });
    });
}

/**
 * Specifically intercepts the /api/v1/search/ endpoint using a wildcard glob,
 * and matches the requested URL query string to return the appropriate mock data.
 */
export async function mockSearchRoutes(
    page: Page,
    mockDataMap: { [queryParamString: string]: any }
) {
    // Catch all requests to the search endpoint
    await page.route('**/api/v1/search/**', async (route: Route) => {
        if (route.request().method() === 'OPTIONS') {
            await route.fulfill({
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': '*'
                }
            });
            return;
        }

        const url = route.request().url().toLowerCase();
        let matched = false;

        // Check if the requested URL contains any of our mapped query strings
        for (const [key, responseJson] of Object.entries(mockDataMap)) {
            if (url.includes(key.toLowerCase())) {
                await route.fulfill({
                    status: 200,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    json: responseJson,
                });
                matched = true;
                break;
            }
        }

        // If no match was found in the map, let the request continue to the real backend (or fail)
        if (!matched) {
            await route.continue();
        }
    });
}
