# Existing Expo / React Native App: Android to iOS Planning Prompt

**Use case:** An existing Expo / React Native app is already published on Google Play. Extend that same product to iOS and prepare it for the App Store while protecting the working Android app.

**Updated:** 22 October 2026. Companion to IOS_APP_STARTER_PROMPT.md. Includes the shared-code development standard and Apple's iPhone Duo guidance.

Open the existing repository in your AI coding tool, attach this file, fill in what you know in the brief, and start in planning mode. The coder should discover technical details from the repository instead of asking you to supply them. These are areas to assess, not instructions to implement every Apple feature.

---

## Copyable master prompt

You are my senior Expo / React Native engineer, iOS integration engineer, and mobile UX reviewer.

My app was designed primarily for Android and is already published on Google Play. I now want a polished, reliable iOS version for the App Store, maintained alongside Android.

Inspect the existing app before proposing changes. Preserve its purpose, branding, useful features, data, and Android release compatibility. Keep Expo and React Native as the main stack. Reuse business logic and appropriate UI; introduce platform-specific UI, native modules, or extensions only where justified.

Begin with a repository audit and concrete migration plan. Do not implement app changes in this first phase. Do not default to rebuilding the app in SwiftUI, replacing its architecture, or upgrading every dependency.

### App brief

- App name and purpose: [fill in]
- Existing repository/workspace: [current project or path]
- Google Play listing: [optional URL]
- Core journeys that must keep working: [fill in, or discover and confirm]
- Known iOS issues or previous iOS build attempts: [if any]
- iOS-specific additions I want: [if any; otherwise recommend selectively]
- Visual references: [existing screens or references]
- Target: [iPhone, including iPhone Duo; specify whether native iPad support is also wanted]
- Data behavior: [existing local-only / cloud / mixed / inspect]
- Monetization: [existing free / ads / purchases / subscriptions / inspect]
- Languages and regions: [existing or planned]
- Apple Developer Program membership: [available / not yet / unknown]
- Available Mac, Xcode, iPhone, and test devices: [known details]
- Build preference: [local Xcode / EAS Cloud / existing workflow / recommend]
- Constraints and explicit non-goals: [fill in]

If unspecified, retain the current feature set and data behavior, prioritize iPhone including iPhone Duo compatibility, and propose the smallest maintainable adaptation. Do not add accounts, cloud sync, analytics, advertising, subscriptions, or a backend just to launch on iOS.

### Working rules

- Read project instructions and inspect the actual code and configuration. Distinguish verified findings from assumptions.
- Research current official Apple, Expo, React Native, and selected library documentation. Use documentation matching the installed SDK; a feature in the latest docs may not exist in this project.
- Separate Apple submission requirements, platform limitations, UX recommendations, and optional enhancements.
- Classify each item as **Required for this app**, **Useful later**, or **Not applicable**. “Required” may mean a core functional requirement; identify when it is an Apple rule.
- Ask at most five consequential questions together if the answers change scope or architecture. Infer routine choices and state sensible defaults.
- Be efficient: inspect relevant files, summarize evidence with paths, avoid repeated repository dumps, and recommend focused changes.
- Record OS/package availability and source-check dates. Do not assume device capabilities from a model name.
- Where tools, credentials, code, or real hardware are unavailable, identify exactly what remains unverified.

## 1. Audit the current project and Android baseline

Inventory:

- Expo SDK, React Native, React, TypeScript, package manager/lockfile, routing/navigation, UI libraries, state management, and storage.
- App configuration, config plugins, native modules, ios/android directories, CocoaPods configuration, build scripts, CI, and EAS configuration if present.
- Which native directories are generated and which are maintained manually. Identify custom native changes before running generation commands.
- Android application ID, release version, signing arrangement, storage schema, release build process, and update mechanism. Inspect credential references without printing secrets.
- Existing iOS bundle identifier, targets, deployment target, signing, capabilities, and build status, if present.
- Every screen and core flow, including empty, failure, offline, loading, and permission-denied states.
- Dependencies/services that lack iOS support, need extra setup, use an experimental API, or have incompatible native requirements.
- Android assumptions: hardware Back handling, ToastAndroid, Android-only permissions/intents, notification channels, foreground services, exact alarms, public storage paths, APK sharing, Play billing/review links, and Android-only UI copy.

Produce an evidence-based compatibility table:

| Existing feature or dependency | Current Android behavior | iOS support/gap | Proposed adaptation | Shared-code impact | Priority |
|---|---|---|---|---|---|

