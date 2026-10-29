## ADDED Requirements

### Requirement: Engagement reporting views
Migration `006_engagement_events.sql` SHALL create, idempotently, an `ops` view of daily distinct subjects per platform, event and bot flag, and a view of weekly engagement rate per platform (distinct subjects doing each event ÷ distinct subjects with `open`, non-bot only). Both SHALL be granted SELECT to `looker_ro` only.

#### Scenario: Weekly rate
- **WHEN** in one week 10 non-bot iOS subjects have `open` and 4 of them have `search`
- **THEN** the weekly view shows an iOS `search` rate of 0.4

#### Scenario: Bots excluded from rate
- **WHEN** 50 suspected-bot visitors have `open` on web
- **THEN** they do not change the web engagement rates

#### Scenario: Read-only role
- **WHEN** `looker_ro` queries the new views
- **THEN** it succeeds, and it cannot read `public.engagement_events` directly

### Requirement: Real users metric (loose definition)
The reporting SHALL provide a real-users count for the last 7 and last 30 days: distinct subjects with any non-bot event (including `open` only) or with a collection created in the period.

#### Scenario: Open only counts
- **WHEN** a non-bot user only has an `open` event in the last 7 days
- **THEN** they are counted in the 7-day real-users number

#### Scenario: Suspected bot excluded
- **WHEN** a visitor only has `open` with `is_suspected_bot = true`
- **THEN** they are not counted as a real user

### Requirement: Existing inflated metrics labelled
The existing 004/005 views SHALL remain unchanged; the Looker cards for total users, new signups including anonymous, activation rate and online users SHALL be relabelled to note that pre-fix data includes crawler-created accounts.

#### Scenario: Historical cards kept
- **WHEN** the migration runs
- **THEN** `ops.v_signups_daily`, `ops.v_activation` and `ops.v_activity_summary` are not modified
