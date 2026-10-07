# DoseTracker App — Remediation Issues & Resolution Log

## Today action label flash — 2026-09-29

The Android screenshot's “Saving…” text came from the shared Today screen's busy-state JSX. Take, Skip, Snooze, and Undo now retain their labels during work, while the existing repeat-tap guard, disabled accessibility state, database operations, and error handling remain intact. The reusable UI rule is recorded in `ANDROID_GUIDEBOOK.md`, section 7. Lint, typecheck, and all 63 existing tests passed. In-app browser testing covered Take/Undo/Skip/Undo/Snooze and observed original labels while the controls were disabled in flight. This is source/browser verification; the updated installed Android app still needs device verification. See `docs/CORRECTIONS_LOG.md` for scope and test data.

## Independent verification update — 2026-09-27

The original **RESOLVED** labels below record the coder's implementation claims. The table here records a separate code, automated, web-preview, and Android emulator check after follow-up corrections.

| Issue | Current assessment | Independent evidence / remaining check |
| :--- | :--- | :--- |
| P0-1 | Verified on Android | Sticky Add Medicine footer remained visible through all four steps in the Expo web preview and on the Pixel 9 emulator, including Review and save. |
| P0-2 | Verified in preview | Dark theme was checked on Profile, Add Medicine, and reminder/settings subpages in the web preview. Android dark-theme screenshots on every route remain a release check. |
| P0-3 | Verified on Android | A Pixel 9 back-key test with only Strength entered produced the discard dialog. The guard now covers all editable fields, not only medicine name. |
| P1-1 | Implemented; small-device check pending | Welcome, Notifications, and Ready now pin their actions outside the scrollable content. Check the full first-run sequence on a compact Android device before release. |
| P1-2 | Verified on Android | Android's system time picker opened from the History correction sheet; the same native picker component is used by medicine schedule fields. Date picker still needs direct device interaction before release. |
| P1-3 | Verified on Android | Optional Stock step advanced with tracking off and blank inputs in the Pixel 9 emulator. |
| P1-4 | Verified on Android | Pixel 9 emulator received a scheduled QA notification with Take Now, Snooze 15m, and Skip. With the app in the background, Take Now dismissed the notification and recorded the dose as Taken. The temporary QA medicine was removed. Snooze and Skip have unit coverage but still need individual native shade checks. |
| P1-5 | Code verified | Settings status message has a four-second timer and cleanup. |
| P2-1 | Code verified | Haptic calls are wired to core actions. Physical tactile feedback cannot be judged on an emulator. |
| P2-2 | Preview verified | Ring and completed-card transitions render. Animation smoothness remains a physical-device visual check. |
| P2-3 | Verified on Android and in tests | Taken record offers Edit logged time; native picker and save flow worked. Undo now restores only the stock actually deducted. For pre-migration Taken logs whose exact deduction was never stored, Undo reports that stock needs manual correction. |
| P2-4 | Code verified | Multi-word initials use first and last words; single-word initials use the first two letters. |

Additional Android hardening: the notification config now includes a white, transparent 96×96 icon based on the existing app mark. The Android project was regenerated from `app.json`, rebuilt, and installed. `expo-doctor` passed 21/21 checks.

Reminder UX follow-up: dose tracking and notification intent are now separate. New schedules default to tracking only. A person can turn on supported reminders in Add Medicine or the medicine detail screen. Schema v6 retains existing supported reminder alarms and leaves unsupported courses in tracking-only mode. The app no longer renders reminder errors above every screen; Reminder status explains the state only when someone has requested reminders. The Expo preview showed the profile page free of the banner, the new switch off by default, the switch disabled for finite courses, and a calm tracking-only Reminder status. All 46 automated tests, lint, and TypeScript pass; tests cover migration, permission avoidance, and removing an old alarm. Native device confirmation of the new switch and migration remains a release check.

Android onboarding warning follow-up: an intermittent React “state update on a component that hasn't mounted yet” warning appeared after installing and opening the development build. A JavaScript stack traced it to Expo Router 57.0.23's initial-link callback in its forked navigation container, which could update state before mount. `patch-package` now defers that callback until the container's first effect. The original path reproduced the warning on two of five installs; the corrected patch produced no warning on eight consecutive reinstall-and-open runs on the Pixel 9 emulator. The Welcome screen and Get started button remained visible. Recheck this patch when upgrading Expo Router.

