## ADDED Requirements

### Requirement: Share render route reads data from window.__RENDER_DATA__
The `/share/render` page SHALL read rendering data from `window.__RENDER_DATA__` (injected by the Puppeteer service) and render the appropriate template component.

#### Scenario: Data injected before page load
- **WHEN** the page loads and `window.__RENDER_DATA__` is already set
- **THEN** the page renders the template specified by `window.__RENDER_DATA__.template`
- **AND** passes all item and settings data to the template component

#### Scenario: Data not yet available on mount
- **WHEN** the page's `useEffect` runs before `window.__RENDER_DATA__` is injected
- **THEN** the page polls `window.__RENDER_DATA__` every 100ms for up to 10 seconds
- **AND** renders the template once the data becomes available

#### Scenario: Unknown template type
- **WHEN** `window.__RENDER_DATA__.template` does not match any known template
- **THEN** the page renders a visible error state (not a blank page)

### Requirement: Share render route signals render completion
The `/share/render` page SHALL set `window.__RENDER_READY__ = true` after the template is rendered and all fonts are loaded.

#### Scenario: Render complete
- **WHEN** the template component has rendered
- **AND** `document.fonts.ready` Promise resolves
- **THEN** the page sets `window.__RENDER_READY__ = true`

### Requirement: Share render route is compatible with static export
The `/share/render` page SHALL be a pure client-side component with no server-side data fetching, compatible with Next.js `output: 'export'`.

#### Scenario: Static build
- **WHEN** `next build` runs with `output: 'export'`
- **THEN** `/share/render` is exported as a static HTML file at `out/share/render/index.html`
- **AND** the build completes without errors

### Requirement: Share render route applies no application chrome
The `/share/render` page SHALL render the template with no navigation, no padding, no modal chrome — just the template component at exact template dimensions.

#### Scenario: Isolated render
- **WHEN** the page is visited with render data injected
- **THEN** the page body contains only the template component
- **AND** no NavigationFAB, header, or other application UI elements are visible
