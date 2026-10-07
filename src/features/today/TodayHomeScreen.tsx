import { publicErrorMessage } from '@/features/security/errors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { fetchScheduledDoses, type ScheduledDose, type DoseAction, type DoseChangeReceipt } from '@/database';
import { changeMedicationDose, undoMedicationChange } from '@/notificationManager';
import { useProfiles } from '@/features/profiles/context';
import { ProfileSwitcherTrigger } from '@/features/profiles/ProfileSwitcher';
import { dateKey, isDateKey } from '@/features/doses/occurrences';
import { useLocalQuery } from '@/features/doses/useLocalQuery';
import { useTheme } from '@/features/theme/ThemeContext';

import { UndoSnackbar } from '@/features/ui/UndoSnackbar';
import { DoseOptionsMenu } from './DoseOptionsMenu';

import { hapticImpactLight, hapticSuccess } from '@/features/ui/haptics';

const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function ProgressRing({ percent, isDark, textColor }: { percent: number; isDark: boolean; textColor: string }) {
  const [animatedPercent, setAnimatedPercent] = useState(percent);
  const currentValRef = useRef(percent);
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = currentValRef.current;
    const endVal = percent;
    if (startVal === endVal) return;

    const duration = 500;
    const startTime = Date.now();

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * ease);
      currentValRef.current = current;
      setAnimatedPercent(current);

      if (progress < 1) {
        reqIdRef.current = requestAnimationFrame(step);
      }
    };

    reqIdRef.current = requestAnimationFrame(step);
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [percent]);

  const circumference = 2 * Math.PI * 32;
  const strokeDashoffset = circumference - (circumference * animatedPercent) / 100;
  const isComplete = animatedPercent === 100;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Daily doses taken"
      accessibilityValue={{ min: 0, max: 100, now: animatedPercent }}
      className="h-20 w-20 items-center justify-center"
    >
      <Svg width={80} height={80} style={{ position: 'absolute' }}>
        <Circle
          cx={40}
          cy={40}
          r={32}
          fill="none"
          stroke={isDark ? '#374151' : '#E7E7E7'}
          strokeWidth={6}
        />
        <Circle
          cx={40}
          cy={40}
          r={32}
          fill="none"
          stroke={isComplete ? '#10B981' : '#079D9D'}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 40 40)"
        />
      </Svg>
      {isComplete ? (
        <MaterialCommunityIcons name="check-bold" size={24} color="#10B981" />
      ) : (
        <Text className="text-lg font-bold" style={{ color: textColor }}>{animatedPercent}%</Text>
      )}
    </View>
  );
}

export default function TodayHomeScreen() {
  const { currentProfile } = useProfiles();
  return <ProfileToday key={currentProfile?.id} />;
}