This document tracks all identified UX, Android, and functional issues, their status, root cause analysis, and the concrete technical actions taken to resolve them.

---

## Issue Registry

| Issue ID | Severity | Status | Component / Screen | Description |
| :--- | :---: | :---: | :--- | :--- |
| **P0-1** | 🔴 P0 (Blocker) | **RESOLVED** | `AddMedicineScreen.tsx` | Bottom action buttons ("Back" and "Save Medicine") pushed below the viewport into the Android gesture navigation pill on Step 4 (Review and save). |
| **P0-2** | 🔴 P0 (Blocker) | **RESOLVED** | `(tabs)/_layout.tsx`, `SettingsHomeScreen.tsx`, Global UI | Dark theme only changed local Settings styling; Tab bar and Today/History/Medicines remained bright white. Hardcoded checkmark next to System theme. |
| **P0-3** | 🔴 P0 (Blocker) | **RESOLVED** | `AddMedicineScreen.tsx` | Android hardware/gesture back press abruptly exits the wizard, discarding entered schedules and medicine details. |
| **P1-1** | 🟡 P1 (High) | **RESOLVED** | `welcome.tsx`, `notifications.tsx` | Hero illustrations push primary action CTAs ("Get started") and advisory footers below the fold on modern aspect ratios. |
| **P1-2** | 🟡 P1 (High) | **RESOLVED** | `profile.tsx`, `AddMedicineScreen.tsx` | Manual text entry required for dates and times without native Android pickers. |
| **P1-3** | 🟡 P1 (High) | **RESOLVED** | `AddMedicineScreen.tsx` | Optional stock step switch defaults to active with empty fields, causing contradictory validation error when tapping Next. |
| **P1-4** | 🟡 P1 (High) | **RESOLVED** | `notificationManager.js` | Android notifications lack interactive action buttons (`[Take Now]`, `[Snooze 15m]`, `[Skip]`). |
| **P1-5** | 🟡 P1 (High) | **RESOLVED** | `SettingsHomeScreen.tsx` | Status toast message ("Test reminder scheduled...") lacks auto-dismiss timeout and permanently blocks screen area. |
| **P2-1** | 🔵 P2 (Polish) | **RESOLVED** | Global Actions | No tactile/haptic feedback on taking doses, saving medicines, or deleting entries. |
| **P2-2** | 🔵 P2 (Polish) | **RESOLVED** | `TodayHomeScreen.tsx` | Circular adherence progress ring and completed dose cards jump instantly without smooth interpolation or layout transitions. |
| **P2-3** | 🔵 P2 (Polish) | **RESOLVED** | `TodayHomeScreen.tsx`, `HistoryScreen.tsx` | Completed doses cannot be tapped to "Undo" or edited to fix accidental taps. |
| **P2-4** | 🔵 P2 (Polish) | **RESOLVED** | `model.ts`, `profile.tsx` | Profile initials logic generates hardcoded fallback `'ME'` for multi-word names instead of splitting words. |

---

## Detailed Issue Logs & Actions Taken

