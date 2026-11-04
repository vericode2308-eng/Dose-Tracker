# Graph Report - DoseTrackerApp  (2026-11-03)

## Corpus Check
- 180 files · ~157,355 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 48 file(s) not represented in the graph (top: .log 35, (none) 4, .xml 4)

## Summary
- 1483 nodes · 3347 edges · 113 communities (68 shown, 45 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 133 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0c3a438`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- notificationManager.js
- profile.tsx
- Corrections log
- react
- AddMedicineScreen.tsx
- layout_issues
- DoseTracker Android guidebook
- database.js
- DoseTracker Settings and Android reminder architecture
- expo
- TodayHomeScreen.tsx
- Existing Expo / React Native App: Android to iOS Planning Prompt
- SettingsHomeScreen.tsx
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
- SETTINGS_ARCHITECTURE.md
- Icon
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
- Google Play policy audit — 2026-09-29
- reproduce.cjs
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
- SETTINGS_ARCHITECTURE.md
- Local medication reminders
- app/_layout.tsx
- 7. Privacy, export, and restoration
- DoseTracker local Android release checks
- expo-image@~58.0.18
- make_feature_graphic.swift
- main
- Landing-page image refresh — 25 October 2026
- Terms decisions requiring owner and counsel confirmation
- DoseTracker Terms: code evidence inventory
- Terms decisions requiring owner and counsel confirmation
- DoseTracker Terms: code evidence inventory
- expo-linking@~58.0.15
- expo-screen-capture
- CLAUDE.md
- 2026-10-02 — Tape Mark Calculator tab guidebook follow-up
- nativewind-env.d.ts
- expo-secure-store
- Tape Mark calculator: reclaim space after entry — 2 October 2026
- expo-status-bar
- expo-task-manager
- expo-build-properties@~58.0.11
- DoseTracker design system
- expo-haptics
- Findings requiring correction
- react-native-gesture-handler@~3.3.0
- expo-asset@~58.0.19
- expo-crypto
- expo-font@~58.0.11
- expo-document-picker
- react-native-worklets@0.13.0
- expo-sharing
- expo-system-ui
- @react-native-community/datetimepicker
- errors.d.ts
- SecurityManager.d.ts
- DATABASE_NAME
- ACTION_SKIP
- ACTION_SNOOZE
- ACTION_TAKE
- MEDICATION_CATEGORY
- MEDICATION_CHANNEL
- expo-image-picker

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 102 edges
2. `Corrections log` - 81 edges
3. `react-native` - 58 edges
4. `UserFacingError` - 40 edges
5. `react` - 38 edges
6. `AppText()` - 35 edges
7. `MedicineForm()` - 34 edges
8. `MedicineDetailScreen()` - 32 edges
9. `SettingsHomeScreen()` - 32 edges
10. `expo-router` - 31 edges

## Surprising Connections (you probably didn't know these)
- ``suppression_periods`` --references--> `archive()`  [INFERRED]
  PLAN.md → src/app/profile.tsx
- `2026-10-25 — Today: week strip and taking upcoming doses early` --references--> `fetchScheduledDosesForDates()`  [INFERRED]
  docs/CORRECTIONS_LOG.md → src/database.js
- `2. Build layouts around the usable mobile viewport` --references--> `NotificationLifecycle()`  [INFERRED]
  ANDROID_GUIDEBOOK.md → src/features/notifications/NotificationLifecycle.tsx
- `Additional hardening completed` --references--> `publicErrorMessage()`  [INFERRED]
  docs/SECURITY_LESSONS.md → src/features/security/errors.js
- `Senior UX & Engineering Scorecard` --references--> `SettingsHomeScreen()`  [INFERRED]
  ux_qa_audit_report.md → src/features/settings/SettingsHomeScreen.tsx

## Import Cycles
- None detected.

## Communities (113 total, 45 thin omitted)

### Community 0 - "notificationManager.js"
Cohesion: 0.06
Nodes (90): Reminders, Scheduling and timing flow, 🟡 P1-4: Android Notifications Lack Interactive Quick-Action Buttons, expo-file-system, expo-notifications, @expo/vector-icons, fetchAllMedicines(), fetchPendingSnoozes() (+82 more)

### Community 1 - "profile.tsx"
Cohesion: 0.06
Nodes (71): Onboarding artwork, 2026-10-20 — Onboarding follows dark mode (invisible diagnostics toggle labels), 2026-11-03 — Audit: Profile and Add Medicine screens did not scroll (regression from the keyboard fix), 2026-11-03 — Keyboard: Next/Save hidden behind it, and no easy way to close it, 1. Executive summary, 2. Root causes, 3. Native UI improvements, 4. Screen-by-screen QA (iOS Simulator) (+63 more)

### Community 2 - "Corrections log"
Cohesion: 0.03
Nodes (68): 2026-09-29 — 001: Make medicine strength optional, 2026-09-29 — 002: Sharpen the opening logo, 2026-09-29 — 003: Mark required details with an asterisk, 2026-09-29 — 004: Full medicine editing, 2026-09-29 — 005: Hide medicine-screen tabs and preserve the selected-tab pill, 2026-09-29 — 005: Multiple daily doses and reminder restrictions (investigation), 2026-09-29 — 006: Simple multiple-dose entry and default reminders, 2026-09-29 — 007: Make additional dose entry clearly optional (+60 more)

### Community 3 - "react"
Cohesion: 0.18
Nodes (13): expo-symbols, LockScreen(), ActionMenuItem, SFSymbol, ActionMenu(), AppText(), Button(), ButtonSize (+5 more)

### Community 4 - "AddMedicineScreen.tsx"
Cohesion: 0.06
Nodes (43): 2026-11-03 — Add/Edit Medicine: sheet did not close after Save, and Save could insert duplicates, react-native-svg@15.16.0, react-native-svg, fetchMedicineDetails(), medicineFromRow(), scheduleFromRow(), AddMedicineScreen(), Field() (+35 more)

### Community 5 - "layout_issues"
Cohesion: 0.07
Nodes (13): 2026-10-31 — Remove stale App Store and version claims from the studio-hosted landing/legal pages, check_apk(), headers(), layout_issues(), build(), capsule(), fn(), font() (+5 more)

### Community 6 - "DoseTracker Android guidebook"
Cohesion: 0.17
Nodes (12): 1. Start with the actual Expo version and app architecture, 2. Build layouts around the usable mobile viewport, 3. Make forms safe to leave and easy to correct, 4. Separate dose tracking from reminder intent, 5. Respect Android notification behavior, 6. Keep history and stock exact, 7. Polish should support clarity, 8. Verification before calling an issue resolved (+4 more)

### Community 7 - "database.js"
Cohesion: 0.14
Nodes (53): 2026-11-03 — Add Medicine: "Starts today" when the first dose is tomorrow, Connected screens, addMedicine(), changed(), changeDoseWithUndo(), clearDatabase(), DATABASE_NAME, deleteMedicine() (+45 more)

### Community 8 - "DoseTracker Settings and Android reminder architecture"
Cohesion: 0.33
Nodes (6): DoseTracker Settings and Android reminder architecture, Gaps and polish priorities, Optional diagnostics (removed 2026-10-23), Security remediation (2026-10-01), Storage map, Verification

### Community 9 - "expo"
Cohesion: 0.05
Nodes (37): backgroundColor, foregroundImage, adaptiveIcon, allowBackup, blockedPermissions, package, permissions, predictiveBackGestureEnabled (+29 more)

### Community 10 - "TodayHomeScreen.tsx"
Cohesion: 0.12
Nodes (18): 🔴 P0-2: Broken Dark Mode System Architecture & Misleading Appearance Radio Icons, AnimatedCircle, dayStatus(), parseDateKey(), ProfileToday(), card(), ProgressRing(), relativeTime() (+10 more)

### Community 11 - "Existing Expo / React Native App: Android to iOS Planning Prompt"
Cohesion: 0.05
Nodes (36): 10. Select useful Apple integrations, 11. Storage, backup, and moving data between platforms, 12. Links, sharing, files, and external services, 13. Localization and regional behavior, 14. Privacy and SDK audit, 15. Accounts, payments, ads, and review rules—only if applicable, 16. iOS builds, signing, and App Store preparation, 17. Verification and acceptance criteria (+28 more)

### Community 12 - "SettingsHomeScreen.tsx"
Cohesion: 0.18
Nodes (17): react, react-native, react-native-reanimated, openLegalUrl(), PRIVACY_URL, TERMS_URL, clearAuthEnabled(), SettingsHomeScreen() (+9 more)

### Community 13 - "DoseAlarmAccessModule.swift"
Cohesion: 0.11
Nodes (11): AlarmKit, AppIntents, CryptoKit, ExpoModulesCore, DoseAlarmAccessModule, DoseAlarmMetadata, DoseAlarmRequest, DoseAlarms (+3 more)

### Community 14 - "ThemeContext.tsx"
Cohesion: 0.11
Nodes (20): useAppLock(), DeviceAuthenticationSettingsScreen(), checkSupport(), DARK, LIGHT, SemanticColors, ThemeColors, ThemeContext (+12 more)

### Community 15 - "MedicineDetailScreen.tsx"
Cohesion: 0.13
Nodes (32): 2026-10-25 — Premium iOS design system, dark-mode fixes and native motion (Phases 1–2), Components, Navigation, useLocalQuery(), Medicine, dayLabel(), GroupCard(), MedicineDetailScreen() (+24 more)

### Community 16 - "package.json"
Cohesion: 0.09
Nodes (23): expo-constants@~58.0.14, expo-glass-effect@~58.0.5, expo-splash-screen@~58.0.12, @react-native-async-storage/async-storage@2.2.0, react-native-screens@~4.30.0, react-native-web@^0.21.4, tailwindcss@^3.4.17, devDependencies (+15 more)

### Community 17 - "useTheme"
Cohesion: 0.10
Nodes (29): 2026-10-22 — iOS migration: swipe-back guard, EAS iOS profile, Liquid Glass sheets, native context menu, react-native-safe-area-context, FilterMenu(), HistoryScreen(), pickerTime(), ProfileHistory(), Sheet, Status (+21 more)

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
Nodes (20): dependencies, expo-audio@~58.0.10, expo-file-system@~58.0.13, expo-local-authentication@~58.0.2, expo-notifications@~58.1.7, expo-router@~58.0.28, expo-sqlite@~58.0.14, expo-symbols@~58.0.4 (+12 more)

### Community 22 - "database.test.cjs"
Cohesion: 0.12
Nodes (9): assert, compile(), { DatabaseSync }, fs, harness(), adapter, { randomUUID }, test (+1 more)

### Community 23 - "database.d.ts"
Cohesion: 0.11
Nodes (17): DoseAction, DoseChangeInput, DoseChangeReceipt, DoseReference, HistoryRecord, LocalProfile, MedicineEditInput, MedicineInput (+9 more)

### Community 24 - "4. Target SQLite database design"
Cohesion: 0.12
Nodes (16): 4. Target SQLite database design, `dose_occurrences`, `dose_records`, `inventory_epochs`, `inventory_movements`, `medicines`, `notification_jobs`, `profiles` (+8 more)

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
Cohesion: 0.14
Nodes (10): config, { getDefaultConfig }, { withNativeWind }, expo@^58.0.21, nativewind@4.2.7, { withAppBuildGradle, withGradleProperties }, { withEntitlementsPlist }, { withAppDelegate, withInfoPlist } (+2 more)

### Community 31 - "build-brand-assets.cjs"
Cohesion: 0.19
Nodes (12): assets, crop, fs, nearestArtworkPoint(), out, path, { PNG }, render() (+4 more)

### Community 33 - "notificationManager.test.cjs"
Cohesion: 0.20
Nodes (8): assert, fs, harness(), medicine(), nativeResponse(), response(), test, ts

### Community 34 - "build-onboarding-art.cjs"
Cohesion: 0.18
Nodes (10): add(), background, destination, fs, input, neutral(), path, { PNG } (+2 more)

### Community 35 - "6. Checklist Summary"
Cohesion: 0.08
Nodes (24): 1. Security Posture Rating, 2. Critical And High Findings, 3. Quick Wins, 4. Prioritized Remediation Plan, 5. What's Already Done Right, 6. Checklist Summary, Compact verdicts, DoseTracker security audit — 2026-10-01 (+16 more)

### Community 37 - "SETTINGS_ARCHITECTURE.md"
Cohesion: 0.50
Nodes (4): Develop, Dose Tracker, Media and documentation, Verify

### Community 38 - "Icon"
Cohesion: 0.27
Nodes (10): 2026-10-25 — Native controls: menus, date pickers, grouped Settings (Phase 5), Architecture: which tool for what, IconTile(), ListRow(), ListSection(), Fallback, Icon(), IconName (+2 more)

### Community 41 - "settings-ringing.test.cjs"
Cohesion: 0.22
Nodes (6): typescript@~6.0.3, typescript, assert, fs, test, ts

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
Cohesion: 0.29
Nodes (6): Building with EAS, Commands, Current DoseTracker architecture, Expo has changed — do not trust your training data, Navigation & Routing, Rules

### Community 51 - "SQLite screen integration"
Cohesion: 0.29
Nodes (6): Automated verification, Browser workflow verified on 2026-09-26, Full medicine editor — 2026-09-29, Multiple dose times (2026-09-29), SQLite screen integration, Two History outcomes and end-of-day catch-up (2026-09-29)

### Community 52 - "Local profiles — implementation and verification"
Cohesion: 0.29
Nodes (6): Automated verification, Correction: keep all other active profiles visible, Implemented, In-app browser verification, Inline dashboard header refinement, Local profiles — implementation and verification

### Community 53 - "Google Play policy audit — 2026-09-29"
Cohesion: 0.20
Nodes (7): Correction update — 2026-09-29, Current release/legal update — 2026-10-03, Google Play policy audit — 2026-09-29, Original audit validation, Practices that appear aligned, Release requirements not verifiable from this repository, Verification after corrections

### Community 54 - "reproduce.cjs"
Cohesion: 0.29
Nodes (4): assert, fs, { spawnSync }, ts

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
Cohesion: 0.07
Nodes (37): Detailed Issue Logs & Actions Taken, DoseTracker App — Remediation Issues & Resolution Log, Independent verification update — 2026-09-27, Issue Registry, 🔴 P0-1: Catastrophic Button Viewport Overflow in Add Medicine Review Step, 🔴 P0-3: Android Hardware/Gesture Back Navigation Drops Entered Medicine Data, 🟡 P1-2: Manual Text Entry for Dates and Times Lacks Native Pickers, 🟡 P1-3: "Optional" Stock Step Fails Validation by Default (+29 more)

### Community 60 - "expo-router"
Cohesion: 0.22
Nodes (9): expo-router, HistoryLayout(), TabsLayout(), SettingsLayout(), unstable_settings, TodayLayout(), AppTabs(), isIOS26 (+1 more)

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

### Community 65 - "SETTINGS_ARCHITECTURE.md"
Cohesion: 0.22
Nodes (3): Android reminder emulator verification — 2026-10-02, Scope and limits, Android reminder presentation checks

### Community 66 - "Local medication reminders"
Cohesion: 0.40
Nodes (4): Android timing and builds, Implemented scope, Local medication reminders, Verification

### Community 67 - "app/_layout.tsx"
Cohesion: 0.13
Nodes (22): 2026-10-25 — Native navigation: native tabs, native headers, Add/Edit sheets (Phase 4), Every Settings item, Header and appearance, Privacy, data, and about, DatabaseGate(), RootLayout(), RootNavigator(), ThemedStatusBar() (+14 more)

### Community 68 - "7. Privacy, export, and restoration"
Cohesion: 0.40
Nodes (5): 7. Privacy, export, and restoration, CSV export, Full backup format, Privacy, Restore sequence

### Community 69 - "DoseTracker local Android release checks"
Cohesion: 0.20
Nodes (10): After approval: build and validate the exact artifact, Dependency audit limitation, DoseTracker local Android release checks, Earlier package artifact results — 2026-10-03, Fresh package rebuild — 2026-10-03, Initial preparation record (historical), Official technical references, Preparation evidence (+2 more)

### Community 72 - "main"
Cohesion: 0.67
Nodes (3): 2026-09-30 — Publish website and privacy updates, 2026-10-23 — Remove Sentry disclosures, iOS icon, App Store pack refresh, main()

### Community 85 - "Tape Mark calculator: reclaim space after entry — 2 October 2026"
Cohesion: 0.29
Nodes (7): Follow-up: Calculator tab returns to entry — 2 October 2026, Follow-up: units explained and History verified — 2 October 2026, Layout and accessibility lessons, Problem and accepted interaction, State, asynchronous work and regression lessons, Tape Mark calculator: reclaim space after entry — 2 October 2026, Verification and evidence boundaries

### Community 89 - "DoseTracker design system"
Cohesion: 0.33
Nodes (5): Color roles, DoseTracker design system, Motion rules (from the expo-animation skill), Text styles, Where things live

### Community 91 - "Findings requiring correction"
Cohesion: 0.40
Nodes (5): 1. High — remote diagnostics contradict privacy promises, 2. High — privacy notice is incomplete, 3. Medium — absolute reminder and stock claims, 4. Medium — unnecessary permissions appear in generated configuration, Findings requiring correction

## Knowledge Gaps
- **14 isolated node(s):** `CryptoKit`, `ExpoModulesCore`, `AlarmKit`, `AppIntents`, `SwiftUI` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 684 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Corrections log` connect `Corrections log` to `SETTINGS_ARCHITECTURE.md`, `profile.tsx`, `app/_layout.tsx`, `AddMedicineScreen.tsx`, `layout_issues`, `Icon`, `database.js`, `main`, `MedicineDetailScreen.tsx`, `useTheme`, `2026-10-02 — Tape Mark Calculator tab guidebook follow-up`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useTheme()` (e.g. with `2026-10-20 — Onboarding follows dark mode (invisible diagnostics toggle labels)` and `🔴 P0-2: Broken Dark Mode System Architecture & Misleading Appearance Radio Icons`) actually correct?**
  _`useTheme()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CryptoKit`, `ExpoModulesCore`, `AlarmKit` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `notificationManager.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05695644507141598 - nodes in this community are weakly interconnected._
- **Why does `Scheduling and timing flow` connect `notificationManager.js` to `DoseTracker Settings and Android reminder architecture`, `AlarmAccessReceiver.kt`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.058363858363858365 - nodes in this community are weakly interconnected._
- **Why does `useTheme()` connect `useTheme` to `notificationManager.js`, `profile.tsx`, `app/_layout.tsx`, `AddMedicineScreen.tsx`, `react`, `Icon`, `TodayHomeScreen.tsx`, `SettingsHomeScreen.tsx`, `ThemeContext.tsx`, `MedicineDetailScreen.tsx`, `DoseTracker — Senior Android Developer & UX/QA Audit Report`, `DateTimePickers.tsx`, `expo-router`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._