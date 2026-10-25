/** "09:00" or "09:00, 21:00" (24-hour storage) → the device's time format, e.g. "9:00 AM, 9:00 PM". */
export function formatClockList(value: string): string {
  return value.split(',').map(part => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(part.trim());
    if (!match) return part.trim();
    const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }).join(', ');
}

/** "2026-10-25" → "Oct 25, 2026" in the device's locale; other text is returned unchanged. */
export function formatDateKey(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    .toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
