# Storio Project Backlog & Future Improvements

Captured following UAT on 2026-02-21.

## 🎨 UI/UX Polish
1.  **Guest Login Logo**: Fix broken logo image on the "Continue as Guest" modal/page.
2.  **Description Truncation**: Implement "View More" / "View Less" for long descriptions in `/details/book/[id]` and `/details/movies/[id]` to prevent layout stretching.
3.  **Empty Rating Display**: In `/collection` list view, hide the rating indicator entirely for old items (legacy data) instead of showing "0".
4.  **Rating/Reflect Form Design**: Redesign the personal rating/reflection section in `/collection/[id]`.
    - Handle "Empty States" gracefully (encourage user to fill missing parts).
    - Ensure it looks good when only one (rating OR reflection) is present.

## 🧠 Logic & Flows
5.  **Duplicate Item Warning**: When adding an item that already exists in the Folio:
    - Prompt the user: "This story is already in your collection."
    - Ask intent: "Are you logging a re-watch/re-read?"
6.  **Multi-View Navigation**: If an item has been viewed multiple times (re-watched):
    - In `/collection/[id]`, provide clear navigation links to view the *other* instances/records of this story.
