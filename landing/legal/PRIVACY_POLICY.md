# DoseTracker Privacy Policy

**Draft for owner and qualified legal review — do not publish until bracketed items are completed.**  
Effective date: **[EFFECTIVE DATE, e.g., October 1, 2026]**  
Operator: **[LEGAL ENTITY OR INDIVIDUAL NAME]** (“we,” “us,” or “our”)  
Contact: **[PRIVACY / SUPPORT EMAIL]**; **[PHYSICAL POSTAL ADDRESS IF APPLICABLE]**

---

## 1. Overview and Core Philosophy

DoseTracker is an offline-first medication management mobile application. We built DoseTracker on a simple premise: **your medical regimens, prescription history, and personal health data belong entirely to you, not on remote cloud servers.**

- **Zero Remote Accounts:** You do not need to register, provide an email address, enter a phone number, or create a password to use the app (`src/app/welcome.tsx:17-19`).
- **No Remote Servers or Databases:** We do not operate a cloud backend for your health data. All profile, medication, schedule, and dose adherence data is stored strictly on your local device (`src/database.js:19-20, 83-125`).
- **No Third-Party Telemetry or Ad Networks:** The app contains no advertising SDKs, tracking pixels, or third-party behavioral analytics services (`package.json:5-48`).

---

## 2. Information You Enter and How It Is Handled

All information processed by DoseTracker is provided directly by you or by someone managing your care:

### A. Profiles
- **Data Collected:** Profile name, relationship label, optional profile photo, date of birth, and personal notes (`src/app/profile.tsx:75-114`; `src/database.js:517-538`).
- **Storage:** Names, birth dates, and notes are stored in an app-private local database (`dosetracker.db`). Photos selected via your device photo picker are copied into the app's local document sandbox (`src/features/onboarding/photos.ts:17-25`).
- **Purpose:** To organize schedules and history separately for each person or dependent you manage.

### B. Medications and Prescriptions
- **Data Collected:** Medication name, strength, dosage form (e.g., tablet, capsule), dose instructions, purpose, custom notes, schedule recurrence (daily, specific weekdays, or as-needed), and inventory stock counts (`src/features/medicines/AddMedicineScreen.tsx:55-75, 100-117`; `src/database.js:83-125`).
- **Storage:** Stored locally in the app-private database on your device.
- **Purpose:** To display your daily schedule, manage stock levels, and trigger local reminder notifications.

### C. Dose Adherence and History Records
- **Data Collected:** Timestamps when a dose is taken or skipped, snooze deadlines, and inventory adjustments (`src/database.js:349-385`; `src/features/today/TodayHomeScreen.tsx:44-72`).
- **Storage:** Stored locally in the app-private database on your device.
- **Purpose:** To maintain an adherence calendar and history log on your device.

### D. Operational and Diagnostics Logs
- **Data Collected:** The app records internal scheduling issue logs (such as permission discrepancies or unsupported recurrence alarms) (`src/database.js:160-173`; `src/app/reminder-status.tsx:24-34`).
- **Privacy Safeguard:** Operational logs are stored solely in local SQLite and do not record medication names (`AGENTS.md`). They are never automatically transmitted over the internet.

---

## 3. Storage, Encryption, and Device Security

- **Storage Location:** All health records, schedules, and profiles are stored in an app-private local database within your device's isolated application storage (`src/database.js:19-20, 201-212`). Non-sensitive application preferences (sound choices, notification visibility, snooze intervals) and onboarding completion status are stored in device local storage (`src/features/settings/storage.ts:3-45`; `src/features/onboarding/storage.ts:4-19`).
- **Device App Lock:** You can activate an optional biometric or passcode app lock (`src/features/security/SecurityManager.js:5-46`). The lock status flag is stored in your device's encrypted hardware keystore (`expo-secure-store`). *Important notice:* App lock gates the screen upon launch, but it does not encrypt the underlying local database file itself (`src/features/security/DeviceAuthenticationSettingsScreen.tsx:45-51`). Anyone with access to your device PIN or an enrolled biometric credential on your device may unlock the app.
- **Cloud Backup Disabled:** Android automated cloud backup is explicitly disabled in the app configuration (`app.json:14`), helping prevent unintended uploading of your local database to platform cloud backups.
- **Notification Privacy Levels:** Android notifications can display dose information on your lock screen. In Settings, you may choose *Show all details*, *Hide medication details*, or *Do not show information* to conceal medicine names from bystanders (`src/features/settings/storage.ts:14-20`; `src/notificationManager.js:75-83`).

