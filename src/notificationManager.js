import { UserFacingError, publicErrorMessage } from './features/security/errors';
import { Linking, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { changeDoseWithUndo, restoreDoseChange, fetchAllMedicines, fetchMedicineDetails, editMedicine, updateMedicine, updateScheduleReminderEnabled, deleteMedicine, clearDatabase, logDose, undoDoseLog, snoozeDose, fetchPendingSnoozes, fetchScheduledDoses, fetchProfiles, selectProfile, setProfileArchived, recordReminderIssue, fetchRecentReminderIssues } from './database';
import { readSettings } from './features/settings/storage';
import { isAuthEnabled, setAuthEnabled } from './features/security/SecurityManager';

export const MEDICATION_CHANNEL = 'medication-reminders';
export const MEDICATION_CATEGORY = 'medication_reminders_actions';
export const ACTION_TAKE = 'take-now';
export const ACTION_SNOOZE = 'snooze-15';
export const ACTION_SKIP = 'skip';

export function reminderChannelId(prefs) {
  return `medication-reminders-v2-${prefs.notificationPrivacy}-${prefs.reminderSound}-${prefs.vibrationEnabled ? 'vibrate' : 'still'}`;
}
function reminderContent(prefs, detail, data) {
  return { title: prefs.notificationPrivacy === 'none' ? 'DoseTracker' : 'Medication reminder',
    body: prefs.notificationPrivacy === 'show' ? detail : prefs.notificationPrivacy === 'hide'
      ? 'Open DoseTracker to view your scheduled dose.' : 'Open the app for details.',
    sound: prefs.reminderSound === 'silent' ? false : prefs.reminderSound === 'default' ? 'default' : `${prefs.reminderSound}.wav`,
    categoryIdentifier: data?.kind === 'medication-dose' && quickActionsAllowed === true ? MEDICATION_CATEGORY : undefined,
    data: { ...data, ...(Platform.OS === 'android' && prefs.reminderRinging && prefs.reminderSound !== 'silent'
      ? { alarmRinging: true } : {}) } };
}
const PREFIX = 'dosetracker:dose:';
const alarmAccess = Platform.OS === 'android' ? requireOptionalNativeModule('DoseAlarmAccess') : null;
export function isAlarmRingingAvailable() {
  return Platform.OS === 'android' && alarmAccess?.supportsRinging?.() === true;
}
let work = Promise.resolve();
let foregroundHandlerInstalled = false;
let quickActionsAllowed;
const pendingActions = new Map();
const completedActions = new Set();

function serialized(task) {
  const result = work.then(task);
  work = result.catch(() => undefined);
  return result;
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Accepts structured time, or the UI's explicit 12-hour time. Never guesses a time. */
export function parseReminderTime(value) {
  if (Number.isInteger(value) && value >= 0 && value < 1440) return value;
  if (typeof value !== 'string') throw new UserFacingError('A valid reminder time is required.');
  const match = /^(?:Daily at\s+)?(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i.exec(value.trim());
  if (!match) throw new UserFacingError('Use a time such as 8:00 AM.');
  return (Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
}

/** Native recurring triggers repeat without a JS timer or the app reopening. */
export function recurringTriggers(schedule, now = new Date(), channelId = MEDICATION_CHANNEL) {
  const { pattern } = schedule;
  if (pattern.kind === 'prn') return [];
  // Expo's recurring triggers cannot enforce course bounds or anchored intervals.
  // Refuse them instead of silently firing before a course starts or after it ends.
  if (pattern.endDate || pattern.startDate > localDate(now) || !['daily', 'weekdays'].includes(pattern.kind)) {
    throw new UserFacingError('Automatic reminders currently support ongoing daily or weekday schedules starting today. This course was saved without reminders.');
  }
  const time = parseReminderTime(schedule.timeLocalMinute);
  const base = { hour: Math.floor(time / 60), minute: time % 60, channelId };
  if (pattern.kind === 'daily') return [{ ...base, type: 'daily' }];
  if (!pattern.weekdays?.length || pattern.weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new UserFacingError('Choose valid weekdays.');
  return [...new Set(pattern.weekdays)].map(day => ({ ...base, type: 'weekly', weekday: day + 1 }));
}

async function notifications() {
  const api = await import('expo-notifications');
  if (!foregroundHandlerInstalled) {
    api.setNotificationHandler({ handleNotification: async () => {
      const prefs = await readSettings();
      return { shouldShowBanner: prefs.remindersEnabled, shouldShowList: prefs.remindersEnabled,
        shouldPlaySound: prefs.remindersEnabled && prefs.reminderSound !== 'silent', shouldSetBadge: false };
    } });
    foregroundHandlerInstalled = true;
  }
  // Read the secure preference on every entry, including after a settings change.
  // An unreadable preference must not expose actions or permit a dose mutation.
  const allowActions = !(await isAuthEnabled());
  if (quickActionsAllowed !== allowActions) {
    if (allowActions) {
      await api.setNotificationCategoryAsync(MEDICATION_CATEGORY, [
        { identifier: ACTION_TAKE, buttonTitle: 'Take Now', options: { opensAppToForeground: false } },
        { identifier: ACTION_SNOOZE, buttonTitle: 'Snooze 15m', options: { opensAppToForeground: false } },
        { identifier: ACTION_SKIP, buttonTitle: 'Skip', options: { isDestructive: true, opensAppToForeground: false } },
      ]);
    } else await api.deleteNotificationCategoryAsync(MEDICATION_CATEGORY);
    quickActionsAllowed = allowActions;
  }
  return api;
}

export async function getReminderStatus(requestPermission = false, soundOverride) {
  if (Platform.OS === 'web') return { allowed: false, exact: null, message: 'Reminders require an Android or iOS build.' };
  const api = await notifications();
  const savedPrefs = await readSettings();
  const prefs = soundOverride ? { ...savedPrefs, reminderSound: soundOverride } : savedPrefs;
  const channelId = reminderChannelId(prefs);
  if (Platform.OS === 'android') await api.setNotificationChannelAsync(channelId, {
    name: `Medication reminders · ${prefs.notificationPrivacy === 'show' ? 'Show content' : prefs.notificationPrivacy === 'hide' ? 'Hide details' : 'No info'} · ${prefs.reminderSound === 'default' ? 'Phone sound' : prefs.reminderSound === 'silent' ? 'Silent' : prefs.reminderSound === 'gentle' ? 'Gentle chime' : 'Clear chime'}${prefs.vibrationEnabled ? ' + vibration' : ''}`,
    importance: api.AndroidImportance.HIGH,
    sound: prefs.reminderSound === 'silent' ? null : prefs.reminderSound === 'default' ? undefined : `${prefs.reminderSound}.wav`,
    vibrationPattern: prefs.vibrationEnabled ? [0, 250, 250, 250] : undefined,
    enableVibrate: prefs.vibrationEnabled,
    lockscreenVisibility: prefs.notificationPrivacy === 'show' ? api.AndroidNotificationVisibility.PUBLIC
      : prefs.notificationPrivacy === 'none' ? api.AndroidNotificationVisibility.SECRET : api.AndroidNotificationVisibility.PRIVATE,
  });
  let permission = await api.getPermissionsAsync();
  if (requestPermission && !permission.granted && permission.canAskAgain) permission = await api.requestPermissionsAsync();
  const allowed = permission.granted || permission.ios?.status === api.IosAuthorizationStatus.PROVISIONAL;
  const channel = Platform.OS === 'android' ? await api.getNotificationChannelAsync(channelId) : null;
  const selectedChannel = Platform.OS === 'android' && soundOverride
    ? await api.getNotificationChannelAsync(reminderChannelId(savedPrefs)) : null;
  const legacyChannel = Platform.OS === 'android' ? await api.getNotificationChannelAsync(MEDICATION_CHANNEL) : null;
  const channelAllowed = (!channel || channel.importance !== api.AndroidImportance.NONE) &&
    (!selectedChannel || selectedChannel.importance !== api.AndroidImportance.NONE) &&
    (!legacyChannel || legacyChannel.importance !== api.AndroidImportance.NONE);
  const exact = Platform.OS === 'android' ? (alarmAccess ? await alarmAccess.canScheduleExactAlarms() : null) : null;
  return { allowed: allowed && channelAllowed, exact, channelId, channel,
    ringingAvailable: Platform.OS === 'android' && prefs.reminderRinging ? isAlarmRingingAvailable() : undefined,
    message: !allowed ? 'Notifications are disabled. Enable notifications in system settings.'
      : !channelAllowed ? 'The Medication reminders channel is disabled in system settings.'
      : Platform.OS === 'android' && exact === null ? 'Rebuild the Android app to check Alarms & reminders access.'
      : Platform.OS === 'android' && !exact ? 'Exact-alarm access is off. Reminders may be delayed. Enable Alarms & reminders.'
      : Platform.OS === 'android' && prefs.reminderRinging && !isAlarmRingingAvailable()
        ? 'Repeating sound needs the updated Android build (Android 8 or later). Current reminders use a single alert.'
      : 'Reminders scheduled through the device. Delivery depends on system permissions and restrictions.' };
}

/** Prevents a preference change from silently bypassing a channel the user blocked in Android settings. */
export async function canChangeReminderChannel() {
  if (Platform.OS !== 'android') return true;
  const api = await notifications();
  const prefs = await readSettings();
  const channel = await api.getNotificationChannelAsync(reminderChannelId(prefs));
  const legacy = await api.getNotificationChannelAsync(MEDICATION_CHANNEL);
  const expectedSound = prefs.reminderSound === 'silent' ? null : prefs.reminderSound === 'default' ? 'default' : 'custom';
  return channel?.importance !== api.AndroidImportance.NONE && legacy?.importance !== api.AndroidImportance.NONE &&
    (!channel || (channel.sound === expectedSound && channel.enableVibrate === prefs.vibrationEnabled));
}

export async function scheduleTestReminder(soundOverride) {
  const savedPrefs = await readSettings();
  const prefs = soundOverride ? { ...savedPrefs, reminderSound: soundOverride } : savedPrefs;
  if (!prefs.remindersEnabled) throw new UserFacingError('Enable reminders before sending a test.');
  if (Platform.OS === 'android' && prefs.reminderRinging && !isAlarmRingingAvailable()) {
    throw new UserFacingError('Install the updated Android build (Android 8 or later) to test repeating sound.');
  }
  const status = await getReminderStatus(true, soundOverride);
  if (!status.allowed) throw new UserFacingError(status.message);
  const api = await notifications();
  await api.scheduleNotificationAsync({
    identifier: `${PREFIX}test:${Date.now()}`,
    content: reminderContent(prefs, 'Sample medication — 1 tablet', { kind: 'reminder-test' }),
    trigger: { type: 'timeInterval', seconds: 10, channelId: status.channelId },
  });
  return prefs.reminderRinging && prefs.reminderSound !== 'silent' && Platform.OS === 'android'
    ? 'Test reminder scheduled for 10 seconds from now. Use Stop ringing or open the notification panel to silence it. It clears automatically after 2 minutes. Phone notification volume and system settings apply.'
    : 'Test reminder scheduled for 10 seconds from now. Lock your phone to check privacy, sound and vibration.';
}

export async function getReminderDiagnostics() {
  const prefs = await readSettings();
  const medicines = await fetchAllMedicines();
  const requested = medicines.reduce((count, medicine) => count + (medicine.status === 'Active'
    ? medicine.schedules.filter(schedule => schedule.reminderEnabled !== false).length : 0), 0)
    + (await fetchPendingSnoozes()).length;
  const status = await getReminderStatus(false);
  const api = Platform.OS === 'web' ? null : await notifications();
  const scheduled = api ? (await api.getAllScheduledNotificationsAsync()).filter(item => item.identifier.startsWith(PREFIX)).length : 0;
  return { ...status, enabled: prefs.remindersEnabled, requested, scheduled,
    issues: requested ? await fetchRecentReminderIssues(7) : [] };
}

export async function openExactAlarmSettings() {
  if (!alarmAccess) throw new UserFacingError('Install a development build containing DoseAlarmAccess.');
  await alarmAccess.openExactAlarmSettings();
}
export async function openNotificationSettings() {
  if (Platform.OS === 'android' && alarmAccess?.openNotificationSettings) {
    await alarmAccess.openNotificationSettings();
  } else {
    await Linking.openSettings();
  }
}

async function cancelMedicationRequests(api) {
  const requests = await api.getAllScheduledNotificationsAsync();
  for (const request of requests) if (request.identifier.startsWith(PREFIX)) await api.cancelScheduledNotificationAsync(request.identifier);
}

export function cancelMedicationReminders() {
  return serialized(async () => {
    if (Platform.OS !== 'web') await cancelMedicationRequests(await notifications());
  });
}

export function eraseMedicineDataWithReminders() {
  return serialized(async () => {
    if (Platform.OS !== 'web') {
      const api = await notifications();
      await api.cancelAllScheduledNotificationsAsync();
      await api.dismissAllNotificationsAsync();
    }
    await clearDatabase();
  });
}

/** Called after a SQLite commit; stable schedule IDs make retries idempotent. */
export function scheduleMedicineReminders(medicine, requestPermission = true) {
  return serialized(async () => {
    const result = await scheduleSavedMedicines([medicine], requestPermission, false);
    if (result.issues.length) await recordReminderIssue('schedule_failed', 'A medication reminder could not be scheduled.').catch(() => undefined);
    return result;
  });
}

export function setScheduleReminderEnabled(scheduleId, enabled) {
  return serialized(async () => {
    await updateScheduleReminderEnabled(scheduleId, enabled);
    try {
      const result = await scheduleSavedMedicines(await fetchAllMedicines(), enabled, true);
      if (result.issues.length) await recordReminderIssue('schedule_failed', 'A medication reminder could not be scheduled.').catch(() => undefined);
      return result;
    } catch {
      await recordReminderIssue('schedule_failed', 'A medication reminder could not be scheduled.').catch(() => undefined);
      return { scheduled: 0, allowed: false, exact: null, message: 'Reminder preference saved. Open Reminder status in Settings to retry setup.', issues: [] };
    }
  });
}

/** Repairs failed commits-to-OS scheduling on startup/foreground and preference changes. */
export function reconcileReminders() {
  return serialized(async () => {
    try {
      const result = await scheduleSavedMedicines(await fetchAllMedicines(), false, true);
      if (!result.allowed && (await readSettings()).remindersEnabled) await recordReminderIssue('notifications_blocked', result.message).catch(() => undefined);
      if (result.exact === false) await recordReminderIssue('exact_alarm_off', 'Exact alarm access is off; Android may delay reminders.').catch(() => undefined);
      for (const issue of result.issues) await recordReminderIssue('schedule_failed',
        issue.includes('Snooze') ? 'A snooze reminder could not be scheduled.' : 'A medication reminder could not be scheduled.').catch(() => undefined);
      return result;
    } catch (error) {
      await recordReminderIssue('reconcile_failed', 'Reminder setup failed. Open Reminder status to retry.').catch(() => undefined);
      throw error;
    }
  });
}

/** Serialize lock changes with notification mutations, then repair the OS view. */
export function setAppLockWithReminders(enabled) {
  return serialized(async () => {
    await setAuthEnabled(enabled);
    try {
      const result = await scheduleSavedMedicines(await fetchAllMedicines(), false, true);
      if (result.issues.length) throw new Error('Reminder controls need a refresh.');
      return { message: '' };
    } catch {
      await recordReminderIssue('reconcile_failed', 'Reminder controls need a refresh. Open Reminder status to retry.').catch(() => undefined);
      // The security preference is already saved. Never roll it back on OS failure.
      return { message: 'App lock was saved. Open Reminder status to refresh notification controls.' };
    }
  });
}

/** Profile archives cancel only that person's reminders; other profiles stay armed. */
export function setProfileArchivedWithReminders(profileId, archived) {
  return serialized(async () => {
    const profiles = await fetchProfiles();
    if (archived && !profiles.some(p => p.id !== profileId && p.status === 'Active')) throw new UserFacingError('Keep at least one active profile. Add another profile first.');
    if (archived && Platform.OS !== 'web') {
      const ids = new Set((await fetchAllMedicines({ profileId, includeArchivedProfiles: true })).map(m => m.id));
      const api = await notifications();
      for (const request of await api.getAllScheduledNotificationsAsync()) {
        if (request.identifier.startsWith(PREFIX) && ids.has(request.content.data?.medicineId)) await api.cancelScheduledNotificationAsync(request.identifier);
      }
    }
    try { await setProfileArchived(profileId, archived); }
    catch (error) { await scheduleSavedMedicines(await fetchAllMedicines(), false, true).catch(() => undefined); throw error; }
    try { return await scheduleSavedMedicines(await fetchAllMedicines(), false, true); }
    catch { return { scheduled: 0, allowed: false, exact: null, message: 'Profile saved.', issues: ['Profile saved. Open Reminder status in Settings to retry reminder setup.'] }; }
  });
}

// Serialize edits with foreground reconciliation so a stale snapshot cannot re-arm
// a paused/deleted medicine. Cancel before changing its eligibility in SQLite.
function changeMedicine(medicineId, mutation, requestPermission = false) {
  return serialized(async () => {
    if (Platform.OS !== 'web') {
      const api = await notifications();
      for (const request of await api.getAllScheduledNotificationsAsync()) {
        if (request.identifier.startsWith(PREFIX) && request.content.data?.medicineId === medicineId) {
          await api.cancelScheduledNotificationAsync(request.identifier);
        }
      }
    }
    try { await mutation(); }
    catch (error) {
      // Restore the unchanged DB schedule if a metadata write failed.
      await scheduleSavedMedicines(await fetchAllMedicines(), false, true).catch(() => undefined);
      throw error;
    }
    try { return await scheduleSavedMedicines(await fetchAllMedicines(), requestPermission, true); }
    catch {
      // The DB commit succeeded. Do not invite a retry that duplicates a refill.
      return { scheduled: 0, allowed: false, exact: null, message: 'Medicine saved.',
        issues: ['Reminder setup failed. Open Reminder status in Settings to retry.'] };
    }
  });
}

export function updateMedicineWithReminders(medicineId, patch) {
  return changeMedicine(medicineId, () => updateMedicine(medicineId, patch));
}

export function editMedicineWithReminders(medicineId, input) {
  return changeMedicine(medicineId, () => editMedicine(medicineId, input), input.schedule.reminderEnabled === true);
}

export function deleteMedicineWithReminders(medicineId) {
  return changeMedicine(medicineId, () => deleteMedicine(medicineId));
}

function snoozeIdentifier(dose) { return `${PREFIX}snooze:${dose.scheduleId}:${dose.scheduledAtMs}`; }

async function scheduleSnoozeRequest(api, snooze, medicine, prefs) {
  const schedule = medicine.schedules.find(item => item.id === snooze.scheduleId);
  if (!schedule) return;
  await api.scheduleNotificationAsync({ identifier: snoozeIdentifier(snooze),
    content: reminderContent(prefs, `${medicine.name} — ${schedule.doseAmount} ${medicine.doseUnit || medicine.dosageForm}`,
      { kind: 'medication-dose', version: 1, medicineId: medicine.id, scheduleId: schedule.id,
        doseDate: snooze.date, scheduledAtMs: snooze.scheduledAtMs }),
    trigger: { type: 'date', date: new Date(snooze.untilMs), channelId: reminderChannelId(prefs) } });
}

/** A snooze defers the same occurrence. It is never a Taken/Skipped history entry. */
export function snoozeMedicationDose(dose, minutes, notificationDeliveredAtMs) {
  return serialized(() => snoozeMedicationDoseTask(dose, minutes, notificationDeliveredAtMs));
}

async function snoozeMedicationDoseTask(dose, minutes, notificationDeliveredAtMs) {
  const prefs = await readSettings();
  const delay = minutes ?? prefs.snoozeMinutes;
  if (!Number.isInteger(delay) || delay < 1 || delay > 1440) throw new UserFacingError('Choose a snooze duration from 1 to 1440 minutes.');
  const status = await getReminderStatus(false);
  if (Platform.OS !== 'web' && (!prefs.remindersEnabled || !status.allowed)) throw new UserFacingError('Enable reminder notifications in Settings before snoozing.');
  const untilMs = await snoozeDose({ ...dose, untilMs: Date.now() + delay * 60000, notificationDeliveredAtMs });
  // An expired snooze replay must not create a new immediate notification.
  if (untilMs <= Date.now()) return { untilMs, message: '' };
  if (Platform.OS === 'web') return { untilMs, message: 'Snoozed locally. Browser previews cannot deliver Android reminders.' };
  try {
    const medicine = await fetchMedicineDetails(dose.medicineId);
    if (!medicine) throw new UserFacingError('Medicine not found.');
    await scheduleSnoozeRequest(await notifications(), { ...dose, untilMs }, medicine, prefs);
    return { untilMs, message: Platform.OS === 'android' && status.exact !== true ? status.message : '' };
  } catch {
    await recordReminderIssue('snooze_failed', 'A snooze reminder could not be scheduled.').catch(() => undefined);
    return { untilMs, message: 'Snooze saved; reminder scheduling failed. Open Reminder status in Settings to retry.' };
  }
}

/** Commit first; notification cleanup failure must not repeat a stock deduction. */
export function recordMedicationDose(dose, status) {
  return serialized(() => recordMedicationDoseTask(dose, status));
}

async function recordMedicationDoseTask(dose, status) {
  await logDose({ ...dose, status, actualTakenAtMs: status === 'Taken' ? Date.now() : null });
  return cleanupDoseNotifications(dose);
}

async function cleanupDoseNotifications(dose) {
  if (Platform.OS === 'web') return { message: '' };
  try {
    const api = await notifications();
    await api.cancelScheduledNotificationAsync(snoozeIdentifier(dose));
    for (const request of await api.getAllScheduledNotificationsAsync()) {
      const data = request.content.data;
      if (request.identifier.startsWith(`${PREFIX}snooze:`) && data?.scheduleId === dose.scheduleId && data.doseDate === dose.date) {
        const remaining = await fetchPendingSnoozes();
        if (!remaining.some(item => snoozeIdentifier(item) === request.identifier)) await api.cancelScheduledNotificationAsync(request.identifier);
      }
    }
    for (const notification of await api.getPresentedNotificationsAsync()) {
      const data = notification.request.content.data;
      if (data?.scheduleId !== dose.scheduleId) continue;
      const route = await doseRouteFromResponse({ notification });
      if (route?.params?.doseDate === dose.date && (!data.scheduledAtMs || data.scheduledAtMs === dose.scheduledAtMs)) {
        await api.dismissNotificationAsync(notification.request.identifier);
      }
    }
    return { message: '' };
  } catch { return { message: 'Dose saved. Reminder cleanup needs a retry in Settings.' }; }
}

export function undoMedicationDose(dose) {
  return serialized(async () => {
    const result = await undoDoseLog(dose);
    return { message: result.manualStockCorrectionNeeded
      ? 'Dose removed. This older log has no exact stock deduction saved, so check and correct its stock in Medicines.' : '' };
  });
}

/** Foreground corrections share the notification mutation queue with OS actions. */
export function changeMedicationDose(dose, action) {
  return serialized(async () => {
    let untilMs;
    if (action === 'Snooze') {
      const prefs = await readSettings();
      const status = await getReminderStatus(false);
      if (!Number.isInteger(prefs.snoozeMinutes) || prefs.snoozeMinutes < 1 || prefs.snoozeMinutes > 1440) {
        throw new UserFacingError('Choose a snooze duration from 1 to 1440 minutes.');
      }
      if (Platform.OS !== 'web' && (!prefs.remindersEnabled || !status.allowed)) {
        throw new UserFacingError('Enable reminder notifications in Settings before snoozing.');
      }
      untilMs = Date.now() + prefs.snoozeMinutes * 60000;
    }
    const receipt = await changeDoseWithUndo(dose, action, untilMs);
    const message = await reconcileDoseChange(dose);
    return { receipt, message: [receipt.manualStockCorrectionNeeded
      ? 'This older log has no exact stock deduction saved. Check its stock in Medicines.' : '', message].filter(Boolean).join(' ') };
  });
}

export function undoMedicationChange(receipt) {
  return serialized(async () => {
    await restoreDoseChange(receipt);
    return { message: await reconcileDoseChange(receipt.dose) };
  });
}

async function reconcileDoseChange(dose) {
  const cleanup = await cleanupDoseNotifications(dose);
  try {
    const pending = (await fetchPendingSnoozes()).filter(item => item.scheduleId === dose.scheduleId && item.date === dose.date);
    if (!pending.length) return cleanup.message;
    if (Platform.OS === 'web') return 'Snoozed locally. Browser previews cannot deliver Android reminders.';
    const prefs = await readSettings();
    const status = await getReminderStatus(false);
    if (!prefs.remindersEnabled || !status.allowed) return 'Dose saved. Enable reminders in Settings to deliver the restored snooze.';
    const medicine = await fetchMedicineDetails(dose.medicineId);
    if (!medicine) throw new UserFacingError('Medicine not found.');
    const api = await notifications();
    for (const snooze of pending) await scheduleSnoozeRequest(api, snooze, medicine, prefs);
    return cleanup.message || (Platform.OS === 'android' && status.exact !== true ? status.message : '');
  } catch {
    await recordReminderIssue('snooze_failed', 'A snooze reminder could not be scheduled.').catch(() => undefined);
    return 'Dose saved; reminder scheduling failed. Open Reminder status in Settings to retry.';
  }
}

async function scheduleSavedMedicines(medicines, requestPermission, removeObsolete) {
  const prefs = await readSettings();
  if (Platform.OS === 'web') return { scheduled: 0, issues: [], ...(await getReminderStatus()) };
  const api = await notifications();
  // Scheduled requests and presented notifications are separate OS stores.
  // Clean the tray even when reminders are disabled or no schedules remain.
  for (const notification of await api.getPresentedNotificationsAsync()) {
    const request = notification.request;
    if (!request.identifier.startsWith(PREFIX) && request.content.data?.kind !== 'reminder-test') continue;
    const safe = reminderContent(prefs, '', request.content.data);
    const staleContent = prefs.notificationPrivacy !== 'show'
      && (request.content.title !== safe.title || request.content.body !== safe.body);
    const staleActions = !quickActionsAllowed && request.content.categoryIdentifier === MEDICATION_CATEGORY;
    const staleRinging = request.content.data?.alarmRinging === true &&
      (!prefs.remindersEnabled || !prefs.reminderRinging || prefs.reminderSound === 'silent');
    if (staleContent || staleActions || staleRinging) await api.dismissNotificationAsync(request.identifier);
  }
  if (!prefs.remindersEnabled) {
    await cancelMedicationRequests(api);
    return { scheduled: 0, issues: [], allowed: false, exact: null, message: 'Reminders are switched off in Settings.' };
  }
  const pendingSnoozes = await fetchPendingSnoozes();
  const requested = medicines.some(medicine => medicine.status === 'Active' && medicine.schedules.some(schedule => schedule.reminderEnabled !== false)) || pendingSnoozes.length > 0;
  if (!requested) {
    if (removeObsolete) await cancelMedicationRequests(api);
    return { scheduled: 0, issues: [], allowed: true, exact: null, message: 'No reminders requested.' };
  }
  const status = await getReminderStatus(requestPermission);
  if (!status.allowed) {
    await cancelMedicationRequests(api);
    return { ...status, scheduled: 0, issues: [] };
  }
  const desired = new Set();
  const issues = [];
  let scheduled = 0;
  for (const medicine of medicines) {
    if (medicine.status !== 'Active') continue;
    for (const schedule of medicine.schedules) {
      if (schedule.reminderEnabled === false) continue;
      try {
        for (const trigger of recurringTriggers(schedule, new Date(), reminderChannelId(prefs))) {
          const identifier = `${PREFIX}${schedule.id}:${trigger.type === 'weekly' ? trigger.weekday : 'daily'}`;
          desired.add(identifier);
          await api.scheduleNotificationAsync({ identifier,
            content: reminderContent(prefs, `${medicine.name} — ${schedule.doseAmount} ${medicine.doseUnit || medicine.dosageForm}`,
              { kind: 'medication-dose', version: 1, medicineId: medicine.id, scheduleId: schedule.id }), trigger });
          scheduled++;
        }
      } catch (error) { issues.push(`${medicine.name}: ${publicErrorMessage(error, 'Reminder could not be scheduled.')}`); }
    }
  }
  for (const snooze of pendingSnoozes) {
    const medicine = medicines.find(item => item.id === snooze.medicineId);
    if (!medicine) continue;
    const identifier = snoozeIdentifier(snooze);
    desired.add(identifier);
    try { await scheduleSnoozeRequest(api, snooze, medicine, prefs); scheduled++; }
    catch { issues.push(`${medicine.name}: Snooze reminder could not be scheduled.`); }
  }
  if (removeObsolete) {
    for (const request of await api.getAllScheduledNotificationsAsync()) {
      if (request.identifier.startsWith(PREFIX) && !desired.has(request.identifier)) await api.cancelScheduledNotificationAsync(request.identifier);
    }
  }
  return { ...status, scheduled, issues };
}

function reminderDataFromResponse(response) {
  const content = response?.notification?.request?.content;
  if (content?.data != null) return content.data;
  // Expo 57 maps dataString for UI listeners, but Android TaskManager delivers
  // the native serialized content unchanged when handling an action headlessly.
  try {
    return typeof content?.dataString === 'string' ? JSON.parse(content.dataString) : null;
  } catch {
    return null;
  }
}

/** Validates IDs against SQLite; notification data never supplies an arbitrary URL. */
export async function doseRouteFromResponse(response) {
  const data = reminderDataFromResponse(response);
  if (data?.kind !== 'medication-dose' || data.version !== 1 || typeof data.medicineId !== 'string' || typeof data.scheduleId !== 'string') return null;
  const medicine = await fetchMedicineDetails(data.medicineId);
  const schedule = medicine?.schedules.find(item => item.id === data.scheduleId);
  if (!medicine || !schedule || medicine.status !== 'Active') return null;
  if (medicine.profileId && !(await fetchProfiles()).some(p => p.id === medicine.profileId && p.status === 'Active')) return null;
  const owner = medicine.profileId ? { profileId: medicine.profileId } : {};
  if (typeof data.doseDate === 'string' && Number.isSafeInteger(data.scheduledAtMs)) {
    const doses = await fetchScheduledDoses(data.doseDate);
    const dose = doses.find(item => item.schedule.id === data.scheduleId && item.scheduledAtMs === data.scheduledAtMs);
    return dose ? { pathname: '/', params: { ...owner, medicineId: medicine.id, scheduleId: schedule.id,
      doseDate: dose.date, scheduledAtMs: String(dose.scheduledAtMs) } } : null;
  }
  const delivered = new Date(response.notification.date);
  if (!Number.isFinite(delivered.getTime())) return null;
  if (!['daily', 'weekdays'].includes(schedule.pattern.kind) || schedule.timeLocalMinute == null) return null;
  // Use the delivery timestamp, never the tap timestamp (the tray may be days old).
  // If Android delivered after midnight, identify the preceding scheduled dose.
  const occurrence = new Date(delivered);
  occurrence.setHours(Math.floor(schedule.timeLocalMinute / 60), schedule.timeLocalMinute % 60, 0, 0);
  if (occurrence > delivered) occurrence.setDate(occurrence.getDate() - 1);
  if (schedule.pattern.kind === 'weekdays') {
    const days = schedule.pattern.weekdays || [];
    if (!days.length) return null;
    for (let i = 0; i < 7 && !days.includes(occurrence.getDay()); i++) occurrence.setDate(occurrence.getDate() - 1);
  }
  const doseDate = localDate(occurrence);
  if (doseDate < schedule.pattern.startDate || (schedule.pattern.endDate && doseDate > schedule.pattern.endDate)) return null;
  return { pathname: '/', params: { ...owner, medicineId: medicine.id, scheduleId: schedule.id, doseDate } };
}

/** Resolves the concrete DoseReference object from an interactive notification response. */
export async function doseFromResponse(response) {
  const data = reminderDataFromResponse(response);
  if (data?.kind !== 'medication-dose' || data.version !== 1 || typeof data.medicineId !== 'string' || typeof data.scheduleId !== 'string') return null;
  const medicine = await fetchMedicineDetails(data.medicineId);
  const schedule = medicine?.schedules.find(item => item.id === data.scheduleId);
  if (!medicine || !schedule || medicine.status !== 'Active') return null;
  if (medicine.profileId && !(await fetchProfiles()).some(p => p.id === medicine.profileId && p.status === 'Active')) return null;

  if (typeof data.doseDate === 'string' && Number.isSafeInteger(data.scheduledAtMs)) {
    return {
      medicineId: medicine.id,
      scheduleId: schedule.id,
      profileId: medicine.profileId || null,
      date: data.doseDate,
      scheduledAtMs: data.scheduledAtMs,
    };
  }

  const delivered = new Date(response.notification.date);
  if (!Number.isFinite(delivered.getTime())) return null;
  if (!['daily', 'weekdays'].includes(schedule.pattern.kind) || schedule.timeLocalMinute == null) return null;

  const occurrence = new Date(delivered);
  occurrence.setHours(Math.floor(schedule.timeLocalMinute / 60), schedule.timeLocalMinute % 60, 0, 0);
  if (occurrence > delivered) occurrence.setDate(occurrence.getDate() - 1);
  if (schedule.pattern.kind === 'weekdays') {
    const days = schedule.pattern.weekdays || [];
    if (!days.length) return null;
    for (let i = 0; i < 7 && !days.includes(occurrence.getDay()); i++) occurrence.setDate(occurrence.getDate() - 1);
  }
  const doseDate = localDate(occurrence);
  if (doseDate < schedule.pattern.startDate || (schedule.pattern.endDate && doseDate > schedule.pattern.endDate)) return null;

  return {
    medicineId: medicine.id,
    scheduleId: schedule.id,
    profileId: medicine.profileId || null,
    date: doseDate,
    scheduledAtMs: occurrence.getTime(),
  };
}

export async function subscribeToReminderTaps(onDose, onError = () => {}) {
  if (Platform.OS === 'web') return () => {};
  const api = await notifications();
  const handled = new Set();
  let active = true;
  async function handle(response) {
    if (!active || !response) return;
    const action = response.actionIdentifier;
    const key = `${response.notification.request.identifier}:${response.notification.date}:${action}`;
    if (handled.has(key)) return;
    handled.add(key);
    try {
      if (action === api.DEFAULT_ACTION_IDENTIFIER) {
        const route = await doseRouteFromResponse(response);
        if (active && route) {
          if (route.params.profileId) await selectProfile(route.params.profileId);
          if (active) onDose(route);
        }
      } else await handleReminderAction(response);
      await api.clearLastNotificationResponseAsync().catch(() => undefined);
    } catch (error) { handled.delete(key); if (active) onError(error); }
  }
  const listener = api.addNotificationResponseReceivedListener(response => { void handle(response); });
  void api.getLastNotificationResponseAsync().then(handle).catch(onError);
  return () => { active = false; listener.remove(); };
}

/** Shared by the UI listener and Android's headless notification action task. */
export async function handleReminderAction(response) {
  const action = response?.actionIdentifier;
  if (![ACTION_TAKE, ACTION_SNOOZE, ACTION_SKIP].includes(action)) return;
  const key = `${response.notification?.request?.identifier}:${response.notification?.date}:${action}`;
  if (completedActions.has(key)) return;
  if (pendingActions.has(key)) return pendingActions.get(key);
  // The task and UI listener can receive the same press in the same runtime.
  // Share its work (especially the snooze deadline), but allow failed retries.
  const attempt = serialized(async () => {
    // This boundary runs for both native headless delivery and the UI listener.
    // Check inside the mutation queue so a queued action cannot outlive lock-on.
    if (await isAuthEnabled()) return;
    const dose = await doseFromResponse(response);
    if (!dose) return;
    if (dose.profileId) await selectProfile(dose.profileId);
    if (action === ACTION_SNOOZE) await snoozeMedicationDoseTask(dose, 15, response.notification.date);
    else await recordMedicationDoseTask(dose, action === ACTION_TAKE ? 'Taken' : 'Skipped');
    if (Platform.OS === 'android') {
      const api = await notifications();
      await api.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
      await api.clearLastNotificationResponseAsync().catch(() => undefined);
    }
    completedActions.add(key);
    // Recurring request IDs are reused; include delivery time and bound memory.
    if (completedActions.size > 128) completedActions.delete(completedActions.values().next().value);
  });
  pendingActions.set(key, attempt);
  try {
    await attempt;
  } finally {
    pendingActions.delete(key);
  }
}
