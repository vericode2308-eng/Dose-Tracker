# SQLite screen integration

## Full medicine editor — 2026-09-29

Edit Medicine reuses the four-step creation form with persisted values. Full edits update
medicine metadata and the selected schedule in one transaction, retaining IDs and ownership.
Other schedules and the medicine's Active/Paused/Archived status are preserved. Schema v7
adds `history.dose_snapshot`; edits snapshot prior dose amount, scheduled time, form, and unit
so history is not relabelled with the new dose. A dose-unit change invalidates automatic stock
restoration for older entries, which uses the existing manual-correction warning.

The notification manager serializes the edit with reconciliation, cancels old requests, and
restores unchanged schedules if persistence fails. Changed schedules clear their pending
snoozes. A stock change while the editor is open rejects the save instead of overwriting a
concurrent dose deduction. Existing unsupported recurrence restrictions still apply.

In-app browser verification covered a labelled QA record: full detail changes, weekday/time/dose
changes, reminder intent, fractional stock, reload persistence, finite interval courses, stock
off, required-weekday validation, and discarding unsaved edits. The QA record remains locally.
58 automated tests passed; actual Android delivery still needs a native device build.

## Connected screens

- Today calls `fetchScheduledDoses(localDate)` for actual SQLite medicines,
  schedules, dose history, and snoozes. It shows due, upcoming, and completed
  occurrences, and calculates progress from today's actual records.
- Take/Skip call `recordMedicationDose` → `logDose`. The transaction checks the
  schedule, inserts one history row per occurrence, clears a matching snooze, and
  deducts stock only for Taken. Repeated taps/retries cannot record or deduct twice.
- Snooze calls `snoozeMedicationDose` → `snoozeDose`. A snooze is a pending deferral,
  not a Taken/Skipped outcome. It survives reloads in `dose_snoozes` and schedules
  an Expo DATE notification using the original dose identity. Completion cancels
  its one-shot reminder while preserving the medicine's recurring alarm.
- Add Medicine commits medicine/schedule rows before calling the notification
  manager. The list subscribes to database commits; it no longer appends a second
  optimistic copy. Stock and metadata refresh on changes and navigation.
- History queries SQLite with date bounds, displays real calendar indicators,
  filters by medicine/status/day, and sorts records by date and scheduled time
  descending. Medicine details also show real recent records. Sample profiles,
  fixed dates, fake records, and pretend CSV/add-entry actions have been removed
  from the integrated views. “Log a dose” returns to Today.

Schema version 2 preserves version 1 data and adds `history.scheduled_at_ms`, an
occurrence uniqueness index, and `dose_snoozes`. Daily, weekday, calendar-day
interval, and hourly interval occurrences are expanded for the dashboard within
course bounds. Hourly occurrences have separate identities even on the same day.
A snooze across midnight keeps its original date and appears on the next dashboard.
The existing native recurring alarm limitations in `reminders.md` still apply:
interval/future-start/finite-course automatic alarms are not implemented by this
frontend integration. As-needed medicines have no scheduled dashboard occurrence.

## Automated verification

Run with Node 24 (the database tests use Node's real SQLite engine):

```sh
npm test
npx expo lint
npx tsc --noEmit
```

24 tests pass: 9 real-SQLite integration tests and 15 notification-boundary tests.
They cover migration preservation, calendar/course selection, independent hourly
occurrences, calendar-dose identity after a time-zone shift, concurrent actions and stock idempotence, persistent snoozes and
midnight carryover, date sorting/filtering, invalid or paused actions, erasure,
permissions, native request identity, snooze recovery, and notification tap routing.
Notification APIs are mocked at the OS boundary; physical Android delivery is not
proven by these tests.

## Browser workflow verified on 2026-09-26

Using the normal UI at localhost:8084:

1. Added **QA Take Test**, daily 00:00, stock 10; confirmed it appears once in the
   list and as due on Today.
2. Pressed Take; Today showed Taken, progress updated, History showed the real
   record and calendar marker. Reloading preserved the entry. Stock became 9.
3. Added **QA Snooze Skip Test**, daily 00:05, stock 10. Pressed Snooze; it moved
   to Upcoming with a persisted snooze time. Reloading preserved that time.
4. Pressed Skip on the snoozed dose; it moved to Completed and appeared in
   History as Skipped, while its stock stayed 10. Snooze did not create a false
   Taken/Skipped history entry.
5. Verified status and medicine filters, day selection, record details,
   previous-month empty state, and returning to the current month.

The two clearly labelled QA medicines and their records remain in the local
browser database for inspection. They are not seeded in application code and do
not appear on a fresh installation. No real patient records were used or erased.
Web snoozing reports that the browser cannot deliver Android reminders. Device
alarm, permission, reboot, and Doze testing still requires a native Android build.

## Multiple dose times (2026-09-29)

Add Medicine accepts additional dose times for daily, weekday, and every-N-days
patterns. Each time is a separate existing-schema schedule with its own dose
amount and reminder identity; all share the medicine stock and profile. Add/edit
writes are atomic. Matching saved schedules are editable together; other existing
schedules keep the selector. New daily forms default to reminders on and keep
advanced course options collapsed. Saved reminder preferences are preserved.

The 64-test suite covers independent dose records/shared stock, duplicate rejection,
editing/history retention, targeted snooze cleanup, atomic rollback, two native
alarm requests, per-dose toggles, pause/resume and replacement without duplicates.
Browser checks cover 9 AM/6 PM creation and edit/reload persistence, simple defaults,
and restriction messages. Native delivery is still a separate physical-device test.
Finite courses, future starts and interval-pattern alarms remain unsupported; this
change does not remove those restrictions or claim browser notification delivery.

## Two History outcomes and end-of-day catch-up (2026-09-29)

History now exposes Taken and Skipped / missed. SQLite retains legacy status
values; the shared History query normalizes both non-taken statuses so calendar,
filters, records and medicine recent history agree.

Schema v8 adds schedules.history_next_date. A serialized transaction records
unlogged occurrences only for elapsed local days, snapshots dose details, and
advances each schedule cursor atomically. Today and History reads perform catch-up;
History refreshes every minute while focused. There is no midnight background
execution guarantee: days away are finalized when the app next reads these views.
Stock is unchanged. Explicit delayed Take replaces an inferred missed outcome
once; a historical dose-unit mismatch rejects incompatible stock deduction.

Pending snoozes crossing midnight defer finalization until expiry; explicit
completion clears them. Paused/archived periods and non-occurring recurrence days
do not generate records. Edits and status transitions finalize elapsed days before
changing schedule data. Migration starts tracking from the upgrade day because
older pause/edit periods cannot be reconstructed reliably; existing logs survive.

Browser verification used the existing labelled QA dose for Skip, merged filters,
calendar marker and details, Undo, Take, and a 390 × 844 layout. Clock-controlled
SQLite tests cover midnight, multiple absent days, repeated queries, multiple
daily/hourly occurrences, course bounds, profile isolation, pause/archive, snoozes,
snapshot preservation, transaction rollback/retry and late Take stock idempotence.
Native-device verification remains separate.
