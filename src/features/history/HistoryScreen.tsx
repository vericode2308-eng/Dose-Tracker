import { Feather } from '@expo/vector-icons';
import { useMemo, useState, type ComponentProps } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Status = 'Taken' | 'Missed' | 'Skipped' | 'Extra / PRN';
type RecordItem = { id: string; medicine: string; detail: string; date: string; status: Status; time?: string; note?: string };
type Sheet = 'profile' | 'range' | 'medicine' | 'status' | 'add' | RecordItem | null;
type FeatherName = ComponentProps<typeof Feather>['name'];

const NAVY = '#071629';
const COLORS: Record<Status, string> = { Taken: '#2FC17D', Missed: '#DC0000', Skipped: '#FF8A00', 'Extra / PRN': '#198CF1' };
const BASE_RECORDS: RecordItem[] = [
  { id: 'lisinopril-25', medicine: 'Lisinopril', detail: '1 tablet', date: 'Tue, 25 Sep 2024', status: 'Taken', time: '8:05 AM' },
  { id: 'atorvastatin-24', medicine: 'Atorvastatin', detail: '1 tablet', date: 'Mon, 24 Sep 2024', status: 'Skipped', note: 'Felt nauseous' },
  { id: 'vitamin-23', medicine: 'Vitamin D3', detail: '1 softgel', date: 'Mon, 23 Sep 2024', status: 'Extra / PRN', time: '6:30 PM' },
  { id: 'metformin-22', medicine: 'Metformin', detail: '1 tablet', date: 'Sun, 22 Sep 2024', status: 'Missed' },
];
const MARKS: Record<number, Status> = { 3: 'Taken', 4: 'Taken', 5: 'Missed', 16: 'Missed', 18: 'Taken', 22: 'Skipped', 23: 'Extra / PRN', 24: 'Skipped', 25: 'Taken' };
const WEEKS = [
  [{ d: 26, muted: true }, { d: 27, muted: true }, { d: 28, muted: true }, { d: 29, muted: true }, { d: 30, muted: true }, { d: 31, muted: true }, { d: 1 }],
  [2, 3, 4, 5, 6, 7, 8].map(d => ({ d })), [9, 10, 11, 12, 13, 14, 15].map(d => ({ d })),
  [16, 17, 18, 19, 20, 21, 22].map(d => ({ d })), [23, 24, 25, 26, 27, 28, 29].map(d => ({ d })),
  [{ d: 30 }, { d: 1, muted: true }, { d: 2, muted: true }, { d: 3, muted: true }, { d: 4, muted: true }, { d: 5, muted: true }, { d: 6, muted: true }],
];

