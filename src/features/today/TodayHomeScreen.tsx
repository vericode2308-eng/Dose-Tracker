import { publicErrorMessage } from '@/features/security/errors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, { ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
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
import { AppText } from '@/features/ui/AppText';
import { Button } from '@/features/ui/Button';
import { Icon } from '@/features/ui/Icon';
import { InlineMessage } from '@/features/ui/InlineMessage';
import { EASE_OUT, listItemEntering, listItemExiting, listItemLayout, motion } from '@/features/ui/motion';

const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_RADIUS = 32;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Daily progress ring. The arc animates on the UI thread; the label shows the final value at once. */
function ProgressRing({ percent }: { percent: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(percent);
  useEffect(() => {
    progress.set(withTiming(percent, { duration: motion.slow, easing: EASE_OUT, reduceMotion: ReduceMotion.System }));
  }, [percent, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LENGTH - (RING_LENGTH * progress.get()) / 100 }));
  const isComplete = percent === 100;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Daily doses taken"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      className="h-20 w-20 items-center justify-center"
    >
      <Svg width={80} height={80} style={{ position: 'absolute' }}>
        <Circle cx={40} cy={40} r={RING_RADIUS} fill="none" stroke={colors.fill} strokeWidth={7} />
        <AnimatedCircle
          cx={40}
          cy={40}
          r={RING_RADIUS}
          fill="none"
          stroke={isComplete ? colors.success : colors.accent}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
          animatedProps={animatedProps}
          transform="rotate(-90 40 40)"
        />
      </Svg>
      {isComplete ? (
        <Icon name="check" size={24} color={colors.success} weight="bold" />
      ) : (
        <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>{percent}%</AppText>
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
    return <Animated.View key={`${dose.id}:${dose.status || 'pending'}`} entering={listItemEntering} exiting={listItemExiting} layout={listItemLayout} style={{ marginBottom: dose.status ? 10 : 16, paddingHorizontal: 16, paddingVertical: dose.status ? 10 : 16, borderRadius: 22, borderWidth: selected(dose) ? 2 : 1, borderColor: selected(dose) ? colors.accent : colors.border, backgroundColor: colors.surface }}>
      {selected(dose) && <Text className="mb-2 text-sm font-semibold" style={{ color: colors.accentText }}>Opened from reminder · {dose.date}</Text>}
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
      {!dose.status && dose.scheduledAtMs <= data.now && <View className="mt-4 flex-row gap-2">{(['Taken', 'Skipped', 'Snooze'] as const).map(action => { const label = action === 'Taken' ? 'Take' : action === 'Skipped' ? 'Skip' : action; return <Button key={action} title={label} accessibilityLabel={`${label} ${dose.medicine.name}`} disabled={busyId !== null} onPress={() => void act(dose, action)} variant={action === 'Taken' ? 'primary' : action === 'Skipped' ? 'secondary' : 'plain'} style={{ flex: 1, paddingHorizontal: 8 }} />; })}</View>}
    </Animated.View>;
  }
  return <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: colors.background }}><ScrollView contentContainerClassName="px-4 pb-6 pt-4">
    <ProfileSwitcherTrigger showOtherProfiles />
    <Text accessibilityRole="header" className="text-[28px] font-bold" style={{ color: colors.ink }}>Today’s Schedule</Text>
    <Text className="mb-3 mt-1 text-base" style={{ color: colors.secondary }}>{data.now ? new Date(data.now).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Loading…'}</Text>
    <View className="flex-row items-center justify-between rounded-[26px] px-5 py-2" style={{ backgroundColor: colors.surface }}><View><Text className="text-sm" style={{ color: colors.secondary }}>Daily Progress</Text><Text className="mt-1 text-2xl font-semibold" style={{ color: colors.ink }}>{taken} / {todaysDoses.length}<Text className="text-sm font-normal" style={{ color: colors.secondary }}> doses taken</Text></Text></View><ProgressRing percent={todaysDoses.length ? Math.round(taken / todaysDoses.length * 100) : 0} /></View>
    <View className="my-3 flex-row gap-2"><Button title="View Medicines" onPress={() => router.push('/medicines')} style={{ flex: 1 }} /><Button title="Add Medicine" variant="secondary" onPress={() => router.push('/add-medicine')} style={{ flex: 1 }} /></View>
    {!!(error || message) && <InlineMessage tone={error ? 'danger' : 'info'} message={error || message} actionTitle={error ? 'Retry' : undefined} onAction={() => void reload()} style={{ marginBottom: 12 }} />}
    {!!params.scheduleId && !loading && !data.doses.some(selected) && <InlineMessage tone="warning" message="This reminder is no longer active." style={{ marginBottom: 12 }} />}
    {loading ? <Text style={{ color: colors.secondary }}>Loading doses…</Text> : <>
      {([['Due now', due], ['Upcoming', upcoming], ['Earlier', earlier]] as const).map(([title, doses]) => <View key={title}><Text accessibilityRole="header" className="mb-2 mt-3 text-lg font-semibold" style={{ color: colors.ink }}>{title} · {doses.length}</Text>{doses.map(card)}{title === 'Due now' && !doses.length && <Text className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, color: colors.secondary }}>{data.doses.length ? 'You’re all caught up.' : 'No scheduled doses today. Add a medicine to get started.'}</Text>}</View>)}
    </>}
  </ScrollView>
    {snackbar && <UndoSnackbar key={snackbar.message + snackbar.receipt.dose.scheduledAtMs} message={snackbar.message}
      disabled={busyId !== null} onDismiss={dismissSnackbar} onUndo={() => void act(snackbar.dose, 'Undo', snackbar.receipt)} />}
    {menuDose && <DoseOptionsMenu dose={menuDose} onClose={() => setMenuDose(null)} onAction={(dose, action) => void act(dose, action)} />}
  </SafeAreaView>;
}
