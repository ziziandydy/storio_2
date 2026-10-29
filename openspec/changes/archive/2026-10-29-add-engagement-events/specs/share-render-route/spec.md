## ADDED Requirements

### Requirement: Share render route creates no accounts or events
The `/share/render` page, which is loaded only by the Puppeteer share-image service, SHALL NOT create a Supabase anonymous account and SHALL NOT send any engagement event.

#### Scenario: Puppeteer renders a share image
- **WHEN** the Puppeteer service loads `/share/render` in a fresh headless browser and renders a template
- **THEN** no anonymous account is created
- **AND** no request is sent to `/api/v1/events`
- **AND** the rendered image is unchanged
