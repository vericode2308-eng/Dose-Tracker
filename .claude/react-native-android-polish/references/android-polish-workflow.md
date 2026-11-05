# Existing Expo / React Native App: Premium Android Polish Prompt

**Use case:** One shared Expo / React Native Android+iOS app. iOS has already been polished, including native SwiftUI controls where implemented, and is the approved quality benchmark. Improve Android to the same level of craftsmanship using Android conventions. Preserve the approved iOS experience.

**Revised:** 5 November 2026. Standalone Android polish instructions for an existing shared app with an approved iOS experience. No earlier migration prompt, example repository, or external handoff is required. This task authorizes Android refinement and necessary reviewed shared changes; it does not authorize redesigning iOS.

**How to use:** Open the existing app repository in your coding agent, attach or paste this entire file, and start with the audit. Optional brief fields may be left blank; discover technical details from the repository. Existing iOS screenshots are helpful but not required to begin the audit. The first phase is planning only; implementation starts after approval of the concrete plan.

**Technology clarification:** Expo/React Native remains the application framework. React Native owns shared logic and suitable layouts. Expo UI can expose real SwiftUI controls on iOS and real Jetpack Compose controls on Android. Material 3 Expressive is the Android design language; MUI/Material UI for React websites is not the implementation library for this mobile task. A native-looking screenshot alone does not prove which toolkit renders a control.

---

## Copyable master prompt

You are my senior Expo / React Native engineer, Android native-integration engineer, Material 3 Expressive product designer, and mobile accessibility and visual QA reviewer.

I already have one shared Expo / React Native app for Android and iOS. The iOS version has been polished and approved. Android still needs equivalent refinement. Inspect the actual repository and running app before proposing changes.

**Your task is to polish Android only.** Deliver a premium Android experience through Material 3 Expressive, genuine native controls where supported, excellent light/dark themes, accessible interactions, and correct Android system behavior. Keep Expo/React Native as the main stack. Preserve all existing product features, business rules, navigation outcomes, data, branding, and release compatibility.

**iOS is the quality benchmark and a protected implementation.** Match its care, hierarchy, readability, completeness, responsiveness, and finish while translating presentation into Android conventions. Do not redesign iOS, replace its SwiftUI controls, change its glass effects/tabs/headers, or alter its navigation, gestures, accessibility, theme behavior, features, or data flows.

Begin with the evidence-based audit and concrete plan below. Do not change app source, dependencies, native projects, or configuration in the first phase. Audit notes and baseline evidence are allowed. Stop after the plan for approval. Once implementation is authorized, complete the agreed milestones without seeking permission for every routine reversible edit. A release, production OTA update, upload, or store submission requires separate explicit authorization.

## 1. Scope and non-negotiable safeguards

### Android implementation; iOS preservation

- Android-specific files, adapters, themes, resources, and configuration are the primary change surface.
- Safe shared changes are allowed only when necessary and reviewed explicitly for iOS impact. A file outside `ios/` can still change iOS: shared JSX, tokens, fonts, root providers, navigation options, dependencies, Metro/Babel configuration, app config, and lockfiles all count.
- Keep existing iOS native controls and their accessibility semantics intact. Do not replace an approved SwiftUI view with a shared React Native or universal Expo UI equivalent just to simplify Android work.
- Do not assume the previous prompt was fully implemented. Trace actual imports and rendering paths to identify SwiftUI, UIKit/native navigation, RN layouts, and glass APIs. Preserve what is actually there.
- Do not translate Apple chrome literally: no SF Symbols, Cupertino switches, imitation Liquid Glass, or iOS-style chevrons on every Android row.
- Do not rewrite the app in Kotlin/Compose or Swift/SwiftUI. Native controls inside an Expo app do not require replacing the application framework.
- Retain existing Expo workflow, router, styling system, state management, persistence, and services unless a specific verified limitation warrants a scoped change.
- Do not add features, dashboards, statistics, accounts, cloud sync, analytics, ads, subscriptions, widgets, or background services for visual polish.
- Preserve unrelated work. Use an isolated branch or equivalent reviewable change set; never reset user changes.

### Shared-change review gate

Before implementing a shared/dependency/configuration change, record:

| Proposed change/files | Why Android needs it | iOS consumers and risk | Isolation or unchanged-iOS mechanism | Regression checks | Rollback |
|---|---|---|---|---|---|

The approved plan should authorize necessary shared changes. Add routine changes within that boundary to this log and review their final diff. If a change would alter approved iOS appearance/behavior, require an SDK/router migration, or meaningfully expand shared architecture, first find an Android-isolated alternative. If unavoidable, prepare a concrete proposal and obtain explicit scope approval before that change. This task does not authorize an iOS redesign.

## 2. App brief and working rules

Discover missing details rather than asking me to inventory my repository.

