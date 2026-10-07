import { UserFacingError } from './features/security/errors';
import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { dateKey, occurrencesOnDate, isEligibleOccurrence } from './features/doses/occurrences';

const listeners = new Set();
export function subscribeToDatabaseChanges(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function changed() { for (const listener of listeners) listener(); }
let writes = Promise.resolve();
function withWriteTransaction(db, task, notify = true) {
  // Web transactions use the shared connection; serialize writes on every platform.
  const result = writes.then(() => Platform.OS === 'web'
    ? db.withTransactionAsync(() => task(db)) : db.withExclusiveTransactionAsync(task));
  writes = result.catch(() => undefined);
  if (notify) void result.then(changed, () => undefined);
  return result;
}

// All data stays in the app's private on-device SQLite directory.
export const DATABASE_NAME = 'dosetracker.db';
const SCHEMA_VERSION = 8;
const QUANTITY_SCALE = 1_000_000;

let databasePromise;

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new UserFacingError(`${label} is required.`);
  return value.trim();
}

function optionalText(value) {
  return value == null || value === '' ? null : requiredText(value, 'Text');
}

function quantityToUnits(value, label) {
  if (value == null) return null;
  const text = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(text)) {
    throw new UserFacingError(`${label} must be a nonnegative number with at most six decimal places.`);
  }
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * QUANTITY_SCALE + Number(fraction.padEnd(6, '0'));
  if (!Number.isSafeInteger(result)) throw new UserFacingError(`${label} is too large.`);
  return result;
}

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validatePattern(pattern) {
  if (!pattern || typeof pattern !== 'object' || Array.isArray(pattern)) {
    throw new UserFacingError('Recurring pattern must be an object.');
  }
  if (!['daily', 'weekdays', 'day_interval', 'hour_interval', 'prn'].includes(pattern.kind)) {
    throw new UserFacingError('Unsupported recurring pattern.');
  }
  if (!isCalendarDate(pattern.startDate)) throw new UserFacingError('A valid schedule start date is required.');
  if (pattern.endDate != null && (!isCalendarDate(pattern.endDate) || pattern.endDate < pattern.startDate)) {
    throw new UserFacingError('Schedule end date must be on or after the start date.');
  }
  if (pattern.kind === 'weekdays' && (!Array.isArray(pattern.weekdays) || !pattern.weekdays.length || pattern.weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6))) {
    throw new UserFacingError('Weekdays must contain day numbers from 0 (Sunday) to 6 (Saturday).');
  }
  if ((pattern.kind === 'day_interval' || pattern.kind === 'hour_interval') && (!Number.isSafeInteger(pattern.interval) || pattern.interval < 1)) {
    throw new UserFacingError('Schedule interval must be a positive whole number.');
  }
  return JSON.stringify(pattern);
}

async function migrate(db) {
  // These connection settings match the storage conventions in PLAN.md.
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = (await db.getFirstAsync('PRAGMA user_version'))?.user_version ?? 0;
  if (version > SCHEMA_VERSION) throw new UserFacingError('This database was created by a newer app version.');
  if (version === SCHEMA_VERSION) return;

  await withWriteTransaction(db, async transaction => {
    if (version === 0) {
      await transaction.execAsync(`
        CREATE TABLE medicines (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL CHECK (length(trim(name)) > 0),
          dosage_form TEXT NOT NULL CHECK (length(trim(dosage_form)) > 0),
          strength_text TEXT,
          dose_unit TEXT,
          purpose TEXT,
          instructions TEXT,
          notes TEXT,
          color TEXT,
          stock_remaining_q INTEGER CHECK (stock_remaining_q IS NULL OR stock_remaining_q >= 0),
          low_stock_threshold_q INTEGER CHECK (low_stock_threshold_q IS NULL OR low_stock_threshold_q >= 0),
          status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Archived')),
          created_at_ms INTEGER NOT NULL
        );
        CREATE TABLE schedules (
          id TEXT PRIMARY KEY NOT NULL,
          medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
          time_local_minute INTEGER CHECK (time_local_minute IS NULL OR time_local_minute BETWEEN 0 AND 1439),
          recurring_pattern TEXT NOT NULL,
          dose_amount_q INTEGER NOT NULL CHECK (dose_amount_q > 0),
          special_instructions TEXT,
          created_at_ms INTEGER NOT NULL
        );
        CREATE INDEX schedules_medicine_idx ON schedules(medicine_id);
        CREATE TABLE history (
          id TEXT PRIMARY KEY NOT NULL,
          schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
          date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
          actual_taken_at_ms INTEGER,
          status TEXT NOT NULL CHECK (status IN ('Taken', 'Skipped', 'Missed')),
          created_at_ms INTEGER NOT NULL,
          CHECK ((status = 'Taken' AND actual_taken_at_ms IS NOT NULL) OR
                 (status IN ('Skipped', 'Missed') AND actual_taken_at_ms IS NULL))
        );
        CREATE INDEX history_date_idx ON history(date DESC, created_at_ms DESC);
        CREATE INDEX history_schedule_idx ON history(schedule_id);
        CREATE TABLE settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
          notification_preferences TEXT NOT NULL DEFAULT '{"enabled":true,"privacy":"show","soundAndVibration":true,"snoozeMinutes":10}'
        );
        INSERT INTO settings (id) VALUES (1);
        PRAGMA user_version = 1;
      `);
    }
    if (version < 2) {
      await transaction.execAsync(`
        ALTER TABLE history ADD COLUMN scheduled_at_ms INTEGER;
        CREATE UNIQUE INDEX history_occurrence_idx ON history(schedule_id, date, scheduled_at_ms)
          WHERE scheduled_at_ms IS NOT NULL;
        CREATE TABLE dose_snoozes (
          schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          scheduled_at_ms INTEGER NOT NULL,
          until_ms INTEGER NOT NULL,
          PRIMARY KEY (schedule_id, date, scheduled_at_ms)
        );
        PRAGMA user_version = 2;
      `);
    }
    if (version < 3) {
      await transaction.execAsync(`
        CREATE TABLE profiles (
          id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL CHECK(length(trim(name)) > 0),
          relationship TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '#08B8BE',
          photo_uri TEXT, date_of_birth TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Archived')),
          created_at_ms INTEGER NOT NULL
        );
        INSERT INTO profiles (id,name,relationship,created_at_ms) VALUES ('profile-default','Me','You',0);
        ALTER TABLE medicines ADD COLUMN profile_id TEXT REFERENCES profiles(id);
        UPDATE medicines SET profile_id = 'profile-default';
        CREATE INDEX medicines_profile_idx ON medicines(profile_id);
        ALTER TABLE settings ADD COLUMN active_profile_id TEXT REFERENCES profiles(id);
        ALTER TABLE settings ADD COLUMN profiles_imported INTEGER NOT NULL DEFAULT 0;
        UPDATE settings SET active_profile_id = 'profile-default';
        PRAGMA user_version = 3;
      `);
    }
    if (version < 4) {
      await transaction.execAsync(`
        CREATE TABLE reminder_issues (
          day TEXT NOT NULL, code TEXT NOT NULL, message TEXT NOT NULL,
          first_seen_ms INTEGER NOT NULL, last_seen_ms INTEGER NOT NULL,
          occurrences INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (day, code)
        );
        CREATE INDEX reminder_issues_recent_idx ON reminder_issues(last_seen_ms DESC);
        PRAGMA user_version = 4;
      `);
    }
    if (version < 5) {
      await transaction.execAsync(`
        ALTER TABLE history ADD COLUMN stock_deducted_q INTEGER;
        PRAGMA user_version = 5;
      `);
    }
    if (version < 6) {
      await transaction.execAsync(`
        ALTER TABLE schedules ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK(reminder_enabled IN (0, 1));
        UPDATE schedules SET reminder_enabled = 1
          WHERE json_extract(recurring_pattern, '$.kind') IN ('daily', 'weekdays')
            AND json_extract(recurring_pattern, '$.endDate') IS NULL
            AND json_extract(recurring_pattern, '$.startDate') <= date('now', 'localtime');
        PRAGMA user_version = 6;
      `);
    }
    if (version < 7) {
      await transaction.execAsync('ALTER TABLE history ADD COLUMN dose_snapshot TEXT; PRAGMA user_version = 7;');
    }
    if (version < 8) {
      await transaction.execAsync('ALTER TABLE schedules ADD COLUMN history_next_date TEXT; PRAGMA user_version = 8;');
      // Old versions did not retain pause/edit periods. Do not invent past outcomes.
      await transaction.runAsync('UPDATE schedules SET history_next_date = ?', [dateKey()]);
    }
  });
}

