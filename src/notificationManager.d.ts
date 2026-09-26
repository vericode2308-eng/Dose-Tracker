import type { StoredMedicine, StoredSchedule, MedicinePatch, DoseReference } from './database';
import type { Href } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
export const MEDICATION_CHANNEL: string;
export type ReminderStatus = { allowed: boolean; exact: boolean | null; message: string };
export type ReminderResult = ReminderStatus & { scheduled: number; issues: string[] };
export function localDate(date?: Date): string;
export function parseReminderTime(value: number | string): number;
export function recurringTriggers(schedule: StoredSchedule, now?: Date): object[];
export function getReminderStatus(requestPermission?: boolean): Promise<ReminderStatus>;
export function openExactAlarmSettings(): Promise<void>;
export function scheduleMedicineReminders(medicine: StoredMedicine, requestPermission?: boolean): Promise<ReminderResult>;
export function reconcileReminders(): Promise<ReminderResult>;
export function cancelMedicationReminders(): Promise<void>;
export function eraseMedicineDataWithReminders(): Promise<void>;
export function updateMedicineWithReminders(medicineId: string, patch: MedicinePatch): Promise<ReminderResult>;
export function deleteMedicineWithReminders(medicineId: string): Promise<ReminderResult>;
export function doseRouteFromResponse(response: NotificationResponse): Promise<Href | null>;
export function subscribeToReminderTaps(onDose: (route: Href) => void, onError?: (error: unknown) => void): Promise<() => void>;

export function snoozeMedicationDose(dose: DoseReference & { medicineId: string }, minutes?: number): Promise<{ untilMs: number; message: string }>;
export function recordMedicationDose(dose: DoseReference, status: 'Taken' | 'Skipped'): Promise<{ message: string }>;

export function setProfileArchivedWithReminders(profileId: string, archived: boolean): Promise<ReminderResult>;
