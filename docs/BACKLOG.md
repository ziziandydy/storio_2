# Storio Project Backlog & Future Improvements

Captured following UAT on 2026-02-21.

## ✅ Completed (Recently)
1.  **Guest Login Logo**: Fixed broken logo path in `OnboardingModal.tsx`.
2.  **Description Truncation**: Implemented "View More" / "View Less" in `StoryDetailsView.tsx`.
3.  **Empty Rating Display**: Hidden the rating indicator entirely for unrated items in `StoryCard.tsx`.
4.  **Duplicate Item Warning**: Updated `AddToFolioModal` and `DetailsPage` to prompt for "Re-watch/Re-read" intent instead of showing a simple alert.
5.  **Empty Reflection Design**: Redesigned the personal reflection card in `/collection/[id]` to look elegant even when empty.
6.  **Navigation Consistency**: Replaced manual FAB on home page with unified `NavigationFAB` and updated colors to match the Storio aesthetic.
7.  **Terminology Refinement**: 
    - Replaced "Builder" with "Apprentice".
    - Unified "TV Series" to "Series" in EN.
    - Updated "Add/Details" buttons.
8.  **Auth & Onboarding**:
    - Implemented Email OTP login flow.
    - Optimized Onboarding Modal layout (dynamic width).
    - Configured Google/Apple OAuth.
9.  **Collection & Details**:
    - Fixed "Series" showing as "Book" bug.
    - Implemented secure delete modal (Type "REMOVE").
    - Added custom collection date support.
    - Optimized Calendar View (Current month focus, future spacer).
    - Refined StoryDetailsView layout (Backdrop, Metadata below poster).
10. **Search**:
    - Implemented manual search trigger (Enter/Click).
    - Fixed keyboard dismissal on mobile.
    - Optimized input layout (Right-side submit button, uncontrolled input for CJK).
11. **AI**:
    - Added OpenAI fallback for suggestions.
    - Fixed suggestions rendering logic (pass synopsis).
12. **Book Details**:
    - Added ISBN (copyable), Publisher, Pages to Dossier.
    - Added "Where to Read" section (Google Play link).
    - Added "Read Sample" and cover thumbnails to Media section.

## 🚀 SPRINT 4: Social & Identity (Current)
- [ ] **User Profile Expansion**: Collect **Age** and **Gender** during the registration process (OAuth or Email OTP). These fields must be **read-only** in the Profile view.
- [ ] **Guest Data Migration**: Ensure that when an anonymous "Guest" user registers or logs in, their existing Folio (saved stories) is automatically transferred to their new authenticated account without data loss.
- [ ] **Share Memory Card**: Implement `html-to-image` generation for single story sharing (Instagram Story format).
- [ ] **Share Monthly Recap**: Implement calendar view summary sharing (Instagram Post format).
- [ ] **Share Modal**: Create a reusable preview & download modal for sharing features.

## 🎨 UI/UX Polish
- [ ] **Multi-View Navigation**: If an item has been viewed multiple times (re-watched):