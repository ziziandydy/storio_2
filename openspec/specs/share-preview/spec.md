## MODIFIED Requirements

### Requirement: Share Preview URL Generation
The system SHALL generate correct asset URLs and share links pointing to the newly refactored query parameter paths.

#### Scenario: User shares a memory to Instagram
- **WHEN** the user generates a share image containing a QR Code or embedded link back to the App
- **THEN** the link MUST point to the query parameter structure (if applicable) or the homepage, ensuring it resolves correctly inside the iOS App or on the static web deployment.