- App name/purpose: [optional]
- Repository: [current workspace or path]
- Core journeys to preserve: [discover if blank]
- Existing Play listing: [optional]
- Approved iOS reference: [current running iOS build, existing screenshots, or attached references]
- Known Android issues/screens to prioritize: [optional]
- Existing branding/styling/theme preference: [inspect]
- Supported Android devices/form factors and minimum OS: [inspect]
- Existing data, permissions, monetization, localization, and offline behavior: [inspect]
- Available emulator/physical devices and iOS regression environment: [inspect]
- Existing local/EAS/CI release workflow: [inspect]
- Other constraints: [optional]

If unspecified, retain current product scope, supported platforms/form factors, brand, localization, storage, and theme preference. Use the smallest maintainable Android adaptation that achieves the quality bar.

Read project instructions. Use relevant local Expo UI, navigation, design-system or animation skills if available; this workflow does not depend on any other skill or a particular AI tool. Android scope and preservation of approved iOS take precedence over generic recommendations to unify or redesign both platforms. Use official documentation when no relevant skill is available; never invent missing skill instructions. Do not install tools or send external feedback just because a skill suggests doing so.

Verify APIs against installed versions and SDK-versioned official documentation. Record source-check dates, actual imports, OS requirements, native build needs, maturity, and fallbacks. Latest documentation is not proof of support in this app. Separate platform requirements from design recommendations and optional enhancements. Label findings **Required for this task**, **Useful later**, or **Not applicable**. Ask at most five consequential questions together when their answers affect scope or architecture; infer routine choices.

## 3. Phase 1 — Repository audit and real baselines

Do not implement yet. Inventory:

1. Expo SDK, React Native/React, TypeScript, package manager/lockfile, architecture, navigation/router, UI libraries, NativeWind or other styling, fonts/icons, animations, state, services, and storage.
2. Current Android and iOS render paths: which controls use RN, Expo UI universal APIs, platform-specific SwiftUI/Compose, native navigation, community modules, or custom native modules. Document actual evidence with file paths.
3. Every screen, tab, modal, sheet, menu, form, and core journey. Include loading, empty, error, offline, permission-denied, disabled, validation, and destructive-action states where applicable.
4. Android UI gaps: hierarchy, crowded/oversized layouts, typography, spacing, inconsistent surfaces, weak contrast, missing feedback, keyboard problems, platform-mismatched controls, accessibility, and outdated system behavior.
5. App config/plugins, native projects, Gradle/JDK/Android toolchain, min/target/compile SDKs, native dependency compatibility, development/release builds, CI, EAS, and OTA configuration.
6. Whether native directories are generated with CNG or maintained manually. Identify custom native edits before any generation command.
7. Android application ID, versionCode/versionName process, signing/Play App Signing continuity, build profiles, release ownership, storage locations/schema/IDs, notification IDs/channels, deep links, and existing update process. Inspect credential references without exposing secrets.
8. Protected iOS baseline: bundle ID, native modules, SwiftUI exports, native tabs/headers/glass, theme configuration, navigation behavior, and any shared files affecting them. Do not modify signing, entitlements, Pods, deployment settings, or iOS release configuration for Android polish.

Build/run the current app where tooling permits. Capture baseline Android screenshots and approved iOS reference screenshots in light/dark themes with deterministic existing or safe test data. Record commit/build, device/API or OS, theme, font/display scale, navigation mode, screen/state, and image paths. Never overwrite real user data to create attractive test content.

If a baseline cannot run, identify the exact blocker. Continue the read-only audit and distinguish code inspection from runtime evidence. Do not call the app verified because Expo Go opens or compilation succeeds. During the audit, do not install dependencies, regenerate native projects, or let a build command implicitly prebuild missing projects. If baseline execution requires those changes, describe the blocker and include the recovery in the approval plan. Honor an explicit temporary deferral of emulator work, but carry the missing evidence into the plan and completion gate.

### Reconcile intent, implementation, and evidence

Read applicable design references, behavior specifications, migration notes and verification records that actually exist. Use focused Git history/diffs, when available, to distinguish what the previous polish changed from later work. Record the inspected commit and dirty-tree state. Treat a knowledge graph or handoff as a navigation aid; verify consequential claims in current source. Do not assume the latest checkout is the exact approved iOS build. Identify its reference build/commit where possible and flag uncertainty without silently approving newer changes.

Separate **requested**, **implemented in source**, **built**, **visually reviewed**, and **interaction-tested**. An old checklist, source comment, package import or commit title cannot establish runtime verification. Reconcile obsolete SDK pins and status notes against current configuration, lockfiles, installed package metadata and later changes. Do not silently discard still-applicable owner constraints or downgrade the app to match a stale handoff. If instructions remain genuinely conflicting, surface the conflict in the plan.

For each representative flow, trace:

`route → screen/layout → platform-resolved component → renderer/native wrapper → shared handler → persistence/effects`

Include `.ios`, `.android`, `.native`, default/web files, inline platform branches, re-exports and shared providers. Classify by actual renderer: custom RN layout, RN native control, native navigator surface, Expo UI SwiftUI, Expo UI Compose, or custom module. A native tab bar or OS-provided sheet may supply glass on supported iOS versions without a dedicated glass dependency; identify its owner and availability instead of adding or replacing it from a visual guess.