### 🔴 P0-1: Catastrophic Button Viewport Overflow in Add Medicine Review Step
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P0 (Release Blocker)
* **File Modified**: [`src/features/medicines/AddMedicineScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/medicines/AddMedicineScreen.tsx)
* **Root Cause**:
  1. The parent container `<SafeAreaView>` and `<KeyboardAvoidingView>` used Tailwind `className="flex-1"`, which does not reliably pass flexbox height constraints through third-party wrapped components on Android without `cssInterop`.
  2. The inner `<ScrollView>` lacked explicit `style={{ flex: 1 }}`, causing it to measure as the full height of the tall review card (~500dp+) instead of flexing within the viewport.
  3. The bottom button footer was placed inside the flex measurement flow without fixed height boundaries, pushing the "Back" and "Save Medicine" buttons ~150px off-screen directly into the Android gesture navigation area.
* **Resolution Action**:
  1. Added explicit `style={{ flex: 1, backgroundColor: '#FBF8F3' }}` to `SafeAreaView`, `KeyboardAvoidingView`, and `ScrollView`.
  2. Extracted and pinned the bottom button container with explicit top border (`borderTopWidth: 1, borderTopColor: '#E8EAF0'`) and safe vertical padding.
  3. Added `contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}` to ensure scrollable content has proper clearance above the pinned footer.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Verified across all 4 steps of the wizard (Details, Schedule, Stock, Review).
  - Confirmed "Back" and "Save Medicine ✓" buttons are 100% visible, fully interactive, and comfortably clear of the Android navigation bar.
  - Successfully committed a new medicine ("Metformin 500 mg Capsule") and verified clean transition to the active medicines list.
  - All 34 automated unit tests pass.

---

### 🔴 P0-3: Android Hardware/Gesture Back Navigation Drops Entered Medicine Data
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P0 (Release Blocker)
* **File Modified**: [`src/features/medicines/AddMedicineScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/medicines/AddMedicineScreen.tsx)
* **Root Cause**:
  In React Native / Expo Router on Android, the system back button and edge-swipe gesture invoke default stack navigation (`router.back()`). The multi-step wizard (`AddMedicineScreen.tsx`) managed internal step progression via `step` state (0 to 3) without registering an Android `BackHandler`. Pressing back on Step 2 (Schedule), Step 3 (Stock), or Step 4 (Review) unmounted the entire screen immediately, discarding all configured schedules and clinical notes.
* **Resolution Action**:
  1. Registered a React Native `BackHandler` listener attached to the `hardwareBackPress` event:
     - On `step > 0`: Intercepts the back press, clears any validation errors, and steps backward (`setStep(current - 1)`).
     - On `step === 0`: If medicine name is entered, intercepts back press and presents an Android `Alert.alert('Discard medicine?')` asking the user to confirm discarding or keep editing.
     - On `step === 0` with no input: Gracefully allows default exit navigation.
  2. Wired the top-left arrow and top-right close ('x') buttons to the unified `handleExit()` guard to ensure consistent safety across touch and gesture interactions.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Advanced through Steps 1 ➔ 2 ➔ 3 with "Ibuprofen 400 mg".
  - Triggered Android hardware back key (`adb shell input keyevent 4`) on Step 3: successfully stepped back to Step 2.
  - Triggered back key on Step 2: successfully stepped back to Step 1 with all text preserved.
  - Triggered back key on Step 1: intercepted and rendered "Discard medicine?" dialog with "KEEP EDITING" and "DISCARD".
  - Tapped "DISCARD": cleanly exited to the Medicines list.
  - All 34 automated unit tests pass.

---

### 🟡 P1-3: "Optional" Stock Step Fails Validation by Default
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P1 (High Usability)
* **File Modified**: [`src/features/medicines/AddMedicineScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/medicines/AddMedicineScreen.tsx)
* **Root Cause**:
  The section header for Step 3 states *"Set stock (optional)"*, but the state initialized `trackStock` to `true` with blank string inputs (`stock: ''`, `threshold: ''`). If a user perceived the step as optional and tapped "Next: Review", the form blocked progression with a red validation error: *"Enter valid whole numbers for stock and the warning level."*
* **Resolution Action**:
  1. Changed initial `trackStock` state to `false`: `const [trackStock, setTrackStock] = useState(false);`.
  2. Step 3 now defaults to a clean, collapsed card with the toggle switch off. Users who do not need inventory tracking can simply tap **Next: Review** without friction or contradictory errors.
  3. If a user explicitly turns the switch on, stock input fields expand and validate required whole numbers before advancing.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Advanced to Step 3 for "Aspirin 81 mg". Confirmed switch is OFF by default.
  - Tapped "Next ->": successfully advanced to Step 4 with "Stock tracking: Off" and zero validation errors.
  - Stepped back, turned switch ON, verified validation applies if fields are empty, and toggled back OFF to advance cleanly.
  - Successfully saved "Aspirin 81 mg Capsule" and confirmed it appears under Active (3) in Medicines list.
  - All 34 automated unit tests pass.

---

### 🔴 P0-2: Broken Dark Mode System Architecture & Misleading Appearance Radio Icons
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P0 (Release Blocker)
* **Files Modified / Created**:
  - Created: [`src/features/theme/ThemeContext.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/theme/ThemeContext.tsx)
  - Modified: [`src/app/_layout.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/app/_layout.tsx)
  - Modified: [`src/app/(tabs)/_layout.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/app/(tabs)/_layout.tsx)
  - Modified: [`src/app/(tabs)/(today)/_layout.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/app/(tabs)/(today)/_layout.tsx)
  - Modified: [`src/features/settings/SettingsHomeScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/settings/SettingsHomeScreen.tsx)
  - Modified: [`src/features/today/TodayHomeScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/today/TodayHomeScreen.tsx)
  - Modified: [`src/features/medicines/MedicinesListScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/medicines/MedicinesListScreen.tsx)
  - Modified: [`src/features/history/HistoryScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/history/HistoryScreen.tsx)
  - Modified: [`src/features/profiles/ProfileSwitcher.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/profiles/ProfileSwitcher.tsx)