/** Logs observed setup/scheduling issues only; Android does not report every delivery. */
export async function recordReminderIssue(code, message) {
  if (!/^[a-z_]{1,40}$/.test(code) || typeof message !== 'string' || !message.trim()) throw new UserFacingError('Invalid reminder issue.');
  const db = await initializeDatabase();
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  await withWriteTransaction(db, async transaction => {
    await transaction.runAsync(`INSERT INTO reminder_issues (day,code,message,first_seen_ms,last_seen_ms)
      VALUES (?,?,?,?,?) ON CONFLICT(day,code) DO UPDATE SET
      message=excluded.message,last_seen_ms=excluded.last_seen_ms,occurrences=occurrences+1`,
      [day, code, message.trim().slice(0, 240), now, now]);
    await transaction.runAsync('DELETE FROM reminder_issues WHERE last_seen_ms < ?', [now - 30 * 86400000]);
  });
}

export async function fetchRecentReminderIssues(days = 7) {
  const db = await initializeDatabase();
  return db.getAllAsync(`SELECT code, message, first_seen_ms AS firstSeenMs,
    last_seen_ms AS lastSeenMs, occurrences FROM reminder_issues
    WHERE last_seen_ms >= ? ORDER BY last_seen_ms DESC LIMIT 30`, [Date.now() - days * 86400000]);
}