Do not declare the app iOS-ready because it opens in Expo Go or compiles.

## 2. Keep one codebase and protect the published Android app

Maintain one repository and one shared Expo / React Native application. Use TypeScript for new work when consistent with the project; do not turn the port into an unrelated wholesale JavaScript conversion.

Two native outputs—Android APK/AAB and an iOS app/archive/IPA—do not require two copies of the source. The android and ios directories contain native projects/configuration, not duplicate sets of React Native screens.

Use this default allocation:

| App area | Default approach |
|---|---|
| Screens, task/item cards, add/edit/delete flows | Shared components and workflows |
| Models, validation, business rules, state, persistence contracts | Shared; adapt storage internals only if necessary |
| Brand tokens, most layout, reusable UI | Shared with responsive layout and justified platform adjustments |
| Custom tabs and navigation configuration | Shared where adequate; separate implementations are not automatic |
| Notifications, permissions, alarms | Shared service interface; use a cross-platform API or isolate real differences |
| Widgets, Live Activities, native APIs | Shared domain data with supported platform presentations/configuration |
| Signing, platform capabilities, store metadata | Separate native-target configuration |

Prefer the same component/API when it already handles both platforms. Use small Platform checks for simple differences and .ios.ts/.android.ts or .ios.tsx/.android.tsx files for meaningful implementation differences. Keep shared interfaces so callers do not need to know the platform.

Do not duplicate whole screens because one control behaves differently. Keep feature outcomes consistent; when exact parity is impossible, explain the limitation and propose a suitable alternative instead of silently omitting functionality.

### Preserve Android continuity

- Preserve Android application ID, signing credentials, release ownership, and existing user data. Do not substitute Apple signing for Android signing.
- Work on an isolated branch or equivalent safe change set. Preserve unrelated work and make changes reviewable.
- Keep shared business rules and schemas compatible. Explain the Android impact of any SDK, dependency, storage, navigation, or shared-style change.
- Prefer small platform adapters and .ios/.android files where behavior differs. Avoid scattering platform checks through every component.
- Distinguish necessary adaptation from optional redesign. Preserve the product's recognizable identity while adopting iOS conventions.
- Keep Android smoke tests and data-upgrade checks in the plan. An iOS change to shared code must not silently break the next Play Store update.
- If remote JavaScript updates exist, inspect platform targeting, channels, runtime versions, and rollback. Do not send incompatible changes to published Android installations.

## 3. Choose the Expo/native implementation route

- Retain the current Expo workflow unless a concrete limitation justifies changing it.
- Verify each dependency against the installed Expo SDK, React Native architecture, minimum iOS version, and Xcode toolchain. Recommend only necessary upgrades, with their Android impact.
- Use Expo-compatible package versions. Audit native linking, config plugins, entitlements, and privacy manifests.
- If using Continuous Native Generation, represent repeatable native configuration in app config/config plugins. Keep custom module source outside disposable generated output.
- If native projects are maintained manually, preserve that workflow until a deliberate migration is planned. Do not run prebuild over customized projects blindly.
- In particular, do not run a broad prebuild --clean without checking what it will delete. If generation is appropriate, scope it to iOS where possible and review changes outside the ios directory too.
- Identify the source of truth for each native setting. An app-config edit may not update a manually maintained Xcode project.
- Use a development build for custom native dependencies and final integration testing. Treat Expo Go as an early convenience only.
- Explain which edits require a new native binary. JavaScript updates cannot add native capabilities or missing native code.
- Prefer maintained Expo APIs when sufficient; use a compatible native library or a small Expo Module when necessary. Do not assume every Apple API is exposed by Expo.

## 4. Audit every screen for iOS interaction

For each screen, specify what stays, what changes, and why.