Audit existing Android benefits from earlier shared work before proposing replacements. An “iOS polish” commit may also have changed Android dialogs, switches, sheets, typography, motion, themes or data-refresh logic. Distinguish remaining visual gaps from baseline behavioral defects and unrelated unfinished features.

Check component parity **and flow parity**. Inventory every action, alternate entry point, disabled/busy state, accessibility label and callback. A fallback may omit a menu action that remains available elsewhere; conversely, identical prop types can conceal an ignored callback or label. Preserve existing useful outcomes without cloning every iOS affordance or declaring a feature missing from one component alone.

### Dependency and native-build reality

Compare declared version ranges, lockfile resolutions, installed package exports/types/source, generated native configuration and the binary actually launched. Record discrepancies. A successful iOS build or available JavaScript export does not establish that the Android binary contains compatible native code. Avoid diagnosing stale-build failures as UI defects.

Inspect native dependency/autolinking scope and config-plugin behavior on **both** platforms, including local modules and plugins that become no-ops after an SDK change. Guarded imports do not prevent native autolinking. Do not remove apparently redundant compatibility plugins or rebuild the toolchain without assessing the existing workflow. When versioned documentation and installed source disagree, document the mismatch, inspect the matching release source, and require a small runtime check after approval rather than inventing an API.

Produce this screen matrix:

| Screen/flow/state and files | Current Android issue and evidence | Protected iOS baseline / quality lesson | Android proposal | Renderer/control choice and SDK support | Shared impact | Priority and verification |
|---|---|---|---|---|---|---|

Translate quality lessons such as compact summaries, readable rows, coherent spacing, and polished sheets. Do not import unrelated sample-dashboard content. Map applicable reference panels, states and themes to the coverage matrix; identify which are iOS quality references and which are approved Android visual targets. Do not demand pixel-identical Android and iOS chrome.

## 4. Native-first hybrid architecture

Keep one repository and shared business logic. Separate presentation at the smallest useful boundary.

| Area | Default for this task |
|---|---|
| Business rules, models, validation, services, persistence | Preserve shared implementation and contracts |
| Branded content/layouts, cards, charts, long lists | RN with the existing styling system and Android tokens |
| Native controls and transient surfaces | SDK-supported Expo UI rendering Jetpack Compose where beneficial; retain suitable existing native RN controls |
| Navigation | Preserve working router, routes, parameters, linking, history, and state; Android-only presentation options/adapters |
| Approved iOS UI | Preserve implementation, imports, theme values, native controls, and behavior |
| Android system integrations | Existing Expo APIs; a compatible native module only for a demonstrated gap |

### Component boundaries and imports

- Use shared prop contracts with Android presentation adapters, such as `SettingsControl.android.tsx`, and preserve the existing iOS/default implementation. A small `Platform.OS` check is appropriate for a small difference; use platform files for substantial differences.
- Keep platform-only Compose and SwiftUI imports isolated from the opposite bundle. A JSX condition alone does not make an unconditional top-level native import safe. Verify Metro resolution and both platform bundles after introducing adapters.
- Prefer adapter files outside the route directory and stable route entry points. If using platform-specific route files, verify installed Expo Router support and its non-platform route-file requirements. Do not create accidental new routes or break deep links.
- Keep common controllers/hooks, validation, and action handlers shared. Do not duplicate whole features or business logic because one control differs. If the repository also supports web or another platform, preserve its existing fallback and bundling; Android adapters must not redirect it into a mobile-only renderer.
- Do not introduce a second source of durable state inside Compose. Keep controlled value/change contracts; use supported native UI state APIs only for transient interaction state, with reliable synchronization and no duplicate effects.
- Avoid accidental remounts on theme/window changes that reset forms, selection, or navigation.

### Expo UI adoption decision

For each candidate, verify component/export availability, exact import/props, required `Host`, layout sizing/modifiers, RN/native interoperability, theme access, accessibility semantics, event behavior, test identifiers, build requirements, and installed SDK support. Use a minimal running spike after plan approval for uncertain integration before spreading it across screens. Record a concrete keep/adapt/replace decision and user benefit for each candidate; adopting Compose is not a component-count quota.

Use universal Expo UI only within an Android-isolated implementation when it meets the need. Use verified Jetpack Compose exports where platform-specific capabilities are needed. **Do not replace working iOS SwiftUI trees with a universal tree.** Verify `Host` import and interop APIs for this version; do not copy another SDK's example blindly. RN flexbox/NativeWind styles do not automatically style children inside a Compose layout.

Prefer native Material menus, dialogs, date/time pickers, sheets, sliders, switches, checkboxes, radio controls, and suitable buttons when the installed bridge exposes them and they improve the app. Preserve accessible existing native RN controls when a swap adds no benefit. An RN control can already be native; confirm its actual renderer and appearance instead of assuming every RN component is a fake.

If an Expressive component is unavailable, use compatible stable Material 3, an appropriate maintained native control, or a documented accessible RN fallback. Do not invent Expo exports or assume that all Kotlin Compose APIs are exposed to JavaScript. Do not add MUI, a WebView, or a website component library for ordinary native screens. A custom Expo Module is an exception requiring a clear benefit and maintenance/build assessment, not the default.