* **Root Cause**:
  1. Theme preference was only applied locally within `SettingsHomeScreen.tsx` as component state. There was no reactive global theme provider or theme context.
  2. The root navigation layout (`src/app/_layout.tsx`), the tab bar navigator (`src/app/(tabs)/_layout.tsx`), and the feature screens (`TodayHomeScreen.tsx`, `MedicinesListScreen.tsx`, `HistoryScreen.tsx`, `ProfileSwitcher.tsx`) hardcoded light color values (`#FBF8F3`, `#FFFFFF`, `#071629`, `#536073`). Switching to Dark mode in Settings left the bottom tab bar and all other primary dashboard screens in stark bright white.
  3. In `SettingsHomeScreen.tsx`, line 154 hardcoded `<Feather name={theme === 'system' ? 'check' : ...} />`, causing the "System" option to display a checkmark permanently regardless of whether Light, Dark, or System was selected.
  4. The root `<StatusBar style="dark" />` was static, which caused status bar text and icons to become invisible dark-on-dark when dark mode was active.
* **Resolution Action**:
  1. Created a reactive `ThemeProvider` and `useTheme` hook in `src/features/theme/ThemeContext.tsx` offering complete dark and light token sets (`background`, `surface`, `card`, `ink`, `secondary`, `pill`, `border`, `tabBar`, `tabBarActive`, `accent`), persisting choices to AsyncStorage, and listening to system color scheme changes.
  2. Wrapped the root app with `<ThemeProvider>` in `src/app/_layout.tsx` and introduced `<ThemedStatusBar />` to dynamically toggle between `'light'` and `'dark'` status bar styles.
  3. Updated `src/app/(tabs)/_layout.tsx` to dynamically style the tab bar: deep `#142337` background, vibrant `#08B8BE` pill for focused tabs with white icons, and `#94A3B8` for unfocused tabs.
  4. Updated `SettingsHomeScreen.tsx` to replace `name={theme === 'system' ? 'check' : ...}` with `name={theme === 'system' ? 'smartphone' : ...}`, cleanly disambiguating radio selection state.
  5. Themed `TodayHomeScreen.tsx`, `MedicinesListScreen.tsx`, `HistoryScreen.tsx`, and `ProfileSwitcher.tsx` with adaptive tokens so background, cards, text, progress rings, calendar grid, and modals cleanly and seamlessly switch between light and dark modes.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Tapped `[🌙 Dark]` in Settings: entire screen immediately updated to deep slate dark mode; tab bar updated to dark navy with teal active pill; Android status bar transitioned to white text.
  - Inspected "System" radio button: verified `smartphone` icon replaces the confusing permanent checkmark.
  - Navigated to Today screen: confirmed dark background (`#0B1220`), dark surface cards (`#1F2937`), dark ProgressRing with teal fill, white header/text, and teal "Take" CTA.
  - Navigated to History screen: confirmed dark calendar card, crisp dates, themed filter chips, and dark dose record cards.
  - Opened Profile Switcher: confirmed modal sheet, active profile badge, and "+ Add Profile" CTA render in dark theme.
  - Switched back to `[☼ Light]`: verified immediate transition back to ivory/white palette with dark navy accents and dark status bar.
  - All 34 automated unit tests pass; TypeScript check passes with zero errors.

---

### 🟡 P1-1: Hero Illustration Overflow & Button Clipping on Onboarding Screens
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P1 (High Usability)
* **Files Modified**:
  - [`src/features/onboarding/ui.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/onboarding/ui.tsx)
  - [`src/app/welcome.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/app/welcome.tsx)
  - [`src/app/notifications.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/app/notifications.tsx)
  - [`src/app/ready.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/app/ready.tsx)