/** Opens (and creates, on first launch) the private on-device database. */
export function initializeDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async db => {
      await migrate(db);
      return db;
    }).catch(error => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

/** Erases every app-owned SQLite table without replacing the open connection. */
export async function clearDatabase() {
  const db = await initializeDatabase();
  await withWriteTransaction(db, async transaction => {
    await transaction.execAsync('DELETE FROM reminder_issues; DELETE FROM dose_snoozes; DELETE FROM history; DELETE FROM schedules; DELETE FROM medicines; DELETE FROM settings; DELETE FROM profiles;');
  });
}

function validateMedicineForm(medicine, schedule) {
  const name = requiredText(medicine?.name, 'Medicine name');
  const dosageForm = requiredText(medicine?.dosageForm, 'Dosage form');
  const pattern = validatePattern(schedule?.pattern);
  const time = schedule.timeLocalMinute ?? null;
  if (pattern && ((schedule.pattern.kind === 'prn' && time !== null) ||
      (schedule.pattern.kind !== 'prn' && (!Number.isInteger(time) || time < 0 || time > 1439)))) {
    throw new UserFacingError('A scheduled dose needs a valid local time; as-needed doses have no fixed time.');
  }
  const reminderEnabled = schedule.reminderEnabled === true;
  if (reminderEnabled && (schedule.pattern.endDate || schedule.pattern.startDate > dateKey(new Date()) ||
      !['daily', 'weekdays'].includes(schedule.pattern.kind))) {
    throw new UserFacingError('Reminders currently support ongoing daily or weekday schedules starting today.');
  }
  const stock = quantityToUnits(medicine.stockRemaining, 'Stock remaining');
  const threshold = quantityToUnits(medicine.lowStockThreshold, 'Low-stock threshold');
  const amount = quantityToUnits(schedule.doseAmount, 'Dose amount');
  if (amount === null || amount === 0) throw new UserFacingError('Dose amount must be greater than zero.');
  return { name, dosageForm, pattern, time, reminderEnabled, stock, threshold, amount };
}

/** Validate every submitted dose time before writing any part of a medicine. */
function validateAdditionalSchedules(medicine, schedule, additionalSchedules = []) {
  if (!Array.isArray(additionalSchedules)) throw new UserFacingError('Choose valid dose times.');
  const times = new Set([schedule.timeLocalMinute]);
  return additionalSchedules.map(item => {
    if (!['daily', 'weekdays', 'day_interval'].includes(schedule.pattern.kind) ||
        JSON.stringify(item.pattern) !== JSON.stringify(schedule.pattern)) {
      throw new UserFacingError('Additional dose times must use the same daily, weekday or day-interval schedule.');
    }
    const validated = validateMedicineForm(medicine, item);
    if (times.has(validated.time)) throw new UserFacingError('Choose a different time for each dose.');
    times.add(validated.time);
    return { ...validated, id: item.id, specialInstructions: optionalText(item.specialInstructions) };
  });
}

async function saveAdditionalSchedules(transaction, medicineId, schedules) {
  for (const item of schedules) {
    if (item.id) {
      const old = await transaction.getFirstAsync('SELECT * FROM schedules WHERE id = ? AND medicine_id = ?', [item.id, medicineId]);
      if (!old) throw new UserFacingError('Dose time no longer exists. Reopen the editor.');
      await transaction.runAsync('UPDATE schedules SET time_local_minute = ?, recurring_pattern = ?, dose_amount_q = ?, special_instructions = ?, reminder_enabled = ? WHERE id = ?', [item.time, item.pattern, item.amount, item.specialInstructions, item.reminderEnabled ? 1 : 0, item.id]);
      if (old.time_local_minute !== item.time || old.recurring_pattern !== item.pattern || old.dose_amount_q !== item.amount) {
        await transaction.runAsync('DELETE FROM dose_snoozes WHERE schedule_id = ?', [item.id]);
        await transaction.runAsync('UPDATE schedules SET history_next_date = ? WHERE id = ?', [dateKey(), item.id]);
      }
      continue;
    }
    await transaction.runAsync(`INSERT INTO schedules (id, medicine_id, time_local_minute, recurring_pattern,
      dose_amount_q, special_instructions, created_at_ms, reminder_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Crypto.randomUUID(), medicineId, item.time, item.pattern, item.amount, item.specialInstructions, Date.now(), item.reminderEnabled ? 1 : 0]);
  }
}

/**
 * Add one medicine and all its dose times atomically.
 * schedule.pattern: { kind, startDate, endDate?, weekdays?, interval? }.
 * timeLocalMinute is 0–1439, or null for an as-needed schedule.
 * Quantities are decimal values in the medicine's dose/stock unit.
 */
export async function addMedicine({ medicine, schedule, additionalSchedules, profileId }) {
  const extra = validateAdditionalSchedules(medicine, schedule, additionalSchedules);
  const { name, dosageForm, pattern, time, reminderEnabled, stock, threshold, amount } = validateMedicineForm(medicine, schedule);
  if (extra.some(item => item.id)) throw new UserFacingError('New medicine doses cannot reference existing schedules.');
  const medicineId = Crypto.randomUUID();
  const scheduleId = Crypto.randomUUID();
  const now = Date.now();
  const db = await initializeDatabase();
  await withWriteTransaction(db, async transaction => {
    const owner = profileId ?? (await transaction.getFirstAsync('SELECT active_profile_id FROM settings WHERE id = 1'))?.active_profile_id;
    const profile = await transaction.getFirstAsync("SELECT id FROM profiles WHERE id = ? AND status = 'Active'", [owner ?? '']);
    if (!profile) throw new UserFacingError('Choose an active profile before adding a medicine.');
    await transaction.runAsync(
      `INSERT INTO medicines (id, name, dosage_form, strength_text, dose_unit, purpose, instructions,
         notes, color, stock_remaining_q, low_stock_threshold_q, created_at_ms, profile_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [medicineId, name, dosageForm, optionalText(medicine.strength), optionalText(medicine.doseUnit),
        optionalText(medicine.purpose), optionalText(medicine.instructions), optionalText(medicine.notes),
        optionalText(medicine.color), stock, threshold, now, owner]
    );
    await transaction.runAsync(
      `INSERT INTO schedules (id, medicine_id, time_local_minute, recurring_pattern,
         dose_amount_q, special_instructions, created_at_ms, reminder_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [scheduleId, medicineId, time, pattern, amount, optionalText(schedule.specialInstructions), now, reminderEnabled ? 1 : 0]
    );
    await saveAdditionalSchedules(transaction, medicineId, extra);
  });
  return { medicineId, scheduleId };
}

/** Returns medicine cards with their schedules and stock in ordinary units. */
export async function fetchAllMedicines({ profileId, includeArchivedProfiles = false } = {}) {
  const db = await initializeDatabase();
  const rows = await db.getAllAsync(`
    SELECT m.*, s.id AS schedule_id, s.time_local_minute, s.recurring_pattern, s.reminder_enabled,
           s.dose_amount_q, s.special_instructions, s.created_at_ms AS schedule_created_at_ms
      FROM medicines m JOIN profiles p ON p.id = m.profile_id LEFT JOIN schedules s ON s.medicine_id = m.id
     WHERE (? IS NULL OR m.profile_id = ?) AND (? = 1 OR p.status = 'Active')
     ORDER BY m.name COLLATE NOCASE, s.time_local_minute
  `, [profileId ?? null, profileId ?? null, includeArchivedProfiles ? 1 : 0]);
  const byId = new Map();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, medicineFromRow(row));
    if (row.schedule_id) byId.get(row.id).schedules.push(scheduleFromRow(row));
  }
  return [...byId.values()];
}

/** Returns one medicine with stock and all of its schedules, or null. */
export async function fetchMedicineDetails(medicineId) {
  const db = await initializeDatabase();
  const rows = await db.getAllAsync(`
    SELECT m.*, s.id AS schedule_id, s.time_local_minute, s.recurring_pattern, s.reminder_enabled,
           s.dose_amount_q, s.special_instructions, s.created_at_ms AS schedule_created_at_ms
      FROM medicines m LEFT JOIN schedules s ON s.medicine_id = m.id
     WHERE m.id = ? ORDER BY s.time_local_minute
  `, [requiredText(medicineId, 'Medicine ID')]);
  if (!rows.length) return null;
  const medicine = medicineFromRow(rows[0]);
  medicine.schedules = rows.filter(row => row.schedule_id).map(scheduleFromRow);
  return medicine;
}

/** Save the full form atomically, preserving medicine/schedule IDs and logged doses. */
export async function editMedicine(medicineId, { medicine, schedule, additionalSchedules, scheduleId, expectedStockRemaining }) {
  const extra = validateAdditionalSchedules(medicine, schedule, additionalSchedules);
  const { name, dosageForm, pattern, time, reminderEnabled, stock, threshold, amount } = validateMedicineForm(medicine, schedule);
  const id = requiredText(medicineId, 'Medicine ID');
  const sid = requiredText(scheduleId, 'Schedule ID');
  const db = await initializeDatabase();
  await withWriteTransaction(db, async transaction => {
    await reconcileMissedHistory(transaction);
    const current = await transaction.getFirstAsync('SELECT * FROM medicines WHERE id = ?', [id]);
    const oldSchedule = await transaction.getFirstAsync('SELECT * FROM schedules WHERE id = ? AND medicine_id = ?', [sid, id]);
    if (!current || !oldSchedule) throw new UserFacingError('Medicine or schedule not found. Reopen the editor.');
    const ids = extra.filter(item => item.id).map(item => item.id);
    if (new Set([sid, ...ids]).size !== ids.length + 1) throw new UserFacingError('Each dose must have a distinct schedule.');
    const otherSchedules = await transaction.getAllAsync('SELECT id, time_local_minute FROM schedules WHERE medicine_id = ? AND id != ?', [id, sid]);
    if (ids.some(value => !otherSchedules.some(row => row.id === value))) throw new UserFacingError('Dose time no longer exists. Reopen the editor.');
    const otherTimes = otherSchedules.filter(row => !ids.includes(row.id));
    const changedTimes = [
      ...(time !== oldSchedule.time_local_minute ? [time] : []),
      ...extra.filter(item => !item.id || otherSchedules.find(row => row.id === item.id)?.time_local_minute !== item.time).map(item => item.time),
    ];
    if (changedTimes.some(t => t !== null && otherTimes.some(row => row.time_local_minute === t))) {
      throw new UserFacingError('This medicine already has a dose at that time. Edit its existing schedule instead.');
    }
    // A dose may be taken while this form is open. Never overwrite its stock deduction.
    if (expectedStockRemaining !== undefined && current.stock_remaining_q !== quantityToUnits(expectedStockRemaining, 'Previous stock')) {
      throw new UserFacingError('Stock changed while editing. Reopen the medicine to load its current stock.');
    }
    await transaction.runAsync(`UPDATE history SET dose_snapshot = (
      SELECT json_object('amount', s.dose_amount_q, 'time', s.time_local_minute,
        'form', m.dosage_form, 'unit', m.dose_unit)
      FROM schedules s JOIN medicines m ON m.id = s.medicine_id WHERE s.id = history.schedule_id)
      WHERE dose_snapshot IS NULL AND schedule_id IN (SELECT id FROM schedules WHERE medicine_id = ?)`, [id]);
    if (current.dose_unit !== optionalText(medicine.doseUnit)) {
      await transaction.runAsync('UPDATE history SET stock_deducted_q = NULL WHERE schedule_id IN (SELECT id FROM schedules WHERE medicine_id = ?)', [id]);
    }
    await transaction.runAsync(`UPDATE medicines SET name = ?, dosage_form = ?, strength_text = ?, dose_unit = ?,
      purpose = ?, instructions = ?, notes = ?, color = ?, stock_remaining_q = ?, low_stock_threshold_q = ? WHERE id = ?`,
      [name, dosageForm, optionalText(medicine.strength), optionalText(medicine.doseUnit), optionalText(medicine.purpose),
        optionalText(medicine.instructions), optionalText(medicine.notes), optionalText(medicine.color), stock, threshold, id]);
    await transaction.runAsync(`UPDATE schedules SET time_local_minute = ?, recurring_pattern = ?, dose_amount_q = ?,
      reminder_enabled = ?, special_instructions = ? WHERE id = ? AND medicine_id = ?`,
      [time, pattern, amount, reminderEnabled ? 1 : 0, optionalText(schedule.specialInstructions), sid, id]);
    await saveAdditionalSchedules(transaction, id, extra);
    if (oldSchedule.time_local_minute !== time || oldSchedule.recurring_pattern !== pattern || oldSchedule.dose_amount_q !== amount) {
      await transaction.runAsync('DELETE FROM dose_snoozes WHERE schedule_id = ?', [sid]);
      await transaction.runAsync('UPDATE schedules SET history_next_date = ? WHERE id = ?', [dateKey(), sid]);
    }
  });
}

/** Editable metadata only; changing a schedule requires a separate schedule editor. */
export async function updateMedicine(medicineId, patch) {
  const columns = { name: 'name', strength: 'strength_text', notes: 'notes', stockRemaining: 'stock_remaining_q', status: 'status' };
  const entries = Object.entries(patch).filter(([key, value]) => key in columns && value !== undefined);
  if (!entries.length) return;
  const values = entries.map(([key, value]) => {
    if (key === 'name') return requiredText(value, 'Medicine name');
    if (key === 'stockRemaining') return quantityToUnits(value, 'Stock remaining');
    if (key === 'status') {
      if (!['Active', 'Paused', 'Archived'].includes(value)) throw new UserFacingError('Invalid medicine status.');
      return value;
    }
    return optionalText(value);
  });
  const db = await initializeDatabase();
  await withWriteTransaction(db, async transaction => {
    await reconcileMissedHistory(transaction);
    const id = requiredText(medicineId, 'Medicine ID');
    const result = await transaction.runAsync(`UPDATE medicines SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')} WHERE id = ?`, [...values, id]);
    if (!result.changes) throw new UserFacingError('Medicine not found.');
    if (entries.some(([key]) => key === 'status')) {
      await transaction.runAsync('UPDATE schedules SET history_next_date = ? WHERE medicine_id = ?', [dateKey(), id]);
    }
  });
}

/** Change notification intent without changing the dose tracking schedule. */
export async function updateScheduleReminderEnabled(scheduleId, enabled) {
  if (typeof enabled !== 'boolean') throw new UserFacingError('Choose whether reminders are on or off.');
  const db = await initializeDatabase();
  const id = requiredText(scheduleId, 'Schedule ID');
  const row = await db.getFirstAsync('SELECT recurring_pattern FROM schedules WHERE id = ?', [id]);
  if (!row) throw new UserFacingError('Schedule not found.');
  const pattern = JSON.parse(row.recurring_pattern);
  if (enabled && (pattern.endDate || pattern.startDate > dateKey(new Date()) || !['daily', 'weekdays'].includes(pattern.kind))) {
    throw new UserFacingError('Reminders currently support ongoing daily or weekday schedules starting today.');
  }
  const result = await db.runAsync('UPDATE schedules SET reminder_enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
  if (!result.changes) throw new UserFacingError('Schedule not found.');
  changed();
}

export async function deleteMedicine(medicineId) {
  const db = await initializeDatabase();
  // Foreign keys cascade to the medicine's schedules and dose history.
  await db.runAsync('DELETE FROM medicines WHERE id = ?', [requiredText(medicineId, 'Medicine ID')]);
  changed();
}

/** Records a dose and deducts tracked stock for Taken entries in one transaction.
 * Pass the same requestId when retrying an action to avoid a second stock deduction.
 */
async function validatedOccurrence(transaction, scheduleId, date, scheduledAtMs) {
  const row = await transaction.getFirstAsync(
    `SELECT s.*, m.status AS medicine_status, p.status AS profile_status FROM schedules s JOIN medicines m ON m.id = s.medicine_id JOIN profiles p ON p.id = m.profile_id WHERE s.id = ?`, [scheduleId]);
  if (!row || row.medicine_status !== 'Active' || row.profile_status !== 'Active') throw new UserFacingError('This medicine is no longer active.');
  const schedule = { id: row.id, timeLocalMinute: row.time_local_minute, pattern: JSON.parse(row.recurring_pattern) };
  const occurrences = occurrencesOnDate(schedule, date);
  const at = scheduledAtMs ?? (occurrences.length === 1 ? occurrences[0] : null);
  if (!occurrences.includes(at)) throw new UserFacingError('This dose does not belong to the selected schedule and date.');
  if (!isEligibleOccurrence(row.created_at_ms, at)) {
    // Keep pre-existing logs/snoozes actionable without inventing an earlier dose.
    const recorded = await existingDose(transaction, scheduleId, date, at, schedule.pattern.kind !== 'hour_interval');
    const snoozed = await transaction.getFirstAsync('SELECT 1 FROM dose_snoozes WHERE schedule_id = ? AND date = ? AND scheduled_at_ms = ?', [scheduleId, date, at]);
    if (!recorded && !snoozed) throw new UserFacingError('This dose predates the schedule being added.');
  }
  if (at > Date.now()) throw new UserFacingError('This dose is not due yet.');
  return { row, at };
}

async function existingDose(transaction, scheduleId, date, at, calendarDose) {
  // Version 1 only recorded one dose per schedule/day. Keep those records visible.
  return transaction.getFirstAsync(`SELECT id, status, stock_deducted_q, dose_snapshot FROM history WHERE schedule_id = ? AND date = ?
    AND (? = 1 OR scheduled_at_ms = ? OR scheduled_at_ms IS NULL) ORDER BY created_at_ms LIMIT 1`, [scheduleId, date, calendarDose ? 1 : 0, at]);
}

export async function logDose(input) {
  const db = await initializeDatabase();
  let result;
  await withWriteTransaction(db, async transaction => { result = await writeDoseLog(transaction, input); });
  return result;
}

async function writeDoseLog(transaction, { scheduleId, date, scheduledAtMs, actualTakenAtMs = null, status, requestId }, previous = null, occurrence = null) {
  const id = requiredText(scheduleId, 'Schedule ID');
  if (!isCalendarDate(date)) throw new UserFacingError('Dose date must be a valid YYYY-MM-DD date.');
  if (!['Taken', 'Skipped', 'Missed'].includes(status)) throw new UserFacingError('Invalid dose status.');
  if (status === 'Taken' ? !Number.isSafeInteger(actualTakenAtMs) || actualTakenAtMs < 0 : actualTakenAtMs !== null) {
    throw new UserFacingError('Taken doses need an actual UTC time; other statuses must not have one.');
  }
  let historyId = previous?.id ?? (requestId == null ? Crypto.randomUUID() : requiredText(requestId, 'Request ID'));
  const { row: schedule, at } = occurrence ?? await validatedOccurrence(transaction, id, date, scheduledAtMs);
  const calendarDose = JSON.parse(schedule.recurring_pattern).kind !== 'hour_interval';
  const existing = await existingDose(transaction, id, date, at, calendarDose);
  if (existing) {
    historyId = existing.id;
    // An explicit action supersedes an inferred missed outcome, including a
    // delayed notification action. Other explicit outcomes remain idempotent.
    if (existing.status !== 'Missed' || status === 'Missed') return historyId;
    await transaction.runAsync('DELETE FROM history WHERE id = ?', [existing.id]);
  }
  const doseSnapshot = existing?.dose_snapshot ?? previous?.dose_snapshot ?? null;
  const doseAmount = doseSnapshot ? JSON.parse(doseSnapshot).amount : schedule.dose_amount_q;
  let stockDeducted = null;
  if (status === 'Taken') {
    const medicine = await transaction.getFirstAsync('SELECT stock_remaining_q, dose_unit FROM medicines WHERE id = ?', [schedule.medicine_id]);
    if (doseSnapshot && JSON.parse(doseSnapshot).unit !== medicine.dose_unit) {
      throw new UserFacingError('The dose unit changed. Review the medicine before recording this earlier dose.');
    }
    if (medicine?.stock_remaining_q != null) stockDeducted = Math.min(medicine.stock_remaining_q, doseAmount);
  }
  await transaction.runAsync(
    'INSERT INTO history (id, schedule_id, date, scheduled_at_ms, actual_taken_at_ms, status, created_at_ms, stock_deducted_q, dose_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [historyId, id, date, at, actualTakenAtMs, status, Date.now(), stockDeducted, doseSnapshot]);
  await transaction.runAsync('DELETE FROM dose_snoozes WHERE schedule_id = ? AND date = ? AND (? = 1 OR scheduled_at_ms = ?)', [id, date, calendarDose ? 1 : 0, at]);
  if (stockDeducted != null) {
    await transaction.runAsync('UPDATE medicines SET stock_remaining_q = stock_remaining_q - ? WHERE id = ?', [stockDeducted, schedule.medicine_id]);
  }
  return historyId;
}

export async function undoDoseLog(input) {
  const db = await initializeDatabase();
  let result;
  await withWriteTransaction(db, async transaction => { result = await removeDoseLog(transaction, input); });
  return result;
}

async function removeDoseLog(transaction, { scheduleId, date, scheduledAtMs }) {
  const id = requiredText(scheduleId, 'Schedule ID');
  if (!isCalendarDate(date)) throw new UserFacingError('Dose date must be a valid YYYY-MM-DD date.');
  let manualStockCorrectionNeeded = false;
  const row = await transaction.getFirstAsync(
    `SELECT s.*, m.id as medicine_id, m.stock_remaining_q FROM schedules s JOIN medicines m ON m.id = s.medicine_id WHERE s.id = ?`, [id]);
  if (!row) throw new UserFacingError('Schedule not found.');
  const calendarDose = JSON.parse(row.recurring_pattern).kind !== 'hour_interval';
  const existing = await existingDose(transaction, id, date, scheduledAtMs, calendarDose);
  if (!existing) return { manualStockCorrectionNeeded: false };
  manualStockCorrectionNeeded = existing.status === 'Taken' && existing.stock_deducted_q == null && row.stock_remaining_q != null;
  if (existing.status === 'Taken' && existing.stock_deducted_q != null) {
    await transaction.runAsync(`UPDATE medicines SET stock_remaining_q = stock_remaining_q + ?
      WHERE id = ? AND stock_remaining_q IS NOT NULL`, [existing.stock_deducted_q, row.medicine_id]);
  }
  await transaction.runAsync('DELETE FROM history WHERE id = ?', [existing.id]);
  return { manualStockCorrectionNeeded };
}

// Opaque, in-memory receipts. They contain only this occurrence, never a full
// database/stock backup. Expiring a Snackbar does not change the saved outcome.
async function doseChangeSnapshot(transaction, dose) {
  const schedule = await transaction.getFirstAsync(`SELECT s.*, m.dose_unit, m.stock_remaining_q,
    m.status AS medicine_status, p.status AS profile_status FROM schedules s
    JOIN medicines m ON m.id = s.medicine_id JOIN profiles p ON p.id = m.profile_id WHERE s.id = ?`, [dose.scheduleId]);
  if (!schedule || schedule.medicine_status !== 'Active' || schedule.profile_status !== 'Active') {
    throw new UserFacingError('This medicine is no longer active.');
  }
  const calendarDose = JSON.parse(schedule.recurring_pattern).kind !== 'hour_interval';
  const params = [dose.scheduleId, dose.date, calendarDose ? 1 : 0, dose.scheduledAtMs];
  const history = await transaction.getFirstAsync(`SELECT * FROM history WHERE schedule_id = ? AND date = ?
    AND (? = 1 OR scheduled_at_ms = ? OR scheduled_at_ms IS NULL) ORDER BY created_at_ms LIMIT 1`, params) || null;
  const snoozes = await transaction.getAllAsync(`SELECT * FROM dose_snoozes WHERE schedule_id = ? AND date = ?
    AND (? = 1 OR scheduled_at_ms = ?) ORDER BY scheduled_at_ms`, params);
  const scheduleKey = JSON.stringify([schedule.medicine_id, schedule.recurring_pattern, schedule.time_local_minute,
    schedule.dose_amount_q, schedule.dose_unit, schedule.stock_remaining_q === null]);
  return { history, snoozes, scheduleKey, stock: schedule.stock_remaining_q, medicineId: schedule.medicine_id, params };
}

export async function changeDoseWithUndo(dose, action, untilMs) {
  if (!['Taken', 'Skipped', 'Reset', 'Snooze'].includes(action)) throw new UserFacingError('Invalid dose action.');
  if (!isCalendarDate(dose.date)) throw new UserFacingError('Dose date must be a valid YYYY-MM-DD date.');
  const db = await initializeDatabase();
  let receipt;
  await withWriteTransaction(db, async transaction => {
    const occurrence = await validatedOccurrence(transaction, dose.scheduleId, dose.date, dose.scheduledAtMs);
    const before = await doseChangeSnapshot(transaction, dose);
    // A menu can remain open while a notification changes the same dose.
    if ((before.history?.status || null) !== dose.status
      || (before.history?.actual_taken_at_ms ?? null) !== dose.actualTakenAtMs
      || (before.snoozes[0]?.until_ms ?? null) !== dose.snoozedUntilMs) {
      throw new UserFacingError('This dose changed. Please reopen its options and try again.');
    }
    if (action === dose.status || (action === 'Reset' && !before.history)) throw new UserFacingError('This dose already has that status.');
    let manualStockCorrectionNeeded = false;
    if (action === 'Snooze') {
      await writeDoseSnooze(transaction, { ...dose, untilMs });
    } else {
      if (before.history) ({ manualStockCorrectionNeeded } = await removeDoseLog(transaction, dose));
      if (action !== 'Reset') {
        // Preserve older record identity and dose quantity/unit snapshots.
        await writeDoseLog(transaction, { ...dose, status: action, actualTakenAtMs: action === 'Taken' ? Date.now() : null }, before.history, occurrence);
      }
    }
    const after = await doseChangeSnapshot(transaction, dose);
    receipt = { dose, before, after, manualStockCorrectionNeeded, consumed: false };
  });
  return receipt;
}

export async function restoreDoseChange(receipt) {
  const db = await initializeDatabase();
  await withWriteTransaction(db, async transaction => {
    const { dose, before, after } = receipt;
    const current = await doseChangeSnapshot(transaction, dose);
    if (receipt.consumed || current.scheduleKey !== after.scheduleKey
      || JSON.stringify(current.history) !== JSON.stringify(after.history)
      || JSON.stringify(current.snoozes) !== JSON.stringify(after.snoozes)) {
      throw new UserFacingError('This dose changed again. Use its options to correct the latest entry.');
    }
    // Reverse only this action's stock delta; preserve other dose deductions.
    if (before.stock !== null && after.stock !== null) {
      const delta = before.stock - after.stock;
      if (current.stock + delta < 0) throw new UserFacingError('Stock changed. Review the medicine before undoing this correction.');
      await transaction.runAsync('UPDATE medicines SET stock_remaining_q = stock_remaining_q + ? WHERE id = ?', [delta, current.medicineId]);
    }
    await transaction.runAsync(`DELETE FROM history WHERE schedule_id = ? AND date = ?
      AND (? = 1 OR scheduled_at_ms = ? OR scheduled_at_ms IS NULL)`, current.params);
    if (before.history) {
      const h = before.history;
      await transaction.runAsync(`INSERT INTO history
        (id, schedule_id, date, scheduled_at_ms, actual_taken_at_ms, status, created_at_ms, stock_deducted_q, dose_snapshot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [h.id, h.schedule_id, h.date, h.scheduled_at_ms, h.actual_taken_at_ms,
        h.status, h.created_at_ms, h.stock_deducted_q, h.dose_snapshot]);
    }
    await transaction.runAsync('DELETE FROM dose_snoozes WHERE schedule_id = ? AND date = ? AND (? = 1 OR scheduled_at_ms = ?)', current.params);
    for (const snooze of before.snoozes) {
      await transaction.runAsync('INSERT INTO dose_snoozes (schedule_id, date, scheduled_at_ms, until_ms) VALUES (?, ?, ?, ?)',
        [snooze.schedule_id, snooze.date, snooze.scheduled_at_ms, snooze.until_ms]);
    }
  });
  receipt.consumed = true;
}

export async function updateDoseLogTime({ historyId, actualTakenAtMs }) {
  const id = requiredText(historyId, 'History ID');
  if (!Number.isSafeInteger(actualTakenAtMs) || actualTakenAtMs < 0 || actualTakenAtMs > Date.now()) {
    throw new UserFacingError('Choose a valid time that is not in the future.');
  }
  const db = await initializeDatabase();
  await withWriteTransaction(db, async transaction => {
    const record = await transaction.getFirstAsync('SELECT date, status FROM history WHERE id = ?', [id]);
    if (!record || record.status !== 'Taken') throw new UserFacingError('Only a recorded Taken dose can have its time edited.');
    if (dateKey(new Date(actualTakenAtMs)) !== record.date) throw new UserFacingError('The time must be on the recorded dose date.');
    await transaction.runAsync('UPDATE history SET actual_taken_at_ms = ? WHERE id = ?', [actualTakenAtMs, id]);
  });
}

export async function snoozeDose(input) {
  const db = await initializeDatabase();
  let result;
  await withWriteTransaction(db, async transaction => { result = await writeDoseSnooze(transaction, input); });
  return result;
}

async function writeDoseSnooze(transaction, { scheduleId, date, scheduledAtMs, untilMs, notificationDeliveredAtMs }) {
  if (!isCalendarDate(date) || !Number.isSafeInteger(untilMs) || untilMs <= Date.now()) throw new UserFacingError('Choose a future snooze time.');
  if (notificationDeliveredAtMs != null && (!Number.isSafeInteger(notificationDeliveredAtMs) || notificationDeliveredAtMs < 0)) throw new UserFacingError('Invalid notification delivery time.');
  let savedUntilMs = untilMs;
  const { row, at } = await validatedOccurrence(transaction, requiredText(scheduleId, 'Schedule ID'), date, scheduledAtMs);
  const calendarDose = JSON.parse(row.recurring_pattern).kind !== 'hour_interval';
  if (await existingDose(transaction, scheduleId, date, at, calendarDose)) throw new UserFacingError('This dose has already been recorded.');
  if (notificationDeliveredAtMs != null) {
    const existing = await transaction.getFirstAsync(`SELECT until_ms FROM dose_snoozes
      WHERE schedule_id = ? AND date = ? AND (? = 1 OR scheduled_at_ms = ?)`, [scheduleId, date, calendarDose ? 1 : 0, at]);
    // Android can replay an old press in a new JS runtime. A notification
    // delivered before the saved snooze deadline cannot extend it again.
    // A subsequent snooze alarm arrives at/after that deadline and may defer it.
    if (existing && notificationDeliveredAtMs < existing.until_ms) {
      savedUntilMs = existing.until_ms;
      return savedUntilMs;
    }
  }
  if (calendarDose) await transaction.runAsync('DELETE FROM dose_snoozes WHERE schedule_id = ? AND date = ?', [scheduleId, date]);
  await transaction.runAsync(`INSERT INTO dose_snoozes (schedule_id, date, scheduled_at_ms, until_ms) VALUES (?, ?, ?, ?)
    ON CONFLICT(schedule_id, date, scheduled_at_ms) DO UPDATE SET until_ms = excluded.until_ms`, [scheduleId, date, at, untilMs]);
  return savedUntilMs;
}

export async function fetchPendingSnoozes() {
  const db = await initializeDatabase();
  const rows = await db.getAllAsync(`SELECT z.*, m.id AS medicine_id FROM dose_snoozes z
    JOIN schedules s ON s.id = z.schedule_id JOIN medicines m ON m.id = s.medicine_id
    JOIN profiles p ON p.id = m.profile_id WHERE m.status = 'Active' AND p.status = 'Active' AND z.until_ms > ?`, [Date.now()]);
  return rows.map(row => ({ scheduleId: row.schedule_id, medicineId: row.medicine_id, date: row.date,
    scheduledAtMs: row.scheduled_at_ms, untilMs: row.until_ms }));
}

/** Real occurrences for a local calendar day, including history and persisted snoozes. */
export async function fetchScheduledDoses(date = dateKey(), profileId) {
  if (!isCalendarDate(date)) throw new UserFacingError('Choose a valid calendar date.');
  const db = await initializeDatabase();
  await withWriteTransaction(db, reconcileMissedHistory, false);
  const medicines = await fetchAllMedicines({ profileId });
  const history = await db.getAllAsync('SELECT * FROM history WHERE date = ? ORDER BY created_at_ms', [date]);
  const snoozes = await db.getAllAsync('SELECT * FROM dose_snoozes WHERE date = ? OR (date < ? AND until_ms >= ? AND until_ms < ?)', [date, date, new Date(`${date}T00:00:00`).getTime(), new Date(`${date}T00:00:00`).setDate(new Date(`${date}T00:00:00`).getDate() + 1)]);
  const doses = [];
  for (const medicine of medicines) {
    if (medicine.status !== 'Active') continue;
    for (const schedule of medicine.schedules) {
      for (const at of occurrencesOnDate(schedule, date)) {
        const record = history.find(h => h.schedule_id === schedule.id && (schedule.pattern.kind !== 'hour_interval' || h.scheduled_at_ms === at || h.scheduled_at_ms == null));
        const snooze = snoozes.find(z => z.schedule_id === schedule.id && (schedule.pattern.kind !== 'hour_interval' || z.scheduled_at_ms === at));
        if (!record && !snooze && !isEligibleOccurrence(schedule.createdAtMs, at)) continue;
        doses.push({ id: `${schedule.id}:${at}`, medicine, schedule, date, scheduledAtMs: at,
          status: record?.status ?? null, actualTakenAtMs: record?.actual_taken_at_ms ?? null,
          snoozedUntilMs: record ? null : snooze?.until_ms ?? null });
      }
    }
  }
  // A snooze crossing midnight still belongs to yesterday's dose, not today's.
  for (const snooze of snoozes.filter(row => row.date !== date)) {
    const medicine = medicines.find(item => item.status === 'Active' && item.schedules.some(schedule => schedule.id === snooze.schedule_id));
    const schedule = medicine?.schedules.find(item => item.id === snooze.schedule_id);
    if (!medicine || !schedule) continue;
    doses.push({ id: `${schedule.id}:${snooze.scheduled_at_ms}`, medicine, schedule, date: snooze.date,
      scheduledAtMs: snooze.scheduled_at_ms, status: null, actualTakenAtMs: null, snoozedUntilMs: snooze.until_ms });
  }
  return doses.sort((a, b) => a.scheduledAtMs - b.scheduledAtMs || a.medicine.name.localeCompare(b.medicine.name));
}

/** Finalize elapsed local days once per schedule, preserving a future snooze.
 * Run inside the edit/status transaction to snapshot the old schedule first.
 * This records absence of a dose log, not evidence of notification delivery.
 */
async function reconcileMissedHistory(transaction) {
  const now = Date.now();
  const today = dateKey(new Date(now));
  const schedules = await transaction.getAllAsync(`SELECT s.*, m.status AS medicine_status,
    p.status AS profile_status, m.dosage_form, m.dose_unit FROM schedules s
    JOIN medicines m ON m.id = s.medicine_id JOIN profiles p ON p.id = m.profile_id
    WHERE s.history_next_date IS NULL OR s.history_next_date < ?`, [today]);
  for (const row of schedules) {
    const pattern = JSON.parse(row.recurring_pattern);
    let nextDate = today;
    const start = row.history_next_date || dateKey(new Date(row.created_at_ms));
    if (row.medicine_status === 'Active' && row.profile_status === 'Active' && pattern.kind !== 'prn') {
      const records = await transaction.getAllAsync('SELECT date, scheduled_at_ms FROM history WHERE schedule_id = ? AND date >= ?', [row.id, start]);
      const recorded = new Set(records.map(h => pattern.kind === 'hour_interval' && h.scheduled_at_ms != null ? `${h.date}:${h.scheduled_at_ms}` : h.date));
      const snoozes = await transaction.getAllAsync('SELECT * FROM dose_snoozes WHERE schedule_id = ? AND date >= ?', [row.id, start]);
      const first = start > pattern.startDate ? start : pattern.startDate;
      for (const day = new Date(`${first}T12:00:00`); dateKey(day) < today; day.setDate(day.getDate() + 1)) {
        const date = dateKey(day);
        if (pattern.endDate && date > pattern.endDate) break;
        for (const at of occurrencesOnDate({ pattern, timeLocalMinute: row.time_local_minute }, date)) {
          if (recorded.has(date) || recorded.has(`${date}:${at}`)) continue;
          const snooze = snoozes.find(z => z.date === date && (pattern.kind !== 'hour_interval' || z.scheduled_at_ms === at));
          if (!snooze && !isEligibleOccurrence(row.created_at_ms, at)) continue;
          if (snooze && snooze.until_ms > now) { if (date < nextDate) nextDate = date; continue; }
          await transaction.runAsync(`INSERT INTO history
            (id, schedule_id, date, scheduled_at_ms, status, created_at_ms, dose_snapshot)
            VALUES (?, ?, ?, ?, 'Missed', ?, ?)`,
          [Crypto.randomUUID(), row.id, date, at, now, JSON.stringify({ amount: row.dose_amount_q, time: row.time_local_minute, form: row.dosage_form, unit: row.dose_unit })]);
          await transaction.runAsync('DELETE FROM dose_snoozes WHERE schedule_id = ? AND date = ? AND (? = 1 OR scheduled_at_ms = ?)', [row.id, date, pattern.kind !== 'hour_interval' ? 1 : 0, at]);
        }
      }
    }
    await transaction.runAsync('UPDATE schedules SET history_next_date = ? WHERE id = ?', [nextDate, row.id]);
  }
}

/** Two History outcomes; legacy Skipped/Missed rows retain stored provenance. */
export async function fetchHistoryByMonth({ from, to, medicineId, profileId } = {}) {
  if ((from && !isCalendarDate(from)) || (to && !isCalendarDate(to))) throw new UserFacingError('Invalid history date range.');
  const db = await initializeDatabase();
  await withWriteTransaction(db, reconcileMissedHistory, false);
  const rows = await db.getAllAsync(`
    SELECT h.id, h.date, h.scheduled_at_ms, h.actual_taken_at_ms, h.status, h.schedule_id, h.dose_snapshot,
           s.time_local_minute, s.dose_amount_q, m.id AS medicine_id,
           m.name AS medicine_name, m.dosage_form, m.dose_unit
      FROM history h JOIN schedules s ON s.id = h.schedule_id
           JOIN medicines m ON m.id = s.medicine_id
     WHERE (? IS NULL OR h.date >= ?) AND (? IS NULL OR h.date <= ?) AND (? IS NULL OR m.id = ?) AND (? IS NULL OR m.profile_id = ?)
     ORDER BY h.date DESC, COALESCE(h.scheduled_at_ms, h.actual_taken_at_ms, h.created_at_ms) DESC, h.created_at_ms DESC
  `, [from ?? null, from ?? null, to ?? null, to ?? null, medicineId ?? null, medicineId ?? null, profileId ?? null, profileId ?? null]);
  const byMonth = new Map();
  for (const row of rows) {
    const snapshot = row.dose_snapshot ? JSON.parse(row.dose_snapshot) : null;
    const month = row.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { month, records: [] });
    byMonth.get(month).records.push({
      id: row.id, date: row.date, scheduledAtMs: row.scheduled_at_ms, actualTakenAtMs: row.actual_taken_at_ms,
      status: row.status === 'Taken' ? 'Taken' : 'Skipped / missed', scheduleId: row.schedule_id,
      scheduledTimeLocalMinute: snapshot ? snapshot.time : row.time_local_minute,
      doseAmount: (snapshot ? snapshot.amount : row.dose_amount_q) / QUANTITY_SCALE,
      medicineId: row.medicine_id, medicineName: row.medicine_name,
      dosageForm: snapshot ? snapshot.form : row.dosage_form, doseUnit: snapshot ? snapshot.unit : row.dose_unit,
    });
  }
  return [...byMonth.values()];
}

function medicineFromRow(row) {
  return {
    id: row.id, profileId: row.profile_id, name: row.name, dosageForm: row.dosage_form,
    strength: row.strength_text, doseUnit: row.dose_unit, purpose: row.purpose,
    instructions: row.instructions, notes: row.notes, color: row.color,
    stockRemaining: row.stock_remaining_q == null ? null : row.stock_remaining_q / QUANTITY_SCALE,
    lowStockThreshold: row.low_stock_threshold_q == null ? null : row.low_stock_threshold_q / QUANTITY_SCALE,
    status: row.status, schedules: [],
  };
}

function scheduleFromRow(row) {
  return {
    id: row.schedule_id, createdAtMs: row.schedule_created_at_ms, timeLocalMinute: row.time_local_minute, reminderEnabled: row.reminder_enabled === 1,
    pattern: JSON.parse(row.recurring_pattern), doseAmount: row.dose_amount_q / QUANTITY_SCALE,
    specialInstructions: row.special_instructions,
  };
}

function profileFromRow(row) {
  return { id: row.id, name: row.name, relationship: row.relationship, color: row.color,
    photoUri: row.photo_uri, dateOfBirth: row.date_of_birth, notes: row.notes, status: row.status };
}

/** Import the former single profile once. Existing medicines retain their owner. */
export async function initializeProfiles(legacyProfile) {
  const db = await initializeDatabase();
  await withWriteTransaction(db, async tx => {
    const settings = await tx.getFirstAsync('SELECT * FROM settings WHERE id = 1');
    if (settings?.profiles_imported) return;
    await tx.runAsync("INSERT OR IGNORE INTO profiles (id,name,relationship,created_at_ms) VALUES ('profile-default','Me','You',?)", [Date.now()]);
    await tx.runAsync("INSERT OR IGNORE INTO settings (id,active_profile_id) VALUES (1,'profile-default')");
    if (legacyProfile?.name?.trim()) {
      await tx.runAsync(`UPDATE profiles SET name = ?, color = ?, photo_uri = ?, date_of_birth = ?, notes = ? WHERE id = 'profile-default'`,
        [legacyProfile.name.trim(), legacyProfile.color, legacyProfile.photoUri, legacyProfile.dateOfBirth, legacyProfile.notes]);
    }
    await tx.runAsync("UPDATE settings SET profiles_imported = 1, active_profile_id = COALESCE(active_profile_id,'profile-default') WHERE id = 1");
  });
}

export async function fetchProfiles() {
  const db = await initializeDatabase();
  const rows = await db.getAllAsync("SELECT * FROM profiles ORDER BY CASE status WHEN 'Active' THEN 0 ELSE 1 END, created_at_ms, id");
  return rows.map(profileFromRow);
}
export async function fetchProfileState() {
  const db = await initializeDatabase();
  const [profiles, setting, doses] = await Promise.all([fetchProfiles(), db.getFirstAsync('SELECT active_profile_id FROM settings WHERE id = 1'), fetchScheduledDoses()]);
  const now = Date.now();
  return { profiles: profiles.map(profile => ({ ...profile, overdueCount: doses.filter(dose => dose.medicine.profileId === profile.id && !dose.status && Math.max(dose.scheduledAtMs, dose.snoozedUntilMs || 0) < now).length })),
    activeProfileId: setting?.active_profile_id ?? null };
}
export async function selectProfile(profileId) {
  const db = await initializeDatabase();
  await withWriteTransaction(db, async tx => {
    const profile = await tx.getFirstAsync("SELECT id FROM profiles WHERE id = ? AND status = 'Active'", [requiredText(profileId, 'Profile')]);
    if (!profile) throw new UserFacingError('Restore this profile before switching to it.');
    await tx.runAsync('UPDATE settings SET active_profile_id = ? WHERE id = 1', [profileId]);
  });
}
export async function saveProfile(input) {
  const name = requiredText(input.name, 'Name');
  if (name.length > 80) throw new UserFacingError('Use a name of 80 characters or fewer.');
  const relationship = (input.relationship || '').trim();
  if (relationship.length > 40 || (input.notes || '').length > 200) throw new UserFacingError('Profile details are too long.');
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) throw new UserFacingError('Choose a valid avatar color.');
  if (input.dateOfBirth && (!isCalendarDate(input.dateOfBirth) || input.dateOfBirth > dateKey() || input.dateOfBirth < '1900-01-01')) throw new UserFacingError('Choose a valid past date of birth.');
  const id = input.id || Crypto.randomUUID();
  const db = await initializeDatabase();
  await withWriteTransaction(db, async tx => {
    if (input.id) {
      const result = await tx.runAsync('UPDATE profiles SET name = ?, relationship = ?, color = ?, photo_uri = ?, date_of_birth = ?, notes = ? WHERE id = ?',
        [name, relationship, input.color, input.photoUri || null, input.dateOfBirth || '', input.notes || '', id]);
      if (!result.changes) throw new UserFacingError('Profile not found.');
    } else {
      await tx.runAsync('INSERT INTO profiles (id,name,relationship,color,photo_uri,date_of_birth,notes,created_at_ms) VALUES (?,?,?,?,?,?,?,?)',
        [id,name,relationship,input.color,input.photoUri || null,input.dateOfBirth || '',input.notes || '',Date.now()]);
      await tx.runAsync('INSERT OR IGNORE INTO settings(id,profiles_imported) VALUES(1,1)');
      await tx.runAsync('UPDATE settings SET active_profile_id = ? WHERE id = 1', [id]);
    }
  });
  return id;
}
export async function setProfileArchived(profileId, archived) {
  const db = await initializeDatabase();
  await withWriteTransaction(db, async tx => {
    await reconcileMissedHistory(tx);
    const profile = await tx.getFirstAsync('SELECT * FROM profiles WHERE id = ?', [profileId]);
    if (!profile) throw new UserFacingError('Profile not found.');
    if (archived) {
      const replacement = await tx.getFirstAsync("SELECT id FROM profiles WHERE id != ? AND status = 'Active' ORDER BY created_at_ms LIMIT 1", [profileId]);
      if (!replacement) throw new UserFacingError('Keep at least one active profile. Add another profile first.');
      await tx.runAsync('UPDATE settings SET active_profile_id = ? WHERE active_profile_id = ?', [replacement.id, profileId]);
      await tx.runAsync('DELETE FROM dose_snoozes WHERE schedule_id IN (SELECT s.id FROM schedules s JOIN medicines m ON m.id = s.medicine_id WHERE m.profile_id = ?)', [profileId]);
    }
    await tx.runAsync('UPDATE profiles SET status = ? WHERE id = ?', [archived ? 'Archived' : 'Active', profileId]);
    await tx.runAsync('UPDATE schedules SET history_next_date = ? WHERE medicine_id IN (SELECT id FROM medicines WHERE profile_id = ?)', [dateKey(), profileId]);
  });
}
