import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { dateKey, occurrencesOnDate } from './features/doses/occurrences';

const listeners = new Set();
export function subscribeToDatabaseChanges(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function changed() { for (const listener of listeners) listener(); }
let writes = Promise.resolve();
function withWriteTransaction(db, task) {
  // Web transactions use the shared connection; serialize writes on every platform.
  const result = writes.then(() => Platform.OS === 'web'
    ? db.withTransactionAsync(() => task(db)) : db.withExclusiveTransactionAsync(task));
  writes = result.catch(() => undefined);
  void result.then(changed, () => undefined);
  return result;
}

// All data stays in the app's private on-device SQLite directory.
export const DATABASE_NAME = 'dosetracker.db';
const SCHEMA_VERSION = 3;
const QUANTITY_SCALE = 1_000_000;

let databasePromise;

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function optionalText(value) {
  return value == null || value === '' ? null : requiredText(value, 'Text');
}

function quantityToUnits(value, label) {
  if (value == null) return null;
  const text = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(text)) {
    throw new Error(`${label} must be a nonnegative number with at most six decimal places.`);
  }
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * QUANTITY_SCALE + Number(fraction.padEnd(6, '0'));
  if (!Number.isSafeInteger(result)) throw new Error(`${label} is too large.`);
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
    throw new Error('Recurring pattern must be an object.');
  }
  if (!['daily', 'weekdays', 'day_interval', 'hour_interval', 'prn'].includes(pattern.kind)) {
    throw new Error('Unsupported recurring pattern.');
  }
  if (!isCalendarDate(pattern.startDate)) throw new Error('A valid schedule start date is required.');
  if (pattern.endDate != null && (!isCalendarDate(pattern.endDate) || pattern.endDate < pattern.startDate)) {
    throw new Error('Schedule end date must be on or after the start date.');
  }
  if (pattern.kind === 'weekdays' && (!Array.isArray(pattern.weekdays) || !pattern.weekdays.length || pattern.weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6))) {
    throw new Error('Weekdays must contain day numbers from 0 (Sunday) to 6 (Saturday).');
  }
  if ((pattern.kind === 'day_interval' || pattern.kind === 'hour_interval') && (!Number.isSafeInteger(pattern.interval) || pattern.interval < 1)) {
    throw new Error('Schedule interval must be a positive whole number.');
  }
  return JSON.stringify(pattern);
}

async function migrate(db) {
  // These connection settings match the storage conventions in PLAN.md.
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = (await db.getFirstAsync('PRAGMA user_version'))?.user_version ?? 0;
  if (version > SCHEMA_VERSION) throw new Error('This database was created by a newer app version.');
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
  });
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
    await transaction.execAsync('DELETE FROM dose_snoozes; DELETE FROM history; DELETE FROM schedules; DELETE FROM medicines; DELETE FROM settings; DELETE FROM profiles;');
  });
}

/**
 * Add one medicine and its first schedule atomically.
 * schedule.pattern: { kind, startDate, endDate?, weekdays?, interval? }.
 * timeLocalMinute is 0–1439, or null for an as-needed schedule.
 * Quantities are decimal values in the medicine's dose/stock unit.
 */
export async function addMedicine({ medicine, schedule, profileId }) {
  const name = requiredText(medicine?.name, 'Medicine name');
  const dosageForm = requiredText(medicine?.dosageForm, 'Dosage form');
  const pattern = validatePattern(schedule?.pattern);
  const time = schedule.timeLocalMinute ?? null;
  if (pattern && ((schedule.pattern.kind === 'prn' && time !== null) ||
      (schedule.pattern.kind !== 'prn' && (!Number.isInteger(time) || time < 0 || time > 1439)))) {
    throw new Error('A scheduled dose needs a valid local time; as-needed doses have no fixed time.');
  }
  const stock = quantityToUnits(medicine.stockRemaining, 'Stock remaining');
  const threshold = quantityToUnits(medicine.lowStockThreshold, 'Low-stock threshold');
  const amount = quantityToUnits(schedule.doseAmount, 'Dose amount');
  if (amount === null || amount === 0) throw new Error('Dose amount must be greater than zero.');
  const medicineId = Crypto.randomUUID();
  const scheduleId = Crypto.randomUUID();
  const now = Date.now();
  const db = await initializeDatabase();
  await withWriteTransaction(db, async transaction => {
    const owner = profileId ?? (await transaction.getFirstAsync('SELECT active_profile_id FROM settings WHERE id = 1'))?.active_profile_id;
    const profile = await transaction.getFirstAsync("SELECT id FROM profiles WHERE id = ? AND status = 'Active'", [owner ?? '']);
    if (!profile) throw new Error('Choose an active profile before adding a medicine.');
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
         dose_amount_q, special_instructions, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [scheduleId, medicineId, time, pattern, amount, optionalText(schedule.specialInstructions), now]
    );
  });
  return { medicineId, scheduleId };
}

