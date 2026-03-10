## Context

The current Profile page (`/profile`) contains placeholders for incomplete features like "Notifications" and "Security & Privacy", which creates a disjointed user experience. Additionally, the feedback mechanisms ("Suggest a Feature" and "Report a Bug") are exposed as top-level list items alongside general settings, making the UI cluttered. 

To improve the user experience, we want to remove the incomplete placeholders and consolidate the feedback mechanisms into a single "Contact Us" entry point. Following the existing pattern used for "Language" and "Statistics", clicking "Contact Us" will transition the user into a dedicated full-screen Sub-view. This Sub-view will present specific feedback categories and automatically generate a localized email template directed to `andismtu@gmail.com`.

## Goals / Non-Goals

**Goals:**
- Clean up the Profile UI by removing "Notifications" and "Security & Privacy".
- Consolidate "Suggest a Feature" and "Report a Bug" into a unified "Contact Us" Sub-view.
- Ensure the "Contact Us" Sub-view follows the established UX pattern of sliding full-screen overlays (like Language/Statistics).
- Implement a robust `mailto:` link generator that automatically injects a localized subject prefix and the user's display name.

**Non-Goals:**
- Implementing a backend-driven ticket submission system or in-app messaging. We are relying entirely on the native OS email client via `mailto:`.
- Developing the actual Notification or Security features. They are strictly being hidden for now.

## Decisions

**Decision 1: Use Sub-view Pattern instead of Action Sheet**
- *Alternative:* Use a bottom-up Action Sheet (similar to `ShareModal`).
- *Rationale:* The user explicitly requested to follow the existing UX of the "Statistics" and "Language" settings, which utilize a full-screen sliding Sub-view. This maintains consistency within the Profile settings domain. Action Sheets are better suited for quick context-aware actions on specific items (like a single movie card), whereas Sub-views are better for drill-down navigation in a settings menu.

**Decision 2: Client-side Email Formatting via `mailto:`**
- *Alternative:* Send an API request to a backend service to dispatch the email.
- *Rationale:* Keeping the architecture simple and serverless. `mailto:` delegates the heavy lifting (authentication, delivery) to the user's native email client (e.g., Apple Mail, Gmail app). It also allows the user to review and easily add screenshots to the email before sending.

**Decision 3: Localized Subject Prefix**
- *Alternative:* Hardcode English prefixes (e.g., "[Feature Request]").
- *Rationale:* To provide a polished, localized experience, the email subject prefix will be driven by the `useTranslation` hook. The subject string will be built dynamically: `[Storio ${localizedPrefix}] from ${displayName}`.

## Risks / Trade-offs

- **[Risk] Mailto limitations on certain platforms:** Web environments (especially desktop without a default mail client) might fail to handle `mailto:` links gracefully.
  - *Mitigation:* This is an acceptable trade-off for an MVP. Since Storio 2 is heavily optimized as a Capacitor mobile app, iOS will natively intercept `mailto:` and open the Mail app flawlessly. We will ensure the `mailto:` string is properly URI-encoded to prevent parsing errors.