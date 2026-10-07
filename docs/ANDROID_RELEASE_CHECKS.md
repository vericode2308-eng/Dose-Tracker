# DoseTracker local Android release checks

Updated 2026-10-03. **Signed fresh-package AAB built and statically validated for `com.vericodestudio.dose_tracker`. Runtime verification of this binary remains pending. Earlier runtime results apply only to the former package.**

The owner confirmed no previous Play upload and selected local Gradle, without creating an EAS project. The owner subsequently approved creating the missing dedicated upload key and performing the local build. `eas.json` is unchanged and has no effect on direct Gradle builds. Existing unrelated working-tree edits are preserved.

## Fresh package rebuild — 2026-10-03

The owner reported an existing rejected app under `com.vericodestudio.dosetracker` and requested a fresh identity. Android does not allow hyphens in package names; the owner selected `com.vericodestudio.dose_tracker`. Version remains 1.0.0/code 1 for the new identity. This package is a separate installed app with separate local data and permissions.

- Source: `app.json`; generated Android refreshed through Expo prebuild. Native reminder test target and Play worksheet updated.
- Build: existing local Gradle workflow and dedicated upload certificate; explicit public diagnostics, R8/resource shrinking, Sentry build-time uploads disabled.
- Output directory: `release-artifacts/2026-10-03-dose-tracker-v1/`. Previous artifacts are preserved.
- AAB: `release-artifacts/2026-10-03-dose-tracker-v1/DoseTracker-1.0.0-1.aab` (88,910,059 bytes), SHA-256 `298553d1467a6df38da46779280a06e8fb0fadf4dd8210f7e589511484b54b14`.
- Verification: lint/typecheck, Expo Doctor 21/21, regenerated prebuild and all 704 Gradle tasks passed. Bundle validation, package/version/SDK/permission checks and AAB signature passed with the existing approved upload certificate below. Public-mode Hermes, R8 optimization, matching retained map, notification WAV retention and credential scan passed. All four ABIs retained; AAB-derived APK signer, all 56 64-bit ELF checks and ZIP 16 KB alignment passed. Bundle specifies `PAGE_ALIGNMENT_16K`.
- Runtime: no connected device/emulator; no new-binary runtime pass claimed. The derived `universal.apk` is retained for testing. Full interactive checks remain pending.
- Validation tooling: corrected the disassembler invocation to specify executable bytecode (`-b`); the rerun passed without changing the artifact.
- Release: nothing uploaded by this task. Package availability and resolution of the earlier rejection remain unverified. Earlier emulator results must not be attributed to the new binary.

## Earlier package artifact results — 2026-10-03

- AAB: `release-artifacts/2026-10-02-v1/DoseTracker-1.0.0-1.aab` (88,910,562 bytes).
- SHA-256: `efc4e74da08b65f2695d5d3e794d6424077e008ba58476523a1c68d2c441a2b1`.
- APK generated from that AAB: `universal.apk`; SHA-256 `12e87205fe824f0529ea5b44680af1ca18e21e37034aeaa9506669f52e435e95`.
- Identity: `com.vericodestudio.dosetracker`, version `1.0.0`, code `1`, min SDK 24, target SDK 36; non-debuggable and Android backup disabled.
- Dedicated RSA-4096 upload key created with independent random passwords, JKS, SHA256withRSA and approximately 30-year validity. Private files are outside the repository with directory mode 0700 / file mode 0600. Primary: `/Users/shome/.local/share/dosetracker/signing`; verified same-Mac backup: `/Users/shome/Documents/Projects/Password/DoseTracker Upload Signing`. Make an encrypted off-device backup before distribution.
- Approved certificate SHA-256: `52:FB:0D:67:42:E0:D5:BB:7C:B4:1F:C6:A1:61:B6:F2:1B:78:9D:5F:1D:CD:44:1F:D7:BA:C8:1E:DD:2A:65:0E`; both AAB and APK match. Self-signed upload-certificate trust/timestamp warnings from jarsigner are expected; verification succeeded.
- bundletool 1.18.3 validates the AAB. Its bundle configuration specifies `PAGE_ALIGNMENT_16K`. All 56 64-bit libraries pass the ELF LOAD/rounded RELRO checks; APK ZIP alignment passes `zipalign -c -P 16 -v 4`. Each of arm64-v8a, armeabi-v7a, x86 and x86_64 has 28 libraries with matching 64-bit coverage.
- Two DEX files total 13,346,060 uncompressed bytes. Embedded R8 8.12.14 metadata confirms obfuscation, optimization, shrinking and optimized resource shrinking enabled; ProGuard compatibility mode false. Its no-obfuscation/no-optimization/no-shrinking statistics are 18.24% / 18.81% / 18.07%. These are R8 statistics, not a predicted Play rating or a measured before/after reduction.
- Embedded R8 map equals retained `mapping.txt`. Configuration, usage, seeds, Hermes/source maps, native symbol-table metadata and build logs are retained with the artifact. Sentry source-map/native-symbol uploads were deliberately disabled; readable remote stack traces have not been verified.
- Embedded production Hermes bytecode is 5,430,300 bytes. Compiled diagnostics mode is false for `PRIVATE_QA_DIAGNOSTICS`; default categories remain off. An initial validator assertion incorrectly treated QA cleanup key strings as evidence of QA mode. Bytecode inspection verified the public-mode assignment; erase-all intentionally clears both namespaces, so the string-absence assertion was corrected without changing the artifact.
- Both bundled notification WAVs survive resource shrinking with matching bytes. No matching signing passwords, Sentry auth token or PEM private-key material was found in inflated AAB members.
- Release manifest has the intended notification/exact-alarm permissions and non-exported custom receivers. No broad photo/storage, camera, microphone, location, overlay, USE_EXACT_ALARM or full-screen-intent permission is present. Library-contributed FCM, install-referrer, network, badge, wake-lock and screen-capture-detection permissions are recorded in `artifact-report.json`; their presence does not prove those APIs transmit data. Sentry native auto-init is false.
- First build failed with Gradle Metaspace exhaustion. The tracked plugin now sets a 4 GB heap / 1.5 GB Metaspace; retry used two Gradle workers and succeeded. Initial forced build had already produced public-mode JavaScript; fresh prebuild and retry rebuilt the app while reusing unchanged dependency tasks. The exact resulting bytecode was inspected independently.

