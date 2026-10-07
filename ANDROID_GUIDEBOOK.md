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

- Keep labels and button geometry stable during quick local actions. Do not briefly replace Take, Skip, Snooze, or Undo with “Saving…”/“Undoing…”, especially across every sibling button. DoseTracker now retains those labels while its existing synchronous guard and disabled controls prevent duplicate taps until the operation finishes. Keep error reporting and committed-result updates; removing visual flicker must never remove write protection or pretend a failed action succeeded. For genuinely slow operations, use a delayed, unobtrusive progress indicator without changing button size; cancel any delay when work finishes or the screen unmounts. Verify fast success, slow work, failure/retry, and rapid taps, including Android TalkBack disabled/busy semantics.
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

Expo Router 57.0.23 has an intermittent Android cold-start race when the development client opens an initial URL: its navigation container can update state before mounting, producing React's “state update on a component that hasn't mounted yet” LogBox warning over onboarding. This project applies `patches/expo-router+57.0.23.patch` during `npm install`. Keep the patch when reinstalling dependencies, recheck it when upgrading Expo Router, and verify first-run screens with repeated cold installs/launches rather than a single Metro reload. A normal app-icon launch may look clean while the development-client URL launch still reproduces the warning.

As of the September 2026 audit, the icon and action task build were installed on a Pixel 9 emulator, Expo Doctor passed 21/21, and the follow-up suite passed 46 tests plus lint and type checking. These are point-in-time results; rerun checks after changes. Remaining release checks: compact first-run flow, every dark route on Android, native date picker interaction, native Snooze and Skip, tactile and animation quality on a physical device, and the new per-medicine reminder switch/schema migration on a development build.

## 9. Maintain an honest issue log

- Treat a coder's “RESOLVED” entry in `ISSUES.md` as an implementation claim until independently checked. Record what was inspected in code, passed automated tests, seen in the browser, and exercised on Android.
- Update this guide when a new failure teaches a reusable rule. Update `ISSUES.md` with concrete status and evidence. Avoid carrying old “known open” tables forward after the implementation changes.
- When changing reminders, update UI wording, SQLite intent, OS scheduling, diagnostics, tests, and the release checklist together. A correct alarm engine can still create a poor experience if its warning UI is intrusive.


## Diagnostics in local testing and public builds (2026-09-30)

Private QA mode is for the owner's devices and informed testers using fictional data. Like public and release builds, it defaults every diagnostics category off. Users explicitly choose error reports, diagnostic logs and performance traces during setup or in Settings. Prior explicit errors-only consent retains errors only; logs and traces need new consent. Neither mode enables native crash dumps, replay, screenshots, or unrestricted logs. An error report is not guaranteed to arrive, particularly offline or before initialization. The deployed privacy page must match `legal/PRIVACY_POLICY.md`.

To build the standalone private QA APK locally, run from `android/`:

```sh
EXPO_PUBLIC_DIAGNOSTICS_MODE=private-qa EXPO_NO_DOTENV=1 NODE_ENV=production SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD=true ./gradlew :app:assembleRelease -Pdosetracker.allowDebugRelease=true --rerun-tasks
```

For a public-behavior test APK use the same command with `EXPO_PUBLIC_DIAGNOSTICS_MODE=public`. Never use private-qa for Play submissions. The explicit mode, disabled dotenv loading, and forced rebundle prevent a cached QA JavaScript bundle or local environment default from silently carrying into the other mode. This command retains the currently configured debug signing key; it is not a production-signing or AAB publishing command. App identity and versions stay unchanged.

Sentry source-map uploads remain disabled in these commands. They are separate from runtime reporting: readable source-mapped reports still need validated mapping metadata and authorized source-map uploads. No Sentry auth token belongs in any EXPO_PUBLIC variable. Confirm actual delivery with a synthetic non-health error on an informed tester's device; confirm public decline and QA withdrawal send nothing. Verify project-side retention/IP handling and complete Play Data safety for the actual reports before distribution.

### Local production AAB preparation (2026-10-02)

The owner selected local Gradle for the release; no EAS project or service is needed. `eas.json` does not configure direct Gradle commands. See [Android release checks](docs/ANDROID_RELEASE_CHECKS.md) for the approval boundary, signing inputs and exact-artifact verification. Release optimization is generated from `app.json` and `plugins/`, including R8 full mode, optimized ProGuard defaults and resource shrinking. Distribution builds reject debug signing and require public diagnostics mode. The explicit debug-signing exception above is for private local QA only. A generated AAB must not be described as Play-ready until its signer and contents have been checked and its derived APK has passed the recorded release smoke test.

