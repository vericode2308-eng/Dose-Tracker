import { Stack } from 'expo-router';
import { MedicinesProvider } from '@/features/medicines/context';

export default function TodayLayout() {
  return <MedicinesProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FBF8F3' } }} /></MedicinesProvider>;
}
