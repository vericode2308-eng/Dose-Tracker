# DoseTracker Settings and Android reminder architecture

This describes the implemented Expo SDK 57 code as of September 2026. DoseTracker has no account or cloud reminder service. `app.json` configures the generated standalone Android application; Expo Router presents the Settings screens.

## Storage map

| Data | Owner | Persistence |
| --- | --- | --- |
| Theme, reminders enabled, default snooze minutes, privacy, sound, vibration | `src/features/settings/storage.ts` | AsyncStorage `@dosetracker/settings/v1`; defaults `system`, `true`, `10`, `show`, `default`, `true`. Old `soundAndVibration` values migrate on read. These are preferences, not encrypted health records. |
| Profile, medicines, schedules, dose history, snooze occurrence/deadline | `src/database.js` | App-private `expo-sqlite` database `dosetracker.db`, schema v4. `settings.active_profile_id` stores the selected profile. `dose_snoozes` stores `schedule_id`, `date`, `scheduled_at_ms`, `until_ms`. |
| Observed reminder setup/scheduling issues | `src/database.js` | SQLite `reminder_issues`, keyed by UTC day and code with first/last timestamps and count. Status reads the last seven days. Messages intentionally omit medicine names. |
| Device app lock | `src/features/security/SecurityManager.js` | `expo-secure-store` key `doseTracker.appLock.v1`, device-only protected storage. The unlock itself uses the phone's local authentication. |
| Onboarding completion and permission choice | `src/features/onboarding/storage.ts` | AsyncStorage `@dosetracker/onboarding/v1`. This is an app flow marker, not the authoritative OS permission state. |
| Notification permission, exact-alarm special access, channel settings | Android OS | Controlled by the user in Android Settings. The app queries them each time it checks status; it cannot save or override a grant in SQLite. |
| Scheduled notification requests | `expo-notifications` / Android AlarmManager | Native OS/Expo request store, with stable `dosetracker:dose:` identifiers. Reconciliation compares this store with the SQLite medicines and snoozes. |

The SQLite singleton `settings.notification_preferences` column is a legacy schema default. The Settings UI does **not** read or update it; the live reminder preferences are in AsyncStorage. This should be consolidated in a future data migration if the product requires every preference in SQLite.

## Scheduling and timing flow

1. A medicine or schedule is committed to SQLite. `src/notificationManager.js` schedules supported ongoing daily and selected-weekday reminders through `expo-notifications`. As-needed schedules have no alarms. Bounded courses, future starts, day intervals and hour intervals currently report a scheduling issue rather than silently claiming coverage.
2. `recurringTriggers()` creates daily/weekly wall-clock triggers and stable request IDs. `scheduleSavedMedicines()` also re-arms pending `dose_snoozes` as one-shot date triggers. Pausing, archiving, deleting, disabling reminders, and dose completion cancel their relevant requests.
3. `NotificationLifecycle` calls `reconcileReminders()` on launch and when the app becomes active. The local Android `AlarmAccessReceiver` calls Expo's scheduling delegate after time/time-zone changes and an exact-alarm grant. Expo's own receiver handles reboot/package replacement. The extra native module is version-coupled to Expo's delegate.
4. Expo SDK 57's Android `ExpoSchedulingDelegate.setupAlarm()` uses `AlarmManagerCompat.setExactAndAllowWhileIdle()` if Android is below API 31 or `canScheduleExactAlarms()` is true. Otherwise it uses `setAndAllowWhileIdle()`, which can be delayed. Recurring triggers schedule the next occurrence individually; Android's generic inexact repeating API is not used here.
5. `app.json` declares `android.permission.SCHEDULE_EXACT_ALARM` and `POST_NOTIFICATIONS`. The standalone build's generated manifest was checked on the Pixel 9 emulator and contains `SCHEDULE_EXACT_ALARM`. The local Expo module exposes `canScheduleExactAlarms()` and opens `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`. The manifest declaration **does not grant** special access; a user action in Android Settings is required on fresh modern Android installs. Onboarding now explains this after notification permission is granted, and Reminder status offers the same direct action.
6. Expo's notification config plugin bundles `gentle.wav` and `clear.wav` into Android resources. A native rebuild is required after sound assets or the config plugin change. `expo-audio` and its required `expo-asset` dependency preview the two bundled clips inside the app; recording and background playback permissions are disabled in app config.

