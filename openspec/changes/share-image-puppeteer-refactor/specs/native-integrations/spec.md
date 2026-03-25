## MODIFIED Requirements

### Requirement: Capacitor Splash Screen Configuration
The system SHALL configure the native Capacitor Splash Screen to remain visible until explicitly hidden by the application code, rather than auto-hiding after a fixed duration.

#### Scenario: Native App Launch
- **WHEN** the user launches the iOS application
- **THEN** the native splash screen appears and STAYS visible until `SplashScreen.hide()` is called by the React application.
- **AND** it does not automatically disappear after 3 seconds.

## ADDED Requirements

### Requirement: iOS Native App generates share images via Puppeteer service
The iOS Native App SHALL use the Puppeteer screenshot service (not html-to-image) to generate share images, with `isNativePlatform()` determining only the final share action.

#### Scenario: Share image generation on iOS
- **WHEN** the user taps generate in ShareModal on iOS Native App
- **THEN** a `POST /render` request is sent to the Puppeteer service
- **AND** on success the PNG blob is written to the device filesystem via `Capacitor.Filesystem.writeFile()`
- **AND** the native iOS Share Sheet is triggered via `Capacitor.Share.share()`

#### Scenario: Share image generation on Mobile Web
- **WHEN** the user taps generate in ShareModal on Mobile Web (non-native)
- **THEN** a `POST /render` request is sent to the Puppeteer service
- **AND** on success `navigator.share(file)` is called if available
- **AND** if `navigator.share` is not available, the PNG is offered as a download link
