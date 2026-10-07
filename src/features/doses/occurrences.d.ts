import type { StoredSchedule } from '@/database';
export function dateKey(date?: Date): string;
export function isDateKey(value: unknown): value is string;
export function occurrencesOnDate(schedule: StoredSchedule, date: string): number[];
export function isEligibleOccurrence(createdAtMs: number | undefined, scheduledAtMs: number): boolean;
