# Android reminder emulator verification — 2026-10-02

Tested a fresh, bundled debug APK on Pixel 9, Android 15 / API 35 (arm64 emulator), using the actual Expo native scheduler, app presentation delegate and notification PendingIntents. The app launches successfully. Tests use synthetic reminders and do not create or mutate medicine, profile or dose-history records.

APK SHA-256: `7b6f0d0d3d2675b6fb440fee1e91db0aac8cd692292100a32db1fb4211d9af3c`.

| Check | Result |
| --- | --- |
| Repeating presentation | PASS: Android reports sustained sound, FLAG_INSISTENT, Stop first and a 120-second timeout. |
| Screen-off duration | PASS: sound remained active at 32, 57, 82 and 107 seconds; the two-minute OS cutoff stopped audio and cleared the notification. See [trace](timeout-off.log). |
| Native Stop ringing | PASS: stops audio, silently preserves notification content, removes looping/timeout/Stop. |
| Original dose controls | PASS: Take Now, Snooze 15m and Skip retain their original PendingIntents after Stop; Expo response extras remain. Actual dose mutations were not executed. |
| Volume-down | PASS: silences sound and leaves the notification. |
| Opening notification panel | PASS: silences sound and leaves the notification. |
| Power button | **Does not silence on this emulator:** audio continued with notification present. Use Stop or volume-down. See [trace](power.log). |
| Screen off + Stop | PASS: native Stop silences and preserves the alert with the display asleep. No PIN/app-lock scenario was exercised. |
| Single-alert setting | PASS: no looping flag or Stop action. |
| Silent channel | PASS: no sound even when the payload requests ringing. |
| Stale Stop action | PASS: an earlier delivery's button cannot silence a newer delivery with the same schedule ID. |
| Daily recurring reminder | PASS: actual daily trigger delivered; Stop preserved tomorrow's scheduled occurrence. See [trace](daily.log). |
| One-shot snooze trigger | PASS: actual date trigger delivered, then was removed rather than recurring. See [trace](date.log). |
| Cleanup | PASS: removed the synthetic request, test channels and test action category. |

## Scope and limits

Playback is verified from Android notification service state, corroborated during testing with Android audio-player diagnostics. This is not an assessment of audible loudness or a physical speaker. The interrupted first timeout run was superseded by the uninterrupted screen-off run above; opening the notification panel had coincided with its early sound stop.

The separate schedule-after-instrumentation probe was scheduled, but delivery was not observed within its two-minute notification lifetime. It is **inconclusive**, not a background/process-death pass. Instrumentation also changes target-process lifecycle. Swiping away the real app, process termination, reboot, concurrent reminders, long-duration Doze/OEM behavior, PIN lock, app authentication, and actual Take/Snooze/Skip database actions remain outside this emulator check. The synthetic channel uses the system notification sound; each bundled tone was not auditioned. Physical-device verification is still required for these behaviors.

The current JS/SQLite regression suite passed **158/158**; Expo lint and TypeScript passed. Native application and instrumentation builds succeeded. No production source change was needed during this check. Cleanup completed: the test APK was removed, original notification permission (denied) and notification volume (5/7) were restored, and Android reported no active notification sound. This is local emulator verification, not a release or store upload.

Reproduce with the [test harness instructions](../../../tests/android/reminders/README.md). Logs in this directory retain the valid phase results; the dose-action preservation check was observed in instrumentation output but has no separate saved trace.
