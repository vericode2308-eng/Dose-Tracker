const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const ts = require('typescript');
function compile(path, dependencies) {
  const out = {};
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', js)(name => { assert.ok(name in dependencies, name); return dependencies[name]; }, out);
  return out;
}
function harness(legacy = false, existingSchedules = true, platform = 'web', filename = ':memory:') {
  const sql = new DatabaseSync(filename);
  if (legacy) {
    const source = fs.readFileSync('src/database.js', 'utf8');
    sql.exec(source.match(/CREATE TABLE medicines[\s\S]+?PRAGMA user_version = 1;/)[0]);
  }
  const adapter = {
    execAsync: async statement => sql.exec(statement),
    getFirstAsync: async (statement, params = []) => sql.prepare(statement).get(...params),
    getAllAsync: async (statement, params = []) => sql.prepare(statement).all(...params),
    runAsync: async (statement, params = []) => sql.prepare(statement).run(...params),
    withTransactionAsync: async fn => { sql.exec('BEGIN'); try { await fn(); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } },
  };
  const recurrence = compile('src/features/doses/occurrences.js', {});
  adapter.withExclusiveTransactionAsync = async task => { await adapter.withTransactionAsync(() => task(adapter)); };
  const db = compile('src/database.js', { './features/security/errors': compile('src/features/security/errors.js', {}), 'expo-crypto': { randomUUID }, 'expo-sqlite': { openDatabaseAsync: async () => adapter }, 'react-native': { Platform: { OS: platform } }, './features/doses/occurrences': recurrence });
  // Most legacy regression cases exercise established schedules with historical actions.
  // Seed their creation before those actions, but begin automatic catch-up today.
  // First-dose tests opt out and use the real persisted creation timestamp.
  if (existingSchedules) {
    const addMedicine = db.addMedicine;
    db.addMedicine = async input => {
      const ids = await addMedicine(input);
      sql.prepare('UPDATE schedules SET created_at_ms = ?, history_next_date = ? WHERE medicine_id = ?')
        .run(new Date('2020-01-01T00:00:00').getTime(), recurrence.dateKey(), ids.medicineId);
      return ids;
    };
  }
  const add = async (kind = 'daily', extra = {}, name = 'QA Medicine') => db.addMedicine({ medicine: { name, dosageForm: 'Tablet', doseUnit: 'tablet', stockRemaining: 10 }, schedule: { timeLocalMinute: 480, doseAmount: 1, pattern: { kind, startDate: '2020-01-01', ...extra } } });
  return { db, sql, add, recurrence };
}
test('schema upgrades version 1 without losing medicine or dose history', async () => {
  const h = harness(true);
  h.sql.exec(`INSERT INTO medicines(id,name,dosage_form,created_at_ms) VALUES('m','Existing','Tablet',1);
    INSERT INTO schedules(id,medicine_id,time_local_minute,recurring_pattern,dose_amount_q,created_at_ms)
      VALUES('s','m',480,'{"kind":"daily","startDate":"2020-01-01"}',1000000,1);
    INSERT INTO history(id,schedule_id,date,status,created_at_ms) VALUES('h','s','2020-01-01','Skipped',1);`);
  const doses = await h.db.fetchScheduledDoses('2020-01-01');
  assert.equal(doses[0].status, 'Skipped');
  assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 8);
  assert.equal((await h.db.fetchMedicineDetails('m')).schedules[0].reminderEnabled, true);
  await h.db.logDose({ scheduleId: 's', date: '2020-01-01', status: 'Taken', actualTakenAtMs: Date.now() });
  assert.equal((await h.db.fetchHistoryByMonth())[0].records.length, 1);
});
test('tracking-only schedules stay quiet; supported legacy alarms remain enabled', async () => {
  const h = harness(true);
  h.sql.exec(`INSERT INTO medicines(id,name,dosage_form,created_at_ms) VALUES('m','Existing','Tablet',1);
    INSERT INTO schedules(id,medicine_id,time_local_minute,recurring_pattern,dose_amount_q,created_at_ms)
      VALUES('finite','m',480,'{"kind":"daily","startDate":"2020-01-01","endDate":"2099-01-01"}',1000000,1);`);
  assert.equal((await h.db.fetchMedicineDetails('m')).schedules[0].reminderEnabled, false);
  const ids = await h.add('daily', {}, 'Tracking only');
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).schedules[0].reminderEnabled, false);
  await h.db.updateScheduleReminderEnabled(ids.scheduleId, true);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).schedules[0].reminderEnabled, true);
  await h.db.updateScheduleReminderEnabled(ids.scheduleId, false);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).schedules[0].reminderEnabled, false);
  await assert.rejects(h.db.updateScheduleReminderEnabled('finite', true), /ongoing daily or weekday/);
  await assert.rejects(h.db.addMedicine({ medicine: { name: 'Unsupported', dosageForm: 'Tablet' },
    schedule: { pattern: { kind: 'daily', startDate: '2020-01-01', endDate: '2099-01-01' }, timeLocalMinute: 480, doseAmount: 1, reminderEnabled: true } }), /ongoing daily or weekday/);
});
test('reminder issue log records only structured local diagnostics and erases with app data', async () => {
  const h = harness();
  await h.db.recordReminderIssue('exact_alarm_off', 'Exact alarm access is off.');
  await h.db.recordReminderIssue('exact_alarm_off', 'Exact alarm access is off.');
  const issues = await h.db.fetchRecentReminderIssues(7);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].occurrences, 2);
  assert.equal(issues[0].code, 'exact_alarm_off');
  await h.db.clearDatabase();
  assert.deepEqual(await h.db.fetchRecentReminderIssues(7), []);
});
test('daily, weekdays, intervals and inclusive course boundaries produce only real occurrences', async () => {
  const h = harness();
  await h.add('daily', { startDate: '2020-01-02', endDate: '2020-01-03' });
  await h.add('weekdays', { weekdays: [3] }, 'Wednesday');
  await h.add('day_interval', { interval: 2 }, 'Every two days');
  await h.add('hour_interval', { interval: 8 }, 'Every eight hours');
  assert.equal((await h.db.fetchScheduledDoses('2020-01-01')).length, 4); // Wed + interval + 08:00/16:00
  assert.equal((await h.db.fetchScheduledDoses('2020-01-02')).length, 4); // daily + 00:00/08:00/16:00
  assert.equal((await h.db.fetchScheduledDoses('2020-01-03')).length, 5);
  assert.equal((await h.db.fetchScheduledDoses('2020-01-04')).length, 3);
});
test('concurrent Take/Skip and retries store one outcome and deduct stock once', async () => {
  const h = harness(); const ids = await h.add();
  const [dose] = await h.db.fetchScheduledDoses('2020-01-01');
  const reference = { scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  await Promise.all([h.db.logDose({ ...reference, status: 'Taken', actualTakenAtMs: Date.now() }), h.db.logDose({ ...reference, status: 'Skipped' })]);
  await h.db.logDose({ ...reference, status: 'Taken', actualTakenAtMs: Date.now() });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
  const records = (await h.db.fetchHistoryByMonth())[0].records;
  assert.equal(records.length, 1); assert.equal(records[0].status, 'Taken');
});
test('hourly doses have independent history identities', async () => {
  const h = harness(); const ids = await h.add('hour_interval', { interval: 8 });
  const doses = await h.db.fetchScheduledDoses('2020-01-02');
  for (const dose of doses) await h.db.logDose({ scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs, status: 'Taken', actualTakenAtMs: Date.now() });
  assert.equal((await h.db.fetchHistoryByMonth())[0].records.length, 3);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 7);
});
test('snooze persists separately from history, then Take clears it atomically', async () => {
  const h = harness(); const ids = await h.add();
  const [dose] = await h.db.fetchScheduledDoses('2020-01-01');
  const reference = { scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  const untilMs = Date.now() + 600000;
  await h.db.snoozeDose({ ...reference, untilMs });
  assert.equal((await h.db.fetchScheduledDoses(dose.date))[0].snoozedUntilMs, untilMs);
  assert.deepEqual(await h.db.fetchHistoryByMonth(), []);
  await h.db.logDose({ ...reference, status: 'Taken', actualTakenAtMs: Date.now() });
  assert.deepEqual(await h.db.fetchPendingSnoozes(), []);
  await assert.rejects(h.db.snoozeDose({ ...reference, untilMs }), /already been recorded/);
});
test('notification snooze replay preserves its deadline across runtime restarts and expiry', async t => {
  const advance = clockAt(t, '2026-09-29T08:00:00');
  const h = harness(); const ids = await h.add();
  const [dose] = await h.db.fetchScheduledDoses('2026-09-29');
  const ref = { scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  const delivered = Date.now();
  const firstDeadline = delivered + 15 * 60000;
  assert.equal(await h.db.snoozeDose({ ...ref, untilMs: firstDeadline, notificationDeliveredAtMs: delivered }), firstDeadline);
  advance('2026-09-29T08:02:00');
  // The guard uses SQLite, with no notification-manager memory or action cache.
  const duplicate = () => h.db.snoozeDose({ ...ref, untilMs: Date.now() + 15 * 60000, notificationDeliveredAtMs: delivered });
  assert.deepEqual(await Promise.all([duplicate(), duplicate()]), [firstDeadline, firstDeadline]);
  advance('2026-09-29T08:16:00');
  assert.equal(await duplicate(), firstDeadline); // expired response cannot start another snooze
  const nextDeadline = Date.now() + 15 * 60000;
  assert.equal(await h.db.snoozeDose({ ...ref, untilMs: nextDeadline, notificationDeliveredAtMs: firstDeadline }), nextDeadline);
  assert.equal(await duplicate(), nextDeadline); // older press cannot overwrite the later snooze
  assert.equal(h.sql.prepare('SELECT count(*) AS n FROM dose_snoozes').get().n, 1);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
  // A deliberate in-app snooze remains free to set a new deadline.
  assert.equal(await h.db.snoozeDose({ ...ref, untilMs: nextDeadline + 60000 }), nextDeadline + 60000);
});
test('Skip preserves stock; date bounds and sort order drive history queries', async () => {
  const h = harness(); const ids = await h.add();
  for (const date of ['2020-01-01', '2020-02-03', '2020-02-01']) await h.db.logDose({ scheduleId: ids.scheduleId, date, status: 'Skipped' });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
  const records = (await h.db.fetchHistoryByMonth({ from: '2020-02-01', to: '2020-02-28', medicineId: ids.medicineId })).flatMap(m => m.records);
  assert.deepEqual(records.map(r => r.date), ['2020-02-03', '2020-02-01']);
});
test('paused, future and invalid occurrences cannot be logged; erase clears every table', async () => {
  const h = harness(); const ids = await h.add();
  await assert.rejects(h.db.logDose({ scheduleId: ids.scheduleId, date: '2099-01-01', status: 'Skipped' }), /not due/);
  await assert.rejects(h.db.logDose({ scheduleId: ids.scheduleId, date: '2020-01-01', scheduledAtMs: 1, status: 'Skipped' }), /does not belong/);
  await h.db.updateMedicine(ids.medicineId, { status: 'Paused' });
  assert.deepEqual(await h.db.fetchScheduledDoses('2020-01-01'), []);
  await assert.rejects(h.db.logDose({ scheduleId: ids.scheduleId, date: '2020-01-01', status: 'Skipped' }), /no longer active/);
  await h.db.clearDatabase();
  for (const table of ['medicines', 'schedules', 'history', 'dose_snoozes', 'settings']) assert.equal(h.sql.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
});
test('a snooze across midnight retains its original dose identity on the next dashboard', async () => {
  const h = harness(); const ids = await h.add();
  // Inject a past snooze as though saved before midnight; no clock mutation needed.
  const [dose] = await h.db.fetchScheduledDoses('2020-01-01');
  const until = new Date('2020-01-02T00:10:00').getTime();
  h.sql.prepare('INSERT INTO dose_snoozes(schedule_id,date,scheduled_at_ms,until_ms) VALUES(?,?,?,?)').run(ids.scheduleId, dose.date, dose.scheduledAtMs, until);
  const tomorrow = await h.db.fetchScheduledDoses('2020-01-02');
  assert.equal(tomorrow.length, 2);
  assert.equal(tomorrow[0].date, '2020-01-01');
  assert.equal(tomorrow[0].snoozedUntilMs, until);
  await h.db.logDose({ scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs, status: 'Skipped' });
  assert.equal((await h.db.fetchScheduledDoses('2020-01-02')).length, 1);
});
test('a recorded calendar dose stays completed if its wall-clock timestamp shifts after travel', async () => {
  const h = harness(); const ids = await h.add();
  await h.db.logDose({ scheduleId: ids.scheduleId, date: '2020-01-01', status: 'Taken', actualTakenAtMs: Date.now() });
  // Emulate a historical timestamp in the previous time zone.
  h.sql.exec('UPDATE history SET scheduled_at_ms = scheduled_at_ms - 3600000');
  assert.equal((await h.db.fetchScheduledDoses('2020-01-01'))[0].status, 'Taken');
  await h.db.logDose({ scheduleId: ids.scheduleId, date: '2020-01-01', status: 'Taken', actualTakenAtMs: Date.now() });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
});

const profileInput = (name) => ({ name, relationship: 'Family', color: '#4299FA', photoUri: null, dateOfBirth: '', notes: '' });
test('legacy profile imports once, keeps existing ownership and selected profile persists in SQLite', async () => {
  const h = harness(); await h.db.initializeDatabase();
  const old = await h.add();
  await h.db.initializeProfiles(profileInput('Original'));
  const second = await h.db.saveProfile(profileInput('Family'));
  assert.equal((await h.db.fetchProfileState()).activeProfileId, second);
  await h.db.initializeProfiles(profileInput('Stale name'));
  assert.equal((await h.db.fetchProfiles())[0].name, 'Original');
  assert.equal((await h.db.fetchMedicineDetails(old.medicineId)).profileId, 'profile-default');
  await h.db.selectProfile('profile-default');
  assert.equal(h.sql.prepare('SELECT active_profile_id FROM settings').get().active_profile_id, 'profile-default');
});
test('medicine, dashboard and history data remain isolated for two profiles with identical medicine names', async () => {
  const h = harness(); await h.db.initializeDatabase();
  await h.add();
  const second = await h.db.saveProfile(profileInput('Family'));
  await h.add();
  const doses = await h.db.fetchScheduledDoses('2026-09-26', second);
  assert.equal(doses.length, 1);
  assert.equal(doses[0].medicine.profileId, second);
  await h.db.logDose({ scheduleId: doses[0].schedule.id, date: doses[0].date, scheduledAtMs: doses[0].scheduledAtMs, status: 'Taken', actualTakenAtMs: doses[0].scheduledAtMs });
  assert.equal((await h.db.fetchHistoryByMonth({ profileId: second }))[0].records.length, 1);
  assert.deepEqual(await h.db.fetchHistoryByMonth({ profileId: 'profile-default' }), []);
  assert.equal((await h.db.fetchAllMedicines({ profileId: second }))[0].stockRemaining, 9);
  assert.equal((await h.db.fetchAllMedicines({ profileId: 'profile-default' }))[0].stockRemaining, 10);
  assert.equal((await h.db.fetchAllMedicines()).length, 2, 'reminder reconciliation includes both active profiles');
});
test('archive switches away, hides occurrences, rejects actions and preserves history for restoration', async () => {
  const h = harness(); await h.db.initializeDatabase();
  const second = await h.db.saveProfile(profileInput('Family')); await h.add();
  const dose = (await h.db.fetchScheduledDoses('2026-09-26', second))[0];
  const ref = { scheduleId: dose.schedule.id, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  await h.db.logDose({ ...ref, status: 'Skipped' });
  await h.db.setProfileArchived(second, true);
  assert.equal((await h.db.fetchProfileState()).activeProfileId, 'profile-default');
  assert.deepEqual(await h.db.fetchScheduledDoses('2026-09-26', second), []);
  await assert.rejects(h.db.selectProfile(second), /Restore/);
  await assert.rejects(h.db.logDose({ ...ref, status: 'Taken', actualTakenAtMs: Date.now() }));
  await assert.rejects(h.db.setProfileArchived('profile-default', true), /at least one/);
  await h.db.setProfileArchived(second, false);
  await h.db.selectProfile(second);
  assert.equal((await h.db.fetchScheduledDoses('2026-09-26', second))[0].status, 'Skipped');
  assert.equal((await h.db.fetchHistoryByMonth({ profileId: second }))[0].records.length, 1);
  await h.db.clearDatabase();
  assert.deepEqual(await h.db.fetchProfiles(), []);
  await h.db.initializeProfiles(null);
  assert.equal((await h.db.fetchProfileState()).activeProfileId, 'profile-default');
});
test('overdue counts exclude completed and future-snoozed doses and refresh after profile edits', async () => {
  const h = harness(); await h.db.initializeDatabase();
  await h.db.addMedicine({ medicine: { name: 'Overdue', dosageForm: 'Tablet' }, schedule: { timeLocalMinute: 0, doseAmount: 1, pattern: { kind: 'daily', startDate: '2020-01-01' } } });
  const state = await h.db.fetchProfileState(); assert.equal(state.profiles[0].overdueCount, 1);
  const dose = (await h.db.fetchScheduledDoses())[0];
  await h.db.snoozeDose({ scheduleId: dose.schedule.id, date: dose.date, scheduledAtMs: dose.scheduledAtMs, untilMs: Date.now() + 600000 });
  assert.equal((await h.db.fetchProfileState()).profiles[0].overdueCount, 0);
  await h.db.saveProfile({ ...profileInput('Edited'), id: 'profile-default' });
  assert.equal((await h.db.fetchProfileState()).profiles[0].name, 'Edited');
});
test('undoDoseLog deletes history entry, restores stock if taken, and restores uncompleted status', async () => {
  const h = harness(); const ids = await h.add();
  const [dose] = await h.db.fetchScheduledDoses('2020-01-01');
  const ref = { scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  
  // Log as Taken: stock drops to 9
  await h.db.logDose({ ...ref, status: 'Taken', actualTakenAtMs: Date.now() });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
  assert.equal((await h.db.fetchScheduledDoses('2020-01-01'))[0].status, 'Taken');

  // Undo Taken dose: stock restored to 10, status becomes null
  await h.db.undoDoseLog(ref);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
  assert.equal((await h.db.fetchScheduledDoses('2020-01-01'))[0].status, null);
  assert.deepEqual(await h.db.fetchHistoryByMonth(), []);

  // Log as Skipped: stock remains 10
  await h.db.logDose({ ...ref, status: 'Skipped' });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
  assert.equal((await h.db.fetchScheduledDoses('2020-01-01'))[0].status, 'Skipped');

  // Undo Skipped dose: stock remains 10, status becomes null
  await h.db.undoDoseLog(ref);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
  assert.equal((await h.db.fetchScheduledDoses('2020-01-01'))[0].status, null);
  assert.deepEqual(await h.db.fetchHistoryByMonth(), []);
});

test('undo restores only stock actually deducted when a dose exceeds remaining stock', async () => {
  const h = harness();
  const ids = await h.db.addMedicine({
    medicine: { name: 'Low stock', dosageForm: 'Tablet', stockRemaining: 1 },
    schedule: { timeLocalMinute: 480, doseAmount: 2, pattern: { kind: 'daily', startDate: '2020-01-01' } },
  });
  const [dose] = await h.db.fetchScheduledDoses('2020-01-01');
  const ref = { scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  await h.db.logDose({ ...ref, status: 'Taken', actualTakenAtMs: Date.now() });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 0);
  await h.db.undoDoseLog(ref);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 1);
});
test('editing a Taken time preserves date, status, and stock', async () => {
  const h = harness();
  const ids = await h.add();
  const date = '2020-01-01';
  const original = new Date(2020, 0, 1, 8, 30).getTime();
  const historyId = await h.db.logDose({ scheduleId: ids.scheduleId, date, status: 'Taken', actualTakenAtMs: original });
  const corrected = new Date(2020, 0, 1, 9, 15).getTime();
  await h.db.updateDoseLogTime({ historyId, actualTakenAtMs: corrected });
  const record = (await h.db.fetchHistoryByMonth())[0].records[0];
  assert.equal(record.actualTakenAtMs, corrected);
  assert.equal(record.status, 'Taken');
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
  await assert.rejects(h.db.updateDoseLogTime({ historyId, actualTakenAtMs: new Date(2020, 0, 2, 9).getTime() }), /recorded dose date/);
  await assert.rejects(h.db.updateDoseLogTime({ historyId, actualTakenAtMs: Date.now() + 60000 }), /future/);
});
test('legacy Taken undo reports that tracked stock needs manual correction', async () => {
  const h = harness(); const ids = await h.add();
  const [dose] = await h.db.fetchScheduledDoses('2020-01-01');
  const ref = { scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  const historyId = await h.db.logDose({ ...ref, status: 'Taken', actualTakenAtMs: Date.now() });
  h.sql.prepare('UPDATE history SET stock_deducted_q = NULL WHERE id = ?').run(historyId);
  const result = await h.db.undoDoseLog(ref);
  assert.equal(result.manualStockCorrectionNeeded, true);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
});

function fullEdit(medicine, overrides = {}) {
  const schedule = medicine.schedules[0];
  return { medicine: { ...medicine, strength: medicine.strength ?? undefined, purpose: medicine.purpose ?? '', instructions: medicine.instructions ?? '', notes: medicine.notes ?? '', color: medicine.color ?? '' },
    schedule: { ...schedule }, scheduleId: schedule.id, expectedStockRemaining: medicine.stockRemaining, ...overrides };
}
test('full medicine edit persists all details, preserves IDs and historical dose values', async () => {
  const h = harness(); const ids = await h.add();
  await h.db.logDose({ scheduleId: ids.scheduleId, date: '2020-01-01', status: 'Taken', actualTakenAtMs: Date.now() });
  const before = await h.db.fetchMedicineDetails(ids.medicineId);
  const input = fullEdit(before);
  Object.assign(input.medicine, { name: 'Edited', dosageForm: 'Liquid', doseUnit: 'mL', strength: '', purpose: 'QA purpose', instructions: 'QA instructions', notes: 'QA notes', color: '#3297FF', stockRemaining: 25.5, lowStockThreshold: 3 });
  Object.assign(input.schedule, { doseAmount: 2.5, timeLocalMinute: 600, reminderEnabled: true, pattern: { kind: 'weekdays', weekdays: [1, 3], startDate: '2020-01-01' } });
  await h.db.editMedicine(ids.medicineId, input);
  const after = await h.db.fetchMedicineDetails(ids.medicineId);
  assert.equal(after.id, ids.medicineId); assert.equal(after.profileId, before.profileId);
  assert.equal(after.status, 'Active'); assert.equal(after.name, 'Edited'); assert.equal(after.strength, null);
  assert.equal(after.dosageForm, 'Liquid'); assert.equal(after.doseUnit, 'mL'); assert.equal(after.purpose, 'QA purpose');
  assert.equal(after.instructions, 'QA instructions'); assert.equal(after.notes, 'QA notes'); assert.equal(after.color, '#3297FF');
  assert.equal(after.stockRemaining, 25.5); assert.equal(after.lowStockThreshold, 3);
  assert.equal(after.schedules[0].id, ids.scheduleId); assert.equal(after.schedules[0].timeLocalMinute, 600);
  assert.equal(after.schedules[0].doseAmount, 2.5); assert.equal(after.schedules[0].reminderEnabled, true);
  const history = (await h.db.fetchHistoryByMonth())[0].records[0];
  assert.equal(history.doseAmount, 1); assert.equal(history.scheduledTimeLocalMinute, 480);
  assert.equal(history.dosageForm, 'Tablet'); assert.equal(history.doseUnit, 'tablet');
  assert.equal((await h.db.fetchAllMedicines()).length, 1);
});
test('full edits reject invalid schedules, foreign schedule IDs and stale stock without partial writes', async () => {
  const h = harness(); const ids = await h.add(); const other = await h.add('daily', {}, 'Other');
  const before = await h.db.fetchMedicineDetails(ids.medicineId);
  const input = fullEdit(before); input.medicine.name = 'Must not save'; input.schedule.doseAmount = 0;
  await assert.rejects(h.db.editMedicine(ids.medicineId, input), /greater than zero/);
  input.schedule.doseAmount = 1; input.scheduleId = other.scheduleId;
  await assert.rejects(h.db.editMedicine(ids.medicineId, input), /not found/);
  input.scheduleId = ids.scheduleId; input.expectedStockRemaining = 3;
  await assert.rejects(h.db.editMedicine(ids.medicineId, input), /Stock changed/);
  assert.deepEqual(await h.db.fetchMedicineDetails(ids.medicineId), before);
  input.expectedStockRemaining = before.stockRemaining; input.schedule.pattern = { kind: 'prn', startDate: '2020-01-01' }; input.schedule.timeLocalMinute = null; input.schedule.reminderEnabled = true;
  await assert.rejects(h.db.editMedicine(ids.medicineId, input), /Reminders currently support/);
  input.schedule.reminderEnabled = false; input.medicine.stockRemaining = null; input.medicine.lowStockThreshold = null;
  await h.db.editMedicine(ids.medicineId, input);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, null);
});
test('metadata edits retain snoozes; schedule edits clear only the edited schedule snoozes', async () => {
  const h = harness(); const ids = await h.add(); const other = await h.add('daily', {}, 'Other');
  for (const dose of await h.db.fetchScheduledDoses('2020-01-01')) await h.db.snoozeDose({ scheduleId: dose.schedule.id, date: dose.date, scheduledAtMs: dose.scheduledAtMs, untilMs: Date.now() + 600000 });
  const input = fullEdit(await h.db.fetchMedicineDetails(ids.medicineId)); input.medicine.notes = 'Updated';
  await h.db.editMedicine(ids.medicineId, input); assert.equal((await h.db.fetchPendingSnoozes()).length, 2);
  input.schedule.timeLocalMinute = 600;
  await h.db.editMedicine(ids.medicineId, input);
  const pending = await h.db.fetchPendingSnoozes(); assert.equal(pending.length, 1); assert.equal(pending[0].scheduleId, other.scheduleId);
});
test('failed metadata edit rolls back history snapshots and other field changes', async () => {
  const h = harness(); const ids = await h.add();
  await h.db.logDose({ scheduleId: ids.scheduleId, date: '2020-01-01', status: 'Taken', actualTakenAtMs: Date.now() });
  const before = await h.db.fetchMedicineDetails(ids.medicineId);
  const input = fullEdit(before); input.medicine.name = 'Rollback'; input.medicine.notes = '   ';
  await assert.rejects(h.db.editMedicine(ids.medicineId, input), /Text is required/);
  assert.deepEqual(await h.db.fetchMedicineDetails(ids.medicineId), before);
  assert.equal(h.sql.prepare('SELECT dose_snapshot FROM history').get().dose_snapshot, null);
});
test('editing one schedule preserves other schedules and paused status; repeated edits retain history', async () => {
  const h = harness(); const ids = await h.add();
  h.sql.prepare(`INSERT INTO schedules(id,medicine_id,time_local_minute,recurring_pattern,dose_amount_q,created_at_ms) VALUES(?,?,?,?,?,?)`).run('second', ids.medicineId, 1080, '{"kind":"daily","startDate":"2020-01-01"}', 3000000, Date.now());
  await h.db.logDose({ scheduleId: ids.scheduleId, date: '2020-01-01', status: 'Taken', actualTakenAtMs: Date.now() });
  await h.db.updateMedicine(ids.medicineId, { status: 'Paused' });
  const before = await h.db.fetchMedicineDetails(ids.medicineId);
  const input = fullEdit(before); input.schedule.doseAmount = 2;
  await h.db.editMedicine(ids.medicineId, input);
  input.schedule.doseAmount = 4; await h.db.editMedicine(ids.medicineId, input);
  const after = await h.db.fetchMedicineDetails(ids.medicineId);
  assert.equal(after.status, 'Paused'); assert.deepEqual(after.schedules.find(s => s.id === 'second'), before.schedules.find(s => s.id === 'second'));
  assert.equal((await h.db.fetchHistoryByMonth())[0].records[0].doseAmount, 1);
});

test('multiple daily times share stock but keep independent dose histories and undo', async () => {
  const h = harness();
  const schedule = { pattern: { kind: 'daily', startDate: '2020-01-01' }, timeLocalMinute: 540, doseAmount: 1, reminderEnabled: true };
  const ids = await h.db.addMedicine({ medicine: { name: 'Twice daily', dosageForm: 'Tablet', doseUnit: 'tablet', stockRemaining: 10 }, schedule,
    additionalSchedules: [{ ...schedule, timeLocalMinute: 1080, doseAmount: 2 }] });
  const med = await h.db.fetchMedicineDetails(ids.medicineId);
  assert.equal(med.schedules.length, 2);
  assert.deepEqual(med.schedules.map(s => s.timeLocalMinute), [540, 1080]);
  assert.ok(med.schedules.every(s => s.reminderEnabled));
  const doses = await h.db.fetchScheduledDoses('2020-01-01');
  assert.equal(doses.length, 2);
  const morning = doses.find(d => d.schedule.timeLocalMinute === 540);
  const evening = doses.find(d => d.schedule.timeLocalMinute === 1080);
  await h.db.logDose({ scheduleId: morning.schedule.id, date: morning.date, scheduledAtMs: morning.scheduledAtMs, status: 'Taken', actualTakenAtMs: Date.now() });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
  assert.equal((await h.db.fetchScheduledDoses('2020-01-01')).find(d => d.schedule.id === evening.schedule.id).status, null);
  await h.db.logDose({ scheduleId: evening.schedule.id, date: evening.date, scheduledAtMs: evening.scheduledAtMs, status: 'Skipped' });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
  await h.db.undoDoseLog({ scheduleId: morning.schedule.id, date: morning.date, scheduledAtMs: morning.scheduledAtMs });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
  assert.equal((await h.db.fetchScheduledDoses('2020-01-01')).find(d => d.schedule.id === evening.schedule.id).status, 'Skipped');
});

test('multiple time validation is atomic and rejects duplicate times and invalid amounts', async () => {
  const h = harness();
  await h.db.initializeDatabase();
  const medicine = { name: 'Rejected', dosageForm: 'Tablet' };
  const schedule = { pattern: { kind: 'daily', startDate: '2020-01-01' }, timeLocalMinute: 540, doseAmount: 1 };
  await assert.rejects(h.db.addMedicine({ medicine, schedule, additionalSchedules: [{ ...schedule }] }), /different time/);
  await assert.rejects(h.db.addMedicine({ medicine, schedule, additionalSchedules: [{ ...schedule, timeLocalMinute: 1080, doseAmount: 0 }] }), /greater than zero/);
  await assert.rejects(h.db.addMedicine({ medicine, schedule, additionalSchedules: [{ ...schedule, id: 'foreign', timeLocalMinute: 1080 }] }), /existing schedules/);
  assert.equal((await h.db.fetchAllMedicines()).length, 0);
});

test('edit multiple dose times preserves identities and history, rejects foreign IDs and collisions', async () => {
  const h = harness(); const ids = await h.add();
  const original = await h.db.fetchMedicineDetails(ids.medicineId);
  const input = fullEdit(original);
  input.additionalSchedules = [{ ...input.schedule, id: undefined, timeLocalMinute: 1080, doseAmount: 2 }];
  await h.db.editMedicine(ids.medicineId, input);
  let med = await h.db.fetchMedicineDetails(ids.medicineId);
  const evening = med.schedules.find(s => s.id !== ids.scheduleId);
  h.sql.prepare('UPDATE schedules SET created_at_ms = ? WHERE id = ?').run(new Date('2020-01-01T00:00:00').getTime(), evening.id);
  await h.db.logDose({ scheduleId: evening.id, date: '2020-01-01', status: 'Taken', actualTakenAtMs: Date.now() });
  med = await h.db.fetchMedicineDetails(ids.medicineId);
  const edit = fullEdit(med);
  edit.additionalSchedules = [{ ...evening, timeLocalMinute: 1140, doseAmount: 3 }];
  await h.db.editMedicine(ids.medicineId, edit);
  const after = await h.db.fetchMedicineDetails(ids.medicineId);
  assert.equal(after.schedules.length, 2);
  assert.equal(after.schedules.find(s => s.id === evening.id).timeLocalMinute, 1140);
  assert.equal((await h.db.fetchHistoryByMonth())[0].records[0].doseAmount, 2);
  edit.additionalSchedules[0].id = 'foreign';
  await assert.rejects(h.db.editMedicine(ids.medicineId, edit), /no longer exists/);
  assert.deepEqual(await h.db.fetchMedicineDetails(ids.medicineId), after);
  edit.additionalSchedules = [{ ...edit.schedule, id: undefined, timeLocalMinute: 1140 }];
  await assert.rejects(h.db.editMedicine(ids.medicineId, edit), /already has a dose/);
  assert.deepEqual(await h.db.fetchMedicineDetails(ids.medicineId), after);
});

test('editing extra dose clears only its snooze and a failed new-dose insert rolls back the whole form', async () => {
  const h = harness(); const ids = await h.add();
  let med = await h.db.fetchMedicineDetails(ids.medicineId);
  let input = fullEdit(med);
  input.additionalSchedules = [{ ...input.schedule, id: undefined, timeLocalMinute: 1080 }];
  await h.db.editMedicine(ids.medicineId, input);
  med = await h.db.fetchMedicineDetails(ids.medicineId);
  const doses = await h.db.fetchScheduledDoses('2020-01-01');
  for (const dose of doses) await h.db.snoozeDose({ scheduleId: dose.schedule.id, date: dose.date, scheduledAtMs: dose.scheduledAtMs, untilMs: Date.now() + 600000 });
  input = fullEdit(med);
  input.additionalSchedules = [{ ...med.schedules[1], timeLocalMinute: 1140 }];
  await h.db.editMedicine(ids.medicineId, input);
  assert.deepEqual((await h.db.fetchPendingSnoozes()).map(s => s.scheduleId), [ids.scheduleId]);
  const before = await h.db.fetchMedicineDetails(ids.medicineId);
  h.sql.exec("CREATE TRIGGER reject_new_schedule BEFORE INSERT ON schedules BEGIN SELECT RAISE(ABORT, 'test write failure'); END;");
  input = fullEdit(before); input.medicine.name = 'Should roll back';
  input.additionalSchedules = [{ ...input.schedule, id: undefined, timeLocalMinute: 720 }];
  await assert.rejects(h.db.editMedicine(ids.medicineId, input), /test write failure/);
  assert.deepEqual(await h.db.fetchMedicineDetails(ids.medicineId), before);
  assert.deepEqual((await h.db.fetchPendingSnoozes()).map(s => s.scheduleId), [ids.scheduleId]);
});

function clockAt(t, value) {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(value).getTime() });
  return value => t.mock.timers.setTime(new Date(value).getTime());
}
const historyRows = async db => (await db.fetchHistoryByMonth()).flatMap(group => group.records);

test('History merges existing Skip/Missed outcomes without rewriting records or stock', async () => {
  const h = harness(); const ids = await h.add();
  for (const [date, status] of [['2020-01-01', 'Taken'], ['2020-01-02', 'Skipped'], ['2020-01-03', 'Missed']]) {
    await h.db.logDose({ scheduleId: ids.scheduleId, date, status, actualTakenAtMs: status === 'Taken' ? Date.now() : null });
  }
  const records = await historyRows(h.db);
  assert.deepEqual(records.map(r => r.status), ['Skipped / missed', 'Skipped / missed', 'Taken']);
  assert.equal(records.filter(r => r.status === 'Skipped / missed').length, 2);
  assert.deepEqual(h.sql.prepare('SELECT status FROM history ORDER BY date').all().map(r => r.status), ['Taken', 'Skipped', 'Missed']);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
});

test('midnight catch-up persists only elapsed days, stays idempotent and leaves stock unchanged', async t => {
  const advance = clockAt(t, '2026-09-27T12:00:00');
  const h = harness(); const ids = await h.add();
  assert.deepEqual(await historyRows(h.db), []);
  advance('2026-09-27T23:59:59');
  assert.deepEqual(await historyRows(h.db), []);
  advance('2026-09-30T00:00:00');
  const rows = await historyRows(h.db);
  assert.deepEqual(rows.map(r => r.date), ['2026-09-29', '2026-09-28', '2026-09-27']);
  assert.ok(rows.every(r => r.status === 'Skipped / missed' && r.actualTakenAtMs === null));
  assert.deepEqual(await historyRows(h.db), rows);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
  assert.equal(h.sql.prepare('SELECT history_next_date FROM schedules').get().history_next_date, '2026-09-30');
});

test('catch-up respects Taken/Skip, multi-dose identities, date and profile filters', async t => {
  const advance = clockAt(t, '2026-09-27T20:00:00');
  const h = harness();
  const schedule = { pattern: { kind: 'daily', startDate: '2026-09-27' }, timeLocalMinute: 480, doseAmount: 1 };
  const ids = await h.db.addMedicine({ medicine: { name: 'QA', dosageForm: 'Tablet', stockRemaining: 10 }, schedule,
    additionalSchedules: [{ ...schedule, timeLocalMinute: 1080 }] });
  await h.db.logDose({ scheduleId: ids.scheduleId, date: '2026-09-27', status: 'Taken', actualTakenAtMs: Date.now() });
  const second = await h.db.saveProfile({ name: 'QA Second', color: '#123456' });
  await h.add();
  advance('2026-09-28T20:00:00');
  await h.db.logDose({ scheduleId: ids.scheduleId, date: '2026-09-28', status: 'Skipped' });
  advance('2026-09-29T00:00:00');
  const records = (await h.db.fetchHistoryByMonth({ profileId: 'profile-default', from: '2026-09-27', to: '2026-09-28' })).flatMap(g => g.records);
  assert.equal(records.length, 4);
  assert.equal(records.filter(r => r.status === 'Taken').length, 1);
  assert.equal(records.filter(r => r.status === 'Skipped / missed').length, 3);
  assert.equal((await h.db.fetchHistoryByMonth({ profileId: second }))[0].records.length, 2);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
});

test('pending cross-midnight snooze is excluded until expiry', async t => {
  const advance = clockAt(t, '2026-09-27T23:55:00');
  const h = harness(); const ids = await h.add();
  const [dose] = await h.db.fetchScheduledDoses('2026-09-27');
  const ref = { scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  await h.db.snoozeDose({ ...ref, untilMs: new Date('2026-09-28T00:10:00').getTime() });
  advance('2026-09-28T00:01:00');
  assert.deepEqual(await historyRows(h.db), []);
  assert.equal((await h.db.fetchScheduledDoses('2026-09-28')).filter(d => d.date === '2026-09-27').length, 1);
  advance('2026-09-28T00:11:00');
  assert.equal((await historyRows(h.db))[0].status, 'Skipped / missed');
  assert.deepEqual(await h.db.fetchPendingSnoozes(), []);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
});

test('pause and profile archive preserve earlier days without marking inactive days missed', async t => {
  const advance = clockAt(t, '2026-09-26T12:00:00');
  const h = harness(); const ids = await h.add();
  advance('2026-09-27T12:00:00');
  await h.db.updateMedicine(ids.medicineId, { status: 'Paused' });
  advance('2026-09-29T12:00:00');
  await h.db.updateMedicine(ids.medicineId, { status: 'Active' });
  assert.deepEqual((await historyRows(h.db)).map(r => r.date), ['2026-09-26']);
  await h.db.saveProfile({ name: 'Second', color: '#123456' });
  advance('2026-09-30T12:00:00');
  await h.db.setProfileArchived('profile-default', true);
  advance('2026-10-02T12:00:00');
  await h.db.setProfileArchived('profile-default', false);
  assert.deepEqual((await historyRows(h.db)).map(r => r.date), ['2026-09-29', '2026-09-26']);
});

test('course bounds, weekdays, hourly intervals and PRN control automatic history', async t => {
  const advance = clockAt(t, '2026-09-27T12:00:00'); // Sunday
  const h = harness();
  await h.add('daily', { startDate: '2026-09-28', endDate: '2026-09-28' }, 'Course');
  await h.add('weekdays', { startDate: '2026-09-27', weekdays: [1] }, 'Monday');
  await h.add('day_interval', { startDate: '2026-09-27', interval: 2 }, 'Alternate');
  await h.add('hour_interval', { startDate: '2026-09-27', interval: 8 }, 'Hourly');
  await h.db.addMedicine({ medicine: { name: 'PRN', dosageForm: 'Tablet' }, schedule: { pattern: { kind: 'prn', startDate: '2026-09-27' }, timeLocalMinute: null, doseAmount: 1 } });
  advance('2026-09-30T00:00:00');
  const rows = await historyRows(h.db);
  for (const [name, count] of [['Course', 1], ['Monday', 1], ['Alternate', 2], ['Hourly', 8], ['PRN', 0]]) {
    assert.equal(rows.filter(r => r.medicineName === name).length, count, name);
  }
});

test('schedule edits finalize old days and preserve automatic dose snapshots', async t => {
  const advance = clockAt(t, '2026-09-27T12:00:00');
  const h = harness(); const ids = await h.add();
  advance('2026-09-28T12:00:00');
  const med = await h.db.fetchMedicineDetails(ids.medicineId);
  const input = fullEdit(med); input.schedule.doseAmount = 3; input.schedule.timeLocalMinute = 1080;
  await h.db.editMedicine(ids.medicineId, input);
  advance('2026-09-29T12:00:00');
  const rows = await historyRows(h.db);
  assert.deepEqual(rows.map(r => [r.date, r.doseAmount, r.scheduledTimeLocalMinute]), [['2026-09-28', 3, 1080], ['2026-09-27', 1, 480]]);
});

test('explicit Take after automatic miss replaces that outcome and deducts stock only once', async t => {
  const advance = clockAt(t, '2026-09-27T12:00:00');
  const h = harness(); const ids = await h.add();
  advance('2026-09-28T00:01:00');
  const [missed] = await historyRows(h.db);
  const ref = { scheduleId: ids.scheduleId, date: missed.date, scheduledAtMs: missed.scheduledAtMs };
  await Promise.all([h.db.logDose({ ...ref, status: 'Taken', actualTakenAtMs: Date.now() }), h.db.logDose({ ...ref, status: 'Taken', actualTakenAtMs: Date.now() })]);
  const rows = await historyRows(h.db);
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'Taken'); assert.equal(rows[0].id, missed.id);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
  await h.db.undoDoseLog(ref);
  assert.deepEqual(await historyRows(h.db), []);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
});

test('taking a cross-midnight snooze before expiry prevents an automatic missed record', async t => {
  const advance = clockAt(t, '2026-09-27T23:55:00');
  const h = harness(); const ids = await h.add();
  const [dose] = await h.db.fetchScheduledDoses('2026-09-27');
  const ref = { scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
  await h.db.snoozeDose({ ...ref, untilMs: new Date('2026-09-28T00:10:00').getTime() });
  advance('2026-09-28T00:01:00');
  assert.deepEqual(await historyRows(h.db), []);
  await h.db.logDose({ ...ref, status: 'Taken', actualTakenAtMs: Date.now() });
  advance('2026-09-28T00:11:00');
  const rows = await historyRows(h.db);
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'Taken');
});

test('failed automatic history write rolls back the cursor and retries without omissions', async t => {
  const advance = clockAt(t, '2026-09-27T12:00:00');
  const h = harness(); await h.add();
  advance('2026-09-29T00:01:00');
  h.sql.exec("CREATE TRIGGER fail_catchup BEFORE INSERT ON history WHEN NEW.date = '2026-09-28' BEGIN SELECT RAISE(ABORT, 'disk failure'); END;");
  await assert.rejects(historyRows(h.db), /disk failure/);
  assert.equal(h.sql.prepare('SELECT COUNT(*) AS n FROM history').get().n, 0);
  assert.equal(h.sql.prepare('SELECT history_next_date FROM schedules').get().history_next_date, '2026-09-27');
  h.sql.exec('DROP TRIGGER fail_catchup');
  assert.equal((await historyRows(h.db)).length, 2);
});

test('a changed dose unit cannot silently deduct incompatible stock for an earlier missed dose', async t => {
  const advance = clockAt(t, '2026-09-27T12:00:00');
  const h = harness(); const ids = await h.add();
  advance('2026-09-28T12:00:00');
  const med = await h.db.fetchMedicineDetails(ids.medicineId);
  const input = fullEdit(med); input.medicine.doseUnit = 'ml';
  await h.db.editMedicine(ids.medicineId, input);
  await assert.rejects(h.db.logDose({ scheduleId: ids.scheduleId, date: '2026-09-27', status: 'Taken', actualTakenAtMs: Date.now() }), /dose unit changed/);
  const rows = await historyRows(h.db);
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'Skipped / missed'); assert.equal(rows[0].doseUnit, 'tablet');
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
});


test('new 12:01 AM medicine starts tomorrow and never creates a phantom missed dose', async t => {
  const advance = clockAt(t, '2026-09-29T20:21:00');
  const h = harness(false, false);
  const ids = await h.db.addMedicine({ medicine: { name: 'Midnight', dosageForm: 'Capsule', stockRemaining: 10 },
    schedule: { pattern: { kind: 'daily', startDate: '2026-09-29' }, timeLocalMinute: 1, doseAmount: 1, reminderEnabled: true } });
  const med = await h.db.fetchMedicineDetails(ids.medicineId);
  assert.equal(med.schedules[0].createdAtMs, Date.now());
  assert.equal(med.schedules[0].pattern.startDate, '2026-09-29'); // Preserve native daily reminder support.
  assert.equal(med.schedules[0].reminderEnabled, true);
  assert.deepEqual(await h.db.fetchScheduledDoses('2026-09-29'), []);
  await assert.rejects(h.db.logDose({ scheduleId: ids.scheduleId, date: '2026-09-29', status: 'Taken', actualTakenAtMs: Date.now() }), /predates/);
  await assert.rejects(h.db.snoozeDose({ scheduleId: ids.scheduleId, date: '2026-09-29', untilMs: Date.now() + 600000 }), /predates/);
  advance('2026-09-30T00:00:00');
  const [upcoming] = await h.db.fetchScheduledDoses('2026-09-30');
  assert.equal(upcoming.scheduledAtMs, new Date('2026-09-30T00:01:00').getTime());
  assert.ok(upcoming.scheduledAtMs > Date.now());
  assert.deepEqual(await historyRows(h.db), []);
  advance('2026-09-30T20:00:00');
  const [overdue] = await h.db.fetchScheduledDoses('2026-09-30');
  assert.equal(overdue.status, null);
  assert.ok(overdue.scheduledAtMs < Date.now());
  await h.db.logDose({ scheduleId: ids.scheduleId, date: overdue.date, status: 'Taken', actualTakenAtMs: Date.now() });
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
  advance('2026-10-01T00:00:00');
  assert.deepEqual((await historyRows(h.db)).map(r => [r.date, r.status]), [['2026-09-30', 'Taken']]);
});

test('creation cutoff treats each dose independently and includes the current selected minute', async t => {
  clockAt(t, '2026-09-29T12:00:45');
  const h = harness(false, false);
  const schedule = { pattern: { kind: 'daily', startDate: '2026-09-29' }, timeLocalMinute: 540, doseAmount: 1 };
  await h.db.addMedicine({ medicine: { name: 'Multiple', dosageForm: 'Tablet' }, schedule,
    additionalSchedules: [720, 1080].map(timeLocalMinute => ({ ...schedule, timeLocalMinute })) });
  assert.deepEqual((await h.db.fetchScheduledDoses('2026-09-29')).map(d => d.schedule.timeLocalMinute), [720, 1080]);
  assert.equal((await h.db.fetchScheduledDoses('2026-09-30')).length, 3);
});

test('creation cutoff preserves weekday, interval and finite-course anchors', async t => {
  const advance = clockAt(t, '2026-09-29T20:21:00'); // Tuesday
  const h = harness(false, false);
  await h.add('weekdays', { startDate: '2026-09-29', weekdays: [2] }, 'Tuesday');
  await h.add('day_interval', { startDate: '2026-09-29', interval: 2 }, 'Alternate');
  await h.add('hour_interval', { startDate: '2026-09-29', interval: 8 }, 'Hourly');
  await h.add('daily', { startDate: '2026-09-29', endDate: '2026-09-29' }, 'Ended');
  assert.deepEqual(await h.db.fetchScheduledDoses('2026-09-29'), []);
  assert.deepEqual((await h.db.fetchScheduledDoses('2026-09-30')).map(d => d.medicine.name), ['Hourly', 'Hourly', 'Hourly']);
  assert.ok((await h.db.fetchScheduledDoses('2026-10-01')).some(d => d.medicine.name === 'Alternate'));
  assert.ok((await h.db.fetchScheduledDoses('2026-10-06')).some(d => d.medicine.name === 'Tuesday'));
  advance('2026-09-30T00:00:00');
  assert.deepEqual(await historyRows(h.db), []);
});

test('existing recorded doses remain visible while unrecorded pre-creation doses are excluded', async t => {
  clockAt(t, '2026-09-29T20:21:00');
  const h = harness(); const ids = await h.add();
  await h.db.logDose({ scheduleId: ids.scheduleId, date: '2026-09-29', status: 'Taken', actualTakenAtMs: Date.now() });
  h.sql.prepare('UPDATE schedules SET created_at_ms = ? WHERE id = ?').run(Date.now(), ids.scheduleId);
  assert.equal((await h.db.fetchScheduledDoses('2026-09-29'))[0].status, 'Taken');
  await h.db.undoDoseLog({ scheduleId: ids.scheduleId, date: '2026-09-29', scheduledAtMs: new Date('2026-09-29T08:00:00').getTime() });
  assert.deepEqual(await h.db.fetchScheduledDoses('2026-09-29'), []);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
});

test('adding a dose time during editing uses that new schedule creation time', async t => {
  clockAt(t, '2026-09-29T20:21:00');
  const h = harness(); const ids = await h.add();
  const med = await h.db.fetchMedicineDetails(ids.medicineId);
  const input = fullEdit(med);
  input.additionalSchedules = [1, 1320].map(timeLocalMinute => ({ ...input.schedule, id: undefined, timeLocalMinute }));
  await h.db.editMedicine(ids.medicineId, input);
  assert.deepEqual((await h.db.fetchScheduledDoses('2026-09-29')).map(d => d.schedule.timeLocalMinute), [480, 1320]);
  assert.equal((await h.db.fetchScheduledDoses('2026-09-30')).length, 3);
});


test('a pre-existing snooze survives the creation cutoff and becomes missed only after expiry', async t => {
  const advance = clockAt(t, '2026-09-29T20:21:00');
  const h = harness(); const ids = await h.add();
  const [dose] = await h.db.fetchScheduledDoses('2026-09-29');
  await h.db.snoozeDose({ scheduleId: ids.scheduleId, date: dose.date, scheduledAtMs: dose.scheduledAtMs,
    untilMs: new Date('2026-09-30T00:10:00').getTime() });
  h.sql.prepare('UPDATE schedules SET created_at_ms = ? WHERE id = ?').run(Date.now(), ids.scheduleId);
  assert.equal((await h.db.fetchScheduledDoses('2026-09-29')).length, 1);
  advance('2026-09-30T00:01:00');
  assert.deepEqual(await historyRows(h.db), []);
  assert.equal((await h.db.fetchScheduledDoses('2026-09-30')).filter(d => d.date === '2026-09-29').length, 1);
  advance('2026-09-30T00:11:00');
  assert.deepEqual((await historyRows(h.db)).map(r => [r.date, r.status]), [['2026-09-29', 'Skipped / missed']]);
  assert.deepEqual(await h.db.fetchPendingSnoozes(), []);
});

// Today corrections use the same SQLite rules as reminder actions, with exact undo.
async function correctionInput(h, ids, date = '2020-01-01') {
  const dose = (await h.db.fetchScheduledDoses(date)).find(dose => dose.schedule.id === ids.scheduleId);
  return { medicineId: ids.medicineId, scheduleId: ids.scheduleId, date,
    scheduledAtMs: dose.scheduledAtMs, status: dose.status,
    actualTakenAtMs: dose.actualTakenAtMs, snoozedUntilMs: dose.snoozedUntilMs };
}
for (const platform of ['web', 'android']) {
  test(`Today Take/Skip/Reset and exact Undo persist atomically on ${platform}`, async () => {
    const h = harness(false, true, platform); const ids = await h.add();
    for (const action of ['Taken', 'Skipped']) {
      const receipt = await h.db.changeDoseWithUndo(await correctionInput(h, ids), action);
      assert.equal((await correctionInput(h, ids)).status, action);
      assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, action === 'Taken' ? 9 : 10);
      assert.equal(h.sql.prepare('SELECT COUNT(*) AS n FROM history').get().n, 1);
      await h.db.restoreDoseChange(receipt);
      assert.equal((await correctionInput(h, ids)).status, null);
      assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
      await assert.rejects(h.db.restoreDoseChange(receipt), /changed again/);
    }
    await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken');
    const before = h.sql.prepare('SELECT * FROM history').get();
    const skipped = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Skipped');
    assert.equal((await correctionInput(h, ids)).actualTakenAtMs, null);
    assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
    await h.db.restoreDoseChange(skipped);
    assert.deepEqual(h.sql.prepare('SELECT * FROM history').get(), before);
    const reset = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Reset');
    assert.equal((await correctionInput(h, ids)).status, null);
    await h.db.restoreDoseChange(reset);
    assert.deepEqual(h.sql.prepare('SELECT * FROM history').get(), before);
  });
}
test('Skipped correction applies a new taken time and preserves record identity', async () => {
  const h = harness(); const ids = await h.add();
  await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Skipped');
  const original = h.sql.prepare('SELECT * FROM history').get(); const start = Date.now();
  const receipt = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken');
  const saved = h.sql.prepare('SELECT * FROM history').get();
  assert.equal(saved.id, original.id);
  assert.ok(saved.actual_taken_at_ms >= start && saved.actual_taken_at_ms <= Date.now());
  // Reading again (without keeping the receipt) leaves the committed status intact.
  assert.equal((await correctionInput(h, ids)).status, 'Taken');
  await h.db.restoreDoseChange(receipt);
  assert.deepEqual(h.sql.prepare('SELECT * FROM history').get(), original);
});
test('Undo restores a prior snooze exactly and can undo a repeated snooze', async () => {
  const h = harness(); const ids = await h.add(); const until = Date.now() + 600000;
  const first = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Snooze', until);
  const second = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Snooze', until + 600000);
  await h.db.restoreDoseChange(second);
  assert.equal((await correctionInput(h, ids)).snoozedUntilMs, until);
  const taken = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken');
  assert.equal((await h.db.fetchPendingSnoozes()).length, 0);
  await h.db.restoreDoseChange(taken);
  assert.equal((await correctionInput(h, ids)).snoozedUntilMs, until);
  await h.db.restoreDoseChange(first);
  assert.equal((await correctionInput(h, ids)).snoozedUntilMs, null);
});
test('stale menu actions and stale Undo cannot overwrite a newer dose or timestamp', async () => {
  const h = harness(); const ids = await h.add(); const pending = await correctionInput(h, ids);
  const first = await h.db.changeDoseWithUndo(pending, 'Skipped');
  await assert.rejects(h.db.changeDoseWithUndo(pending, 'Taken'), /dose changed/);
  await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken');
  await assert.rejects(h.db.restoreDoseChange(first), /changed again/);
  assert.equal((await correctionInput(h, ids)).status, 'Taken');
  assert.equal(h.sql.prepare('SELECT COUNT(*) AS n FROM history').get().n, 1);
});
test('failed correction rolls back the original log and stock; Undo preserves other doses', async () => {
  const h = harness(); const ids = await h.add();
  await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Skipped');
  const before = h.sql.prepare('SELECT * FROM history').get();
  h.sql.exec("CREATE TRIGGER fail_take BEFORE INSERT ON history WHEN NEW.status = 'Taken' BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
  await assert.rejects(h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken'), /test failure/);
  assert.deepEqual(h.sql.prepare('SELECT * FROM history').get(), before);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 10);
  h.sql.exec('DROP TRIGGER fail_take');
  const receipt = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken');
  await h.db.changeDoseWithUndo(await correctionInput(h, ids, '2020-01-02'), 'Taken');
  await h.db.restoreDoseChange(receipt);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
  assert.equal((await correctionInput(h, ids, '2020-01-02')).status, 'Taken');
});
test('legacy Taken stock warning and historical dose snapshots survive correction and Undo', async () => {
  const h = harness(); const ids = await h.add();
  await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken');
  h.sql.prepare('UPDATE history SET stock_deducted_q = NULL, dose_snapshot = ?').run(JSON.stringify({ amount: 2000000, unit: 'tablet', form: 'Tablet', time: 480 }));
  const original = h.sql.prepare('SELECT * FROM history').get();
  const skipped = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Skipped');
  assert.equal(skipped.manualStockCorrectionNeeded, true);
  assert.equal(h.sql.prepare('SELECT dose_snapshot FROM history').get().dose_snapshot, original.dose_snapshot);
  const taken = await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken');
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 7);
  await h.db.restoreDoseChange(taken);
  await h.db.restoreDoseChange(skipped);
  assert.deepEqual(h.sql.prepare('SELECT * FROM history').get(), original);
  assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
});
test('final corrected status survives closing and reopening the SQLite database', async () => {
  const path = require('node:path');
  const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'dose-correction-'));
  const filename = path.join(directory, 'test.db');
  let h = harness(false, true, 'web', filename);
  try {
    const ids = await h.add();
    await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Skipped');
    await h.db.changeDoseWithUndo(await correctionInput(h, ids), 'Taken');
    const saved = h.sql.prepare('SELECT * FROM history').get();
    h.sql.close();
    h = harness(false, true, 'web', filename);
    assert.equal((await correctionInput(h, ids)).status, 'Taken');
    assert.deepEqual(h.sql.prepare('SELECT * FROM history').get(), saved);
    assert.equal((await h.db.fetchMedicineDetails(ids.medicineId)).stockRemaining, 9);
    assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 8);
  } finally { h.sql.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