/** Returns medicine cards with their schedules and stock in ordinary units. */
export async function fetchAllMedicines({ profileId, includeArchivedProfiles = false } = {}) {
  const db = await initializeDatabase();
  const rows = await db.getAllAsync(`
    SELECT m.*, s.id AS schedule_id, s.time_local_minute, s.recurring_pattern,
           s.dose_amount_q, s.special_instructions
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
    SELECT m.*, s.id AS schedule_id, s.time_local_minute, s.recurring_pattern,
           s.dose_amount_q, s.special_instructions
      FROM medicines m LEFT JOIN schedules s ON s.medicine_id = m.id
     WHERE m.id = ? ORDER BY s.time_local_minute
  `, [requiredText(medicineId, 'Medicine ID')]);
  if (!rows.length) return null;
  const medicine = medicineFromRow(rows[0]);
  medicine.schedules = rows.filter(row => row.schedule_id).map(scheduleFromRow);
  return medicine;
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
      if (!['Active', 'Paused', 'Archived'].includes(value)) throw new Error('Invalid medicine status.');
      return value;
    }
    return optionalText(value);
  });
  const db = await initializeDatabase();
  const result = await db.runAsync(`UPDATE medicines SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')} WHERE id = ?`,
    [...values, requiredText(medicineId, 'Medicine ID')]);
  if (!result.changes) throw new Error('Medicine not found.');
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
  if (!row || row.medicine_status !== 'Active' || row.profile_status !== 'Active') throw new Error('This medicine is no longer active.');
  const schedule = { id: row.id, timeLocalMinute: row.time_local_minute, pattern: JSON.parse(row.recurring_pattern) };
  const occurrences = occurrencesOnDate(schedule, date);
  const at = scheduledAtMs ?? (occurrences.length === 1 ? occurrences[0] : null);
  if (!occurrences.includes(at)) throw new Error('This dose does not belong to the selected schedule and date.');
  if (at > Date.now()) throw new Error('This dose is not due yet.');
  return { row, at };
}

async function existingDose(transaction, scheduleId, date, at, calendarDose) {
  // Version 1 only recorded one dose per schedule/day. Keep those records visible.
  return transaction.getFirstAsync(`SELECT id, status FROM history WHERE schedule_id = ? AND date = ?
    AND (? = 1 OR scheduled_at_ms = ? OR scheduled_at_ms IS NULL) ORDER BY created_at_ms LIMIT 1`, [scheduleId, date, calendarDose ? 1 : 0, at]);
}