### Runtime evidence and limits

The AAB-derived signed APK installed on a disposable Android 36 ARM64 Google APIs 16 KB emulator. `getconf PAGE_SIZE` returned `16384`; airplane mode was enabled, Wi-Fi/mobile data disabled, and adb reverse mappings removed. Cold launch returned `Status: ok`; logcat shows `Running "main"`, successful Hermes/React Native/SQLite/native module loading, and activity display in 360 ms. No app fatal exception, linkage failure or Metro load failure was observed in that startup capture.

This is an offline startup smoke pass, not a completed functional walkthrough. The standalone emulator is unavailable to the supported native UI control, and Android Studio did not expose this temporary AVD in Running Devices. Profile/medicine entry, dose history and persistence, notification delivery/tones/Stop, app-lock gating and erasure on this exact optimized artifact remain pending interactive verification. Earlier debug/integration tests are not substituted for those release checks. Physical-device/OEM reminder behavior and Play-generated split APKs/re-signing remain separate checks.

Lint and TypeScript passed again after the final source/configuration changes. The existing 158 passing automated tests, 21/21 Expo Doctor and three-platform export checks remain valid for the unchanged application source. Nine page-checker tests passed. The tooling advisory below remains unresolved.

## Initial preparation record (historical)

| Item | Proposed value |
| --- | --- |
| App / package | Dose Tracker / `com.vericodestudio.dosetracker` |
| Version / code | `1.0.0` / `1` (owner confirmed no prior Play upload) |
| Android toolchain | Expo 57.0.26, React Native 0.86.3, AGP 8.12.0, Gradle 9.3.1 |
| SDK / minimum | Target and compile 36 / minimum 24 |
| Build tools / NDK | 36.0.0 / 27.1.12297006 |
| Java for local checks | JBR 21.0.11 |
| Optimization | R8 full mode, optimized default ProGuard file, code/resource shrinking, AGP 8.12 optimized resource shrinking |
| Native packaging | Uncompressed native libraries; verify final APK ZIP and ELF alignment |
| Diagnostics | Explicit `EXPO_PUBLIC_DIAGNOSTICS_MODE=public`; each category remains opt-in |
| Signing | Dedicated upload key subsequently created and verified; see exact results above |

If no DoseTracker upload key already exists, propose generating a dedicated RSA-4096 upload key with SHA256withRSA, 30-year validity, and independently generated passwords. Store outside the repository with restricted permissions, record only the public certificate fingerprint in release evidence, and arrange an off-device backup. Do not reuse Tape Mark's key by assumption. This proposal was subsequently approved and completed; see the exact results above.

## Source corrections

- `expo-build-properties` 57.0.22 enables minification and resource shrinking in `app.json`.
- `plugins/withAndroidRelease.cjs` persists R8 full mode and optimized resource shrinking and replaces Expo's `proguard-android.txt` default (which disables optimization). An unrecognized template fails for review on SDK changes.
- `plugins/android-release.gradle` configures native symbol-table metadata and accepts four process environment variables: `DOSETRACKER_UPLOAD_STORE_FILE`, `DOSETRACKER_UPLOAD_STORE_PASSWORD`, `DOSETRACKER_UPLOAD_KEY_ALIAS`, `DOSETRACKER_UPLOAD_KEY_PASSWORD`. Supply all four together. No credential values are checked into source.
- The release guard rejects missing/debug distribution signing and non-public distribution diagnostics. Explicit local debug QA remains possible using `-Pdosetracker.allowDebugRelease=true`; its outputs are not Play artifacts.
- The local notification module's `res/raw/dosetracker_keep.xml` explicitly preserves `gentle.wav` and `clear.wav`, which Expo resolves by name. Final resource retention must still be checked after shrinking.
- Private artifacts, credentials and keystores are ignored. No generated Android source was hand-edited. Prebuild applied the tracked configuration.

