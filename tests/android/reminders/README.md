# Android reminder presentation checks

This is an emulator-only instrumentation harness. It is added to the generated Android test source set by `check.gradle`; it is not a production route, module, receiver or app dependency. It exercises Expo 57 native scheduling, the app's presentation delegate and real notification PendingIntents. It does not create medicine/profile/history records. Use a disposable emulator, not a personal phone.

From `android/`, build a bundled debug app and its test APK:

```sh
EXPO_NO_DOTENV=1 SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD=true ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest -I ../tests/android/reminders/check.gradle -PreactNativeArchitectures=arm64-v8a
```

Install `app/build/outputs/apk/debug/app-debug.apk` and `app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk` using `adb install -r`. Enable notification permission on the emulator. Run one phase at a time, waiting for completion before starting another:

```sh
adb shell am instrument -w -e phase stop com.vericodestudio.dose_tracker.test/check.RingingCheck
```

Phases: `stop`, `actions`, `single`, `silent`, `volume`, `power`, `shade`, `screen-off`, `stale`, `timeout`, `timeout-off`, `daily`, `date`. `timeout` waits for the real 120-second OS cutoff; `timeout-off` additionally requires continued sound at 32, 57, 82 and 107 seconds with the screen off. `power` reports observed behavior rather than requiring it to silence. `actions` checks that the original Take/Snooze/Skip PendingIntents survive silencing; it does not execute medication mutations. `daily` waits for the next minute and checks that tomorrow's trigger remains armed after silencing. `date` uses the one-shot trigger used for snoozes. `screen-off` checks a sleeping display, not a PIN-protected device or enabled app authentication. `schedule` and `inspect` are separate probes for delivery between test processes; instrumentation termination may force-stop its target, so inspect the OS result rather than assuming this models swiping away the app.

Assertions use Android's `mSoundNotificationKey` plus notification flags/content/actions. They establish system playback state, not human hearing, loudness, or physical speaker performance. Use `dumpsys audio` to corroborate active/released players. This complements the JS/SQLite security and scheduling suite, not replaces it. Instrumentation cannot by itself establish OEM-specific power-key, battery, or lock-screen behavior.

Always run `cleanup` afterwards; it removes only the test's identifier, channels and category. Restore the emulator notification permission/volume to their original states when appropriate. Never clear the whole app's data as test cleanup.
