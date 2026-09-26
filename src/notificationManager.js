import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { fetchAllMedicines, fetchMedicineDetails, updateMedicine, deleteMedicine, clearDatabase } from './database';
import { readSettings } from './features/settings/storage';

export const MEDICATION_CHANNEL = 'medication-reminders';
const PREFIX = 'dosetracker:dose:';
const alarmAccess = Platform.OS === 'android' ? requireOptionalNativeModule('DoseAlarmAccess') : null;
let work = Promise.resolve();
let foregroundHandlerInstalled = false;

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
  if (typeof value !== 'string') throw new Error('A valid reminder time is required.');
  const match = /^(?:Daily at\s+)?(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i.exec(value.trim());
  if (!match) throw new Error('Use a time such as 8:00 AM.');
  return (Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
}

/** Native recurring triggers repeat without a JS timer or the app reopening. */
export function recurringTriggers(schedule, now = new Date()) {
  const { pattern } = schedule;
  if (pattern.kind === 'prn') return [];
  // Expo's recurring triggers cannot enforce course bounds or anchored intervals.
  // Refuse them instead of silently firing before a course starts or after it ends.
  if (pattern.endDate || pattern.startDate > localDate(now) || !['daily', 'weekdays'].includes(pattern.kind)) {
    throw new Error('Automatic reminders currently support ongoing daily or weekday schedules starting today. This course was saved without reminders.');
  }
  const time = parseReminderTime(schedule.timeLocalMinute);
  const base = { hour: Math.floor(time / 60), minute: time % 60, channelId: MEDICATION_CHANNEL };
  if (pattern.kind === 'daily') return [{ ...base, type: 'daily' }];
  if (!pattern.weekdays?.length || pattern.weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error('Choose valid weekdays.');
  return [...new Set(pattern.weekdays)].map(day => ({ ...base, type: 'weekly', weekday: day + 1 }));
}

async function notifications() {
  const api = await import('expo-notifications');
  if (!foregroundHandlerInstalled) {
    api.setNotificationHandler({ handleNotification: async () => {
      const prefs = await readSettings();
      return { shouldShowBanner: prefs.remindersEnabled, shouldShowList: prefs.remindersEnabled,
        shouldPlaySound: prefs.remindersEnabled && prefs.soundAndVibration, shouldSetBadge: false };
    } });
    foregroundHandlerInstalled = true;
  }
  return api;
}

export async function getReminderStatus(requestPermission = false) {
  if (Platform.OS === 'web') return { allowed: false, exact: null, message: 'Reminders require an Android or iOS build.' };
  const api = await notifications();
  if (Platform.OS === 'android') await api.setNotificationChannelAsync(MEDICATION_CHANNEL, {
    name: 'Medication reminders', importance: api.AndroidImportance.HIGH,
    sound: 'default', vibrationPattern: [0, 250, 250, 250], enableVibrate: true,
    lockscreenVisibility: api.AndroidNotificationVisibility.PRIVATE,
  });
  let permission = await api.getPermissionsAsync();
  if (requestPermission && !permission.granted && permission.canAskAgain) permission = await api.requestPermissionsAsync();
  const allowed = permission.granted || permission.ios?.status === api.IosAuthorizationStatus.PROVISIONAL;
  const channel = Platform.OS === 'android' ? await api.getNotificationChannelAsync(MEDICATION_CHANNEL) : null;
  const channelAllowed = !channel || channel.importance !== api.AndroidImportance.NONE;
  const exact = Platform.OS === 'android' ? (alarmAccess ? await alarmAccess.canScheduleExactAlarms() : null) : null;
  return { allowed: allowed && channelAllowed, exact,
    message: !allowed ? 'Notifications are disabled. Enable notifications in system settings.'
      : !channelAllowed ? 'The Medication reminders channel is disabled in system settings.'
      : Platform.OS === 'android' && exact === null ? 'Rebuild the Android app to check Alarms & reminders access.'
      : Platform.OS === 'android' && !exact ? 'Exact-alarm access is off. Reminders may be delayed. Enable Alarms & reminders.'
      : 'Reminders scheduled through the device. Delivery depends on system permissions and restrictions.' };
}

export async function openExactAlarmSettings() {
  if (!alarmAccess) throw new Error('Install a development build containing DoseAlarmAccess.');
  await alarmAccess.openExactAlarmSettings();
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
  return serialized(async () => scheduleSavedMedicines([medicine], requestPermission, false));
}

/** Repairs failed commits-to-OS scheduling on startup/foreground and preference changes. */
export function reconcileReminders() {
  return serialized(async () => scheduleSavedMedicines(await fetchAllMedicines(), false, true));
}

// Serialize edits with foreground reconciliation so a stale snapshot cannot re-arm
// a paused/deleted medicine. Cancel before changing its eligibility in SQLite.
function changeMedicine(medicineId, mutation) {
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
    try { return await scheduleSavedMedicines(await fetchAllMedicines(), false, true); }
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

export function deleteMedicineWithReminders(medicineId) {
  return changeMedicine(medicineId, () => deleteMedicine(medicineId));
}

async function scheduleSavedMedicines(medicines, requestPermission, removeObsolete) {
  const prefs = await readSettings();
  if (Platform.OS === 'web') return { scheduled: 0, issues: [], ...(await getReminderStatus()) };
  const api = await notifications();
  if (!prefs.remindersEnabled) {
    await cancelMedicationRequests(api);
    return { scheduled: 0, issues: [], allowed: false, exact: null, message: 'Reminders are switched off in Settings.' };
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
      try {
        for (const trigger of recurringTriggers(schedule)) {
          const identifier = `${PREFIX}${schedule.id}:${trigger.type === 'weekly' ? trigger.weekday : 'daily'}`;
          desired.add(identifier);
          await api.scheduleNotificationAsync({ identifier,
            content: {
              title: 'Medication reminder',
              body: prefs.notificationPrivacy === 'hide' ? 'Open DoseTracker to view your scheduled dose.'
                : `${medicine.name} — ${schedule.doseAmount} ${medicine.doseUnit || medicine.dosageForm}`,
              sound: prefs.soundAndVibration ? 'default' : false,
              data: { kind: 'medication-dose', version: 1, medicineId: medicine.id, scheduleId: schedule.id },
            }, trigger });
          scheduled++;
        }
      } catch (error) { issues.push(`${medicine.name}: ${error instanceof Error ? error.message : 'Reminder could not be scheduled.'}`); }
    }
  }
  if (removeObsolete) {
    for (const request of await api.getAllScheduledNotificationsAsync()) {
      if (request.identifier.startsWith(PREFIX) && !desired.has(request.identifier)) await api.cancelScheduledNotificationAsync(request.identifier);
    }
  }
  return { ...status, scheduled, issues };
}

/** Validates IDs against SQLite; notification data never supplies an arbitrary URL. */
export async function doseRouteFromResponse(response) {
  const data = response?.notification?.request?.content?.data;
  if (data?.kind !== 'medication-dose' || data.version !== 1 || typeof data.medicineId !== 'string' || typeof data.scheduleId !== 'string') return null;
  const medicine = await fetchMedicineDetails(data.medicineId);
  const schedule = medicine?.schedules.find(item => item.id === data.scheduleId);
  if (!medicine || !schedule || medicine.status !== 'Active') return null;
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
  return { pathname: '/', params: { medicineId: medicine.id, scheduleId: schedule.id, doseDate } };
}

export async function subscribeToReminderTaps(onDose, onError = () => {}) {
  if (Platform.OS === 'web') return () => {};
  const api = await notifications();
  const handled = new Set();
  let active = true;
  async function handle(response) {
    if (!active || !response || response.actionIdentifier !== api.DEFAULT_ACTION_IDENTIFIER) return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.has(key)) return;
    handled.add(key);
    try {
      const route = await doseRouteFromResponse(response);
      if (active && route) onDose(route);
      await api.clearLastNotificationResponseAsync();
    } catch (error) { handled.delete(key); if (active) onError(error); }
  }
  const listener = api.addNotificationResponseReceivedListener(response => { void handle(response); });
  void api.getLastNotificationResponseAsync().then(handle).catch(onError);
  return () => { active = false; listener.remove(); };
}