- Use appropriate stacks, tab bars, sheets, action sheets, menus, alerts, pickers, toggles, and share interfaces. Assess the stability and SDK support of proposed Expo Router native tabs or Expo UI components.
- Preserve existing Expo Router navigation when present. If another router is already working, justify any migration rather than making it a prerequisite for iOS.
- Choose explicitly between a shared custom tab bar and system-native tabs. A custom-styled tab bar can remain one component; it is not inherently a WebView or a non-native app. Preserve its design, accessibility, state, and safe-area behavior. Native tabs may provide useful automatic platform adaptations; verify them in this SDK and on Duo.
- Do not use WebViews to recreate ordinary app screens or navigation.
- Provide expected Back navigation and swipe-back behavior. A flow must not depend on Android's hardware/system Back button.
- Define sheet dismissal, cancel/save behavior, preservation of unsaved edits, and sensible destructive-action confirmation or undo.
- Respect safe areas, the Home indicator, status bars, cutouts, and available window size. Avoid fixed dimensions based on one simulator.
- Keep the primary action visible and reachable. Reduce oversized cards, redundant summaries, excessive modal steps, and nested scrolling. Preserve scrolling for long content and larger text.
- Check keyboard avoidance, scrolling to focused fields, appropriate keyboard types, input formatting, password/autofill behavior, validation, and an accessible way to finish/dismiss input. Numeric keyboards may need an explicit Done control.
- Make first-use and empty states useful; keep nonessential onboarding skippable.
- Preserve brand colors and typography while testing iOS font metrics, line height, shadows, clipping, and control sizing.
- Support system light/dark appearance and consistent semantic colors.
- Use Liquid Glass selectively where supported and appropriate. Verify the actual component/API and provide readable fallbacks for older systems and accessibility settings; do not make glass a requirement for every content card.

## 5. iPhone Duo and changing window sizes

Read Apple's linked Duo preparation guidance and apply it to the actual React Native/native stack. Separate basic compatibility from enhanced adaptive behavior. Do not create a second “Duo app,” duplicate the screen tree, or force iPad support solely to recognize a wider iPhone window.

### Toolchain and compatibility

Apple currently distinguishes builds using iOS 26-or-earlier, iOS 27, and iOS 27.1-or-later SDKs: their available display area and bar behavior differ. Its current Duo page points to Xcode 27.1 for the full simulator experience. Verify these requirements against the installed Expo SDK, dependencies, and build environment before proposing an upgrade. Building with a newer SDK does not by itself require dropping all older supported iOS versions.

### Adaptive layout in the shared code

- React to current window/container dimensions throughout use. In React Native, prefer useWindowDimensions and measured container layouts where appropriate; audit Dimensions values captured once at module load.
- Remove model-name, fixed screen-size, and “phone always narrow/tablet always wide” layout assumptions. Use available space and actual layout capabilities.
- Choose breakpoints around content needs, and reuse the same components when changing column counts or introducing a list/detail arrangement. Do not merely stretch cards across the inner display.
- Preserve the selected record/tab, back stack, scroll position, edits, and active operations through size changes. Folding during an edit must not discard a draft or submit it twice.
- Audit native modules for main-screen sizing and stale scene geometry. Treat orientation restrictions as something to test, not a way to avoid resizing.
- Handle top, bottom, leading, and trailing safe-area insets independently. Check that the installed safe-area and navigation libraries update correctly.

### Bars, folds, and reserved areas

- System navigation containers can rearrange bars vertically on supported Duo configurations. Custom React Native tab bars do not automatically gain that behavior. Test the chosen navigation approach for overlap, reachable controls, labels, and overflow.
- Keep important controls clear of system UI, cameras, and active fold regions. Standard safe-area padding alone may not cover every custom layout need.
- For advanced fold-aware layouts, check supported native reserved-region/arrangement APIs and the actual Expo/library bridge. Provide a reasonable fallback; do not invent JavaScript APIs or hard-code a camera/hinge rectangle.
- Keep continuous lists stable and scrollable rather than relocating the whole list whenever the device folds. Use additional space for meaningful content.
- Hinge angle is for optional interactions/effects, not the basis of layout geometry. Assess expo-hinge only if useful and compatible; current documentation requires iOS/Xcode 27.1+ for its iOS hinge updates. Handle unavailable/null readings and differing Android semantics.

### Multitasking, scenes, and testing

Support resizing when sharing the display with another app. Assess multiple windows and simultaneous-display features separately; do not add them automatically. If multiple scenes are supported, keep scene-specific navigation separate from shared durable data and prevent duplicated actions.

Test the outer display, fully open inner display, partially folded configurations, rotations, and Split View sizes in the compatible Duo simulator. Repeat with keyboard/sheets open, large text, both themes, and stateful actions in progress. Record what still needs physical-device verification. Apple's App Resizability skill can supplement the audit when available, but it does not replace React Native-specific review.

Acceptance: the app adapts without clipped essential content, lost work, overlapping controls, or duplicate side effects. Claim Duo optimization and prepare corresponding store assets only after verifying the relevant behavior.

## 6. Accessibility, animation, and haptics

