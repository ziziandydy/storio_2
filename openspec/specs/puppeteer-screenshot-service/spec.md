## ADDED Requirements

### Requirement: Puppeteer screenshot service accepts render requests
The service SHALL expose a `POST /render` HTTP endpoint that accepts a JSON payload containing template type and rendering data, drives a headless Chromium browser to render the `/share/render` route, and returns a PNG image buffer.

#### Scenario: Successful screenshot
- **WHEN** a client POSTs `{ template, item, settings }` to `/render`
- **THEN** the service navigates Puppeteer to `https://storio.andismtu.com/share/render`
- **AND** injects the payload via `page.evaluate(() => { window.__RENDER_DATA__ = data })`
- **AND** waits for `window.__RENDER_READY__ === true` (timeout: 30s)
- **AND** takes a screenshot and returns the PNG buffer with `Content-Type: image/png`

#### Scenario: Render timeout
- **WHEN** `window.__RENDER_READY__` is not set within 30 seconds
- **THEN** the service returns HTTP 504 with `{ error: "render_timeout" }`

#### Scenario: Invalid payload
- **WHEN** the POST body is missing required fields (template, item)
- **THEN** the service returns HTTP 400 with `{ error: "invalid_payload", details: "..." }`

### Requirement: Puppeteer service exposes health endpoint
The service SHALL expose a `GET /health` endpoint that returns immediately with the service status.

#### Scenario: Health check
- **WHEN** a client sends `GET /health`
- **THEN** the service returns HTTP 200 with `{ status: "ok", uptime: <seconds> }`

### Requirement: Puppeteer launches Chromium with memory-optimized flags
The service SHALL launch Chromium with flags required for stable operation in a container environment with 512MB RAM.

#### Scenario: Chromium startup
- **WHEN** the service initializes
- **THEN** Chromium is launched with `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`, `--single-process`, `--no-zygote`
- **AND** RAM usage MUST remain below 400MB under normal load (single render request)

### Requirement: Puppeteer reuses browser instance across requests
The service SHALL maintain a single Chromium browser instance and reuse it across render requests to reduce latency and memory overhead.

#### Scenario: Browser reuse
- **WHEN** a second render request arrives after the first completes
- **THEN** the same Chromium browser instance is used (not relaunched)
- **AND** a new page is opened per request and closed after completion

### Requirement: Service supports CORS for Storio origins
The service SHALL include CORS headers permitting requests from Storio's Vercel domain and Capacitor origins.

#### Scenario: Cross-origin request from Storio frontend
- **WHEN** `POST /render` is called from `https://storio.andismtu.com`
- **THEN** the response includes `Access-Control-Allow-Origin: https://storio.andismtu.com`
