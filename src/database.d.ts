import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME: string;
export function initializeDatabase(): Promise<SQLiteDatabase>;
export function clearDatabase(): Promise<void>;
export type ReminderIssue = { code: string; message: string; firstSeenMs: number; lastSeenMs: number; occurrences: number };
export function recordReminderIssue(code: string, message: string): Promise<void>;
export function fetchRecentReminderIssues(days?: number): Promise<ReminderIssue[]>;
export function subscribeToDatabaseChanges(listener: () => void): () => void;

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
  profileId: string;
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
  profileId?: string;
  medicine: MedicineInput;
  schedule: ScheduleInput;
}): Promise<{ medicineId: string; scheduleId: string }>;
export function fetchAllMedicines(filters?: { profileId?: string; includeArchivedProfiles?: boolean }): Promise<StoredMedicine[]>;
export function fetchMedicineDetails(medicineId: string): Promise<StoredMedicine | null>;
export type MedicinePatch = Partial<Pick<StoredMedicine, 'name' | 'strength' | 'notes' | 'stockRemaining' | 'status'>>;
export function updateMedicine(medicineId: string, patch: MedicinePatch): Promise<void>;
export function deleteMedicine(medicineId: string): Promise<void>;
export function logDose(input: {
  scheduleId: string;
  date: string;
  scheduledAtMs?: number;
  actualTakenAtMs?: number | null;
  status: 'Taken' | 'Skipped' | 'Missed';
  /** Reuse this UUID when retrying a dose action. */
  requestId?: string;
}): Promise<string>;
export type ScheduledDose = {
  id: string; medicine: StoredMedicine; schedule: StoredSchedule; date: string;
  scheduledAtMs: number; status: 'Taken' | 'Skipped' | 'Missed' | null;
  actualTakenAtMs: number | null; snoozedUntilMs: number | null;
};
export type DoseReference = { scheduleId: string; date: string; scheduledAtMs: number };
export type PendingSnooze = DoseReference & { medicineId: string; untilMs: number };
export function snoozeDose(input: DoseReference & { untilMs: number }): Promise<void>;
export function undoDoseLog(input: DoseReference): Promise<void>;
export function fetchPendingSnoozes(): Promise<PendingSnooze[]>;
export function fetchScheduledDoses(date?: string, profileId?: string): Promise<ScheduledDose[]>;
export type HistoryRecord = {
  id: string; date: string; scheduledAtMs: number | null; actualTakenAtMs: number | null;
  status: 'Taken' | 'Skipped' | 'Missed'; scheduleId: string; scheduledTimeLocalMinute: number | null;
  doseAmount: number; medicineId: string; medicineName: string; dosageForm: string; doseUnit: string | null;
};
export function fetchHistoryByMonth(filters?: { from?: string; to?: string; medicineId?: string; profileId?: string }): Promise<{ month: string; records: HistoryRecord[] }[]>;

export type LocalProfile = { id: string; name: string; relationship: string; color: string; photoUri: string | null; dateOfBirth: string; notes: string; status: 'Active' | 'Archived' };
export type ProfileSummary = LocalProfile & { overdueCount: number };
export function initializeProfiles(legacyProfile?: { name: string; color: string; photoUri: string | null; dateOfBirth: string; notes: string } | null): Promise<void>;
export function fetchProfiles(): Promise<LocalProfile[]>;
export function fetchProfileState(): Promise<{ profiles: ProfileSummary[]; activeProfileId: string | null }>;
export function selectProfile(profileId: string): Promise<void>;
export function saveProfile(profile: Omit<LocalProfile, 'id' | 'status'> & { id?: string }): Promise<string>;
export function setProfileArchived(profileId: string, archived: boolean): Promise<void>;
