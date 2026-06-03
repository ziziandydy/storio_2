## MODIFIED Requirements

### Requirement: Profile Settings Options
The system SHALL display standard settings, community options, and privacy controls in the Profile page, but MUST NOT display features that are currently incomplete (such as Notifications).

#### Scenario: Viewing Settings Section
- **WHEN** the user views the "Settings" section of the Profile page
- **THEN** they see "Language", "Statistics", and "Privacy & Safety".
- **AND** they DO NOT see the "Notifications" toggle.
- **AND** "Privacy & Safety" is an entry point to a sub-view for data management.

#### Scenario: Viewing Account Section
- **WHEN** the user views the "Account & Sync" section of the Profile page
- **THEN** they see the "Cloud Backup" status.

#### Scenario: Viewing Community Section
- **WHEN** the user views the "Community & Support" section
- **THEN** they see "Share Storio", "Rate on App Store", and the new "Contact Us" item.
- **AND** they DO NOT see standalone "Suggest a Feature" or "Report a Bug" items.