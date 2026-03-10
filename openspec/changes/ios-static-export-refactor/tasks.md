## 1. Setup & Restructuring

- [x] 1.1 Move `/src/app/details/[type]/[id]/page.tsx` to `/src/app/details/page.tsx`
- [x] 1.2 Move `/src/app/collection/[id]/page.tsx` to `/src/app/collection/item/page.tsx`
- [x] 1.3 Refactor `details/page.tsx` to be a Client Component using `useSearchParams` instead of `params`
- [x] 1.4 Refactor `collection/item/page.tsx` to be a Client Component using `useSearchParams` instead of `params`
- [x] 1.5 Wrap both refactored page components in `<Suspense>` boundaries to satisfy Next.js static export requirements

## 2. Global Navigation Updates

- [x] 2.1 Update `SectionSlider` component links to use query parameters
- [x] 2.2 Update `HeroStats` component links to use query parameters
- [x] 2.3 Update `StoryCard` component links to use query parameters
- [x] 2.4 Update `CalendarView` jumping links to use query parameters
- [x] 2.5 Update `GalleryView` jumping links to use query parameters
- [x] 2.6 Update `ListView` jumping links to use query parameters
- [x] 2.7 Verify and update any remaining `router.push('/details/')` or `router.push('/collection/')` calls across the codebase

## 3. Share & Export Verification

- [x] 3.1 Verify `ShareModal.tsx` URL generation works with query parameters
- [x] 3.2 Verify `MonthlyRecapModal.tsx` URLs and logic are unaffected templates to output the new query string format
## 4. Capacitor Setup & Native Configuration

- [ ] 4.1 Install CocoaPods (`brew install cocoapods`) and run `npx cap add ios`
- [ ] 4.2 Configure CSS variables for iOS Safe Area exclusions (`env(safe-area-inset-top)`) targeting iPhone notch/island
- [ ] 4.3 Configure Capacitor SplashScreen and App Icon using "Storio Gold" aesthetics

## 5. Native API Bridges

- [ ] 5.1 Refactor Web Share API calls in `MemoryCardTemplate` and `MonthlyRecapModal` to use `@capacitor/share`
- [ ] 5.2 Validate iOS sharing behavior invokes the native share sheet correctly

## 6. Apple Sign-in Integration

- [ ] 6.1 Install the `@capacitor-community/apple-sign-in` plugin
- [ ] 6.2 Set up App ID, Services ID, and Keys in Apple Developer Portal, and configure Supabase Auth
- [ ] 6.3 Update the Authentication UI (Onboarding Modal) to support Native Apple Login flow

## 7. Xcode Build & TestFlight Release

- [ ] 7.1 Run `npx cap sync ios` and verify Xcode workspace compilation
- [ ] 7.2 Run end-to-end testing on an iOS Simulator
- [ ] 7.3 Archive and distribute the app to TestFlight via Xcode / App Store Connect
