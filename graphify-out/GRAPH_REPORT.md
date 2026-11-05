# Graph Report - DoseTrackerApp  (2026-11-05)

## Corpus Check
- 191 files · ~166,097 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 47 file(s) not represented in the graph (top: .log 35, (none) 4, .xml 4)

## Summary
- 1546 nodes · 3433 edges · 110 communities (69 shown, 41 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 133 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2df1075d`
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
- Existing Expo / React Native App: Premium Android Polish Prompt
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
- react-native
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
- useTheme
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
- 2026-10-02/README.md
- Local medication reminders
- AppLock.tsx
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
- expo-linking@~58.0.15
- 4. Prioritized Remediation Plan
- CLAUDE.md
- 2026-10-02 — Tape Mark Calculator tab guidebook follow-up
- nativewind-env.d.ts
- interface
- tailwind.config.js
- expo-status-bar
- auto-commit.sh
- expo-build-properties@~58.0.11
- expo-constants@~58.0.14
- expo-local-authentication
- expo-sqlite
- react-dom@19.3.0
- react-native-screens@~4.30.0
- react-native-web@^0.21.4
- expo-document-picker
- expo-file-system
- expo-system-ui
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
1. `useTheme()` - 108 edges
2. `Corrections log` - 84 edges
3. `react-native` - 61 edges
4. `UserFacingError` - 40 edges
5. `react` - 38 edges
6. `AppText()` - 35 edges
7. `MedicineForm()` - 34 edges
8. `SettingsHomeScreen()` - 33 edges
9. `MedicineDetailScreen()` - 32 edges
10. `expo-router` - 31 edges

## Surprising Connections (you probably didn't know these)
- `2026-10-25 — Today: week strip and taking upcoming doses early` --references--> `fetchScheduledDosesForDates()`  [INFERRED]
  docs/CORRECTIONS_LOG.md → src/database.js
- `2026-11-03 — Add Medicine: "Starts today" when the first dose is tomorrow` --references--> `firstEligibleOccurrence()`  [INFERRED]
  docs/CORRECTIONS_LOG.md → src/features/doses/occurrences.js
- `2. Build layouts around the usable mobile viewport` --references--> `NotificationLifecycle()`  [INFERRED]
  ANDROID_GUIDEBOOK.md → src/features/notifications/NotificationLifecycle.tsx
- `Header and appearance` --references--> `ProfilesProvider()`  [INFERRED]
  docs/SETTINGS_ARCHITECTURE.md → src/features/profiles/context.tsx
- `Additional hardening completed` --references--> `publicErrorMessage()`  [INFERRED]
  docs/SECURITY_LESSONS.md → src/features/security/errors.js

## Import Cycles
- None detected.

## Communities (110 total, 41 thin omitted)

### Community 0 - "notificationManager.js"
Cohesion: 0.06
Nodes (87): Reminders, Scheduling and timing flow, 🟡 P1-4: Android Notifications Lack Interactive Quick-Action Buttons, expo-notifications, fetchAllMedicines(), fetchMedicineDetails(), fetchPendingSnoozes(), medicineFromRow() (+79 more)

### Community 1 - "profile.tsx"
Cohesion: 0.07
Nodes (63): Onboarding artwork, 2026-10-20 — Onboarding follows dark mode (invisible diagnostics toggle labels), 2026-11-03 — Audit: Profile and Add Medicine screens did not scroll (regression from the keyboard fix), 2026-11-03 — Keyboard: Next/Save hidden behind it, and no easy way to close it, 1. Executive summary, 2. Root causes, 3. Native UI improvements, 4. Screen-by-screen QA (iOS Simulator) (+55 more)

### Community 2 - "Corrections log"
Cohesion: 0.03
Nodes (72): 2026-09-29 — 001: Make medicine strength optional, 2026-09-29 — 002: Sharpen the opening logo, 2026-09-29 — 003: Mark required details with an asterisk, 2026-09-29 — 004: Full medicine editing, 2026-09-29 — 005: Hide medicine-screen tabs and preserve the selected-tab pill, 2026-09-29 — 005: Multiple daily doses and reminder restrictions (investigation), 2026-09-29 — 006: Simple multiple-dose entry and default reminders, 2026-09-29 — 007: Make additional dose entry clearly optional (+64 more)

### Community 3 - "react"
Cohesion: 0.30
Nodes (8): expo-symbols, react, ActionMenuItem, SFSymbol, ActionMenu(), GlassSheetSurface(), useReduceTransparency(), Sheet()

### Community 4 - "AddMedicineScreen.tsx"
Cohesion: 0.08
Nodes (40): 2026-11-03 — Add/Edit Medicine: sheet did not close after Save, and Save could insert duplicates, 🔵 P2-1: Missing Tactile/Haptic Feedback on User Actions, react-native-svg@15.16.0, react-native-svg, AddMedicineScreen(), Field(), formatTime(), FREQUENCIES (+32 more)

### Community 5 - "layout_issues"
Cohesion: 0.07
Nodes (13): 2026-10-31 — Remove stale App Store and version claims from the studio-hosted landing/legal pages, check_apk(), headers(), layout_issues(), build(), capsule(), fn(), font() (+5 more)

### Community 6 - "DoseTracker Android guidebook"
Cohesion: 0.05
Nodes (40): 1. Start with the actual Expo version and app architecture, 2. Build layouts around the usable mobile viewport, 4. Separate dose tracking from reminder intent, 5. Respect Android notification behavior, 6. Keep history and stock exact, 7. Polish should support clarity, 8. Verification before calling an issue resolved, 9. Maintain an honest issue log (+32 more)

### Community 7 - "database.js"
Cohesion: 0.14
Nodes (52): Connected screens, addMedicine(), changed(), changeDoseWithUndo(), clearDatabase(), DATABASE_NAME, deleteMedicine(), doseChangeSnapshot() (+44 more)

### Community 8 - "Existing Expo / React Native App: Premium Android Polish Prompt"
Cohesion: 0.05
Nodes (37): 10. Implementation milestones after approval, 11. Definition of done and final handoff, 12. Final audit cautions, 1. Scope and non-negotiable safeguards, 2. App brief and working rules, 3. Phase 1 — Repository audit and real baselines, 4. Native-first hybrid architecture, 5. Material 3 Expressive visual direction (+29 more)

### Community 9 - "expo"
Cohesion: 0.05
Nodes (37): backgroundColor, foregroundImage, adaptiveIcon, allowBackup, blockedPermissions, package, permissions, predictiveBackGestureEnabled (+29 more)

### Community 10 - "TodayHomeScreen.tsx"
Cohesion: 0.11
Nodes (22): react-native-reanimated, AnimatedCircle, dayStatus(), parseDateKey(), ProfileToday(), card(), ProgressRing(), relativeTime() (+14 more)

### Community 11 - "Existing Expo / React Native App: Android to iOS Planning Prompt"
Cohesion: 0.05
Nodes (36): 10. Select useful Apple integrations, 11. Storage, backup, and moving data between platforms, 12. Links, sharing, files, and external services, 13. Localization and regional behavior, 14. Privacy and SDK audit, 15. Accounts, payments, ads, and review rules—only if applicable, 16. iOS builds, signing, and App Store preparation, 17. Verification and acceptance criteria (+28 more)

### Community 12 - "SettingsHomeScreen.tsx"
Cohesion: 0.14
Nodes (15): 2026-10-31 — Point legal links at the VeriCode studio website, Navigation, openLegalUrl(), PRIVACY_URL, TERMS_URL, useAppLock(), DeviceAuthenticationSettingsScreen(), checkSupport() (+7 more)

### Community 13 - "DoseAlarmAccessModule.swift"
Cohesion: 0.11
Nodes (11): AlarmKit, AppIntents, CryptoKit, ExpoModulesCore, DoseAlarmAccessModule, DoseAlarmMetadata, DoseAlarmRequest, DoseAlarms (+3 more)

### Community 14 - "ThemeContext.tsx"
Cohesion: 0.13
Nodes (16): DARK, LIGHT, SemanticColors, ThemeColors, ThemeContext, ThemeContextType, ThemeMode, TextTone (+8 more)

### Community 15 - "MedicineDetailScreen.tsx"
Cohesion: 0.12
Nodes (32): 2026-10-25 — Premium iOS design system, dark-mode fixes and native motion (Phases 1–2), Components, Medicine, MedicinesContext, MedicinesContextValue, MedicinesProvider(), todayKey(), useMedicines() (+24 more)

### Community 16 - "package.json"
Cohesion: 0.08
Nodes (25): expo-audio@~58.0.10, expo-font@~58.0.11, expo-screen-capture@~58.0.6, expo-task-manager@~58.0.12, @react-native-async-storage/async-storage@2.2.0, react-native-gesture-handler@~3.3.0, react-native-worklets@0.13.0, tailwindcss@^3.4.17 (+17 more)

### Community 17 - "useTheme"
Cohesion: 0.12
Nodes (23): @expo/vector-icons, subscribeToDatabaseChanges(), useLocalQuery(), FilterMenu(), HistoryScreen(), pickerTime(), ProfileHistory(), Sheet (+15 more)

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
Cohesion: 0.09
Nodes (23): dependencies, expo-asset@~58.0.19, expo-crypto@~58.0.7, expo-glass-effect@~58.0.5, expo-haptics@~58.0.7, expo-notifications@~58.1.7, expo-router@~58.0.28, expo-secure-store@~58.0.2 (+15 more)

### Community 22 - "database.test.cjs"
Cohesion: 0.12
Nodes (9): assert, compile(), { DatabaseSync }, fs, harness(), adapter, { randomUUID }, test (+1 more)

### Community 23 - "database.d.ts"
Cohesion: 0.11
Nodes (17): DoseAction, DoseChangeInput, DoseChangeReceipt, DoseReference, HistoryRecord, LocalProfile, MedicineEditInput, MedicineInput (+9 more)

### Community 24 - "4. Target SQLite database design"
Cohesion: 0.12
Nodes (17): 4. Target SQLite database design, `dose_occurrences`, `dose_records`, `inventory_epochs`, `inventory_movements`, `medicines`, `notification_jobs`, `profiles` (+9 more)

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
Cohesion: 0.20
Nodes (8): assert, fs, harness(), medicine(), nativeResponse(), response(), test, ts

### Community 34 - "build-onboarding-art.cjs"
Cohesion: 0.18
Nodes (10): add(), background, destination, fs, input, neutral(), path, { PNG } (+2 more)

### Community 35 - "6. Checklist Summary"
Cohesion: 0.18
Nodes (11): 6. Checklist Summary, Compact verdicts, Reproduction and release follow-up, Section 1 — Environment Variables And Secret Management, Section 2 — Database Security, Section 3 — Authentication And Session Management, Section 4 — Server-Side Validation, Section 5 — Dependency And Package Security (+3 more)

### Community 37 - "SETTINGS_ARCHITECTURE.md"
Cohesion: 0.33
Nodes (4): Develop, Dose Tracker, Media and documentation, Verify

### Community 38 - "react-native"
Cohesion: 0.17
Nodes (18): react-native, ButtonSize, ButtonVariant, SIZES, VARIANTS, IconTile(), ListRow(), Fallback (+10 more)

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
Cohesion: 0.20
Nodes (6): Building with EAS, Commands, Current DoseTracker architecture, Expo has changed — do not trust your training data, Navigation & Routing, Rules

### Community 51 - "SQLite screen integration"
Cohesion: 0.29
Nodes (6): Automated verification, Browser workflow verified on 2026-09-26, Full medicine editor — 2026-09-29, Multiple dose times (2026-09-29), SQLite screen integration, Two History outcomes and end-of-day catch-up (2026-09-29)

### Community 52 - "Local profiles — implementation and verification"
Cohesion: 0.29
Nodes (6): Automated verification, Correction: keep all other active profiles visible, Implemented, In-app browser verification, Inline dashboard header refinement, Local profiles — implementation and verification

### Community 53 - "useTheme"
Cohesion: 0.15
Nodes (20): 🔴 P0-2: Broken Dark Mode System Architecture & Misleading Appearance Radio Icons, @expo/ui, DatabaseGate(), RootLayout(), RootNavigator(), ThemedStatusBar(), unstable_settings, Row() (+12 more)

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
Cohesion: 0.06
Nodes (49): 3. Make forms safe to leave and easy to correct, 2026-10-25 — Native controls: menus, date pickers, grouped Settings (Phase 5), Architecture: which tool for what, Color roles, DoseTracker design system, Motion rules (from the expo-animation skill), Text styles, Where things live (+41 more)

### Community 60 - "expo-router"
Cohesion: 0.10
Nodes (13): 2026-10-25 — Native navigation: native tabs, native headers, Add/Edit sheets (Phase 4), expo-router, HistoryLayout(), TabsLayout(), SettingsLayout(), unstable_settings, TodayLayout(), AppTabs() (+5 more)

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
Cohesion: 0.40
Nodes (3): Android reminder emulator verification — 2026-10-02, Scope and limits, Android reminder presentation checks

### Community 66 - "Local medication reminders"
Cohesion: 0.40
Nodes (4): Android timing and builds, Implemented scope, Local medication reminders, Verification

### Community 67 - "AppLock.tsx"
Cohesion: 0.14
Nodes (17): DoseTracker Settings and Android reminder architecture, Every Settings item, Gaps and polish priorities, Header and appearance, Optional diagnostics (removed 2026-10-23), Privacy, data, and about, Security remediation (2026-10-01), Storage map (+9 more)

### Community 68 - "7. Privacy, export, and restoration"
Cohesion: 0.40
Nodes (5): 7. Privacy, export, and restoration, CSV export, Full backup format, Privacy, Restore sequence

### Community 69 - "DoseTracker security audit — 2026-10-01"
Cohesion: 0.29
Nodes (7): 1. Security Posture Rating, 2. Critical And High Findings, 3. Quick Wins, 5. What's Already Done Right, DoseTracker security audit — 2026-10-01, Executed verification, Scope, architecture, and evidence limits

### Community 72 - "main"
Cohesion: 0.67
Nodes (3): 2026-09-30 — Publish website and privacy updates, 2026-10-23 — Remove Sentry disclosures, iOS icon, App Store pack refresh, main()

### Community 79 - "4. Prioritized Remediation Plan"
Cohesion: 0.33
Nodes (6): 4. Prioritized Remediation Plan, Finding #1 — Incomplete environment-file ignore rules, Finding #2 — Notification actions bypass the optional app lock, Finding #3 — Malformed deep-link queries reach a vulnerable decoder, Finding #4 — Tightening notification privacy leaves old content visible, Finding #5 — Onboarding retains a stale duplicate of profile information

### Community 83 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 85 - "tailwind.config.js"
Cohesion: 0.50
Nodes (3): fontSize, px(), theme

### Community 98 - "expo-file-system"
Cohesion: 0.33
Nodes (6): expo-file-system@~58.0.13, expo-sharing@~58.0.21, expo-file-system, expo-sharing, exportPreferences(), exportBackup()

## Knowledge Gaps
- **14 isolated node(s):** `CryptoKit`, `ExpoModulesCore`, `AlarmKit`, `AppIntents`, `SwiftUI` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 725 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Corrections log` connect `Corrections log` to `profile.tsx`, `AddMedicineScreen.tsx`, `SETTINGS_ARCHITECTURE.md`, `layout_issues`, `main`, `SettingsHomeScreen.tsx`, `MedicineDetailScreen.tsx`, `2026-10-02 — Tape Mark Calculator tab guidebook follow-up`, `DateTimePickers.tsx`, `expo-router`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useTheme()` (e.g. with `2026-10-20 — Onboarding follows dark mode (invisible diagnostics toggle labels)` and `🔴 P0-2: Broken Dark Mode System Architecture & Misleading Appearance Radio Icons`) actually correct?**
  _`useTheme()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CryptoKit`, `ExpoModulesCore`, `AlarmKit` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `notificationManager.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06053683609366076 - nodes in this community are weakly interconnected._
- **Why does `useTheme()` connect `useTheme` to `notificationManager.js`, `profile.tsx`, `react`, `AddMedicineScreen.tsx`, `react-native`, `TodayHomeScreen.tsx`, `SettingsHomeScreen.tsx`, `ThemeContext.tsx`, `MedicineDetailScreen.tsx`, `useTheme`, `DoseTracker — Senior Android Developer & UX/QA Audit Report`, `DateTimePickers.tsx`, `expo-router`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07025316455696203 - nodes in this community are weakly interconnected._
- **Why does `Scheduling and timing flow` connect `notificationManager.js` to `AppLock.tsx`, `AlarmAccessReceiver.kt`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._