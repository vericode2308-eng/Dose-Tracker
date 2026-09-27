import { Stack } from 'expo-router';
import { MedicinesProvider } from '@/features/medicines/context';
import { useTheme } from '@/features/theme/ThemeContext';

export default function TodayLayout() {
  const { colors } = useTheme();
  return <MedicinesProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} /></MedicinesProvider>;
}

