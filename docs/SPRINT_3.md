# Storio - Sprint 3: The Curator's Experience

**Sprint Goal:** Enhance the user journey from the very first interaction (Onboarding) to the reflection phase (Stats & Views), and finally to sharing (Social Card).

## 1. User Stories (Updated)

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| **US-11** | Onboarding Flow | - Check login status on load.<br>- If no session, show Modal with Google/Apple/Email/Guest options.<br>- Guest option must warn about the 10-item limit. | **Completed** |
| **US-12** | Curated Stats | - Home page shows "Stories Collected" for: Last 7 Days, Last 30 Days, This Year.<br>- Replaces old stats component. | **Completed** |
| **US-13** | Folio Views | - Switcher in `/collection` page.<br>- **List View**: Mobile 2-col, Desktop 4/5-col, sorted Newest First.<br>- **Calendar View**: Infinite scroll (upwards), Stack/Grid collage for multi-items.<br>- **Gallery Mode**: Full-screen immersive carousel, Dot navigation. | **Completed** |
| **US-14** | Social Card | - "Share" button on Detail Page.<br>- Generates a downloadable image with Poster, Rating, and Reflection.<br>- "Museum Ticket" aesthetic. | Medium |

## 2. Technical Tasks

### 🟢 Backend (FastAPI)
- [x] **API**: Update `/stats` endpoint to return specific date-range counts (7d, 30d, Year, Week, Month, Trends).
- [ ] **API (Optional)**: If client-side generation is too heavy, create `/share/generate` for Social Cards.

### 🔵 Frontend (Next.js)
- [x] **Component**: `OnboardingModal` - Intercepts unauthenticated users.
- [x] **Component**: `HomeStats` - New carousel design for metrics & charts.
- [x] **Page**: `/profile` - Implemented Settings, Statistics config, and Account management.
- [x] **Refactor**: Search Page - Moved input & filter to bottom bar.
- [x] **Feature**: `MemoryTimeline` - Show past viewings in details page.
- [x] **Component**: `ViewSwitcher` - Smart toggle button (Loop: Grid -> Calendar -> Gallery).
- [x] **Component**: `CalendarView` - Custom grid with stack/collage effects and infinite scroll.
- [x] **Component**: `GalleryView` - Immersive carousel with blurred background and dot nav.
- [ ] **Feature**: `SocialShare` - Logic to generate/download image of the review.

## 3. Design Focus
- **Onboarding**: Must be welcoming but clear about the benefits of signing up vs. Guest limitations.
- **Search**: Mobile-first, bottom-heavy design for ease of use.
- **Views**: Immersive, "museum-like" experience for browsing the collection.
- **Stats**: Minimalist, distinct from the heavy imagery of the rest of the app.
