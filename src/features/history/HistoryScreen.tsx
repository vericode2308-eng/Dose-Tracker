import { publicErrorMessage } from '@/features/security/errors';
import { Feather } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { fetchHistoryByMonth, updateDoseLogTime, type HistoryRecord } from '@/database';
import { undoMedicationDose } from '@/notificationManager';
import { useProfiles } from '@/features/profiles/context';
import { ProfileSwitcherTrigger } from '@/features/profiles/ProfileSwitcher';
import { dateKey } from '@/features/doses/occurrences';
import { useLocalQuery } from '@/features/doses/useLocalQuery';
import { useTheme, type ThemeColors } from '@/features/theme/ThemeContext';
import { ActionMenu } from '@/features/ui/ActionMenu';
import { Button } from '@/features/ui/Button';
import { confirmDestructive } from '@/features/ui/confirm';
import { TimePickerField } from '@/features/ui/DateTimePickers';
import { GlassSheetSurface } from '@/features/ui/GlassSheetSurface';
import { InlineMessage } from '@/features/ui/InlineMessage';

type Status = HistoryRecord['status'];
type Sheet = HistoryRecord | null;
const STATUSES: Status[] = ['Taken', 'Skipped / missed'];
const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const pickerTime = (at: number) => new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

/** Filter chip that opens a native menu of choices; the current choice is checked. */
function FilterMenu({ label, value, options, onSelect, colors }: {
  label: string; value: string; options: { id: string; title: string }[]; onSelect: (id: string) => void; colors: ThemeColors;
}) {
  const current = options.find(option => option.id === value)?.title ?? value;
  return <ActionMenu title={label} accessibilityLabel={`${label}, ${current}`} onSelect={onSelect}
    items={options.map(option => ({ ...option, checked: option.id === value }))}>
    <View className="min-h-[40px] flex-row items-center gap-1.5 rounded-full px-3.5" style={{ backgroundColor: value === options[0]?.id ? colors.fill : colors.accentSoft }}>
      <Text numberOfLines={1} className="text-subhead font-semibold" style={{ color: value === options[0]?.id ? colors.label : colors.accentText }}>{current}</Text>
      <Feather name="chevron-down" size={14} color={value === options[0]?.id ? colors.secondaryLabel : colors.accentText} />
    </View>
  </ActionMenu>;
}

export default function HistoryScreen() {
  const { currentProfile } = useProfiles();
  return <ProfileHistory key={currentProfile?.id} />;
}

