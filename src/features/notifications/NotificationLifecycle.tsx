import { useEffect, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { reconcileReminders, subscribeToReminderTaps } from '@/notificationManager';

export function NotificationLifecycle() {
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | undefined;
    const onError = () => { if (active) setError('Reminder setup needs attention. Open Settings to retry.'); };
    subscribeToReminderTaps(route => router.push(route), onError).then(cleanup => {
      if (active) dispose = cleanup;
      else cleanup();
    }).catch(onError);
    async function reconcile() {
      try {
        const result = await reconcileReminders();
        if (active) setError(result.issues.length ? result.issues[0] : '');
      } catch { onError(); }
    }
    void reconcile();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void reconcile(); });
    return () => { active = false; dispose?.(); subscription.remove(); };
  }, []);
  return error ? <View className="bg-[#FFF0D8] px-4 py-3"><Pressable accessibilityRole="button" onPress={() => router.push('/settings')}><Text className="text-sm text-[#713F12]">{error}</Text></Pressable></View> : null;
}
