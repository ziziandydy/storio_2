[PRD]
# PRD: Profile & Settings Features

## Overview
Implement functional account management and user preference settings in the `/profile` page. This focuses on completing the "missing links" in the current UI, allowing users to manage their identity (Guest vs. Registered) and app preferences.

## Goals
- Empower users to manage their account status (Sign In/Out).
- Persist user preferences (Language, Notifications) across sessions.
- Allow basic profile customization (Display Name).

## Quality Gates
- `npm run lint` & `npm run typecheck`
- Verify Auth flows (Guest -> Login -> Logout) manually.

## User Stories

### US-15: Account Management (Auth)
**Description:** As a user, I want to clearly understand my login status and easily upgrade from Guest to Registered user to save my data.

**Acceptance Criteria:**
- [ ] **Login Integration**: Clicking "Login to Sync" opens the existing `OnboardingModal`.
- [ ] **Sign Out**: Clicking "Sign Out" logs the user out from Supabase and redirects to Home (where `useAuth` will auto-create a new anonymous session or show landing).
- [ ] **Status Display**: 
    - Guest: Show "Guest Curator" + "Apprentice" label.
    - Registered: Show Email/Name + "Master Curator" label.

### US-16: Profile Customization
**Description:** As a user, I want to set a display name so the app feels more personal.

**Acceptance Criteria:**
- [ ] Clicking the user name or avatar opens a small "Edit Profile" modal (or inline edit).
- [ ] Allow updating `display_name`.
- [ ] Save `display_name` to Supabase Auth Metadata (`supabase.auth.updateUser`).
- [ ] Update UI immediately upon save.

### US-17: App Preferences (Local)
**Description:** As a user, I want to toggle app settings like Language and Notifications.

**Acceptance Criteria:**
- [ ] **Language**: Clicking "Language" toggles between "English" and "Traditional Chinese" (Store in `localStorage` + Zustand Store). 
    - *Note*: For MVP, just change the label text or a few key headers to demonstrate functionality.
- [ ] **Notifications**: Toggle switch for "Notifications" (Visual only, store state in `localStorage`).
- [ ] **Statistics**: (Already implemented) Ensure the link to sub-settings works smoothly.

## Technical Implementation

### Frontend
- **Store**: Create `useSettingsStore` (Zustand) to manage `language`, `notifications`, `theme`. Persist to `localStorage`.
- **Auth Hook**: key-in `signOut` method to `useAuth`.
- **Supabase**: Use `supabase.auth.updateUser({ data: { full_name: '...' } })` for profile updates.

### Backend
- No new endpoints required for MVP. We rely on Supabase Auth and Client-side storage.

## Non-Goals
- Avatar image upload (Stick to default icons for now).
- Server-side storage of preferences (Keep it local for simplicity).
- Real Push Notifications implementation.

## Success Metrics
- Successful conversion from Guest to Registered user via Profile page.
- User retains custom display name after reload.
[/PRD]
