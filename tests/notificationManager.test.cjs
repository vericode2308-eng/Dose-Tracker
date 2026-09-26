const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Exercise the actual manager with an OS boundary double; no device data is touched.
const compiled = ts.transpileModule(fs.readFileSync('src/notificationManager.js', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const medicine = () => ({ id: 'medicine-1', name: 'Test medicine', dosageForm: 'Tablet', doseUnit: 'tablet', status: 'Active',
  schedules: [{ id: 'schedule-1', timeLocalMinute: 480, doseAmount: 1, pattern: { kind: 'daily', startDate: '2020-01-01' } }] });

function harness(options = {}) {
  const stored = new Map();
  let medicines = [medicine()];
  const prefs = { remindersEnabled: true, soundAndVibration: true, notificationPrivacy: 'show' };
  const calls = [];
  let listener;
  const api = {
    AndroidImportance: { HIGH: 4, NONE: 0 }, AndroidNotificationVisibility: { PRIVATE: 0 },
    IosAuthorizationStatus: { PROVISIONAL: 3 }, DEFAULT_ACTION_IDENTIFIER: 'default',
    setNotificationHandler: handler => { api.handler = handler; },
    setNotificationChannelAsync: async () => { calls.push('channel'); },
    getNotificationChannelAsync: async () => ({ importance: options.channelDisabled ? 0 : 4 }),
    getPermissionsAsync: async () => ({ granted: options.granted !== false, canAskAgain: true }),
    requestPermissionsAsync: async () => { calls.push('permission'); return { granted: options.grantRequest === true }; },
    scheduleNotificationAsync: async request => { if (options.failSchedule) throw Error('OS scheduling failed'); stored.set(request.identifier, request); return request.identifier; },
    getAllScheduledNotificationsAsync: async () => [...stored.values()],
    cancelScheduledNotificationAsync: async id => { calls.push('cancel'); stored.delete(id); },
    cancelAllScheduledNotificationsAsync: async () => { calls.push('cancelAll'); stored.clear(); },
    dismissAllNotificationsAsync: async () => { calls.push('dismiss'); },
    addNotificationResponseReceivedListener: callback => { listener = callback; return { remove: () => { listener = undefined; } }; },
    getLastNotificationResponseAsync: async () => options.lastResponse || null,
    clearLastNotificationResponseAsync: async () => { calls.push('clearResponse'); },
  };
  const db = {
    fetchAllMedicines: async () => medicines,
    fetchMedicineDetails: async id => medicines.find(m => m.id === id) || null,
    updateMedicine: async (id, patch) => { calls.push('update'); Object.assign(medicines.find(m => m.id === id), patch); },
    deleteMedicine: async id => { calls.push('delete'); medicines = medicines.filter(m => m.id !== id); },
    clearDatabase: async () => { calls.push('clearDB'); medicines = []; },
  };
  const dependencies = {
    'react-native': { Platform: { OS: options.platform || 'android' } },
    'expo-modules-core': { requireOptionalNativeModule: () => ({ canScheduleExactAlarms: async () => options.exact !== false, openExactAlarmSettings: async () => {} }) },
    'expo-notifications': api, './database': db, './features/settings/storage': { readSettings: async () => prefs },
  };
  const manager = {};
  new Function('require', 'exports', compiled)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, manager);
  return { manager, stored, prefs, calls, api, emit: response => listener?.(response), get medicine() { return medicines[0]; } };
}
function response(date = new Date(2026, 8, 26, 8).getTime()) {
  return { actionIdentifier: 'default', notification: { date, request: { identifier: 'dosetracker:dose:schedule-1:daily',
    content: { data: { kind: 'medication-dose', version: 1, medicineId: 'medicine-1', scheduleId: 'schedule-1' } } } } };
}

test('time parsing handles noon, midnight and rejects ambiguous/invalid times', () => {
  const { manager } = harness();
  assert.equal(manager.parseReminderTime('Daily at 8:00 AM'), 480);
  assert.equal(manager.parseReminderTime('12:00 AM'), 0);
  assert.equal(manager.parseReminderTime('12:00 PM'), 720);
  assert.equal(manager.parseReminderTime(1439), 1439);
  for (const invalid of ['8:00', '0:00 AM', '13:00 PM', '8:60 AM', -1, 1440, null]) assert.throws(() => manager.parseReminderTime(invalid));
});
test('native daily and weekly triggers preserve wall time and Expo Sunday numbering', () => {
  const { manager, medicine } = harness();
  const schedule = medicine.schedules[0];
  assert.deepEqual(manager.recurringTriggers(schedule), [{ type: 'daily', hour: 8, minute: 0, channelId: 'medication-reminders' }]);
  schedule.pattern = { ...schedule.pattern, kind: 'weekdays', weekdays: [0, 1, 6, 1] };
  assert.deepEqual(manager.recurringTriggers(schedule).map(t => t.weekday), [1, 2, 7]);
});
test('unsupported course bounds and intervals fail explicitly; PRN has no alarms', () => {
  const { manager, medicine } = harness();
  const schedule = medicine.schedules[0];
  for (const patch of [{ endDate: '2030-01-01' }, { startDate: '2099-01-01' }, { kind: 'hour_interval', interval: 8 }, { kind: 'day_interval', interval: 2 }]) {
    assert.throws(() => manager.recurringTriggers({ ...schedule, pattern: { ...schedule.pattern, ...patch } }), /saved without reminders/);
  }
  assert.deepEqual(manager.recurringTriggers({ ...schedule, pattern: { ...schedule.pattern, kind: 'prn' } }), []);
});
test('permission channel is created first; rejected notifications schedule nothing', async () => {
  const h = harness({ granted: false });
  const result = await h.manager.scheduleMedicineReminders(h.medicine);
  assert.equal(result.allowed, false);
  assert.equal(h.stored.size, 0);
  assert.deepEqual(h.calls.slice(0, 2), ['channel', 'permission']);
});
test('disabled channel and absent exact access are reported honestly', async () => {
  assert.equal((await harness({ channelDisabled: true }).manager.getReminderStatus()).allowed, false);
  const h = harness({ exact: false });
  const result = await h.manager.scheduleMedicineReminders(h.medicine);
  assert.equal(result.exact, false);
  assert.match(result.message, /may be delayed/);
});
test('retries keep one alarm; disabling preferences removes it but preserves unrelated requests', async () => {
  const h = harness();
  await h.manager.scheduleMedicineReminders(h.medicine);
  await h.manager.reconcileReminders();
  assert.equal(h.stored.size, 1);
  h.stored.set('unrelated', { identifier: 'unrelated', content: {} });
  h.prefs.remindersEnabled = false;
  await h.manager.reconcileReminders();
  assert.deepEqual([...h.stored.keys()], ['unrelated']);
  assert.equal((await h.api.handler.handleNotification()).shouldShowBanner, false);
});
test('privacy hides medicine text; pause cancels before DB change, resume re-arms, delete removes', async () => {
  const h = harness();
  h.prefs.notificationPrivacy = 'hide';
  await h.manager.scheduleMedicineReminders(h.medicine);
  assert.doesNotMatch([...h.stored.values()][0].content.body, /Test medicine/);
  await h.manager.updateMedicineWithReminders('medicine-1', { status: 'Paused' });
  assert.equal(h.stored.size, 0);
  assert.ok(h.calls.indexOf('cancel') < h.calls.indexOf('update'));
  await h.manager.updateMedicineWithReminders('medicine-1', { status: 'Active' });
  assert.equal(h.stored.size, 1);
  await h.manager.deleteMedicineWithReminders('medicine-1');
  assert.equal(h.stored.size, 0);
});
test('failed OS scheduling is reported; successful DB edits are not reported as failed saves', async () => {
  const h = harness({ failSchedule: true });
  const result = await h.manager.updateMedicineWithReminders('medicine-1', { name: 'Updated' });
  assert.equal(h.medicine.name, 'Updated');
  assert.equal(result.scheduled, 0);
  assert.match(result.issues[0], /OS scheduling failed/);
});
test('erase cancels and dismisses first; queued reconciliation cannot resurrect alarms', async () => {
  const h = harness();
  await h.manager.scheduleMedicineReminders(h.medicine);
  await Promise.all([h.manager.eraseMedicineDataWithReminders(), h.manager.reconcileReminders()]);
  assert.equal(h.stored.size, 0);
  assert.ok(h.calls.indexOf('cancelAll') < h.calls.indexOf('clearDB'));
  assert.ok(h.calls.indexOf('dismiss') < h.calls.indexOf('clearDB'));
});
test('tap routes to persisted dose, rejects deleted/foreign data, maps delayed midnight to preceding dose', async () => {
  const h = harness();
  assert.deepEqual(await h.manager.doseRouteFromResponse(response()), { pathname: '/', params: { medicineId: 'medicine-1', scheduleId: 'schedule-1', doseDate: '2026-09-26' } });
  const delayed = await h.manager.doseRouteFromResponse(response(new Date(2026, 8, 27, 0, 5).getTime()));
  assert.equal(delayed.params.doseDate, '2026-09-26');
  const foreign = response(); foreign.notification.request.content.data.scheduleId = 'other';
  assert.equal(await h.manager.doseRouteFromResponse(foreign), null);
  await h.manager.deleteMedicineWithReminders('medicine-1');
  assert.equal(await h.manager.doseRouteFromResponse(response()), null);
});
test('cold and warm notification taps route once and unsubscribe cleanly', async () => {
  const h = harness({ lastResponse: response() });
  const routes = [];
  const dispose = await h.manager.subscribeToReminderTaps(route => routes.push(route));
  await new Promise(resolve => setImmediate(resolve));
  h.emit(response());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(routes.length, 1);
  h.emit(response(new Date(2026, 8, 27, 8).getTime()));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(routes.length, 2);
  dispose(); h.emit(response(new Date(2026, 8, 28, 8).getTime()));
  assert.equal(routes.length, 2);
});
test('web does not claim reminders or call native modules', async () => {
  const h = harness({ platform: 'web' });
  const result = await h.manager.scheduleMedicineReminders(h.medicine);
  assert.equal(result.allowed, false);
  assert.equal(h.calls.length, 0);
});