**Timing guarantee:** `setExactAndAllowWhileIdle` is the strongest current scheduling path, but an exact alarm permission, an enabled notification channel, and a queued alarm do not prove the notification was seen or delivered at an exact wall-clock instant. Force-stop, user or OEM battery restrictions, Do Not Disturb, disabled channels, reboot/clock changes, and OS scheduling limits can intervene. DoseTracker currently has no independently durable per-occurrence delivery acknowledgment. The requirement for guaranteed on-time medication delivery is therefore **not fully met**. Android's [alarm guidance](https://developer.android.com/develop/background-work/services/alarms) also distinguishes the exact and inexact paths and special access rules.

## Every Settings item

### Header and appearance

| Item | UI action | Backing state / platform effect |
| --- | --- | --- |
| Active profile header | Opens the profile switcher | `profiles` and `settings.active_profile_id` in SQLite; `ProfilesProvider` refreshes the displayed person. |
| People & profiles | Opens the same switcher | SQLite profile CRUD; archiving reconciles that person's reminders. |
| System / Light / Dark | Sets `theme` | AsyncStorage preference. `useColorScheme()` supplies the Android setting for System. No native notification change. |

### Reminders

| Item | UI action | Backing state / platform effect |
| --- | --- | --- |
| Reminders enabled | Switches local reminder preference | AsyncStorage `remindersEnabled`. Reconciliation cancels or recreates DoseTracker requests. Android's own app/channel notification permission still wins. |
| Default snooze duration | Bottom sheet with 5, 10, 15, 30 minutes | AsyncStorage `snoozeMinutes` defaults to 10. The Today screen's Snooze action calls `snoozeMedicationDose(reference)` without minutes, so that function reads `prefs.snoozeMinutes`, computes `untilMs`, writes `dose_snoozes`, and schedules a native one-shot notification. Notification taps currently route to Today; there is no tray-level Snooze action. |
| Notification privacy | Dedicated `notification-privacy` screen | AsyncStorage `notificationPrivacy`: `show`, `hide`, `none`. The app requests Android channel lockscreen visibility `PUBLIC` (Expo enum 1), `PRIVATE` (2), or `SECRET` (3). It also changes the actual notification title/body: medicine and dose, generic medication message, or generic DoseTracker message. This payload redaction is essential because newer Android versions may ignore an app's requested channel visibility. The Pixel 9 emulator reported system-controlled channel visibility (`-1000`) even when a value was requested. Android's own lock-screen settings may hide more. |
| Sound & vibration | Dedicated `reminder-sound` screen with Phone default, Gentle chime, Clear chime, Silent, preview, and independent vibration switch | AsyncStorage `reminderSound` and `vibrationEnabled`. Android 8+ sound/vibration live on channels. A deterministic v2 channel ID includes privacy, sound and vibration choices, because channel alert behavior is immutable after creation. `sound: null` makes Silent; custom `.wav` assets create resource-backed sounds; `enableVibrate: false` disables vibration. The app checks the selected and legacy channels for a system block and checks coarse sound/vibration overrides before switching presets. System sound/category controls remain authoritative. The Phone default preview queues a real test; bundled chimes play in-app for quick preview. |
| Test reminder | Schedules a real notification in 10 seconds | `scheduleTestReminder()` uses the same `reminderContent()` and selected channel as medication reminders, but sample text and `kind: reminder-test`. It checks native permission first. No SQLite medicine or history row is created. The test is absent from the active-medication count. It verifies the configured channel on the current device, subject to Android settings. |
| Reminder status | Dedicated `reminder-status` screen | Reads the AsyncStorage enabled flag, Android notification permission and channel importance, exact-alarm access, native queued DoseTracker request count, and seven-day SQLite `reminder_issues`. Green requires enabled, allowed, queued medication request, and (on Android) exact-alarm access. Red explains the missing condition. It links directly to DoseTracker's Android notification page and, when needed, Alarms & reminders. It refreshes after returning from system settings. The issue log reports observed setup/scheduling failures; Android does not supply reliable missed-delivery receipts. |
| Alarms & reminders access | Opens Android's exact-alarm special access page | `DoseAlarmAccess.openExactAlarmSettings()` uses `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`; the app checks `canScheduleExactAlarms()`. Android stores the grant. |
| Notification system settings | Opens this app's Android notification page | `DoseAlarmAccess.openNotificationSettings()` uses `ACTION_APP_NOTIFICATION_SETTINGS` and the app package. The fallback opens app settings if the module is unavailable. Android stores permission, channel, sound, vibration and lockscreen choices. |

The app avoids creating a new alert channel if the currently selected channel is blocked or has a detectable system sound/vibration override. Expo's channel API exposes only `default`/`custom`/`null` for sound, so it cannot identify two different user-selected custom sounds. That is a remaining limit when changing presets; the app must not claim to fully mirror every Android channel customization.

### Privacy, data, and about

