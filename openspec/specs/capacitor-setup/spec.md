## ADDED Requirements

### Requirement: Capacitor Environment Configuration
The system SHALL be configured with a basic Capacitor iOS project that avoids native UI occlusions.

#### Scenario: iOS App Initialization
- **WHEN** the user opens the fully built iOS application
- **THEN** it must display a "Storio Gold" themed Splash Screen and App Icon.

#### Scenario: Global SafeArea Styling
- **WHEN** the application is rendered on edge-to-edge screens like the iPhone 16 Pro
- **THEN** CSS variables `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` MUST be applied to ensure the UI is not obscured by the Dynamic Island, Notch, or Home Indicator.
