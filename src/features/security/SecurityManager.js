import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const APP_LOCK_KEY = 'doseTracker.appLock.v1';
const STORE_OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function checkSupport() {
  if (Platform.OS === 'web') return { available: false, hasBiometrics: false, biometricEnrolled: false, hasDeviceCredential: false };
  const [hasBiometrics, biometricEnrolled, level] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);
  // SECRET is a PIN, pattern, or passcode. Biometric enrollment normally also requires a device credential.
  const hasDeviceCredential = level !== LocalAuthentication.SecurityLevel.NONE;
  return { available: hasDeviceCredential, hasBiometrics, biometricEnrolled, hasDeviceCredential };
}

export async function isAuthEnabled() {
  if (Platform.OS === 'web') return false;
  const value = await SecureStore.getItemAsync(APP_LOCK_KEY, STORE_OPTIONS);
  if (value === null || value === 'off') return false;
  if (value === 'on') return true;
  throw new Error('The secure app-lock setting could not be read.');
}

export async function setAuthEnabled(enabled) {
  if (Platform.OS === 'web') throw new Error('Device authentication is unavailable on web.');
  await SecureStore.setItemAsync(APP_LOCK_KEY, enabled ? 'on' : 'off', STORE_OPTIONS);
}

export async function clearAuthEnabled() {
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(APP_LOCK_KEY, STORE_OPTIONS);
}

export async function authenticateUser() {
  if (Platform.OS === 'web') return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock DoseTracker',
      promptDescription: 'Confirm your identity to access health information.',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });
    return result.success === true;
  } catch {
    return false;
  }
}
