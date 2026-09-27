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
  let medicines = options.profiles ? [{ ...medicine(), profileId: 'p1' }, { ...medicine(), id: 'medicine-2', profileId: 'p2', schedules: [{ ...medicine().schedules[0], id: 'schedule-2' }] }] : [medicine()];
  const profiles = [{ id: 'p1', status: 'Active' }, { id: 'p2', status: 'Active' }];
  let selected = 'p2';
  const prefs = { remindersEnabled: true, reminderSound: 'default', vibrationEnabled: true, notificationPrivacy: 'show', snoozeMinutes: 10 };
  const calls = [];
  let snoozes = [];
  const history = [];
  let listener;
  const api = {
    AndroidImportance: { HIGH: 4, NONE: 0 }, AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 2, SECRET: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 }, DEFAULT_ACTION_IDENTIFIER: 'default',
    setNotificationHandler: handler => { api.handler = handler; },
    setNotificationCategoryAsync: async (id, actions, options) => { api.lastCategory = { id, actions, options }; },
    setNotificationChannelAsync: async (id, config) => { calls.push('channel'); api.lastChannel = { id, config }; },
    getNotificationChannelAsync: async () => ({ importance: options.channelDisabled ? 0 : 4,
      sound: options.systemSound === undefined ? 'default' : options.systemSound,
      enableVibrate: options.systemVibration === undefined ? true : options.systemVibration }),
    getPermissionsAsync: async () => ({ granted: options.granted !== false, canAskAgain: true }),
    requestPermissionsAsync: async () => { calls.push('permission'); return { granted: options.grantRequest === true }; },
    scheduleNotificationAsync: async request => { if (options.failSchedule) throw Error('OS scheduling failed'); stored.set(request.identifier, request); return request.identifier; },
    getAllScheduledNotificationsAsync: async () => [...stored.values()],
    cancelScheduledNotificationAsync: async id => { calls.push('cancel'); stored.delete(id); },
    cancelAllScheduledNotificationsAsync: async () => { calls.push('cancelAll'); stored.clear(); },
    dismissAllNotificationsAsync: async () => { calls.push('dismiss'); },
    getPresentedNotificationsAsync: async () => [],
    dismissNotificationAsync: async id => { calls.push('dismissNotification:' + id); },
    addNotificationResponseReceivedListener: callback => { listener = callback; return { remove: () => { listener = undefined; } }; },
    getLastNotificationResponseAsync: async () => options.lastResponse || null,
    clearLastNotificationResponseAsync: async () => { calls.push('clearResponse'); },
  };
  const db = {
    fetchPendingSnoozes: async () => snoozes.filter(z => medicines.some(m => m.id === z.medicineId && m.status === 'Active')),
    snoozeDose: async dose => { snoozes = snoozes.filter(z => z.scheduledAtMs !== dose.scheduledAtMs); snoozes.push(dose); },
    logDose: async dose => { history.push(dose); snoozes = snoozes.filter(z => z.scheduledAtMs !== dose.scheduledAtMs); },
    fetchScheduledDoses: async date => snoozes.filter(z => z.date === date).map(z => ({ ...z, schedule: { id: z.scheduleId } })),
    fetchProfiles: async () => profiles,
    selectProfile: async id => { selected = id; calls.push('select:' + id); },
    setProfileArchived: async (id, archived) => { calls.push('archive'); profiles.find(p => p.id === id).status = archived ? 'Archived' : 'Active'; },
    fetchAllMedicines: async ({ profileId, includeArchivedProfiles = false } = {}) => medicines.filter(m => (!profileId || m.profileId === profileId) && (!m.profileId || includeArchivedProfiles || profiles.find(p => p.id === m.profileId).status === 'Active')),
    fetchMedicineDetails: async id => medicines.find(m => m.id === id) || null,
    updateMedicine: async (id, patch) => { calls.push('update'); Object.assign(medicines.find(m => m.id === id), patch); },
    updateScheduleReminderEnabled: async (id, enabled) => { const schedule = medicines.flatMap(m => m.schedules).find(s => s.id === id); if (!schedule) throw Error('Schedule not found.'); schedule.reminderEnabled = enabled; },
    deleteMedicine: async id => { calls.push('delete'); medicines = medicines.filter(m => m.id !== id); },
    clearDatabase: async () => { calls.push('clearDB'); medicines = []; },
    recordReminderIssue: async () => {}, fetchRecentReminderIssues: async () => [],
  };
  const dependencies = {
    'react-native': { Platform: { OS: options.platform || 'android' }, Linking: { openSettings: async () => {} } },
    'expo-modules-core': { requireOptionalNativeModule: () => ({ canScheduleExactAlarms: async () => options.exact !== false, openExactAlarmSettings: async () => {} }) },
    'expo-notifications': api, './database': db, './features/settings/storage': { readSettings: async () => prefs },
  };
  const manager = {};
  new Function('require', 'exports', compiled)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, manager);
  return { manager, stored, prefs, calls, api, history, emit: response => listener?.(response), get selected() { return selected; }, get medicine() { return medicines[0]; } };
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
test('tracking-only medicine asks for no permission and creates no alarm', async () => {
  const h = harness({ granted: false });
  h.medicine.schedules[0].reminderEnabled = false;
  const result = await h.manager.scheduleMedicineReminders(h.medicine);
  assert.equal(result.scheduled, 0);
  assert.deepEqual(result.issues, []);
  assert.equal(h.stored.size, 0);
  assert.equal(h.calls.includes('permission'), false);
});
test('turning a schedule into tracking-only removes its old alarm on reconciliation', async () => {
  const h = harness();
  h.medicine.schedules[0].reminderEnabled = true;
  await h.manager.scheduleMedicineReminders(h.medicine);
  assert.equal(h.stored.size, 1);
  h.medicine.schedules[0].reminderEnabled = false;
  const result = await h.manager.reconcileReminders();
  assert.equal(result.scheduled, 0);
  assert.equal(h.stored.size, 0);
});
test('medicine detail reminder switch arms and removes only the chosen schedule', async () => {
  const h = harness();
  h.medicine.schedules[0].reminderEnabled = false;
  assert.equal((await h.manager.setScheduleReminderEnabled('schedule-1', true)).scheduled, 1);
  assert.equal(h.stored.size, 1);
  assert.equal((await h.manager.setScheduleReminderEnabled('schedule-1', false)).scheduled, 0);
  assert.equal(h.stored.size, 0);
});
test('disabled channel and absent exact access are reported honestly', async () => {
  assert.equal((await harness({ channelDisabled: true }).manager.getReminderStatus()).allowed, false);
  const h = harness({ exact: false });
  const result = await h.manager.scheduleMedicineReminders(h.medicine);
  assert.equal(result.exact, false);
  assert.match(result.message, /may be delayed/);
});
test('Android system mute or vibration override prevents moving to a fresh channel', async () => {
  assert.equal(await harness({ channelDisabled: true }).manager.canChangeReminderChannel(), false);
  assert.equal(await harness({ systemSound: null }).manager.canChangeReminderChannel(), false);
  assert.equal(await harness({ systemVibration: false }).manager.canChangeReminderChannel(), false);
  assert.equal(await harness().manager.canChangeReminderChannel(), true);
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
test('Android channel and payload follow each privacy mode without leaking dose details', async () => {
  const h = harness();
  for (const [privacy, visibility] of [['show', 1], ['hide', 2], ['none', 3]]) {
    h.prefs.notificationPrivacy = privacy;
    await h.manager.reconcileReminders();
    const request = [...h.stored.values()][0];
    assert.equal(h.api.lastChannel.config.lockscreenVisibility, visibility);
    assert.equal(request.trigger.channelId, h.api.lastChannel.id);
    assert.equal(request.content.body.includes('Test medicine'), privacy === 'show');
    if (privacy === 'none') assert.equal(request.content.title, 'DoseTracker');
  }
});
test('sound and vibration create distinct native channels; test reminder mirrors selected content', async () => {
  const h = harness();
  h.prefs.reminderSound = 'gentle';
  h.prefs.vibrationEnabled = false;
  h.prefs.notificationPrivacy = 'none';
  await h.manager.reconcileReminders();
  assert.equal(h.api.lastChannel.config.sound, 'gentle.wav');
  assert.equal(h.api.lastChannel.config.enableVibrate, false);
  const channelId = h.api.lastChannel.id;
  assert.match(await h.manager.scheduleTestReminder(), /10 seconds/);
  const testRequest = [...h.stored.values()].find(item => item.content.data?.kind === 'reminder-test');
  assert.equal(testRequest.trigger.channelId, channelId);
  assert.equal(testRequest.content.title, 'DoseTracker');
  assert.doesNotMatch(testRequest.content.body, /medicine|tablet/i);
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

const doseReference = () => ({ medicineId: 'medicine-1', scheduleId: 'schedule-1', date: '2026-09-26', scheduledAtMs: new Date(2026, 8, 26, 8).getTime() });
test('native snooze uses a stable one-shot alarm and retains the original occurrence on tap', async () => {
  const h = harness(); const dose = doseReference();
  await h.manager.snoozeMedicationDose(dose, 10);
  await h.manager.snoozeMedicationDose(dose, 15);
  assert.equal(h.stored.size, 1);
  const request = [...h.stored.values()][0];
  assert.equal(request.trigger.type, 'date');
  assert.equal(request.content.data.scheduledAtMs, dose.scheduledAtMs);
  assert.equal(h.history.length, 0);
  const route = await h.manager.doseRouteFromResponse({ actionIdentifier: 'default', notification: { date: Date.now(), request } });
  assert.equal(route.params.scheduledAtMs, String(dose.scheduledAtMs));
  await h.manager.reconcileReminders();
  assert.equal(h.stored.size, 2); // recurring + snooze are both preserved
  await h.manager.recordMedicationDose(dose, 'Skipped');
  assert.equal(h.stored.size, 1); // completing this dose preserves tomorrow's recurrence
  assert.equal(h.history[0].status, 'Skipped');
});
test('permission denial prevents snooze; browser stores state without claiming an alarm', async () => {
  const denied = harness({ granted: false });
  await assert.rejects(denied.manager.snoozeMedicationDose(doseReference(), 10), /Enable reminder/);
  const web = harness({ platform: 'web' });
  const result = await web.manager.snoozeMedicationDose(doseReference(), 10);
  assert.match(result.message, /cannot deliver/);
  assert.equal(web.stored.size, 0);
});
test('a snooze OS failure remains explicit and recoverable on reconciliation', async () => {
  const options = { failSchedule: true }; const h = harness(options);
  const result = await h.manager.snoozeMedicationDose(doseReference(), 10);
  assert.match(result.message, /scheduling failed/);
  options.failSchedule = false;
  await h.manager.reconcileReminders();
  assert.equal(h.stored.size, 2);
});


test('profile archive cancels only its alarms, restore re-arms, and last active profile is protected', async () => {
  const h = harness({ profiles: true });
  await h.manager.reconcileReminders(); assert.equal(h.stored.size, 2);
  await h.manager.setProfileArchivedWithReminders('p1', true);
  assert.equal(h.stored.size, 1);
  assert.equal([...h.stored.values()][0].content.data.medicineId, 'medicine-2');
  assert.ok(h.calls.indexOf('cancel') < h.calls.indexOf('archive'));
  assert.equal(await h.manager.doseRouteFromResponse(response()), null);
  await assert.rejects(h.manager.setProfileArchivedWithReminders('p2', true), /at least one/);
  await h.manager.setProfileArchivedWithReminders('p1', false);
  assert.equal(h.stored.size, 2);
});
test('notification tap selects dose owner before navigation without disabling other profiles alarms', async () => {
  const h = harness({ profiles: true });
  await h.manager.reconcileReminders();
  let resolve;
  const routed = new Promise(r => { resolve = r; });
  const dispose = await h.manager.subscribeToReminderTaps(route => { assert.equal(h.selected, 'p1'); resolve(route); });
  h.emit(response());
  const route = await routed;
  assert.equal(route.params.profileId, 'p1');
  assert.equal(h.stored.size, 2);
  dispose();
});

test('registers interactive category and attaches categoryIdentifier to scheduled doses', async () => {
  const h = harness();
  await h.manager.scheduleMedicineReminders(h.medicine);
  assert.equal(h.api.lastCategory?.id, 'medication_reminders_actions');
  assert.deepEqual(h.api.lastCategory?.actions.map(a => a.identifier), ['take-now', 'snooze-15', 'skip']);
  const scheduled = [...h.stored.values()][0];
  assert.equal(scheduled.content.categoryIdentifier, 'medication_reminders_actions');
});

test('interactive action Take Now logs dose as Taken and dismisses notification', async () => {
  const h = harness();
  await h.manager.scheduleMedicineReminders(h.medicine);
  const dispose = await h.manager.subscribeToReminderTaps(() => {});
  const actionResp = { actionIdentifier: 'take-now', notification: { date: new Date(2026, 8, 26, 8).getTime(), request: { identifier: 'dosetracker:dose:schedule-1:daily', content: { data: { kind: 'medication-dose', version: 1, medicineId: 'medicine-1', scheduleId: 'schedule-1' } } } } };
  h.emit(actionResp);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.history.length, 1);
  assert.equal(h.history[0].status, 'Taken');
  assert.ok(h.calls.includes('dismissNotification:dosetracker:dose:schedule-1:daily'));
  dispose();
});

test('interactive action Snooze 15m defers dose and schedules one-shot alarm', async () => {
  const h = harness();
  await h.manager.scheduleMedicineReminders(h.medicine);
  const dispose = await h.manager.subscribeToReminderTaps(() => {});
  const actionResp = { actionIdentifier: 'snooze-15', notification: { date: new Date(2026, 8, 26, 8).getTime(), request: { identifier: 'dosetracker:dose:schedule-1:daily', content: { data: { kind: 'medication-dose', version: 1, medicineId: 'medicine-1', scheduleId: 'schedule-1' } } } } };
  h.emit(actionResp);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.stored.size, 2); // recurring + snooze
  const snoozed = [...h.stored.values()].find(item => item.identifier.includes('snooze:'));
  assert.ok(snoozed);
  assert.equal(snoozed.trigger.type, 'date');
  assert.ok(h.calls.includes('dismissNotification:dosetracker:dose:schedule-1:daily'));
  dispose();
});

test('interactive action Skip logs dose as Skipped without deducting stock', async () => {
  const h = harness();
  await h.manager.scheduleMedicineReminders(h.medicine);
  const dispose = await h.manager.subscribeToReminderTaps(() => {});
  const actionResp = { actionIdentifier: 'skip', notification: { date: new Date(2026, 8, 26, 8).getTime(), request: { identifier: 'dosetracker:dose:schedule-1:daily', content: { data: { kind: 'medication-dose', version: 1, medicineId: 'medicine-1', scheduleId: 'schedule-1' } } } } };
  h.emit(actionResp);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.history.length, 1);
  assert.equal(h.history[0].status, 'Skipped');
  assert.ok(h.calls.includes('dismissNotification:dosetracker:dose:schedule-1:daily'));
  dispose();
});
