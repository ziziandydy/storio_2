# Storio Project Backlog & Future Improvements

Captured following UAT on 2026-02-21.

## ✅ Completed (Recently)
1.  **Guest Login Logo**: Fixed broken logo path in `OnboardingModal.tsx`.
2.  **Description Truncation**: Implemented "View More" / "View Less" in `StoryDetailsView.tsx`.
3.  **Empty Rating Display**: Hidden the rating indicator entirely for unrated items in `StoryCard.tsx`.
4.  **Duplicate Item Warning**: Updated `AddToFolioModal` and `DetailsPage` to prompt for "Re-watch/Re-read" intent instead of showing a simple alert.
5.  **Empty Reflection Design**: Redesigned the personal reflection card in `/collection/[id]` to look elegant even when empty.
6.  **Navigation Consistency**: Replaced manual FAB on home page with unified `NavigationFAB` and updated colors to match the Storio aesthetic.
7.  **Terminology Refinement**: Replaced forbidden "Builder" terminology with "Apprentice" in `HeroStats.tsx`.

## 🎨 UI/UX Polish
- [ ] **Multi-View Navigation**: If an item has been viewed multiple times (re-watched):
    - In `/collection/[id]`, provide clear navigation links to view the *other* instances/records of this story.
- [ ] **Rating/Reflect Form Design**: Redesign the personal rating/reflection section *during editing* (currently basic).

## 🧠 Logic & Flows
- [ ] **Re-watch Logic Enforcement**: Verify if the backend actually allows multiple entries for the same `external_id` (409 issues in DB).
- [ ] **Onboarding Polish**: Ensure the guest limit (10 items) is clearly communicated during the "Add" action if they are close to the limit.