import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { handleReminderAction } from '@/notificationManager';
import { recordReminderIssue } from '@/database';

const TASK_NAME = 'dosetracker_reminder_actions';

if (Platform.OS === 'android') {
  if (!TaskManager.isTaskDefined(TASK_NAME)) {
    TaskManager.defineTask<Notifications.NotificationTaskPayload>(TASK_NAME, async ({ data, error }) => {
      if (error || !data || !('actionIdentifier' in data)) return;
      try {
        await handleReminderAction(data);
      } catch {
        await recordReminderIssue('action_failed', 'A notification action could not be completed. Open the app and try again.').catch(() => undefined);
      }
    });
  }
  void Notifications.registerTaskAsync(TASK_NAME).catch(() => {
    void recordReminderIssue('action_registration_failed', 'Notification action setup failed. Open the app to retry.').catch(() => undefined);
  });
}
