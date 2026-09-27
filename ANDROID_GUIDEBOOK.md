# DoseTracker Android guidebook

Use this guide before changing the Android app. It records lessons from the September 2026 UX audit and follow-up implementation. Read `AGENTS.md`, inspect the current code, and use `ISSUES.md` for issue-by-issue evidence. This guide is not proof that every release check passed.

## 1. Start with the actual Expo version and app architecture

- Read the `expo` major version in `package.json` before touching Expo, EAS, or React Native APIs. This checkout uses Expo SDK 57; verify it again next time. Read `https://docs.expo.dev/versions/v<major>.0.0/`, then find the relevant API page through `https://docs.expo.dev/llms.txt`. Do not rely on remembered package names from another SDK.
- This project uses npm. Install Expo dependencies with `npx expo install <package>`. Follow `AGENTS.md` if a later checkout uses Bun.
- Expo Router screens belong in `src/app/`; components, hooks, and storage code belong outside it. The root layout gates onboarding and device authentication. Wait for onboarding completion state before showing Today.
- `src/database.js` owns app-private SQLite (`dosetracker.db`, currently schema v6): health records, profiles, schedules, dose history, pending snoozes, and reminder diagnostics. `settings.active_profile_id` identifies the active profile. `AGENTS.md` still mentions schema v4; inspect the migration code and update that reference when maintaining the project instructions.
- Non-sensitive Settings preferences live in `src/features/settings/storage.ts` under `@dosetracker/settings/v1`. The device lock flag lives in SecureStore. The old SQLite `settings.notification_preferences` default is not the active Settings source of truth.
- Edit the tracked Android module in `modules/dose-alarm-access` and native configuration in `app.json` or config plugins. Do not hand-edit generated `android/` or `ios/` output.

## 2. Build layouts around the usable mobile viewport

- In multi-step forms, use a safe-area root with explicit `flex: 1`, a bounded `ScrollView` with `style={{ flex: 1 }}`, and a persistent action footer outside scrollable content. Check the footer above the Android gesture bar with the keyboard closed and open. The Add Medicine Review step once pushed Save below the screen.
- Keep first-run actions and essential advisory text visible on smaller Android viewports. Scale hero art and feature cards to available height. Welcome, Notifications, and Ready were adjusted, but the full first-run flow still needs a compact-device check.
- Give every screen and modal theme-aware backgrounds, surfaces, text, borders, and icon colors. Switching System, Light, and Dark must update content and tab navigation. Preview checks covered Profile, Add Medicine, and settings subpages; an Android route-by-route dark-theme check remains.
- Avoid a root-level warning banner above navigation. The old `NotificationLifecycle` banner appeared on unrelated screens and overlapped the Android status bar and camera cutout. Reconciliation can run at the root without rendering a persistent global alert. Show actionable reminder state in Reminder status when someone requested reminders.
- Auto-dismiss transient Settings messages and clean up timers on unmount. The Settings toast now clears after four seconds rather than covering content indefinitely.

## 3. Make forms safe to leave and easy to correct

- On Android, test hardware and gesture back at every wizard step. Back within Add Medicine should move to the previous step; exiting a changed form should ask before discarding. The unsaved check must include every editable field, including Strength, schedule, stock, optional text, and reminder intent. Apply the same exit guard to header Back and Close.
- Optional stock tracking starts off. Empty stock fields must not block Next while tracking is off. Validate quantity and threshold only after someone opts in.
- Use `DatePickerField` and `TimePickerField` in `src/features/ui/DateTimePickers.tsx`. They use `@react-native-community/datetimepicker` on Android and the app's modal picker on iOS/web. Validate canonical dates and times at form and database boundaries. The Android time picker was exercised; the date picker still needs a direct device check.
- Display review values before Save, including whether dose reminders are On or Off. A medicine can be saved for tracking without notification permission.
- Completed doses need recovery actions. Today and History expose Undo; History permits correcting logged time. A correction must preserve dose date, status, and stock effect.

## 4. Separate dose tracking from reminder intent

- A dose schedule is useful without an alarm. New schedules set `reminder_enabled = 0` by default. Add Medicine and medicine detail switches express the person's explicit choice. When no reminder was requested, do not ask for notification permission or warn about an unsupported alarm.
- Automatic recurring notifications currently support ongoing daily and selected-weekday schedules starting today or earlier. Fixed end dates, future starts, day/hour intervals, and as-needed schedules can still be tracked, but do not promise automatic recurring alerts for them. Disable the reminder switch with an explanation when unsupported.
- Schema v6 backfills existing supported ongoing schedules to reminders On to preserve working alarms; unsupported legacy schedules become tracking only. Future migrations must preserve explicit choices and cancel obsolete OS requests during reconciliation.
- `src/notificationManager.js` owns scheduling, cancellation, and reconciliation. `src/features/notifications/NotificationLifecycle.tsx` reconciles at launch and foreground. Serialize operations so stale reconciliation cannot re-arm a paused, deleted, or reminder-disabled medicine.
- Pending snoozes are separate one-shot requests. Turning off one medicine's recurring reminder must not remove another medicine's alarms. Test enable, disable, pause, delete, profile archive, snooze, and restart independently.
- With no reminder requested, Reminder status should say reminders are optional and dose tracking still works. Historical diagnostics must not become an app-wide alarm for a person who chose tracking only.