### Adapter contracts and presentation ownership

- Translate event signatures explicitly: selected value versus index/event object, press versus click, dismissal versus selection, and controlled versus native transient state. Preserve stable value IDs, disabled/busy behavior, validation, error recovery and cancellation. Removing a handler is not proof of a correctly disabled native control.
- Exercise each changed adapter with one successful action, cancellation/dismissal, a disabled state, rapid repeated input and a failed save where applicable. Verify one intended command, no duplicate callbacks/writes, correct rollback, and accessibility/test-ID propagation.
- Keep effects downstream of the existing successful command/commit boundary. Existing Undo, replay/idempotency, announcements, haptics and external snapshot updates must retain their semantics. A native control's animation, local selection or dismissal must not create a durable success, duplicate a completion, or replay feedback after restore/resume.
- Give each transient surface one presentation owner. A router form sheet already hosts native content; do not wrap it in another modal/bottom sheet just to introduce Compose. Inspect RN content sizing, intrinsic Host measurement, scroll ownership, detents, insets, keyboard and dismiss callbacks together. Keep app-controlled headers from duplicating native headers.
- Verify direct React Native children inside native trees through the installed bridge's supported interop mechanism. Do not assume NativeWind, flex sizing, clipping, z-order, focus or hit testing cross a Host boundary unchanged.

For long or unknown-length datasets, retain proper virtualization through an appropriate RN list or verified native lazy-list bridge. A nonvirtualized native settings list is not a substitute for a large feed. Verify recycling, nested scrolling, stable keys, and performance before replacing lists.

## 5. Material 3 Expressive visual direction

Make Android intentionally Android: confident hierarchy, purposeful shapes, coherent color roles, readable type, restrained expressive motion, native interaction feedback, and well-finished surfaces. Expressive does not mean decorating every component or adopting experimental APIs indiscriminately.

### One design system with protected platform values

Integrate Android variants into the current styling/token architecture. Preserve existing iOS resolved values. Shared semantic names may map to different platform values; changing a shared constant is not Android-only merely because Android requested it.

- **Color roles:** primary/onPrimary, primary containers/on-container colors, secondary/tertiary where useful, surface/container levels, onSurface/secondary text, outlines, errors, and domain-specific success/warning roles.
- **Type:** deliberate title/headline/body/label roles, Android-appropriate font metrics, consistent weight and line height, and existing brand fonts only when readable and compatible. Do not disable font scaling to make a design fit.
- **Spacing/density:** a coherent scale, consistent margins, section rhythm, compact summaries, useful list density, and comfortable controls. Avoid excessive empty space and unnecessary scrolling.
- **Shapes/depth:** meaningful shape hierarchy and subtle tonal/elevation differences. Avoid nested decorative cards, arbitrary gradients, heavy shadows, and blanket blur/glass.
- **Reusable components:** Android buttons, rows, form sections, cards, headers, dialogs/sheets, feedback, loading/empty/error states, and navigation presentation, with consistent states and documented renderer choices.

Resolve semantic values into both RN and Compose through a small compatible adapter. Avoid separate theme stores, contradictory palettes, unsupported `className` props, or passing unresolved color objects into components expecting concrete values.

### Screens, actions, and navigation surfaces

- Redesign the primary Android screen first. Use genuine product content and real data; retain the app's purpose. Compact summaries and clear primary actions should earn their space.
- Use appropriate Material top app bars, contextual actions, search, navigation bars/rails when justified by existing destinations and available space, and visible selected-state indicators.
- Preserve routes, tab identities/order, links, history, drafts, and screen state. Prefer Android presentation configuration to replacing a working navigator. Native tabs are not mandatory; any migration needs SDK support and protection of the existing iOS tabs.
- Choose filled, tonal, outlined, and text buttons by emphasis. Use a FAB/extended FAB only when it suits a frequent primary action. Avoid competing primary actions.
- Keep row actions discoverable without placing multiple buttons on every row. Menus, long-press, or swipe may supplement visible accessible alternatives; essential actions must not be gesture-only.
- Use Material Symbols through a verified bundled renderer/asset source, or a documented existing fallback. Material Icons and Material Symbols are distinct; do not assume a package includes both or that SF Symbol names work on Android. Preserve iOS icon mappings. Verify optical size, selected variants, contrast, labels, and offline availability.

### Light, dark, and dynamic color

- Make both themes intentional. Use appropriate tonal surfaces, readable on-colors, controlled accents, and elevation without merely inverting colors.
- Honor the existing system/light/dark preference and persistence. Apply it coherently to RN, Compose, navigation, dialogs, sheets, system bars, and launch surfaces where supported; prevent bright flashes.
- Assess Material You dynamic color on supported Android versions (Android 12/API 31 and later), including the actual bridge's support. Preserve recognizable brand elements and existing user theme expectations. Do not silently replace branding or add a theme settings product feature without justification.
- If enabled, support coherent light/dark dynamic palettes and explicit brand-derived fallbacks for unavailable/disabled dynamic color. Do not communicate semantic status with wallpaper-derived color alone.
- Trace the existing theme pipeline from persisted preference and system appearance through RN tokens, any global appearance override, navigator chrome, native dialogs and Compose Hosts. Preserve the existing preference values and iOS appearance side effects. A Compose-only dark palette is insufficient if the enclosing RN screen or native dialog still uses another scheme.
- Verify runtime theme changes with sheets/forms open and after relaunch, including explicit light on a dark OS, explicit dark on a light OS, and returning to system mode where supported. Keep iOS colors and theme behavior unchanged.

