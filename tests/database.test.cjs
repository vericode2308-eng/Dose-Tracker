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
function harness(legacy = false) {
  const sql = new DatabaseSync(':memory:');
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
  const db = compile('src/database.js', { 'expo-crypto': { randomUUID }, 'expo-sqlite': { openDatabaseAsync: async () => adapter }, 'react-native': { Platform: { OS: 'web' } }, './features/doses/occurrences': recurrence });
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
  assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 7);
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
  h.sql.prepare(`INSERT INTO schedules(id,medicine_id,time_local_minute,recurring_pattern,dose_amount_q,created_at_ms) VALUES(?,?,?,?,?,?)`).run('second', ids.medicineId, 1080, '{"kind":"daily","startDate":"2020-01-01"}', 3000000, 1);
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