## Tape Mark calculator: reclaim space after entry — 2 October 2026

Record: `CALCULATOR-UX-IMPLEMENT-001`. User approved automatic keypad dismissal after calculation (option 1), explicit manual keypad control (option 3), and supporting usability improvements. The same entry is appended to both requested Android guidebooks. These are reusable interaction lessons from Tape Mark, not authorization to add calculator features or change another application's verification policy.

### Problem and accepted interaction

- A permanently docked six-row keypad, large header and unit controls left only a small scrolling window for answers. Users could not readily discover the full tape, conversions, rounding and details. Treat that as a screen-space and interaction-state problem; merely shrinking keys or hiding a scrollbar does not resolve it.
- Use two states on the same calculator page. During entry, show the keypad, input fields, units and a compact live answer. On valid Equals, hide the keypad immediately and show the expression, exact/rounded answers, full tape, and clearly labeled Rounding, Conversions and Details controls in the main content area.
- Keep visible Show keypad / Hide keypad and Edit controls. Manual hiding must preserve incomplete input, selected operand and active field without calculating or saving. Editing or reusing a History calculation opens entry again. Restoring a committed saved draft opens results. Invalid Equals must not save or dismiss entry.
- Keep the primary result and tape above optional details. Show feature controls together; expand one supporting conversion/details panel at a time below them. Give tape expansion a visible label. Further information may scroll normally on compact screens; do not promise every detail fits every phone without scrolling.

### Layout and accessibility lessons

- Budget the usable viewport after safe areas, header and bottom navigation. Reduce branding/header whitespace and repeated status text before reducing touch targets. Preserve the complete Tape Mark name, readable text, native text scaling and at least 48 dp controls.
- In this implementation, short exact/rounded values share a row below 750 dp screen height at ordinary text size; long values and font scale above 1.2 stack. These are application-specific thresholds to validate, not universal Android constants.
- Below 560 dp height or above 1.2 font scale, place the keypad inside the same scrolling content as the editor so it cannot consume the entire remaining screen. Keep essential actions reachable; return the content to its top when switching entry/results states.
- Maintain coherent light/dark surfaces and readable tape leader lines. Preserve explicit explanations for unitless or negative results instead of displaying a misleading positive tape. Do not remove useful content to achieve a no-scroll claim.

### State, asynchronous work and regression lessons

- Separate transient keypad visibility from calculation and persistence state. Dismiss synchronously on valid Equals; do not wait for a save promise and then hide the keypad, because the user may already have reopened it or begun new input. Preserve honest saving/failed-save status and existing duplicate-write protection.
- A browser check caught a concrete bug: rounding updates copied the expression array without changing its tokens. Array reference equality treated that as new input, reopened the keypad and unmounted the rounding dialog. Comparing unchanged token identities fixed this editor's contract; an explicit expression revision is another design option. Do not use array identity as a universal semantic-change signal.
- Regression tests should cover incomplete drafts/field preservation, valid and invalid Equals, duplicate Equals, save failure, delayed save completion after new input, rounding with its dialog open, restored saved drafts, and History reuse of the same numeric value. With NativeWind wrappers, accessible-label/event lookup was more reliable than selecting Pressables by component type in this test harness.

### Verification and evidence boundaries

- Tape Mark lint and TypeScript checks passed; the complete suite passed **210 tests across 15 suites**, including seven new calculator interaction regressions. No dependencies, database schema or native configuration changed for this calculator work.
- Actual in-app browser renders inspected in light/dark at 390×844 and 320×640, plus a 320×480 short-screen fallback. At 390×844, the canonical result, exact/rounded values, full tape and all three feature controls fit without scrolling. At 320×640, the full tape strip fits but supporting labels/actions can require ordinary page scrolling.
- Inspected empty and compound input, manual hide/edit, imperial/metric/unitless/negative results, details, conversions, rounding and expanded tape. A persisted isolated 25 cm fixture survived a full reload with results visible and keypad hidden. No production data was cleared or staged.
- References: Design System and calculator images 04, 18, 25, 26, 28 and 29, plus the user's device photos. The accepted new interaction intentionally supersedes the always-visible keypad composition in images 25/26 while retaining the design tokens and product decisions.
- Browser tools did not expose native font scaling. The large-text fallback is implemented, but native enlarged text, TalkBack, keyboard, system bars and lifecycle remain unverified in this task. No APK/AAB rebuild, install or release was performed; existing APKs predate these changes. Browser evidence is not Android release approval.
- Developer-log lesson: Expo diagnostic logs can contain environment credentials. An inspected log exposed a local Sentry auth token in tool output; its value is excluded from records, and rotation was recommended but not performed. Avoid raw environment-bearing log dumps. The replacement preview used `EXPO_NO_DOTENV=1 EXPO_OFFLINE=1`; this prevents dotenv loading for that process, not all possible credential exposure.