| Item | UI action | Backing state / platform effect |
| --- | --- | --- |
| Device authentication | Opens `device-authentication` screen with an app-lock toggle | `expo-secure-store` device-only key `doseTracker.appLock.v1`; enabling/disabling asks for local biometric or device credential. `AppLock` gates app content on launch/background return. No cloud identity or SQLite value. |
| Export preferences | Creates and shares a JSON preferences backup | Reads validated AsyncStorage Settings values only. Native `expo-file-system` writes a temporary cache file; `expo-sharing` opens the share sheet and deletes the cache file afterward. It contains no medicines or dose history. |
| Restore preferences | Imports a validated JSON file | `expo-document-picker` / `expo-file-system` read a size-limited file, accepts current and migrated legacy settings, writes AsyncStorage, and reconciles reminders. |
| Erase all data | Deletes app-owned local information, then returns to onboarding | Cancels/dismisses native notifications, clears SQLite medicines/schedules/history/snoozes/profiles/reminder issues, removes Settings and onboarding AsyncStorage, deletes matching local profile photos, clears the app-lock SecureStore key, and returns to onboarding. |
| Offline-first | Opens About text | Informational copy only; no separate preference. SQLite and Settings/Onboarding AsyncStorage are local. Exports are user-directed. |
| Privacy Policy | Opens `https://dosetracker.pages.dev/privacy.html` in the browser | Expo Router external link; the standalone page presents the full Privacy Policy without JavaScript. Internet access required. No app data is sent in the URL. |
| Terms of Service | Opens `https://dosetracker.pages.dev/?legal=terms` in the browser | Expo Router external link; the published site automatically selects the Terms of Service. Internet access required. No backend setting. |

## Gaps and polish priorities

1. **Critical adherence gap:** The product plan calls for durable `notification_jobs`, broader recurrence types, per-occurrence delivery/recovery, and exact timing. Current code uses Expo's persisted requests and `dose_snoozes`, and supports native daily/weekday reminders only. No Android API can promise every notification is seen exactly on time. A medication safety design needs explicit late/failed-delivery policy and device testing under Doze, reboot, time changes, channel revocation and force-stop.
2. **Permission clarity:** The app now explains exact access in onboarding and shows both notification and exact access actions in Reminder status. Test reminder should be run on a physical device too; emulators do not represent all OEM battery policies.
3. **Native notification Snooze:** There is no notification action button. The current Snooze control lives on Today after opening a reminder. A native action would need safe dose identity validation and app-lock handling before it changes SQLite.
4. **Channel customizations:** Android settings can override a channel. Expo's JS channel model cannot fully identify a different custom sound, so switching presets may still lose a user customization. A dedicated native inspection API or a policy of asking the user to manage all sound changes in Android Settings would close that gap.
5. **Privacy presentation:** Android may ignore the requested lockscreen visibility for app-created channels. The app's own `hide`/`none` payload redaction works; a physical lock-screen test is still needed. `No info` still displays the app identity in Android's notification UI.
6. **Data lifecycle:** The legacy SQLite `notification_preferences` column should be retired or migrated to a single source of truth.
7. **Diagnostics semantics:** `reminder_issues` records observed problems and can include issues that were later resolved. A resolved/current indicator and a next scheduled reminder timestamp would improve the status screen; neither should be described as proof of delivery.

## Verification

- `npx tsc --noEmit`, `npx expo lint`, and the Node test suite cover settings types, SQL migration/logging, reminder channels, redacted content and scheduling behavior.
- A Pixel 9 Android emulator development build was regenerated from app config and installed. Native `dumpsys notification` showed the Clear chime channel using `android.resource://.../raw/clear`, a no-vibration channel with `mVibrationEnabled=false`, and a Silent channel with `mSound=null`.
- The real ten-second test appeared in the Android notification shade with `DoseTracker` / `Open the app for details.` under No info. The native status links opened the app-specific notification page and Alarms & reminders special access page. After granting exact access and refreshing status, the exact-access warning disappeared.
- This is emulator confirmation of configuration and a test notification, not a long-duration reliability or physical-device Doze certification.

## Optional diagnostics (2026-09-29)

Settings → Privacy → Optional diagnostics explains the Sentry data flow before an explicit enable action. Consent defaults off and is stored separately at `@dosetracker/diagnostics-consent/v1`; exports/imports never carry consent. Local erasure revokes it. `src/features/diagnostics/diagnostics.ts` lazily loads the SDK, permits only sanitized JavaScript errors, drops arbitrary context and attachments, disables native telemetry and uses a consent-gated HTTPS transport with no disk queue. Withdrawal aborts active requests where possible; it cannot recall reports already received. Update the disclosure and consent version if the collected data expands.
