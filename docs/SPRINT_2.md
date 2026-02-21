# Storio - Sprint 2: The Folio of Memories (Completed)

**Sprint Goal:** Integrate Supabase for database and authentication. Enable Anonymous Guest Login and allow users to save "Stories" to their personal Folio (Pensieve). Refine the UI for maximum immersion.

## 1. User Stories (Completed)

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|---------------------|----------|--------|
| **US-05** | Anonymous Login | User is automatically assigned a Guest Identity upon visiting. | **High** | ✅ Done |
| **US-06** | Add to Collection | User can click "Add to Collection" and the data persists in Supabase. Supports re-adding (rewatch). | **High** | ✅ Done |
| **US-07** | Collection View | A dedicated page to view all saved artifacts in Bento Grid. Shows rewatch count. | **High** | ✅ Done |
| **US-08** | 10-Item Limit | Guest users are blocked from adding the 11th item and prompted to sign up. | Medium | ✅ Done |
| **US-09** | Story Details | View and edit rating/notes for collected items. | **High** | ✅ Done |
| **US-10** | UI Overhaul | "Backdrop-First" design, pure black loading screens, and cinematic typography. | **High** | ✅ Done |

## 2. Technical Tasks (Completed)

### 🟢 Backend (FastAPI + Supabase)
- [x] **Dependency**: Install `supabase` python client.
- [x] **Schema**: Define SQL table structure for `collections` (renamed from bricks).
- [x] **Service**: Implement `CollectionService` with CRUD and duplicate (rewatch) support.
- [x] **Auth**: Implement middleware to verify Supabase User Tokens.
- [x] **API**: Create `/collection/check/{external_id}` for rewatch logic.
- [x] **Fix**: Resolved TV Series ID collision with Movies in Search Service.

### 🔵 Frontend (Next.js + Supabase)
- [x] **Infra**: Setup Supabase Client SDK.
- [x] **Auth**: Implement `signInAnonymously`.
- [x] **UI**: Connect Search results to the "Add" API with rewatch flow.
- [x] **Page**: Implement `/collection` (My Storio) page with status-based CTAs.
- [x] **Page**: Implement `/collection/[id]` (Memory Detail) with Read/Edit modes.
- [x] **Components**: Created `StoryDetailsView`, `RateAndReflectForm` for modular UI.
- [x] **Design**: Implemented "Storio Gold" indicators (Feather/Star) with sync pulse animation.

## 3. Database Schema (Supabase/Postgres)
Table `collections`:
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to Auth.Users)
- `title`: Text
- `media_type`: Text (movie/book/tv)
- `external_id`: Text (TMDB/GBID)
- `poster_path`: Text
- `source`: Text
- `rating`: Integer (1-10)
- `notes`: Text (Reflection)
- `created_at`: Timestamptz