function StatusIcon({ status }: { status: Status }) {
  const icon: FeatherName = status === 'Taken' ? 'check' : status === 'Missed' ? 'x' : status === 'Skipped' ? 'minus' : 'plus';
  return <View className="h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: COLORS[status] }}><Feather name={icon} size={21} color="white" /></View>;
}
function FilterButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={onPress} className="min-h-[52px] flex-1 rounded-[17px] bg-white px-3 py-2 active:opacity-70"><Text className="text-[11px] leading-4 text-[#536073]">{label}</Text><View className="mt-0.5 flex-row items-center justify-between gap-1"><Text numberOfLines={1} className="min-w-0 flex-1 text-[13px] font-semibold text-[#071629]">{value}</Text><Feather name="chevron-down" size={17} color={NAVY} /></View></Pressable>;
}
function ActionButton({ label, icon, onPress }: { label: string; icon: FeatherName; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full border border-[#DCE0E5] bg-white active:opacity-70"><Feather name={icon} size={20} color={NAVY} /><Text className="text-[14px] font-medium text-[#071629]">{label}</Text></Pressable>;
}
function RecordRow({ record, onPress }: { record: RecordItem; onPress: () => void }) {
  const plan = record.medicine === 'Atorvastatin' ? '1:00 PM' : record.medicine === 'Metformin' ? '8:00 PM' : '8:00 AM';
  const summary = record.status === 'Extra / PRN' ? `Extra dose at ${record.time}` : `Planned ${plan}${record.status === 'Taken' ? ` • Taken ${record.time}` : ` • ${record.status}`}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${record.medicine}, ${record.status}, ${record.date}`} onPress={onPress} className="min-h-[60px] flex-row items-center gap-3 border-b border-[#E9EBED] px-3 py-2 last:border-b-0 active:opacity-70"><StatusIcon status={record.status} /><View className="min-w-0 flex-1"><Text numberOfLines={1} className="text-[14px] font-semibold leading-[18px] text-[#071629]">{record.medicine}</Text><Text numberOfLines={2} className="text-[11px] leading-[16px] text-[#536073]">{summary}</Text>{record.note && <View className="mt-1 self-start rounded-full bg-[#F1EEEA] px-2 py-0.5"><Text className="text-[10px] text-[#536073]">{record.note}</Text></View>}</View><View className="max-w-[105px] shrink items-end"><Text numberOfLines={1} className="text-[10px] text-[#536073]">{record.date}</Text><Text className="mt-1 text-[11px] text-[#536073]">{record.detail}</Text></View><Feather name="chevron-right" size={19} color={NAVY} /></Pressable>;
}

export default function HistoryScreen() {
  const [profile, setProfile] = useState('Anatol Belik');
  const [range, setRange] = useState('This month');
  const [medicine, setMedicine] = useState('All');
  const [status, setStatus] = useState<'All' | Status>('All');
  const [records, setRecords] = useState(BASE_RECORDS);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [entryName, setEntryName] = useState('Lisinopril');
  const [entryStatus, setEntryStatus] = useState<Status>('Taken');
  const [message, setMessage] = useState('');
  const displayed = useMemo(() => records.filter(r => (medicine === 'All' || r.medicine === medicine) && (status === 'All' || r.status === status)), [medicine, records, status]);
  const title = monthOffset === 0 ? 'September 2024' : monthOffset < 0 ? 'August 2024' : 'October 2024';
  const close = () => setSheet(null);
  function addEntry() {
    if (!entryName.trim()) return;
    setRecords(items => [{ id: `demo-${Date.now()}`, medicine: entryName.trim(), detail: '1 tablet', date: 'Wed, 25 Sep 2024', status: entryStatus, time: entryStatus === 'Taken' || entryStatus === 'Extra / PRN' ? '9:15 AM' : undefined }, ...items]);
    setMedicine('All'); setStatus('All'); setMessage('Demo dose entry added.'); close();
  }
  return <SafeAreaView className="flex-1 bg-[#FBF8F3]" edges={['top']}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
    <View className="flex-row items-center gap-3"><Pressable accessibilityRole="button" accessibilityLabel={`Select profile, ${profile}`} onPress={() => setSheet('profile')} className="min-h-11 flex-1 flex-row items-center gap-3"><View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#00B7BD]"><Text className="text-[16px] font-medium text-white">{profile.split(' ').map(s => s[0]).join('')}</Text></View><Text numberOfLines={1} className="text-[16px] font-semibold text-[#071629]">{profile}</Text><Feather name="chevron-down" size={18} color={NAVY} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Family profiles" onPress={() => setSheet('profile')} className="h-11 w-11 items-center justify-center rounded-full bg-white"><Feather name="users" size={21} color={NAVY} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => setMessage('No new notifications in this demo.')} className="h-11 w-11 items-center justify-center rounded-full bg-white"><Feather name="bell" size={21} color={NAVY} /></Pressable></View>
    <Text accessibilityRole="header" className="mb-2 text-[30px] font-bold leading-9 tracking-[-0.8px] text-[#071629]">History</Text>
    <View className="rounded-[24px] bg-white px-3 pb-3 pt-2.5"><View className="flex-row items-center justify-between"><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonthOffset(-1)} className="h-9 w-9 items-center justify-center"><Feather name="chevron-left" size={23} color={NAVY} /></Pressable><Text className="text-[15px] font-semibold text-[#071629]">{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonthOffset(1)} className="h-9 w-9 items-center justify-center"><Feather name="chevron-right" size={23} color={NAVY} /></Pressable></View>
      <View className="flex-row">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <Text key={day} className="flex-1 text-center text-[11px] leading-6 text-[#536073]">{day}</Text>)}</View>
      {WEEKS.map((week, wi) => <View key={wi} className="flex-row">{week.map((cell, di) => { const selected = monthOffset === 0 && cell.d === 25 && !cell.muted; const mark = monthOffset === 0 && !cell.muted ? MARKS[cell.d] : undefined; return <Pressable key={`${wi}-${di}`} accessibilityRole="button" accessibilityLabel={`${cell.d} ${title}${mark ? `, ${mark}` : ''}`} onPress={() => setMessage(`${cell.d} ${title}${mark ? ` · ${mark}` : ' · No dose records'}`)} className="h-[30px] flex-1 items-center justify-center"><View className={`h-[28px] w-[28px] items-center justify-center rounded-full ${selected ? 'bg-[#071629]' : ''}`}><Text className={`text-[12px] ${selected ? 'font-semibold text-white' : cell.muted ? 'text-[#748094]' : 'text-[#071629]'}`}>{cell.d}</Text>{mark && <View className="absolute bottom-[1px] h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS[mark] }} />}</View></Pressable>; })}</View>)}
      <View className="mt-1 flex-row flex-wrap items-center justify-between gap-y-2">{(Object.keys(COLORS) as Status[]).map(item => <View key={item} className="flex-row items-center gap-1.5"><View className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[item] }} /><Text className="text-[11px] text-[#536073]">{item}</Text></View>)}</View></View>
    <View className="mt-2.5 flex-row gap-2"><FilterButton label="Date range" value={range} onPress={() => setSheet('range')} /><FilterButton label="Medicine" value={medicine} onPress={() => setSheet('medicine')} /><FilterButton label="Status" value={status} onPress={() => setSheet('status')} /></View>
    <View className="mt-2 flex-row gap-2"><ActionButton label="Export CSV" icon="upload" onPress={() => setMessage(`CSV prepared for ${displayed.length} visible records.`)} /><ActionButton label="Add Entry" icon="plus" onPress={() => setSheet('add')} /></View>
    {!!message && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setMessage('')} className="mt-2 rounded-xl bg-[#E8F2FF] px-3 py-2"><Text accessibilityLiveRegion="polite" className="text-[11px] text-[#1F5E96]">{message}</Text></Pressable>}
    <Text accessibilityRole="header" className="mb-1 mt-2.5 text-[18px] font-semibold tracking-[-0.4px] text-[#071629]">Records</Text><View className="overflow-hidden rounded-[22px] bg-white">{displayed.map(record => <RecordRow key={record.id} record={record} onPress={() => setSheet(record)} />)}{!displayed.length && <View className="items-center px-5 py-8"><Feather name="inbox" size={27} color="#8390A0" /><Text className="mt-2 text-sm text-[#536073]">No matching dose records.</Text></View>}</View>
  </ScrollView>
  <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={close}><View className="flex-1 justify-end bg-black/30"><SafeAreaView edges={['bottom']} className="max-h-[82%] w-full max-w-[440px] self-center rounded-t-[28px] bg-[#FBF8F3]"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
    <View className="mb-4 flex-row items-center justify-between"><Text className="flex-1 text-[22px] font-semibold text-[#071629]">{sheet === 'profile' ? 'Choose profile' : sheet === 'range' ? 'Date range' : sheet === 'medicine' ? 'Medicine' : sheet === 'status' ? 'Status' : sheet === 'add' ? 'Add Entry' : typeof sheet === 'object' && sheet ? sheet.medicine : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} className="h-11 w-11 items-center justify-center rounded-full bg-white"><Feather name="x" size={22} color={NAVY} /></Pressable></View>
    {sheet === 'profile' && ['Anatol Belik', 'Maya', 'Dad'].map(item => <Pressable key={item} accessibilityRole="button" onPress={() => { setProfile(item); close(); }} className="mb-2 flex-row items-center justify-between rounded-2xl bg-white p-4"><Text className="text-base text-[#071629]">{item}</Text>{profile === item && <Feather name="check" size={20} color="#2FC17D" />}</Pressable>)}
    {sheet === 'range' && ['This month', 'Last 30 days', 'Last 90 days'].map(item => <Pressable key={item} accessibilityRole="button" onPress={() => { setRange(item); close(); }} className="mb-2 rounded-2xl bg-white p-4"><Text className="text-base text-[#071629]">{item}</Text></Pressable>)}
    {sheet === 'medicine' && ['All', 'Lisinopril', 'Atorvastatin', 'Vitamin D3', 'Metformin'].map(item => <Pressable key={item} accessibilityRole="button" onPress={() => { setMedicine(item); close(); }} className="mb-2 rounded-2xl bg-white p-4"><Text className="text-base text-[#071629]">{item}</Text></Pressable>)}
    {sheet === 'status' && (['All', ...Object.keys(COLORS)] as ('All' | Status)[]).map(item => <Pressable key={item} accessibilityRole="button" onPress={() => { setStatus(item); close(); }} className="mb-2 rounded-2xl bg-white p-4"><Text className="text-base text-[#071629]">{item}</Text></Pressable>)}
    {sheet === 'add' && <><TextInput accessibilityLabel="Medicine name" value={entryName} onChangeText={setEntryName} className="mb-3 rounded-2xl bg-white p-4 text-base text-[#071629]" /><Text className="mb-2 text-sm text-[#536073]">Dose status</Text><View className="mb-4 flex-row flex-wrap gap-2">{(Object.keys(COLORS) as Status[]).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: entryStatus === item }} onPress={() => setEntryStatus(item)} className={`rounded-full px-3 py-2 ${entryStatus === item ? 'bg-[#071629]' : 'bg-white'}`}><Text className={entryStatus === item ? 'text-white' : 'text-[#071629]'}>{item}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={addEntry} className="items-center rounded-full bg-[#071629] p-4"><Text className="text-base font-medium text-white">Save entry</Text></Pressable></>}
    {typeof sheet === 'object' && sheet && <View className="gap-3 rounded-[22px] bg-white p-5"><StatusIcon status={sheet.status} /><Text className="text-lg font-semibold text-[#071629]">{sheet.medicine}</Text><Text className="text-base text-[#536073]">{sheet.date}</Text><Text className="text-base" style={{ color: COLORS[sheet.status] }}>{sheet.status}{sheet.time ? ` · ${sheet.time}` : ''}</Text><Text className="text-base text-[#536073]">{sheet.detail}</Text>{sheet.note && <Text className="text-base text-[#536073]">Note: {sheet.note}</Text>}</View>}
  </ScrollView></SafeAreaView></View></Modal></SafeAreaView>;
}
