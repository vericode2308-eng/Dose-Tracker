import { publicErrorMessage } from '@/features/security/errors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
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

import { hapticImpactLight, hapticSuccess } from '@/features/ui/haptics';
import { AppText } from '@/features/ui/AppText';
import { ActionMenu } from '@/features/ui/ActionMenu';
import { BottomOverlay } from '@/features/ui/BottomOverlay';
import { Button } from '@/features/ui/Button';
import { Card } from '@/features/ui/Card';
import { IconButton } from '@/features/ui/IconButton';
import { radii } from '../../../theme';
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
  const { colors } = useTheme();
  const [busyId, setBusyId] = useState<string | null>(null);
  const busy = useRef(false);
  const [message, setMessage] = useState('');
  const [snackbar, setSnackbar] = useState<{ dose: ScheduledDose; receipt: DoseChangeReceipt; message: string } | null>(null);
  const dismissSnackbar = useCallback(() => setSnackbar(null), []);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; setSnackbar(null); };
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
    const isSelected = selected(dose);
    const snoozed = !dose.status && !!dose.snoozedUntilMs && dose.snoozedUntilMs > data.now;
    const isDue = !dose.status && !snoozed && dose.scheduledAtMs <= data.now;
    const detail = [dose.medicine.strength, `${dose.schedule.doseAmount} ${dose.medicine.doseUnit || dose.medicine.dosageForm}`].filter(Boolean).join(' · ');
    const avatar = (size: number) => <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: dose.medicine.color || colors.accent }}>
      <Icon name="pill" size={size * 0.5} color="#FFFFFF" />
    </View>;
    const outline = isSelected ? { borderWidth: 2, borderColor: colors.accent } : undefined;

    if (dose.status) {
      // Logged doses collapse to a compact row; the menu changes or resets them.
      const takenDose = dose.status === 'Taken';
      return <Animated.View key={`${dose.id}:${dose.status}`} entering={listItemEntering} exiting={listItemExiting} layout={listItemLayout}>
        <Card style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingRight: 4 }, outline]}>
          {avatar(36)}
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="headline" numberOfLines={1}>{dose.medicine.name}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={takenDose ? 'checkCircle' : 'skipped'} size={14} color={takenDose ? colors.successText : colors.warningText} weight="semibold" />
              <AppText variant="footnote" tone={takenDose ? 'success' : 'warning'} style={{ fontVariant: ['tabular-nums'] }}>
                {takenDose && dose.actualTakenAtMs != null ? `Taken at ${time(dose.actualTakenAtMs)}` : dose.status}
              </AppText>
              <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>· {time(dose.scheduledAtMs)}</AppText>
            </View>
          </View>
          <ActionMenu accessibilityLabel={`More options for ${dose.medicine.name}`} title={`${dose.medicine.name} · ${time(dose.scheduledAtMs)}`}
            items={(['Taken', 'Skipped', 'Reset'] as const).filter(action => action !== dose.status).map(action => ({
              id: action, title: action === 'Reset' ? 'Reset to Pending' : `Mark as ${action}`,
              icon: action === 'Taken' ? 'checkmark.circle' : action === 'Skipped' ? 'minus.circle' : 'arrow.uturn.backward',
            }))}
            onSelect={id => { if (busyId === null) void act(dose, id as DoseAction); }}>
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="more" size={22} color={colors.secondaryLabel} />
            </View>
          </ActionMenu>
        </Card>
      </Animated.View>;
    }

    const pill = snoozed
      ? { text: `Snoozed · ${time(dose.snoozedUntilMs!)}`, background: colors.warningSoft, color: colors.warningText }
      : isDue ? { text: time(dose.scheduledAtMs), background: colors.accentSoft, color: colors.accentText }
      : { text: time(dose.scheduledAtMs), background: colors.fill, color: colors.secondaryLabel };
    return <Animated.View key={`${dose.id}:pending`} entering={listItemEntering} exiting={listItemExiting} layout={listItemLayout}>
      <Card style={[{ gap: 12 }, outline]}>
        {isSelected && <AppText variant="footnote" weight="600" tone="accent">Opened from reminder · {dose.date}</AppText>}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {avatar(44)}
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="headline">{dose.medicine.name}</AppText>
            {!!detail && <AppText variant="subhead" tone="secondary">{detail}</AppText>}
          </View>
          <View accessibilityLabel={snoozed ? `Snoozed until ${time(dose.snoozedUntilMs!)}` : `${isDue ? 'Due' : 'Scheduled'} at ${time(dose.scheduledAtMs)}`}
            style={{ backgroundColor: pill.background, borderRadius: radii.chip, borderCurve: 'continuous', paddingHorizontal: 9, paddingVertical: 4 }}>
            <AppText variant="caption" weight="600" style={{ color: pill.color, fontVariant: ['tabular-nums'] }}>{pill.text}</AppText>
          </View>
        </View>
        {!!dose.medicine.instructions && <AppText variant="footnote" tone="secondary">{dose.medicine.instructions}</AppText>}
        {dose.scheduledAtMs <= data.now && <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['Taken', 'Skipped', 'Snooze'] as const).map(action => {
            const label = action === 'Taken' ? 'Take' : action === 'Skipped' ? 'Skip' : action;
            return <Button key={action} title={label} accessibilityLabel={`${label} ${dose.medicine.name}`} disabled={busyId !== null}
              onPress={() => void act(dose, action)} variant={action === 'Taken' ? 'primary' : action === 'Skipped' ? 'secondary' : 'plain'}
              style={{ flex: action === 'Taken' ? 1.4 : 1, paddingHorizontal: 8 }} />;
          })}
        </View>}
      </Card>
    </Animated.View>;
  }

  const sections = ([['Due Now', due], ['Upcoming', upcoming], ['Logged', earlier]] as const).filter(([, doses]) => doses.length > 0);
  const percent = todaysDoses.length ? Math.round(taken / todaysDoses.length * 100) : 0;
  const dateLabel = data.now ? new Date(data.now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  // The native stack header carries the large "Today" title and the screen's actions.
  return <View style={{ flex: 1 }} collapsable={false}>
    <Stack.Screen options={{ headerRight: () => <View style={{ flexDirection: 'row' }}>
      <IconButton icon="medicines" accessibilityLabel="View medicines" color={colors.accentText} onPress={() => router.push('/medicines')} />
      <IconButton icon="add" accessibilityLabel="Add medicine" color={colors.accentText} onPress={() => router.push('/add-medicine')} />
    </View> }} />
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 96, gap: 12 }}>
      {!!dateLabel && <AppText variant="subhead" tone="secondary">{dateLabel}</AppText>}
      <ProfileSwitcherTrigger showOtherProfiles />

      {todaysDoses.length > 0 && <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="footnote" tone="secondary">{percent === 100 ? 'All doses logged' : 'Daily progress'}</AppText>
          <AppText variant="title1" style={{ fontVariant: ['tabular-nums'] }}>{taken} <AppText variant="subhead" tone="secondary">of {todaysDoses.length} {todaysDoses.length === 1 ? 'dose' : 'doses'} taken</AppText></AppText>
        </View>
        <ProgressRing percent={percent} />
      </Card>}

      {!!(error || message) && <InlineMessage tone={error ? 'danger' : 'info'} message={error || message} actionTitle={error ? 'Retry' : undefined} onAction={() => void reload()} />}
      {!!params.scheduleId && !loading && !data.doses.some(selected) && <InlineMessage tone="warning" message="This reminder is no longer active." />}

      {loading ? <View style={{ paddingVertical: 32, alignItems: 'center' }}><ActivityIndicator color={colors.secondaryLabel} accessibilityLabel="Loading doses" /></View>
        : !data.doses.length ? <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft, marginBottom: 4 }}>
            <Icon name="emptyDay" size={28} color={colors.accentText} />
          </View>
          <AppText variant="headline" style={{ textAlign: 'center' }}>No doses scheduled today</AppText>
          <AppText variant="subhead" tone="secondary" style={{ textAlign: 'center', maxWidth: 280 }}>Add a medicine and its dose times to start tracking.</AppText>
          <Button title="Add Medicine" icon="add" onPress={() => router.push('/add-medicine')} style={{ marginTop: 8 }} />
        </Card>
        : <>
          {!due.length && <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="checkCircle" size={22} color={colors.successText} />
            <AppText variant="subhead" style={{ flex: 1 }}>{upcoming.length ? 'You’re all caught up. Your next dose is listed below.' : 'You’re all caught up for today.'}</AppText>
          </Card>}
          {sections.map(([title, doses]) => <View key={title} style={{ gap: 10 }}>
            <AppText accessibilityRole="header" accessibilityLabel={`${title}, ${doses.length}`} variant="footnote" tone="secondary"
              style={{ textTransform: 'uppercase', paddingHorizontal: 4, marginTop: 8 }}>{title} · {doses.length}</AppText>
            {doses.map(card)}
          </View>)}
        </>}
    </ScrollView>
    {snackbar && <BottomOverlay><UndoSnackbar key={snackbar.message + snackbar.receipt.dose.scheduledAtMs} message={snackbar.message}
      disabled={busyId !== null} onDismiss={dismissSnackbar} onUndo={() => void act(snackbar.dose, 'Undo', snackbar.receipt)} /></BottomOverlay>}
  </View>;
}
