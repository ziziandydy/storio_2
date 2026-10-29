# bot-traffic-guard Specification

## Purpose
TBD - created by archiving change add-engagement-events. Update Purpose after archive.
## Requirements
### Requirement: Web bot detection
On the web platform, the client SHALL classify a visit as a suspected bot when any of the following is true, returning the first matching reason: the path is `/share/render` (`render_service`); `navigator.webdriver === true` (`webdriver`); the User-Agent matches the known crawler pattern list, case-insensitive (`user_agent`). Native app visits SHALL never be classified as bots.

#### Scenario: Googlebot
- **WHEN** a web visit has a User-Agent containing `Googlebot`
- **THEN** it is classified as a bot with reason `user_agent`

#### Scenario: Automated browser
- **WHEN** a web visit has `navigator.webdriver === true` and a normal Chrome User-Agent
- **THEN** it is classified as a bot with reason `webdriver`

#### Scenario: Native app
- **WHEN** the app runs on iOS or Android with any User-Agent
- **THEN** it is not classified as a bot

#### Scenario: Real browser
- **WHEN** a web visit has a normal Safari User-Agent and `navigator.webdriver` is false
- **THEN** it is not classified as a bot

### Requirement: No anonymous account for suspected bots
The auth initialisation SHALL NOT call `signInAnonymously()` for a visit classified as a suspected bot. It SHALL finish with no user and not loading. Real visitors and native apps SHALL keep the existing behaviour of creating an anonymous account when no session exists.

#### Scenario: Crawler visits home page
- **WHEN** a crawler with a bot User-Agent loads the home page with no session
- **THEN** no Supabase anonymous account is created
- **AND** the page finishes loading without errors or an endless spinner
- **AND** the homepage JSON-LD, title and description are present in the HTML

#### Scenario: Real first-time visitor
- **WHEN** a real browser with no session loads any page
- **THEN** an anonymous account is created exactly as before

### Requirement: Suspected bot visits are countable
For a visit classified as a suspected bot (except `/share/render`), the client SHALL send an `open` event with a persistent random `visitor_id` stored in localStorage, `is_suspected_bot = true` and the matching `bot_reason`.

#### Scenario: Crawler open counted
- **WHEN** a crawler with a bot User-Agent loads the home page
- **THEN** one `open` event is stored with a `visitor_id`, `is_suspected_bot = true` and `bot_reason = user_agent`

### Requirement: Real visitor without account still counted
When a real (non-bot) visitor's anonymous sign-in fails, the client SHALL record `open` under a `visitor_id` with `is_suspected_bot = false` rather than dropping it.

#### Scenario: Anonymous sign-in fails
- **WHEN** a real visitor loads the page and `signInAnonymously()` errors
- **THEN** an `open` event is stored with `visitor_id` and `is_suspected_bot = false`

