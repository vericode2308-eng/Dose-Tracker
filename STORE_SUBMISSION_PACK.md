# Dose Tracker — Apple App Store submission pack

Scope: **Apple App Store only.** Google Play is already live and out of scope for this pack (see `playstore_assets/LISTING.md`, `docs/GOOGLE_PLAY_POLICY_AUDIT.md`, `docs/ANDROID_RELEASE_CHECKS.md` for that history). This document covers the iOS release of the same codebase.

Last refreshed 2026‑10‑23, after Sentry and the optional diagnostics feature were removed from the app (commit `7dd2ed0`). This is preparation for submission, not permission to publish, and not a guarantee of App Review approval.

---

## 1. Readiness verdict

**Update 2026‑10‑24: owner reports version 1.0 submitted for App Review** with the Xcode archive `DoseTracker 23-10-26, 10.42 PM` (1.0.0 build 1; Sentry-free, `ITSAppUsesNonExemptEncryption=false` — checked locally). Entered in the console this session: listing copy (§2), Version `1.0.0`, Copyright, Name `Dose Tracker`, subtitle, reviewer notes (menu paths corrected to Settings > Reminders > Sound & vibration and Settings > Privacy > Device authentication), sign-in not required, all Age Rating capabilities NO. Screenshots, contact details, EU trader status and release option were entered by the owner and not seen here. The blockers below are kept for history.

**Metadata, policy and config: READY. Submission: still blocked on the build and screenshots, plus four owner inputs.**

Resolved 2026‑10‑23:
- ~~Privacy policy Android-only / not deployed~~ — iOS-inclusive and Sentry-free policy is **live** at `https://dosetracker.pages.dev/privacy.html` (Cloudflare Pages deployment `d8b9cce4`, effective October 23, 2026). The previous production deployment returned 404 for every `.html` URL; that is fixed and verified.
- ~~Sentry/diagnostics described in policy, description, App Privacy and reviewer notes~~ — removed everywhere. The app now collects no data off-device (§3.6).
- ~~App icon has alpha~~ — `assets/images/icon-ios.png` (1024×1024 RGB, no alpha) is set as `expo.ios.icon`. Android icon unchanged.
- ~~iPad support unknown~~ — `ios.supportsTablet` is not set in `app.json`, so Expo builds iPhone-only (`UIDeviceFamily = [1]`). No iPad screenshots required.

Remaining blockers, in order:
1. **No App Store build yet.** Run `bunx`/`npx eas-cli@latest credentials` and `eas build --platform ios --profile production` (interactive Apple sign-in required). `ios/` is gitignored, so EAS prebuilds from `app.json`; the stale local `ios/` (which still contains `sentry.properties`) is not used.
2. **No real screenshots.** `appstore_assets/creative-v1/` has correctly sized 1206×2622 design proofs, but every phone says "Capture pending". Capture from the build in step 1 using the storyboard in `appstore_assets/creative-v1/README.md`.
3. **Owner inputs:** review contact name and phone; EU trader status (§3.10); confirm Agreements, Tax and Banking shows Active.

---

## 2. Final recommended listing copy

### App name (READY)
```
Dose Tracker
```
12 characters (limit 30). Matches the installed display name and Android branding.

### Subtitle (READY)
```
Pill & Medicine Reminders
```
25 characters (limit 30). Adds keyword value without repeating "Dose"/"Tracker" from the name.

### Keywords field (READY — qualitative only, no ASO tool data)
```
medication,prescription,dosage,adherence,refill,caregiver,senior,pharmacy,organizer,treatment,meds
```
98 bytes (limit 100). No spaces after commas, no repeats of name/subtitle words, no competitor names. A reasoned guess, not backed by search-volume data — re-derive if you get access to an ASO tool.

### Promotional text (READY)
```
Track medicines, doses and stock. Optional local reminders and Face ID lock. No ads, no account — your health data stays on your device.
```
136 characters (limit 170).

### Description (READY)
```
Dose Tracker by VeriCode helps adults 18+ organize their own medicines and those of dependents they are authorized to care for.

- Keep separate local profiles and enter medicine names, dose instructions and schedules.
- Record taken or skipped doses and review your dose history.
- Track recorded stock and see in-app warnings at your chosen threshold. Enter refills and keep counts up to date; stock warnings do not send background refill notifications.
- Enable optional local reminders for ongoing daily or selected-weekday schedules starting today. On iOS 26.1 and later, choose Ring Repeatedly for an alarm that keeps sounding until you respond. Interval and bounded-course schedules support tracking only. As-needed medicines have no automatic reminders.
- Choose notification privacy and optional Face ID app lock.

Health records stay in private device storage. No online account, subscription or advertising is required. The app has no analytics, ads or diagnostics reporting and sends nothing to VeriCode. See the privacy policy for data, retention and deletion details.

Reminders depend on your device permissions, notification settings, Focus/Do Not Disturb and device state. Delivery may be delayed or prevented. Keep another dependable method for time-critical medication. Dose history reflects your entries, not verified medicine intake.

Dose Tracker is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment. Follow your care team's instructions.

Privacy policy: https://dosetracker.pages.dev/privacy.html
Support: support@vericodestudio.com
```
1,675 characters (limit 4,000). Claims checked against source: AlarmKit "Ring Repeatedly" (`modules/dose-alarm-access/ios/DoseAlarmAccessModule.swift`), Face ID lock (`expo-local-authentication` plugin `faceIDPermission` in `app.json`), no ads/account/subscription/analytics (no such dependency in `package.json`; no network calls in `src/` or `modules/` other than links to the website).