## Preparation evidence

| Check | Result |
| --- | --- |
| Expo lint and TypeScript | PASS after configuration changes |
| JS, SQLite, settings, security and notification tests | 158/158 PASS |
| Expo Doctor | 21/21 PASS |
| Production exports | Android Hermes, iOS Hermes and web PASS with public diagnostics and dotenv disabled |
| Expo Android prebuild | PASS; generated minify/shrink/full-mode/optimized-resource properties and optimized ProGuard defaults inspected |
| Gradle distribution guard | PASS: rejected debug signing as intended; no AAB task executed |
| Android runtime availability | No device connected during preparation; installed Pixel 9 emulator is API 35. No 16 KB runtime has been verified |
| Dependency audit | Six high entries from one unresolved tooling advisory; see below |

Logs: [release-checks/2026-10-02](release-checks/2026-10-02/). Earlier reminder/debug-emulator results do not validate a future optimized release.

### Dependency audit limitation

The npm audit graph traces six high entries to `node-forge` via Expo CLI/code-signing tooling. [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) lists no patched version as of this check. The graph does not establish six independent application vulnerabilities. No compatible fix was applied, and npm's suggestion to downgrade Expo to 44 is unsuitable. Do not describe this as a clean audit. Java's Android signing tools, rather than node-forge, will sign/verify this local AAB. Recheck the advisory before release and inspect final bundled content separately.

## After approval: build and validate the exact artifact

1. Establish the approved upload certificate fingerprint and private credential storage. Confirm version code 1 remains unused at upload time.
2. Freeze the intended source, record its working-tree state and lockfile hash, and rerun affected checks if it changes. Generate Android with `EXPO_NO_DOTENV=1 npx expo prebuild --platform android --no-install`.
3. Use JDK 21, explicit `NODE_ENV=production`, `EXPO_NO_DOTENV=1` and `EXPO_PUBLIC_DIAGNOSTICS_MODE=public`. Supply signing variables through a private process environment, never inline plaintext passwords or logged commands. Run `:app:bundleRelease --rerun-tasks` from `android/` to avoid a previously cached QA bundle. Do not use the debug QA exception.
4. Decide Sentry build-time uploads explicitly. A fully local validation can set `SENTRY_DISABLE_AUTO_UPLOAD=true` and `SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD=true`, retaining the exact Hermes/source maps for later upload. This does not disable opted-in runtime reporting and does not establish readable Sentry crash reports. Do not embed the Sentry auth token in JavaScript or public environment variables.
5. Retain the AAB, SHA-256, matching R8 mapping/configuration, Hermes maps and build log together in an ignored release-artifact directory. Never overwrite a retained release with a different binary under the same identity.
6. Run bundletool validation and inspect its manifest/configuration. Verify the AAB signature and certificate against the approved upload fingerprint. Check package, version, target/minimum SDK, `debuggable=false`, `allowBackup=false`, merged permissions, exported components, custom reminder receivers and bundled sounds. Confirm no unnecessary recording, media-storage or overlay permissions reappeared.
7. Verify an embedded production Hermes bundle, required assets, no Metro/dev-server dependency or private-QA configuration, and no credential material. Inspect actual DEX bytes, R8 metadata, absence of global `-dontoptimize`/`-dontshrink`/`-dontobfuscate`, and byte equality of embedded `proguard.map` with the retained map. Inspect native symbol metadata availability; pre-stripped dependencies may not provide symbols.
8. Generate APKs **from that AAB** with bundletool. Verify APK signer, retained resources, 64-bit ABI coverage, every 64-bit ELF LOAD alignment and relevant RELRO layout, bundle `PAGE_ALIGNMENT_16K`, and `zipalign -c -P 16 -v 4`. No measured DEX reduction or 16 KB pass is claimed before these checks.
9. Install the AAB-derived APK on a disposable emulator/device and launch with no Metro connection. Use fictional records. Exercise first-run routing, profile/medicine/schedule storage, dose actions, restart/persistence, security gating, native reminders, bundled tones and Stop behavior. Check logcat for crashes, linkage errors or missing resources. Do not erase an existing user's data to resolve signing conflicts. A different installed signer requires a disposable environment.
10. Run on a confirmed 16 KB runtime (`getconf PAGE_SIZE` = `16384`) if available. Record static and runtime results separately; no 16 KB runtime means that item remains pending. Physical-device/OEM reminder behavior and Play re-signing/distribution remain distinct checks.
11. Deliver the exact artifact path/hash and evidence, with any remaining failures or unverified behavior. Upload/publishing requires its own authorized action. If source changes, rebuild and repeat the relevant exact-artifact checks.

## Official technical references

- [Expo SDK 57 BuildProperties](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)
- [Android R8 configuration](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization)
- [Android 16 KB compatibility](https://developer.android.com/guide/practices/page-sizes)
- [Native debug symbols](https://developer.android.com/build/include-native-symbols)

Google Play's final optimization rating and warning removal can only be observed after it processes the uploaded artifact.
