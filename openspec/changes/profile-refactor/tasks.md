## 1. Clean Up Existing UI

- [x] 1.1 Remove "Security & Privacy" item from the Account section in `client/src/app/profile/page.tsx`.
- [x] 1.2 Remove "Notifications" toggle from the Settings section in `client/src/app/profile/page.tsx`.
- [x] 1.3 Remove standalone "Suggest a Feature" and "Report a Bug" items from the Community section.

## 2. Localization Updates

- [x] 2.1 Add multi-language translations for the "Contact Us" sub-view options (Feature, Bug, Other) in `client/src/i18n/locales.ts` (both `en-US` and `zh-TW`).
- [x] 2.2 Add multi-language translations for the Email Subject prefixes in `client/src/i18n/locales.ts`.

## 3. Implement Contact Sub-view

- [x] 3.1 Add `showContactSettings` boolean state to `client/src/app/profile/page.tsx`.
- [x] 3.2 Update the "Contact Us" ProfileItem `onClick` handler to set `showContactSettings` to true.
- [x] 3.3 Create the `handleContactSelect(type)` function in `client/src/app/profile/page.tsx` to generate the email subject and trigger the `mailto:` link.
- [x] 3.4 Build the full-screen Contact Sub-view UI (conditionally rendered when `showContactSettings` is true), mirroring the existing Language/Statistics pattern.