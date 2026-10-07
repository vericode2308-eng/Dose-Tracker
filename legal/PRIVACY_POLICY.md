# DoseTracker Privacy Policy

Operator: VeriCode (vericodestudio.com)

Privacy and support contact: support@vericodestudio.com

Effective and last updated: October 3, 2026. This notice covers DoseTracker 1.0.0, including the release currently in testing.

## What this policy covers

This policy explains how DoseTracker handles information in the Android app and how the accompanying website and support email work. DoseTracker is for adults aged 18 or older. Adults may manage profiles for children or other dependents when authorized to do so. Local profiles are not online accounts.

## Information stored on your device

You may enter profile names, relationships, dates of birth, notes and selected photos; medicine names, strengths, dose amounts, instructions, schedules and stock counts; and taken, skipped or snoozed dose records. The app uses these to organize your profiles, display schedules and history, track recorded stock and request local reminders. This information is stored in the app’s private device storage. We do not provide health-record uploads, cloud sync or remote accounts.

App preferences and the optional diagnostics choice are stored locally. The app-lock setting uses secure device storage. Local reminder issue records help explain scheduling and permission problems; they are separate from the optional reports described below.

## Optional diagnostics through Sentry

All diagnostics categories are off by default in public, release and private QA builds. During setup or under Settings → Privacy → Optional diagnostics, you can separately enable error reports, diagnostic logs and performance traces. Each selected category is sent automatically after you save your choices, to Sentry on behalf of VeriCode to investigate faults and slow operations. You can use the app with all categories off. An existing explicit choice to share errors remains valid for errors only; an update never enables the new logs or traces categories on your behalf. Private-QA choices are stored separately and never opt a public build in.

Error reports contain a random event identifier, error time, app version, operating-system platform (such as Android), testing or production environment, and code line/column numbers when available. Error reporting covers JavaScript errors, not native crash dumps. Diagnostic logs contain only fixed operation names (database initialization or reminder reconciliation), success/failure and timestamps. Performance traces record those same operations, start/end times, success/failure, and random event/trace/span identifiers. Logs and traces also include app version, platform and testing or production environment. These identifiers identify reports or operations, not a person or device. A recorded reminder reconciliation does not establish that a reminder was delivered or that a dose was taken.

The app removes error-message text, profile and medicine information, local variables, breadcrumbs, device identifiers and arbitrary context from reports. It does not capture console output, database query contents, network request contents or URLs, screen navigation, native crash dumps, screenshots, screen recordings or session replay. Reports are sent over HTTPS without a persistent offline report queue. Logs may be buffered briefly in memory. Changing or withdrawing consent discards pending logs and traces from the previous choice. Sentry necessarily receives connection information, including an IP address, to receive network requests; default personal-information collection is disabled in the SDK. As of October 2, 2026, the DoseTracker Sentry project is also configured to prevent IP addresses from being stored in new diagnostic events. That setting does not erase older reports or prevent network infrastructure from receiving connection information. Sentry can derive approximate geographic context from connection information. As of October 3, 2026, the project is also configured to scrub city, subdivision, region, country-code and IP-address fields from new diagnostic events. These controls do not prevent network infrastructure from receiving connection information and do not delete older reports.

You can decline diagnostics and use tracking and reminders normally. Turn individual categories off or select “Turn off all diagnostics” in Settings to stop those reports; the app also aborts outstanding report requests where possible. It cannot recall requests already received by Sentry. “Erase all data” also turns diagnostics off. The consent choice is not included in preferences exports or restored from them.

Reports already received remain in Sentry until their applicable retention expires or VeriCode deletes them. Sentry sets retention when each report is received. Its standard Developer plan retains errors, logs and performance traces for 30 days. Team and new-account trials retain errors for 90 days and logs and traces for 30 days. Business plans normally retain errors for 90 days, logs for 30 days and full performance traces for 30 days, with sampled spans retained for up to 13 months; legacy transaction-based plans instead retain transactions for 90 days. Changing plans affects new reports, not retention already assigned to earlier reports. As of this notice, VeriCode’s Sentry organization is on a trial; we will update this notice for the plan used after that trial. Contact support@vericodestudio.com for retention details or to request deletion. Include the approximate error time and app version if known; do not send medicine names or other health information. Because reports exclude a user or device identifier, we may need additional non-sensitive details to locate a particular report. We do not use these reports for advertising or sell them.

