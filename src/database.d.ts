import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME: string;
export function initializeDatabase(): Promise<SQLiteDatabase>;

export type RecurringPattern = {
  kind: 'daily' | 'weekdays' | 'day_interval' | 'hour_interval' | 'prn';
  startDate: string;
  endDate?: string;
  /** Sunday = 0, Saturday = 6. Required for weekdays. */
  weekdays?: number[];
  /** Positive whole number. Required for interval patterns. */
  interval?: number;
};

export type MedicineInput = {
  name: string;
  dosageForm: string;
  strength?: string;
  doseUnit?: string;
  purpose?: string;
  instructions?: string;
  notes?: string;
  color?: string;
  /** Null means stock tracking is off. */
  stockRemaining?: number | string | null;
  lowStockThreshold?: number | string | null;
};

export type ScheduleInput = {
  pattern: RecurringPattern;
  /** Minutes after midnight, or null for as-needed. */
  timeLocalMinute?: number | null;
  doseAmount: number | string;
  specialInstructions?: string;
};

export type StoredSchedule = {
  id: string;
  timeLocalMinute: number | null;
  pattern: RecurringPattern;
  doseAmount: number;
  specialInstructions: string | null;
};

export type StoredMedicine = {
  id: string;
  name: string;
  dosageForm: string;
  strength: string | null;
  doseUnit: string | null;
  purpose: string | null;
  instructions: string | null;
  notes: string | null;
  color: string | null;
  stockRemaining: number | null;
  lowStockThreshold: number | null;
  status: 'Active' | 'Paused' | 'Archived';
  schedules: StoredSchedule[];
};

export function addMedicine(input: {
  medicine: MedicineInput;
  schedule: ScheduleInput;
}): Promise<{ medicineId: string; scheduleId: string }>;
export function fetchAllMedicines(): Promise<StoredMedicine[]>;
export function fetchMedicineDetails(medicineId: string): Promise<StoredMedicine | null>;
export function logDose(input: {
  scheduleId: string;
  date: string;
  actualTakenAtMs?: number | null;
  status: 'Taken' | 'Skipped' | 'Missed';
  /** Reuse this UUID when retrying a dose action. */
  requestId?: string;
}): Promise<string>;
export function fetchHistoryByMonth(): Promise<{
  month: string;
  records: {
    id: string;
    date: string;
    actualTakenAtMs: number | null;
    status: 'Taken' | 'Skipped' | 'Missed';
    scheduleId: string;
    scheduledTimeLocalMinute: number | null;
    doseAmount: number;
    medicineId: string;
    medicineName: string;
    dosageForm: string;
  }[];
}[]>;