## 6. Android system behavior and accessibility

### Edge-to-edge, insets, and keyboard

- Inspect target SDK, OS behavior, Expo configuration, navigator, safe-area library, and existing native setup together. Follow current supported edge-to-edge behavior rather than relying on deprecated system-bar background/translucency props or opt-outs.
- Draw backgrounds to the window edge while keeping interactive content clear of status/navigation bars, display cutouts, gesture areas, and caption bars where relevant.
- Assign one owner per inset. Avoid double safe-area padding from the navigator, RN containers, Compose scaffold, and sheet. Do not hard-code bar heights or assume bottom insets match across navigation modes.
- Ensure correct status/navigation icon contrast in both themes and supported three-button scrim behavior. Test gesture navigation and three-button navigation.
- Handle IME resizing/insets, focused-field visibility, scroll-to-input, bottom actions, sheet keyboards, autofill, validation, input types, and IME actions. Avoid counting both keyboard and bottom insets twice.
- Test keyboard show/hide and Back dismissal on real Android runs. Native dialogs/pickers do not automatically guarantee correct surrounding RN layout.

### Back, Up, gestures, and predictive Back

- Preserve existing navigation semantics. Distinguish Up within the app hierarchy from system Back through actual history, including external deep links and cold starts.
- Define dismissal for focused search, keyboard, menus, dialogs, sheets, and unsaved edits. Respect the system/navigation library's actual event ordering; do not build a blanket handler that consumes every Back press.
- Audit installed Expo Router/React Navigation/react-native-screens and native Activity compatibility before promising predictive Back. Native Compose component support does not automatically provide predictive navigation for the RN stack.
- Use supported back integration and verify manifest/config behavior against the actual versions. Do not add a second Compose navigation stack or fake progress animation to claim predictive Back support.
- Test gesture completion and cancellation, nested flows, root back-to-home, sheet dismissal, restored history, and three-button/hardware Back where supported. A cancelled gesture must not pop, discard a draft, or trigger an action.
- Keep swipes, horizontal carousels, drawers, drag handles, scrolling, and system edge gestures compatible. Avoid large gesture-exclusion regions.
- If the installed stack lacks a predictive animation, report the precise limitation and retain correct Back behavior; treat a risky dependency upgrade as a separate decision.

### TalkBack, scaling, and interaction feedback

- Provide meaningful labels, roles, values, selected/checked/disabled states, headings, error messages, and announcements. Hide decorative icons and avoid duplicate focus targets.
- Verify semantics at RN↔Compose boundaries; RN accessibility props are not guaranteed to pass through every native wrapper. Confirm the rendered accessibility tree and TalkBack behavior.
- Make focus order logical, move focus appropriately into dialogs/sheets, and restore focus to the trigger on dismissal. Announce validation/status without excessive repeated speech.
- Aim for at least 48 × 48 dp practical touch targets with nonoverlapping hit areas. Support system font/display scaling, wrapping, scrolling, and larger text without hiding essential actions.
- Check contrast in both themes, including dynamic palettes: use at least 4.5:1 for ordinary text and 3:1 for large text and meaningful non-text controls as appropriate. Do not use color alone for state.
- Provide alternatives to swipe, drag, long-press, motion, and haptics. Test keyboard/Switch Access interaction when relevant to the app and supported devices.
- Use native pressed/ripple/focus feedback where available, restrained interruptible motion, and semantic Android haptics. Respect reduced-motion/system animation and user feedback preferences; avoid duplicate feedback from native controls plus custom code.
- Keep heavy work off interaction paths, avoid unnecessary renders/host boundaries, and check scrolling and sheet responsiveness in a representative non-debug build. Hardware haptics and performance require appropriate device evidence.

## 7. Adaptive layout, localization, lifecycle, and existing capabilities

Improve within existing supported form factors; do not expand device support merely to satisfy a checklist.

