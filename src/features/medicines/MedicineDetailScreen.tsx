import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMedicines, type Medicine } from './context';
import { fetchHistoryByMonth } from '@/database';
import { useLocalQuery } from '@/features/doses/useLocalQuery';
import { updateMedicineWithReminders, deleteMedicineWithReminders, setScheduleReminderEnabled } from '@/notificationManager';

const NAVY = '#071629';
type Icon = ComponentProps<typeof Feather>['name'];
type Panel = 'options' | 'edit' | 'refill' | 'archive' | 'delete' | number | null;

function MetadataRow({ icon, label, value }: { icon: Icon | 'infinity' | 'pill'; label: string; value?: string }) {
  return <View className="min-h-[29px] flex-row items-center gap-4">
    {icon === 'infinity' || icon === 'pill' ? <MaterialCommunityIcons name={icon} size={19} color={NAVY} /> : <Feather name={icon} size={17} color={NAVY} />}
    <Text className="flex-1 text-[14px] leading-5 text-[#536073]">{label}</Text>
    {value && <Text className="text-right text-[14px] leading-5 text-[#536073]">{value}</Text>}
  </View>;
}

function Action({ icon, title, onPress, dark = false, danger = false }: { icon?: Icon; title: string; onPress: () => void; dark?: boolean; danger?: boolean }) {
  const color = dark ? '#FFFFFF' : danger ? '#DD0606' : NAVY;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} className={`min-h-11 flex-1 flex-row items-center justify-center gap-2.5 rounded-[15px] border px-2 active:opacity-70 ${dark ? 'border-[#071629] bg-[#071629]' : danger ? 'border-[#FFC5C5] bg-[#FFEAEA]' : 'border-[#E3E5E9] bg-white'}`}>
    {icon && <Feather name={icon} size={19} color={color} />}<Text className="text-[14px] font-medium" style={{ color }}>{title}</Text>
  </Pressable>;
}

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { medicines, setMedicines } = useMedicines();
  const medicine = medicines.find(m => m.id === id);
  const historyQuery = useCallback(async () => (await fetchHistoryByMonth({ medicineId: id })).flatMap(group => group.records).slice(0, 5).map(record => ({
    id: record.id, date: record.date, status: record.status,
    time: record.actualTakenAtMs || record.scheduledAtMs ? new Date(record.actualTakenAtMs || record.scheduledAtMs!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Not recorded',
    amount: `${record.doseAmount} ${record.doseUnit || record.dosageForm}`,
  })), [id]);
  const { data: records } = useLocalQuery(historyQuery, []);
  const [panel, setPanel] = useState<Panel>(null);
  const [quantity, setQuantity] = useState('30');
  const [draftName, setDraftName] = useState('');
  const [draftDosage, setDraftDosage] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
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
      const message = error instanceof Error ? error.message : 'Could not save the medicine.';
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
    } catch { setError('Deletion or reminder reconciliation failed. Please retry.'); }
    finally { saving.current = false; }
  }
  async function toggleReminder(enabled: boolean) {
    if (saving.current || !medicine?.scheduleId) return;
    saving.current = true;
    setFeedback('Updating reminders…');
    try {
      const result = await setScheduleReminderEnabled(medicine.scheduleId, enabled);
      setMedicines(items => items.map(item => item.id === id ? { ...item, reminderEnabled: enabled } : item));
      setFeedback(!enabled && result.message.startsWith('Reminder preference saved') ? result.message
        : enabled && (!result.allowed || result.issues.length)
        ? `Reminder requested. ${result.issues.join(' ') || result.message}`
        : enabled ? 'Reminder is on.' : 'Reminder is off. Dose tracking continues.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Could not update the reminder.'); }
    finally { saving.current = false; }
  }
  function edit() {
    if (!medicine) return;
    setDraftName(medicine.name); setDraftDosage(medicine.strength || ''); setDraftNotes(medicine.notes ?? ''); setPanel('edit');
  }
  if (!medicine) return <SafeAreaView className="flex-1 items-center justify-center gap-5 bg-[#FBF8F3] p-6"><Text className="text-xl text-[#071629]">Medicine not found</Text><View className="h-11 w-full"><Action title="Back to Medicines" onPress={() => router.dismissTo('/medicines')} /></View></SafeAreaView>;
  const lowStock = medicine.stock !== undefined && medicine.stock <= (medicine.stockThreshold ?? 10);

  return <SafeAreaView className="flex-1 bg-[#FBF8F3]" edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 }}>
      <View className="mb-2 flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Medicines" onPress={() => router.dismissTo('/medicines')} className="h-11 w-11 items-center justify-center"><Feather name="arrow-left" size={24} color={NAVY} /></Pressable>
        <Text accessibilityRole="header" numberOfLines={1} className="flex-1 text-[20px] font-semibold tracking-[-0.5px] text-[#071629]">{medicine.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit medicine" onPress={edit} className="h-11 w-9 items-center justify-center"><Feather name="edit-2" size={22} color={NAVY} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Medicine options" onPress={() => setPanel('options')} className="h-11 w-8 items-center justify-center"><Feather name="more-vertical" size={23} color={NAVY} /></Pressable>
      </View>

      <View className="rounded-[24px] bg-white p-3.5">
        <View className="mb-2 flex-row items-start gap-3.5">
          <View className="h-[55px] w-[55px] items-center justify-center rounded-full" style={{ backgroundColor: medicine.color }}><MaterialCommunityIcons name="pill" size={32} color="white" /></View>
          <View className="min-w-0 flex-1"><View className="flex-row flex-wrap items-center justify-between gap-1"><Text className="text-[20px] font-semibold leading-6 tracking-[-0.5px] text-[#071629]">{medicine.name}</Text>{medicine.tag && <View accessibilityLabel={`Take ${medicine.tag.toLowerCase()}`} className="rounded-full bg-[#E3EFFF] px-3 py-1"><Text className="text-[12px] font-medium text-[#005CF5]">{medicine.tag}</Text></View>}</View><Text className="mt-0.5 text-[14px] leading-5 text-[#536073]">{medicine.dosage}</Text>{medicine.purpose && <View className="mt-1 flex-row items-center gap-2"><MaterialCommunityIcons name="heart-pulse" size={16} color={NAVY} /><Text className="text-[12px] text-[#536073]">{medicine.purpose}</Text></View>}</View>
        </View>
        {medicine.status !== 'Active' && <Text accessibilityLiveRegion="polite" className="mb-2 rounded-xl bg-[#F1EEEA] p-2 text-sm text-[#536073]">{medicine.status}</Text>}
        <MetadataRow icon="calendar" label={medicine.schedule ?? (medicine.time ? `Daily at ${medicine.time}` : 'As needed')} />
        {!!medicine.scheduleId && <View className="my-2 flex-row items-center gap-3 rounded-2xl border border-[#E3E5E9] p-3"><View className="flex-1"><Text className="text-[14px] font-medium text-[#071629]">Dose reminders</Text><Text className="text-[12px] leading-5 text-[#536073]">{medicine.reminderSupported ? 'Optional device alerts. Dose tracking works with reminders off.' : 'Available for ongoing daily or weekday schedules starting today.'}</Text></View><Switch accessibilityLabel="Dose reminders" value={!!medicine.reminderEnabled} disabled={!medicine.reminderSupported || medicine.status !== 'Active'} onValueChange={value => void toggleReminder(value)} /></View>}
        <MetadataRow icon="pill" label="Dose amount" value={medicine.doseAmount ?? '1 tablet'} />
        <MetadataRow icon="calendar" label="Started" value={medicine.startDate ?? 'Not set'} />
        <MetadataRow icon="infinity" label={medicine.duration ?? 'No end date'} />
        <MetadataRow icon="archive" label="Stock remaining" value={medicine.stock === undefined ? 'Not tracked' : `${medicine.stock} ${medicine.form?.toLowerCase() ?? 'tablet'}${medicine.stock === 1 ? '' : 's'}`} />
        {lowStock && <View accessibilityRole="alert" className="mb-2 mt-2 min-h-[52px] flex-row items-center gap-4 rounded-[14px] bg-[#FFEAEA] px-3 py-2"><View className="h-7 w-7 items-center justify-center rounded-full bg-[#E11717]"><Text className="text-xl font-bold leading-6 text-white">!</Text></View><View><Text className="text-[16px] font-semibold text-[#D90000]">Low stock</Text><Text className="mt-0.5 text-[12px] text-[#D90000]">Only {medicine.stock} tablets remaining.</Text></View></View>}
        <Pressable accessibilityRole="button" onPress={() => { setQuantity('30'); setPanel('refill'); }} className={`${lowStock ? '' : 'mt-3'} min-h-11 flex-row items-center justify-center gap-3 rounded-full bg-[#071629] active:opacity-70`}><Feather name="archive" size={19} color="white" /><Text className="text-[16px] font-medium text-white">Log Refill</Text></Pressable>
      </View>

      <View className="mt-3 flex-row items-center gap-4 rounded-[22px] bg-white px-4 py-2.5"><Feather name="file-text" size={23} color={NAVY} /><View className="flex-1"><Text className="text-[14px] font-medium text-[#071629]">Notes</Text><Text className="mt-0.5 text-[12px] leading-[18px] text-[#536073]">{medicine.notes || 'No notes added.'}</Text></View></View>

      <View className="mt-3 rounded-[24px] bg-white px-4 pb-1 pt-3">
        <View className="mb-1 flex-row flex-wrap items-center justify-between gap-1"><Text accessibilityRole="header" className="text-[16px] font-semibold tracking-[-0.4px] text-[#071629]">Recent Dose Records</Text><Pressable accessibilityRole="button" accessibilityLabel="See all in History" hitSlop={10} onPress={() => router.push('/history')} className="min-h-6 flex-row items-center gap-1.5"><Text className="text-[12px] font-medium text-[#0065FF]">See all in History</Text><Feather name="arrow-right" size={19} color="#0065FF" /></Pressable></View>
        {records.map((record, index) => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`Dose record, ${record.date}, ${record.status}, ${record.time}`} onPress={() => setPanel(index)} className={`min-h-[46px] flex-row items-center gap-3 py-1 ${index ? 'border-t border-[#E9EBED]' : ''}`}><View className="h-[27px] w-[27px] items-center justify-center rounded-full bg-[#536073]"><Feather name={record.status === 'Taken' ? 'check' : 'minus'} size={20} color="white" /></View><View className="flex-1"><Text className="text-[13px] leading-[18px] text-[#071629]">{record.date}</Text><Text className="text-[12px] leading-[18px] text-[#536073]">{record.time} · {record.status}</Text></View><View className="border-l border-[#F0F1F3] pl-3"><Text className="text-[12px] text-[#536073]">{record.amount}</Text></View><Feather name="chevron-right" size={20} color={NAVY} /></Pressable>)}
        {!records.length && <Text className="py-5 text-sm text-[#536073]">No recent dose records.</Text>}
      </View>

      <View className="mt-2.5 flex-row gap-2"><Action icon="edit-2" title="Edit" onPress={edit} /><Action icon={medicine.status === 'Paused' ? 'play' : 'pause'} title={medicine.status === 'Paused' ? 'Resume' : 'Pause'} onPress={() => { void update({ status: medicine.status === 'Paused' ? 'Active' : 'Paused' }); }} /><Action icon="archive" title={medicine.status === 'Archived' ? 'Restore' : 'Archive'} onPress={() => medicine.status === 'Archived' ? update({ status: 'Active' }) : setPanel('archive')} /></View>
      <View className="mt-2"><Action icon="trash-2" title="Delete Medicine" danger onPress={() => setPanel('delete')} /></View>
      {!!feedback && <Text accessibilityLiveRegion="polite" className="mt-3 text-center text-sm text-[#176A4C]">{feedback}</Text>}
    </ScrollView>

    <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/30">
        <SafeAreaView edges={['bottom']} className="max-h-[85%] w-full max-w-[440px] self-center rounded-t-[28px] bg-[#FBF8F3]">
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
            <View className="mb-4 flex-row items-center justify-between"><Text className="flex-1 text-[22px] font-semibold text-[#071629]">{panel === 'refill' ? 'Log Refill' : panel === 'edit' ? 'Edit Medicine' : panel === 'archive' ? 'Archive Medicine?' : panel === 'delete' ? 'Delete Medicine?' : typeof panel === 'number' ? 'Dose record' : 'Medicine options'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} className="h-11 w-11 items-center justify-center rounded-full bg-white"><Feather name="x" size={22} color={NAVY} /></Pressable></View>
            {panel === 'refill' && <><Text className="mb-3 text-base text-[#536073]">How many tablets did you add?</Text><TextInput accessibilityLabel="Tablets added" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} className="mb-4 rounded-2xl bg-white p-4 text-base text-[#071629]" /><Action title="Save refill" dark onPress={() => { const amount = Number(quantity); if (!/^\d+$/.test(quantity) || !Number.isSafeInteger(amount) || amount < 1 || amount > 10000) { setError('Enter a whole number between 1 and 10,000.'); return; } void update({ stock: (medicine.stock ?? 0) + amount }); }} /></>}
            {panel === 'edit' && <><TextInput accessibilityLabel="Medicine name" value={draftName} onChangeText={setDraftName} className="mb-3 rounded-2xl bg-white p-4 text-base text-[#071629]" /><TextInput accessibilityLabel="Strength" placeholder="Strength (optional)" value={draftDosage} onChangeText={setDraftDosage} className="mb-3 rounded-2xl bg-white p-4 text-base text-[#071629]" /><TextInput accessibilityLabel="Notes" multiline value={draftNotes} onChangeText={setDraftNotes} placeholder="Notes" className="mb-4 min-h-20 rounded-2xl bg-white p-4 text-base text-[#071629]" /><Action title="Save changes" dark onPress={() => { if (!draftName.trim()) { setError('Enter a medicine name.'); return; } void update({ name: draftName.trim(), strength: draftDosage.trim(), dosage: [draftDosage.trim(), medicine.form].filter(Boolean).join(' '), notes: draftNotes.trim() }); }} /></>}
            {(panel === 'archive' || panel === 'delete') && <><Text className="mb-5 text-base leading-6 text-[#536073]">{panel === 'archive' ? `${medicine.name} will move to Archived. You can restore it later.` : `Permanently delete ${medicine.name}, its dose history and its reminders?`}</Text><View className="flex-row gap-3"><Action title="Cancel" onPress={close} /><Action title={panel === 'archive' ? 'Confirm archive' : 'Confirm delete'} danger={panel === 'delete'} dark={panel === 'archive'} onPress={() => { if (panel === 'archive') { void update({ status: 'Archived' }); } else { void remove(); } }} /></View></>}
            {panel === 'options' && <View className="gap-3"><Action title="Edit medicine" icon="edit-2" onPress={edit} /><Action title="Log refill" icon="archive" onPress={() => setPanel('refill')} /><Action title="View dose history" icon="clock" onPress={() => { close(); router.push('/history'); }} /></View>}
            {typeof panel === 'number' && <View className="gap-3 rounded-2xl bg-white p-5"><Text className="text-lg font-semibold text-[#071629]">{medicine.name}</Text><Text className="text-base text-[#536073]">{records[panel]?.date}</Text><Text className="text-base text-[#536073]">{records[panel]?.time} · {records[panel]?.status}</Text><Text className="text-base text-[#536073]">Dose: {records[panel]?.amount}</Text></View>}
            {!!error && <Text accessibilityRole="alert" className="mt-3 text-sm text-[#D90000]">{error}</Text>}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}
