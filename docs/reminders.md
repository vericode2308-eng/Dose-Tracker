# Local medication reminders

## Implemented scope

`src/notificationManager.js` is the single notification integration point. The
medicine form commits to SQLite, then calls `scheduleMedicineReminders(savedMedicine)`.
For example, `parseReminderTime('Daily at 8:00 AM')` produces minute 480; a stored
schedule with `{ kind: 'daily', startDate: '2026-09-26' }` and
`timeLocalMinute: 480` creates an Expo native DAILY trigger at 08:00 local time.
The start date must be today or earlier and the course must be ongoing.

- Ongoing daily and selected-weekday schedules run without JavaScript timers,
  network access, or reopening the app. Stable schedule IDs replace existing
  requests when retried.
- Android notification permission is requested after creating the medication
  channel. Exact-alarm access is checked separately and Settings links to the
  Android special-access screen. Denial is reported; it is never labelled exact.
- Reminder preferences are respected. Pausing, archiving, deleting, and erasing
  data cancel the corresponding pending alarms. Resume re-arms them. Database
  changes and notification reconciliation share a serialized queue.
- Startup/foreground reconciliation repairs the SQLite-to-OS scheduling gap.
  Expo stores recurring requests natively and restores them on boot/package
  replacement. The local Android receiver re-arms those stored requests on clock,
  time-zone, and exact-alarm permission-grant broadcasts without needing JS.
- Foreground and cold-start taps validate medicine/schedule IDs against SQLite
  and open Today with the matching dose highlighted. The delivery date, rather
  than the tap date, selects the occurrence. Today reads and records real doses.
- As-needed medicines do not schedule automatic notifications.

This is the daily/weekday implementation requested here, **not completion of the
advanced recurrence engine in PLAN.md**. Anchored intervals, future course starts,
finite courses, deterministic DST gap/fold rules, occurrence generations, snooze,
and native SQLite eligibility checks remain future work. Unsupported schedules
are saved with an explicit “saved without reminders” result, never converted to a
different recurrence. Native calendar triggers use the device's time zone and
calendar behavior. A severely delayed notification or a time-zone change between
delivery and tapping cannot be given an authoritative historical occurrence ID
until the occurrence engine is built.

## Android timing and builds

With exact-alarm access, the pinned `expo-notifications` 57.0.21 Android delegate
uses `setExactAndAllowWhileIdle(RTC_WAKEUP, ...)`, including during Doze. Without
that access Expo uses `setAndAllowWhileIdle`, which can be delayed. Android can
throttle alarms close together during idle. A powered-off or force-stopped app,
revoked permissions, a muted channel, and manufacturer restrictions can prevent
or delay delivery. No app can promise unconditional exact-to-the-second delivery.

The permissions and local module require a **new native development/release
build**; Metro refresh, Expo Go, and the browser cannot validate this behavior.
Use the project's normal EAS development build workflow. The module lives in
`modules/dose-alarm-access`, so Expo autolinking includes it during prebuild.
Do not hand-edit the generated Android project.

The recovery receiver uses Expo's internal `ExpoSchedulingDelegate`; both the
npm dependency and the Maven dependency are pinned to 57.0.21. On any upgrade,
review that delegate, update both pins, compile the module, and repeat the device
checks below. Android channel sound/vibration is controlled by system settings
after channel creation; the app cannot override the user's channel choices.

## Verification

Automated checks:

```sh
node --test tests/notificationManager.test.cjs
npx expo lint
npx tsc --noEmit
```

The 12 manager tests cover time validation, Sunday/weekdays, unsupported patterns,
permissions/channel denial, exact-access status, idempotence, privacy, preference
cancellation, pause/resume/delete, erasure ordering, OS scheduling failures, and
cold/warm/stale notification taps. They mock the OS boundary and do not prove
physical-device delivery. The local module was also compiled successfully with
`:dose-alarm-access:compileDebugKotlin`. Expo config introspection includes both
requested Android permissions.

No Android device was connected during implementation. Before relying on this
build, run on a physical Android 12+ device (including an Android 13+ permission
prompt case):

1. Grant notifications and Alarms & reminders; confirm Reminder status reports
   access. Save an ongoing daily medicine a few minutes ahead.
2. Confirm the pending alarm using `adb shell dumpsys alarm`. Background the app
   and turn off the screen. On a dedicated test device use
   `adb shell dumpsys battery unplug` and `adb shell dumpsys deviceidle force-idle`.
   Verify delivery at the target time, sound/channel behavior, and the correct
   Today card on tap. Finish with `adb shell dumpsys deviceidle unforce` and
   `adb shell dumpsys battery reset`.
3. Verify warm and cold taps, multiple medicines at the same minute, and the next
   recurrence. Repeat after reboot and time-zone/manual-clock changes.
4. Deny/revoke each permission separately. Confirm no false “exact” status;
   re-grant access and confirm pending alarms recover. Test a blocked channel.
5. Pause/archive/delete a test medicine and turn reminders off: verify no pending
   alarm remains. Resume/enable and verify it returns once. Erase disposable test
   data and confirm both database records and OS reminders are gone.

References: [Expo SDK 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/),
[Android exact alarms](https://developer.android.com/develop/background-work/services/alarms),
[Expo local modules](https://docs.expo.dev/modules/get-started/).