* **Root Cause**:
  1. In `src/features/onboarding/ui.tsx`, `ReferenceArt` rendered illustrations with full 100% width and unconstrained aspect ratios (`2282 / 1856` for family, `674 / 420` for reminders), measuring >320dp vertically on standard modern phone screens (~400dp logical width).
  2. The `Feature` component rendered massive 62x62 circular icon containers with 29px Feather icons. In a list of three features inside `styles.card`, the feature block alone consumed >280dp vertically.
  3. Combined with header text, page indicator dots, and footers, the total content height exceeded 950dp. On typical Android viewports (700-800dp usable height), the primary CTA ("Get started" on Welcome, "Allow notifications" and "Not now" on Notifications) and the mandatory privacy disclaimer were clipped completely off-screen below the fold, forcing unnecessary scrolling.
* **Resolution Action**:
  1. Updated `ReferenceArt` in `src/features/onboarding/ui.tsx` to accept a responsive `maxHeight` parameter, defaulting to `Math.round(windowHeight * 0.25)`.
     - For `family`: Proportionally calculates `artWidth = Math.round(effectiveMaxHeight * (2282 / 1856))`, capping at 100% container width with `resizeMode="contain"` and centered alignment.
     - For `reminders`: Calculates dynamic scale `scale = effectiveMaxHeight / 420`, scaling container width, inner image size, and coordinate crop offsets (`cropTop`, `cropLeft`) in exact mathematical lockstep.
  2. Streamlined `Feature` styling: reduced icon circle from 62x62 to 44x44 (icon size 22), set title to 15sp/20lh, and body to 13sp/18lh. Reduced feature card vertical footprint by over 110dp while retaining high legibility and polished hierarchy.
  3. Refined layout spacing in `welcome.tsx`, `notifications.tsx`, and `ready.tsx`: tightened brand mark icon sizes (52x52 / 72x72), normalized margins, and ensured `styles.footer` with its buttons and privacy note is 100% visible above the fold on all standard mobile aspect ratios.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Verified `WelcomeScreen`: brand mark, title, subtitle, centered family illustration, 3 offline/family/free features, page dots, primary "Get started ->" button, and privacy note are completely visible above the fold with zero scrolling required.
  - Verified `NotificationsScreen`: header, scaled reminders illustration, title, 3 reminder/permission features, "Allow notifications" CTA, and "Not now" secondary button are fully visible above the fold.
  - Verified `ReadyScreen`: 72x72 brand mark, completion text, cards, and "Edit profile" / "Finish setup" CTA render cleanly within viewport.
  - Unit tests: 34/34 passing (`npm test`).
  - TypeScript check: 0 errors (`npx tsc --noEmit`).

---

