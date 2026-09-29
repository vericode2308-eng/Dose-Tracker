import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/context';
import { NotificationLifecycle } from '@/features/notifications/NotificationLifecycle';
import { initializeDiagnostics, reportStartupError } from '@/features/diagnostics/diagnostics';
import { initializeDatabase } from '@/database';
import { ProfilesProvider } from '@/features/profiles/context';
import { ProfileSwitcher } from '@/features/profiles/ProfileSwitcher';
import { AppLock } from '@/features/security/AppLock';
import { ThemeProvider, useTheme } from '@/features/theme/ThemeContext';
import '../../global.css';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootLayout() {
  const [databaseState, setDatabaseState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void initializeDiagnostics().catch(() => undefined);
    initializeDatabase().then(() => {
      if (active) {
        setDatabaseState('ready');
      }
    }).catch(() => {
      reportStartupError();
      if (active) {
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
      {databaseState === 'error' && <Pressable accessibilityRole="button" onPress={() => { setDatabaseState('loading'); setRetry(value => value + 1); }} className="mt-5 rounded-full bg-[#102238] px-6 py-3">
        <Text className="font-semibold text-white">Try again</Text>
      </Pressable>}
    </View>;
  }

  return <ThemeProvider>
    <AppLock>
      <OnboardingProvider>
        <ProfilesProvider>
          <ThemedStatusBar />
          <NotificationLifecycle />
          <RootNavigator />
          <ProfileSwitcher />
        </ProfilesProvider>
      </OnboardingProvider>
    </AppLock>
  </ThemeProvider>;
}

export default RootLayout;

function RootNavigator() {
  const { data } = useOnboarding();
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
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
