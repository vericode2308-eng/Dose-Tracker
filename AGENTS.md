This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.
Run `npm test` for changes to SQLite, dose logic, Settings storage, or notification scheduling. Run `npx expo-doctor` after dependency or native-config changes.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Current DoseTracker architecture

- Android is the primary release target. Keep iOS/web code paths safe where they already exist, but verify Android-specific reminder behavior in a native development build.
- `src/database.js` owns app-private SQLite (`dosetracker.db`, schema v7): profiles, medicines, schedules, history, pending snoozes, and observed reminder issues. `settings.active_profile_id` is the selected profile. The old SQLite `settings.notification_preferences` JSON default is **not** the active Settings source of truth.
- `src/features/settings/storage.ts` owns non-sensitive Settings preferences in AsyncStorage `@dosetracker/settings/v1`; `src/features/onboarding/storage.ts` owns the onboarding completion flag. `src/features/security/SecurityManager.js` stores the device app-lock flag in `expo-secure-store`. Do not move security flags or health records into AsyncStorage.
- `src/notificationManager.js` owns native reminder requests and reconciliation. Supported recurring alarms are currently ongoing daily/weekday schedules; pending snoozes use one-shot date triggers. Unsupported recurrence must be reported explicitly. `src/features/notifications/NotificationLifecycle.tsx` reconciles on app launch/foreground. See [Settings architecture](docs/SETTINGS_ARCHITECTURE.md) for every Settings item and current gaps.
- `modules/dose-alarm-access` is the tracked local Expo Android module. It checks exact-alarm access, opens app-specific notification and exact-alarm settings, and re-arms Expo requests after relevant system events. Edit this module instead of generated `android/` code. Keep Expo-version-coupled native integration under device/build tests when upgrading SDK.
- `app.json` declares `SCHEDULE_EXACT_ALARM` and `POST_NOTIFICATIONS` and bundles the reminder WAV sounds through the `expo-notifications` plugin. Declaring exact-alarm permission does not grant special access; onboarding and Reminder status guide the user to Android Settings. Expo uses an inexact fallback if access is denied. Never promise guaranteed on-time delivery or infer an individual missed notification from the absence of an Android receipt.
- Android notification channels preserve user/system restrictions. Their sound/vibration behavior is immutable after creation. Privacy choices must redact the notification payload as well as request `PUBLIC`/`PRIVATE`/`SECRET` visibility; Android may ignore the requested channel visibility. Avoid medicine names in diagnostic logs.
- The root layout gates first-run onboarding and device app lock. Keep the onboarding completion flag authoritative for routing; do not show Today before that state has loaded. The device-authentication flag must stay in SecureStore, and erase-all-data clears it.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- Keep `docs/CORRECTIONS_LOG.md` updated for each user-requested correction. Record the date, request, implemented behavior, affected files, status, and verification; distinguish source changes from device verification or release.
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- After changing notification sound assets or native config plugins, regenerate the Android project from `app.json` with `npx expo prebuild --platform android`, then reinstall a development build. Keep generated `android/` out of source edits. A Metro reload alone cannot install new native resources.
