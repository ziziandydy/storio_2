## ADDED Requirements

### Requirement: Engagement reporting views
Migration `006_engagement_events.sql` SHALL create, idempotently, an `ops` view of daily distinct subjects per platform, event and bot flag, and a view of weekly engagement rate per platform (distinct accounts doing each event ÷ distinct accounts with `open` in the same week and platform; only rows with a `user_id` count, because `visitor_id` and the bot flag are client-reported and can be forged). Both SHALL be granted SELECT to `looker_ro` only.

#### Scenario: Weekly rate
- **WHEN** in one week 10 iOS accounts have `open` and 4 of them have `search`
- **THEN** the weekly view shows an iOS `search` rate of 0.4

#### Scenario: Visitors excluded from rate
- **WHEN** 50 visitor rows (no account, bot or not) have `open` on web
- **THEN** they do not change the web engagement rates

#### Scenario: Read-only role
- **WHEN** `looker_ro` queries the new views
- **THEN** it succeeds, and it cannot read `public.engagement_events` directly

### Requirement: Real users metric (loose definition)
The reporting SHALL provide a real-users count for the last 7 and last 30 days: distinct accounts with any event (including `open` only) or with a collection created in the period. Visitor rows (`visitor_id`) are never counted, since they are client-reported and can be forged.

#### Scenario: Open only counts
- **WHEN** an account only has an `open` event in the last 7 days
- **THEN** they are counted in the 7-day real-users number

#### Scenario: Visitor excluded
- **WHEN** a visitor without an account has `open`, whether or not `is_suspected_bot` is true
- **THEN** they are not counted as a real user

### Requirement: Existing inflated metrics labelled
The existing 004/005 views SHALL remain unchanged; the Looker cards for total users, new signups including anonymous, activation rate and online users SHALL be relabelled to note that pre-fix data includes crawler-created accounts.

#### Scenario: Historical cards kept
- **WHEN** the migration runs
- **THEN** `ops.v_signups_daily`, `ops.v_activation` and `ops.v_activity_summary` are not modified