- Support system text scaling/Dynamic Type, including large accessibility sizes. Audit custom Text wrappers and font-scaling limits instead of disabling scaling to protect a layout.
- Aim for comfortable touch targets, generally at least 44 × 44 points for primary controls, including icon-only actions.
- Test VoiceOver labels, roles, values, state changes, reading order, modal focus, and accessible alternatives to swipe/drag gestures.
- Do not communicate status only through color, motion, audio, or vibration. Check contrast in both themes.
- Respect Reduce Motion, Reduce Transparency, and relevant contrast settings. Use React Native accessibility APIs or supported native integration.
- Use restrained animations and semantic haptics for meaningful actions. Avoid double feedback from custom code and native controls.
- Test haptics on physical hardware. Allow silent/no-haptic fallback, and do not promise custom foreground haptic sequences while the app is suspended or terminated.

## 7. Lifecycle and background behavior

- Define behavior when backgrounded, locked, interrupted, suspended, terminated by the system, force-quit by the user, relaunched, rebooted, and upgraded, where relevant.
- Save important user changes promptly. Do not rely on a termination callback or an in-memory React store for durable state.
- Treat Android background services and alarms as features needing a separate iOS design. Do not assume a JavaScript interval or background task will keep executing.
- Use documented background mechanisms only for appropriate work. Background scheduling and silent push are not guaranteed exact-time execution.
- For time-based logic, persist suitable timestamps/durations and reconstruct state. Define pause/resume, missed deadlines, clock changes, time zones, daylight-saving transitions, and midnight behavior as relevant.
- Keep completion/actions idempotent: foreground recovery, notification actions, and extension interactions must not create duplicate records.
- For networked features, define timeouts, retries, cancellation, offline recovery, and request deduplication. Avoid unnecessary polling and battery use.
- Specify behavior when Background App Refresh is disabled or Low Power Mode affects available work.

## 8. Notifications and reminders: design the iOS behavior explicitly

Do this assessment if notifications exist or support the app's core job. Do not copy Android settings unchanged.

### Choose the mechanism

- Distinguish device-scheduled local notifications from remote push through APNs. A local reminder does not need a push server.
- For push, verify iOS capabilities, APNs credentials/environment, device-token lifecycle, delivery provider, and backend handling. Android FCM configuration alone is insufficient.
- If using the Expo Push Service, verify its setup for this project's SDK and credentials; keep server credentials out of the app.
- Separate ordinary reminders, ongoing Live Activities, and genuine alarms. They are different mechanisms.
- If the core use case requires a system alarm, assess AlarmKit on supported iOS versions, authorization, an available Expo/native integration, and fallback. Do not promise alarm behavior from ordinary notifications.
- Consider time-sensitive or critical alerts only where justified and permitted. Critical alerts require special Apple authorization/entitlement; neither setting is a general workaround for user preferences.

### Permission and user control

- Request notification permission when its benefit is clear, usually when enabling a reminder, rather than automatically at launch.
- Handle not-determined, denied, authorized, and provisional states where applicable. Inspect iOS-specific authorization settings, not only a generic boolean.
- Do not repeatedly request a permission that the system will no longer prompt for. Provide a clear Settings route and recheck when returning.
- Keep the core app useful if reminders are refused where possible. Distinguish a reminder preference from effective system authorization.
- Treat banner, sound, badge, Focus, Scheduled Summary, and Lock Screen preferences as user-controlled. Do not guarantee delivery time, audibility, or presentation.

### Scheduling, interaction, and recovery

- Give scheduled requests stable identifiers. Define create/edit/delete, snooze, completion, cancellation, and deduplication behavior.
- Cancel or replace stale requests when the underlying record changes. Removing a reminder must not leave a future alert behind.
- Verify current pending-request limits and schedule a suitable bounded horizon if necessary. Explain what happens if the app is not reopened to replenish it.
- Define local-time versus elapsed-time semantics, repeat rules, travel/time-zone changes, daylight saving, and missed reminders.
- Define foreground behavior to avoid duplicate banners and in-app feedback.
- Configure notification categories/actions where useful; do not assume Android channels map directly to iOS.
- Route taps/actions correctly while already open, backgrounded, and cold-starting. Wait for storage/navigation readiness, validate payloads, and handle deleted records gracefully.
- Specify badge meaning and clearing, custom-sound packaging if needed, and privacy-safe Lock Screen text.
- Test authorization changes, notifications disabled, locked phone, Focus, foreground/background/closed states, edit/delete, repeated taps, and offline conditions. Test push separately in development and distribution builds when used.

## 9. Permissions, capabilities, and native configuration

Create a matrix for permissions actually needed:

| Feature | iOS permission/capability | Why needed | Request moment | Purpose text/config | Denied or limited behavior | Settings recovery | Android effect |
|---|---|---|---|---|---|---|---|