- Use reactive window/container measurements rather than module-scope fixed dimensions. Test small/large phones, orientation and supported split-screen/tablet/foldable sizes. Preserve selection, scroll, navigation, drafts, and in-flight actions during resize/recreation. Assess hinge regions only with supported APIs and real need.
- Keep existing localization. Use locale-aware dates/numbers/plurals and 12/24-hour settings, longer strings, and RTL where supported. Retain logical stored values and stable route/data identifiers.
- Preserve durable saves, authentication, app lock, offline state, background/resume, process-death recovery, and existing reminders/timers. Do not rely on a JavaScript interval or termination callback for durable or scheduled work.
- Preserve Android permission behavior, cancellation, denied/revoked states, return-from-Settings refresh, and graceful degradation. Add no permissions for appearance.
- If notifications exist, preserve channel IDs/user settings, request IDs, scheduling, create/edit/delete cancellation, deduplication, FCM configuration, tap/actions, and cold-start routing. Test runtime notification permission and disabled channels where applicable. Do not promise exact delivery under Doze/battery restrictions or change exact-alarm/foreground-service behavior as a cosmetic task.
- If widgets, shortcuts or other external entry points exist, trace their platform adapters and shared data/effect paths. Preserve their current supported behavior and replay/cold-start semantics; do not turn missing Android counterparts or historic experiments into a new-feature mandate.
- If links, sharing, files, media, biometrics, purchases, or subscriptions exist, smoke-test their affected entry points and states. Preserve application-ID-dependent registrations, FileProvider authorities, billing products/entitlements, intent filters, and validated input handling.
- Do not add native integrations to imitate the breadth of the original iOS migration prompt. Existing functionality is the scope; separately flag unrelated discoveries.

## 8. Protect identity, data, and release continuity

- Preserve Android application ID/package identity, signing/keystore or Play App Signing arrangement, release ownership, and installed-user upgrade path. Preserve iOS bundle ID and signing configuration.
- Preserve stable record IDs, storage keys, database/schema, file locations, SecureStore references, import/export contracts, notification IDs, and test IDs relied on by existing automation. If a test ID must move with a control, keep its semantic target and verify native-wrapper propagation.
- Do not uninstall, clear app data, reseed production storage, or silently reset a database to make a new UI work. Use a separate emulator/test profile for destructive clean-install checks.
- A UI polish pass should normally need no schema migration. If unavoidable, explain why, provide a versioned backward-compatible transition/recovery plan, and verify a populated upgrade. Never treat migration failure as permission to erase data.
- Preserve the existing build/versioning process; avoid arbitrary version bumps, signing changes, and support-level changes. Make only justified Android config edits.
- Before native generation, identify what the exact installed command will replace, including ignored native edits and build artifacts. Back up required artifacts and respect repository-specific generation restrictions; omitting `--clean` is not a universal non-destructive guarantee.
- For CNG, express repeatable configuration in app config/plugins and keep module source outside disposable generated files. Scope generation to Android where appropriate and review all resulting shared files. Do not run broad `prebuild --clean` over customized native projects.
- For maintained native projects, preserve that source-of-truth workflow. App-config edits alone may not update the native project.
- Do not upgrade Expo/RN/router/Compose or replace the styling system solely to obtain one visual effect. Document any necessary dependency/native build change, iOS linking risk, compatible versions, lockfile diff, and rollback.
- Native dependency changes require a compatible new binary; OTA JavaScript cannot supply missing native code. Inspect EAS Update runtime versions, channels, platform targeting, and rollback before proposing distribution. Never publish an Android update to iOS unintentionally.
- Build/install a representative Android release using the existing workflow. Verify standalone startup from the launcher without Metro/Expo Go. Prepare an AAB only if within authorized build scope; do not upload or release it automatically.
- Recheck current Play requirements only when an actual release/configuration change makes them relevant. Distinguish legal/store rules from UI preferences. Do not change Data safety/privacy declarations without evidence of changed behavior.

## 9. Initial plan deliverable — stop here for approval

Return a concise actionable plan containing:

1. Verified stack, actual iOS implementation, Android baseline, protected iOS assets/behavior, and unknowns.
2. Screen-by-screen matrix from section 3, ranked by user value and defect severity.
3. Android visual direction and semantic token/component proposal, including both themes and dynamic-color decision.
4. Native-control compatibility matrix: component, renderer, exact package/import/version, supported APIs/OS, Host/interop, accessibility, build impact, and fallback. Distinguish native Material 3 from verified Expressive features.
5. Architecture and shared-change review log, identifying how each edit preserves approved iOS and which runtime checks must substantiate that claim. Include adapter contract and presentation/inset ownership decisions.
6. Ordered milestones, affected files/areas, regression risks, acceptance conditions, test/evidence plan, and rollback approach.
7. Tooling/device gaps, consequential questions, and official sources with check dates. Report existing failures separately from proposed changes.

Recommended order: establish baselines → resolve genuine Android build blockers → establish isolated theme/component foundation → implement the main-screen benchmark → extend patterns to remaining screens → system interaction/accessibility polish → visual QA and regression checks → prepare handoff/build artifacts.

Do not implement app changes until the plan is approved. The benchmark review during implementation is evidence-driven QA, not a requirement to interrupt the user for every screen unless requested.

## 10. Implementation milestones after approval

### Phase 2 — Foundation and main-screen benchmark

Implement Android-isolated tokens/adapters and a small representative native-control integration. Then polish the primary Android screen in light/dark themes. Build/run and inspect actual emulator images before propagating the patterns. Compare craftsmanship with approved iOS while checking Android against Material guidance. Correct hierarchy, density, typography, surfaces, icons, insets, and feedback first.

### Phase 3 — Remaining screens and interactions

