## Context

When launching the Storio application (whether as an iOS Native App via Capacitor, a standard Web App, or a PWA on mobile), users observe a jarring visual glitch: the app briefly flashes the fully rendered Home page content before the `SplashScreen` component (video intro) kicks in.

This happens due to the lifecycle of React hydration:
1. (Native only) Capacitor's native splash screen might hide before React is ready if set to auto-hide.
2. (All platforms) Next.js static HTML is served and painted by the browser immediately.
3. React hydrates the page. In `client/src/app/page.tsx`, the `showSplash` state was previously initialized to `false` and only set to `true` inside a `useEffect` after checking `sessionStorage`.
4. Because `useEffect` runs *after* the initial browser paint, the very first frame(s) show the Home page content without the Splash Screen overlay.
5. This results in a "Flash of Unstyled/Home Content" before the intro animation starts.

## Goals / Non-Goals

**Goals:**
- Eliminate the initial flash of Home content across all platforms (iOS, Web, PWA).
- Create a perfectly seamless transition from the initial load (native splash or browser blank) to the React-based intro animation.
- Ensure the fix works within Next.js static export constraints.

**Non-Goals:**
- Rebuilding the splash animation natively. We want to keep using the existing `/video/splash.mp4` web implementation, but just hide the "seams".

## Decisions

**Decision 1: Disable Native Splash Auto-Hide**
- *Alternative:* Try to sync the timings perfectly.
- *Rationale:* Timing-based solutions are brittle across different devices. By setting `launchAutoHide: false` in `capacitor.config.ts`, the native iOS splash screen will remain persistently on screen, completely covering the Webview while it loads, parses JS, and hydrates React. We will explicitly call `SplashScreen.hide()` from the web side only when our custom React `SplashScreen` is fully mounted and ready to take over.

**Decision 2: Change Default State to `true` and Block Render**
- *Alternative:* Continue initializing `showSplash: false` and rely purely on the native splash.
- *Rationale:* Even with native splash covering the load, initializing `showSplash` to `true` (or `null`/`loading`) is safer. To prevent SSR/SSG hydration mismatches (where the server renders `false` but the client wants `true`), we will initialize a state `hasDeterminedSplash` to `false`. Until `useEffect` determines whether to show the splash or not, the main page content will be hidden (e.g., returning `null` or a black placeholder), ensuring no flash occurs regardless of the environment.

## Risks / Trade-offs

- **[Risk] App gets stuck on Native Splash:** If the React code fails to execute or crashes before calling `NativeSplash.hide()`, the user will be stuck on the native splash screen forever.
  - *Mitigation:* Ensure `NativeSplash.hide()` is called robustly. As a fallback, Capacitor provides a timeout mechanism internally, but we must ensure our `useEffect` in `SplashScreen` (or `page.tsx`) doesn't have breaking dependencies.