## Permissions, reminders and device security

Notification permission lets the app send reminders. Android Alarms & reminders access enables requests for more precise timing; you may decline it. Delivery still depends on system settings and restrictions. The photo picker gives the app access to the photo you select; a copy is saved privately for your profile. File selection and the share sheet support preferences import/export. The app does not need camera, microphone, location, contacts or broad access to your photo library.

The optional app lock uses your device’s biometric or screen-lock authentication. The app does not receive biometric templates. Anyone with an enrolled credential or the device screen-lock secret may unlock it. App lock protects screen access; it does not separately encrypt the health database. Android cloud backup is disabled in the app configuration.

Reminder details can appear on a locked screen. The initial setting shows medicine details. Change Settings → Notification privacy to hide details; your device’s notification settings also apply. Store your device securely and review notification settings before entering sensitive information.

## Retention, deletion and exports

Local records remain until you delete them, erase app data or uninstall. Archiving a profile preserves its records and stops its supported reminders. Deleting a medicine removes its schedules and associated dose history. Settings → Erase all data removes local profiles, medicines, dose records, settings, stored profile photos and the app-lock flag, cancels reminders and disables diagnostics. If erasure is interrupted or reports an error, retry it.

Exports contain preferences only, not medicine records, profiles or dose history. When you choose a sharing destination, that service controls the copy it receives under its own policies. In-app erasure does not delete exported copies, emails or reports previously received by Sentry. There is no remote app account to delete.

## How to request deletion

For records stored only on your device, open Settings and choose Erase all data. VeriCode cannot remotely find, view or delete those local records. Removing a local record does not remove copies you exported or shared.

For optional reports already sent to Sentry or correspondence sent to VeriCode, email support@vericodestudio.com with the subject “DoseTracker data deletion request”. Say whether your request concerns diagnostic reports, support emails, or both. For reports, include an approximate date/time (with time zone) and app version if known. For support emails, identify the email address used. Do not send medicine names, prescriptions, health records or identity documents.

We use the details you provide to locate and address the request, and may ask for limited information needed to verify or locate it. Diagnostic reports do not contain a persistent person or device identifier, so a report may not be identifiable from your email alone. We will explain any report we cannot locate, information we must retain and the reason. Turning diagnostics off or erasing the app does not itself delete reports already received by Sentry. There is no online DoseTracker account to delete.

## Website and support communications

Opening help or legal pages uses your browser and internet connection. The website is hosted on Cloudflare Pages; the host processes network requests and connection information needed to serve the site. The landing and support pages load fonts from Google Fonts. Those providers receive ordinary network-request information. The website stores your light/dark theme preference in your browser. The standalone privacy page does not load external fonts or analytics scripts.

The support form prepares a draft in your email app; it does not send or upload the form by itself. If you send an email, VeriCode and its email provider receive your email address and whatever you include. We use correspondence to respond to your request. VeriCode deletes support and deletion-request emails within 90 days after the request is resolved, unless a legal requirement requires longer retention. An unresolved request is kept while needed to handle it. Contact us to request earlier deletion where applicable. Please do not include health records, prescriptions or medicine names.

## Children and dependent profiles

The app is intended to be operated by adults 18+. It is not directed at children. An authorized adult may keep a dependent’s information locally. Optional diagnostics exclude these profile records. Contact VeriCode if you believe a child has submitted personal information directly to us.

## Changes and contact

We will publish changes to this policy on this page with an updated effective date. Material changes to optional diagnostics will require an updated disclosure and consent where applicable. For privacy questions, access or deletion requests, email support@vericodestudio.com.
