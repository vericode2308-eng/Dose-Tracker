# Local profiles — implementation and verification

Verified 2026-09-26 against `design/switch profile.png`.

## Implemented

- NativeWind bottom sheet with selected row, avatars, relationships, real overdue badges, archived badge, add and edit controls. Dismiss through backdrop, close, or native back.
- Add/edit profile using the existing photo picker, name, color, birthday, notes and new relationship field.
- SQLite schema 3 migrates all existing medicines to the original profile and imports the former AsyncStorage profile once. Active profile selection is stored in SQLite.
- Today, Medicines and History query the selected owner. New medicine forms retain the owner shown when opened. Switching clears history filters and prevents the previous owner's cached cards showing under the new name.
- Archive preserves medicines/history, cancels this owner's reminder requests and switches away if necessary. Restore makes existing data available again and reconciles supported reminders. The final active profile cannot be archived.
- Reminder reconciliation covers every active profile, regardless of which is selected. Notification taps validate the owner, select that profile, then open the dose. Archived owners' taps are ignored.
- Erase includes profiles; backups remain preferences only.

## Automated verification

`npm test`: 30 tests passing, including real SQLite migration, persisted selection, profile ownership, isolated history/stock, archive/restore, overdue/snooze counts, complete erasure, alarm cancellation and notification owner routing. Notification OS calls use mocks.

`npm run lint` and `npx tsc --noEmit`: passing.

## In-app browser verification

- Existing profile and two earlier QA medicines survived schema migration.
- Created QA Family with Daughter relationship and coral avatar; selection survived reload.
- Added QA Family Vitamin through all four form steps; review showed QA Family and the medicine list contained only its new medicine.
- Switched back: original profile retained only its original two medicines and unchanged stock.
- Original Today showed a real 1-overdue badge for the family profile.
- Edited to a long display name. At 320 × 640 the first layout squeezed the name; corrected the badge to stack below it, then visually rechecked readable wrapping and reachable controls.
- Archived profile: overdue badge disappeared, Archived appeared, data remained stored. Restored and selected it: medicine reappeared.
- Took the family dose: progress became 1/1, History showed only that record. Switching History to the original profile showed only its two records.
- Verified People & profiles entry in Settings.

The browser QA data is labelled QA. This pass does not establish physical Android alarm delivery or Doze behavior; native notification changes were tested at the OS boundary with mocks. Existing reminder schedule limitations remain documented in reminders.md.
