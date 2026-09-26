import { Platform } from 'react-native';
import type { NotificationChoice } from './model';
import { getReminderStatus } from '@/notificationManager';

export async function requestLocalNotifications(): Promise<NotificationChoice> {
  if (Platform.OS === 'web') return 'unavailable';
  return (await getReminderStatus(true)).allowed ? 'granted' : 'denied';
}
