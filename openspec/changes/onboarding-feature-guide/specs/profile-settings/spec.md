## MODIFIED Requirements

### Requirement: Profile Settings Options
The system SHALL display standard settings and community options in the Profile page, but MUST NOT display features that are currently incomplete (such as Notifications and Security & Privacy).
The system SHALL also display a "重新觀看引導 / View Onboarding" option that allows the user to replay the feature guide at any time.

#### Scenario: Viewing Account Section
- **WHEN** the user views the "Account & Sync" section of the Profile page
- **THEN** they see the "Cloud Backup" status.
- **AND** they DO NOT see the "Security & Privacy" item.

#### Scenario: Viewing Settings Section
- **WHEN** the user views the "Settings" section of the Profile page
- **THEN** they see "Language" and "Statistics".
- **AND** they DO NOT see the "Notifications" toggle.

#### Scenario: Viewing Community Section
- **WHEN** the user views the "Community & Support" section
- **THEN** they see "Share Storio", "Rate on App Store", and the "Contact Us" item.
- **AND** they DO NOT see standalone "Suggest a Feature" or "Report a Bug" items.

#### Scenario: Replaying Onboarding from Profile
- **WHEN** the user taps "重新觀看引導 / View Onboarding" in the Profile page
- **THEN** the system displays the `OnboardingGuideModal`
- **AND** upon closing, `storio_onboarding_seen` remains `true` in `localStorage`
