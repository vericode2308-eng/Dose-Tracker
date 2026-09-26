import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@dosetracker/settings/v1';

export type SettingsPreferences = {
  theme: 'system' | 'light' | 'dark';
  remindersEnabled: boolean;
  snoozeMinutes: 5 | 10 | 15 | 30;
  notificationPrivacy: 'show' | 'hide';
  soundAndVibration: boolean;
};

export const DEFAULT_SETTINGS: SettingsPreferences = {
  theme: 'system',
  remindersEnabled: true,
  snoozeMinutes: 10,
  notificationPrivacy: 'show',
  soundAndVibration: true,
};

export async function readSettings(): Promise<SettingsPreferences> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_SETTINGS;
  const value: unknown = JSON.parse(raw);
  // Existing local installs predate the reminder switch.
  if (isSettings(value)) return preferencesOnly(value);
  if (isLegacySettings(value) && !('remindersEnabled' in value)) return { ...value, remindersEnabled: true };
  throw new Error('Saved settings could not be read.');
}

export async function writeSettings(value: SettingsPreferences): Promise<void> {
  if (!isSettings(value)) throw new Error('Invalid preferences.');
  await AsyncStorage.setItem(KEY, JSON.stringify(preferencesOnly(value)));
}

export function preferencesOnly(value: SettingsPreferences): SettingsPreferences {
  const { theme, remindersEnabled, snoozeMinutes, notificationPrivacy, soundAndVibration } = value;
  return { theme, remindersEnabled, snoozeMinutes, notificationPrivacy, soundAndVibration };
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function isSettings(value: unknown): value is SettingsPreferences {
  if (!value || typeof value !== 'object') return false;
  const item = value as SettingsPreferences;
  return typeof item.remindersEnabled === 'boolean' && isLegacySettings(item);
}

function isLegacySettings(value: unknown): value is Omit<SettingsPreferences, 'remindersEnabled'> {
  if (!value || typeof value !== 'object') return false;
  const item = value as SettingsPreferences;
  return ['system', 'light', 'dark'].includes(item.theme) &&
    [5, 10, 15, 30].includes(item.snoozeMinutes) &&
    ['show', 'hide'].includes(item.notificationPrivacy) &&
    typeof item.soundAndVibration === 'boolean';
}