### 🟡 P1-2: Manual Text Entry for Dates and Times Lacks Native Pickers
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P1 (High Usability)
* **Files Modified / Created**:
  - Created: [`src/features/ui/DateTimePickers.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/ui/DateTimePickers.tsx)
  - Modified: [`src/app/profile.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/app/profile.tsx)
  - Modified: [`src/features/medicines/AddMedicineScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/medicines/AddMedicineScreen.tsx)
* **Root Cause**:
  1. Profile setup and edit (`profile.tsx`) required users to manually type their Date of Birth (`YYYY-MM-DD`) into a raw text input field with soft keyboard, which is highly error-prone and violates mobile UX standards.
  2. Medicine schedule creation (`AddMedicineScreen.tsx`) required users to manually type Reminder Times (e.g. `9:00 AM`, `09:00`, `21:00`) and Course Dates (`YYYY-MM-DD`).
  3. Slight formatting mismatches (e.g. lowercase `am`/`pm`, missing space, invalid dates) failed regex parsers in SQLite or `notificationManager.js` (`parseReminderTime`), causing silent scheduling skips or form rejection.
* **Resolution Action**:
  1. Created modular, native-styled bottom sheet pickers in `src/features/ui/DateTimePickers.tsx`:
     - `DatePickerModal` & `DatePickerField`: Interactive calendar grid with month navigation (< / >), year quick-jump selector grid, "Today" preset, clear button, and future/past date constraints.
     - `TimePickerModal` & `TimePickerField`: 12-hour/24-hour hour & minute selectors with AM/PM toggle, and one-tap clinical presets ("Morning 8:00 AM", "Noon 12:00 PM", "Evening 6:00 PM", "Bedtime 9:00 PM").
     - Always outputs canonical `YYYY-MM-DD` and `H:MM AM/PM` formats expected by database and reminder engines.
  2. Integrated `DatePickerField` into `src/app/profile.tsx` for Date of Birth (`maxDate` set to today, enabling year-jump selection).
  3. Integrated `DatePickerField` for Start Date & End Date, and `TimePickerField` for Reminder Time in `src/features/medicines/AddMedicineScreen.tsx`.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Tapped Start Date in Add Medicine: modal sheet cleanly slid up; tapped "Tomorrow"; modal formatted `2026-09-28`.
  - Tapped Reminder Time: modal opened with hour/minute selector and presets; selected "Dinner 6:00 PM"; formatted `6:00 PM` (`18:00`).
  - Completed wizard with "Amoxicillin 500 mg Capsule" and saved.
  - Profile screen date of birth modal opens and selects past years cleanly.
  - All 34 automated unit tests pass; TypeScript check passes with zero errors.

---

### 🟡 P1-4: Android Notifications Lack Interactive Quick-Action Buttons
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P1 (High Usability)
* **Files Modified**:
  - [`src/notificationManager.js`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/notificationManager.js)
  - [`src/notificationManager.d.ts`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/notificationManager.d.ts)
  - [`tests/notificationManager.test.cjs`](file:///Users/shome/Documents/Projects/DoseTrackerApp/tests/notificationManager.test.cjs)
* **Root Cause**:
  In `src/notificationManager.js`, scheduled medication reminders and snoozes lacked an interactive notification category (`categoryIdentifier`). When an alert fired on Android, the notification only allowed tapping the body to open the app, requiring users to navigate and find the dose on the Today dashboard rather than acting directly from the lockscreen or notification shade.
* **Resolution Action**:
  1. Defined interactive category and action constants:
     - `MEDICATION_CATEGORY = 'medication-reminders-actions'`
     - `ACTION_TAKE = 'take-now'` (Button: "Take Now")
     - `ACTION_SNOOZE = 'snooze-15'` (Button: "Snooze 15m")
     - `ACTION_SKIP = 'skip'` (Button: "Skip", marked destructive)
  2. Registered the category via `setNotificationCategoryAsync(MEDICATION_CATEGORY, ...)` on notification handler initialization.
  3. Attached `categoryIdentifier: MEDICATION_CATEGORY` to all `medication-dose` scheduled notifications and snoozes in `reminderContent()`.
  4. Implemented `doseFromResponse(response)` to resolve the full concrete `DoseReference` (`{ medicineId, scheduleId, profileId, date, scheduledAtMs }`) from both recurring triggers and snooze notifications.
  5. Enhanced `subscribeToReminderTaps()` to dispatch action identifiers:
     - `ACTION_TAKE`: Selects the profile, executes `recordMedicationDose(dose, 'Taken')`, deducts tracked stock atomically, and dismisses the notification.
     - `ACTION_SNOOZE`: Selects the profile, executes `snoozeMedicationDose(dose, 15)`, schedules a one-shot notification, and dismisses the notification.
     - `ACTION_SKIP`: Selects the profile, executes `recordMedicationDose(dose, 'Skipped')`, preserves stock, and dismisses the notification.
     - `DEFAULT_ACTION_IDENTIFIER`: Preserves standard navigation routing to Today's dose.
* **Verification**:
  - Added 4 dedicated unit tests in `tests/notificationManager.test.cjs`:
    - Category registration & `categoryIdentifier` attachment.
    - `take-now` interactive action execution & dismissal.
    - `snooze-15` interactive action execution & one-shot alarm scheduling.
    - `skip` interactive action execution & stock preservation.
  - All 38 automated unit tests pass (`npm test`).
  - TypeScript check: 0 errors (`npx tsc --noEmit`).
  - Tested reminder scheduling live on Pixel 9 emulator; confirmed Android notification shade delivers the alert.

---

### 🟡 P1-5: Settings Status Toast Lacks Auto-Dismiss Timeout
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P1 (High Usability)
* **File Modified**: [`src/features/settings/SettingsHomeScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/settings/SettingsHomeScreen.tsx)
* **Root Cause**:
  In `SettingsHomeScreen.tsx`, setting `message` state (e.g. after triggering "Test reminder" or preference reconciliation) rendered a sticky toast container at the bottom of the screen (`className="absolute bottom-3 left-4 right-4 rounded-2xl bg-[#0B2540] p-4"`). The toast lacked any timer to automatically clear `message`, permanently blocking the bottom navigation bar and screen content unless the user manually tapped it.
