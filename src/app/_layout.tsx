import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { OnboardingProvider } from '@/features/onboarding/context';
import '../../global.css';

export default function RootLayout() {
  return <OnboardingProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FBF8F3' }, animation: 'slide_from_right' }} />
  </OnboardingProvider>;
}