- Audit camera, microphone, photos, location, contacts, Calendar, Bluetooth, Face ID, notifications, tracking, and any other access used by the code or SDKs.
- Use accurate, specific iOS purpose strings; replace boilerplate where needed. Add only documented keys required by the actual APIs.
- Prefer system photo/document pickers and narrower access when sufficient. Handle limited/restricted access and cancellation.
- Request additional/background access only when essential. Explain the benefit before requesting sensitive access.
- Distinguish runtime permission, Info.plist purpose text, entitlements, and Developer Portal capabilities; one does not replace the others.
- Verify the resolved native project and signed build contain the intended configuration, including extension targets. Remove unused permissions and unjustified background modes.
- Evaluate Face ID/Touch ID only where an app lock or authentication adds value, with an appropriate fallback and recovery path.

## 10. Select useful Apple integrations

Evaluate these individually; do not implement the whole table automatically.

| Integration | When it helps | What the plan must establish |
|---|---|---|
| Home/Lock Screen widgets | Frequent glanceable information or a short action | Supported widget families, state sharing, refresh policy, empty/stale states, tap destinations |
| Live Activities / Dynamic Island | A bounded ongoing event | OS/device support, start/update/end rules, stale/dismissed state, privacy, fallback |
| Shortcuts / App Intents / Siri / system controls | Repeated actions outside the app | Supported actions, parameters, native integration, authentication, confirmation for consequential actions |
| Spotlight/system search | Finding valuable app records | Indexed content, privacy, removal of deleted items, deep-link destination |
| Share sheet and Files import/export | Moving user-created content | Supported formats, validation, cancellation, export safety, cross-platform compatibility |
| Share extension | Receiving content from other apps | Real need for a separate target, shared data, signing, resource limits |
| Native pickers, camera, location, Calendar, HealthKit, Bluetooth | A core feature needs system data/hardware | Least access, supported APIs, background limits, denied state |
| Biometrics | Protecting sensitive content | Fallback, credential storage, lock timing, recovery |
| App icon quick actions and system review request | A useful shortcut or appropriate feedback point | Routing and availability; no rating rewards or gating |
| iCloud/CloudKit, Apple Watch, App Clips, other platforms | A justified extension of the product | Separate scope, native support, privacy, cost, and maintenance |

For every selected integration, report its user benefit, required OS/hardware, package/native approach, maturity, entitlements, build impact, fallback, acceptance criteria, and Android implications.

Check the installed SDK before choosing Expo implementations. Current Expo documentation includes native UI components, widgets, and Live Activities, but availability and limitations vary by version. Do not assume handwritten Swift is always necessary, or that a React Native screen can simply be rendered inside a widget.

For extensions, plan target identifiers/signing and App Groups where needed. Define shared state, atomic updates, conflict handling, and reconciliation when the main app next opens. An extension must not depend on the app's in-memory React state.

Widget refresh is system-managed. A Live Activity does not keep the app running. Plan honest stale-state behavior, end/dismissal rules, and restricted updates. Check supported light/dark, tinted/accented, Always-On, and Lock Screen appearances without exposing private content.

## 11. Storage, backup, and moving data between platforms

- Keep the existing persistence solution if suitable; do not replace it with SwiftData solely because iOS is being added.
- Audit SQLite/AsyncStorage/file use, migrations, errors, stable record IDs, concurrent writes, and interrupted saves. Never silently reset the database after a migration failure.
- Replace Android public-storage assumptions with appropriate iOS sandbox, Files picker, and sharing behavior. Avoid persisting temporary absolute paths as durable identifiers.
- Distinguish local storage, operating-system backups, explicit exports, and cloud sync. “Offline” does not automatically mean data is excluded from iCloud device backups.
- For valuable user data, assess backup/export/import. Validate file versions and contents; define merge/replace and recovery behavior.
- An Android installation's local data does not automatically appear on an iPhone. If transfer matters, plan a compatible export/import or justified sync path.
- Store secrets in Keychain/SecureStore rather than ordinary preferences. Account for platform differences: iOS Keychain data may survive uninstall/reinstall, but this is not a guaranteed backup mechanism.
- Define logout/delete/reset behavior explicitly; do not rely on uninstall to erase credentials.
- Review data protection when the phone is locked, especially for background tasks and extensions. Keep private content and tokens out of logs and unnecessary app-switcher previews.

## 12. Links, sharing, files, and external services