## 5. Respect Android notification behavior

- `app.json` declares `POST_NOTIFICATIONS` and `SCHEDULE_EXACT_ALARM`. Declaration does not grant exact-alarm special access. `DoseAlarmAccess` checks access and opens app-specific system settings. If denied, explain that timing may be delayed. Never promise guaranteed delivery or infer a missed dose from a missing Android receipt.
- Notification channel sound and vibration are immutable after creation. Preserve Android user/system channel restrictions when preferences change. Privacy settings must redact the notification payload as well as request public/private/secret visibility; Android may ignore requested visibility. Medicine names appear in notifications only when the person chose the content-showing privacy mode. Never put medicine names in diagnostic logs.
- `assets/images/notification-icon.png` is a white, transparent Android small icon, configured with color and WAV sounds in the `expo-notifications` plugin in `app.json`. Changing sounds, icons, plugins, or a native module requires `npx expo prebuild --platform android` and a reinstalled development build. A Metro reload cannot install native resources.
- Interactive actions are registered with `expo-notifications` in `src/notificationManager.js`: Take Now, Snooze 15m, and Skip. Dose requests carry the category identifier, currently `medication_reminders_actions`. Validate response IDs against SQLite before acting.
- Background handling is defined with `expo-task-manager` and `Notifications.registerTaskAsync` in `src/features/notifications/backgroundActions.ts`, imported by root `index.js` before `expo-router/entry`. `setNotificationHandler` controls foreground presentation; it is not the background action task. Action handling must be idempotent and preserve original dose identity and owning profile.
- A Pixel 9 emulator received a fired notification with all three buttons. Take Now from the shade while the app was backgrounded recorded the dose and dismissed the notification. Snooze and Skip pass unit tests but still need individual native shade checks, including a terminated-app case.

## 6. Keep history and stock exact

- SQLite writes combining a dose record and stock adjustment must be atomic. `history.stock_deducted_q` saves the quantity actually deducted for Taken. Undo restores that saved quantity, not the scheduled amount; otherwise low stock can grow beyond its original value.
- Pre-migration Taken records can have an unknown deduction (`stock_deducted_q = NULL`). Undo removes the log and tells the person to correct stock manually rather than inventing a restoration amount.
- Skipped doses do not deduct stock. Editing a Taken timestamp must not change its date, status, or stock. Test concurrent Take/Skip and retry paths so one occurrence produces one outcome and one deduction.
- Keep profile and medicine ownership attached to dose actions, including notification actions. Do not cross-log a dose to whichever profile happens to be active when an alert fires.

## 7. Polish should support clarity

- Use the safe wrappers in `src/features/ui/haptics.ts`; they degrade on web and unsupported hardware. Trigger feedback for completed actions and useful selections. Physical tactile quality remains a real-device check.
- The Today adherence ring interpolates its percentage, and completed cards use short layout transitions. Check performance and reduced-motion expectations on a physical device before release.
- Generate avatar initials consistently: first and last initials for multi-word names, first two letters for a single word, and `ME` only as the empty-name fallback. Verify the same preview across onboarding, Edit Profile, and the profile switcher.
- Give interactive controls roles, labels, and clear disabled/error states. Check TalkBack and large text on Android; a web preview alone does not establish accessibility.

## 8. Verification before calling an issue resolved

| Change | Required checks |
| --- | --- |
| Any code change | `npx expo lint` and `npx tsc --noEmit` |
| SQLite, dose logic, Settings storage, or notification scheduling | `npm test`, including migration and failure paths |
| Dependency or native config change | `npx expo-doctor`; rebuild and reinstall Android development build when native code or resources change |
| Layout, theme, onboarding, or picker change | Inspect Expo web preview where useful, then inspect an Android development build at a small viewport and with system bars/keyboard visible |
| Reminder scheduling or actions | Test permission granted/denied, exact access, channel restrictions, foreground/background/terminated states, all buttons, and obsolete-request cancellation on Android |

Run a local native build with `npx expo run:android` or an EAS development profile. Expo Go cannot validate arbitrary native modules. For EAS commands in this npm project, use `npx eas-cli@latest <command>`. Keep generated native projects out of source edits.

As of the September 2026 audit, the icon and action task build were installed on a Pixel 9 emulator, Expo Doctor passed 21/21, and the follow-up suite passed 46 tests plus lint and type checking. These are point-in-time results; rerun checks after changes. Remaining release checks: compact first-run flow, every dark route on Android, native date picker interaction, native Snooze and Skip, tactile and animation quality on a physical device, and the new per-medicine reminder switch/schema migration on a development build.

## 9. Maintain an honest issue log

- Treat a coder's “RESOLVED” entry in `ISSUES.md` as an implementation claim until independently checked. Record what was inspected in code, passed automated tests, seen in the browser, and exercised on Android.
- Update this guide when a new failure teaches a reusable rule. Update `ISSUES.md` with concrete status and evidence. Avoid carrying old “known open” tables forward after the implementation changes.
- When changing reminders, update UI wording, SQLite intent, OS scheduling, diagnostics, tests, and the release checklist together. A correct alarm engine can still create a poor experience if its warning UI is intrusive.
