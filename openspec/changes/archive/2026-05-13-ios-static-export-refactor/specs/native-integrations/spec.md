## ADDED Requirements

### Requirement: Native Share API Bridging
The system SHALL utilize native sharing functionalities when operating within the iOS Capacitor environment.

#### Scenario: User clicks Share inside the Native App
- **WHEN** the user is in the Capacitor iOS App environment and triggers a share action (e.g., from `MemoryCardTemplate` or `MonthlyRecapModal`)
- **THEN** the app MUST use the `@capacitor/share` plugin to invoke the native iOS Share Sheet instead of relying on the browser's `navigator.share` API.