- Audit URL schemes, universal links, notification routes, widget routes, login callbacks, and shared-content entry points.
- Validate incoming parameters/files; handle unauthenticated states, missing/deleted records, malformed input, and repeated events.
- Ensure cold-start links work after persistence and navigation initialization.
- Where used, configure Associated Domains and website association correctly. Use platform-appropriate store, review, support, and settings links.
- Check network security, platform API keys, OAuth bundle-ID registration, and backend allowlists. Do not weaken transport security globally to make a development endpoint work.
- For media/audio features, assess native audio-session behavior, interruptions, route changes, silent mode, and background playback only when relevant.

## 13. Localization and regional behavior

- Keep the existing React Native localization approach if suitable. Do not mandate Swift String Catalogs for all JavaScript UI.
- Localize native purpose strings and extension/system-facing text through the appropriate native resources/configuration.
- Use locale-aware dates, numbers, units, plurals, currency, and 12/24-hour time. Keep stored values independent of display formatting.
- Accommodate longer text and right-to-left layout where supported. Recheck icons, swipe gestures, and input behavior.
- Do not claim untested languages, devices, accessibility features, or offline behavior in the store listing.

## 14. Privacy and SDK audit

- Inventory actual data access, collection, network transmission, retention, and sharing by the app and every SDK.
- Distinguish functional offline use from zero network activity. Audit analytics, crash reporting, ads, push services, and update services if present.
- Prepare accurate App Store privacy answers and an accessible privacy policy, including a link inside the app.
- Inspect privacy manifests and required-reason APIs for the app and dependencies. Offline apps can still need declarations.
- Do not paste generic required-reason codes without verifying that they truthfully match the implementation. Check applicable SDK signature requirements and the final archive.
- Use App Tracking Transparency only when the actual tracking behavior requires it; handle refusal without inappropriate gating.
- Keep permission strings, privacy policy, store disclosures, and runtime behavior consistent.

## 15. Accounts, payments, ads, and review rules—only if applicable

- If accounts can be created, assess Apple's in-app account-deletion requirements and the complete deletion flow.
- If third-party/social login exists, check current login-service rules and exceptions, including whether Sign in with Apple is required. Do not add login to a local-only app.
- If selling digital features/content, verify current purchase rules for the product and target storefronts. Do not assume Google Play billing, purchase tokens, or a web checkout transfers directly.
- When in-app purchases apply, plan StoreKit-compatible integration, product configuration, pending/cancelled/failed purchases, restoration, entitlement changes, and subscription management.
- Explain cross-platform entitlement behavior if existing Android purchases need to be recognized; do not promise automatic transfer.
- Check applicable rules for ads, children, user-generated content, health, financial features, or other sensitive uses.
- Use honest metadata and system review prompts appropriately. Do not gate features or offer rewards for ratings.

## 16. iOS builds, signing, and App Store preparation

- Distinguish deployment target, supported devices, build SDK/Xcode, and current App Store submission requirements. Recheck them at release time.
- Choose the device family and adaptive-layout scope deliberately. Verify actual supported form factors; do not infer them from a simulator name.
- Confirm the Apple team, bundle ID, app record, version/build numbering, certificates/provisioning, and extension signing. These are separate from Android's keystore and package configuration.
- Check Apple Developer Program eligibility/access for TestFlight and App Store distribution. A free local device-testing setup does not establish distribution readiness.
- Preserve the selected local or EAS workflow. Local Xcode builds are possible; EAS Cloud is optional. Local compilation does not remove the need for Apple services for signing/distribution.
- Plan a development build for iteration and a signed Release/archive for distribution. Simulator output is not a distributable iPhone/App Store build.
- Verify the installed release app starts from its icon without Expo Go, Metro, a development QR-code session, or a connected Mac.
- Audit icon assets, launch screen, display name, bundled fonts/resources, device screenshots, support/privacy URLs, age rating, encryption/export-compliance answers, review notes/access, and required App Store Connect fields.
- Check actual accessibility support before making accessibility-label claims.
- Keep debug menus, accelerated test durations, development endpoints, test secrets, and internal copy out of Release.
- If remote updates exist, verify native-runtime compatibility and store-policy compliance. Native changes require a compatible new binary.
- Do not upload, submit for review, or release during this planning phase.

## 17. Verification and acceptance criteria

Use focused tests for consequential logic and data risks, plus device checks for system behavior. After implementation, run the existing TypeScript checks, linting, and relevant automated tests where configured. Do not create broad tests that merely repeat implementation.