Full implementation decisions: [Tape Mark design](</Users/shome/Documents/Projects/Tape Mark/design.md>). State-by-state evidence and limits: [VERIFICATION.md](</Users/shome/Documents/Projects/Tape Mark/VERIFICATION.md>). Chronological decisions, errors and recovery: [execution.md](</Users/shome/Documents/Projects/Tape Mark/execution.md>). Implementation: CalculatorScreen.tsx, ResultControls.tsx and Tape.tsx; regressions: CalculatorScreen.test.tsx under `src/features/calculator/`.

Research informing the accepted proposal: [Nielsen Norman Group — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [Bottom Sheets](https://www.nngroup.com/articles/bottom-sheet/), and [Android Accessibility — Touch target size](https://support.google.com/accessibility/android/answer/7101858?hl=en). The exact automatic-dismiss flow is this product's chosen design, not a requirement prescribed by those sources.


### Follow-up: Calculator tab returns to entry — 2 October 2026

- User requested the bottom Calculator tab as a shortcut from results back to input with the keypad. Every explicit tap now opens entry, including reselecting the active tab or returning from another tab, and scrolls to the top while preserving expression, active field and saved status. Equals still hides the keypad afterward; the tab does not clear data or create History records.
- Reusable lesson: a custom tab bar that only navigates may do nothing on current-tab reselection. Express the intended screen action explicitly through shared transient UI state; keep it separate from persisted calculation state. Use the same behavior in real navigation and development fixtures.
- Tape Mark added CalculatorEntryProvider, integrated it into CalculatorProvider, BottomTabs and CalculatorScreen, and added a rendered real-tab regression for repeated entry/results cycles and duplicate-save prevention. Lint/typecheck and 211 tests / 15 suites passed. Browser light 390×844 and dark 320×640 checked; History return checked in light. Native Android interaction/accessibility and an updated APK remain unverified/unbuilt. Full record: Tape Mark execution.md and VERIFICATION.md, CALCULATOR-TAB-ENTRY-001.


### Follow-up: units explained and History verified — 2 October 2026

- Tape Mark now groups unit choices with the selected number and highlights its actual unit rather than the default preference. No unit is always visible and selectable; all five options expose checked radio state. Expression, History and shared text consistently say (no unit); scalar answers say Exact · no unit. A generic explanation replaces the tape warning, without assuming every scalar answer is a ratio. Details explains splitting a length (7 in ÷ 7 = 1 in) versus comparing lengths (7 in ÷ 7 in = 1, units cancel).
- Lesson: selection styling must describe the object currently being edited. Keep defaults separate from active operand state; changing earlier operands must immediately update the controls. Do not change dimensional arithmetic to disguise confusing UI. Existing length conversion, scalar defaults after multiply/divide and save identity remain unchanged.
- Compact browser inspection exposed fields squeezed behind the fixed keypad. The shared-scroll fallback now starts below 750dp height (previously 560dp), retaining font scale >1.2 fallback. Preserve 48dp targets, wrapping and normal scrolling instead of compressing fields or hiding explanatory content. The threshold is Tape Mark-specific; full entry/details do not fit every viewport without scrolling.
- Verification: lint/typecheck and 213 tests /15 suites passed, including two new UI regressions for unit selection/conversion and restored scalar behavior. Actual light/dark browser renders checked at390×844 and320×640 against Design System and calculator references25/26/28. Native font scaling/TalkBack/system bars/lifecycle and APK rebuild were not performed. No dependency, schema or native configuration changes.
- Equals/History explicitly verified with isolated SQLite fixture unit-clarity-history: 7 in ÷ 7 saved exact1in; repeated Equals did not duplicate it; full reload retained it. Editing divisor to7in and pressing Equals saved a second scalar calculation. Manual hiding/unsaved edits did not add a record. Sample-based preview fixtures stub commits and cannot prove saving; use a repository-backed fixture without sample for persistence checks. Production user data was untouched.
- Full implementation/evidence: Tape Mark design.md, VERIFICATION.md and execution.md, UNIT-CLARITY-001. This appendix is documentation only in DoseTracker and Reference Docs; no DoseTracker application changes or application checks were needed.
