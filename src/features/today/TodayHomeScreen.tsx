import { publicErrorMessage } from '@/features/security/errors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { fetchScheduledDosesForDates, type ScheduledDose, type DoseAction, type DoseChangeReceipt } from '@/database';
import { changeMedicationDose, undoMedicationChange } from '@/notificationManager';
import { useProfiles } from '@/features/profiles/context';
import { ProfileSwitcherTrigger } from '@/features/profiles/ProfileSwitcher';
import { dateKey, isDateKey } from '@/features/doses/occurrences';
import { useLocalQuery } from '@/features/doses/useLocalQuery';
import { useTheme } from '@/features/theme/ThemeContext';

import { UndoSnackbar } from '@/features/ui/UndoSnackbar';
import { WeekStrip, type DayStatus, type WeekDay } from './WeekStrip';

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

const WINDOW_DAYS_BEFORE = 3;
const WINDOW_DAYS_AFTER = 3;

const parseDateKey = (key: string) => { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); };

/** "in 42 min", "in 2 h 5 min" */
function relativeTime(at: number, now: number) {
  const minutes = Math.max(1, Math.round((at - now) / 60000));
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `in ${hours} h ${minutes % 60} min` : `in ${hours} h`;
}

function dayStatus(doses: ScheduledDose[]): DayStatus {
  if (!doses.length) return 'none';
  if (doses.some(dose => dose.status === 'Missed' || dose.status === 'Skipped')) return 'attention';
  return doses.every(dose => dose.status === 'Taken') ? 'done' : 'pending';
}

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
        <AppText variant="headline" allowFontScaling={false} style={{ fontVariant: ['tabular-nums'] }}>{percent}%</AppText>
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
  // At large accessibility text sizes the card's side-by-side pieces stack instead of squeezing the medicine name.
  const stacked = useWindowDimensions().fontScale > 1.4;
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
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const query = useCallback(async () => {
    const now = Date.now();
    const base = new Date(now);
    const today = dateKey(base);
    const dates = Array.from({ length: WINDOW_DAYS_BEFORE + 1 + WINDOW_DAYS_AFTER }, (_, index) =>
      dateKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + index - WINDOW_DAYS_BEFORE)));
    const days = await fetchScheduledDosesForDates(dates, currentProfile?.id);
    // A reminder for an older day opens alongside today's doses.
    let reminder: ScheduledDose[] = [];
    if (isDateKey(params.doseDate) && params.doseDate !== today && params.scheduleId) {
      const older = days[params.doseDate] ?? (await fetchScheduledDosesForDates([params.doseDate], currentProfile?.id))[params.doseDate];
      reminder = older.filter(dose => dose.schedule.id === params.scheduleId && dose.medicine.id === params.medicineId);
    }
    return { days, dates, reminder, now, today };
  }, [params.doseDate, params.scheduleId, params.medicineId, currentProfile?.id]);
  const { data, loading, error, reload } = useLocalQuery(query, { days: {} as Record<string, ScheduledDose[]>, dates: [] as string[], reminder: [] as ScheduledDose[], now: 0, today: '' }, 30000);
  const viewedDate = pickedDate && data.dates.includes(pickedDate) ? pickedDate : data.today;
  const viewingToday = viewedDate === data.today;
  const viewingFuture = viewedDate > data.today;
  const viewedDoses = data.days[viewedDate] ?? [];
  const shown = viewingToday ? [...data.reminder, ...viewedDoses.filter(dose => !data.reminder.some(other => other.id === dose.id))] : viewedDoses;
  const todaysDoses = viewedDoses;
  const taken = todaysDoses.filter(dose => dose.status === 'Taken').length;
  const selected = (dose: ScheduledDose) => dose.schedule.id === params.scheduleId && dose.medicine.id === params.medicineId
    && (!params.scheduledAtMs || dose.scheduledAtMs === Number(params.scheduledAtMs));
  const due = shown.filter(dose => !dose.status && Math.max(dose.scheduledAtMs, dose.snoozedUntilMs || 0) <= data.now);
  const upcoming = shown.filter(dose => !dose.status && Math.max(dose.scheduledAtMs, dose.snoozedUntilMs || 0) > data.now);
  const earlier = shown.filter(dose => dose.status);
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
    const canLogEarly = !dose.status && !snoozed && !isDue && dose.date === data.today;
    return <Animated.View key={`${dose.id}:pending`} entering={listItemEntering} exiting={listItemExiting} layout={listItemLayout}>
      <Card style={[{ gap: 12 }, outline]}>
        {isSelected && <AppText variant="footnote" weight="600" tone="accent">Opened from reminder · {dose.date}</AppText>}
        {(() => {
          const timePill = <View accessibilityLabel={snoozed ? `Snoozed until ${time(dose.snoozedUntilMs!)}` : `${isDue ? 'Due' : 'Scheduled'} at ${time(dose.scheduledAtMs)}`}
            style={{ alignSelf: stacked ? 'flex-start' : undefined, marginTop: stacked ? 6 : 0, backgroundColor: pill.background, borderRadius: radii.chip, borderCurve: 'continuous', paddingHorizontal: 9, paddingVertical: 4 }}>
            <AppText variant="caption" weight="600" style={{ color: pill.color, fontVariant: ['tabular-nums'] }}>{pill.text}</AppText>
          </View>;
          return <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            {avatar(44)}
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="headline">{dose.medicine.name}</AppText>
              {!!detail && <AppText variant="subhead" tone="secondary">{detail}</AppText>}
              {stacked && timePill}
            </View>
            {!stacked && timePill}
          </View>;
        })()}
        {!!dose.medicine.instructions && <AppText variant="footnote" tone="secondary">{dose.medicine.instructions}</AppText>}
        {canLogEarly && <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>Scheduled {relativeTime(dose.scheduledAtMs, data.now)}</AppText>}
        {canLogEarly && <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 8 }}>
          {(['Taken', 'Skipped'] as const).map(action => {
            const label = action === 'Taken' ? 'Take early' : 'Skip';
            return <Button key={action} title={label} accessibilityLabel={`${label} ${dose.medicine.name}`} disabled={busyId !== null}
              onPress={() => void act(dose, action)} variant={action === 'Taken' ? 'secondary' : 'plain'}
              style={stacked ? undefined : { flex: action === 'Taken' ? 1.4 : 1, paddingHorizontal: 8 }} />;
          })}
        </View>}
        {dose.scheduledAtMs <= data.now && <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 8 }}>
          {(['Taken', 'Skipped', 'Snooze'] as const).map(action => {
            const label = action === 'Taken' ? 'Take' : action === 'Skipped' ? 'Skip' : action;
            return <Button key={action} title={label} accessibilityLabel={`${label} ${dose.medicine.name}`} disabled={busyId !== null}
              onPress={() => void act(dose, action)} variant={action === 'Taken' ? 'primary' : action === 'Skipped' ? 'secondary' : 'plain'}
              style={stacked ? undefined : { flex: action === 'Taken' ? 1.4 : 1, paddingHorizontal: 8 }} />;
          })}
        </View>}
      </Card>
    </Animated.View>;
  }

  const sections = ([['Due Now', due], [viewingToday ? 'Upcoming' : 'Scheduled', upcoming], ['Logged', earlier]] as const).filter(([, doses]) => doses.length > 0);
  const percent = todaysDoses.length ? Math.round(taken / todaysDoses.length * 100) : 0;
  const dateLabel = viewedDate ? parseDateKey(viewedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  const weekDays: WeekDay[] = data.dates.map(date => {
    const doses = data.days[date] ?? [];
    const day = parseDateKey(date);
    const takenCount = doses.filter(dose => dose.status === 'Taken').length;
    const summary = doses.length ? `${takenCount} of ${doses.length} ${doses.length === 1 ? 'dose' : 'doses'} taken` : 'no doses';
    return { date, weekday: day.toLocaleDateString(undefined, { weekday: 'short' }), dayNumber: day.getDate(), isToday: date === data.today,
      status: dayStatus(doses), label: `${date === data.today ? 'Today, ' : ''}${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, ${date > data.today ? `${doses.length} scheduled` : summary}` };
  });
  const dayWord = viewingToday ? 'today' : 'this day';
  // The native stack header carries the "Today" title and the screen's actions on one row.
  return <View style={{ flex: 1 }} collapsable={false}>
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.View hidesSharedBackground>
        <AppText accessibilityRole="header" variant="title1" numberOfLines={1} maxFontSizeMultiplier={1.2}>Today</AppText>
      </Stack.Toolbar.View>
    </Stack.Toolbar>
    <Stack.Screen options={{ headerLargeTitleEnabled: false, headerTitle: '',
      headerRight: () => <View style={{ flexDirection: 'row' }}>
      <IconButton icon="medicines" accessibilityLabel="View medicines" color={colors.accentText} onPress={() => router.push('/medicines')} />
      <IconButton icon="add" accessibilityLabel="Add medicine" color={colors.accentText} onPress={() => router.push('/add-medicine')} />
    </View> }} />
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 96, gap: 12 }}>
      {!!dateLabel && <AppText variant="subhead" tone="secondary">{dateLabel}</AppText>}
      <ProfileSwitcherTrigger showOtherProfiles />
      {weekDays.length > 0 && <WeekStrip days={weekDays} selected={viewedDate} onSelect={setPickedDate} />}

      {todaysDoses.length > 0 && !viewingFuture && <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="footnote" tone="secondary">{percent === 100 ? 'All doses taken' : viewingToday ? 'Daily progress' : 'Day summary'}</AppText>
          <AppText variant="title1" style={{ fontVariant: ['tabular-nums'] }}>{taken} <AppText variant="subhead" tone="secondary">of {todaysDoses.length} {todaysDoses.length === 1 ? 'dose' : 'doses'} taken</AppText></AppText>
        </View>
        <ProgressRing percent={percent} />
      </Card>}

      {!!(error || message) && <InlineMessage tone={error ? 'danger' : 'info'} message={error || message} actionTitle={error ? 'Retry' : undefined} onAction={() => void reload()} />}
      {!!params.scheduleId && !loading && !shown.some(selected) && <InlineMessage tone="warning" message="This reminder is no longer active." />}

      {loading ? <View style={{ paddingVertical: 32, alignItems: 'center' }}><ActivityIndicator color={colors.secondaryLabel} accessibilityLabel="Loading doses" /></View>
        : !shown.length ? <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft, marginBottom: 4 }}>
            <Icon name="emptyDay" size={28} color={colors.accentText} />
          </View>
          <AppText variant="headline" style={{ textAlign: 'center' }}>No doses scheduled {dayWord}</AppText>
          <AppText variant="subhead" tone="secondary" style={{ textAlign: 'center', maxWidth: 280 }}>{viewingToday ? 'Add a medicine and its dose times to start tracking.' : 'Pick another day, or add a medicine to schedule doses.'}</AppText>
          {viewingToday && <Button title="Add Medicine" icon="add" onPress={() => router.push('/add-medicine')} style={{ marginTop: 8 }} />}
        </Card>
        : <>
          {viewingToday && !due.length && <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
