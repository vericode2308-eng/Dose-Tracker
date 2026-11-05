# Graph Report - DoseTrackerApp  (2026-11-05)

## Corpus Check
- 192 files · ~166,771 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 47 file(s) not represented in the graph (top: .log 35, (none) 4, .xml 4)

## Summary
- 1549 nodes · 3450 edges · 118 communities (74 shown, 44 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 134 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf02595f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- notificationManager.js
- profile.tsx
- Corrections log
- SettingsHomeScreen.tsx
- AddMedicineScreen.tsx
- layout_issues
- Google Play policy audit — 2026-09-29
- DatePickerField
- Existing Expo / React Native App: Premium Android Polish Prompt
- expo
- TodayHomeScreen.tsx
- Existing Expo / React Native App: Android to iOS Planning Prompt
- SettingsHomeScreen
- DoseAlarmAccessModule.swift
- ThemeContext.tsx
- MedicineDetailScreen.tsx
- package.json
- useTheme
- 3. Field-by-field answer tables
- DoseTracker — Senior Android Developer & UX/QA Audit Report
- project.yml
- dependencies
- database.test.cjs
- database.d.ts
- 4. Target SQLite database design
- security.test.cjs
- DoseTracker Privacy Policy — Android & iOS
- DoseTracker Privacy Policy — Android & iOS
- DoseTracker Terms of Service
- DoseNotificationsService.kt
- expo
- build-brand-assets.cjs
- notificationManager.test.cjs
- build-onboarding-art.cjs
- 6. Checklist Summary
- DoseAlarmAccessModule.kt
- AppLock.tsx
- AppText
- AlarmAccessReceiver.kt
- RingingCheck
- settings-ringing.test.cjs
- DoseTracker — Product and Implementation Plan
- 5. Target scheduling and notification logic
- app.js
- DoseTracker Terms and Use Information
- DoseTracker Terms and Use Information
- StopRingingReceiver.kt
- scripts
- tsconfig.json
- AGENTS.md
- SQLite screen integration
- Local profiles — implementation and verification
- app/_layout.tsx
- DoseTracker Android guidebook
- Security corrections and lessons — 2026-10-01
- eslint.config.js
- 3. Functional requirements
- 9. Validation and acceptance criteria
- DateTimePickers.tsx
- expo-router
- Delete DoseTracker Data
- Delete DoseTracker Data
- 6. Screen definitions and target additions
- 8. Implementation sequence
- 2026-10-02/README.md
- Local medication reminders
- DoseTracker Settings and Android reminder architecture
- 7. Privacy, export, and restoration
- DoseTracker security audit — 2026-10-01
- expo-image@~58.0.18
- make_feature_graphic.swift
- main
- Landing-page image refresh — 25 October 2026
- Terms decisions requiring owner and counsel confirmation
- DoseTracker Terms: code evidence inventory
- Terms decisions requiring owner and counsel confirmation
- DoseTracker Terms: code evidence inventory
- DoseTracker local Android release checks
- Tape Mark calculator: reclaim space after entry — 2 October 2026
- CLAUDE.md
- 2026-10-02 — Tape Mark Calculator tab guidebook follow-up
- nativewind-env.d.ts
- interface
- useTheme
- tailwind.config.js
- expo-status-bar
- auto-commit.sh
- DoseTracker design system
- Detailed Issue Logs & Actions Taken
- ProfilesProvider
- expo-sqlite
- react-dom@19.3.0
- AppTabs.tsx
- expo-build-properties@~58.0.11
- typescript
- expo-constants@~58.0.14
- expo-crypto
- expo-glass-effect
- expo-system-ui
- expo-linking@~58.0.15
- errors.d.ts
- SecurityManager.d.ts
- DATABASE_NAME
- ACTION_SKIP
- ACTION_SNOOZE
- ACTION_TAKE
- MEDICATION_CATEGORY
- MEDICATION_CHANNEL
- react-native-screens@~4.30.0
- tailwindcss@^3.4.17
- expo-font@~58.0.11
- expo-screen-capture
- expo-splash-screen@~58.0.12
- expo-task-manager

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 110 edges
2. `Corrections log` - 85 edges
3. `react-native` - 62 edges
4. `UserFacingError` - 40 edges
5. `react` - 39 edges
6. `AppText()` - 37 edges
7. `MedicineForm()` - 35 edges
8. `SettingsHomeScreen()` - 33 edges
9. `MedicineDetailScreen()` - 32 edges
10. `expo-router` - 31 edges

## Surprising Connections (you probably didn't know these)
- `2026-10-25 — Today: week strip and taking upcoming doses early` --references--> `fetchScheduledDosesForDates()`  [INFERRED]
  docs/CORRECTIONS_LOG.md → src/database.js
- `2. Build layouts around the usable mobile viewport` --references--> `NotificationLifecycle()`  [INFERRED]
  ANDROID_GUIDEBOOK.md → src/features/notifications/NotificationLifecycle.tsx
- `Privacy, data, and about` --references--> `AppLock()`  [INFERRED]
  docs/SETTINGS_ARCHITECTURE.md → src/features/security/AppLock.tsx
- `Additional hardening completed` --references--> `publicErrorMessage()`  [INFERRED]
  docs/SECURITY_LESSONS.md → src/features/security/errors.js
- `Senior UX & Engineering Scorecard` --references--> `SettingsHomeScreen()`  [INFERRED]
  ux_qa_audit_report.md → src/features/settings/SettingsHomeScreen.tsx

## Import Cycles
- None detected.

## Communities (118 total, 44 thin omitted)

### Community 0 - "notificationManager.js"
Cohesion: 0.06
Nodes (115): 2026-09-29 — 005: Multiple daily doses and reminder restrictions (investigation), 2026-11-03 — Add Medicine: "Starts today" when the first dose is tomorrow, Connected screens, Reminders, 🟡 P1-4: Android Notifications Lack Interactive Quick-Action Buttons, 🔵 P2-3: Missing Ability to Undo Logged Doses from Today and History, expo-notifications, addMedicine() (+107 more)

### Community 1 - "profile.tsx"
Cohesion: 0.07
Nodes (61): Onboarding artwork, 2026-10-20 — Onboarding follows dark mode (invisible diagnostics toggle labels), 2026-11-03 — Audit: Profile and Add Medicine screens did not scroll (regression from the keyboard fix), 2026-11-03 — Keyboard: Next/Save hidden behind it, and no easy way to close it, 1. Executive summary, 2. Root causes, 3. Native UI improvements, 4. Screen-by-screen QA (iOS Simulator) (+53 more)

### Community 2 - "Corrections log"
Cohesion: 0.03
Nodes (67): 2026-09-29 — 001: Make medicine strength optional, 2026-09-29 — 002: Sharpen the opening logo, 2026-09-29 — 003: Mark required details with an asterisk, 2026-09-29 — 004: Full medicine editing, 2026-09-29 — 005: Hide medicine-screen tabs and preserve the selected-tab pill, 2026-09-29 — 006: Simple multiple-dose entry and default reminders, 2026-09-29 — 007: Make additional dose entry clearly optional, 2026-09-29 — 008: Separate Today dose cards (+59 more)

### Community 3 - "SettingsHomeScreen.tsx"
Cohesion: 0.16
Nodes (14): 2026-10-31 — Point legal links at the VeriCode studio website, @expo/ui@~58.0.25, @expo/ui, react, react-native, react-native-safe-area-context, openLegalUrl(), PRIVACY_URL (+6 more)

### Community 4 - "AddMedicineScreen.tsx"
Cohesion: 0.07
Nodes (38): 2026-11-03 — Add/Edit Medicine: sheet did not close after Save, and Save could insert duplicates, 🔵 P2-1: Missing Tactile/Haptic Feedback on User Actions, `suppression_periods`, archive(), AddMedicineScreen(), Field(), formatTime(), FREQUENCIES (+30 more)

### Community 5 - "layout_issues"
Cohesion: 0.07
Nodes (13): 2026-10-31 — Remove stale App Store and version claims from the studio-hosted landing/legal pages, check_apk(), headers(), layout_issues(), build(), capsule(), fn(), font() (+5 more)

### Community 6 - "Google Play policy audit — 2026-09-29"
Cohesion: 0.17
Nodes (12): 1. High — remote diagnostics contradict privacy promises, 2. High — privacy notice is incomplete, 3. Medium — absolute reminder and stock claims, 4. Medium — unnecessary permissions appear in generated configuration, Correction update — 2026-09-29, Current release/legal update — 2026-10-03, Findings requiring correction, Google Play policy audit — 2026-09-29 (+4 more)

### Community 7 - "DatePickerField"
Cohesion: 0.33
Nodes (12): 3. Make forms safe to leave and easy to correct, 2026-10-25 — Native controls: menus, date pickers, grouped Settings (Phase 5), Architecture: which tool for what, Components, 🟡 P1-2: Manual Text Entry for Dates and Times Lacks Native Pickers, DatePickerField(), InlinePickerRow(), InlineTextButton() (+4 more)

### Community 8 - "Existing Expo / React Native App: Premium Android Polish Prompt"
Cohesion: 0.05
Nodes (37): 10. Implementation milestones after approval, 11. Definition of done and final handoff, 12. Final audit cautions, 1. Scope and non-negotiable safeguards, 2. App brief and working rules, 3. Phase 1 — Repository audit and real baselines, 4. Native-first hybrid architecture, 5. Material 3 Expressive visual direction (+29 more)

### Community 9 - "expo"
Cohesion: 0.05
Nodes (37): backgroundColor, foregroundImage, adaptiveIcon, allowBackup, blockedPermissions, package, permissions, predictiveBackGestureEnabled (+29 more)

### Community 10 - "TodayHomeScreen.tsx"
Cohesion: 0.10
Nodes (21): react-native-reanimated@4.7.1, react-native-reanimated, AnimatedCircle, dayStatus(), parseDateKey(), relativeTime(), time(), DayStatus (+13 more)

### Community 11 - "Existing Expo / React Native App: Android to iOS Planning Prompt"
Cohesion: 0.05
Nodes (36): 10. Select useful Apple integrations, 11. Storage, backup, and moving data between platforms, 12. Links, sharing, files, and external services, 13. Localization and regional behavior, 14. Privacy and SDK audit, 15. Accounts, payments, ads, and review rules—only if applicable, 16. iOS builds, signing, and App Store preparation, 17. Verification and acceptance criteria (+28 more)

### Community 12 - "SettingsHomeScreen"
Cohesion: 0.09
Nodes (37): 2026-10-23 — Remove Sentry and optional diagnostics; EAS iOS build preparation, Scheduling and timing flow, expo-file-system, NotificationLifecycle(), reconcile(), clearAuthEnabled(), exportPreferences(), importPreferences() (+29 more)

### Community 13 - "DoseAlarmAccessModule.swift"
Cohesion: 0.11
Nodes (11): AlarmKit, AppIntents, CryptoKit, ExpoModulesCore, DoseAlarmAccessModule, DoseAlarmMetadata, DoseAlarmRequest, DoseAlarms (+3 more)

### Community 14 - "ThemeContext.tsx"
Cohesion: 0.14
Nodes (15): DARK, LIGHT, SemanticColors, ThemeColors, ThemeContext, ThemeContextType, ThemeMode, TextTone (+7 more)

### Community 15 - "MedicineDetailScreen.tsx"
Cohesion: 0.14
Nodes (28): 2026-10-25 — Premium iOS design system, dark-mode fixes and native motion (Phases 1–2), useMedicines(), dayLabel(), GroupCard(), MedicineDetailScreen(), confirmArchive(), confirmDelete(), remove() (+20 more)

### Community 16 - "package.json"
Cohesion: 0.11
Nodes (18): expo-asset@~58.0.19, expo-document-picker@~58.0.4, expo-haptics@~58.0.7, expo-image-picker@~58.0.10, expo-sharing@~58.0.21, @react-native-async-storage/async-storage@2.2.0, react-native-gesture-handler@~3.3.0, main (+10 more)

### Community 17 - "useTheme"
Cohesion: 0.13
Nodes (22): 2026-10-22 — iOS migration: swipe-back guard, EAS iOS profile, Liquid Glass sheets, native context menu, 2026-10-25 — History and Settings: empty top space, overflowing History filters, 2026-11-03 — Settings/History: scroll overlap fix, header kept in the header row, useLocalQuery(), FilterMenu(), HistoryScreen(), pickerTime(), ProfileHistory() (+14 more)

### Community 18 - "3. Field-by-field answer tables"
Cohesion: 0.08
Nodes (23): 1. Readiness verdict, 2. Final recommended listing copy, 3.10 Conditional requirements, 3.1 App record and identity, 3.2 App information, 3.3 Localized version information, 3.4 Media, 3.5 Review information (+15 more)

### Community 19 - "DoseTracker — Senior Android Developer & UX/QA Audit Report"
Cohesion: 0.08
Nodes (23): 1. Executive Summary & UX Scorecard, 2. Critical Defects & UX Blockers (Severity P0), 3. High-Priority UX & Usability Gaps (Severity P1), 4. Medium-Priority Polish & Micro-Interactions (Severity P2), 5. Android Architecture & Platform Compliance Review, 6. Actionable Implementation Roadmap, ⚠️ Areas for Android Native Hardening, DoseTracker — Senior Android Developer & UX/QA Audit Report (+15 more)

### Community 20 - "project.yml"
Cohesion: 0.09
Nodes (22): activation_command, activation_command_timeout, added_modes, default_modes, encoding, excluded_tools, fixed_tools, ignore_all_files_in_gitignore (+14 more)

### Community 21 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, expo-audio@~58.0.10, expo-file-system@~58.0.13, expo-local-authentication@~58.0.2, expo-notifications@~58.1.7, expo-router@~58.0.28, expo-secure-store@~58.0.2, expo-symbols@~58.0.4 (+13 more)

### Community 22 - "database.test.cjs"
Cohesion: 0.12
Nodes (9): assert, compile(), { DatabaseSync }, fs, harness(), adapter, { randomUUID }, test (+1 more)

### Community 23 - "database.d.ts"
Cohesion: 0.11
Nodes (17): DoseAction, DoseChangeInput, DoseChangeReceipt, DoseReference, HistoryRecord, LocalProfile, MedicineEditInput, MedicineInput (+9 more)

### Community 24 - "4. Target SQLite database design"
Cohesion: 0.13
Nodes (15): 4. Target SQLite database design, `dose_occurrences`, `dose_records`, `inventory_epochs`, `inventory_movements`, `medicines`, `notification_jobs`, `profiles` (+7 more)

### Community 25 - "security.test.cjs"
Cohesion: 0.15
Nodes (11): assert, backupHarness(), compile(), errors, fs, model, onboardingHarness(), profile (+3 more)

### Community 26 - "DoseTracker Privacy Policy — Android & iOS"
Cohesion: 0.13
Nodes (14): Android and iOS device backups, Android permissions and reminders, Changes and contact, Children and dependent profiles, DoseTracker Privacy Policy — Android & iOS, Earlier Android releases, How to request deletion, Information stored on your device (+6 more)

### Community 27 - "DoseTracker Privacy Policy — Android & iOS"
Cohesion: 0.13
Nodes (14): Android and iOS device backups, Android permissions and reminders, Changes and contact, Children and dependent profiles, DoseTracker Privacy Policy — Android & iOS, Earlier Android releases, How to request deletion, Information stored on your device (+6 more)

### Community 28 - "DoseTracker Terms of Service"
Cohesion: 0.13
Nodes (14): 10. Changes to the App or these Terms, 11. Governing law and disputes, 12. Contact, 1. Acceptance and scope, 2. Who may use the App, 3. Medication information and reminders, 4. Your data, profiles, and device access, 5. Appropriate use (+6 more)

### Community 29 - "DoseNotificationsService.kt"
Cohesion: 0.22
Nodes (3): Repeating reminder sound (2026-10-02), DoseNotificationsService, RingingPresentationDelegate

### Community 30 - "expo"
Cohesion: 0.12
Nodes (11): config, { getDefaultConfig }, { withNativeWind }, expo@^58.0.21, nativewind@4.2.7, { withAppBuildGradle, withGradleProperties }, { withEntitlementsPlist }, { withPodfile } (+3 more)

### Community 31 - "build-brand-assets.cjs"
Cohesion: 0.19
Nodes (12): assets, crop, fs, nearestArtworkPoint(), out, path, { PNG }, render() (+4 more)

### Community 33 - "notificationManager.test.cjs"
Cohesion: 0.22
Nodes (8): assert, fs, harness(), medicine(), nativeResponse(), response(), test, ts

### Community 34 - "build-onboarding-art.cjs"
Cohesion: 0.18
Nodes (10): add(), background, destination, fs, input, neutral(), path, { PNG } (+2 more)

### Community 35 - "6. Checklist Summary"
Cohesion: 0.18
Nodes (11): 6. Checklist Summary, Compact verdicts, Reproduction and release follow-up, Section 1 — Environment Variables And Secret Management, Section 2 — Database Security, Section 3 — Authentication And Session Management, Section 4 — Server-Side Validation, Section 5 — Dependency And Package Security (+3 more)

### Community 37 - "AppLock.tsx"
Cohesion: 0.26
Nodes (10): AppLock(), isInBackground(), LockContext, LockContextValue, protectPreviews(), useAppLock(), authenticateUser(), checkSupport() (+2 more)

### Community 38 - "AppText"
Cohesion: 0.16
Nodes (22): DeviceAuthenticationSettingsScreen(), change(), LockScreen(), ProfileToday(), card(), ProgressRing(), WeekStrip(), AppText() (+14 more)

### Community 41 - "settings-ringing.test.cjs"
Cohesion: 0.14
Nodes (8): assert, fs, { spawnSync }, ts, assert, fs, test, ts

### Community 42 - "DoseTracker — Product and Implementation Plan"
Cohesion: 0.22
Nodes (9): 10. Technical references, 1. Product definition, 2. Visual direction and interaction principles, Current implementation snapshot (September 2026), DoseTracker — Product and Implementation Plan, Explicit exclusions, Required refinements, Technology (+1 more)

### Community 43 - "5. Target scheduling and notification logic"
Cohesion: 0.22
Nodes (9): 5. Target scheduling and notification logic, Delivery eligibility, Main flow, Module interfaces, Notification actions, Ownership, Permission handling, Recovery (+1 more)

### Community 45 - "DoseTracker Terms and Use Information"
Cohesion: 0.25
Nodes (7): DoseTracker Terms and Use Information, Health and medical limitations, Local data, exports and ending use, Privacy and device security, Questions and changes, Reminders and stock, Who the app is for

### Community 46 - "DoseTracker Terms and Use Information"
Cohesion: 0.25
Nodes (7): DoseTracker Terms and Use Information, Health and medical limitations, Local data, exports and ending use, Privacy and device security, Questions and changes, Reminders and stock, Who the app is for

### Community 48 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, ios, lint, postinstall, start, test, web

### Community 49 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 50 - "AGENTS.md"
Cohesion: 0.14
Nodes (10): Building with EAS, Commands, Current DoseTracker architecture, Expo has changed — do not trust your training data, Navigation & Routing, Rules, Develop, Dose Tracker (+2 more)

### Community 51 - "SQLite screen integration"
Cohesion: 0.29
Nodes (6): Automated verification, Browser workflow verified on 2026-09-26, Full medicine editor — 2026-09-29, Multiple dose times (2026-09-29), SQLite screen integration, Two History outcomes and end-of-day catch-up (2026-09-29)

### Community 52 - "Local profiles — implementation and verification"
Cohesion: 0.29
Nodes (6): Automated verification, Correction: keep all other active profiles visible, Implemented, In-app browser verification, Inline dashboard header refinement, Local profiles — implementation and verification

### Community 53 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (15): 🔴 P0-2: Broken Dark Mode System Architecture & Misleading Appearance Radio Icons, DatabaseGate(), RootLayout(), RootNavigator(), ThemedStatusBar(), unstable_settings, subscribeToDatabaseChanges(), Medicine (+7 more)

### Community 54 - "DoseTracker Android guidebook"
Cohesion: 0.18
Nodes (11): 1. Start with the actual Expo version and app architecture, 2. Build layouts around the usable mobile viewport, 4. Separate dose tracking from reminder intent, 5. Respect Android notification behavior, 6. Keep history and stock exact, 7. Polish should support clarity, 8. Verification before calling an issue resolved, 9. Maintain an honest issue log (+3 more)

### Community 55 - "Security corrections and lessons — 2026-10-01"
Cohesion: 0.29
Nodes (7): Additional hardening completed, Lessons to preserve, Relevant source and tests, Required native/release follow-up, Security corrections and lessons — 2026-10-01, Verification record, What changed

### Community 56 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): { defineConfig }, expoConfig, eslint@^9, eslint-config-expo@~58.0.4, eslint, eslint-config-expo

### Community 57 - "3. Functional requirements"
Cohesion: 0.29
Nodes (7): 3. Functional requirements, Dose actions, Inventory, Medicines, Profiles, Schedule types, Status and progress rules

### Community 58 - "9. Validation and acceptance criteria"
Cohesion: 0.29
Nodes (7): 9. Validation and acceptance criteria, Database and mutation tests, Notification tests, Recurrence tests, Required completion checks, UI and privacy tests, Validation performed so far

### Community 59 - "DateTimePickers.tsx"
Cohesion: 0.10
Nodes (24): @react-native-community/datetimepicker@9.2.1, @react-native-community/datetimepicker, COMMON_TIME_PRESETS, openPicker(), DatePickerFieldProps, DatePickerModal(), handleConfirm(), isDateDisabled() (+16 more)

### Community 60 - "expo-router"
Cohesion: 0.21
Nodes (10): 2026-10-25 — Native navigation: native tabs, native headers, Add/Edit sheets (Phase 4), Navigation, expo-router, HistoryLayout(), SettingsLayout(), unstable_settings, TodayLayout(), BottomOverlay() (+2 more)

### Community 61 - "Delete DoseTracker Data"
Cohesion: 0.33
Nodes (5): Delete DoseTracker Data, Delete records on your device, Privacy and contact, Request deletion of support emails, What is retained

### Community 62 - "Delete DoseTracker Data"
Cohesion: 0.33
Nodes (5): Delete DoseTracker Data, Delete records on your device, Privacy and contact, Request deletion of support emails, What is retained

### Community 63 - "6. Screen definitions and target additions"
Cohesion: 0.33
Nodes (6): 6. Screen definitions and target additions, Forms and secondary screens, Main screens, Navigation structure, Required states, Settings defaults

### Community 64 - "8. Implementation sequence"
Cohesion: 0.33
Nodes (6): 8. Implementation sequence, Phase 1 — Foundation and reminder feasibility, Phase 2 — Persistence and domain behavior, Phase 3 — Primary screens, Phase 4 — Reliability and privacy, Phase 5 — Release preparation

### Community 65 - "2026-10-02/README.md"
Cohesion: 0.22
Nodes (3): Android reminder emulator verification — 2026-10-02, Scope and limits, Android reminder presentation checks

### Community 66 - "Local medication reminders"
Cohesion: 0.40
Nodes (4): Android timing and builds, Implemented scope, Local medication reminders, Verification

### Community 67 - "DoseTracker Settings and Android reminder architecture"
Cohesion: 0.33
Nodes (6): DoseTracker Settings and Android reminder architecture, Gaps and polish priorities, Optional diagnostics (removed 2026-10-23), Security remediation (2026-10-01), Storage map, Verification

### Community 68 - "7. Privacy, export, and restoration"
Cohesion: 0.40
Nodes (5): 7. Privacy, export, and restoration, CSV export, Full backup format, Privacy, Restore sequence

### Community 69 - "DoseTracker security audit — 2026-10-01"
Cohesion: 0.15
Nodes (13): 1. Security Posture Rating, 2. Critical And High Findings, 3. Quick Wins, 4. Prioritized Remediation Plan, 5. What's Already Done Right, DoseTracker security audit — 2026-10-01, Executed verification, Finding #1 — Incomplete environment-file ignore rules (+5 more)

### Community 72 - "main"
Cohesion: 0.67
Nodes (3): 2026-09-30 — Publish website and privacy updates, 2026-10-23 — Remove Sentry disclosures, iOS icon, App Store pack refresh, main()

### Community 78 - "DoseTracker local Android release checks"
Cohesion: 0.20
Nodes (10): After approval: build and validate the exact artifact, Dependency audit limitation, DoseTracker local Android release checks, Earlier package artifact results — 2026-10-03, Fresh package rebuild — 2026-10-03, Initial preparation record (historical), Official technical references, Preparation evidence (+2 more)

### Community 79 - "Tape Mark calculator: reclaim space after entry — 2 October 2026"
Cohesion: 0.29
Nodes (7): Follow-up: Calculator tab returns to entry — 2 October 2026, Follow-up: units explained and History verified — 2 October 2026, Layout and accessibility lessons, Problem and accepted interaction, State, asynchronous work and regression lessons, Tape Mark calculator: reclaim space after entry — 2 October 2026, Verification and evidence boundaries

### Community 83 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 84 - "useTheme"
Cohesion: 0.17
Nodes (16): @expo/vector-icons@^15.0.2, @expo/vector-icons, FORMS, InputCard(), Label(), MedicineDetailsForm(), MedicineIcon(), Props (+8 more)

### Community 85 - "tailwind.config.js"
Cohesion: 0.50
Nodes (3): fontSize, px(), theme

### Community 88 - "DoseTracker design system"
Cohesion: 0.33
Nodes (5): Color roles, DoseTracker design system, Motion rules (from the expo-animation skill), Text styles, Where things live

### Community 89 - "Detailed Issue Logs & Actions Taken"
Cohesion: 0.17
Nodes (11): Detailed Issue Logs & Actions Taken, DoseTracker App — Remediation Issues & Resolution Log, Independent verification update — 2026-09-27, Issue Registry, 🔴 P0-1: Catastrophic Button Viewport Overflow in Add Medicine Review Step, 🔴 P0-3: Android Hardware/Gesture Back Navigation Drops Entered Medicine Data, 🟡 P1-3: "Optional" Stock Step Fails Validation by Default, 🟡 P1-5: Settings Status Toast Lacks Auto-Dismiss Timeout (+3 more)

### Community 90 - "ProfilesProvider"
Cohesion: 0.50
Nodes (4): Every Settings item, Header and appearance, Privacy, data, and about, ProfilesProvider()

### Community 95 - "typescript"
Cohesion: 0.29
Nodes (7): devDependencies, patch-package@^8.0.1, @types/react@~19.3.0, typescript@~6.0.3, patch-package, @types/react, typescript

## Knowledge Gaps
- **14 isolated node(s):** `CryptoKit`, `ExpoModulesCore`, `AlarmKit`, `AppIntents`, `SwiftUI` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 725 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Corrections log` connect `Corrections log` to `notificationManager.js`, `2026-10-02/README.md`, `profile.tsx`, `SettingsHomeScreen.tsx`, `AddMedicineScreen.tsx`, `layout_issues`, `DatePickerField`, `main`, `SettingsHomeScreen`, `MedicineDetailScreen.tsx`, `2026-10-02 — Tape Mark Calculator tab guidebook follow-up`, `useTheme`, `expo-router`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useTheme()` (e.g. with `2026-10-20 — Onboarding follows dark mode (invisible diagnostics toggle labels)` and `🔴 P0-2: Broken Dark Mode System Architecture & Misleading Appearance Radio Icons`) actually correct?**
  _`useTheme()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CryptoKit`, `ExpoModulesCore`, `AlarmKit` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `notificationManager.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06123831459151877 - nodes in this community are weakly interconnected._
- **Why does `Scheduling and timing flow` connect `SettingsHomeScreen` to `notificationManager.js`, `DoseTracker Settings and Android reminder architecture`, `AlarmAccessReceiver.kt`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07313738892686261 - nodes in this community are weakly interconnected._
- **Why does `useTheme()` connect `useTheme` to `profile.tsx`, `SettingsHomeScreen.tsx`, `AddMedicineScreen.tsx`, `AppText`, `DatePickerField`, `TodayHomeScreen.tsx`, `SettingsHomeScreen`, `ThemeContext.tsx`, `MedicineDetailScreen.tsx`, `useTheme`, `DoseTracker — Senior Android Developer & UX/QA Audit Report`, `app/_layout.tsx`, `ProfilesProvider`, `DateTimePickers.tsx`, `expo-router`, `AppTabs.tsx`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._