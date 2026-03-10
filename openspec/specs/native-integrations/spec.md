# native-integrations Specification

## Purpose
TBD - created by archiving change fix-splash-screen-flicker. Update Purpose after archive.
## Requirements
### Requirement: Capacitor Splash Screen Configuration
The system SHALL configure the native Capacitor Splash Screen to remain visible until explicitly hidden by the application code, rather than auto-hiding after a fixed duration.

#### Scenario: Native App Launch
- **WHEN** the user launches the iOS application
- **THEN** the native splash screen appears and STAYS visible until `SplashScreen.hide()` is called by the React application.
- **AND** it does not automatically disappear after 3 seconds.

