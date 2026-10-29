# engagement-events Specification

## Purpose
TBD - created by archiving change add-engagement-events. Update Purpose after archive.
## Requirements
### Requirement: Six engagement event types
The system SHALL record exactly six engagement event types: `open`, `browse`, `detail_view`, `search`, `add_collection`, `share`. Any other event value MUST be rejected.

#### Scenario: Valid event accepted
- **WHEN** a client sends `POST /api/v1/events` with `event` set to `detail_view`
- **THEN** the API responds `204`

#### Scenario: Unknown event rejected
- **WHEN** a client sends `event` set to `purchase`
- **THEN** the API responds `422` and nothing is stored

### Requirement: Daily de-duplication per subject
The system SHALL store at most one row per subject (user or visitor), event, platform and UTC day. Repeated submissions MUST succeed without creating duplicates.

#### Scenario: Same event twice in a day
- **WHEN** the same signed-in user sends `search` twice on the same UTC day from the same platform
- **THEN** both requests respond `204`
- **AND** only one `search` row exists for that user, platform and day

#### Scenario: Next day counted again
- **WHEN** the same user sends `search` on the following UTC day
- **THEN** a second row is stored for the new day

### Requirement: Subject identity resolved by backend
When a request carries a valid Bearer token, the backend SHALL use the token's `user_id` as the subject and ignore any `visitor_id`. When no token is present, the request MUST include a `visitor_id` UUID and MUST only be accepted for `event = open`.

#### Scenario: Signed-in user
- **WHEN** a request has a valid token and a `visitor_id`
- **THEN** the row stores `user_id` from the token and `visitor_id` is null

#### Scenario: No token, open event
- **WHEN** a request has no token, `visitor_id` is a UUID and `event` is `open`
- **THEN** the row stores `visitor_id` and `user_id` is null

#### Scenario: No token, other event
- **WHEN** a request has no token and `event` is `search`
- **THEN** the API rejects it and nothing is stored

### Requirement: Platform derived from Origin
The backend SHALL derive the platform from the request `Origin` header and MUST NOT store a client-supplied platform value: `capacitor://localhost` → `ios`, `https://localhost` → `android`, any other or missing Origin → `web`.

#### Scenario: iOS app request
- **WHEN** a request arrives with `Origin: capacitor://localhost` and body `platform: web`
- **THEN** the stored platform is `ios`

#### Scenario: Missing Origin
- **WHEN** a request has no Origin header
- **THEN** the stored platform is `web`

### Requirement: add_collection recorded server-side
After `POST /api/v1/collection/` successfully adds an item, the backend SHALL record an `add_collection` event for that user with the platform derived from Origin. A failure to record the event MUST NOT affect the collection response.

#### Scenario: Collection added from old app
- **WHEN** an app version without event tracking adds a collection from iOS
- **THEN** an `add_collection` row exists for that user with platform `ios`

#### Scenario: Event write fails
- **WHEN** writing the event raises an error
- **THEN** the collection endpoint still returns the created item with status `200`
- **AND** the error is logged

### Requirement: Client tracking is silent and non-blocking
The client SHALL send events without blocking UI. Network or server failures MUST be ignored silently, with no retries and no user-visible error. The client SHALL skip sending an event it already sent for the same subject on the same UTC day.

#### Scenario: Backend unreachable
- **WHEN** the events request fails
- **THEN** no error is shown and the triggering action completes normally

#### Scenario: Local same-day skip
- **WHEN** `detail_view` was already sent today for the current user
- **THEN** opening another detail page today sends no request

### Requirement: Event triggers
The client SHALL send `open` on app cold start and resume (native) or page load (web), only after auth resolves; `browse` on the first real scroll, wheel or touch on the home or collection page; `detail_view` when a details page loads; `search` when a search request is actually issued (keyword or AI); `share` when a single or monthly recap share completes.

#### Scenario: Open waits for auth
- **WHEN** a first-time real web visitor loads the home page
- **THEN** `open` is sent only after the anonymous account exists, and is attributed to that `user_id`

#### Scenario: Page load alone is not browse
- **WHEN** a user loads the home page and does not scroll, wheel or touch
- **THEN** no `browse` event is sent

#### Scenario: Typing is not searching
- **WHEN** a user types several characters and one debounced search request is issued
- **THEN** exactly one `search` event is sent

### Requirement: Event data minimisation and deletion
Event rows SHALL NOT contain search text, item identifiers, reflection text, raw IP or raw User-Agent. Deleting an account SHALL delete its events; clearing collection data (`DELETE /me/data`) SHALL NOT delete events.

#### Scenario: Account deleted
- **WHEN** a user deletes their account
- **THEN** all `engagement_events` rows with that `user_id` are removed

#### Scenario: Collection cleared
- **WHEN** a user clears their collection data only
- **THEN** their `engagement_events` rows remain

### Requirement: Events endpoint is rate limited
`POST /api/v1/events` SHALL be rate limited per client IP to 60 requests per minute.

#### Scenario: Burst from one IP
- **WHEN** one IP sends 61 requests within a minute
- **THEN** the 61st request responds `429`