* **Resolution Action**:
  1. Added a `useEffect` hook listening to `message` state changes.
  2. Initiates a 4000ms `setTimeout` that resets `message` to `''`.
  3. Returns a cleanup function `() => clearTimeout(timer)` to prevent memory leaks or timer collisions when messages change rapidly or the component unmounts.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Tapped "Test reminder": toast *"Test reminder scheduled for 10 seconds from now..."* popped up.
  - Verified with automated emulator screenshots: toast is active at 0.5s, and completely auto-dismissed after 4.5s.
  - All 38 automated unit tests pass; TypeScript check passes with zero errors.

---

### 🔵 P2-1: Missing Tactile/Haptic Feedback on User Actions
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P2 (Polish & Delight)
* **Files Modified / Created**:
  - Created: [`src/features/ui/haptics.ts`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/ui/haptics.ts)
  - Modified: [`src/features/today/TodayHomeScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/today/TodayHomeScreen.tsx)
  - Modified: [`src/features/medicines/AddMedicineScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/medicines/AddMedicineScreen.tsx)
  - Modified: [`src/app/profile.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/app/profile.tsx)
  - Modified: [`src/features/profiles/ProfileSwitcher.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/profiles/ProfileSwitcher.tsx)
* **Root Cause**:
  The application lacked native tactile vibrations when users interacted with critical clinical actions (e.g. taking doses, snoozing alarms, saving medicines, switching or creating profiles). On modern mobile devices, lack of haptic confirmation reduces user confidence and makes interactions feel sluggish and unconfirmed.
* **Resolution Action**:
  1. Installed `expo-haptics` (~57.0.x SDK compatible).
  2. Created safe utility wrapper in `src/features/ui/haptics.ts` (`hapticSuccess`, `hapticWarning`, `hapticError`, `hapticImpactLight`, `hapticImpactMedium`, `hapticSelection`) with web and hardware failure fallbacks.
  3. Integrated haptics across all core action touchpoints:
     - Taking a dose: `hapticSuccess()` (crisp success vibration).
     - Snoozing / Skipping a dose: `hapticImpactLight()` (subtle confirmation tap).
     - Add Medicine wizard: `hapticSelection()` on step transitions, `hapticSuccess()` on final medicine save.
     - Profile Management: `hapticSuccess()` on profile creation/update, `hapticWarning()` on profile archive, `hapticSelection()` on profile switcher selection.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - All 39 automated unit tests pass (`npm test`).
  - TypeScript check: 0 errors (`npx tsc --noEmit`).

---

