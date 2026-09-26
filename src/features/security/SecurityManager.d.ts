export type DeviceSupport = {
  available: boolean;
  hasBiometrics: boolean;
  biometricEnrolled: boolean;
  hasDeviceCredential: boolean;
};
export function checkSupport(): Promise<DeviceSupport>;
export function isAuthEnabled(): Promise<boolean>;
export function setAuthEnabled(enabled: boolean): Promise<void>;
export function clearAuthEnabled(): Promise<void>;
export function authenticateUser(): Promise<boolean>;