---

## 3. Field-by-field answer tables

Statuses: READY / PROPOSED / NEEDS INPUT / NOT APPLICABLE / STORE-GENERATED.

### 3.1 App record and identity

| Field | Required | Value | Status | Evidence |
| --- | --- | --- | --- | --- |
| Platform | Required | iOS | READY | — |
| Primary language | Required | English (U.S.) | READY | No other localization exists |
| App name | Required | Dose Tracker | READY | §2 |
| Bundle ID | Required | `com.vericodestudio.dosetracker` | READY — **do not change** | `app.json` `expo.ios.bundleIdentifier` |
| SKU | Required | `dosetracker` | READY | Owner-chosen |
| App Store Connect app record | Required | — | Owner-confirmed as set up | Not independently inspected |
| Apple Developer Program (paid) | Required | — | Owner-confirmed available | `docs/CORRECTIONS_LOG.md` |
| EAS iOS credentials | Required for `eas build`/`eas submit` | Not yet linked | **BLOCKER — your next step** | `eas.json` has bare `ios: {}` profiles; EAS project linked (`extra.eas.projectId`) |

### 3.2 App information

| Field | Required | Value | Status | Evidence |
| --- | --- | --- | --- | --- |
| Subtitle | Optional | Pill & Medicine Reminders | READY | §2 |
| Primary category | Required | Medical | READY | Medication/dose tracking; matches Play's health declaration |
| Secondary category | Optional | Health & Fitness | READY | — |
| Content rights | Required | "No, it does not contain, show, or access third-party content" | READY | Icon, sounds and artwork are VeriCode's own |
| Copyright | Required | `© 2026 VeriCode` | READY | Owner-chosen |
| License agreement | Optional | Apple's standard EULA | READY | `legal/TERMS_OF_SERVICE.md` is a product-use notice, not an EULA |

### 3.3 Localized version information

| Field | Required | Value | Status |
| --- | --- | --- | --- |
| Description | Required | §2 block | READY |
| Keywords | Required | §2 block | READY |
| Promotional text | Optional | §2 block | READY |
| Support URL | Required | `https://dosetracker.pages.dev/support.html` | READY — live, verified 2026‑10‑23 |
| Marketing URL | Optional | `https://dosetracker.pages.dev/` | READY — live |
| Privacy policy URL | Required | `https://dosetracker.pages.dev/privacy.html` | READY — live, Sentry-free, verified 2026‑10‑23 |
| What's New | Not required for a first version | — | NOT APPLICABLE |

### 3.4 Media

| Asset | Required | Status |
| --- | --- | --- |
| App icon 1024×1024, no alpha | Required | READY — `assets/images/icon-ios.png` (RGB). Delivered inside the build; App Store Connect takes it from the binary. The artwork has a drawn rounded-square frame, so iOS's own mask will show a faint inner border; a full-bleed redraw is optional polish, not a blocker. |
| iPhone screenshots, 1206×2622 or 1179×2556 portrait, 1–10, no alpha | Required | **MISSING** — `appstore_assets/creative-v1/01–04` are capture-pending design proofs at the right size. Do not upload until real captures replace the placeholder panels. Apple scales these down for smaller iPhones. |
| iPad screenshots | Not required | NOT APPLICABLE — iPhone-only build |
| App previews (video) | Optional | Not prepared |

Requirements source: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), checked 2026‑10‑23. iPhone Duo screenshots become required from April 2027 for apps built with the iOS 27.1 SDK or later; recheck at submission.

### 3.5 Review information

| Field | Required | Value | Status |
| --- | --- | --- | --- |
| First name / Last name | Required | — | NEEDS INPUT |
| Phone number | Required | — | NEEDS INPUT |
| Email | Required | `support@vericodestudio.com` | READY |
| Sign-in required | Required | No | READY — no account system |
| Demo account | — | — | NOT APPLICABLE |
| Notes for reviewer | Recommended | Below | READY |

Reviewer note:
```
Dose Tracker has no sign-in and no server account — all data is created locally during review.

To see the core flow: complete onboarding (create a local profile), add a medicine with a daily schedule, and allow notification permission when prompted. Optional "Ring Repeatedly" alarms (iOS 26.1+) use AlarmKit; the system AlarmKit permission prompt appears only if you turn on Settings > Reminders > Sound & vibration > Ring repeatedly. Face ID app lock is optional and found in Settings > Privacy > Device authentication.

The app has no ads, in-app purchases, subscriptions, analytics or diagnostics reporting, and makes no network requests other than opening our help and policy web pages in the browser.

Dose Tracker is not a medical device. It is a personal medication/dose organizer for adults 18+, who may also track dependents they are authorized to care for.
```

