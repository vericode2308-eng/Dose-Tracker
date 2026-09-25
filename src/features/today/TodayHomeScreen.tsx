import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type Medicine = { name: string; detail: string; time: string; note?: string; state: 'due' | 'upcoming' | 'taken' | 'skipped' };
const initialMedicines: Medicine[] = [
  { name: 'Atorvastatin', detail: '20 mg tablet • 1 tablet', time: '1:00 PM', note: 'After meal', state: 'due' },
  { name: 'Metformin', detail: '500 mg tablet • 1 tablet', time: '8:00 PM', note: 'With dinner', state: 'upcoming' },
  { name: 'Lisinopril', detail: '10 mg tablet • 1 tablet', time: '8:05 AM', state: 'taken' },
  { name: 'Levothyroxine', detail: '50 mcg tablet • 1 tablet', time: '7:03 AM', state: 'taken' },
];
const navy = '#071629';
type IconName = React.ComponentProps<typeof Feather>['name'];

function Pill({ label, icon, dark, onPress }: { label: string; icon?: IconName; dark?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full px-2 active:opacity-70 ${dark ? 'bg-[#071629]' : 'bg-[#F1F1F1]'}`}>
    {icon && <Feather name={icon} size={20} color={dark ? 'white' : navy} />}<Text className={`text-[14px] font-medium ${dark ? 'text-white' : 'text-[#071629]'}`}>{label}</Text>
  </Pressable>;
}

function MedicineIcon({ due = false, small = false }: { due?: boolean; small?: boolean }) {
  return <View className={`items-center justify-center rounded-full ${small ? 'h-10 w-10 bg-[#DFEDFF]' : due ? 'h-[42px] w-[42px] bg-[#FFAC2D]' : 'h-[42px] w-[42px] bg-[#2499FF]'}`}><MaterialCommunityIcons name="pill" size={23} color={small ? '#078AFF' : 'white'} /></View>;
}

function ProgressRing({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 34;
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} accessibilityLabel="Daily doses taken" className="h-[78px] w-[78px] items-center justify-center">
    <Svg width={78} height={78} style={{ position: 'absolute' }}><Defs><LinearGradient id="progress" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#0A466F" /><Stop offset="1" stopColor="#32CEFF" /></LinearGradient></Defs><Circle cx={39} cy={39} r={34} fill="none" stroke="#E7E7E7" strokeWidth={6} /><Circle cx={39} cy={39} r={34} fill="none" stroke="url(#progress)" strokeWidth={6} strokeDasharray={`${circumference * percent / 100} ${circumference}`} transform="rotate(180 39 39)" /></Svg>
    <Text className="text-[17px] font-bold text-[#071629]">{percent}%</Text>
  </View>;
}

function SectionHeading({ title, count, urgent }: { title: string; count: number; urgent?: boolean }) {
  return <View className="mb-1.5 mt-3 flex-row items-center gap-2.5"><Text accessibilityRole="header" className="text-[17px] font-semibold tracking-[-0.4px] text-[#071629]">{title}</Text><View className={`min-w-[29px] items-center rounded-full px-2 py-0.5 ${urgent ? 'bg-[#FFD8D5]' : 'bg-[#E6E5E5]'}`}><Text className={`text-[16px] font-semibold ${urgent ? 'text-[#F20D16]' : 'text-[#071629]'}`}>{count}</Text></View></View>;
}

export default function TodayHomeScreen() {
  const [medicines, setMedicines] = useState(initialMedicines);
  const [sheet, setSheet] = useState<'medicines' | 'add' | 'needed' | 'profiles' | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const taken = medicines.filter(m => m.state === 'taken');
  const completed = medicines.filter(m => m.state === 'taken' || m.state === 'skipped');
  const due = medicines.filter(m => m.state === 'due');
  const upcoming = medicines.filter(m => m.state === 'upcoming');
  function act(medicine: Medicine, action: 'taken' | 'skipped' | 'snooze') {
    setMedicines(items => items.map(m => m.name === medicine.name ? { ...m, state: action === 'snooze' ? 'upcoming' : action, time: action === 'snooze' ? '1:15 PM' : '1:00 PM' } : m));
    setMessage(action === 'snooze' ? 'Dose snoozed until 1:15 PM' : `${medicine.name} ${action === 'taken' ? 'marked as taken' : 'skipped'}`);
  }
  function medicineCard(m: Medicine) {
    return <View key={m.name} className="mb-1 rounded-[20px] bg-white p-3">
      <View className="flex-row gap-3.5"><MedicineIcon due={m.state === 'due'} /><View className="flex-1"><View className="flex-row items-center justify-between gap-1"><Text className="flex-shrink text-[16px] font-semibold tracking-[-0.3px] text-[#071629]">{m.name}</Text>{m.note && <View className="rounded-full bg-[#F1EEEA] px-3 py-1"><Text className="text-[12px] text-[#071629]">{m.note}</Text></View>}</View><Text className="mt-0.5 text-[14px] text-[#536073]">{m.detail}</Text><View className="mt-1.5 flex-row items-center gap-2"><Feather name="clock" size={17} color={m.state === 'due' ? '#F10B13' : '#536073'} /><Text className={`text-[14px] font-medium ${m.state === 'due' ? 'text-[#F10B13]' : 'text-[#071629]'}`}>{m.time}{m.state === 'due' ? ' • Due now' : ''}</Text></View></View></View>
      {m.state === 'due' && <View className="mt-3 flex-row gap-2"><Pill label="Take" icon="check" dark onPress={() => act(m, 'taken')} /><Pill label="Skip" icon="x" onPress={() => act(m, 'skipped')} /><Pill label="Snooze" icon="clock" onPress={() => act(m, 'snooze')} /></View>}
    </View>;
  }
  return <SafeAreaView className="flex-1 bg-[#FBF8F3]" edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}>
      <View className="mb-2.5 flex-row items-center justify-between gap-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Switch profile, Anatol Belik" onPress={() => setSheet('profiles')} className="min-h-11 flex-1 flex-row items-center gap-1.5"><View className="h-[41px] w-[41px] shrink-0 items-center justify-center rounded-full bg-[#00B8C7]"><Text className="text-[15px] font-medium text-white">AB</Text></View><Text numberOfLines={1} className="flex-shrink text-[14px] font-semibold tracking-[-0.4px] text-[#071629]">Anatol Belik</Text><Feather name="chevron-down" size={14} color={navy} /></Pressable>
        <View className="flex-row gap-1">{([{ name: 'Maya', count: 1, color: '#FF262D', bg: '#FFDAD9' }, { name: 'Dad', count: 2, color: '#087CFB', bg: '#D6E8FF' }]).map(p => <Pressable key={p.name} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.count} overdue doses`} onPress={() => { setSheet('profiles'); setMessage(`${p.name} has ${p.count} overdue doses in this demo.`); }} className="min-h-11 flex-row items-center gap-1 rounded-full bg-[#F5F2EE] px-1.5"><View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: p.bg }}><Feather name="user" size={19} color={p.color} /></View><View><Text className="text-[12px] font-medium text-[#071629]">{p.name}</Text><Text className="text-[10px] text-[#E40009]">{p.count} overdue</Text></View></Pressable>)}</View>
      </View>
      <Text accessibilityRole="header" className="text-[28px] font-bold leading-[35px] tracking-[-0.8px] text-[#071629]">Today’s Schedule</Text>
      <Text className="mb-2.5 text-[16px] leading-6 text-[#536073]">Tue, 25 Sep 2024</Text>
      <View className="min-h-[94px] flex-row items-center justify-between rounded-[28px] bg-white py-2.5 pl-[22px] pr-3.5"><View><Text className="mb-1 text-[15px] text-[#536073]">Daily Progress</Text><View className="flex-row items-baseline gap-2"><Text className="text-[27px] font-semibold text-[#071629]">{taken.length}<Text className="text-[#536073]"> / {medicines.length}</Text></Text><Text className="text-[15px] text-[#071629]">doses taken</Text></View></View><ProgressRing percent={Math.round(taken.length / medicines.length * 100)} /></View>
      <View className="my-3 flex-row gap-2"><Pressable accessibilityRole="button" onPress={() => router.push('/medicines')} className="min-h-11 flex-[1.18] flex-row items-center justify-center gap-2 rounded-full bg-[#071629] px-3 active:opacity-70"><Text className="text-[16px] font-medium text-white">View Medicines</Text><Feather name="arrow-right" size={21} color="white" /></Pressable><Pressable accessibilityRole="button" onPress={() => setSheet('add')} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-white px-2 active:opacity-70"><Feather name="plus" size={23} color={navy} /><Text className="text-[15px] font-medium text-[#071629]">Add Medicine</Text></Pressable></View>
      <Pressable accessibilityRole="button" onPress={() => setSheet('needed')} className="min-h-[60px] flex-row items-center gap-3.5 rounded-[20px] bg-white px-3 py-2"><MedicineIcon small /><View className="flex-1"><Text className="text-[16px] font-semibold text-[#071629]">As needed</Text><Text className="mt-0.5 text-[12px] text-[#536073]">Log a non-scheduled dose</Text></View><Feather name="chevron-right" size={22} color={navy} /></Pressable>
      <SectionHeading title="Due now" count={due.length} urgent />{due.length ? due.map(medicineCard) : <View className="rounded-[20px] bg-white p-4"><Text className="text-[14px] text-[#536073]">You’re all caught up.</Text></View>}
      <SectionHeading title="Upcoming" count={upcoming.length} />{upcoming.map(medicineCard)}
      <SectionHeading title="Completed" count={completed.length} /><View className="rounded-[20px] bg-white px-3">{completed.map((m, i) => <View key={m.name} className={`min-h-[49px] flex-row items-center gap-3 py-2 ${i ? 'border-t border-[#E9EBED]' : ''}`}><View className={`h-7 w-7 items-center justify-center rounded-full ${m.state === 'taken' ? 'bg-[#0ABC76]' : 'bg-[#A1A8B0]'}`}><Feather name={m.state === 'taken' ? 'check' : 'x'} size={21} color="white" /></View><View className="flex-1"><Text className="text-[14px] font-semibold tracking-[-0.3px] text-[#071629]">{m.name}</Text><Text className="mt-0.5 text-[12px] text-[#536073]">{m.detail}</Text></View><Text className="text-[12px] text-[#00AE62]">{m.state === 'taken' ? 'Taken at' : 'Skipped at'} {m.time}</Text></View>)}</View>
      {!!message && <Pressable accessibilityRole="button" accessibilityLabel="Reset demo doses" onPress={() => { setMedicines(initialMedicines); setMessage(''); }} className="mt-3 rounded-2xl bg-[#E3F4ED] p-3"><Text accessibilityLiveRegion="polite" className="text-sm text-[#176A4C]">{message} · Reset demo</Text></Pressable>}
    </ScrollView>
    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}><View className="flex-1 justify-end bg-black/30"><View className="w-full max-w-[440px] self-center rounded-t-[28px] bg-[#FBF8F3] px-6 pb-10 pt-5"><View className="mb-5 flex-row items-center justify-between"><Text className="text-2xl font-semibold text-[#071629]">{sheet === 'medicines' ? 'Your medicines' : sheet === 'add' ? 'Add Medicine' : sheet === 'profiles' ? 'Family profiles' : 'As needed'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSheet(null)} className="h-11 w-11 items-center justify-center rounded-full bg-white"><Feather name="x" size={22} color={navy} /></Pressable></View>
      {sheet === 'medicines' && medicines.map(m => <View key={m.name} className="mb-3 rounded-2xl bg-white p-4"><Text className="text-base font-semibold text-[#071629]">{m.name}</Text><Text className="mt-1 text-sm text-[#536073]">{m.detail}</Text></View>)}
      {sheet === 'profiles' && <><Text className="mb-4 text-base text-[#536073]">Anatol Belik’s schedule is shown. Family profiles are sample data.</Text>{['Anatol Belik · You', 'Maya · 1 overdue', 'Dad · 2 overdue'].map(p => <Text key={p} className="mb-3 rounded-2xl bg-white p-4 text-base text-[#071629]">{p}</Text>)}</>}
      {(sheet === 'add' || sheet === 'needed') && <><Text className="mb-3 text-sm text-[#536073]">{sheet === 'add' ? 'Add a sample medicine to your upcoming list.' : 'Record a sample non-scheduled dose.'}</Text><TextInput accessibilityLabel="Medicine name" placeholder="Medicine name" value={name} onChangeText={setName} className="mb-4 rounded-2xl bg-white p-4 text-base text-[#071629]" /><View className="h-12"><Pill label={sheet === 'add' ? 'Add to schedule' : 'Log dose'} icon="plus" dark onPress={() => { if (!name.trim()) return; if (medicines.some(m => m.name.toLowerCase() === name.trim().toLowerCase())) { setMessage('That medicine is already in your demo schedule.'); setSheet(null); return; } setMedicines(items => [...items, { name: name.trim(), detail: '1 tablet', time: sheet === 'add' ? '9:00 PM' : '1:00 PM', state: sheet === 'add' ? 'upcoming' : 'taken' }]); setName(''); setSheet(null); }} /></View></>}
    </View></View></Modal>
  </SafeAreaView>;
}
