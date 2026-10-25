import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/context';
import { NotificationLifecycle } from '@/features/notifications/NotificationLifecycle';
import { initializeDatabase } from '@/database';
import { MedicinesProvider } from '@/features/medicines/context';
import { ProfilesProvider } from '@/features/profiles/context';
import { ProfileSwitcher } from '@/features/profiles/ProfileSwitcher';
import { AppLock } from '@/features/security/AppLock';
import { ThemeProvider, useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';
import { Button } from '@/features/ui/Button';
import '../../global.css';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootLayout() {
  // Theme preferences live in AsyncStorage, so the theme is available before SQLite opens.
  return <ThemeProvider><ThemedStatusBar /><DatabaseGate /></ThemeProvider>;
}

function DatabaseGate() {
  const { colors } = useTheme();
  const [databaseState, setDatabaseState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    initializeDatabase().then(() => {
      if (active) {
        setDatabaseState('ready');
      }
    }).catch(() => {
      if (active) {
        setDatabaseState('error');
      }
    });
    return () => { active = false; };
  }, [retry]);

  if (databaseState !== 'ready') {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32, backgroundColor: colors.background }}>
      {databaseState === 'loading' ? <>
        <ActivityIndicator color={colors.secondaryLabel} />
        <AppText variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>Opening your local data…</AppText>
      </> : <>
        <AppText accessibilityRole="header" variant="title3" style={{ textAlign: 'center' }}>Your data couldn’t be opened</AppText>
        <AppText variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>Nothing was deleted. Try again, or restart DoseTracker.</AppText>
        <Button title="Try Again" onPress={() => { setDatabaseState('loading'); setRetry(value => value + 1); }} />
      </>}
    </View>;
  }

  return <AppLock>
    <OnboardingProvider>
      <ProfilesProvider>
        <MedicinesProvider>
          <NotificationLifecycle />
          <RootNavigator />
          <ProfileSwitcher />
        </MedicinesProvider>
      </ProfilesProvider>
    </OnboardingProvider>
  </AppLock>;
}

export default RootLayout;

function RootNavigator() {
  const { data } = useOnboarding();
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!data.completed}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="ready" />
    </Stack.Protected>
    <Stack.Screen name="profile" />
    <Stack.Protected guard={data.completed}>
      <Stack.Screen name="(tabs)" />
      {/* Separate tasks: page sheets on iOS (swipe down asks before discarding a draft). */}
      <Stack.Screen name="add-medicine" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-medicine" options={{ presentation: 'modal' }} />
    </Stack.Protected>
  </Stack>;
}
