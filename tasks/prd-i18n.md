[PRD]
# PRD: Internationalization (i18n)

## Overview
Implement a lightweight, client-side internationalization system to support **Traditional Chinese (zh-TW)** and **English (en-US)** switching. The system should allow instant language toggling without page reload.

## Goals
- Allow users to switch languages in Profile settings.
- Ensure all hardcoded UI text is translatable.
- Format dates according to the selected locale.

## Quality Gates
- `npm run lint` & `npm run typecheck`
- Verify language persistence after reload.

## Technical Specification

### 1. Dictionary Structure (`src/i18n/locales.ts`)
Store translations in a structured TypeScript object for type safety.
- **Namespaces**: `common`, `nav`, `home`, `search`, `collection`, `profile`, `onboarding`.

### 2. The Hook (`useTranslation`)
```typescript
const { t, locale, formatDate } = useTranslation();
// Usage: t.nav.home
// Usage: formatDate(new Date()) -> "Feb 21, 2026" or "2026年2月21日"
```

### 3. Implementation Phases

#### Phase 1: Infrastructure & Profile
- Create `locales.ts` and `useTranslation` hook.
- Integrate into `ProfilePage` (US-17 completion).
- Integrate into `ViewSwitcher` and `NavigationFAB`.

#### Phase 2: Collection & Views
- Translate `CollectionPage` headers and empty states.
- Translate `CalendarView` (Month names, "loading past").
- Translate `GalleryView` badges ("Rate It").
- Translate `StoryCard` badges.

#### Phase 3: Onboarding & Home
- Translate `OnboardingModal`.
- Translate `HomeStats` and `HeroStats`.

## Functional Requirements
- **FR-1**: Default language is `zh-TW` (as per project mandate), but user can override it.
- **FR-2**: Switching language updates text immediately.
- **FR-3**: Dates in zh-TW should use `yyyy年M月d日` format.

## Non-Goals
- Server-Side Rendering (SSR) translation (SEO might see default language initially, which is acceptable for this App type).
- URL-based routing (`/zh-tw/profile`). We use pure Client-side state.
[/PRD]
