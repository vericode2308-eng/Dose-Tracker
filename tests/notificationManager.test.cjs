const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Exercise the actual manager with an OS boundary double; no device data is touched.
const compiled = ts.transpileModule(fs.readFileSync('src/notificationManager.js', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiledBackgroundActions = ts.transpileModule(fs.readFileSync('src/features/notifications/backgroundActions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const medicine = () => ({ id: 'medicine-1', name: 'Test medicine', dosageForm: 'Tablet', doseUnit: 'tablet', status: 'Active',
  schedules: [{ id: 'schedule-1', timeLocalMinute: 480, doseAmount: 1, pattern: { kind: 'daily', startDate: '2020-01-01' } }] });

function harness(options = {}) {
  const stored = new Map();
  const presented = new Map();
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
    deleteNotificationCategoryAsync: async id => { if (options.failCategory) throw Error('Category unavailable'); api.lastCategory = { id, actions: [] }; return true; },
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
    getPresentedNotificationsAsync: async () => [...presented.values()],
    dismissNotificationAsync: async id => { if (options.failDismiss) throw Error('OS dismissal failed'); calls.push('dismissNotification:' + id); presented.delete(id); },
    addNotificationResponseReceivedListener: callback => { listener = callback; return { remove: () => { listener = undefined; } }; },
    getLastNotificationResponseAsync: async () => options.lastResponse || null,
    clearLastNotificationResponseAsync: async () => { calls.push('clearResponse'); },
  };
  const db = {
    changeDoseWithUndo: async (dose, action, untilMs) => {
      if (options.failLog) throw Error('Database write failed');
      calls.push('change:' + action);
      const receipt = { dose, snoozes: [...snoozes], history: [...history], manualStockCorrectionNeeded: false };
      snoozes = snoozes.filter(z => z.scheduledAtMs !== dose.scheduledAtMs);
      if (action === 'Snooze') snoozes.push({ ...dose, untilMs });
      else if (action !== 'Reset') history.push({ ...dose, status: action });
      return receipt;
    },
    restoreDoseChange: async receipt => {
      calls.push('restore'); snoozes = [...receipt.snoozes]; history.splice(0, history.length, ...receipt.history);
    },
    fetchPendingSnoozes: async () => snoozes.filter(z => medicines.some(m => m.id === z.medicineId && m.status === 'Active')),
    snoozeDose: async dose => { calls.push('snooze'); snoozes = snoozes.filter(z => z.scheduledAtMs !== dose.scheduledAtMs); snoozes.push(dose); return options.savedSnoozeUntilMs ?? dose.untilMs; },
    logDose: async dose => { if (options.failLog) throw Error('Database write failed'); history.push(dose); snoozes = snoozes.filter(z => z.scheduledAtMs !== dose.scheduledAtMs); },
    fetchScheduledDoses: async date => snoozes.filter(z => z.date === date).map(z => ({ ...z, schedule: { id: z.scheduleId } })),
    fetchProfiles: async () => profiles,
    selectProfile: async id => { selected = id; calls.push('select:' + id); },
    setProfileArchived: async (id, archived) => { calls.push('archive'); profiles.find(p => p.id === id).status = archived ? 'Archived' : 'Active'; },
    fetchAllMedicines: async ({ profileId, includeArchivedProfiles = false } = {}) => medicines.filter(m => (!profileId || m.profileId === profileId) && (!m.profileId || includeArchivedProfiles || profiles.find(p => p.id === m.profileId).status === 'Active')),
    fetchMedicineDetails: async id => medicines.find(m => m.id === id) || null,
    editMedicine: async (id, input) => { calls.push('edit'); if (options.failEdit) throw Error('Edit failed'); const m = medicines.find(m => m.id === id); Object.assign(m, input.medicine); Object.assign(m.schedules.find(s => s.id === input.scheduleId), input.schedule); for (const [index, extra] of (input.additionalSchedules || []).entries()) { if (extra.id) Object.assign(m.schedules.find(s => s.id === extra.id), extra); else m.schedules.push({ ...extra, id: `added-${index}` }); } },
    updateMedicine: async (id, patch) => { calls.push('update'); Object.assign(medicines.find(m => m.id === id), patch); },
    updateScheduleReminderEnabled: async (id, enabled) => { const schedule = medicines.flatMap(m => m.schedules).find(s => s.id === id); if (!schedule) throw Error('Schedule not found.'); schedule.reminderEnabled = enabled; },
    deleteMedicine: async id => { calls.push('delete'); medicines = medicines.filter(m => m.id !== id); },
    clearDatabase: async () => { calls.push('clearDB'); medicines = []; },
    recordReminderIssue: async () => {}, fetchRecentReminderIssues: async () => [],
  };
  const errorTypes = {};
  new Function('exports', ts.transpileModule(fs.readFileSync('src/features/security/errors.js', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(errorTypes);
  const dependencies = {
    './features/security/errors': errorTypes,
    './features/security/SecurityManager': {
      isAuthEnabled: async () => { if (options.failLockRead) throw Error('SecureStore unavailable'); return !!options.lockEnabled; },
      setAuthEnabled: async value => { if (options.failLockWrite) throw Error('SecureStore unavailable'); options.lockEnabled = value; },
    },
    'react-native': { Platform: { OS: options.platform || 'android' }, Linking: { openSettings: async () => {} } },
    'expo-modules-core': { requireOptionalNativeModule: () => ({ canScheduleExactAlarms: async () => options.exact !== false, openExactAlarmSettings: async () => {},
      ...(options.oldNativeBuild ? {} : { supportsRinging: () => true }) }) },
    'expo-notifications': api, './database': db, './features/settings/storage': { readSettings: async () => prefs },
  };
  const manager = {};
  new Function('require', 'exports', compiled)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, manager);
  let backgroundTask;
  const taskDependencies = {
    'react-native': dependencies['react-native'],
    'expo-notifications': { registerTaskAsync: async () => {} },
    'expo-task-manager': { isTaskDefined: () => false, defineTask: (_name, callback) => { backgroundTask = callback; } },
    '@/notificationManager': manager,
    '@/database': { recordReminderIssue: async code => { calls.push('issue:' + code); } },
  };
  new Function('require', 'exports', compiledBackgroundActions)(name => {
    assert.ok(name in taskDependencies, `Unexpected task dependency: ${name}`);
    return taskDependencies[name];
  }, {});
  return { manager, stored, presented, prefs, calls, api, history, runTask: data => backgroundTask({ data }), emit: response => listener?.(response), get selected() { return selected; }, get medicine() { return medicines[0]; } };
}
function response(date = new Date(2026, 8, 26, 8).getTime()) {
  return { actionIdentifier: 'default', notification: { date, request: { identifier: 'dosetracker:dose:schedule-1:daily',
    content: { data: { kind: 'medication-dose', version: 1, medicineId: 'medicine-1', scheduleId: 'schedule-1' } } } } };
}
function nativeResponse(action, date) {
  const result = response(date);
  result.actionIdentifier = action;
  const content = result.notification.request.content;
  content.dataString = JSON.stringify(content.data);
  delete content.data;
  return result;
}

test('ringing is opt-in, covers recurring, snoozed and test reminders, and preserves channels', async () => {
  const h = harness();
  await h.manager.reconcileReminders();
  const previousChannel = h.api.lastChannel.id;
  assert.equal([...h.stored.values()][0].content.data.alarmRinging, undefined);
  h.prefs.reminderRinging = true;
  await h.manager.reconcileReminders();
  assert.equal([...h.stored.values()][0].content.data.alarmRinging, true);
  assert.equal(h.api.lastChannel.id, previousChannel);
  await h.manager.snoozeMedicationDose(doseReference(), 10);
  await h.manager.scheduleTestReminder();
  assert.equal(h.stored.size, 3);
  for (const request of h.stored.values()) assert.equal(request.content.data.alarmRinging, true);
  assert.equal(h.history.length, 0);
});

test('silent sound and iOS never request Android ringing', async () => {
  for (const options of [{}, { platform: 'ios' }]) {
    const h = harness(options);
    h.prefs.reminderRinging = true;
    if (!options.platform) h.prefs.reminderSound = 'silent';
    await h.manager.reconcileReminders();
    assert.equal([...h.stored.values()][0].content.data.alarmRinging, undefined);
  }
});

test('old native builds report missing ringing support and cannot falsely confirm a ringing test', async () => {
  const h = harness({ oldNativeBuild: true });
  h.prefs.reminderRinging = true;
  assert.equal(h.manager.isAlarmRingingAvailable(), false);
  assert.match((await h.manager.getReminderStatus()).message, /updated Android build/);
  await assert.rejects(h.manager.scheduleTestReminder(), /updated Android build/);
  assert.equal(h.stored.size, 0);
  assert.equal(harness().manager.isAlarmRingingAvailable(), true);
  assert.equal(harness({ platform: 'ios' }).manager.isAlarmRingingAvailable(), false);
});

test('ringing preserves privacy redaction and secure-lock action restrictions', async () => {
  const h = harness({ lockEnabled: true });
  h.prefs.reminderRinging = true;
  h.prefs.notificationPrivacy = 'none';
  await h.manager.reconcileReminders();
  const content = [...h.stored.values()][0].content;
  assert.equal(content.data.alarmRinging, true);
  assert.equal(content.categoryIdentifier, undefined);
  assert.equal(content.title, 'DoseTracker');
  assert.equal(content.body, 'Open the app for details.');
  await h.manager.handleReminderAction(nativeResponse('take-now'));
  assert.equal(h.history.length, 0);
});

for (const patch of [{ reminderRinging: false }, { remindersEnabled: false }, { reminderSound: 'silent' }]) {
  test(`disabling ringing dismisses active ringing medication and test alerts: ${JSON.stringify(patch)}`, async () => {
    const h = harness();
    h.prefs.reminderRinging = true;
    await h.manager.reconcileReminders();
    await h.manager.scheduleTestReminder();
    for (const request of h.stored.values()) {
      const identifier = request.identifier || 'test-id';
      h.presented.set(identifier, { request: { ...request, identifier } });
    }
    h.presented.set('unrelated', { request: { identifier: 'unrelated', content: {} } });
    Object.assign(h.prefs, patch);
    await h.manager.reconcileReminders();
    assert.deepEqual([...h.presented.keys()], ['unrelated']);
    assert.equal(h.history.length, 0);
  });
}

for (const action of ['take-now', 'skip', 'snooze-15']) {
  test(`app lock denies ${action} through both headless and UI entry points`, async () => {
    const h = harness({ profiles: true, lockEnabled: true });
    const raw = nativeResponse(action);
    await h.runTask(raw);
    await h.manager.handleReminderAction(raw);
    assert.equal(h.history.length, 0);
    assert.equal(h.stored.size, 0);
    assert.equal(h.selected, 'p2');
    assert.deepEqual(h.calls, []);
  });
  test(`unreadable secure preference denies ${action} and permits a later valid retry`, async () => {
    const options = { failLockRead: true };
    const h = harness(options);
    const raw = nativeResponse(action);
    await h.runTask(raw);
    assert.equal(h.history.length, 0);
    assert.equal(h.stored.size, 0);
    assert.ok(h.calls.includes('issue:action_failed'));
    options.failLockRead = false;
    await h.runTask(raw);
    assert.equal(h.history.length + h.stored.size, 1);
  });
}

test('lock-on is serialized before queued actions and refreshes categories, tray and scheduled requests', async () => {
  const h = harness();
  await h.manager.reconcileReminders();
  const request = structuredClone([...h.stored.values()][0]);
  h.presented.set(request.identifier, { request });
  const locking = h.manager.setAppLockWithReminders(true);
  const action = h.manager.handleReminderAction(nativeResponse('take-now'));
  await Promise.all([locking, action]);
  assert.equal(h.history.length, 0);
  assert.equal(h.presented.size, 0);
  assert.deepEqual(h.api.lastCategory.actions, []);
  assert.equal([...h.stored.values()][0].content.categoryIdentifier, undefined);
  await h.manager.setAppLockWithReminders(false);
  assert.equal(h.api.lastCategory.actions.length, 3);
  assert.equal([...h.stored.values()][0].content.categoryIdentifier, h.manager.MEDICATION_CATEGORY);
  await h.manager.handleReminderAction(nativeResponse('take-now'));
  assert.equal(h.history.length, 1);
});

test('OS category refresh failure never rolls back a successfully enabled lock', async () => {
  const options = { failCategory: true };
  const h = harness(options);
  const result = await h.manager.setAppLockWithReminders(true);
  assert.equal(options.lockEnabled, true);
  assert.match(result.message, /App lock was saved/);
  await h.runTask(nativeResponse('take-now'));
  assert.equal(h.history.length, 0);
});

test('failed lock writes do not report success or change the saved preference', async () => {
  const options = { failLockWrite: true, lockEnabled: false };
  const h = harness(options);
  await assert.rejects(h.manager.setAppLockWithReminders(true));
  assert.equal(options.lockEnabled, false);
});

test('per-request OS scheduling failures remain visible after the lock is saved', async () => {
  const options = { failSchedule: true };
  const h = harness(options);
  const result = await h.manager.setAppLockWithReminders(true);
  assert.equal(options.lockEnabled, true);
  assert.match(result.message, /refresh notification controls/);
  await h.runTask(nativeResponse('skip'));
  assert.equal(h.history.length, 0);
});

for (const [before, after] of [['show', 'hide'], ['show', 'none'], ['hide', 'none']]) {
  for (const condition of ['active', 'disabled', 'no-schedules', 'permission-denied']) {
    test(`privacy ${before} -> ${after} clears stale tray content with ${condition}`, async () => {
      const options = {};
      const h = harness(options);
      h.prefs.notificationPrivacy = before;
      await h.manager.reconcileReminders();
      const request = structuredClone([...h.stored.values()][0]);
      h.presented.set(request.identifier, { request });
      h.presented.set('unrelated', { request: { ...request, identifier: 'unrelated' } });
      h.prefs.notificationPrivacy = after;
      if (condition === 'disabled') h.prefs.remindersEnabled = false;
      if (condition === 'no-schedules') h.medicine.schedules = [];
      if (condition === 'permission-denied') options.granted = false;
      await h.manager.reconcileReminders();
      assert.deepEqual([...h.presented.keys()], ['unrelated']);
      for (const pending of h.stored.values()) assert.doesNotMatch(pending.content.body, /Test medicine/);
    });
  }
}

test('privacy cleanup preserves already compliant reminders and reports dismissal failures', async () => {
  const options = {};
  const h = harness(options);
  h.prefs.notificationPrivacy = 'hide';
  await h.manager.reconcileReminders();
  const request = structuredClone([...h.stored.values()][0]);
  h.presented.set(request.identifier, { request });
  await h.manager.reconcileReminders();
  assert.equal(h.presented.size, 1);
  request.content.body = 'Private stale medicine';
  options.failDismiss = true;
  await assert.rejects(h.manager.reconcileReminders(), /dismissal failed/);
  assert.equal(h.presented.size, 1);
  options.failDismiss = false;
  await h.manager.reconcileReminders();
  assert.equal(h.presented.size, 0);
});

for (const [action, status] of [['take-now', 'Taken'], ['skip', 'Skipped'], ['snooze-15', null]]) {
  test(`Android headless ${action} consumes the native dataString payload without a UI listener`, async () => {
    const h = harness({ profiles: true });
    const raw = nativeResponse(action);
    await h.runTask(raw);
    assert.equal(h.selected, 'p1');
    assert.equal(h.history.length, status ? 1 : 0);
    if (status) {
      assert.equal(h.history[0].status, status);
      assert.equal(h.history[0].scheduledAtMs, raw.notification.date);
    } else {
      assert.equal(h.stored.size, 1);
      const request = [...h.stored.values()][0];
      assert.equal(request.trigger.type, 'date');
      assert.equal(request.content.data.scheduledAtMs, raw.notification.date);
    }
    assert.ok(h.calls.includes('dismissNotification:' + raw.notification.request.identifier));
    assert.ok(h.calls.includes('clearResponse'));
    assert.equal(h.calls.some(call => call.startsWith('issue:')), false);
  });

  test(`${action} shares task/UI delivery and replay, while the next day's press still executes`, async () => {
    const h = harness();
    const raw = nativeResponse(action);
    const mapped = response();
    mapped.actionIdentifier = action;
    const dispose = await h.manager.subscribeToReminderTaps(() => {});
    const task = h.runTask(raw);
    h.emit(mapped);
    await task;
    await h.manager.handleReminderAction(mapped);
    assert.equal(h.history.length, status ? 1 : 0);
    assert.equal(h.calls.filter(call => call === 'snooze').length, status ? 0 : 1);
    assert.equal(h.calls.filter(call => call.startsWith('dismissNotification:')).length, 1);
    await h.runTask(nativeResponse(action, new Date(2026, 8, 27, 8).getTime()));
    assert.equal(h.history.length, status ? 2 : 0);
    assert.equal(h.calls.filter(call => call === 'snooze').length, status ? 0 : 2);
    dispose();
  });
}

test('headless action failures are reported and the same press can be retried', async () => {
  const options = { failLog: true };
  const h = harness(options);
  const raw = nativeResponse('take-now');
  await h.runTask(raw);
  assert.equal(h.history.length, 0);
  assert.ok(h.calls.includes('issue:action_failed'));
  assert.equal(h.calls.some(call => call.startsWith('dismissNotification:')), false);
  assert.equal(h.calls.includes('clearResponse'), false);
  options.failLog = false;
  await h.runTask(raw);
  assert.equal(h.history.length, 1);
});

test('notification snooze uses the SQLite deadline on replay and does not re-arm an expired snooze', async () => {
  const savedSnoozeUntilMs = Date.now() + 60000;
  const h = harness({ savedSnoozeUntilMs });
  await h.runTask(nativeResponse('snooze-15'));
  assert.equal([...h.stored.values()][0].trigger.date.getTime(), savedSnoozeUntilMs);
  const expired = harness({ savedSnoozeUntilMs: Date.now() - 60000 });
  await expired.runTask(nativeResponse('snooze-15'));
  assert.equal(expired.stored.size, 0);
  assert.ok(expired.calls.includes('clearResponse'));
});

test('raw snooze payload preserves the original occurrence across midnight', async () => {
  const h = harness();
  const raw = nativeResponse('take-now', new Date(2026, 8, 27, 0, 5).getTime());
  const scheduledAtMs = new Date(2026, 8, 26, 8).getTime();
  const content = raw.notification.request.content;
  content.dataString = JSON.stringify({ ...JSON.parse(content.dataString), doseDate: '2026-09-26', scheduledAtMs });
  await h.runTask(raw);
  assert.equal(h.history[0].date, '2026-09-26');
  assert.equal(h.history[0].scheduledAtMs, scheduledAtMs);
});

test('raw payload parsing rejects malformed, unrelated, and stale data without acting', async () => {
  const h = harness();
  const validData = JSON.parse(nativeResponse('skip').notification.request.content.dataString);
  for (const dataString of ['{bad json', 'null', '[]', '42', JSON.stringify({ ...validData, version: 2 }),
    JSON.stringify({ ...validData, kind: 'other' }), JSON.stringify({ ...validData, medicineId: 'deleted' }),
    JSON.stringify({ ...validData, scheduleId: 'deleted' })]) {
    const raw = nativeResponse('skip');
    raw.notification.request.content.dataString = dataString;
    await h.runTask(raw);
  }
  assert.equal(h.history.length, 0);
  assert.equal(h.stored.size, 0);
  assert.deepEqual(h.calls, []);
});

test('mapped content is used without accessing Expo’s deprecated dataString getter', async () => {
  const h = harness();
  const mapped = response();
  Object.defineProperty(mapped.notification.request.content, 'dataString', { get() { throw Error('deprecated getter'); } });
  const raw = nativeResponse('take-now');
  assert.deepEqual(await h.manager.doseFromResponse(raw), await h.manager.doseFromResponse(mapped));
  assert.deepEqual(await h.manager.doseRouteFromResponse(raw), await h.manager.doseRouteFromResponse(mapped));
});

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
  assert.match(result.issues[0], /Reminder could not be scheduled/);
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

test('full editor replaces old alarms and preserves the prior alarm on a failed save', async () => {
  const h = harness(); await h.manager.reconcileReminders();
  await h.manager.editMedicineWithReminders(h.medicine.id, { medicine: { name: 'Edited' }, scheduleId: 'schedule-1', schedule: { timeLocalMinute: 615, doseAmount: 2, reminderEnabled: true } });
  assert.equal(h.stored.size, 1); const request = [...h.stored.values()][0];
  assert.equal(request.trigger.hour, 10); assert.equal(request.trigger.minute, 15);
  assert.match(request.content.body + request.content.title, /Edited/); assert.ok(h.calls.indexOf('cancel') < h.calls.indexOf('edit'));
  await h.manager.editMedicineWithReminders(h.medicine.id, { medicine: {}, scheduleId: 'schedule-1', schedule: { reminderEnabled: false } });
  assert.equal(h.stored.size, 0);
  const failed = harness({ failEdit: true }); await failed.manager.reconcileReminders();
  await assert.rejects(failed.manager.editMedicineWithReminders(failed.medicine.id, { medicine: {}, scheduleId: 'schedule-1', schedule: {} }), /Edit failed/);
  assert.equal(failed.stored.size, 1); assert.equal([...failed.stored.values()][0].trigger.hour, 8);
});

test('9 AM and 6 PM reminders are independent, idempotent, and cancelled together on pause', async () => {
  const h = harness();
  h.medicine.schedules[0].timeLocalMinute = 540;
  h.medicine.schedules.push({ ...h.medicine.schedules[0], id: 'evening-dose', timeLocalMinute: 1080, doseAmount: 2 });
  await h.manager.scheduleMedicineReminders(h.medicine);
  await h.manager.reconcileReminders();
  assert.equal(h.stored.size, 2);
  assert.deepEqual([...h.stored.values()].map(r => r.trigger.hour).sort((a,b) => a-b), [9, 18]);
  assert.equal(new Set([...h.stored.values()].map(r => r.content.data.scheduleId)).size, 2);
  await h.manager.setScheduleReminderEnabled('evening-dose', false);
  assert.equal(h.stored.size, 1);
  assert.equal([...h.stored.values()][0].trigger.hour, 9);
  await h.manager.setScheduleReminderEnabled('evening-dose', true);
  assert.equal(h.stored.size, 2);
  await h.manager.updateMedicineWithReminders(h.medicine.id, { status: 'Paused' });
  assert.equal(h.stored.size, 0);
  await h.manager.updateMedicineWithReminders(h.medicine.id, { status: 'Active' });
  assert.equal(h.stored.size, 2);
});

test('editing both dose times replaces both alarms without duplicate requests', async () => {
  const h = harness();
  h.medicine.schedules[0].timeLocalMinute = 540;
  h.medicine.schedules.push({ ...h.medicine.schedules[0], id: 'evening', timeLocalMinute: 1080 });
  await h.manager.scheduleMedicineReminders(h.medicine);
  const input = { medicine: {}, scheduleId: h.medicine.schedules[0].id,
    schedule: { ...h.medicine.schedules[0], timeLocalMinute: 600, reminderEnabled: true },
    additionalSchedules: [{ ...h.medicine.schedules[1], timeLocalMinute: 1140, reminderEnabled: true }] };
  await h.manager.editMedicineWithReminders(h.medicine.id, input);
  await h.manager.reconcileReminders();
  assert.equal(h.stored.size, 2);
  assert.deepEqual([...h.stored.values()].map(r => r.trigger.hour).sort((a,b) => a-b), [10, 19]);
});

test('Today correction cancels its snooze and Undo re-arms the exact previous deadline', async () => {
  const h = harness();
  const at = new Date(2026, 8, 26, 8).getTime();
  const dose = { medicineId: 'medicine-1', scheduleId: 'schedule-1', date: '2026-09-26', scheduledAtMs: at,
    status: null, actualTakenAtMs: null, snoozedUntilMs: null };
  const snoozed = await h.manager.changeMedicationDose(dose, 'Snooze');
  const id = `dosetracker:dose:snooze:schedule-1:${at}`;
  const request = [...h.stored.values()].find(item => item.identifier.includes('snooze:'));
  assert.ok(request);
  const deadline = request.trigger.date.getTime();
  const taken = await h.manager.changeMedicationDose({ ...dose, snoozedUntilMs: deadline }, 'Taken');
  assert.equal([...h.stored.values()].filter(item => item.identifier.includes('snooze:')).length, 0);
  assert.equal(h.history.length, 1);
  await h.manager.undoMedicationChange(taken.receipt);
  const restored = [...h.stored.values()].find(item => item.identifier.includes('snooze:'));
  assert.equal(restored.trigger.date.getTime(), deadline);
  assert.equal(restored.identifier, request.identifier);
  assert.equal(h.history.length, 0);
  await h.manager.undoMedicationChange(snoozed.receipt);
  assert.equal(h.stored.has(id), false);
  assert.equal([...h.stored.values()].filter(item => item.identifier.includes('snooze:')).length, 0);
});
test('Today saved corrections retain Undo when native cleanup fails', async () => {
  const h = harness({ failDismiss: true });
  const notification = response();
  h.presented.set(notification.notification.request.identifier, notification.notification);
  const result = await h.manager.changeMedicationDose({ medicineId: 'medicine-1', scheduleId: 'schedule-1',
    date: '2026-09-26', scheduledAtMs: notification.notification.date, status: null,
    actualTakenAtMs: null, snoozedUntilMs: null }, 'Taken');
  assert.ok(result.receipt);
  assert.match(result.message, /cleanup needs a retry/);
  assert.equal(h.history.length, 1);
  await h.manager.undoMedicationChange(result.receipt);
  assert.equal(h.history.length, 0);
});
test('Today write failure does not cancel an existing reminder; denied snooze never writes', async () => {
  const h = harness({ failLog: true });
  const dose = { medicineId: 'medicine-1', scheduleId: 'schedule-1', date: '2026-09-26',
    scheduledAtMs: new Date(2026, 8, 26, 8).getTime(), status: null, actualTakenAtMs: null, snoozedUntilMs: null };
  await assert.rejects(h.manager.changeMedicationDose(dose, 'Taken'), /Database write failed/);
  assert.equal(h.calls.includes('cancel'), false);
  const denied = harness({ granted: false });
  await assert.rejects(denied.manager.changeMedicationDose(dose, 'Snooze'), /Enable reminder/);
  assert.equal(denied.calls.some(call => call.startsWith('change:')), false);
});
