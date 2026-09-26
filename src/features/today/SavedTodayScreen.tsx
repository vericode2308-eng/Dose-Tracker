import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAllMedicines, fetchHistoryByMonth, logDose, type StoredMedicine, type StoredSchedule } from '@/database';
import { localDate } from '@/notificationManager';
import { useOnboarding } from '@/features/onboarding/context';

type Dose = { medicine: StoredMedicine; schedule: StoredSchedule; date: string; status?: string };

export default function SavedTodayScreen() {
  const params = useLocalSearchParams<{ medicineId?: string; scheduleId?: string; doseDate?: string }>();
  const { data } = useOnboarding();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // UI clock only. OS alarms are scheduled natively by expo-notifications.
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const [medicines, history] = await Promise.all([fetchAllMedicines(), fetchHistoryByMonth()]);
    const today = localDate();
    const records = history.flatMap(month => month.records);
    const rows: Dose[] = [];
    for (const medicine of medicines) {
      if (medicine.status !== 'Active') continue;
      for (const schedule of medicine.schedules) {
        const { pattern } = schedule;
        const selected = medicine.id === params.medicineId && schedule.id === params.scheduleId;
        const date = selected && params.doseDate && /^\d{4}-\d{2}-\d{2}$/.test(params.doseDate) ? params.doseDate : today;
        const weekday = new Date(`${date}T12:00:00`).getDay();
        if (date < pattern.startDate || (pattern.endDate && date > pattern.endDate)) continue;
        if (pattern.kind !== 'daily' && !(pattern.kind === 'weekdays' && pattern.weekdays?.includes(weekday))) continue;
        rows.push({ medicine, schedule, date, status: records.find(record => record.scheduleId === schedule.id && record.date === date)?.status });
      }
    }
    rows.sort((a, b) => Number(b.schedule.id === params.scheduleId) - Number(a.schedule.id === params.scheduleId) || (a.schedule.timeLocalMinute ?? 0) - (b.schedule.timeLocalMinute ?? 0));
    setDoses(rows);
    setNotice(params.scheduleId && !rows.some(row => row.schedule.id === params.scheduleId) ? 'This reminder is no longer active. Check your medicine schedule.' : '');
    setLoading(false);
  }, [params.medicineId, params.scheduleId, params.doseDate]);
  useFocusEffect(useCallback(() => { void load().catch(() => { setMessage('Your doses could not be loaded.'); setLoading(false); }); }, [load]));

  const record = useCallback(async (dose: Dose, status: 'Taken' | 'Skipped') => {
    if (busy || dose.status) return;
    setBusy(true);
    try {
      await logDose({ scheduleId: dose.schedule.id, date: dose.date, status,
        actualTakenAtMs: status === 'Taken' ? Date.now() : null,
        requestId: `dose:${dose.schedule.id}:${dose.date}` });
      await load();
      setMessage(`${dose.medicine.name}: ${status.toLowerCase()}.`);
    } catch { setMessage('The dose could not be recorded. Please try again.'); }
    finally { setBusy(false); }
  }, [busy, load]);

  return <SafeAreaView className="flex-1 bg-[#FBF8F3]" edges={['top']}>
    <ScrollView contentContainerClassName="px-4 pb-6 pt-5">
      <Text className="text-base text-[#536073]">{data.profile?.name || 'Your medicines'}</Text>
      <Text accessibilityRole="header" className="mt-2 text-[28px] font-bold text-[#071629]">Today’s Schedule</Text>
      <Text className="mb-4 mt-1 text-sm text-[#536073]">{new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      <View className="mb-4 flex-row gap-3"><Pressable accessibilityRole="button" onPress={() => router.push('/medicines')} className="min-h-12 flex-1 items-center justify-center rounded-full bg-white"><Text className="font-semibold text-[#071629]">Medicines</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/add-medicine')} className="min-h-12 flex-1 items-center justify-center rounded-full bg-[#071629]"><Text className="font-semibold text-white">Add Medicine</Text></Pressable></View>
      {!!notice && <Text accessibilityRole="alert" className="mb-3 text-[#92400E]">{notice}</Text>}
      {loading ? <Text>Loading doses…</Text> : !doses.length && <View className="rounded-3xl bg-white p-5"><Text className="text-lg font-semibold text-[#071629]">No daily or weekday doses today</Text><Text className="mt-2 text-[#536073]">Add an ongoing schedule to set up reminders. Interval and as-needed schedules remain available in Medicines.</Text></View>}
      {doses.map(dose => {
        const time = dose.schedule.timeLocalMinute ?? 0;
        const date = new Date(`${dose.date}T00:00:00`);
        date.setHours(Math.floor(time / 60), time % 60);
        const selected = dose.schedule.id === params.scheduleId;
        const future = date.getTime() > now;
        return <View key={`${dose.schedule.id}:${dose.date}`} className={`mb-3 rounded-[22px] border-2 bg-white p-4 ${selected ? 'border-[#079D9D]' : 'border-transparent'}`}>
          {selected && <Text className="mb-2 text-sm font-semibold text-[#079D9D]">Opened from reminder · {dose.date}</Text>}
          <Text className="text-xl font-semibold text-[#071629]">{dose.medicine.name}</Text>
          <Text className="mt-1 text-[#536073]">{dose.medicine.strength} · {dose.schedule.doseAmount} {dose.medicine.doseUnit || dose.medicine.dosageForm}</Text>
          <Text className="mt-2 font-semibold text-[#071629]">{date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {dose.status || (future ? 'Upcoming' : 'Due')}</Text>
          {!!dose.medicine.instructions && <Text className="mt-2 text-[#536073]">{dose.medicine.instructions}</Text>}
          {!dose.status && !future && <View className="mt-4 flex-row gap-2">{(['Taken', 'Skipped'] as const).map(status => <Pressable key={status} accessibilityRole="button" disabled={busy} onPress={() => void record(dose, status)} className={`min-h-12 flex-1 items-center justify-center rounded-full ${status === 'Taken' ? 'bg-[#071629]' : 'bg-[#F1F1F1]'}`}><Text className={status === 'Taken' ? 'font-semibold text-white' : 'font-semibold text-[#071629]'}>{status === 'Taken' ? 'Take' : 'Skip'}</Text></Pressable>)}</View>}
        </View>;
      })}
      {!!message && <Text accessibilityRole="alert" className="mt-3 text-[#536073]">{message}</Text>}
    </ScrollView>
  </SafeAreaView>;
}
