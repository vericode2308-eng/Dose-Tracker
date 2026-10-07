# Google Play policy audit — 2026-09-29

## Current release/legal update — 2026-10-03

The dated findings below are historical and do not describe the corrected release. The current form worksheet is [playstore_assets/LISTING.md](../playstore_assets/LISTING.md#play-console-answer-worksheet--checked-2026-10-03); exact AAB evidence and remaining runtime checks are in [ANDROID_RELEASE_CHECKS.md](ANDROID_RELEASE_CHECKS.md).

Owner confirmed adults 18+, no prior Play upload, deletion/support email support@vericodestudio.com, and email deletion within 90 days after resolution unless legally required longer. Optional diagnostics now have three separate default-off categories: errors, fixed logs and manual performance traces. Earlier errors-only descriptions are superseded.

Privacy, Terms & Use and deletion pages were generated from the legal sources and deployed to the existing Cloudflare Pages project, then checked in the in-app browser. Legacy `/?legal=terms` correctly redirects. The original contract draft is retained privately as `legal/TERMS_DRAFT_FOR_REVIEW.md`; only three approved public Markdown notices are staged by `scripts/stage-landing.py`. Internal product facts/open questions are excluded from deployment.

Sentry organization uses EU data storage. Project IP-address storage prevention is enabled, default scrubbing is on, minidump storage disabled, no data forwarders configured, and aggregated identifying data use is off. DPA v5.1.0 was accepted with explicit owner authorization (Sentry displays signed Oct 2; local date Oct 3). Additional sensitive-field scrubbing removes city/subdivision/region/country_code/ip_address from future events; it does not erase earlier events. The policy accurately acknowledges network connection processing and plan-dependent retention.

One synthetic error envelope was accepted and inspected in Sentry (DOSE-TRACKER-2): geography fields `[Filtered]`, zero identified users, zero replays/attachments. It was resolved after validation. This confirms server-side redaction for that sample, not in-app delivery or no geographic processing. The form worksheet now explicitly covers inferred approximate location and leaves ephemeral processing unclaimed until supported.

Remaining: verify actual in-app report delivery and provider ephemeral-processing criteria; choose/confirm post-trial retention plan; complete the actual Console forms and release screenshots; finish interactive optimized-release reminder/storage/security checks. Neither DPA acceptance nor static checks establish Google approval. No Play upload or form submission was performed.


**Original assessment (before corrections): not ready for a compliance sign-off.** The current source contains disclosure and product-claim gaps. Other requirements depend on the submitted Android bundle, published website, and Play Console settings, which were not available for verification.

Scope: app screens and navigation, data storage/deletion, notifications and native alarm module, SDK configuration, Expo configuration introspection, local legal/landing content, and store-asset documentation. This was a source/configuration audit, not a native-device walkthrough or a determination by Google. No application behavior was changed.

## Correction update — 2026-09-29

The implementation now addresses the confirmed source-level findings:

- Sentry initializes only after explicit consent in Settings; withdrawal and local erasure stop future reporting. Consent is separate from preferences backups. Only allowlisted JavaScript error fields are sent; native dumps, replay, screenshots, remote logs and tracing are disabled. Reports are not persistently queued.
- Privacy text identifies VeriCode and support@vericodestudio.com, covers adult (18+) operators, Sentry, deletion, website hosting/fonts and support email. A static `landing/privacy.html` is generated from `legal/PRIVACY_POLICY.md` with `python3 scripts/render-privacy.py`; it works without JavaScript. Settings and onboarding link to it.
- Medical disclaimers and realistic reminder/stock limits appear in the app, landing page and store-listing draft. Unsupported competitor claims were removed. The support form now prepares an email instead of falsely reporting receipt.
- Expo blocks overlay, broad media and legacy storage permissions. Prebuild regenerated Android from configuration; generated native files remain untracked.
- `playstore_assets/LISTING.md` supplies accurate proposed listing copy and the remaining submission work. Design previews are labeled and still need final release captures.

The findings below are retained as historical evidence. Publication, Console declarations, actual Sentry retention, final native behavior and the submitted AAB still need release verification. Terms operator/contact/age details were updated; unresolved legal clauses have not been invented.

## Findings requiring correction

### 1. High — remote diagnostics contradict privacy promises

Evidence:

- `src/app/_layout.tsx:15` initializes Sentry immediately with a remote HTTPS DSN, logs enabled, and production traces sampled at 0.2. Initialization is before onboarding or any disclosure/consent choice.
- `src/app/_layout.tsx:33` sends a database-initialization span; lines 35, 41 and 53 emit operational logs. These explicit log messages do not include medicine names.
- `legal/PRIVACY_POLICY.md:41` says logs are never automatically transmitted; line 56 denies crash-reporting SDKs and remote telemetry. The copied `landing/legal/PRIVACY_POLICY.md` also needs revision.
- `src/app/welcome.tsx:24` promises no cloud; `src/features/settings/SettingsHomeScreen.tsx:187` says no cloud connection is used. The landing privacy section (`landing/index.html:991`) omits Sentry entirely.

`sendDefaultPii: false` does not disable SDK transmission. This review did not observe transmitted event bodies and does not establish that medication records are being uploaded.

Correction: either remove production remote diagnostics, or disclose the actual diagnostics service and its data, purpose, retention and deletion handling. Inspect release events, including automatic error context, for health data. Introduce disclosure and affirmative consent before SDK startup where collection falls outside reasonable user expectations; current offline/no-cloud messaging makes this especially relevant. Keep all copies of the privacy notice and in-app copy consistent.

Policy basis: [User Data](https://support.google.com/googleplay/android-developer/answer/10144311) requires accurate data disclosures and additional disclosure/consent for unexpected personal or sensitive data handling. [SDK requirements](https://support.google.com/googleplay/android-developer/answer/13323374) also apply to integrated SDK behavior.

### 2. High — privacy notice is incomplete

`legal/PRIVACY_POLICY.md:3-6` still contains a draft warning and unresolved operator/contact/date placeholders. The HTML policy at `landing/index.html:991-1025` lacks an identified privacy contact and a remote-diagnostics retention/deletion explanation, and links to the unfinished draft. Settings does provide a privacy link (`SettingsHomeScreen.tsx:138`), so the problem is the content and publication verification, not absence of an in-app link.

Finalize the notice with the actual operator/contact and accurate data handling. The [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311) requires developer/contact information, data practices, security, and retention/deletion disclosures. A Markdown document is not inherently forbidden; unresolved draft content is the issue here.

The linked URL is `https://dosetracker.pages.dev/?legal=privacy`. Both web retrieval and a direct request failed from this environment. This does **not** prove the site is unavailable to users. Confirm the live policy opens directly, without login or geographic restrictions, and matches the final text.

### 3. Medium — absolute reminder and stock claims

- `src/app/notifications.tsx:50`: “Never miss a dose”.
- `src/features/medicines/AddMedicineScreen.tsx:213`: “Get low-stock alerts and never run out.”
- `landing/support.html:103-105`: promises reliable alarms every time and guaranteed on-time reminders.

The implementation correctly describes system-dependent delivery (`src/notificationManager.js:109`) and limits recurring alarms to supported schedules (`:47`). The medicine form disables reminders for unsupported recurrence (`AddMedicineScreen.tsx:88`, `:212`). Stock warnings depend on user-maintained quantities; they cannot guarantee supply.

Replace guarantees with factual wording such as “Get reminders for scheduled doses” and “See warnings when recorded stock is low.” Clarify which alerts are in-app versus background notifications and which schedule patterns support reminders. Align website and store copy with these limits.

Policy basis: [Deceptive Behavior / Misleading Claims](https://support.google.com/googleplay/android-developer/answer/17006354) requires accurate descriptions of functionality.

### 4. Medium — unnecessary permissions appear in generated configuration

`npx expo config --type introspect --json` succeeds but includes `SYSTEM_ALERT_WINDOW` and legacy `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` (maximum SDK 32). No overlay feature was found; the photo flow uses a system picker (`src/features/onboarding/photos.ts:5`) and private file storage. The file-system plugin explicitly contributes the legacy storage permissions.

This is configuration evidence, **not a final merged release manifest**. Inspect the production bundle. Remove unnecessary permissions using Expo configuration after checking supported-device picker/export behavior. Do not edit generated Android files.

Positive: camera and microphone have removal directives. No `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `MANAGE_EXTERNAL_STORAGE`, `USE_EXACT_ALARM`, or full-screen-intent permission appeared in the introspected manifest. Library manifest merging still needs verification.

Policy basis: [Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511) calls for removing unused health-app permissions. [Permissions policy](https://support.google.com/googleplay/android-developer/answer/16558241) distinguishes restricted `USE_EXACT_ALARM` from user-granted `SCHEDULE_EXACT_ALARM`; this app uses the latter.

## Release requirements not verifiable from this repository

| Item | Required follow-through |
| --- | --- |
| Health declaration | Complete/verify the Play Console form. The app fits the medication/treatment-management category in Google's [declaration guidance](https://support.google.com/googleplay/android-developer/answer/14738291). |
| Health disclaimer | The actual store description was unavailable. For a non-medical-device app, add the required disclaimer that it is not a medical device and does not diagnose, treat, cure or prevent conditions, plus a reminder to consult a healthcare professional. The website's existing medical-advice statement is narrower. See [Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511). |
| Data safety | Do not declare no collection simply because the health database is local. Inspect Sentry events for crash logs, diagnostics, performance data and identifiers, then declare actual practices. Local-only records need not be declared as collected; SDK transmissions do. A service-provider sharing exception does not remove collection obligations. See [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469). |
| Store screenshots | `playstore_assets/README.md:3` and `design/README.md` identify screenshots as unverified design previews. Replace them with accurate release captures or verify every depicted feature. Mockups are not automatically forbidden; misleading depictions are. See [Metadata](https://support.google.com/googleplay/android-developer/answer/9898842). |
| Target API | New phone-app submissions/updates need API 36 or higher from August 31, 2026, unless an applicable extension applies. SDK 57 alone is not proof of the submitted bundle's target. Inspect the AAB. See [target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878). |
| Audience and rating | Verify target age groups and content-rating answers. Caregiver-managed child profiles do not by themselves establish a child-directed audience. The draft's age/audience placeholder remains unresolved. Check [Families policy](https://play.google/developer-content-policy/) if children are part of the intended audience. |
| Native runtime | Test onboarding, denied permissions, reminders, reboot/time changes, erasure and app lock on the release build. Test notification actions while app lock is enabled: `backgroundActions.ts:14` calls `handleReminderAction`, which mutates records without checking app lock (`notificationManager.js:513`). This is a security/product-behavior question requiring device verification, not a confirmed Play violation. |
| Console/account and assets | Verify developer identity, support details, reviewer access, distribution declarations, asset licenses and final listing. These cannot be established from source. |

## Practices that appear aligned

- Profiles and health records use app-private SQLite; preferences use AsyncStorage and the app-lock flag uses SecureStore.
- Android backup is disabled in configuration. App lock protects app access and Android previews; the app correctly acknowledges that this does not encrypt SQLite itself.
- Local erasure cancels reminders and clears records, settings, photos and the lock flag. This does not delete previously transmitted Sentry events; document those separately.
- Users can decline notifications and continue tracking. Alarm access opens Android settings through explicit user actions.
- Notification privacy redacts message bodies, and scheduling checks system/channel restrictions.
- No app account creation, ads, purchases, subscription flow, public user posts, gambling, prescription sales or generative-AI feature was found in the reviewed source. Their feature-specific rules are not apparent blockers in this version. Account-deletion requirements should not be inferred merely from local care profiles.

## Original audit validation

- `npx expo lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm test`: 46 passed, 0 failed.
- Expo configuration introspection: passed; did not generate an Android project.
- No production AAB/APK, live Play Console declarations, native-device session, or successful live privacy-page retrieval was available for this audit.

Passing static checks and tests does not establish Play approval. Resolve the confirmed disclosure/claim issues, verify the manifest and publication items, and review the exact submitted build before sign-off.

## Verification after corrections

- Lint and TypeScript checks pass; all 52 tests pass, including six diagnostics tests covering default-off behavior, redaction, transport filtering, withdrawal/abort and consent races.
- Android JavaScript export succeeded. Android prebuild and the native development build succeeded; the updated APK was installed on the Pixel 9 emulator.
- The merged **release** manifest targets API 36, omits overlay, legacy storage, broad media, camera and microphone permissions, and sets Sentry native auto-init to false. The debug manifest retains the development overlay permission. Release-manifest generation succeeded with source-map uploading disabled for this local check; no release AAB was submitted.
- Browser verification covered onboarding, the Settings default-off diagnostics control and disclosure, the standalone privacy page, legacy privacy-link redirect and landing-page layout. Native reminder, photo-picker and app-lock behavioral testing remains a release task; native UI automation was unavailable through the connected computer-use surface. No diagnostic event was intentionally sent to the production Sentry project.
- Network-enabled Expo Doctor passed 20/21 checks. Its remaining finding is six available Expo SDK 57 patch updates (@expo/ui, expo, expo-constants, expo-document-picker, expo-router, expo-task-manager). Dependency upgrades were kept outside these policy corrections.
- Website files are updated locally, not deployed. Publish the new privacy page before distributing the app that links to it. Verify Sentry project retention, finalize the effective calendar date at release, complete Console declarations, obtain actual release screenshots and review the final AAB. Unresolved Terms legal/jurisdiction clauses remain clearly marked as draft.