function ProfileHistory() {
  const { currentProfile } = useProfiles();
  const { colors } = useTheme();
  const COLORS: Record<Status, string> = { Taken: colors.success, 'Skipped / missed': colors.warning };
  const [month, setMonth] = useState(() => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [range, setRange] = useState('This month');
  const [medicine, setMedicine] = useState('All');
  const [status, setStatus] = useState<Status | 'All'>('All');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busyUndo, setBusyUndo] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [editedTime, setEditedTime] = useState('');
  const [recordError, setRecordError] = useState('');
  const query = useCallback(async () => {
    let from = dateKey(month);
    let to = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    if (range !== 'This month') {
      const today = new Date(); to = dateKey(today);
      today.setDate(today.getDate() - (range === 'Last 30 days' ? 29 : 89)); from = dateKey(today);
    }
    const grouped = await fetchHistoryByMonth({ from, to, profileId: currentProfile?.id });
    return grouped.flatMap(group => group.records);
  }, [month, range, currentProfile?.id]);
  const { data: records, loading, error, reload } = useLocalQuery(query, [] as HistoryRecord[], 60_000);
  const medicines = [...new Map(records.map(record => [record.medicineId, record.medicineName])).entries()];
  const filtered = records.filter(record => (medicine === 'All' || record.medicineId === medicine) && (status === 'All' || record.status === status));
  const displayed = filtered.filter(record => !selectedDate || record.date === selectedDate);
  const title = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const first = new Date(month); first.setDate(first.getDate() - (first.getDay() + 6) % 7);
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(first); day.setDate(day.getDate() + index); return day; });
  const changeMonth = (offset: number) => { setMonth(value => new Date(value.getFullYear(), value.getMonth() + offset, 1)); setSelectedDate(null); setRange('This month'); };
  const close = () => { setSheet(null); setEditingTime(false); setRecordError(''); };
  const openRecord = (record: HistoryRecord) => {
    setEditedTime(record.actualTakenAtMs ? pickerTime(record.actualTakenAtMs) : '9:00 AM');
    setEditingTime(false);
    setRecordError('');
    setSheet(record);
  };
  const saveEditedTime = async (record: HistoryRecord) => {
    const match = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i.exec(editedTime.trim());
    if (!match) { setRecordError('Choose a valid time.'); return; }
    const [, hour, minute, period] = match;
    const [year, month, day] = record.date.split('-').map(Number);
    const hour24 = Number(hour) % 12 + (period.toUpperCase() === 'PM' ? 12 : 0);
    const actualTakenAtMs = new Date(year, month - 1, day, hour24, Number(minute)).getTime();
    setBusyUndo(true);
    try {
      await updateDoseLogTime({ historyId: record.id, actualTakenAtMs });
      close();
      await reload();
    } catch (cause) {
      setRecordError(publicErrorMessage(cause, 'Unable to update the logged time.'));
    } finally { setBusyUndo(false); }
  };

  return <View style={{ flex: 1 }} collapsable={false}><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="px-4 pb-8 pt-1">
    <View className="mb-2"><ProfileSwitcherTrigger /></View>
    <View className="rounded-[24px] p-3" style={{ backgroundColor: colors.surface }}>
      <View className="mb-2 flex-row items-center justify-between"><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} className="h-11 w-11 items-center justify-center"><Feather name="chevron-left" size={23} color={colors.ink} /></Pressable><Text className="text-base font-semibold" style={{ color: colors.ink }}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => changeMonth(1)} className="h-11 w-11 items-center justify-center"><Feather name="chevron-right" size={23} color={colors.ink} /></Pressable></View>
      <View className="flex-row">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <Text key={day} className="flex-1 text-center text-xs" style={{ color: colors.secondary }}>{day}</Text>)}</View>
      {Array.from({ length: 6 }, (_, week) => <View key={week} className="flex-row">{days.slice(week * 7, week * 7 + 7).map(day => {
        const key = dateKey(day); const dayRecords = filtered.filter(record => record.date === key);
        const marks = [...new Set(dayRecords.map(record => record.status))];
        const selected = selectedDate === key;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${key}, ${dayRecords.length} records${marks.length ? `, ${marks.join(', ')}` : ''}`} accessibilityState={{ selected }} onPress={() => { setSelectedDate(key); if (day.getMonth() !== month.getMonth()) { setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); setRange('This month'); } }} className="min-h-11 flex-1 items-center justify-center"><View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: selected ? colors.primary : 'transparent' }}><Text style={{ color: selected ? colors.onPrimary : day.getMonth() === month.getMonth() ? colors.ink : colors.secondary }}>{day.getDate()}</Text><View className="absolute bottom-0.5 flex-row gap-0.5">{marks.map(mark => <View key={mark} className="h-1 w-1 rounded-full" style={{ backgroundColor: COLORS[mark] }} />)}</View></View></Pressable>;
      })}</View>)}
      <View className="mt-2 flex-row justify-around">{Object.entries(COLORS).map(([label, color]) => <View key={label} className="flex-row items-center gap-1"><View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><Text className="text-xs" style={{ color: colors.secondary }}>{label}</Text></View>)}</View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mt-3" contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      <FilterMenu label="Date range" value={range} colors={colors} onSelect={id => { setRange(id); setSelectedDate(null); }}
        options={['This month', 'Last 30 days', 'Last 90 days'].map(id => ({ id, title: id }))} />
      <FilterMenu label="Medicine" value={medicine} colors={colors} onSelect={setMedicine}
        options={[{ id: 'All', title: 'All medicines' }, ...medicines.map(([id, name]) => ({ id, title: name }))]} />
      <FilterMenu label="Status" value={status} colors={colors} onSelect={id => setStatus(id as Status | 'All')}
        options={[{ id: 'All', title: 'All statuses' }, ...STATUSES.map(id => ({ id, title: id }))]} />
    </ScrollView>
    {selectedDate && <Pressable accessibilityRole="button" accessibilityLabel="Show all days" onPress={() => setSelectedDate(null)} className="mt-2 min-h-11 justify-center"><Text className="font-medium" style={{ color: colors.accentText }}>{selectedDate} · Show all days</Text></Pressable>}
    {!!error && <InlineMessage tone="warning" message={error} actionTitle="Retry" onAction={() => void reload()} style={{ marginTop: 12 }} />}
    <View className="mb-2 mt-4 flex-row items-center justify-between"><Text accessibilityRole="header" className="text-xl font-semibold" style={{ color: colors.ink }}>Records · {displayed.length}</Text><Pressable accessibilityRole="button" onPress={() => router.navigate('/')} className="min-h-11 justify-center"><Text className="font-medium" style={{ color: colors.accentText }}>Log a dose</Text></Pressable></View>
    <View className="overflow-hidden rounded-[22px]" style={{ backgroundColor: colors.surface }}>{loading ? <Text className="p-5" style={{ color: colors.secondary }}>Loading history…</Text> : displayed.map(record => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`${record.medicineName}, ${record.status}, ${record.date}`} onPress={() => openRecord(record)} className="min-h-20 flex-row items-center gap-3 border-b p-3" style={{ borderBottomColor: colors.border }}><View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: COLORS[record.status] }}><Feather name={record.status === 'Taken' ? 'check' : 'minus'} size={20} color="white" /></View><View className="flex-1"><Text className="text-base font-semibold" style={{ color: colors.ink }}>{record.medicineName}</Text><Text className="mt-1 text-sm" style={{ color: colors.secondary }}>{record.date} · {record.status}{record.actualTakenAtMs ? ` at ${time(record.actualTakenAtMs)}` : ''}</Text><Text className="mt-1 text-xs" style={{ color: colors.secondary }}>{record.doseAmount} {record.doseUnit || record.dosageForm}{record.scheduledAtMs ? ` · Planned ${time(record.scheduledAtMs)}` : ''}</Text></View><Feather name="chevron-right" size={18} color={colors.ink} /></Pressable>)}{!loading && !displayed.length && <Text className="p-6 text-center" style={{ color: colors.secondary }}>No matching dose records.</Text>}</View>
  </ScrollView>
  <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={close}><View className="flex-1 justify-end bg-black/30"><GlassSheetSurface edges={['bottom']} className="max-h-[80%] w-full max-w-[440px] self-center overflow-hidden rounded-t-[28px]" tint={colors.background}><ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20 }}><View className="mb-3 flex-row items-start gap-3"><Text className="min-w-0 flex-1 pt-2 text-xl font-semibold leading-7" style={{ color: colors.ink }}>{sheet?.medicineName}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} className="h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}><Feather name="x" size={24} color={colors.ink} /></Pressable></View>
    {sheet && (
      <View className="gap-3 rounded-2xl p-5" style={{ backgroundColor: colors.surface }}>
        <Text style={{ color: colors.ink }}>{sheet.date}</Text>
        <Text style={{ color: sheet.status === 'Taken' ? colors.successText : colors.warningText }}>{sheet.status}</Text>
        <Text style={{ color: colors.ink }}>{sheet.doseAmount} {sheet.doseUnit || sheet.dosageForm}</Text>
        {sheet.scheduledAtMs && <Text style={{ color: colors.secondary }}>Scheduled: {time(sheet.scheduledAtMs)}</Text>}
        {sheet.actualTakenAtMs && <Text style={{ color: colors.secondary }}>Taken: {time(sheet.actualTakenAtMs)}</Text>}
        {sheet.status === 'Taken' && (editingTime ? <View className="gap-2"><Text className="text-sm" style={{ color: colors.secondary }}>* Required</Text><TimePickerField required label="Correct logged time" value={editedTime} onChange={setEditedTime} /><Pressable accessibilityRole="button" disabled={busyUndo} onPress={() => void saveEditedTime(sheet)} className="min-h-12 items-center justify-center rounded-xl" style={{ backgroundColor: colors.primary }}><Text className="font-semibold" style={{ color: colors.onPrimary }}>Save corrected time</Text></Pressable></View> : <Pressable accessibilityRole="button" accessibilityLabel="Edit logged time" onPress={() => setEditingTime(true)} className="min-h-11 justify-center"><Text className="font-semibold" style={{ color: colors.accentText }}>Edit logged time</Text></Pressable>)}
        {!!recordError && <Text accessibilityRole="alert" style={{ color: colors.dangerText }}>{recordError}</Text>}
        <Button
          variant="destructiveSoft"
          icon="undo"
          title={busyUndo ? 'Removing…' : 'Remove From History'}
          accessibilityLabel={`Undo and remove log for ${sheet.medicineName}`}
          disabled={busyUndo}
          style={{ marginTop: 8 }}
          onPress={async () => {
            const confirmed = await confirmDestructive({
              title: 'Remove this dose?',
              message: `The ${sheet.status.toLowerCase()} record for ${sheet.medicineName} on ${sheet.date} will be removed from history.`,
              confirmLabel: 'Remove Dose',
            });
            if (!confirmed) return;
            setBusyUndo(true);
            try {
              const result = await undoMedicationDose({
                scheduleId: sheet.scheduleId,
                date: sheet.date,
                scheduledAtMs: sheet.scheduledAtMs || 0,
              });
              close();
              await reload();
              if (result.message) Alert.alert('Stock check needed', result.message);
            } catch (cause) {
              setRecordError(publicErrorMessage(cause, 'Unable to undo this dose.'));
            } finally {
              setBusyUndo(false);
            }
          }}
        />
      </View>
    )}
  </ScrollView></GlassSheetSurface></View></Modal></View>;
}