export async function logDose({ scheduleId, date, scheduledAtMs, actualTakenAtMs = null, status, requestId }) {
  const id = requiredText(scheduleId, 'Schedule ID');
  if (!isCalendarDate(date)) throw new Error('Dose date must be a valid YYYY-MM-DD date.');
  if (!['Taken', 'Skipped', 'Missed'].includes(status)) throw new Error('Invalid dose status.');
  if (status === 'Taken' ? !Number.isSafeInteger(actualTakenAtMs) || actualTakenAtMs < 0 : actualTakenAtMs !== null) {
    throw new Error('Taken doses need an actual UTC time; other statuses must not have one.');
  }
  const db = await initializeDatabase();
  let historyId = requestId == null ? Crypto.randomUUID() : requiredText(requestId, 'Request ID');
  await withWriteTransaction(db, async transaction => {
    const { row: schedule, at } = await validatedOccurrence(transaction, id, date, scheduledAtMs);
    const calendarDose = JSON.parse(schedule.recurring_pattern).kind !== 'hour_interval';
    const existing = await existingDose(transaction, id, date, at, calendarDose);
    if (existing) { historyId = existing.id; return; }
    await transaction.runAsync(
      'INSERT INTO history (id, schedule_id, date, scheduled_at_ms, actual_taken_at_ms, status, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [historyId, id, date, at, actualTakenAtMs, status, Date.now()]);
    await transaction.runAsync('DELETE FROM dose_snoozes WHERE schedule_id = ? AND date = ? AND (? = 1 OR scheduled_at_ms = ?)', [id, date, calendarDose ? 1 : 0, at]);
    if (status === 'Taken') {
      await transaction.runAsync(`UPDATE medicines SET stock_remaining_q = max(0, stock_remaining_q - ?)
        WHERE id = ? AND stock_remaining_q IS NOT NULL`, [schedule.dose_amount_q, schedule.medicine_id]);
    }
  });
  return historyId;
}

export async function snoozeDose({ scheduleId, date, scheduledAtMs, untilMs }) {
  if (!isCalendarDate(date) || !Number.isSafeInteger(untilMs) || untilMs <= Date.now()) throw new Error('Choose a future snooze time.');
  const db = await initializeDatabase();
  await withWriteTransaction(db, async transaction => {
    const { row, at } = await validatedOccurrence(transaction, requiredText(scheduleId, 'Schedule ID'), date, scheduledAtMs);
    const calendarDose = JSON.parse(row.recurring_pattern).kind !== 'hour_interval';
    if (await existingDose(transaction, scheduleId, date, at, calendarDose)) throw new Error('This dose has already been recorded.');
    if (calendarDose) await transaction.runAsync('DELETE FROM dose_snoozes WHERE schedule_id = ? AND date = ?', [scheduleId, date]);
    await transaction.runAsync(`INSERT INTO dose_snoozes (schedule_id, date, scheduled_at_ms, until_ms) VALUES (?, ?, ?, ?)
      ON CONFLICT(schedule_id, date, scheduled_at_ms) DO UPDATE SET until_ms = excluded.until_ms`, [scheduleId, date, at, untilMs]);
  });
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
  if (!isCalendarDate(date)) throw new Error('Choose a valid calendar date.');
  const db = await initializeDatabase();
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

/** Returns [{ month: 'YYYY-MM', records: [...] }] newest first. */
export async function fetchHistoryByMonth({ from, to, medicineId, profileId } = {}) {
  if ((from && !isCalendarDate(from)) || (to && !isCalendarDate(to))) throw new Error('Invalid history date range.');
  const db = await initializeDatabase();
  const rows = await db.getAllAsync(`
    SELECT h.id, h.date, h.scheduled_at_ms, h.actual_taken_at_ms, h.status, h.schedule_id,
           s.time_local_minute, s.dose_amount_q, m.id AS medicine_id,
           m.name AS medicine_name, m.dosage_form, m.dose_unit
      FROM history h JOIN schedules s ON s.id = h.schedule_id
           JOIN medicines m ON m.id = s.medicine_id
     WHERE (? IS NULL OR h.date >= ?) AND (? IS NULL OR h.date <= ?) AND (? IS NULL OR m.id = ?) AND (? IS NULL OR m.profile_id = ?)
     ORDER BY h.date DESC, COALESCE(h.scheduled_at_ms, h.actual_taken_at_ms, h.created_at_ms) DESC, h.created_at_ms DESC
  `, [from ?? null, from ?? null, to ?? null, to ?? null, medicineId ?? null, medicineId ?? null, profileId ?? null, profileId ?? null]);
  const byMonth = new Map();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { month, records: [] });
    byMonth.get(month).records.push({
      id: row.id, date: row.date, scheduledAtMs: row.scheduled_at_ms, actualTakenAtMs: row.actual_taken_at_ms,
      status: row.status, scheduleId: row.schedule_id,
      scheduledTimeLocalMinute: row.time_local_minute,
      doseAmount: row.dose_amount_q / QUANTITY_SCALE,
      medicineId: row.medicine_id, medicineName: row.medicine_name,
      dosageForm: row.dosage_form, doseUnit: row.dose_unit,
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
    id: row.schedule_id, timeLocalMinute: row.time_local_minute,
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
    if (!profile) throw new Error('Restore this profile before switching to it.');
    await tx.runAsync('UPDATE settings SET active_profile_id = ? WHERE id = 1', [profileId]);
  });
}
export async function saveProfile(input) {
  const name = requiredText(input.name, 'Name');
  if (name.length > 80) throw new Error('Use a name of 80 characters or fewer.');
  const relationship = (input.relationship || '').trim();
  if (relationship.length > 40 || (input.notes || '').length > 200) throw new Error('Profile details are too long.');
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) throw new Error('Choose a valid avatar color.');
  if (input.dateOfBirth && (!isCalendarDate(input.dateOfBirth) || input.dateOfBirth > dateKey() || input.dateOfBirth < '1900-01-01')) throw new Error('Choose a valid past date of birth.');
  const id = input.id || Crypto.randomUUID();
  const db = await initializeDatabase();
  await withWriteTransaction(db, async tx => {
    if (input.id) {
      const result = await tx.runAsync('UPDATE profiles SET name = ?, relationship = ?, color = ?, photo_uri = ?, date_of_birth = ?, notes = ? WHERE id = ?',
        [name, relationship, input.color, input.photoUri || null, input.dateOfBirth || '', input.notes || '', id]);
      if (!result.changes) throw new Error('Profile not found.');
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
    const profile = await tx.getFirstAsync('SELECT * FROM profiles WHERE id = ?', [profileId]);
    if (!profile) throw new Error('Profile not found.');
    if (archived) {
      const replacement = await tx.getFirstAsync("SELECT id FROM profiles WHERE id != ? AND status = 'Active' ORDER BY created_at_ms LIMIT 1", [profileId]);
      if (!replacement) throw new Error('Keep at least one active profile. Add another profile first.');
      await tx.runAsync('UPDATE settings SET active_profile_id = ? WHERE active_profile_id = ?', [replacement.id, profileId]);
      await tx.runAsync('DELETE FROM dose_snoozes WHERE schedule_id IN (SELECT s.id FROM schedules s JOIN medicines m ON m.id = s.medicine_id WHERE m.profile_id = ?)', [profileId]);
    }
    await tx.runAsync('UPDATE profiles SET status = ? WHERE id = ?', [archived ? 'Archived' : 'Active', profileId]);
  });
}
