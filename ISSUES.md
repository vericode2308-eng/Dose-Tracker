# DoseTracker App — Remediation Issues & Resolution Log

This document tracks all identified UX, Android, and functional issues, their status, root cause analysis, and the concrete technical actions taken to resolve them.

---

## Issue Registry

| Issue ID | Severity | Status | Component / Screen | Description |
| :--- | :---: | :---: | :--- | :--- |
| **P0-1** | 🔴 P0 (Blocker) | **RESOLVED** | `AddMedicineScreen.tsx` | Bottom action buttons ("Back" and "Save Medicine") pushed below the viewport into the Android gesture navigation pill on Step 4 (Review and save). |
| **P0-2** | 🔴 P0 (Blocker) | **RESOLVED** | `(tabs)/_layout.tsx`, `SettingsHomeScreen.tsx`, Global UI | Dark theme only changed local Settings styling; Tab bar and Today/History/Medicines remained bright white. Hardcoded checkmark next to System theme. |
| **P0-3** | 🔴 P0 (Blocker) | **RESOLVED** | `AddMedicineScreen.tsx` | Android hardware/gesture back press abruptly exits the wizard, discarding entered schedules and medicine details. |
| **P1-1** | 🟡 P1 (High) | **RESOLVED** | `welcome.tsx`, `notifications.tsx` | Hero illustrations push primary action CTAs ("Get started") and advisory footers below the fold on modern aspect ratios. |
| **P1-2** | 🟡 P1 (High) | Pending | `profile.tsx`, `AddMedicineScreen.tsx` | Manual text entry required for dates and times without native Android pickers. |
| **P1-3** | 🟡 P1 (High) | **RESOLVED** | `AddMedicineScreen.tsx` | Optional stock step switch defaults to active with empty fields, causing contradictory validation error when tapping Next. |
| **P1-4** | 🟡 P1 (High) | Pending | `notificationManager.js` | Android notifications lack interactive action buttons (`[Take Now]`, `[Snooze 15m]`, `[Skip]`). |
| **P1-5** | 🟡 P1 (High) | Pending | `SettingsHomeScreen.tsx` | Status toast message ("Test reminder scheduled...") lacks auto-dismiss timeout and permanently blocks screen area. |
| **P2-1** | 🔵 P2 (Polish) | Pending | Global Actions | No tactile/haptic feedback on taking doses, saving medicines, or deleting entries. |
| **P2-2** | 🔵 P2 (Polish) | Pending | `TodayHomeScreen.tsx` | Circular adherence progress ring and completed dose cards jump instantly without smooth interpolation or layout transitions. |
| **P2-3** | 🔵 P2 (Polish) | Pending | `TodayHomeScreen.tsx`, `HistoryScreen.tsx` | Completed doses cannot be tapped to "Undo" or edited to fix accidental taps. |
| **P2-4** | 🔵 P2 (Polish) | Pending | `profile.tsx` | Profile initials logic generates hardcoded fallback `'ME'` for multi-word names instead of splitting words. |

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

