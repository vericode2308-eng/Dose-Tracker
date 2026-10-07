import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@dosetracker/settings/v1';

export type SettingsPreferences = {
  theme: 'system' | 'light' | 'dark';
  remindersEnabled: boolean;
  snoozeMinutes: 5 | 10 | 15 | 30;
  notificationPrivacy: 'show' | 'hide' | 'none';
  reminderSound: 'default' | 'gentle' | 'clear' | 'silent';
  vibrationEnabled: boolean;
  reminderRinging?: boolean;
};

export const DEFAULT_SETTINGS: SettingsPreferences = {
  theme: 'system',
  remindersEnabled: true,
  snoozeMinutes: 10,
  notificationPrivacy: 'show',
  reminderSound: 'default',
  vibrationEnabled: true,
  reminderRinging: false,
};

export async function readSettings(): Promise<SettingsPreferences> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_SETTINGS;
  const value: unknown = JSON.parse(raw);
  // Existing local installs predate the reminder switch.
  if (isSettings(value)) return preferencesOnly(value);
  if (isLegacySettings(value)) return migrateLegacySettings(value);
  throw new Error('Saved settings could not be read.');
}

export async function writeSettings(value: SettingsPreferences): Promise<void> {
  if (!isSettings(value)) throw new Error('Invalid preferences.');
  await AsyncStorage.setItem(KEY, JSON.stringify(preferencesOnly(value)));
}

export function preferencesOnly(value: SettingsPreferences): SettingsPreferences {
  const { theme, remindersEnabled, snoozeMinutes, notificationPrivacy, reminderSound, vibrationEnabled } = value;
  return { theme, remindersEnabled, snoozeMinutes, notificationPrivacy, reminderSound, vibrationEnabled,
    reminderRinging: value.reminderRinging ?? false };
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function isSettings(value: unknown): value is SettingsPreferences {
  if (!value || typeof value !== 'object') return false;
  const item = value as SettingsPreferences;
  return typeof item.remindersEnabled === 'boolean' &&
    ['system', 'light', 'dark'].includes(item.theme) &&
    [5, 10, 15, 30].includes(item.snoozeMinutes) &&
    ['show', 'hide', 'none'].includes(item.notificationPrivacy) &&
    ['default', 'gentle', 'clear', 'silent'].includes(item.reminderSound) &&
    typeof item.vibrationEnabled === 'boolean' &&
    (item.reminderRinging === undefined || typeof item.reminderRinging === 'boolean');
}

export function migrateLegacySettings(value: unknown): SettingsPreferences {
  if (!isLegacySettings(value)) throw new Error('Invalid legacy preferences.');
  return { theme: value.theme, remindersEnabled: value.remindersEnabled ?? true,
    snoozeMinutes: value.snoozeMinutes, notificationPrivacy: value.notificationPrivacy,
    reminderSound: value.soundAndVibration ? 'default' : 'silent', vibrationEnabled: value.soundAndVibration, reminderRinging: false };
}

export function isLegacySettings(value: unknown): value is {
  theme: SettingsPreferences['theme']; remindersEnabled?: boolean; snoozeMinutes: SettingsPreferences['snoozeMinutes'];
  notificationPrivacy: 'show' | 'hide'; soundAndVibration: boolean;
} {
  if (!value || typeof value !== 'object') return false;
  const item = value as SettingsPreferences & { soundAndVibration?: boolean };
  return ['system', 'light', 'dark'].includes(item.theme) &&
    [5, 10, 15, 30].includes(item.snoozeMinutes) &&
    ['show', 'hide'].includes(item.notificationPrivacy) &&
    typeof item.soundAndVibration === 'boolean' &&
    (item.remindersEnabled === undefined || typeof item.remindersEnabled === 'boolean');
}