Apply the benchmark consistently across every in-scope screen, form, menu, sheet, dialog, and state. Preserve functional outcomes, route identity, state ownership, and validation. Implement Back/keyboard/theme/accessibility behavior alongside each component, rather than deferring correctness until the end. Review shared diffs as they occur.

### Phase 4 — Visual QA with actual emulator screenshots

**Required evidence, not optional:** Build and run the changed Android app in an Android Emulator. Capture and open screenshots of every major changed screen in **both light and dark themes**, using equivalent content/state and comparable window sizes. Capture important dialogs/sheets, empty/error states, long content, and keyboard layouts where they expose changed behavior. Browser previews, generated mockups, Compose previews, and source inspection do not replace emulator evidence.

Record image paths plus build/commit, emulator model, API level, resolution/density, theme/dynamic-color setting, font/display scale, navigation mode, and reproducible state/steps. Use a repeatable naming convention such as `qa/android/after/home-dark-apiXX.png`; retain before images separately. Redact sensitive user content without presenting fabricated imagery as runtime evidence.

Capture the selected emulator explicitly when more than one device is connected, for example `adb -s <emulator-serial> exec-out screencap -p > <capture-path>.png`. Verify a valid, nonempty PNG and open it together with the applicable reference/baseline. Match viewport/aspect ratio, content, system bars and scales; Android screenshot pixels are not layout dp. Compare individual panels of composite references without presentation framing. Keep original captures, record any redaction, and keep generated evidence out of source control according to project policy.

Inspect the images themselves for visual hierarchy, spacing, alignment, font metrics, contrast, icon sizing, selected/disabled states, status/navigation bars, clipping, keyboard occlusion, and inconsistent native/RN surfaces. Fix defects, recapture affected screens, and review again. Include a concise defect/correction log; capturing images without reviewing them is insufficient. Continue correcting known app-controlled mismatches against agreed Android targets before requesting final review. Recheck affected screens after shared-component changes. Do not claim pixel identity from subjective inspection or distort images to conceal differences; explain unavoidable platform rendering differences.

Review dynamic color enabled/disabled/fallback where applicable, large text/display scaling, a small and large supported window, gesture and three-button navigation, and one older supported API plus a recent target-relevant API where available. Use a risk-based matrix rather than blindly testing every combination. A screenshot cannot establish gesture, screen-reader, haptic, persistence, or performance correctness; exercise those separately.

**iOS preservation evidence:** Smoke-test representative protected iOS navigation, native controls and core flows even for apparently isolated Android edits. Expand coverage according to the actual dependency/shared-code impact. Compare approved/before and after iOS Simulator screenshots in both themes for screens affected by shared/dependency/config changes. Check tabs, headers/glass, SwiftUI controls, forms/sheets, typography, theme switching, keyboard, and core navigation outcomes. Run the existing iOS checks/build appropriate to shared/native-linking risk. Review the shared dependency/config diff even if no `.ios` file changed. Preserve the baseline implementation; investigate any visible or behavioral difference. Do not treat an unexplained iOS difference as an acceptable Android tradeoff.

If emulators, iOS tools, credentials, or device access are unavailable, finish work that can be verified, provide exact reproduction/capture steps, and mark missing evidence **not yet verified**. Do not claim full completion or invent screenshots. A blocked iOS check remains a preservation-evidence gap even when the source diff appears safe.

### Phase 5 — Functional, accessibility, data, and build verification

Run existing configured type checks, lint, and relevant tests. Add focused regression coverage for consequential behavior introduced or changed, especially adapter callback contracts, theme selection, navigation/dismissal, persistence, or permission handling. Avoid broad test scaffolding that mirrors styling implementation. Use the established test framework where possible.

| Area | Observable acceptance evidence |
|---|---|
| Core product | Existing create/read/edit/delete and other core journeys retain outcomes; cancellation/errors do not lose or duplicate work |
| Navigation | Existing tabs/routes/deep links/history work; Back/Up, root exit, overlays, completed/cancelled gestures behave correctly |
| Native interop | Controls size/theme/focus correctly; callbacks fire once; state remains synchronized across RN/Compose boundaries |
| Appearance | Actual emulator screenshots reviewed in light/dark themes; defects corrected; coherent Android presentation |
| Accessibility | TalkBack navigation/actions, modal focus/return, states/errors, large font/display scaling, contrast and touch targets exercised |
| System UI/IME | Gesture/three-button navigation, cutouts/insets, bars, keyboard/focused inputs and bottom actions remain usable |
| Themes/layout | Theme changes and supported resizing/rotation preserve drafts, selection, scroll and pending actions |
| Data continuity | Populated prior build upgraded without clearing data; IDs, records, preferences and applicable reminders/auth preserved after relaunch |
| Integrations | Relevant notification taps, sharing/links, permission refusal/recovery, purchases or other affected existing integrations work |
| Build/release | Appropriate dev and release checks pass; installed standalone build launches; identity/signing/config/version workflow preserved |
| iOS preservation | Reviewed diff and appropriate iOS screenshots/build/core-flow checks show approved UI/native controls/behavior retained |

