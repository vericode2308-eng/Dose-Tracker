import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_DATA, isOnboardingData, type OnboardingData } from './model';

const STORAGE_KEY = '@dosetracker/onboarding/v1';

export async function readOnboarding(): Promise<OnboardingData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return INITIAL_DATA;
  const parsed: unknown = JSON.parse(raw);
  if (!isOnboardingData(parsed)) throw new Error('Saved setup could not be read.');
  return parsed;
}

export async function writeOnboarding(data: OnboardingData): Promise<void> {
  if (!isOnboardingData(data)) throw new Error('Invalid setup preferences.');
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(onboardingFlags(data)));
}

/** SQLite owns personal data. Persist only the setup allowlist, including on upgrades. */
export function onboardingFlags(data: OnboardingData): OnboardingData {
  return { version: 1, completed: data.completed, notificationChoice: data.notificationChoice, profile: null };
}

export async function clearOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
