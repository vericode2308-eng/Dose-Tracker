import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/features/ui/navigation';

// A link straight to a sub-screen (e.g. /reminder-status) still has Settings to go back to.
export const unstable_settings = { initialRouteName: 'settings' };

export default function SettingsLayout() {
  const screenOptions = useStackScreenOptions();
  const detail = { headerLargeTitleEnabled: false };
  return <Stack screenOptions={screenOptions}>
    <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    <Stack.Screen name="notification-privacy" options={{ ...detail, title: 'Notification Privacy' }} />
    <Stack.Screen name="reminder-sound" options={{ ...detail, title: 'Sound & Vibration' }} />
    <Stack.Screen name="reminder-status" options={{ ...detail, title: 'Reminder Status' }} />
    <Stack.Screen name="device-authentication" options={{ ...detail, title: 'App Lock' }} />
  </Stack>;
}