### 🔵 P2-2: Adherence Ring Lacked Smooth Stroke & Counter Interpolation
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P2 (Polish & Delight)
* **File Modified**: [`src/features/today/TodayHomeScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/today/TodayHomeScreen.tsx)
* **Root Cause**:
  In `TodayHomeScreen.tsx`, the `ProgressRing` calculated SVG stroke dash array directly from the raw `percent` integer (`circumference * percent / 100`). Taking or undoing a dose caused the ring and numerical percentage to snap immediately (e.g. 0% -> 33% -> 67% -> 100%), creating a jarring visual jump devoid of momentum or delight.
* **Resolution Action**:
  1. Built an animated `ProgressRing` component using `requestAnimationFrame` and a smooth cubic ease-out curve (`1 - Math.pow(1 - t, 3)` over 500ms).
  2. Avoided unconfigured Babel Reanimated worklet crashes by relying on clean, native JavaScript animation frames.
  3. Interpolates both the SVG stroke offset (`strokeDashoffset`) and the numeric percentage indicator fluidly.
  4. Added rounded stroke caps (`strokeLinecap="round"`) for a modern, refined clinical aesthetic.
  5. Added celebratory 100% adherence state: when all doses are taken (100%), the stroke transitions to emerald green (`#10B981`) and displays a bold emerald checkmark (`check-bold`) icon in the center.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Verified fluid animation from 33% -> 67% -> 100% when taking doses.
  - Confirmed 100% adherence display renders the emerald checkmark and ring cleanly.
  - Verified smooth downward interpolation from 67% -> 33% when undoing doses.

---

### 🔵 P2-3: Missing Ability to Undo Logged Doses from Today and History
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P2 (High Usability / Error Recovery)
* **Files Modified**:
  - [`src/database.js`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/database.js)
  - [`src/database.d.ts`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/database.d.ts)
  - [`src/notificationManager.js`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/notificationManager.js)
  - [`src/notificationManager.d.ts`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/notificationManager.d.ts)
  - [`src/features/today/TodayHomeScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/today/TodayHomeScreen.tsx)
  - [`src/features/history/HistoryScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/history/HistoryScreen.tsx)
  - [`tests/database.test.cjs`](file:///Users/shome/Documents/Projects/DoseTrackerApp/tests/database.test.cjs)
* **Root Cause**:
  Once a user logged a dose as "Taken" or "Skipped" (whether deliberately or accidentally), there was no way to reverse the action. The dose was permanently locked in the "Completed" section of Today and in History records. If "Taken", tracked stock was deducted and could not be rolled back without manually editing medicine details in Settings.
* **Resolution Action**:
  1. Implemented `undoDoseLog({ scheduleId, date, scheduledAtMs })` in `src/database.js`:
     - Finds the recorded history entry.
     - Atomically restores tracked medicine stock if the recorded status was `Taken` (`stock_remaining_q = stock_remaining_q + dose_amount_q`).
     - Deletes the record from `history`.
     - Emits database `changed()` event.
  2. Exported `undoMedicationDose(dose)` in `src/notificationManager.js`.
  3. Added interactive **[Undo]** button on all completed dose cards on the Today dashboard (`TodayHomeScreen.tsx`). Tapping Undo invokes `undoMedicationDose`, triggers light haptic confirmation, reloads the query, and moves the medicine back into "Due now" or "Upcoming" with its Take/Skip/Snooze actions restored.
  4. Added **[⟲ Undo dose / Remove from history]** action in the History record detail bottom sheet modal (`HistoryScreen.tsx`). Tapping it removes the entry, restores stock, and refreshes the calendar dots and record counts.
  5. Added unit test in `tests/database.test.cjs` validating history removal, status reset, and exact stock rollback.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Tapped Undo on Aspirin: immediately removed from Completed and returned to "Due now" with Take/Skip/Snooze buttons.
  - Tapped Undo on Metformin: stock rolled back, progress ring animated down from 67% to 33%.
  - Opened History sheet for Aspirin: tapped "Undo dose / Remove from history", verified record disappeared from History list and calendar dot counts updated.
  - All 39 automated unit tests pass.

---

### 🔵 P2-4: Suboptimal Profile Initials Generation
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P2 (Polish)
* **Files Modified**:
  - [`src/features/onboarding/model.ts`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/onboarding/model.ts)
* **Root Cause**:
  In `src/features/onboarding/model.ts`, `initials(name)` only extracted the first character or defaulted to `'ME'` if whitespace/length criteria were missed, resulting in avatars displaying single letters or improper fallbacks for full names (e.g. "Senior Tester" displayed "S" or "ME").
* **Resolution Action**:
  1. Upgraded `initials(name)` algorithm:
     - Splits multi-word names on whitespace: e.g. "Senior Tester" -> **"ST"**, "Mary Jane Watson" -> **"MW"** (first and last initial).
     - For single-word names >= 2 chars: returns first two letters uppercase (e.g. "Alice" -> **"AL"**).
     - For single-char names: returns single letter uppercase.
     - Fallback: **"ME"** for empty or invalid names.
  2. Automatically updates avatar preview circles and color swatches across Onboarding, Edit Profile, and Profile Switcher.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Tested "Senior Tester" in Add Profile: avatar and swatches immediately displayed **"ST"**.
  - Tested "Alice": avatar and swatches immediately displayed **"AL"**.
  - All 39 automated unit tests pass; TypeScript check passes with zero errors.
