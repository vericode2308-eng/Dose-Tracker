import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/features/ui/navigation';

export default function TodayLayout() {
  const screenOptions = useStackScreenOptions();
  return <Stack screenOptions={screenOptions}>
    <Stack.Screen name="index" options={{ title: 'Today' }} />
    <Stack.Screen name="medicines" options={{ title: 'Medicines' }} />
    <Stack.Screen name="medicine/[id]" options={{ title: '' }} />
  </Stack>;
}
