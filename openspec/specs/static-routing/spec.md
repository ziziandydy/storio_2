## ADDED Requirements

### Requirement: Statically Exportable Details Route
The system SHALL provide a single static `/details` route that determines which movie/book to display via `type` and `id` query parameters.

#### Scenario: Navigating to a media entity details
- **WHEN** the user visits `/details?type=movie&id=123`
- **THEN** the Details Page client component parses the URL, fetches movie ID 123 from the API, and renders the content without throwing 404 or requiring server-side dynamic routing.

### Requirement: Statically Exportable Collection Route
The system SHALL provide a static `/collection/item` route for individual folio items, driven by an `id` query parameter.

#### Scenario: Navigating to a saved folio item
- **WHEN** the user visits `/collection/item?id=uuid-1234`
- **THEN** the Collection Item Page parses the `id` from the search parameters, fetching the specific Storio item data from the database.