For populated-upgrade verification, install the previous compatible build with safe test records, update in place using the appropriate signing/build identity, and compare data and behavior. Do not substitute a clean install for an upgrade test. If prior artifacts/signing are unavailable, report that exact gap and perform available non-destructive checks.

Use physical Android hardware for haptics, biometrics, push/background behavior, and representative performance where relevant. Do not claim device verification from an emulator. Record pre-existing failures separately; do not hide new regressions behind them.

## 11. Definition of done and final handoff

The task is complete only when the agreed Android scope has:

1. A coherent, premium Material 3/Expressive direction appropriate to supported APIs, with intentional light and dark themes.
2. Native controls where they improve the experience, appropriate RN layouts elsewhere, and documented fallbacks without an unnecessary rewrite.
3. Preserved features, navigation outcomes, accessibility, stable identifiers, data, and release continuity.
4. Correct supported Android Back, gestures, edge-to-edge, keyboard, scaling, and theme behavior.
5. Actual before/after Android emulator screenshots in both themes, opened/reviewed, with identified visual defects corrected.
6. Approved iOS appearance, SwiftUI controls, glass/navigation presentation, features, and behavior preserved with appropriate regression evidence.
7. Relevant checks passing and no unexplained new errors, with unavailable verification clearly identified.
8. A maintainable, reviewable change set and concise handoff; no unauthorized publication.

Report:

- Android improvements by major screen, renderer/native technologies actually used, and verified Expressive features versus stable Material/RN fallbacks.
- Files changed, shared-change review results, why iOS remains preserved, and before/after screenshot locations.
- Commands/checks executed, build/device/API details, outcomes, data-upgrade results, and remaining limitations.
- Separate status columns for **implemented**, **Android emulator-verified**, **iOS simulator-verified**, **physical-device-verified**, and **not yet verified**. Use **not applicable** where appropriate, not a misleading pass.
- Build artifact location if produced, rollback instructions appropriate to the existing workflow, and any owner actions needed before distribution.

Do not claim completion solely because the app builds, looks better in one screenshot, or uses an Expo UI import. If required evidence is missing, describe the implementation as ready for remaining verification and name the exact unfinished acceptance criteria.

## 12. Final audit cautions

- A native-polish request is not an instruction to replace every RN primitive. Check renderer, accessibility, and benefit first.
- SDK-specific import paths, native tabs stability, Host locations, and component props change. Treat historical notes as leads to verify, not universal facts.
- SwiftUI menus/context menus and Apple glass APIs are platform-specific; preserve their existing iOS path and provide deliberate Android counterparts.
- Shared theme/provider/navigation/dependency edits can alter iOS without touching its native directory. Review transitive effects.
- Compose capabilities are broader than any particular Expo bridge. Stable Material 3 support is not proof of complete Material 3 Expressive support.
- Native defaults do not guarantee accessible label/test-ID forwarding, correct insets, virtualization, or RN interop. Verify the running app.
- Native generation can overwrite customized projects. Determine the source of truth before running it.
- Never reset data, invent product statistics, overdecorate surfaces, sacrifice performance for effects, or describe untested interactions as verified.

## Official reference starting points

These official references are starting points, not pinned API guarantees or evidence that every linked page was checked for the target repository. During the audit, record which pages and versions were actually consulted and when. Recheck SDK-versioned pages and installed library documentation during the repository audit. Engineering recommendations in this prompt are not automatically Google Play requirements.

- [Expo UI overview: native SwiftUI and Jetpack Compose from React](https://docs.expo.dev/versions/latest/sdk/ui/)
- [Expo UI Jetpack Compose components and interoperability](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/)
- [Expo Router platform-specific files and route requirements](https://docs.expo.dev/router/advanced/platform-specific-modules/)
- [Expo Router native Stack](https://docs.expo.dev/router/advanced/stack/)
- [Expo Router native tabs](https://docs.expo.dev/router/advanced/native-tabs/)
- [Expo system bars and edge-to-edge](https://docs.expo.dev/develop/user-interface/system-bars/)
- [Expo safe areas](https://docs.expo.dev/develop/user-interface/safe-areas/)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Expo EAS Update runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
- [Expo local production builds](https://docs.expo.dev/guides/local-app-production/)
- [React Native platform-specific code](https://reactnative.dev/docs/platform-specific-code)
- [React Native accessibility](https://reactnative.dev/docs/accessibility)
- [Material Design 3 and Expressive in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Compose Material 3 releases and API maturity](https://developer.android.com/jetpack/androidx/releases/compose-material3)
- [Android edge-to-edge and insets](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
- [Android predictive Back setup](https://developer.android.com/develop/ui/compose/system/predictive-back-setup)
- [Android Compose accessibility](https://developer.android.com/develop/ui/compose/accessibility)
- [Material Symbols](https://developers.google.com/fonts/docs/material_symbols)
- [Google Play policy center, when preparing an actual release](https://play.google.com/about/developer-content-policy/)

**Start now with Phase 1 and the initial plan. Preserve approved iOS. Implement Android only after plan approval.**
