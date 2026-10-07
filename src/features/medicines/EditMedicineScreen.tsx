import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchMedicineDetails, type StoredMedicine } from '@/database';
import { useTheme } from '@/features/theme/ThemeContext';
import MedicineForm from './AddMedicineScreen';

export default function EditMedicineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [medicine, setMedicine] = useState<StoredMedicine | null>(null);
  const [scheduleId, setScheduleId] = useState<string>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    fetchMedicineDetails(id).then(value => {
      if (!active) return;
      if (!value || !value.schedules.length) { setError('This medicine or its schedule is no longer available.'); return; }
      setMedicine(value);
      if (value.schedules.length === 1 || value.schedules.every(s => ['daily', 'weekdays', 'day_interval'].includes(s.pattern.kind) && JSON.stringify(s.pattern) === JSON.stringify(value.schedules[0].pattern) && s.reminderEnabled === value.schedules[0].reminderEnabled)) setScheduleId(value.schedules[0].id);
    }).catch(() => { if (active) setError('Could not load the medicine. Please retry.'); });
    return () => { active = false; };
  }, [id, attempt]);
  const schedule = medicine?.schedules.find(s => s.id === scheduleId);
  if (medicine?.id === id && schedule) return <MedicineForm key={`${medicine.id}:${schedule.id}:${attempt}`} initialMedicine={medicine} initialSchedule={schedule} />;
  return <SafeAreaView className="flex-1 p-5" style={{ backgroundColor: colors.background }}>
    <ScrollView>
      <Text accessibilityRole="header" className="mb-4 text-2xl font-semibold" style={{ color: colors.ink }}>Edit Medicine</Text>
      <Text accessibilityRole={error ? 'alert' : undefined} className="mb-4 text-base" style={{ color: colors.secondary }}>{error || (medicine ? 'Choose the schedule to edit. Medicine details and stock apply to all its schedules.' : 'Loading saved details…')}</Text>
      {!!error && <Pressable accessibilityRole="button" onPress={() => { setMedicine(null); setError(''); setScheduleId(undefined); setAttempt(n => n + 1); }} className="mb-3 min-h-12 justify-center"><Text style={{ color: colors.accent }}>Retry</Text></Pressable>}
      {medicine?.schedules.map((s, index) => <Pressable key={s.id} accessibilityRole="button" onPress={() => setScheduleId(s.id)} className="mb-3 rounded-2xl p-4" style={{ backgroundColor: colors.surface }}><Text style={{ color: colors.ink }}>Schedule {index + 1} · {s.timeLocalMinute == null ? 'As needed' : `${String(Math.floor(s.timeLocalMinute / 60)).padStart(2, '0')}:${String(s.timeLocalMinute % 60).padStart(2, '0')}`} · {s.doseAmount} {medicine.doseUnit || medicine.dosageForm}</Text></Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/medicines')} className="min-h-12 justify-center"><Text style={{ color: colors.accent }}>Back to medicine</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
