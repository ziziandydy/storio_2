# splash-screen Specification

## Purpose
TBD - created by archiving change fix-splash-screen-flicker. Update Purpose after archive.
## Requirements
### Requirement: Web Splash Screen Initialization
The web application MUST NOT render the main Home page content until it has determined whether the Web Splash Screen should be shown or skipped. If it should be shown, the Web Splash Screen MUST cover the viewport before the Native Splash Screen is hidden.

#### Scenario: First Session Launch (Show Splash)
- **WHEN** the user launches the app for the first time in a session
- **THEN** the application prevents the Home page content from rendering.
- **AND** it immediately renders the `<SplashScreen />` component.
- **AND** the `<SplashScreen />` component calls `NativeSplash.hide()` once it is mounted and visible.

#### Scenario: Subsequent Launch in Same Session (Skip Splash)
- **WHEN** the user navigates back to the Home page or reloads within the same session where `hasSeenSplash` is true
- **THEN** the application skips the `<SplashScreen />`.
- **AND** it calls `NativeSplash.hide()` (if running natively) immediately before rendering the Home page content.

