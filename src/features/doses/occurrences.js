// Calendar calculations shared by SQLite queries and action validation.
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isFinite(parsed.getTime()) && dateKey(parsed) === value;
}
export function occurrencesOnDate(schedule, date) {
  if (!isDateKey(date)) throw new Error('Choose a valid calendar date.');
  const { pattern, timeLocalMinute: minute } = schedule;
  if (pattern.kind === 'prn' || minute == null || date < pattern.startDate || (pattern.endDate && date > pattern.endDate)) return [];
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  if (pattern.kind === 'weekdays' && !pattern.weekdays?.includes(start.getDay())) return [];
  if (pattern.kind === 'day_interval') {
    const days = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${pattern.startDate}T00:00:00Z`)) / 86400000;
    if (days % pattern.interval !== 0) return [];
  }
  if (pattern.kind === 'hour_interval') {
    const anchor = new Date(`${pattern.startDate}T00:00:00`);
    anchor.setMinutes(minute);
    const intervalMs = pattern.interval * 3600000;
    if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) throw new Error('Invalid hourly interval.');
    const first = anchor.getTime() + Math.max(0, Math.ceil((start.getTime() - anchor.getTime()) / intervalMs)) * intervalMs;
    const result = [];
    for (let at = first; at < end.getTime(); at += intervalMs) result.push(at);
    return result;
  }
  start.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return [start.getTime()];
}

// Times are selected to the minute: saving during that minute keeps it eligible.
// This is a fixed creation boundary, never a moving cutoff that hides overdue doses.
export function isEligibleOccurrence(createdAtMs, scheduledAtMs) {
  return createdAtMs == null || scheduledAtMs >= Math.floor(createdAtMs / 60000) * 60000;
}
