## MODIFIED Requirements

### Requirement: Cross-Component Navigation Using Query Params
The system SHALL ensure all card clicks and "View Details" actions navigate using query parameters instead of path-based dynamic routes.

#### Scenario: User clicks a StoryCard in Gallery View
- **WHEN** the user explores their Folio and clicks on a specific book or movie in the Gallery or List View
- **THEN** the application routes them to `/collection/item?id=[UUID]` instead of `/collection/[UUID]`.

#### Scenario: User clicks an item in the Search Carousel
- **WHEN** the user finds an item through the search or home page sections
- **THEN** the application routes them to `/details?type=[media_type]&id=[external_id]` instead of `/details/[media_type]/[external_id]`.
