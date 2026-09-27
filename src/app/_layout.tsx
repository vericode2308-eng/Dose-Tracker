import { Stack } from "expo-router";
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/context';
import { NotificationLifecycle } from '@/features/notifications/NotificationLifecycle';
import { initializeDatabase } from '@/database';
import { ProfilesProvider } from '@/features/profiles/context';
import { ProfileSwitcher } from '@/features/profiles/ProfileSwitcher';
import { AppLock } from '@/features/security/AppLock';
import '../../global.css';

Sentry.init({
  dsn: 'https://4260ebfe901b6d04bda9c7356b2e29e2@o4512147247071232.ingest.de.sentry.io/4512156478537808',
  sendDefaultPii: false,
  enableLogs: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  tracePropagationTargets: [],
});

function RootLayout() {
  const [databaseState, setDatabaseState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    Sentry.startSpan({ name: 'Initialize local database', op: 'db.initialize' }, initializeDatabase).then(() => {
      if (active) {
        Sentry.logger.info('Local database ready', { subsystem: 'database' });
        setDatabaseState('ready');
      }
    }).catch(() => {
      if (active) {
        // Keep health and profile data out of remote operational logs.
        Sentry.logger.error('Local database initialization failed', { subsystem: 'database' });
        setDatabaseState('error');
      }
    });
    return () => { active = false; };
  }, [retry]);

  if (databaseState !== 'ready') {
    return <View className="flex-1 items-center justify-center bg-[#FBF8F3] px-6">
      <Text className="text-center text-base text-[#102238]">
        {databaseState === 'loading' ? 'Opening your local data…' : 'Your local data could not be opened.'}
      </Text>
      {databaseState === 'error' && <Pressable accessibilityRole="button" onPress={() => { Sentry.logger.warn('Local database retry requested', { subsystem: 'database' }); setDatabaseState('loading'); setRetry(value => value + 1); }} className="mt-5 rounded-full bg-[#102238] px-6 py-3">
        <Text className="font-semibold text-white">Try again</Text>
      </Pressable>}
    </View>;
  }

  return <AppLock><OnboardingProvider>
    <ProfilesProvider>
    <StatusBar style="dark" />
    <NotificationLifecycle />
    <RootNavigator />
    <ProfileSwitcher />
    </ProfilesProvider>
  </OnboardingProvider></AppLock>;
}

export default Sentry.wrap(RootLayout);

function RootNavigator() {
  const { data } = useOnboarding();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FBF8F3' }, animation: 'slide_from_right' }}>
    <Stack.Protected guard={!data.completed}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="ready" />
    </Stack.Protected>
    <Stack.Screen name="profile" />
    <Stack.Protected guard={data.completed}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="device-authentication" />
      <Stack.Screen name="notification-privacy" />
      <Stack.Screen name="reminder-sound" />
      <Stack.Screen name="reminder-status" />
    </Stack.Protected>
  </Stack>;
}
