---
name: react-native-android-polish
description: Audit and polish the Android UI of existing Expo or React Native apps using Android conventions and supported native controls while preserving iOS, shared behavior, data, and release compatibility. Use for Android native-feel refinement or Material 3 Expressive adaptation, not a Kotlin rewrite or a new app.
---

# React Native Android Polish

Polish an existing app's Android experience using Material 3 Expressive as the design direction. Retain React Native for shared logic and suitable layouts; use real Jetpack Compose controls through SDK-compatible Expo UI where beneficial. Keep suitable existing native React Native controls. Preserve the existing iOS implementation, especially approved SwiftUI controls and native navigation/glass presentation.

This skill is portable across repositories and AI coding tools. It assumes no app name, screen set, package versions, branding, storage model, business rules, native-project ownership, or particular tool integration. Discover these from the target repository. If there is no approved iOS reference, protect the existing iOS implementation, identify the missing baseline and ask only for consequential clarification. Never claim iOS was polished or approved without evidence. In an Android-only repository, mark iOS checks not applicable.

## Workflow

Read [the complete workflow](references/android-polish-workflow.md) when starting an audit or resuming approved implementation. It contains the reusable prompt and detailed acceptance criteria. On later focused work, revisit the relevant sections:

- Sections 1–3: scope, shared-change review, actual rendering paths, history and baseline evidence.
- Sections 4–6: native-control decisions, adapter contracts, themes, Android system behavior and accessibility.
- Sections 7–8: supported layouts, existing integrations, identity/data/build protection.
- Section 9: concrete plan and implementation approval boundary.
- Sections 10–12: implementation milestones, screenshot correction loop, regression evidence and completion.

Begin with a read-only audit and concrete plan. Do not change app code, dependencies, configuration or native projects until the plan is approved. Existing approval remains valid; do not restart planning or ask again for routine work within an approved plan. Honor narrower user scope and explicit verification deferrals, recording deferred checks as unverified.

## Decisions that matter

1. **Discover the real hybrid.** Trace routes to platform-resolved components, native wrappers, shared handlers and durable effects. Reconcile old migration notes with current source, Git history, resolved dependencies and the binary being run. Native navigation can supply system chrome without a separate effects package. Comments and imports are not runtime evidence.
2. **Keep iOS protected.** Prefer Android adapters at the smallest useful boundary. Review shared tokens/providers/navigation/dependencies/configuration for transitive iOS impact, including autolinking. Preserve existing web/default fallbacks if present.
3. **Choose controls by benefit and compatibility.** Verify installed exports, Host/interop, event contracts, native build requirements and accessibility. Do not assume every Compose API or Expressive feature is exposed to JavaScript. Use stable Material/native RN or accessible RN fallbacks when necessary. In a React Native app without Expo modules, propose any required Expo integration separately with its build impact; do not silently install it.
4. **Preserve behavior across renderers.** Trace actions across whole flows, including alternative entry points, disabled/busy states and cancellation. Keep one durable state owner and one presentation owner per sheet/dialog. Native callbacks must not duplicate writes, Undo, replay effects, announcements or haptics.
5. **Verify Android as Android.** Cover light/dark themes and dynamic-color decisions; system bars, edge-to-edge, IME/insets, Back and predictive Back compatibility, gestures, TalkBack, scaling and existing supported layouts. Material 3 Expressive means the Android design system, not web MUI or a Kotlin application rewrite.
6. **Require real evidence.** Capture and open actual Android emulator screenshots in both themes, compare against agreed Android targets, correct known defects and recapture. Browser/mockup images do not replace this. Exercise interactions separately. Obtain appropriate iOS regression evidence, and distinguish source inspection, build success, emulator/simulator checks and physical-device checks.
7. **Preserve release continuity.** Keep application identity, signing, IDs, data, permissions and update workflows. Do not clear user data or regenerate native projects as an audit shortcut. UI polish does not authorize deployment, OTA publishing, store upload or unrelated feature additions.

## Deliverables

For the audit, provide a verified stack/rendering inventory, screen/state coverage matrix, native-control compatibility decisions, shared-change review, ordered plan, acceptance/evidence strategy and specific unknowns. Stop for plan approval unless already granted.

After approved implementation, report changes, reviewed Android captures in both themes, iOS impact and regression results, relevant checks, build artifacts if authorized, rollback and remaining evidence gaps. Do not label required unperformed checks as passed or full completion.

## Portability

Copy this entire folder, keeping `references/` beside `SKILL.md`, into the destination tool's supported skills directory. Invoke `react-native-android-polish` using that tool's skill mechanism. If it does not support skills, give it `SKILL.md` and the referenced Markdown workflow, or paste the full workflow as a standalone prompt. Optional `agents/openai.yaml` is Codex UI metadata; other tools can ignore it. No scripts, credentials, external connectors or other skills are required by this package.
