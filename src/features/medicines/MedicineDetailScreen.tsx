import { publicErrorMessage } from '@/features/security/errors';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMedicines, type Medicine } from './context';
import { fetchHistoryByMonth } from '@/database';
import { useLocalQuery } from '@/features/doses/useLocalQuery';
import { updateMedicineWithReminders, deleteMedicineWithReminders, setScheduleReminderEnabled } from '@/notificationManager';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';
import { Button } from '@/features/ui/Button';
import { Card } from '@/features/ui/Card';
import { Icon, type IconName } from '@/features/ui/Icon';
import { IconButton } from '@/features/ui/IconButton';
import { InlineMessage } from '@/features/ui/InlineMessage';
import { Sheet } from '@/features/ui/Sheet';
import { confirmDestructive } from '@/features/ui/confirm';
import { radii } from '../../../theme';

type Panel = 'options' | 'refill' | number | null;

/** Stock unit from the medicine form, e.g. "1 capsule", "4 capsules". */
function unitLabel(form: string | undefined, count: number) {
  const base = !form || form === 'Other' ? 'unit' : form.toLowerCase();
  return count === 1 ? base : `${base}s`;
}

function dayLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(date.getFullYear() !== today.getFullYear() && { year: 'numeric' }) });
}

function SectionLabel({ children }: { children: string }) {
  return <AppText accessibilityRole="header" variant="footnote" tone="secondary" style={{ textTransform: 'uppercase', paddingHorizontal: 4, marginTop: 6 }}>{children}</AppText>;
}