| Area | Minimum relevant verification |
|---|---|
| Core journeys | Same useful outcomes on Android and iOS; correct cancellation and errors |
| Layout/accessibility | Small/large supported layouts, keyboard, large text, VoiceOver, both themes, reduced-motion/transparency settings |
| Persistence | Relaunch, interrupted writes, update with existing data, migration failure, backup/import if offered |
| Lifecycle | Lock/unlock, background, termination, force-quit/reopen, reboot, Low Power Mode when relevant |
| Notifications | Permission states, edits/deletes, timing rules, tap/actions, cold launch, privacy, Focus; push environment if used |
| Native integrations | Actual widget/activity/action behavior on supported hardware; unavailable-feature fallback |
| iPhone Duo | Folding/unfolding mid-flow, outer/inner display, vertical bars, asymmetric safe areas, keyboard, Split View, preserved state |
| Data/network | Offline, slow/failing network if used, privacy disclosures matching observed behavior |
| Security/purchases | Denial/revocation, logout/deletion, purchase/restore states where relevant |
| Release | Clean install, upgrade, standalone launch, archive validation, signing and capabilities |
| Android regression | Shared-code changes, existing records, reminders, build/install, and core flows |

Test background behavior using a Release build launched from the Home Screen without Xcode's debugger attached. The debugger can prevent normal suspension.

Use real iPhones as well as simulators. Do not claim haptics, push delivery, biometrics, background behavior, or extension reliability based only on simulator results. Record **implemented**, **simulator-verified**, **device-verified**, and **not yet verified** separately.

## 18. Deliver the initial plan

Return a concise, actionable report containing:

1. **Existing app summary:** verified stack, current Android baseline, iOS status, and assumptions.
2. **Migration assessment:** what can be reused, what needs adaptation, and genuine blockers with file/dependency evidence.
3. **Screen-by-screen changes:** retain/change/add, with the iOS UX reason.
4. **Capability decisions:** Required / Later / Not applicable, including notifications and native integrations.
5. **Compatibility matrix:** minimum OS, toolchain, dependency versions, native targets, Duo readiness, capability support, and fallbacks.
6. **Architecture changes:** shared code versus platform adapters/extensions, state ownership, persistence, and recovery.
7. **Permissions/privacy/release assessment:** concrete gaps and necessary configuration.
8. **Implementation milestones:** small, ordered changes with affected files/areas and Android regression impact.
9. **Acceptance criteria and tests:** observable outcomes, available devices, and remaining evidence needed.
10. **Risks and decisions:** severity, recommended defaults, effort bands, owner actions, and current official sources.

Recommended order: establish the baseline → resolve build/dependency blockers → make core journeys reliable → adapt iOS UI, permissions, and lifecycle → add justified native integrations → verify both platforms → prepare distribution.

Do not use optional widgets or visual polish to delay essential correctness. Equally, do not treat a successful iOS build as the whole migration.

Stop after this plan and wait for my approval to implement. Once implementation is authorized, work through the agreed milestones and report real verification results.

---

## Implementation corrections (learned from prior runs)

Dated findings from actually executing this prompt against a real app, kept here so a future run doesn't rediscover them by trial and error. Re-verify dates/versions before trusting them — Expo/Apple move fast.

**2026-10-22, against Expo SDK 57:**

