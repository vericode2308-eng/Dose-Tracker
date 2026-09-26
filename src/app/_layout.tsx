import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OnboardingProvider } from '@/features/onboarding/context';
import { NotificationLifecycle } from '@/features/notifications/NotificationLifecycle';
import { initializeDatabase } from '@/database';
import '../../global.css';

export default function RootLayout() {
  const [databaseState, setDatabaseState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    initializeDatabase().then(() => {
      if (active) setDatabaseState('ready');
    }).catch(() => {
      if (active) setDatabaseState('error');
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

  return <OnboardingProvider>
    <StatusBar style="dark" />
    <NotificationLifecycle />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FBF8F3' }, animation: 'slide_from_right' }} />
  </OnboardingProvider>;
}
