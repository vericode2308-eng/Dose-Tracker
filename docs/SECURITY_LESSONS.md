# Security corrections and lessons — 2026-10-01

This is the implementation record for the security audit and the user's request to correct its findings deliberately. The [original audit](SECURITY_AUDIT.md) remains a historical baseline. All five findings received source corrections and regression coverage. This does **not** mean a new native build has been installed or released: no Android device was connected during this work.

## What changed

| Audit item | Implemented correction | Verification and limits |
| --- | --- | --- |
| #1: environment-file ignore gaps | `.gitignore` covers `.env`, `.env.*`, and `.env*.local`, with only a sanitized `.env.example` exception. | Checked default, local, production, production-local and other local-suffix examples. No actual secret exposure was found, so credentials were not rotated or rewritten. |
| #2: notification actions bypass app lock | `handleReminderAction()` checks SecureStore inside the serialized mutation queue, before resolving/changing profiles or writing a dose/snooze. Both headless and UI actions use this boundary. Lock changes share the same queue. | Tests cover Take, Skip, Snooze, enabled lock, read failure, queued actions, retries and app-lock-off behavior. Native lock-screen/background/terminated behavior remains a device check. |
| #2: notification controls and failure handling | Lock-on removes the native quick-action category, omits it from future requests, and dismisses stale presented medication notifications carrying actions. Users act through the unlocked app. OS refresh failure never rolls back the saved lock and is reported as needing retry. Unknown SecureStore values fail closed. Native screen-protection failure closes app content rather than leaving a saved lock unenforced. | Tests cover toggling both ways, persistence failure, category/scheduling failure, corrupt secure values and a failed screen-protection update. |
| #3: malformed-query decoder DoS | Scoped override upgrades `query-string@7.1.3` to use `decode-uri-component@0.5.0`; a persistent one-line adapter reads its ESM default export from the CommonJS consumer. | Tests preserve Unicode, spaces, slashes and repeated values. A 10,000-token malformed query completes within a two-second subprocess bound. Android, iOS and web bundles compile. No malformed link was sent to a real device. |
| #4: privacy changes leave old tray content | Reconciliation checks presented notifications separately from scheduled requests. It dismisses app-owned medication notifications whose title/body violate the new `hide`/`none` setting, before reminders-disabled, no-schedules, or permission-denied early returns. | Tests cover all three stricter privacy transitions in each condition, preserve unrelated/compliant notifications, and propagate cleanup failures. The privacy screen explicitly reports saved preference vs incomplete cleanup. Screenshots and OS notification history cannot be recalled. |
| #5: stale profile copy in AsyncStorage | Both onboarding load/retry paths import the legacy profile into SQLite first, then persist only an explicit setup-field allowlist with `profile: null`. Profile entry no longer writes a snapshot into onboarding. Ready reads the current SQLite profile. | Tests cover successful migration, failed database writes, cleanup failure/retry, subsequent profile edits, flag preservation and erasure. Existing SQLite import-once regression remains in the suite. The first successful load performs cleanup; an old installed app is not remotely changed. |

## Additional hardening completed

**Error messages.** A shared `UserFacingError` marks deliberately authored domain validation messages. Database/notification validation uses that type. Screen catches and notification scheduling reports use `publicErrorMessage()` and a fixed fallback for unexpected SQLite/native exceptions. Merely naming an object `UserFacingError` does not bypass the check. Dynamic native errors, SQL text and paths are not displayed by those catches; diagnostics retain their separate payload allowlists.

**Preference imports.** Both platforms check actual file size before application reads, even when picker metadata omits size. Native temporary copies are cleaned up on rejection, including when picker metadata already identifies an oversized file. JSON format validation and the preference allowlist remain mandatory; imports cannot set app lock, diagnostics consent, or health records. The limit is 1 MiB.

**Profile images.** Application validation limits selected images to 8 MiB, 24 million pixels and 8,192 pixels per side. File-header checks allow JPEG, PNG, WebP, HEIC and AVIF, instead of trusting a filename or MIME label. Native reads inspect only a 32-byte header and close the handle even on failure; copying rechecks size/header and uses a random filename and detected extension. Web reads occur only after checking the actual `File`; no eager base64 result is requested from the picker. The operating-system/browser picker may decode/crop before application code receives a result, so these checks bound application retention and subsequent reads/copies, not all system-picker resource usage. Unknown dimensions are rejected with a helpful message.

**Dependency and build tooling.**

- `xcode@3.0.1` now resolves `uuid@11.1.1`, removing the second advisory even though its affected buffer APIs were not on the observed Xcode v4 path. A regression exercises actual Xcode identifier generation and rejects a short UUID v5 buffer.
- Applied the SDK 57 patch updates required by Expo Doctor: Expo 57.0.26, Router 57.0.24, UI 57.0.21, Constants 57.0.20, DocumentPicker 57.0.3 and TaskManager 57.0.21.
- Regenerated the existing Router lifecycle patch as `patches/expo-router+57.0.24.patch`. Its functional diff is unchanged. The obsolete 57.0.23 patch was removed.
- Removed `expo-device` and `expo-web-browser`, which had no application imports or dependency/peer consumers in the reviewed graph. Kept `@expo/ui`, `expo-glass-effect` and `expo-symbols`, which Router declares as peers; retained platform/animation/font dependencies needed indirectly. An import search alone is not grounds for deleting a native dependency.
- Completed the nine previously failed package metadata/download lookups. They resolved to the expected projects and established package usage. These checks reduce uncertainty about names/origins; they are not an exhaustive malware assessment.

