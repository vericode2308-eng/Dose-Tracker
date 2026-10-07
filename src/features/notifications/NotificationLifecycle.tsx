import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { reconcileReminders, subscribeToReminderTaps } from '@/notificationManager';
import { measureDiagnosticOperation } from '@/features/diagnostics/diagnostics';
import { recordReminderIssue } from '@/database';

export function NotificationLifecycle() {
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | undefined;
    const recordTapError = () => { void recordReminderIssue('action_failed', 'A reminder action could not be completed. Open Reminder status to retry.').catch(() => undefined); };
    subscribeToReminderTaps(route => router.push(route), recordTapError).then(cleanup => {
      if (active) dispose = cleanup;
      else cleanup();
    }).catch(recordTapError);
    async function reconcile() {
      try {
        await measureDiagnosticOperation('reminders.reconcile', reconcileReminders);
      } catch { /* Reminder status remains available in Settings. */ }
    }
    void reconcile();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void reconcile(); });
    return () => { active = false; dispose?.(); subscription.remove(); };
  }, []);
  return null;
}
