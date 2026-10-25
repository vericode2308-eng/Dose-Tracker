# Dose Tracker · iOS screenshot editor

Open http://127.0.0.1:3000 while the local server is running.

```sh
cd appstore_assets/ios-screenshot-editor
npm install
npm run dev -- --hostname 127.0.0.1
```

Eight English iPhone marketing slides use the app’s cream and teal palette. Edit copy, layouts, and colors in the editor, then select **Export bundle**. Project state is saved in `app-store-screenshots.json`.

## Capture provenance

Eight actual native iOS simulator captures from the current working checkout, captured 25 October 2026 at 1206 × 2622. No older promotional images or generated UI were used. The development build runs the current Metro source. Compare against the final shipping build before submission.

All names, medicine products, strengths, schedules, stock, and history are invented examples created from scratch. They describe no real person or prescription. They were seeded only into the dedicated `DoseTracker-Marketing` simulator, UUID `C9CE1305-25C9-4895-829E-16301E717588`; the original simulator and its app records were untouched. No real photos or records were read or copied.

`capture/seed-demo.py` documents the fixture and refuses any other simulator UUID or nonempty medicine database. App SQLite schema v8 is required. It must run with the demo app terminated. All dose schedules have reminders disabled. The demo Settings switch is enabled only to expose preference controls; no reminder was requested. App-lock flags are not modified.

The deck covers Today, separate family profiles, history, stock, medicine detail, Settings, notification privacy, sound options, and a typographic feature wall. A continuous background links the slides; headlines and important UI stay within their own slides. Only the iPhone deck was authored; iPad and Android are not part of this delivery.

No App Store upload, submission, or release was performed.