### 3.6 App Privacy

Answer: **Data Not Collected.** Definitions checked 2026‑10‑22 at [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/): data processed only on-device is not "collected".

| Data type | Collected? | Evidence |
| --- | --- | --- |
| Health & Fitness | No | Stored only in app-private SQLite (`src/database.js`); never transmitted |
| Contact Info / profile names, DOB, photos | No | Local-only; photos copied to app-private storage |
| Diagnostics (crash, performance, other) | No | Sentry removed in `7dd2ed0`; no crash/analytics SDK in `package.json` |
| Identifiers, Usage Data, Location | No | No such APIs or SDKs; no location permission |
| Tracking (ATT) | No | No `AdSupport`/`AppTrackingTransparency`; no ATT prompt needed |

Support emails are sent by the user from their own mail app, outside the app, so they are not app data collection.

### 3.7 Age ratings

Apple's 2025–26 questionnaire: tiers 4+, 9+, 13+, 16+, 18+, with a separate "Made for Kids" / override choice ([Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)).

| Item | Answer | Status |
| --- | --- | --- |
| Violence, mature themes, gambling, contests, web access, user-generated content | None | READY |
| Medical or wellness topics | Yes, truthfully: organizes the user's own medication schedule; gives no medical advice, dosing recommendations or diagnosis | READY — answer in console |
| AI assistant / chatbot | No | READY |
| Made for Kids | No — adults 18+ | READY |
| Resulting rating | Calculated by App Store Connect; do not pre-assert | STORE-GENERATED |

### 3.8 Encryption / export compliance

| Item | Answer | Status | Evidence |
| --- | --- | --- | --- |
| Uses non-exempt encryption? | No — only OS-provided encryption (Keychain via `expo-secure-store`); the app makes no network requests of its own | READY | `app.json` `ITSAppUsesNonExemptEncryption: false`, so App Store Connect won't ask per build |
| Privacy manifest | Generated at prebuild from Expo module manifests (required-reason APIs: file timestamp, UserDefaults, system boot time; no collected data; tracking false) | READY | Check the archive's `PrivacyInfo.xcprivacy` once the EAS build exists |

### 3.9 Distribution and commercial settings

| Field | Value | Status |
| --- | --- | --- |
| Price | Free | READY |
| In-app purchases | None | READY |
| Availability | All countries and regions | READY |
| Release type | Manual release after approval | READY |
| Agreements, Tax, and Banking | Must show Active, even for a free app | NEEDS INPUT — check once in App Store Connect → Business |

### 3.10 Conditional requirements

| Item | Applies? | Notes |
| --- | --- | --- |
| EU Digital Services Act trader status | Yes (EU included) | NEEDS INPUT — "trader" if VeriCode is a registered business (its address/phone/email are then shown publicly on the EU listing); "not a trader" if you publish as an individual. |
| Regulated medical device | No | Disclaimed in app, policy and description |
| HealthKit, IAP, Game Center, App Clips | Not used | — |

---

## 4. Asset manifest

**Have:**
- iOS icon `assets/images/icon-ios.png` (1024×1024, no alpha)
- Privacy, Terms, Support, Data-deletion pages live at `dosetracker.pages.dev` (deployment `d8b9cce4`, verified 2026‑10‑23)
- Screenshot storyboard and 1206×2622 design frames in `appstore_assets/creative-v1/`

**Missing:**
- An App Store build (EAS production) and its linked credentials
- Real screenshots captured from that build

---

## 5. Order of work from here

1. `npx eas-cli@latest credentials` → iOS → production: sign in with the paid Apple account and let EAS create the distribution certificate and provisioning profile for `com.vericodestudio.dosetracker`.
2. `npx eas-cli@latest build --platform ios --profile production`. Consider adding `"autoIncrement": true` to the production profile (with `cli.appVersionSource: "remote"`) so build numbers don't collide on re-uploads.
3. Install the same build via TestFlight; capture the four screenshots at 1206×2622 following the creative-v1 storyboard; finish the frames.
4. App Store Connect: enter §3.2–§3.10, upload screenshots, add review contact details.
5. `npx eas-cli@latest submit --platform ios` (or pick the build already uploaded by TestFlight), select it on the version, submit for review.

---

## 6. Outside this pack, but important

The **released Android build (1.0.0, code 1) still contains opt-in Sentry diagnostics**, while the live privacy policy now says the app sends nothing. Ship a Sentry-free Android update (current source is) and update Play Console Data Safety to "no data collected" so both stores match the policy.

---

## 7. Post-launch measurement

- Use App Store Connect Analytics (impressions, page views, conversion, downloads); no SDK needed, and adding one would change the "Data Not Collected" answer and the policy.
- Watch Ratings and Reviews for recurring themes.
- Consider [Product Page Optimization](https://developer.apple.com/app-store/product-page-optimization/) only once there is enough traffic for a conclusive test.

*Readiness above refers to this configuration; it is not a guarantee of App Review approval.*