- **`expo-router` native tabs are still unstable at SDK 57**, imported from `expo-router/unstable-native-tabs` (vs. `expo-router/native-tabs` once it ships stable at SDK 58+). Check the exact import path for the installed SDK before recommending a native-tabs migration — don't assume stability from "latest" docs. On iOS 26+, native tabs force Liquid Glass styling and ignore custom `backgroundColor`/`blurEffect`, so a custom icon/background treatment on the current JS tab bar will be lost; weigh that against the instability before migrating.
- **`expo-glass-effect` and `@expo/ui` were already production-ready at SDK 57** (not just "latest") — check the SDK-versioned docs page directly (`/versions/vXX.0.0/sdk/...`) rather than assuming a package needs the newest SDK just because the generic/latest docs reference it.
- **GlassView placement bug to avoid:** don't nest a flex-filling `GlassView` as a child inside a `SafeAreaView` that uses the `edges` prop for safe-area insets — the SafeAreaView's own padding shrinks its content box, so the nested GlassView (acting as the visual background) falls short of the true screen edge, leaving a gap. Fix: compute the insets manually (`useSafeAreaInsets`) and apply them as the GlassView's *own* padding (same box, like a `backgroundColor` style would), so the glass paints to the true edge while children are inset — mirroring how `backgroundColor` directly on a padded view already covers the full box regardless of its own padding.
- **A "give it native polish" ask doesn't mean swap every RN primitive for an `@expo/ui` equivalent.** RN's own `Switch` already renders the real native `UISwitch`/Material switch — replacing it with `@expo/ui`'s `Switch` adds no visible improvement, and that component's documented props (`value`, `onValueChange`, `label`, `disabled`, `testID`) don't confirm `accessibilityLabel`/`accessibilityState` pass-through, risking a silent VoiceOver regression on an app with explicit per-control accessibility labels. Check whether an RN built-in already is the native control before adopting a library replacement for it; prefer `@expo/ui` for things RN has no native equivalent for (native `ContextMenu`/`Menu`, native `BottomSheet` with real drag/detents, native pickers).
- **`ContextMenu` (`@expo/ui/swift-ui`) is iOS/tvOS-only, long-press-activated only** (no `activationMethod`/trigger prop; use the separate `Menu` component for single-tap). It has no documented Android behavior, so gate it with `Platform.OS === 'ios'` and keep the prior interaction (e.g. tap-to-open) as the Android/web path, not just an unverified fallback.
- **`expo-hinge` requires iOS 27.1 + a build made with Xcode 27.1+**; it's documented as being for interactions/effects, not layout — don't use it (or its absence) as a gate for basic Duo layout compatibility.
- **Basic iPhone Duo compatibility is often already satisfied by ordinary good practice**: no `Dimensions.get` at module scope, reactive `useWindowDimensions`, capped/centered content width. The main remaining lever for *full* Duo support (filling the inner display instead of being letterboxed) is building with the iOS 27+ SDK/Xcode 27.1 — a toolchain decision, not a code rewrite. Apple's own Duo prep page does not say whether a portrait-orientation lock must be removed; it must be verified on the Duo simulator rather than assumed either way.

---

## Official reference starting points

Checked 22 October 2026. This document combines official platform guidance with engineering recommendations; not every item is an App Store requirement. The coder must recheck relevant rules and use documentation for the project's actual versions.

### Expo and React Native

- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Continuous Native Generation and prebuild](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Expo permissions](https://docs.expo.dev/guides/permissions/)
- [Expo notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Notification behavior and background delivery](https://docs.expo.dev/push-notifications/what-you-need-to-know/)
- [Handling notification interactions](https://docs.expo.dev/push-notifications/receiving-notifications/)
- [Expo native tabs](https://docs.expo.dev/router/advanced/native-tabs/)
- [Expo UI](https://docs.expo.dev/versions/latest/sdk/ui/)
- [Expo GlassEffect](https://docs.expo.dev/versions/latest/sdk/glass-effect/)
- [Expo widgets and Live Activities](https://docs.expo.dev/versions/latest/sdk/widgets/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo privacy manifests](https://docs.expo.dev/guides/apple-privacy/)
- [Local release builds](https://docs.expo.dev/guides/local-app-production/)
- [Runtime versions and remote updates](https://docs.expo.dev/eas-update/runtime-versions/)
- [React Native platform-specific code](https://reactnative.dev/docs/platform-specific-code)
- [React Native accessibility](https://reactnative.dev/docs/accessibility)
- [React Native useWindowDimensions](https://reactnative.dev/docs/usewindowdimensions)
- [Expo Hinge availability and limitations](https://docs.expo.dev/versions/latest/sdk/hinge/)

### Apple

- [Human Interface Guidelines: layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Materials and Liquid Glass](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Notification design](https://developer.apple.com/design/human-interface-guidelines/notifications)
- [Notification authorization](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications)
- [Background strategies](https://developer.apple.com/documentation/backgroundtasks/choosing-background-strategies-for-your-app)
- [Widget updates](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date)
- [Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- [Scheduling alarms with AlarmKit](https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit)
- [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Testing a release build](https://developer.apple.com/documentation/xcode/testing-a-release-build)
- [Developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account)
- [App Store submission](https://developer.apple.com/app-store/submitting/)

### iPhone Duo

- [Apple's iPhone Duo developer hub](https://developer.apple.com/iphone-duo/)
- [Three steps to prepare an app for iPhone Duo](https://developer.apple.com/iphone-duo/prepare/)
- [Prepare your app for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111461/)
- [Raise the bar with iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111462/)
- [Adaptive layouts and reserved regions](https://developer.apple.com/videos/play/tech-talks/111463/)
- [Multiple displays, scenes, and hinge interactions](https://developer.apple.com/videos/play/tech-talks/111464/)
