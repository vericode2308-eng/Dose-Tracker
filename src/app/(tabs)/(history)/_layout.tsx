import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/features/ui/navigation';

export default function HistoryLayout() {
  const screenOptions = useStackScreenOptions();
  return <Stack screenOptions={screenOptions}>
    <Stack.Screen name="history" options={{ title: 'History' }} />
  </Stack>;
}
