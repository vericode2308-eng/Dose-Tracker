import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { fetchScheduledDoses, type ScheduledDose } from '@/database';
import { recordMedicationDose, snoozeMedicationDose } from '@/notificationManager';
import { useProfiles } from '@/features/profiles/context';
import { ProfileSwitcherTrigger } from '@/features/profiles/ProfileSwitcher';
import { dateKey, isDateKey } from '@/features/doses/occurrences';
import { useLocalQuery } from '@/features/doses/useLocalQuery';

const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function ProgressRing({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 32;
  return <View accessibilityRole="progressbar" accessibilityLabel="Daily doses taken" accessibilityValue={{ min: 0, max: 100, now: percent }} className="h-20 w-20 items-center justify-center">
    <Svg width={80} height={80} style={{ position: 'absolute' }}><Circle cx={40} cy={40} r={32} fill="none" stroke="#E7E7E7" strokeWidth={6} /><Circle cx={40} cy={40} r={32} fill="none" stroke="#079D9D" strokeWidth={6} strokeDasharray={`${circumference * percent / 100} ${circumference}`} transform="rotate(-90 40 40)" /></Svg>
    <Text className="text-lg font-bold text-[#071629]">{percent}%</Text>
  </View>;
}
export default function TodayHomeScreen() {
  const { currentProfile } = useProfiles();
  return <ProfileToday key={currentProfile?.id} />;
}
function ProfileToday() {
  const params = useLocalSearchParams<{ medicineId?: string; scheduleId?: string; doseDate?: string; scheduledAtMs?: string }>();
  const { currentProfile } = useProfiles();
  const [busyId, setBusyId] = useState<string | null>(null);
  const busy = useRef(false);
  const [message, setMessage] = useState('');
  const query = useCallback(async () => {
    const now = Date.now();
    const today = dateKey(new Date(now));
    const doses = await fetchScheduledDoses(today, currentProfile?.id);
    if (isDateKey(params.doseDate) && params.doseDate !== today && params.scheduleId) {
      const older = await fetchScheduledDoses(params.doseDate, currentProfile?.id);
      doses.unshift(...older.filter(dose => dose.schedule.id === params.scheduleId && dose.medicine.id === params.medicineId && !doses.some(existing => existing.id === dose.id)));
    }
    return { doses, now, today };
  }, [params.doseDate, params.scheduleId, params.medicineId, currentProfile?.id]);
  const { data, loading, error, reload } = useLocalQuery(query, { doses: [] as ScheduledDose[], now: 0, today: '' }, 30000);
  const todaysDoses = data.doses.filter(dose => dose.date === data.today);
  const taken = todaysDoses.filter(dose => dose.status === 'Taken').length;
  const selected = (dose: ScheduledDose) => dose.schedule.id === params.scheduleId && dose.medicine.id === params.medicineId
    && (!params.scheduledAtMs || dose.scheduledAtMs === Number(params.scheduledAtMs));
  const due = data.doses.filter(dose => !dose.status && Math.max(dose.scheduledAtMs, dose.snoozedUntilMs || 0) <= data.now);
  const upcoming = data.doses.filter(dose => !dose.status && Math.max(dose.scheduledAtMs, dose.snoozedUntilMs || 0) > data.now);
  const completed = data.doses.filter(dose => dose.status);
  const act = useCallback(async (dose: ScheduledDose, action: 'Taken' | 'Skipped' | 'Snooze') => {
    if (busy.current) return;
    busy.current = true; setBusyId(dose.id); setMessage('');
    try {
      const reference = { medicineId: dose.medicine.id, scheduleId: dose.schedule.id, date: dose.date, scheduledAtMs: dose.scheduledAtMs };
      const result = action === 'Snooze' ? await snoozeMedicationDose(reference) : await recordMedicationDose(reference, action);
      setMessage(result.message);
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The dose could not be saved. Please retry.'); }
    finally { busy.current = false; setBusyId(null); }
  }, [reload]);
  function card(dose: ScheduledDose) {
    const snoozed = !dose.status && !!dose.snoozedUntilMs && dose.snoozedUntilMs > data.now;
    return <View key={dose.id} className={`mb-2 rounded-[22px] border-2 bg-white p-4 ${selected(dose) ? 'border-[#079D9D]' : 'border-transparent'}`}>
      {selected(dose) && <Text className="mb-2 text-sm font-semibold text-[#079D9D]">Opened from reminder · {dose.date}</Text>}
      <View className="flex-row gap-3"><View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: dose.medicine.color || '#079D9D' }}><MaterialCommunityIcons name="pill" size={25} color="white" /></View><View className="flex-1">
        <Text className="text-lg font-semibold text-[#071629]">{dose.medicine.name}</Text>
        <Text className="mt-1 text-sm text-[#536073]">{[dose.medicine.strength, `${dose.schedule.doseAmount} ${dose.medicine.doseUnit || dose.medicine.dosageForm}`].filter(Boolean).join(' · ')}</Text>
        <Text className="mt-2 font-medium text-[#071629]">{time(dose.scheduledAtMs)} · {dose.status || (snoozed ? `Snoozed until ${time(dose.snoozedUntilMs!)}` : dose.scheduledAtMs > data.now ? 'Upcoming' : 'Due now')}</Text>
        {dose.actualTakenAtMs && <Text className="mt-1 text-sm text-[#176A4C]">Taken at {time(dose.actualTakenAtMs)}</Text>}
        {!!dose.medicine.instructions && <Text className="mt-2 text-sm text-[#536073]">{dose.medicine.instructions}</Text>}
      </View></View>
      {!dose.status && dose.scheduledAtMs <= data.now && <View className="mt-3 flex-row gap-2">{(['Taken', 'Skipped', 'Snooze'] as const).map(action => <Pressable key={action} accessibilityRole="button" accessibilityLabel={`${action === 'Taken' ? 'Take' : action === 'Skipped' ? 'Skip' : action} ${dose.medicine.name}`} accessibilityState={{ disabled: busyId !== null }} disabled={busyId !== null} onPress={() => void act(dose, action)} className={`min-h-12 flex-1 items-center justify-center rounded-full ${action === 'Taken' ? 'bg-[#071629]' : 'bg-[#F1F1F1]'}`}><Text className={`text-sm font-semibold ${action === 'Taken' ? 'text-white' : 'text-[#071629]'}`}>{busyId === dose.id ? 'Saving…' : action === 'Taken' ? 'Take' : action === 'Skipped' ? 'Skip' : action}</Text></Pressable>)}</View>}
    </View>;
  }
  return <SafeAreaView className="flex-1 bg-[#FBF8F3]" edges={['top']}><ScrollView contentContainerClassName="px-4 pb-6 pt-4">
    <ProfileSwitcherTrigger showOverdue />
    <Text accessibilityRole="header" className="text-[28px] font-bold text-[#071629]">Today’s Schedule</Text>
    <Text className="mb-3 mt-1 text-base text-[#536073]">{data.now ? new Date(data.now).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Loading…'}</Text>
    <View className="flex-row items-center justify-between rounded-[26px] bg-white px-5 py-2"><View><Text className="text-sm text-[#536073]">Daily Progress</Text><Text className="mt-1 text-2xl font-semibold text-[#071629]">{taken} / {todaysDoses.length}<Text className="text-sm font-normal"> doses taken</Text></Text></View><ProgressRing percent={todaysDoses.length ? Math.round(taken / todaysDoses.length * 100) : 0} /></View>
    <View className="my-3 flex-row gap-2"><Pressable accessibilityRole="button" onPress={() => router.push('/medicines')} className="min-h-12 flex-1 items-center justify-center rounded-full bg-[#071629]"><Text className="font-semibold text-white">View Medicines</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/add-medicine')} className="min-h-12 flex-1 items-center justify-center rounded-full bg-white"><Text className="font-semibold text-[#071629]">Add Medicine</Text></Pressable></View>
    {!!(error || message) && <View className="mb-3 rounded-2xl bg-[#FFF0D8] p-3"><Text accessibilityRole="alert" className="text-[#713F12]">{error || message}</Text>{!!error && <Pressable accessibilityRole="button" onPress={() => void reload()} className="min-h-11 justify-center"><Text className="font-semibold text-[#071629]">Retry</Text></Pressable>}</View>}
    {!!params.scheduleId && !loading && !data.doses.some(selected) && <Text className="mb-3 text-[#713F12]">This reminder is no longer active.</Text>}
    {loading ? <Text>Loading doses…</Text> : <>
      {([['Due now', due], ['Upcoming', upcoming], ['Completed', completed]] as const).map(([title, doses]) => <View key={title}><Text accessibilityRole="header" className="mb-2 mt-3 text-lg font-semibold text-[#071629]">{title} · {doses.length}</Text>{doses.map(card)}{title === 'Due now' && !doses.length && <Text className="rounded-2xl bg-white p-4 text-[#536073]">{data.doses.length ? 'You’re all caught up.' : 'No scheduled doses today. Add a medicine to get started.'}</Text>}</View>)}
    </>}
  </ScrollView></SafeAreaView>;
}