---

## 4. Third-Party Services and Data Sharing

- **No Remote Analytics or Trackers:** DoseTracker does not integrate Google Analytics, Firebase Analytics, Meta Pixel, crash-reporting SDKs, or any remote telemetry (`package.json:5-48`).
- **No Data Sales or Commercialization:** Because we do not collect or receive your personal or health data, we do not sell, rent, license, or share your data with advertisers, data brokers, or pharmaceutical marketers.
- **Device Operating System Integrations:** The app communicates with standard device system APIs to perform its intended functions:
  - **Alarm and Notification Services:** The device's built-in alarm and notification system schedules your reminders locally.
  - **Biometrics / Screen Lock:** Device hardware authentication validates your fingerprint or face scan locally; biometric data is processed by the OS and is never accessible to the app.
  - **Photo and Document Selection:** Handled entirely by the device's system file pickers.
  - **Operating System Share Sheet:** When you export your non-sensitive settings preferences, the app opens your device's native share menu (`src/features/settings/backup.ts:21-37`). The destination you choose (such as email, messaging, or cloud storage) is governed by that third party's privacy policy.

---

## 5. Your Rights and Data Management Controls

Because DoseTracker operates entirely locally on your device, you have immediate, direct control over your information:

- **Editing and Updating:** You can modify profile details, medicine details, and schedules directly in the app at any time.
- **Deleting Medications:** Deleting a medicine permanently deletes its associated dosage history and cancel its local reminders (`src/database.js:99-114, 321-325`; `src/notificationManager.js:218-249`).
- **Archiving Profiles:** Archiving a profile stops its active reminders while preserving records locally until deleted (`src/app/profile.tsx:121-122`; `src/database.js:540-552`).
- **Complete Local Purge (“Erase All Data”):** You can purge all data at any time in **Settings $\rightarrow$ Erase all data**. This deletes all local profiles, medications, dose records, preferences, stored profile photos, and the app-lock setting, and cancels all scheduled notifications (`src/features/settings/SettingsHomeScreen.tsx:97-115, 165`; `src/notificationManager.js:160-169`).
- **Exporting Data:** The current app supports exporting application preferences as a JSON file (`src/features/settings/backup.ts:7-33`). *Note:* Medication and adherence history exports are not implemented in the current build (`src/features/settings/SettingsHomeScreen.tsx:163-165`).
- **App Deletion:** Uninstalling DoseTracker from your device permanently removes the app-private database and all locally stored records.

---

## 6. Children's Privacy

DoseTracker allows caregivers and parents to create local profiles for children (`src/app/profile.tsx:75-114`). However:
- The app does not verify the age of users or profile subjects.
- All information entered about a minor stays strictly on the parent's or caregiver's device.
- We do not solicit, collect, or transmit personal data from children.
- **[CONFIRM TARGET AUDIENCE AND MINIMUM AGE REQUIREMENT FOR APP OPERATOR TERMS, E.g., 18 OR 13 WITH GUARDIAN SUPERVISION]**.

---

## 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in legal requirements or future application updates. Any updated version will be posted **[CONFIRM WEBSITE URL OR APP DISTRIBUTION STORE LINK]** with a revised effective date.

---

## 8. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy, please contact us at:

- **Email:** **[PRIVACY / SUPPORT EMAIL, e.g., privacy@dosetrackerapp.com]**  
- **Operator Name:** **[LEGAL ENTITY OR INDIVIDUAL NAME]**  
- **Postal Address:** **[POSTAL ADDRESS IF REQUIRED BY JURISDICTION]**

---

## Reviewer Notes — Remove Before Publication
- **Gaps & Assumptions Flagged:**
  1. Operator name, jurisdiction, contact email, and postal address are bracketed and must be filled by the operator.
  2. The policy reflects the actual codebase: no remote accounts, no cloud sync, no tracking SDKs, no ads. If cloud sync or analytics are added in a future release, this policy must be re-audited and updated.
  3. The current export feature covers *preferences only*; medication and history export is not implemented in current code. Do not promise medical record export in marketing until shipped.
  4. Ensure a qualified privacy attorney reviews this draft against applicable jurisdiction laws (e.g., GDPR, CCPA/CPRA, FTC Health Breach Notification Rule, state consumer health data laws).
