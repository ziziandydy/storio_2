## ADDED Requirements

### Requirement: Native Apple Sign-in
The system SHALL allow users to authenticate securely using Apple Sign-in via the native iOS authorization dialog.

#### Scenario: User signs in with Apple on iOS
- **WHEN** the user taps "Sign in with Apple" on the authentication modal in the iOS App
- **THEN** the system MUST use the `@capacitor-community/apple-sign-in` plugin to obtain an Apple identity token, verify it with Supabase Auth, and successfully establish a session without opening an external web browser.
