# Corrections log

Record user-requested corrections here with the request date, affected screen, implementation status, and verification. Implemented in source does not mean released or verified on a device.

## 2026-09-29 — 005: Hide medicine-screen tabs and preserve the selected-tab pill

- **Request:** View Medicines must open without Today/History/Settings at the bottom; returning to Today must retain the oval selected-icon background instead of becoming square.
- **Correction:** Hide the tab bar on the medicine list and medicine details, alongside the existing Add/Edit Medicine behavior. Remove the medicine-route-specific icon/background switch. Give every tab icon a fixed 48 × 36 view with an explicit 18-point radius and clipped overflow through React Native StyleSheet, preserving the same pill geometry across route/focus changes.
- **Files:** `src/app/(tabs)/_layout.tsx`, `docs/CORRECTIONS_LOG.md`.
- **Status:** Implemented in source and verified in the in-app browser. Android device rendering and release/install verification remain pending; browser results do not establish a native-device fix.
- **Verification:** Expo lint and TypeScript checks passed. At 390 × 844, visually checked Today before navigation, the medicine list with no bottom tabs, and Today after returning. Four consecutive View Medicines → Back to Today cycles passed with the pill intact. Today/History/Settings switching and reloading Medicines also passed; Back to Today restored the selected pill after reload.
- **Test environment:** The existing preview on port 8081 omitted the cross-origin isolation headers required by web SQLite. Started a fresh Expo preview on port 8083 using the existing Metro configuration. Created only a labelled `QA Navigation` profile in that isolated browser origin; no real medicine records were changed.
- **References:** [Expo Router tabs](https://docs.expo.dev/router/advanced/tabs/), [React Native 0.86 view styles](https://reactnative.dev/docs/0.86/view-style-props).

## 2026-09-29 — 001: Make medicine strength optional

- **Request:** Strength must not be compulsory on the Add Medicine page.
- **Previous behavior:** Next rejected blank strength with “Enter a medicine name and a valid strength.” The supplied screenshots show this old behavior, as confirmed by the user.
- **Correction:** Label the field “Strength (optional)”; allow blank or whitespace-only strength; retain positive-number validation when a value is entered. Save omitted strength without a unit-only value, and show “Not specified” on Review.
- **Files:** `src/features/medicines/AddMedicineScreen.tsx`, `src/features/medicines/MedicineDetailsForm.tsx`.
- **Status:** Implemented in source.
- **Verification:** Expo lint and TypeScript checks passed; all 52 existing tests passed. Updated device UI has not been tested; release/install status is not verified.

## 2026-09-29 — 002: Sharpen the opening logo

- **Request:** The logo shown when opening the app is blurry; upscale it.
- **Previous asset:** Native splash screen used a 512 × 512 PNG.
- **Correction:** Added a 1254 × 1254 PNG with transparency and sharper artwork, based on the existing brand mark. Updated the splash plugin to use it while retaining the 160-point display width. Kept the original asset. The separate filename prevents the existing brand asset script from overwriting the enhanced image.
- **Files:** `assets/images/splash-icon-upscaled.png`, `app.json`.
- **Method:** Built-in image generation, editing `assets/images/brand-mark.png`.
- **Prompt:** “Upscale this existing DoseTracker logo to a crisp 2048 by 2048 PNG for a mobile app launch splash screen. This is a faithful restoration, NOT a redesign. Preserve exact composition, proportions, rounded square silhouette, blue/lavender gradient, white circular clock face and its dot positions, diagonal turquoise capsule, liquid detail, white check mark, highlights and shadows. Improve edge sharpness and remove raster softness. No new elements, no text, no extra border or padding. True transparent pixels outside the rounded square corners. Return a saved local output file.” The tool returned 1254 × 1254 pixels, verified from the saved file.
- **Status:** Implemented in source; Android resources regenerated using Expo prebuild. A rebuilt app must be installed to see the change; installation and device visual verification remain pending.
- **Verification:** PNG dimensions and alpha verified; generated Android xxxhdpi splash resource visually inspected. Expo lint and TypeScript checks passed. Expo Doctor passed 20/21 checks; its remaining warning reports six existing Expo package patch-version mismatches (`@expo/ui`, `expo`, `expo-constants`, `expo-document-picker`, `expo-router`, `expo-task-manager`). Dependencies were not changed for this asset correction.
- **Reference:** [Expo 57 splash-screen documentation](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/). Verify final appearance in a preview or release build.

## 2026-09-29 — 003: Mark required details with an asterisk

- **Request:** Put `*` beside compulsory details in Add Medicine and throughout the app's data-entry forms.
- **Correction:** Added required markers to medicine name, form, dose unit, frequency, selected weekdays, repeat interval, start date, dose time, dose amount, course duration, conditional duration/end date, and stock quantity/threshold when tracking stock. Added markers to profile name, edited medicine name, refill quantity, and corrected logged time. Added “* Required” guidance and explicit “required” screen-reader labels. Medicine editing now has persistent labels for its fields. Strength and other optional details remain optional; validation and saving behavior are unchanged.
- **Files:** `src/features/medicines/AddMedicineScreen.tsx`, `src/features/medicines/MedicineDetailsForm.tsx`, `src/features/medicines/MedicineDetailScreen.tsx`, `src/app/profile.tsx`, `src/features/history/HistoryScreen.tsx`, `src/features/ui/DateTimePickers.tsx`.
- **Status:** Implemented in source.
- **Verification:** Reviewed markers against existing validation and conditional form visibility. Expo lint, TypeScript checks, and diff whitespace checks passed. Device visual and screen-reader verification remain pending.
- **Reference:** [React Native 0.86 accessibility documentation](https://reactnative.dev/docs/0.86/accessibility).

## 2026-09-29 — 004: Full medicine editing

- **Request:** Replace the limited Edit Medicine sheet with the original form's relevant options, including dose and alarms. Verify and iterate in the in-app browser.
- **Correction:** Edit actions now open a prefilled Details → Schedule → Stock → Review form shared with Add Medicine. Users can change name, optional strength/unit, form, dose unit, purpose, instructions, notes, color, frequency, weekdays/interval, start date/time, dose amount, course end/duration, supported reminders, and stock tracking/quantity/threshold. Required markers remain. Multiple stored schedules offer a schedule selector. Unsaved changes prompt on exit; the tab bar is hidden during editing.
- **Data/reminders:** Full edits commit atomically, keep medicine/schedule IDs and profile/status, reject stale stock, reconcile native alarms, and clear pending snoozes when their schedule changes. Schema v7 snapshots historical amount/time/form/unit before changes. Changing dose units prevents automatic undo from restoring stock in an incompatible unit. Existing reminder recurrence limitations remain explicit.
- **Files:** Shared medicine form and detail screen, new `EditMedicineScreen.tsx` and `/edit-medicine` route, tabs layout, database and notification manager implementations/types, database/notification tests, architecture documentation.
- **Status:** Implemented and browser verified; native Android notification delivery remains unverified.
- **Verification:** 58 automated tests passed, including full edits, transaction rollback, stale stock, foreign schedule rejection, retained history/other schedules, snoozes, and alarm replacement/recovery. Lint and typecheck passed. In-app browser testing created one labelled QA medicine, edited all major detail fields plus time/dose/weekdays/reminders/stock, saved and reloaded, then changed to every 3 days for 10 days and disabled stock. Verified required-weekday validation, reminder limitations, preserved saved values, and discarded edits. Fixed a browser text-node warning and edit-screen tab navigation discovered during testing. Phone-width layout visually inspected.
- **Test data:** `QA Full Edit Updated` remains in the local browser for inspection; no real medicine records were changed.
- **References:** [Expo 57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) and [Expo Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/).
