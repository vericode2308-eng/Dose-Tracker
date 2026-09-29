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

Health records stay in private device storage. No online account, subscription or advertising is required. Optional JavaScript error diagnostics are off by default; if you enable them in Settings, limited technical reports go to Sentry for VeriCode. See the privacy policy for data, retention and deletion details.

Reminders depend on your device permissions, notification settings, battery restrictions and device state. Delivery may be delayed or prevented. Keep another dependable method for time-critical medication. Dose history reflects your entries, not verified medicine intake.

Dose Tracker is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment. Follow your care team's instructions.

Privacy policy: https://dosetracker.pages.dev/privacy.html
Support: support@vericodestudio.com

## Submission notes (not part of the listing)

- Publish and verify privacy.html before distributing the updated app; the app now links directly to it.
- Use Medication and Treatment Management in the Health apps declaration and confirm the appropriate store category and content rating. Target adults 18+; dependent profiles are operated by adults.
- Data safety must reflect optional off-device error reports. Review Crash logs / Diagnostics against actual release payloads and the project's IP-handling settings. Event IDs do not identify a device. Confirm whether Sentry qualifies for the service-provider sharing exception; collection remains reportable.
- Confirm the Sentry project's retention period and deletion procedure, then replace the policy's reference to project-configured retention with that concrete period. No production release has been distributed according to the owner.
- Do not upload the existing design-preview images as verified release screenshots. Capture the final native build using fictional data.
- Verify release AAB target SDK, permissions, 16 KB native compatibility, and Play pre-launch results. SDK 57 defaults to API 36; the final uploaded artifact is authoritative.
- The detailed Terms draft still needs the owner's legal/jurisdiction/license decisions. It is no longer promoted as an audited, final contract by the landing page.
