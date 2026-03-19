## ADDED Requirements

### Requirement: User Account Deletion Workflow
The system MUST provide a reliable and secure way for authenticated users to permanently delete their account and all associated data.

#### Scenario: User initiates account deletion
- **WHEN** the user selects "Delete Account" from the Privacy & Safety menu
- **THEN** the system MUST display a confirmation modal explaining the destructive and irreversible nature of the action.

#### Scenario: User confirms account deletion with correct phrase
- **WHEN** the user is presented with the deletion confirmation modal
- **AND** the user types exactly "DELETE ACCOUNT" (case-insensitive acceptable) into the input field
- **AND** the user clicks the confirmation button
- **THEN** the system MUST call the backend API to initiate the deletion process.
- **AND** upon success, log the user out, clear local session data, and redirect to the landing page.

#### Scenario: User attempts to confirm account deletion with incorrect phrase
- **WHEN** the user is presented with the deletion confirmation modal
- **AND** the user types an incorrect phrase (e.g., "delete" or "remove")
- **THEN** the system MUST keep the confirmation button disabled or show a validation error preventing the API call.

### Requirement: User Data Clearing Workflow
The system MUST allow users to reset their collection (clear all items and stories) while retaining their core account and profile settings.

#### Scenario: User initiates data clearing
- **WHEN** the user selects "Clear Data" from the Privacy & Safety menu
- **THEN** the system MUST display a confirmation modal explaining that all collection items will be permanently removed.

#### Scenario: User confirms data clearing with correct phrase
- **WHEN** the user is presented with the clear data confirmation modal
- **AND** the user types exactly "CLEAR DATA" (case-insensitive acceptable) into the input field
- **AND** the user clicks the confirmation button
- **THEN** the system MUST call the backend API to delete all collections and stories associated with the user.
- **AND** upon success, display a success toast/notification and refresh the current view state without logging the user out.

### Requirement: Backend API for Account Deletion
The backend MUST provide an endpoint (`DELETE /api/v1/users/me`) that securely removes the authenticated user's account from the identity provider (Supabase Auth) and ensures all related relational data (profiles, collections, stories) is cascade-deleted or manually cleaned up.

#### Scenario: Valid deletion request
- **WHEN** a valid DELETE request is sent with a valid Bearer token
- **THEN** the backend MUST remove the user from Supabase Auth.
- **AND** MUST return a 200 or 204 status code indicating success.

#### Scenario: Unauthorized deletion request
- **WHEN** a DELETE request is sent without a valid token or for an invalid user
- **THEN** the backend MUST return a 401 or 403 error.

### Requirement: Backend API for Data Clearing
The backend MUST provide an endpoint (`DELETE /api/v1/users/me/data`) that securely deletes only the authenticated user's collection items and stories, leaving the identity and profile intact.

#### Scenario: Valid clear data request
- **WHEN** a valid DELETE request is sent with a valid Bearer token
- **THEN** the backend MUST execute deletion on `collections` and `stories` tables for that specific `user_id`.
- **AND** MUST return a 200 or 204 status code indicating success.