## 1. Update Capacitor Configuration

- [x] 1.1 In `client/capacitor.config.ts`, set `launchAutoHide` to `false`.

## 2. Refactor Page Initialization Logic

- [x] 2.1 In `client/src/app/page.tsx`, initialize `showSplash` to `true` by default (or use a `isInitialized` state) to prevent the Home layout from rendering immediately.
- [x] 2.2 Update the `useEffect` in `page.tsx` to read `sessionStorage`. If `hasSeenSplash` is true, set `showSplash` to false and manually call `NativeSplash.hide()`.
- [x] 2.3 Ensure the Home page returns a solid black screen `null` placeholder if initialization is not yet complete.

## 3. Verify Splash Screen Component

- [x] 3.1 Verify `client/src/components/SplashScreen.tsx` calls `NativeSplash.hide()` effectively once it is mounted.