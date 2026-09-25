import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

// All data stays in the app's private on-device SQLite directory.
export const DATABASE_NAME = 'dosetracker.db';
const SCHEMA_VERSION = 1;
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

  await db.withExclusiveTransactionAsync(async transaction => {
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
  await db.withExclusiveTransactionAsync(async transaction => {
    await transaction.execAsync('DELETE FROM history; DELETE FROM schedules; DELETE FROM medicines; DELETE FROM settings;');
  });
}

/**
 * Add one medicine and its first schedule atomically.
 * schedule.pattern: { kind, startDate, endDate?, weekdays?, interval? }.
 * timeLocalMinute is 0–1439, or null for an as-needed schedule.
 * Quantities are decimal values in the medicine's dose/stock unit.
 */
export async function addMedicine({ medicine, schedule }) {
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
  await db.withExclusiveTransactionAsync(async transaction => {
    await transaction.runAsync(
      `INSERT INTO medicines (id, name, dosage_form, strength_text, dose_unit, purpose, instructions,
         notes, color, stock_remaining_q, low_stock_threshold_q, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [medicineId, name, dosageForm, optionalText(medicine.strength), optionalText(medicine.doseUnit),
        optionalText(medicine.purpose), optionalText(medicine.instructions), optionalText(medicine.notes),
        optionalText(medicine.color), stock, threshold, now]
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
export async function fetchAllMedicines() {
  const db = await initializeDatabase();
  const rows = await db.getAllAsync(`
    SELECT m.*, s.id AS schedule_id, s.time_local_minute, s.recurring_pattern,
           s.dose_amount_q, s.special_instructions
      FROM medicines m LEFT JOIN schedules s ON s.medicine_id = m.id
     ORDER BY m.name COLLATE NOCASE, s.time_local_minute
  `);
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

/** Records a dose and deducts tracked stock for Taken entries in one transaction.
 * Pass the same requestId when retrying an action to avoid a second stock deduction.
 */
export async function logDose({ scheduleId, date, actualTakenAtMs = null, status, requestId }) {
  const id = requiredText(scheduleId, 'Schedule ID');
  if (!isCalendarDate(date)) throw new Error('Dose date must be a valid YYYY-MM-DD date.');
  if (!['Taken', 'Skipped', 'Missed'].includes(status)) throw new Error('Invalid dose status.');
  if (status === 'Taken' ? !Number.isSafeInteger(actualTakenAtMs) || actualTakenAtMs < 0 : actualTakenAtMs !== null) {
    throw new Error('Taken doses need an actual UTC time; other statuses must not have one.');
  }
  const db = await initializeDatabase();
  const historyId = requestId == null ? Crypto.randomUUID() : requiredText(requestId, 'Request ID');
  await db.withExclusiveTransactionAsync(async transaction => {
    const existing = await transaction.getFirstAsync('SELECT id FROM history WHERE id = ?', [historyId]);
    if (existing) return;
    const schedule = await transaction.getFirstAsync(
      'SELECT medicine_id, dose_amount_q FROM schedules WHERE id = ?', [id]
    );
    if (!schedule) throw new Error('Schedule not found.');
    await transaction.runAsync(
      'INSERT INTO history (id, schedule_id, date, actual_taken_at_ms, status, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)',
      [historyId, id, date, actualTakenAtMs, status, Date.now()]
    );
    if (status === 'Taken') {
      // A dose is still recorded if stock is insufficient, as specified by PLAN.md.
      await transaction.runAsync(
        `UPDATE medicines SET stock_remaining_q = max(0, stock_remaining_q - ?)
          WHERE id = ? AND stock_remaining_q IS NOT NULL`,
        [schedule.dose_amount_q, schedule.medicine_id]
      );
    }
  });
  return historyId;
}

/** Returns [{ month: 'YYYY-MM', records: [...] }] newest first. */
export async function fetchHistoryByMonth() {
  const db = await initializeDatabase();
  const rows = await db.getAllAsync(`
    SELECT h.id, h.date, h.actual_taken_at_ms, h.status, h.schedule_id,
           s.time_local_minute, s.dose_amount_q, m.id AS medicine_id,
           m.name AS medicine_name, m.dosage_form
      FROM history h JOIN schedules s ON s.id = h.schedule_id
           JOIN medicines m ON m.id = s.medicine_id
     ORDER BY h.date DESC, COALESCE(h.actual_taken_at_ms, h.created_at_ms) DESC
  `);
  const byMonth = new Map();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { month, records: [] });
    byMonth.get(month).records.push({
      id: row.id, date: row.date, actualTakenAtMs: row.actual_taken_at_ms,
      status: row.status, scheduleId: row.schedule_id,
      scheduledTimeLocalMinute: row.time_local_minute,
      doseAmount: row.dose_amount_q / QUANTITY_SCALE,
      medicineId: row.medicine_id, medicineName: row.medicine_name,
      dosageForm: row.dosage_form,
    });
  }
  return [...byMonth.values()];
}

function medicineFromRow(row) {
  return {
    id: row.id, name: row.name, dosageForm: row.dosage_form,
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
