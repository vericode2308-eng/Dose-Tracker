export const AVATAR_COLORS = ['#08B8BE', '#FF8585', '#4299FA', '#FF9E22', '#8B48EF', '#64748B'];

export type Profile = {
  name: string;
  color: string;
  photoUri: string | null;
  dateOfBirth: string;
  notes: string;
};

export type NotificationChoice = 'pending' | 'granted' | 'denied' | 'skipped' | 'unavailable';
export type OnboardingData = {
  version: 1;
  profile: Profile | null;
  notificationChoice: NotificationChoice;
  completed: boolean;
};

export const EMPTY_PROFILE: Profile = {
  name: '', color: AVATAR_COLORS[0], photoUri: null, dateOfBirth: '', notes: '',
};

export const INITIAL_DATA: OnboardingData = {
  version: 1, profile: null, notificationChoice: 'pending', completed: false,
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'ME';
}

// A date-only value avoids changing someone's birthday across time zones.
export function validBirthday(value: string, today = new Date()): boolean {
  if (!value.trim()) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return year >= 1900 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date <= today;
}

export function isOnboardingData(value: unknown): value is OnboardingData {
  if (!value || typeof value !== 'object') return false;
  const data = value as OnboardingData;
  const p = data.profile;
  return data.version === 1 && typeof data.completed === 'boolean' &&
    ['pending', 'granted', 'denied', 'skipped', 'unavailable'].includes(data.notificationChoice) &&
    (p === null || (typeof p === 'object' && typeof p.name === 'string' && typeof p.color === 'string' &&
      (p.photoUri === null || typeof p.photoUri === 'string') && typeof p.dateOfBirth === 'string' && typeof p.notes === 'string'));
}
