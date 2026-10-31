# Dose Tracker

Expo SDK 58 / React Native medication tracker. Android is the primary release target,
with iOS and web support. Follow `AGENTS.md` before making changes.

## Develop

```sh
npm ci
npm start
```

Screens live in `src/app/`; shared features live in `src/features/`. Required runtime
and configured native assets live in `assets/`. Local native behavior is implemented
in `modules/` and `plugins/`; generated `android/` and `ios/` folders are not source.

## Verify

```sh
npm run lint
npx tsc --noEmit
npm test
```

## Media and documentation

Promotional artwork, store screenshots, videos, design references, the screenshot
editor and the standalone website are organized in [MEDIA](MEDIA/README.md).
Only assets needed by the app remain in `assets/`.

See [Settings architecture](docs/SETTINGS_ARCHITECTURE.md),
[security lessons](docs/SECURITY_LESSONS.md), and the
[corrections log](docs/CORRECTIONS_LOG.md) for implementation details and history.