/** Inset grouped row: icon, label, trailing value or control, hairline to the next row. */
function Row({ icon, label, detail, value, last = false, children }: {
  icon: IconName; label: string; detail?: string; value?: string; last?: boolean; children?: ReactNode;
}) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingVertical: 8, paddingRight: 16,
    borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.separator }}>
    <View style={{ width: 22, alignItems: 'center' }}><Icon name={icon} size={19} color={colors.accentText} /></View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <AppText variant="body">{label}</AppText>
      {!!detail && <AppText variant="footnote" tone="secondary">{detail}</AppText>}
    </View>
    {!!value && <AppText variant="body" tone="secondary" selectable style={{ fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' }}>{value}</AppText>}
    {children}
  </View>;
}

function GroupCard({ children }: { children: ReactNode }) {
  return <Card padded={false} style={{ paddingLeft: 16, overflow: 'hidden' }}>{children}</Card>;
}

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { medicines, setMedicines } = useMedicines();
  const { colors } = useTheme();
  const medicine = medicines.find(m => m.id === id);
  const historyQuery = useCallback(async () => (await fetchHistoryByMonth({ medicineId: id })).flatMap(group => group.records).slice(0, 5).map(record => ({
    id: record.id, date: record.date, status: record.status,
    time: record.actualTakenAtMs || record.scheduledAtMs ? new Date(record.actualTakenAtMs || record.scheduledAtMs!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Not recorded',
    amount: `${record.doseAmount} ${record.doseUnit || record.dosageForm}`,
  })), [id]);
  const { data: records } = useLocalQuery(historyQuery, []);
  const [panel, setPanel] = useState<Panel>(null);
  const [quantity, setQuantity] = useState('30');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const close = () => { setPanel(null); setError(''); };
  const saving = useRef(false);
  async function update(patch: Partial<Medicine>) {
    if (saving.current) return;
    saving.current = true;
    setError(''); setFeedback('Saving…');
    try {
      const result = await updateMedicineWithReminders(id, { name: patch.name, strength: patch.strength,
        notes: patch.notes, stockRemaining: patch.stock, status: patch.status });
      setMedicines(items => items.map(m => m.id === id ? { ...m, ...patch } : m));
      close();
      setFeedback(result.issues.length ? `Saved. ${result.issues.join(' ')}` : 'Medicine saved.');
    } catch (error) {
      const message = publicErrorMessage(error, 'Could not save the medicine.');
      setError(message); setFeedback(message);
    } finally { saving.current = false; }
  }
  async function remove() {
    if (saving.current) return;
    saving.current = true;
    try {
      await deleteMedicineWithReminders(id);
      setMedicines(items => items.filter(m => m.id !== id));
      router.dismissTo('/medicines');
    } catch { setFeedback('Deletion or reminder reconciliation failed. Please retry.'); }
    finally { saving.current = false; }
  }
  async function toggleReminder(enabled: boolean, scheduleId = medicine?.scheduleId) {
    if (saving.current || !scheduleId) return;
    saving.current = true;
    setFeedback('Updating reminders…');
    try {
      const result = await setScheduleReminderEnabled(scheduleId, enabled);
      setMedicines(items => items.map(item => item.id === id ? { ...item, reminderEnabled: item.scheduleId === scheduleId ? enabled : item.reminderEnabled, schedules: item.schedules?.map(s => s.id === scheduleId ? { ...s, reminderEnabled: enabled } : s) } : item));
      setFeedback(!enabled && result.message.startsWith('Reminder preference saved') ? result.message
        : enabled && (!result.allowed || result.issues.length)
        ? `Reminder requested. ${result.issues.join(' ') || result.message}`
        : enabled ? 'Reminder is on.' : 'Reminder is off. Dose tracking continues.');
    } catch (error) { setFeedback(publicErrorMessage(error, 'Could not update the reminder.')); }
    finally { saving.current = false; }
  }
  function edit() {
    if (!medicine) return;
    close(); router.push({ pathname: '/edit-medicine', params: { id: medicine.id } });
  }
  async function confirmArchive() {
    if (!medicine) return;
    if (await confirmDestructive({ title: `Archive ${medicine.name}?`, message: 'It moves to Archived and its reminders stop. You can restore it later.', confirmLabel: 'Archive', destructive: false })) {
      void update({ status: 'Archived' });
    }
  }
  async function confirmDelete() {
    if (!medicine) return;
    // Present over any open sheet and close it afterwards: iOS can drop an alert that is
    // presented while a modal is still dismissing.
    const confirmed = await confirmDestructive({ title: `Delete ${medicine.name}?`, message: 'This permanently deletes the medicine, its dose history and its reminders. This can’t be undone.', confirmLabel: 'Delete Medicine' });
    close();
    if (confirmed) void remove();
  }
  const switchColors = { trackColor: { false: colors.fill, true: colors.accent }, ios_backgroundColor: colors.fill };

  if (!medicine) return <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colors.background }}>
    <AppText variant="title3">Medicine not found</AppText>
    <AppText variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>It may have been deleted on this device.</AppText>
    <Button title="Back to Medicines" variant="secondary" onPress={() => router.dismissTo('/medicines')} />
  </SafeAreaView>;

  const lowStock = medicine.stock !== undefined && medicine.stock <= (medicine.stockThreshold ?? 10);
  const multipleSchedules = (medicine.schedules?.length ?? 0) > 1;
  const paused = medicine.status === 'Paused';
  const archived = medicine.status === 'Archived';
  const record = typeof panel === 'number' ? records[panel] : undefined;

  // The native header shows the name as a large title with Edit and More; the back button is the system one.
  return <View style={{ flex: 1 }} collapsable={false}>
    <Stack.Screen options={{ title: medicine.name, headerRight: () => <View style={{ flexDirection: 'row' }}>
      <IconButton icon="edit" accessibilityLabel="Edit medicine" color={colors.accentText} onPress={edit} />
      <IconButton icon="more" accessibilityLabel="More options" color={colors.accentText} onPress={() => setPanel('options')} />
    </View> }} />
    <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 12 }}>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: medicine.color }}>
          <Icon name="pill" size={28} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText variant="headline" selectable>{medicine.dosage}</AppText>
          {!!medicine.purpose && <AppText variant="subhead" tone="secondary">{medicine.purpose}</AppText>}
          {(!!medicine.tag || medicine.status !== 'Active') &&<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {!!medicine.tag && <View accessibilityLabel={`Take ${medicine.tag.toLowerCase()}`} style={{ backgroundColor: colors.infoSoft, borderRadius: radii.chip, paddingHorizontal: 9, paddingVertical: 3 }}>
              <AppText variant="caption" weight="600" tone="info">{medicine.tag}</AppText>
            </View>}
            {medicine.status !== 'Active' && <View accessibilityLiveRegion="polite" style={{ backgroundColor: paused ? colors.warningSoft : colors.fill, borderRadius: radii.chip, paddingHorizontal: 9, paddingVertical: 3 }}>
              <AppText variant="caption" weight="600" tone={paused ? 'warning' : 'secondary'}>{medicine.status}</AppText>
            </View>}
          </View>}
        </View>
      </Card>

      <SectionLabel>Schedule</SectionLabel>
      {multipleSchedules ? medicine.schedules!.map((s, index) => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const supported = !s.pattern.endDate && s.pattern.startDate <= today && ['daily', 'weekdays'].includes(s.pattern.kind);
        const time = s.timeLocalMinute == null ? 'As needed' : `${Math.floor(s.timeLocalMinute / 60) % 12 || 12}:${String(s.timeLocalMinute % 60).padStart(2, '0')} ${s.timeLocalMinute < 720 ? 'AM' : 'PM'}`;
        const frequency = s.pattern.kind === 'daily' ? 'Every day' : s.pattern.kind === 'weekdays' ? s.pattern.weekdays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') : s.pattern.kind === 'prn' ? 'As needed' : `Every ${s.pattern.interval} ${s.pattern.kind === 'hour_interval' ? 'hours' : 'days'}`;
        return <GroupCard key={s.id}>
          <Row icon="clock" label={`${time} · ${s.doseAmount} ${medicine.doseAmount?.split(' ').slice(1).join(' ') || medicine.form}`}
            detail={`${frequency} · From ${s.pattern.startDate}${s.pattern.endDate ? ` until ${s.pattern.endDate}` : ' · Ongoing'}`} />
          <Row icon="bell" label="Dose reminder" detail={supported ? undefined : 'Tracking only: this schedule does not support reminders yet.'} last>
            <Switch accessibilityLabel={`Dose ${index + 1} reminder, ${time}`} value={s.reminderEnabled} disabled={!supported || medicine.status !== 'Active'} onValueChange={value => void toggleReminder(value, s.id)} {...switchColors} />
          </Row>
        </GroupCard>;
      }) : <GroupCard>
        <Row icon="clock" label={medicine.schedule ?? (medicine.time ? `Daily at ${medicine.time}` : 'As needed')} />
        <Row icon="dose" label="Dose amount" value={medicine.doseAmount ?? '1 tablet'} />
        <Row icon="calendar" label="Started" value={medicine.startDate ?? 'Not set'} />
        <Row icon="duration" label={medicine.duration ?? 'No end date'} last={!medicine.scheduleId} />
        {!!medicine.scheduleId && <Row icon="bell" label="Dose reminders" last
          detail={medicine.reminderSupported ? 'Tracking works with reminders off.' : 'Available for ongoing daily or weekday schedules starting today.'}>
          <Switch accessibilityLabel="Dose reminders" value={!!medicine.reminderEnabled} disabled={!medicine.reminderSupported || medicine.status !== 'Active'} onValueChange={value => void toggleReminder(value)} {...switchColors} />
        </Row>}
      </GroupCard>}

      <SectionLabel>Stock</SectionLabel>
      <GroupCard>
        <Row icon="stock" label="Remaining" last={!lowStock}
          value={medicine.stock === undefined ? 'Not tracked' : `${medicine.stock} ${unitLabel(medicine.form, medicine.stock)}`} />
        {lowStock && <InlineMessage tone="danger" title="Low stock" message={`Only ${medicine.stock} ${unitLabel(medicine.form, medicine.stock!)} left.`} style={{ marginTop: 10, marginRight: 16 }} />}
        <View style={{ paddingTop: lowStock ? 10 : 12, paddingBottom: 14, paddingRight: 16 }}>
          <Button title="Log Refill" icon="refill" variant="tinted" onPress={() => { setQuantity('30'); setPanel('refill'); }} />
        </View>
      </GroupCard>

      {!!medicine.notes && <>
        <SectionLabel>Notes</SectionLabel>
        <Card><AppText variant="body" selectable>{medicine.notes}</AppText></Card>
      </>}

      <Card style={{ paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText accessibilityRole="header" variant="headline">Recent doses</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="See all in History" hitSlop={12} onPress={() => router.push('/history')} style={{ minHeight: 44, justifyContent: 'center' }}>
            <AppText variant="subhead" weight="600" tone="accent">See All</AppText>
          </Pressable>
        </View>
        {records.map((item, index) => {
          const taken = item.status === 'Taken';
          return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Dose record, ${dayLabel(item.date)}, ${item.time}, ${item.status}, ${item.amount}`}
            onPress={() => setPanel(index)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8,
              borderTopWidth: 1, borderTopColor: colors.separator, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: taken ? colors.successSoft : colors.warningSoft }}>
              <Icon name={taken ? 'taken' : 'skipped'} size={15} color={taken ? colors.successText : colors.warningText} weight="bold" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="subhead">{dayLabel(item.date)}, {item.time}</AppText>
              <AppText variant="footnote" tone="secondary">{item.status} · {item.amount}</AppText>
            </View>
            <Icon name="chevronRight" size={14} color={colors.tertiaryLabel} weight="semibold" />
          </Pressable>;
        })}
        {!records.length && <AppText variant="subhead" tone="secondary" style={{ paddingVertical: 14 }}>No doses recorded yet.</AppText>}
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Button style={{ flex: 1 }} variant="secondary" icon={paused ? 'resume' : 'pause'} title={paused ? 'Resume' : 'Pause'}
          onPress={() => { void update({ status: paused ? 'Active' : 'Paused' }); }} />
        <Button style={{ flex: 1 }} variant="secondary" icon={archived ? 'restore' : 'archive'} title={archived ? 'Restore' : 'Archive'}
          onPress={() => { if (archived) void update({ status: 'Active' }); else void confirmArchive(); }} />
      </View>
      <Button variant="destructiveSoft" icon="trash" title="Delete Medicine" onPress={() => void confirmDelete()} />
      {!!feedback && <AppText accessibilityLiveRegion="polite" variant="footnote" tone="secondary" style={{ textAlign: 'center' }}>{feedback}</AppText>}
    </ScrollView>

    <Sheet visible={panel !== null} onClose={close}
      title={panel === 'refill' ? 'Log Refill' : panel === 'options' ? medicine.name : 'Dose Record'}>
      {panel === 'refill' && <>
        <AppText variant="subhead" tone="secondary">How many {unitLabel(medicine.form, 2)} did you add?</AppText>
        <TextInput accessibilityLabel={`${unitLabel(medicine.form, 2)} added, required`} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} autoFocus selectTextOnFocus
          style={{ backgroundColor: colors.surface, color: colors.label, borderRadius: radii.control, borderCurve: 'continuous', paddingHorizontal: 16, minHeight: 52, fontSize: 22, fontVariant: ['tabular-nums'], borderWidth: 1, borderColor: colors.separator }} />
        <Button title="Save Refill" onPress={() => { const amount = Number(quantity); if (!/^\d+$/.test(quantity) || !Number.isSafeInteger(amount) || amount < 1 || amount > 10000) { setError('Enter a whole number between 1 and 10,000.'); return; } void update({ stock: (medicine.stock ?? 0) + amount }); }} />
      </>}
      {panel === 'options' && <>
        <Button title="Log Refill" icon="refill" variant="secondary" onPress={() => { setQuantity('30'); setPanel('refill'); }} />
        <Button title="View Dose History" icon="history" variant="secondary" onPress={() => { close(); router.push('/history'); }} />
        <Button title="Delete Medicine" icon="trash" variant="destructiveSoft" onPress={() => void confirmDelete()} />
      </>}
      {record && <Card style={{ gap: 6 }}>
        <AppText variant="headline">{dayLabel(record.date)}, {record.time}</AppText>
        <AppText variant="subhead" tone={record.status === 'Taken' ? 'success' : 'warning'}>{record.status}</AppText>
        <AppText variant="subhead" tone="secondary" selectable>Dose: {record.amount} · {record.date}</AppText>
      </Card>}
      {!!error && <AppText accessibilityRole="alert" variant="footnote" tone="danger">{error}</AppText>}
    </Sheet>
  </View>;
}
