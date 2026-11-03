import type { StoredSchedule } from '@/database';
export function dateKey(date?: Date): string;
export function isDateKey(value: unknown): value is string;
export function occurrencesOnDate(schedule: StoredSchedule, date: string): number[];
export function isEligibleOccurrence(createdAtMs: number | undefined, scheduledAtMs: number): boolean;
export function firstEligibleOccurrence(pattern: StoredSchedule['pattern'], timeLocalMinutes: number[], createdAtMs: number, maxDays?: number): { date: string; scheduledAtMs: number } | null;