function ProfileToday() {
  const params = useLocalSearchParams<{ medicineId?: string; scheduleId?: string; doseDate?: string; scheduledAtMs?: string }>();
  const { currentProfile } = useProfiles();
  const { colors, isDark } = useTheme();
  const [busyId, setBusyId] = useState<string | null>(null);
  const busy = useRef(false);
  const [message, setMessage] = useState('');
  const [menuDose, setMenuDose] = useState<ScheduledDose | null>(null);
  const [snackbar, setSnackbar] = useState<{ dose: ScheduledDose; receipt: DoseChangeReceipt; message: string } | null>(null);
  const dismissSnackbar = useCallback(() => setSnackbar(null), []);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; setSnackbar(null); setMenuDose(null); };
  }, []));
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
  const earlier = data.doses.filter(dose => dose.status);
  const act = useCallback(async (dose: ScheduledDose, action: DoseAction | 'Undo', receipt?: DoseChangeReceipt) => {
    if (busy.current) return;
    busy.current = true; setBusyId(dose.id); setMessage(''); setSnackbar(null);
    try {
      if (action === 'Taken') void hapticSuccess();
      else void hapticImpactLight();
      const reference = { medicineId: dose.medicine.id, scheduleId: dose.schedule.id, date: dose.date,
        scheduledAtMs: dose.scheduledAtMs, status: dose.status, actualTakenAtMs: dose.actualTakenAtMs,
        snoozedUntilMs: dose.snoozedUntilMs };
      if (action === 'Undo' && receipt) {
        const result = await undoMedicationChange(receipt);
        setMessage(result.message);
      } else if (action !== 'Undo') {
        const result = await changeMedicationDose(reference, action);
        setMessage(result.message);
        if (focused.current) setSnackbar({ dose, receipt: result.receipt, message: action === 'Reset'
          ? `${dose.medicine.name} reset to pending` : action === 'Snooze'
          ? `${dose.medicine.name} snoozed` : `${dose.medicine.name} marked as ${action}` });
      }
    } catch (error) { setMessage(publicErrorMessage(error, 'The dose could not be saved. Please retry.')); }
    finally { await reload(); busy.current = false; setBusyId(null); }
  }, [reload]);
  function card(dose: ScheduledDose) {
    const snoozed = !dose.status && !!dose.snoozedUntilMs && dose.snoozedUntilMs > data.now;
    return <Animated.View key={`${dose.id}:${dose.status || 'pending'}`} entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(180)} layout={LinearTransition.duration(220)} style={{ marginBottom: dose.status ? 10 : 16, paddingHorizontal: 16, paddingVertical: dose.status ? 10 : 16, borderRadius: 22, borderWidth: selected(dose) ? 2 : 1, borderColor: selected(dose) ? colors.accent : colors.border, backgroundColor: colors.surface }}>
      {selected(dose) && <Text className="mb-2 text-sm font-semibold text-[#079D9D]">Opened from reminder · {dose.date}</Text>}
      <View className="flex-row gap-3"><View className="h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: dose.medicine.color || '#079D9D' }}><MaterialCommunityIcons name="pill" size={25} color="white" /></View><View className="min-w-0 flex-1">
        <Text className="text-lg font-semibold" style={{ color: colors.ink }}>{dose.medicine.name}</Text>
        <Text className={dose.status ? "text-sm" : "mt-1 text-sm"} style={{ color: colors.secondary }}>{[dose.medicine.strength, `${dose.schedule.doseAmount} ${dose.medicine.doseUnit || dose.medicine.dosageForm}`].filter(Boolean).join(' · ')}</Text>
        <Text className={dose.status ? "mt-1 font-medium" : "mt-2 font-medium"} style={{ color: colors.ink }}>{time(dose.scheduledAtMs)} · {dose.status || (snoozed ? `Snoozed until ${time(dose.snoozedUntilMs!)}` : dose.scheduledAtMs > data.now ? 'Upcoming' : 'Due now')}</Text>
        {dose.status === 'Taken' && dose.actualTakenAtMs != null && <Text className="text-sm" style={{ color: isDark ? '#22C55E' : '#15803D' }}>Taken at {time(dose.actualTakenAtMs)}</Text>}
        {!!dose.medicine.instructions && <Text className="mt-2 text-sm" style={{ color: colors.secondary }}>{dose.medicine.instructions}</Text>}
      </View>
      {!!dose.status && <Pressable accessibilityRole="button" accessibilityLabel={`More options for ${dose.medicine.name}`}
        accessibilityHint="Change or reset this dose" accessibilityState={{ disabled: busyId !== null, expanded: menuDose?.id === dose.id }}
        disabled={busyId !== null} onPress={() => setMenuDose(dose)}
        style={{ minWidth: 48, minHeight: 48, marginLeft: -4, marginRight: -8, marginTop: -6, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
        <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.secondary} />
      </Pressable>}
      </View>
      {!dose.status && dose.scheduledAtMs <= data.now && <View className="mt-4 flex-row gap-2">{(['Taken', 'Skipped', 'Snooze'] as const).map(action => <Pressable key={action} accessibilityRole="button" accessibilityLabel={`${action === 'Taken' ? 'Take' : action === 'Skipped' ? 'Skip' : action} ${dose.medicine.name}`} accessibilityState={{ disabled: busyId !== null }} disabled={busyId !== null} onPress={() => void act(dose, action)} className="min-h-12 flex-1 items-center justify-center rounded-full" style={{ backgroundColor: action === 'Taken' ? (isDark ? '#08B8BE' : '#071629') : colors.pill }}><Text className="text-sm font-semibold" style={{ color: action === 'Taken' ? '#FFFFFF' : colors.ink }}>{action === 'Taken' ? 'Take' : action === 'Skipped' ? 'Skip' : action}</Text></Pressable>)}</View>}
    </Animated.View>;
  }
  return <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: colors.background }}><ScrollView contentContainerClassName="px-4 pb-6 pt-4">
    <ProfileSwitcherTrigger showOtherProfiles />
    <Text accessibilityRole="header" className="text-[28px] font-bold" style={{ color: colors.ink }}>Today’s Schedule</Text>
    <Text className="mb-3 mt-1 text-base" style={{ color: colors.secondary }}>{data.now ? new Date(data.now).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Loading…'}</Text>
    <View className="flex-row items-center justify-between rounded-[26px] px-5 py-2" style={{ backgroundColor: colors.surface }}><View><Text className="text-sm" style={{ color: colors.secondary }}>Daily Progress</Text><Text className="mt-1 text-2xl font-semibold" style={{ color: colors.ink }}>{taken} / {todaysDoses.length}<Text className="text-sm font-normal" style={{ color: colors.secondary }}> doses taken</Text></Text></View><ProgressRing percent={todaysDoses.length ? Math.round(taken / todaysDoses.length * 100) : 0} isDark={isDark} textColor={colors.ink} /></View>
    <View className="my-3 flex-row gap-2"><Pressable accessibilityRole="button" onPress={() => router.push('/medicines')} className="min-h-12 flex-1 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? '#08B8BE' : '#071629' }}><Text className="font-semibold text-white">View Medicines</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/add-medicine')} className="min-h-12 flex-1 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}><Text className="font-semibold" style={{ color: colors.ink }}>Add Medicine</Text></Pressable></View>
    {!!(error || message) && <View className="mb-3 rounded-2xl bg-[#FFF0D8] p-3"><Text accessibilityRole="alert" className="text-[#713F12]">{error || message}</Text>{!!error && <Pressable accessibilityRole="button" onPress={() => void reload()} className="min-h-11 justify-center"><Text className="font-semibold" style={{ color: colors.ink }}>Retry</Text></Pressable>}</View>}
    {!!params.scheduleId && !loading && !data.doses.some(selected) && <Text className="mb-3 text-[#713F12]">This reminder is no longer active.</Text>}
    {loading ? <Text style={{ color: colors.secondary }}>Loading doses…</Text> : <>
      {([['Due now', due], ['Upcoming', upcoming], ['Earlier', earlier]] as const).map(([title, doses]) => <View key={title}><Text accessibilityRole="header" className="mb-2 mt-3 text-lg font-semibold" style={{ color: colors.ink }}>{title} · {doses.length}</Text>{doses.map(card)}{title === 'Due now' && !doses.length && <Text className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, color: colors.secondary }}>{data.doses.length ? 'You’re all caught up.' : 'No scheduled doses today. Add a medicine to get started.'}</Text>}</View>)}
    </>}
  </ScrollView>
    {snackbar && <UndoSnackbar key={snackbar.message + snackbar.receipt.dose.scheduledAtMs} message={snackbar.message}
      disabled={busyId !== null} onDismiss={dismissSnackbar} onUndo={() => void act(snackbar.dose, 'Undo', snackbar.receipt)} />}
    {menuDose && <DoseOptionsMenu dose={menuDose} onClose={() => setMenuDose(null)} onAction={(dose, action) => void act(dose, action)} />}
  </SafeAreaView>;
}
