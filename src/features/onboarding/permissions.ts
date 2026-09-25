import { Platform } from 'react-native';
import type { NotificationChoice } from './model';

export async function requestLocalNotifications(): Promise<NotificationChoice> {
  if (Platform.OS === 'web') return 'unavailable';
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication reminders', importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const result = existing.granted || !existing.canAskAgain
    ? existing : await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ? 'granted' : 'denied';
}
