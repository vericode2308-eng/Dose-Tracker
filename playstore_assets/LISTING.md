# Dose Tracker — store listing draft

Short description:
Track medicines, dose history, and stock with optional local reminders.

Full description:
Dose Tracker by VeriCode helps adults 18+ organize their own medicines and those of dependents they are authorized to care for.

- Keep separate local profiles and enter medicine names, dose instructions and schedules.
- Record taken or skipped doses and review your dose history.
- Track recorded stock and see in-app warnings at your chosen threshold. Enter refills and keep counts up to date; stock warnings do not send background refill notifications.
- Enable optional local reminders for ongoing daily or selected-weekday schedules starting today. Interval and bounded-course schedules support tracking only. As-needed medicines have no automatic reminders.
- Choose notification privacy and optional device authentication.

Health records stay in private device storage. No online account, subscription or advertising is required. Optional error reports, diagnostic logs and performance traces are off by default. Enable each category separately during setup or in Settings to share limited technical reports with Sentry for VeriCode. See the privacy policy for data, retention and deletion details.

Reminders depend on your device permissions, notification settings, battery restrictions and device state. Delivery may be delayed or prevented. Keep another dependable method for time-critical medication. Dose history reflects your entries, not verified medicine intake.

Dose Tracker is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment. Follow your care team's instructions.

Privacy policy: https://dosetracker.pages.dev/privacy.html
Support: support@vericodestudio.com

## Play Console answer worksheet — checked 2026-10-03

These are proposed answers for this version, not submitted Console declarations. Review the actual form wording before submission.

| Form | Answer / evidence |
| --- | --- |
| App identity | Dose Tracker; package `com.vericodestudio.dose_tracker`; version 1.0.0 / code 1; new package selected by owner for a fresh listing after rejection of the previous package. |
| Target audience | **18 and over only**, confirmed by owner. Dependent profiles are operated by authorized adults. This is separate from the IARC content rating; answer the rating questionnaire factually, do not invent an 18+ rating. |
| App access | All functionality accessible without a remote account, subscription or supplied reviewer credentials. Reviewer creates a local profile; optional device lock is configured by the reviewer. |
| Ads / purchases | No ads, in-app purchases or subscriptions in the reviewed release. |
| Health apps | **Medication and Treatment Management**. Do not select “no health features”. Keep the medical disclaimer in the listing above. |
| Privacy policy URL | https://dosetracker.pages.dev/privacy.html — deployed and checked in the in-app browser. |
| Data deletion URL | https://dosetracker.pages.dev/delete-data.html — local erasure plus email requests for already-received diagnostics/support correspondence. |
| Accounts | No online account creation. Local care profiles are not online accounts. Do not invent an account-deletion flow. |
| Support | support@vericodestudio.com. Emails deleted within 90 days after resolution unless legally required longer; owner-confirmed operational rule. |
| Data safety: collection | **Yes**: optional off-device diagnostics. At least **App info and performance → Crash logs and Diagnostics** for JavaScript error reports, fixed diagnostic logs and performance traces. Local-only health/profile/photo data is not off-device collection. Do not answer “no data collected”. |
| Data safety: purpose | **Analytics** for technical fault/performance analysis; no advertising, personalization or account management. |
| Data safety: optional / ephemeral | Collection optional, independently consented per category. **Not ephemeral**, because reports are retained in Sentry. |
| Data safety: encryption | Reports travel over HTTPS. This answer concerns transmission; it does not mean the local SQLite database is separately encrypted. |
| Data safety: sharing | Sentry processes limited reports for VeriCode; service-provider exception is the intended basis for “not shared”. DPA v5.1.0 accepted with owner authorization; aggregated-identifying-data use is off and no forwarders are configured. Reassess if SDKs, destinations or service terms change. This exception does not remove collection disclosures. |
| Data safety: deletion requests | Yes for information VeriCode receives, via the published deletion email/page, subject to locating the report and applicable retention obligations. No persistent person/device identifier is sent by app sanitizers. |
| Location / identifiers | No location permissions or persistent app-provided device/user identifier in sanitized reports. IP-storage prevention and extra IP/geographic field scrubbing are enabled in Sentry. **Approximate location must still be considered collected:** Sentry derives it before scrubbing. A synthetic processed event showed geography `[Filtered]` and zero identified users. Do not claim no processing just because the stored display is redacted. Collection is optional with diagnostics, for Analytics; only claim ephemeral processing after verifying the provider meets Google’s memory-only/real-time definition. No persistent app-provided device/user identifiers were observed. |
| Sensitive permissions | `SCHEDULE_EXACT_ALARM` + `POST_NOTIFICATIONS`; not `USE_EXACT_ALARM` or full-screen intent. No broad photo/storage, camera, microphone or location permissions in final AAB. Use system picker; no health-platform API found. |

### Remaining submission work

- Sentry remains on a trial; post-trial plan is not selected in this task. Published policy describes actual plan-dependent retention, including retention assigned when reports are ingested. Confirm the plan before production distribution and update the policy then. DPA accepted in the Sentry UI (shows “Version 5.1.0 signed Oct 2, 2026”; local date Oct 3).
- Server scrubbing was tested with one synthetic error envelope in environment `release-validation`, containing no health/profile data. Sentry issue DOSE-TRACKER-2 displayed geography `[Filtered]`, zero users, no replays or attachments; it was marked resolved. This checks server processing, not actual in-app SDK delivery, logs/traces or readable source-map symbolication. Google requires inferred approximate location to be disclosed; confirm any ephemeral-processing claim with provider evidence before submission.
- The new-package AAB passes signature/manifest/optimization/64-bit/16 KB static checks. Runtime checks of this rebuilt binary are pending; the earlier offline startup result belongs to the former package. See `docs/ANDROID_RELEASE_CHECKS.md` for hashes and verification limits. Do not call the full runtime matrix passed.
- Capture actual release screenshots using fictional data. Existing assets labeled design previews are not verified release screenshots.
- Complete IARC content-rating questionnaire, developer identity/contact verification, countries/distribution, applicable testing/access requirements and Play pre-launch checks in the actual Console. These were not submitted or inspected here.
- Public Terms & Use information is factual product guidance. Unresolved contractual clauses remain only in `legal/TERMS_DRAFT_FOR_REVIEW.md`, excluded from the website deployment. No jurisdiction, liability cap or arbitration agreement was invented.

Official references: [Health declaration](https://support.google.com/googleplay/android-developer/answer/14738291), [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [User Data](https://support.google.com/googleplay/android-developer/answer/10144311), [Audience](https://support.google.com/googleplay/android-developer/answer/9867159), [Sentry retention](https://docs.sentry.io/security-legal-pii/security/data-retention-periods/), [Sentry geographic scrubbing](https://www.sentry.help/en/articles/13964201-can-i-disable-ip-geolocation-for-gdpr-compliance).
