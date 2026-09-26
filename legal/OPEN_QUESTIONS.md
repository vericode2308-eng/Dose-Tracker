# Terms decisions requiring owner and counsel confirmation

The repository cannot establish the following legal or commercial choices. Bracketed placeholders in `TERMS_OF_SERVICE.md` correspond to these questions. No choice below has been treated as a settled product fact.

Owner direction: leave warranty, liability, dispute-resolution/arbitration, and indemnity choices for counsel. The current app is free, so no refund clause is drafted. Operator and jurisdiction details will be supplied separately.

| Priority | Decision | Needed answer |
| --- | --- | --- |
| Must fill | Operator and contact | Exact legal entity or individual operating DoseTracker; legal/postal address if required; contact email for legal notices and support. The Android package name (`app.json:26`) does not establish an operator. |
| Must fill | Effective date and markets | Launch/effective date, countries of distribution, and whether the published document covers iOS/web as well as Android. |
| Must fill | Eligibility | Minimum age, whether minors may use through a parent/guardian, and whether a caregiver may enter another person's health data. The app has no age or authority check (`src/app/profile.tsx:75-114`). |
| Must fill | Applicable law and venue | Governing jurisdiction, courts/venue, mandatory consumer-law carve-outs, and any dispute-resolution process. There is no arbitration mechanism in code, so none is drafted. |
| Must fill | Warranty and liability | Jurisdiction-specific warranty wording and lawful liability exclusions or cap. The draft uses bounded language and consumer-law savings clauses, with no invented monetary cap. |
| Must fill | IP and app license | Actual copyright owner; whether DoseTracker code is proprietary or open-source; whether current `LICENSE` is applicable, because it credits Expo (`LICENSE:1-20`). Confirm icon, sound, image, and other asset licenses. |
| Must fill | Privacy notice and legal presentation | Separate health-data privacy notice, in-app/store link, legal notice method, and whether/when users affirmatively accept Terms. Current onboarding has no click-through (`src/app/_layout.tsx:47-63`). |
| Confirm | Pricing/refunds | Current UI says free/no subscription (`src/app/welcome.tsx:17-19`). Confirm no paid distribution price, optional purchase, or future paid feature at launch. If paid, this draft needs new purchase/refund terms and a product audit. |
| Confirm | Product claims | Replace “Never miss a dose” and verify stock-alert claims before release (`src/app/notifications.tsx:42`; `src/features/medicines/AddMedicineScreen.tsx:149`). Confirm whether this is intended solely as a self-management aid, with no clinical service or emergency-use promise. |
| Confirm | Data and third parties | Verify release build for any crash analytics, OTA update, cloud service, platform backup, and store-specific SDK that differs from the checked source. Confirm whether any external files shared by users can be recalled (the app cannot do so in current code). |
| Optional | Indemnity | Whether any narrow user indemnity is appropriate and enforceable. Omitted from the draft because this local, free app has no code-backed commercial or public-content workflow warranting a broad clause. |

## Drafting assumptions to correct

- The current version is free to use, without accounts, ads, cloud sync, AI, or app-run purchases. These are scoped findings from the checked source and `src/app/welcome.tsx:17-19`, not promises about every future release.
- Users or caregivers enter their own medication information and may manage profiles for people for whom they have authority. The **authority requirement** is a proposed legal term and needs owner/counsel confirmation.
- The app is a personal organization aid, not medical advice, diagnosis, prescribing, emergency assistance, or guaranteed adherence. This matches the current functions but needs product/regulatory review.
- No operator-run remote account exists to suspend. The draft covers stopping local use and local erasure only.
- The operator will make a final version of Terms accessible to users at the agreed location and will use the confirmed notice method for changes. That presentation flow is **not implemented** in current code.

Relevant official review context: [FTC health privacy guidance](https://www.ftc.gov/business-guidance/privacy-security/health-privacy), [FTC mobile health app guidance](https://www.ftc.gov/business-guidance/resources/mobile-health-app-developers-ftc-best-practices), and [FDA device-software guidance](https://www.fda.gov/medical-devices/digital-health-center-excellence/device-software-functions-including-mobile-medical-applications). These resources do not decide this app's regulatory classification; qualified local counsel should assess the release facts and jurisdictions.
