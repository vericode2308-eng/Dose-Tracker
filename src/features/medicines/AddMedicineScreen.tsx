import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMedicines } from './context';

const NAVY = '#102238';
const TEAL = '#079D9D';
const STEPS = ['Details', 'Schedule', 'Stock', 'Review'];
const FORMS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Inhaler', 'Other'] as const;
const FORM_ICONS: ComponentProps<typeof MaterialCommunityIcons>['name'][] = ['pill', 'pill', 'water-outline', 'needle', 'medical-bag', 'dots-horizontal'];
const FREQUENCIES = [
  ['Every day', 'Same time(s) every day', 'calendar-check'],
  ['Selected weekdays', 'Choose specific days', 'calendar-week'],
  ['Every N days', 'Every few days', 'calendar-range'],
  ['Every N hours', 'Regular intervals (e.g. every 8 hours)', 'clock-outline'],
  ['As needed', 'Take only when required', 'pill'],
] as const;
const COLORS = [{ name: 'Teal', value: '#079D9D' }, { name: 'Blue', value: '#3297FF' }, { name: 'Orange', value: '#FFA72E' }, { name: 'Purple', value: '#8845FA' }];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'number-pad' | 'decimal-pad'; multiline?: boolean }) {
  return <View className="mb-3 rounded-[20px] border border-[#E8EAF0] bg-white px-4 py-3">
    <Text className="mb-1 text-[14px] text-[#34445B]">{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8793A2" keyboardType={keyboardType} multiline={multiline} className="min-h-8 text-[17px] font-medium text-[#102238]" />
  </View>;
}

function SelectRow({ label, value, choices, onSelect }: { label: string; value: string; choices: readonly string[]; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <View className="mb-3 rounded-[20px] border border-[#E8EAF0] bg-white px-4 py-3">
    <Text className="mb-1 text-[14px] text-[#34445B]">{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={() => setOpen(!open)} className="min-h-9 flex-row items-center justify-between"><Text className="text-[17px] font-medium text-[#102238]">{value}</Text><Feather name={open ? 'chevron-up' : 'chevron-down'} size={20} color={NAVY} /></Pressable>
    {open && choices.map(choice => <Pressable key={choice} accessibilityRole="button" onPress={() => { onSelect(choice); setOpen(false); }} className="min-h-11 flex-row items-center justify-between border-t border-[#EDF0F4] py-2"><Text className="text-[15px] text-[#102238]">{choice}</Text>{choice === value && <Feather name="check" size={18} color={TEAL} />}</Pressable>)}
  </View>;
}

function Info({ children }: { children: React.ReactNode }) {
  return <View className="flex-row items-center gap-3 rounded-[15px] bg-[#EAF4FF] px-4 py-3"><View className="h-7 w-7 items-center justify-center rounded-full bg-[#1877ED]"><Text className="font-bold text-white">i</Text></View><Text className="flex-1 text-[14px] leading-5 text-[#1262BC]">{children}</Text></View>;
}

function ReviewRow({ icon, label, value, sub }: { icon: ComponentProps<typeof Feather>['name']; label: string; value: string; sub?: string }) {
  return <View className="flex-row items-start gap-3 border-t border-[#E9EDF2] py-3"><Feather name={icon} size={19} color={NAVY} /><Text className="w-[32%] text-[14px] text-[#53647A]">{label}</Text><View className="min-w-0 flex-1"><Text className="text-[14px] font-medium text-[#102238]">{value}</Text>{sub && <Text className="mt-1 text-[13px] text-[#53647A]">{sub}</Text>}</View></View>;
}

export default function AddMedicineScreen() {
  const { medicines, setMedicines } = useMedicines();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [strengthUnit, setStrengthUnit] = useState('mg');
  const [form, setForm] = useState<string>('Capsule');
  const [doseUnit, setDoseUnit] = useState('Capsule');
  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [frequency, setFrequency] = useState<string>('Every day');
  const [interval, setInterval] = useState('8');
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(today());
  const [startTime, setStartTime] = useState('9:00 AM');
  const [amount, setAmount] = useState('1');
  const [durationType, setDurationType] = useState('Ongoing');
  const [duration, setDuration] = useState('7');
  const [endDate, setEndDate] = useState('');
  const [trackStock, setTrackStock] = useState(true);
  const [stock, setStock] = useState('');
  const [threshold, setThreshold] = useState('');
  const [error, setError] = useState('');
  const unit = doseUnit.toLowerCase();
  const plural = `${unit}${unit.endsWith('s') ? '' : 's'}`;
  const schedule = frequency === 'Every N hours' ? `Every ${interval} hours` : frequency === 'Every N days' ? `Every ${interval} days` : frequency === 'Selected weekdays' ? weekdays.join(', ') : frequency;
  const durationLabel = durationType === 'For a number of days' ? `For ${duration} days` : durationType === 'End date' ? `Until ${endDate}` : 'Ongoing';
  function next() {
    if (step === 0 && (!name.trim() || !strength.trim() || !Number.isFinite(Number(strength)) || Number(strength) <= 0)) { setError('Enter a medicine name and a valid strength.'); return; }
    if (step === 0 && medicines.some(m => m.name.toLowerCase() === name.trim().toLowerCase())) { setError('This medicine is already in your list.'); return; }
    if (step === 1 && ((frequency === 'Selected weekdays' && !weekdays.length) || ((frequency === 'Every N days' || frequency === 'Every N hours') && (!Number.isSafeInteger(Number(interval)) || Number(interval) < 1)) || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || (durationType === 'For a number of days' && (!Number.isSafeInteger(Number(duration)) || Number(duration) < 1)) || (durationType === 'End date' && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{1,2}:\d{2} (AM|PM)$/.test(startTime))) { setError('Check the schedule, date, time, and dose amount.'); return; }
    if (step === 2 && trackStock && (!Number.isSafeInteger(Number(stock)) || Number(stock) < 0 || !Number.isSafeInteger(Number(threshold)) || Number(threshold) < 0)) { setError('Enter valid whole numbers for stock and the warning level.'); return; }
    setError(''); setStep(value => Math.min(value + 1, 3));
  }
  function save() {
    setMedicines(items => [...items, { id: `medicine-${Date.now()}`, name: name.trim(), dosage: `${strength.trim()} ${strengthUnit} ${unit}`, strength: `${strength.trim()} ${strengthUnit}`, form, doseAmount: `${amount} ${Number(amount) === 1 ? unit : plural}`, schedule, startDate, duration: durationLabel, time: frequency === 'As needed' ? undefined : startTime, next: frequency === 'As needed' ? undefined : 'Today', purpose: purpose.trim() || undefined, instructions: instructions.trim() || undefined, notes: notes.trim() || undefined, stock: trackStock ? Number(stock) : undefined, stockThreshold: trackStock ? Number(threshold) : undefined, color: color.value, status: 'Active' }]);
    router.dismissTo('/medicines');
  }
  const back = () => step ? (setError(''), setStep(step - 1)) : router.back();
  return <SafeAreaView className="flex-1 bg-[#FBF8F3]" edges={['top', 'bottom']}>
    <View className="flex-row items-center justify-between px-4 pt-1"><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} className="h-11 w-11 items-center justify-center"><Feather name="arrow-left" size={25} color={NAVY} /></Pressable><Text className="text-[20px] font-semibold text-[#102238]">Add Medicine</Text><Pressable accessibilityRole="button" accessibilityLabel="Close add medicine" onPress={() => router.back()} className="h-11 w-11 items-center justify-center"><Feather name="x" size={25} color={NAVY} /></Pressable></View>
    <View className="flex-row px-5 pb-4 pt-3">{STEPS.map((label, index) => <View key={label} className="flex-1 items-center"><View className="absolute left-[-50%] right-[50%] top-[16px] h-[1px] bg-[#CDD5DF]" style={index === 0 ? { display: 'none' } : index <= step ? { backgroundColor: TEAL } : undefined} /><View className={`h-8 w-8 items-center justify-center rounded-full ${index <= step ? 'bg-[#079D9D]' : 'bg-[#EBEFF4]'}`}>{index < step ? <Feather name="check" size={19} color="white" /> : <Text className={`text-[16px] font-semibold ${index === step ? 'text-white' : 'text-[#34445B]'}`}>{index + 1}</Text>}</View><Text className={`mt-1 text-[12px] ${index === step ? 'font-semibold text-[#102238]' : 'text-[#53647A]'}`}>{label}</Text></View>)}</View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1"><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
      <Text accessibilityRole="header" className="mt-2 text-[27px] font-bold tracking-[-0.6px] text-[#102238]">{['Medicine details', 'Set a schedule', 'Set stock (optional)', 'Review and save'][step]}</Text><Text className="mb-5 mt-1 text-[15px] text-[#53647A]">{['Tell us about your medicine.', 'When and how often do you take this medicine?', 'Track how much you have at home.', 'Check your details before adding this medicine.'][step]}</Text>
      {step === 0 && <><Field label="Medicine name" value={name} onChangeText={setName} placeholder="e.g. Amoxicillin" /><View className="flex-row gap-2"><View className="flex-1"><Field label="Strength" value={strength} onChangeText={setStrength} placeholder="e.g. 250" keyboardType="decimal-pad" /></View><View className="w-28"><SelectRow label="Unit" value={strengthUnit} choices={['mg', 'mcg', 'g', 'mL', 'IU']} onSelect={setStrengthUnit} /></View></View><View className="mb-3 rounded-[20px] border border-[#E8EAF0] bg-white p-3"><Text className="mb-2 text-[14px] text-[#34445B]">Form</Text><View className="flex-row flex-wrap justify-between gap-y-2">{FORMS.map((choice, index) => <Pressable key={choice} accessibilityRole="button" accessibilityState={{ selected: form === choice }} onPress={() => { setForm(choice); setDoseUnit(choice); }} className={`min-h-[76px] w-[32%] items-center justify-center rounded-[16px] border ${form === choice ? 'border-[#079D9D] bg-[#EFFFFF]' : 'border-[#DDE4EC] bg-white'}`}><MaterialCommunityIcons name={FORM_ICONS[index]} size={25} color={form === choice ? TEAL : NAVY} /><Text className={`mt-1 text-[13px] ${form === choice ? 'font-semibold' : ''} text-[#102238]`}>{choice}</Text></Pressable>)}</View></View><SelectRow label="Dose unit" value={doseUnit} choices={FORMS} onSelect={setDoseUnit} /><Field label="Purpose (optional)" value={purpose} onChangeText={setPurpose} placeholder="What is it for?" /><Field label="Instructions (optional)" value={instructions} onChangeText={setInstructions} placeholder="e.g. Take after food" /><SelectRow label="Color & icon" value={color.name} choices={COLORS.map(item => item.name)} onSelect={value => setColor(COLORS.find(item => item.name === value)!)} /><Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything else to remember" multiline /></>}
      {step === 1 && <><View className="mb-3 rounded-[22px] border border-[#E8EAF0] bg-white px-4 py-1">{FREQUENCIES.map(([label, detail, icon], index) => <Pressable key={label} accessibilityRole="radio" accessibilityState={{ selected: frequency === label }} onPress={() => setFrequency(label)} className={`min-h-[63px] flex-row items-center gap-3 ${index ? 'border-t border-[#E9EDF2]' : ''}`}><View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${frequency === label ? 'border-[#079D9D] bg-[#079D9D]' : 'border-[#8492A3]'}`}>{frequency === label && <View className="h-2 w-2 rounded-full bg-white" />}</View><MaterialCommunityIcons name={icon} size={23} color={NAVY} /><View className="flex-1"><Text className="text-[15px] font-semibold text-[#102238]">{label}</Text><Text className="text-[12px] text-[#53647A]">{detail}</Text></View></Pressable>)}</View>{frequency === 'Selected weekdays' && <View className="mb-3 flex-row justify-between">{WEEKDAYS.map(day => <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: weekdays.includes(day) }} onPress={() => setWeekdays(days => days.includes(day) ? days.filter(item => item !== day) : [...days, day])} className={`h-10 w-10 items-center justify-center rounded-full ${weekdays.includes(day) ? 'bg-[#079D9D]' : 'bg-white'}`}><Text className={weekdays.includes(day) ? 'text-white' : 'text-[#102238]'}>{day[0]}</Text></Pressable>)}</View>}{(frequency === 'Every N days' || frequency === 'Every N hours') && <Field label={`Repeat every (${frequency.endsWith('hours') ? 'hours' : 'days'})`} value={interval} onChangeText={setInterval} keyboardType="number-pad" />}{frequency !== 'As needed' && <View className="mb-3 rounded-[22px] border border-[#E8EAF0] bg-white p-4"><Text className="mb-2 text-[14px] text-[#53647A]">Starting from</Text><Field label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" /><Field label="Time (e.g. 9:00 AM)" value={startTime} onChangeText={setStartTime} placeholder="9:00 AM" />{frequency === 'Every N hours' && <Info>{`This will create doses every ${interval || '…'} hours.`}</Info>}<View className="mt-3"><Field label={`Each dose uses (${plural})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></View></View>}{frequency === 'As needed' && <Field label={`Each dose uses (${plural})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />}<View className="rounded-[22px] border border-[#E8EAF0] bg-white p-4"><Text className="mb-3 text-[16px] font-semibold text-[#102238]">Course duration</Text><View className="flex-row flex-wrap gap-2">{['Ongoing', 'End date', 'For a number of days'].map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ selected: durationType === choice }} onPress={() => setDurationType(choice)} className={`min-h-10 flex-row items-center gap-2 rounded-full px-3 ${durationType === choice ? 'bg-[#E4F6F5]' : 'bg-[#F5F7F9]'}`}><View className={`h-4 w-4 rounded-full border-2 ${durationType === choice ? 'border-[#079D9D] bg-[#079D9D]' : 'border-[#8390A0]'}`} /><Text className="text-[12px] text-[#102238]">{choice}</Text></Pressable>)}</View>{durationType === 'For a number of days' && <View className="mt-3"><Field label="Duration (days)" value={duration} onChangeText={setDuration} keyboardType="number-pad" /></View>}{durationType === 'End date' && <View className="mt-3"><Field label="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" /></View>}</View></>}
      {step === 2 && <View className="rounded-[24px] border border-[#E8EAF0] bg-white p-4"><View className="mb-4 flex-row items-center gap-3"><View className="flex-1"><Text className="text-[17px] font-semibold text-[#102238]">Track stock for this medicine</Text><Text className="mt-1 text-[13px] text-[#53647A]">Get low-stock alerts and never run out.</Text></View><Switch accessibilityLabel="Track stock" value={trackStock} onValueChange={setTrackStock} trackColor={{ true: TEAL }} /></View>{trackStock && <><Info>{`Stock uses the same unit as your dose amount (${plural}).`}</Info><View className="mt-5"><Field label={`Current quantity (${plural})`} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="e.g. 21" /><Field label={`Low-stock threshold (${plural})`} value={threshold} onChangeText={setThreshold} keyboardType="number-pad" placeholder="e.g. 6" /><Text className="text-[13px] leading-5 text-[#53647A]">We’ll warn you when your stock reaches this number or below.</Text></View></>}</View>}
      {step === 3 && <View className="rounded-[24px] border border-[#E8EAF0] bg-white p-4"><View className="mb-4 flex-row items-center gap-4"><View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: color.value }}><MaterialCommunityIcons name="pill" size={36} color="white" /></View><View className="min-w-0 flex-1"><Text className="text-[21px] font-semibold text-[#102238]">{name.trim()}</Text><Text className="text-[14px] text-[#53647A]">{strength} {strengthUnit} {unit}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Edit medicine details" onPress={() => setStep(0)} className="min-h-10 flex-row items-center gap-2 rounded-xl border border-[#DDE4EC] px-3"><Feather name="edit-2" size={16} color={NAVY} /><Text className="text-[#102238]">Edit</Text></Pressable></View><ReviewRow icon="user" label="Person" value="Anatol Belik" /><ReviewRow icon="circle" label="Form" value={form} /><ReviewRow icon="activity" label="Strength" value={`${strength} ${strengthUnit}`} /><ReviewRow icon="plus-circle" label="Dose amount" value={`${amount} ${Number(amount) === 1 ? unit : plural}`} /><ReviewRow icon="clock" label="Schedule" value={schedule} sub={frequency === 'As needed' ? undefined : `Starting ${startDate}, ${startTime}`} /><ReviewRow icon="calendar" label="Course duration" value={durationLabel} />{!!purpose.trim() && <ReviewRow icon="list" label="Purpose" value={purpose.trim()} />}{!!instructions.trim() && <ReviewRow icon="file-text" label="Instructions" value={instructions.trim()} />}<ReviewRow icon="archive" label="Stock tracking" value={trackStock ? 'On' : 'Off'} sub={trackStock ? `${stock} ${plural} available · warning at ${threshold}` : undefined} />{!!notes.trim() && <ReviewRow icon="file-text" label="Notes" value={notes.trim()} />}</View>}
      {!!error && <Text accessibilityRole="alert" className="mt-3 text-[14px] text-[#D90008]">{error}</Text>}
    </ScrollView><View className="flex-row gap-3 px-4 pb-2 pt-2">{step > 0 && <Pressable accessibilityRole="button" onPress={back} className="min-h-[52px] flex-1 items-center justify-center rounded-full border border-[#CCD5E0] bg-white"><Text className="text-[16px] font-semibold text-[#102238]">Back</Text></Pressable>}<Pressable accessibilityRole="button" onPress={step === 3 ? save : next} className="min-h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-[#102238]"><Text className="text-[16px] font-semibold text-white">{step === 3 ? 'Save Medicine' : 'Next'}</Text><Feather name={step === 3 ? 'check' : 'arrow-right'} size={20} color="white" /></Pressable></View></KeyboardAvoidingView>
  </SafeAreaView>;
}
