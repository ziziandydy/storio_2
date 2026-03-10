# contact-us-subview Specification

## Purpose
TBD - created by archiving change profile-refactor. Update Purpose after archive.
## Requirements
### Requirement: Unified Contact Sub-view
The system SHALL provide a dedicated full-screen sub-view for the "Contact Us" feature, mirroring the visual style and UX of the "Language" and "Statistics" settings pages.

#### Scenario: Navigating to Contact Us
- **WHEN** the user clicks the "Contact Us" (聯絡我們) item in the profile list
- **THEN** the system slides in a full-screen sub-view containing feedback options and a back button.

### Requirement: Localized Email Generation
The system SHALL allow users to generate predefined emails for feedback by clicking on an option in the Contact Sub-view. The generated email MUST include a localized subject prefix and the user's display name.

#### Scenario: Submitting a Feature Request (Chinese Locale)
- **WHEN** the user has the system language set to 'zh-TW'
- **AND** the user clicks "功能建議" (Feature Request)
- **THEN** the system executes `mailto:andismtu@gmail.com?subject=[Storio 功能建議] from {UserDisplayName}`.

#### Scenario: Submitting a Bug Report (English Locale)
- **WHEN** the user has the system language set to 'en-US'
- **AND** the user clicks "Report a Bug"
- **THEN** the system executes `mailto:andismtu@gmail.com?subject=[Storio Bug Report] from {UserDisplayName}`.