The decoder and UUID fixes follow their published advisories: [decoder maintainer advisory](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr), [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq). SDK APIs were checked against the [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), including [notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [image picker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) and [filesystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/).

## Verification record

The final automated suite has **138 passing tests**. It includes the original 101 tests plus 37 security/failure regressions. Lint and TypeScript pass. Expo Doctor passes **21/21 checks**. `npm audit` reports **0 vulnerabilities** for the final lockfile, down from 17 moderate package entries associated with two underlying advisories. Audit counts are a time-specific registry result, not a promise of permanent safety.

A separate temporary directory received a clean `npm ci`: both versioned patches applied successfully, and the installed decoder handled the malformed-query probe. This verifies that the fix survives a fresh installation rather than depending on an unrecorded `node_modules` edit. The project itself was not reset or cleaned; pre-existing user work was preserved.

Production-mode exports completed for **Android, iOS and web** using the final dependency graph and source. They were written to `/tmp/dosetracker-security-export` with dotenv loading and Sentry uploads disabled. The generated files were inspected for environment files, source maps and the exact local build token; none were found. Bundle hashes and results are recorded in the evidence directory. A Metro export exercises compilation and packaging, not native notification delivery, biometric prompts, OS permission behavior or release signing.

Evidence:

- [Test results](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/tests.log), [lint](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/lint.log), [TypeScript](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/typecheck.log)
- [Expo Doctor](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/expo-doctor.log), [npm audit](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/npm-audit.json), [clean installation](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/clean-install.log)
- [All-platform export](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/export.log), [artifact inspection and hashes](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/artifact-inspection.json), [provenance follow-up](/Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/remediation/package-provenance.json)

The original audit's reproduction script intentionally asserts vulnerable behavior and is retained as historical evidence. Use `npm test` for the corrected security regressions; do not treat the old reproducer as a test that must remain passing.

## Lessons to preserve

1. **Protect every entry point, not just screens.** Background tasks and notification buttons can mutate data without mounting React UI. Authorization belongs at the shared mutation boundary. Check security state when queued work executes, and serialize changes to that state with the work.
2. **Failure must not turn a saved lock off.** Missing first-install state, an explicit off value, an unreadable value and corrupt data are different cases. OS presentation failures cannot justify rolling back a saved security preference or exposing protected children. Report partial completion accurately.
3. **Privacy changes affect existing copies.** Rescheduling does not dismiss a delivered notification. A database migration does not remove old JSON. Inventory each store, including the notification tray, and clean obsolete copies explicitly.
4. **Migrate before deleting the only copy.** Commit SQLite first, scrub the legacy record second, and make retries idempotent. Store setup flags through an allowlist, not a spread of a larger object. A user clearing a note must not leave an unnoticed stale onboarding snapshot.
5. **A patched version is only useful if the consumer still works.** CommonJS/ESM boundaries, Metro, lockfiles and postinstall patches are part of the fix. Keep scoped overrides and the query-string adapter together. Test normal input and malformed input, clean installation and all-platform compilation. Do not use `npm audit fix --force` as a substitute for this work.
6. **Do not hide useful validation or expose unexpected internals.** Mark intentionally safe domain errors at their origin; all other failures get a generic message. Avoid allowlisting broad arbitrary error strings or sending them to diagnostics.
7. **Check the resource you actually consume.** Picker metadata can be incomplete. Check actual file size before reading, bound image dimensions, inspect bytes, close handles, and delete temporary copies even on rejection. Filename/MIME filtering alone is insufficient.
8. **Keep evidence and its limits.** A green test suite proves only the assertions it contains. A zero audit count is not a malware certificate. A JS bundle is not a native-device test or a deployed fix. Preserve the baseline and clearly separate implementation, automated checks, device verification and release.

These rules are also linked from `AGENTS.md` and reflected in [Settings architecture](SETTINGS_ARCHITECTURE.md).

## Required native/release follow-up

These checks remain **pending**, not silently counted as completed:

- Build a new Android development/preview binary with the updated native package versions. No app config, permission, sound resource or custom native-module source was changed in this correction. A Metro reload of the previous binary does not establish compatibility with updated native packages.
- On a test device, check Take/Skip/Snooze with app lock on/off in foreground, background and terminated states; press a notification delivered before enabling lock. Verify no history/stock/snooze/profile change while lock is on, and normal actions after disabling it.
- Check stricter privacy with visible notifications, no active medicines, reminders disabled and permission revoked. Verify stale content is dismissed and failures offer a retry. Do not promise removal from OS notification history or screenshots.
- Verify biometric/device-credential prompts, returning from background during a lock-setting change, screen-capture/app-switcher protection, and the fail-closed retry screen.
- Test upgrading an old installation with a legacy profile, profile photo selection on Android/iOS, and preference imports on native and web. Use synthetic records; preserve real user data.
- Inspect the actual signed release artifact and deployed static hosting/Sentry project settings before distribution. This session did not publish a website, send live diagnostics, create a cloud build, install a binary, sign a release or submit to a store.

## Relevant source and tests

- Lock/actions/privacy: `src/notificationManager.js`, `src/features/security/{SecurityManager.js,AppLock.tsx,DeviceAuthenticationSettingsScreen.tsx}`, `src/app/notification-privacy.tsx`, `tests/notificationManager.test.cjs`.
- Setup migration: `src/features/onboarding/{storage.ts,migration.ts,context.tsx}`, `src/app/{profile.tsx,ready.tsx}`.
- Input/error hardening: `src/features/onboarding/{photos.ts,photoValidation.ts}`, `src/features/settings/backup.ts`, `src/features/security/errors.js`, domain error sites in `src/database.js` and `src/notificationManager.js`, screen error handlers.
- Dependency pins/patches: `package.json`, `package-lock.json`, `patches/query-string+7.1.3.patch`, `patches/expo-router+57.0.24.patch`.
- Security regressions: `tests/security.test.cjs`; existing SQLite profile migration tests in `tests/database.test.cjs` remain active.
