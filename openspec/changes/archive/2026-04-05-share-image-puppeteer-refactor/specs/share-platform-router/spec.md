## ADDED Requirements

### Requirement: ShareModal generates images via Puppeteer API
The ShareModal SHALL call the Puppeteer screenshot service to generate images for both Mobile Web and iOS Native App, replacing all html-to-image capture logic.

#### Scenario: User taps generate image button
- **WHEN** the user taps the generate button in ShareModal
- **THEN** a `POST /render` request is sent to the Puppeteer service with `{ template, item, settings }`
- **AND** a loading indicator is shown while awaiting the PNG response
- **AND** on success the PNG blob is used for the subsequent share/download action

#### Scenario: Puppeteer service returns error
- **WHEN** the `/render` request fails (network error, 4xx, 5xx, or timeout)
- **THEN** ShareModal displays an error message in Traditional Chinese
- **AND** offers a retry button

### Requirement: Render service warmup on app open
The application SHALL silently ping the Puppeteer service's `/health` endpoint when the app starts, to reduce cold start latency before the user navigates to ShareModal.

#### Scenario: App opens
- **WHEN** the application mounts
- **THEN** a fire-and-forget `GET /health` request is sent to the Render service
- **AND** no error UI is shown if the ping fails (silent warmup only)

### Requirement: ShareModal shows cold start status
ShareModal SHALL display a waiting state if the Puppeteer service is not yet warmed up when the modal opens.

#### Scenario: Service is cold when modal opens
- **WHEN** ShareModal opens
- **AND** `GET /health` returns a non-200 response or times out within 3 seconds
- **THEN** ShareModal shows a "圖片服務準備中..." spinner
- **AND** retries `GET /health` every 3 seconds

#### Scenario: Service becomes ready within timeout
- **WHEN** the service health check returns 200 within 60 seconds
- **THEN** the waiting spinner is replaced by the normal ShareModal UI

#### Scenario: Service not ready after 60 seconds
- **WHEN** 60 seconds have elapsed without a successful health response
- **THEN** ShareModal shows an error state with a "稍後再試" retry button

### Requirement: html-to-image logic is fully removed
All `html-to-image` screenshot logic SHALL be removed from ShareModal, including the hidden capture container, the `handleCapture` function, `waitForAllImages`, and the double capture strategy.

#### Scenario: ShareModal renders without hidden capture container
- **WHEN** ShareModal is opened
- **THEN** no `opacity-0 -z-50` MemoryCardTemplate instance exists in the DOM
- **AND** no `html-to-image` import is present in the component file
