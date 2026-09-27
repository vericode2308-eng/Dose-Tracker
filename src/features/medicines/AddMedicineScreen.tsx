import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfiles } from '@/features/profiles/context';
import { useMedicines } from './context';
import { addMedicine, fetchMedicineDetails, type RecurringPattern } from '@/database';
import { parseReminderTime, scheduleMedicineReminders } from '@/notificationManager';
import { MedicineDetailsForm } from './MedicineDetailsForm';
import { DatePickerField, TimePickerField } from '@/features/ui/DateTimePickers';
import { hapticSelection, hapticSuccess } from '@/features/ui/haptics';
import { useTheme } from '@/features/theme/ThemeContext';

const NAVY = '#102238';
const TEAL = '#079D9D';
const STEPS = ['Details', 'Schedule', 'Stock', 'Review'];
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
const isPositiveNumber = (value: string) => /^\d+(?:\.\d+)?$/.test(value.trim()) && Number(value) > 0;
const isWholeNumber = (value: string) => /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value));
function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'number-pad' | 'decimal-pad'; multiline?: boolean }) {
  const { colors } = useTheme();
  return <View className="mb-3 rounded-[20px] border px-4 py-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
    <Text className="mb-1 text-[14px]" style={{ color: colors.secondary }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondary} keyboardType={keyboardType} multiline={multiline} className="min-h-8 text-[17px] font-medium" style={{ color: colors.ink }} />
  </View>;
}

function Info({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  return <View className="flex-row items-center gap-3 rounded-[15px] px-4 py-3" style={{ backgroundColor: isDark ? colors.pill : '#EAF4FF' }}><View className="h-7 w-7 items-center justify-center rounded-full bg-[#1877ED]"><Text className="font-bold text-white">i</Text></View><Text className="flex-1 text-[14px] leading-5" style={{ color: isDark ? colors.ink : '#1262BC' }}>{children}</Text></View>;
}

function ReviewRow({ icon, label, value, sub }: { icon: ComponentProps<typeof Feather>['name']; label: string; value: string; sub?: string }) {
  const { colors } = useTheme();
  return <View className="flex-row items-start gap-3 border-t py-3" style={{ borderColor: colors.border }}><Feather name={icon} size={19} color={colors.ink} /><Text className="w-[32%] text-[14px]" style={{ color: colors.secondary }}>{label}</Text><View className="min-w-0 flex-1"><Text className="text-[14px] font-medium" style={{ color: colors.ink }}>{value}</Text>{sub && <Text className="mt-1 text-[13px]" style={{ color: colors.secondary }}>{sub}</Text>}</View></View>;
}

export default function AddMedicineScreen() {
  const { colors, isDark } = useTheme();
  const { medicines } = useMedicines();
  const { currentProfile: selectedProfile } = useProfiles();
  const [currentProfile] = useState(selectedProfile);
  const saving = useRef(false);
  const [savingNow, setSavingNow] = useState(false);
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
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [amount, setAmount] = useState('1');
  const [durationType, setDurationType] = useState('Ongoing');
  const [duration, setDuration] = useState('7');
  const [endDate, setEndDate] = useState('');
  const [trackStock, setTrackStock] = useState(false);
  const [stock, setStock] = useState('');
  const [threshold, setThreshold] = useState('');
  const [error, setError] = useState('');
  const unit = doseUnit.toLowerCase();
  const plural = `${unit}${unit.endsWith('s') ? '' : 's'}`;
  const schedule = frequency === 'Every N hours' ? `Every ${interval} hours` : frequency === 'Every N days' ? `Every ${interval} days` : frequency === 'Selected weekdays' ? weekdays.join(', ') : frequency;
  const reminderSupported = (frequency === 'Every day' || frequency === 'Selected weekdays') && durationType === 'Ongoing' && startDate <= today();
  const wantsReminder = reminderEnabled && reminderSupported;
  const durationLabel = durationType === 'For a number of days' ? `For ${duration} days` : durationType === 'End date' ? `Until ${endDate}` : 'Ongoing';
  function next() {
    if (step === 0 && (!name.trim() || !isPositiveNumber(strength))) { setError('Enter a medicine name and a valid strength.'); return; }
    if (step === 0 && medicines.some(m => m.name.toLowerCase() === name.trim().toLowerCase())) { setError('This medicine is already in your list.'); return; }
    if (step === 1 && frequency === 'Selected weekdays' && !weekdays.length) { setError('Select at least one weekday.'); return; }
    if (step === 1 && (frequency === 'Every N days' || frequency === 'Every N hours') && (!isWholeNumber(interval) || Number(interval) < 1)) { setError('Enter a valid repeat interval.'); return; }
    if (step === 1 && !isPositiveNumber(amount)) { setError('Enter a valid dose amount.'); return; }
    if (step === 1 && (!parseDate(startDate) || (frequency !== 'As needed' && !/^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/.test(startTime)))) { setError('Enter a valid start date and time.'); return; }
    if (step === 1 && durationType === 'For a number of days' && (!isWholeNumber(duration) || Number(duration) < 1)) { setError('Enter a valid course duration.'); return; }
    if (step === 1 && durationType === 'End date' && (!parseDate(endDate) || endDate < startDate)) { setError('Choose an end date on or after the start date.'); return; }
    if (step === 2 && trackStock && (!isWholeNumber(stock) || !isWholeNumber(threshold))) { setError('Enter valid whole numbers for stock and the warning level.'); return; }
    void hapticSelection();
    setError(''); setStep(value => Math.min(value + 1, 3));
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    setSavingNow(true);
    setError('');
    let savedId: string | null = null;
    try {
      const kind: RecurringPattern['kind'] = frequency === 'Every day' ? 'daily' : frequency === 'Selected weekdays' ? 'weekdays' : frequency === 'Every N days' ? 'day_interval' : frequency === 'Every N hours' ? 'hour_interval' : 'prn';
      let courseEnd: string | undefined;
      if (durationType === 'End date') courseEnd = endDate;
      if (durationType === 'For a number of days') {
        const last = parseDate(startDate)!;
        last.setDate(last.getDate() + Number(duration) - 1);
        courseEnd = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
      }
      const result = await addMedicine({
        profileId: currentProfile?.id,
        medicine: { name, dosageForm: form, strength: `${strength.trim()} ${strengthUnit}`, doseUnit,
          purpose, instructions, notes, color: color.value,
          stockRemaining: trackStock ? stock : null, lowStockThreshold: trackStock ? threshold : null },
        schedule: { pattern: { kind, startDate, endDate: courseEnd,
          ...(kind === 'weekdays' ? { weekdays: weekdays.map(day => WEEKDAYS.indexOf(day)) } : {}),
          ...(kind === 'day_interval' || kind === 'hour_interval' ? { interval: Number(interval) } : {}) },
          timeLocalMinute: kind === 'prn' ? null : parseReminderTime(startTime), doseAmount: amount, reminderEnabled: wantsReminder },
      });
      savedId = result.medicineId;
      void hapticSuccess();
      const stored = await fetchMedicineDetails(result.medicineId);
      if (!stored) throw new Error('Saved medicine could not be reopened.');
      const reminders = await scheduleMedicineReminders(stored);
      if (wantsReminder && (reminders.issues.length || !reminders.allowed || (Platform.OS === 'android' && reminders.exact !== true))) {
        Alert.alert('Medicine saved — check reminders', reminders.issues.join('\n') || reminders.message, [
          { text: 'Reminder settings', onPress: () => router.replace('/settings') },
          { text: 'Done', onPress: () => router.dismissTo('/medicines') },
        ]);
        if (Platform.OS === 'web') router.dismissTo('/medicines');
      } else router.dismissTo('/medicines');
    } catch {
      if (savedId) {
        if (wantsReminder) {
          Alert.alert('Medicine saved', 'Reminder setup failed. Open Settings to retry scheduling.');
          router.replace('/settings');
        } else router.dismissTo('/medicines');
      } else setError('The medicine could not be saved. Check the values and try again.');
    } finally { saving.current = false; setSavingNow(false); }
  }
  const close = useCallback(() => {
    if (saving.current) return;
    if (router.canGoBack()) router.back();
    else router.replace('/medicines');
  }, []);
  const hasUnsavedChanges = !!(name.trim() || strength.trim() || purpose.trim() || instructions.trim() || notes.trim()
    || strengthUnit !== 'mg' || form !== 'Capsule' || doseUnit !== 'Capsule' || color !== COLORS[0]
    || frequency !== 'Every day' || interval !== '8' || weekdays.length || startDate !== today()
    || startTime !== '9:00 AM' || reminderEnabled || amount !== '1' || durationType !== 'Ongoing' || duration !== '7'
    || endDate || trackStock || stock || threshold);
  const handleExit = useCallback(() => {
    if (saving.current) return;
    if (hasUnsavedChanges) {
      Alert.alert(
        'Discard medicine?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: close },
        ]
      );
    } else {
      close();
    }
  }, [close, hasUnsavedChanges]);
  const back = () => {
    if (saving.current) return;
    if (step > 0) {
      void hapticSelection();
      setError('');
      setStep(step - 1);
    } else {
      handleExit();
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (saving.current) return true;
      if (step > 0) {
        setError('');
        setStep(current => current - 1);
        return true;
      }
      if (hasUnsavedChanges) {
        handleExit();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [step, hasUnsavedChanges, handleExit]);

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
    <View className="flex-row items-center justify-between px-4 pt-1"><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} className="h-11 w-11 items-center justify-center"><Feather name="arrow-left" size={25} color={colors.ink} /></Pressable><Text className="text-[20px] font-semibold" style={{ color: colors.ink }}>Add Medicine</Text><Pressable accessibilityRole="button" accessibilityLabel="Close add medicine" onPress={handleExit} className="h-11 w-11 items-center justify-center"><Feather name="x" size={25} color={colors.ink} /></Pressable></View>
    <View className="flex-row px-5 pb-4 pt-3"><View pointerEvents="none" className="absolute left-[16%] right-[16%] top-[28px] h-[1px]" style={{ backgroundColor: colors.border }} />{STEPS.map((label, index) => <View key={label} className="flex-1 items-center"><View className="z-10 h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: index <= step ? colors.accent : colors.pill }}>{index < step ? <Feather name="check" size={19} color="white" /> : <Text className="text-[16px] font-semibold" style={{ color: index === step ? '#FFFFFF' : colors.secondary }}>{index + 1}</Text>}</View><Text className={`mt-1 text-[12px] ${index === step ? 'font-semibold' : ''}`} style={{ color: index === step ? colors.ink : colors.secondary }}>{label}</Text></View>)}</View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <Text accessibilityRole="header" className="mt-2 text-[27px] font-bold tracking-[-0.6px]" style={{ color: colors.ink }}>{['Medicine details', 'Set a schedule', 'Set stock (optional)', 'Review and save'][step]}</Text><Text className="mb-3 mt-1 text-[16px]" style={{ color: colors.secondary }}>{['Tell us about your medicine.', 'When and how often do you take this medicine?', 'Track how much you have at home.', 'Check your details before adding this medicine.'][step]}</Text>
        {step === 0 && <MedicineDetailsForm name={name} setName={setName} strength={strength} setStrength={setStrength} strengthUnit={strengthUnit} setStrengthUnit={setStrengthUnit} form={form} setForm={(value) => { setForm(value); setDoseUnit(value); }} doseUnit={doseUnit} setDoseUnit={setDoseUnit} purpose={purpose} setPurpose={setPurpose} instructions={instructions} setInstructions={setInstructions} notes={notes} setNotes={setNotes} color={color} setColor={setColor} />}
        {step === 1 && <><View className="mb-3 rounded-[22px] border px-4 py-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>{FREQUENCIES.map(([label, detail, icon], index) => <Pressable key={label} accessibilityRole="radio" accessibilityState={{ selected: frequency === label }} onPress={() => { setFrequency(label); setReminderEnabled(false); }} className={`min-h-[63px] flex-row items-center gap-3 ${index ? 'border-t border-[#E9EDF2]' : ''}`}><View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${frequency === label ? 'border-[#079D9D] bg-[#079D9D]' : 'border-[#8492A3]'}`}>{frequency === label && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.surface }} />}</View><MaterialCommunityIcons name={icon} size={23} color={colors.ink} /><View className="flex-1"><Text className="text-[15px] font-semibold " style={{ color: colors.ink }}>{label}</Text><Text className="text-[12px] " style={{ color: colors.secondary }}>{detail}</Text></View></Pressable>)}</View>{frequency === 'Selected weekdays' && <View className="mb-3 flex-row justify-between">{WEEKDAYS.map(day => <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: weekdays.includes(day) }} onPress={() => setWeekdays(days => days.includes(day) ? days.filter(item => item !== day) : [...days, day])} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: weekdays.includes(day) ? colors.accent : colors.surface }}><Text style={{ color: weekdays.includes(day) ? '#FFFFFF' : colors.ink }}>{day[0]}</Text></Pressable>)}</View>}{(frequency === 'Every N days' || frequency === 'Every N hours') && <Field label={`Repeat every (${frequency.endsWith('hours') ? 'hours' : 'days'})`} value={interval} onChangeText={setInterval} keyboardType="number-pad" />}{frequency !== 'As needed' && <View className="mb-3 rounded-[22px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Text className="mb-2 text-[14px] " style={{ color: colors.secondary }}>Starting from</Text><DatePickerField label="Start date" value={startDate} onChange={(value) => { setStartDate(value); setReminderEnabled(false); }} placeholder="YYYY-MM-DD" title="Schedule Start Date" /><TimePickerField label="Dose time" value={startTime} onChange={setStartTime} placeholder="9:00 AM" title="Select Dose Time" /><View className="mt-2 flex-row items-center gap-3 rounded-2xl border p-3" style={{ borderColor: colors.border }}><View className="flex-1"><Text className="text-[15px] font-semibold" style={{ color: colors.ink }}>Send dose reminders</Text><Text className="mt-1 text-[13px] leading-5" style={{ color: colors.secondary }}>{reminderSupported ? 'Optional. Your dose schedule is tracked even when this is off.' : 'Available for ongoing daily or weekday schedules starting today.'}</Text></View><Switch accessibilityLabel="Send dose reminders" value={wantsReminder} disabled={!reminderSupported} onValueChange={setReminderEnabled} trackColor={{ true: TEAL }} /></View><View className="mt-3"><Field label={`Each dose uses (${plural})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></View></View>}{frequency === 'As needed'  && <Field label={`Each dose uses (${plural})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />}<View className="rounded-[22px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Text className="mb-3 text-[16px] font-semibold " style={{ color: colors.ink }}>Course duration</Text><View className="flex-row flex-wrap gap-2">{['Ongoing', 'End date', 'For a number of days'].map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ selected: durationType === choice }} onPress={() => { setDurationType(choice); setReminderEnabled(false); }} className="min-h-10 flex-row items-center gap-2 rounded-full px-3" style={{ backgroundColor: durationType === choice ? (isDark ? colors.pill : '#E4F6F5') : colors.subtleBg }}><View className={`h-4 w-4 rounded-full border-2 ${durationType === choice ? 'border-[#079D9D] bg-[#079D9D]' : 'border-[#8390A0]'}`} /><Text className="text-[12px] " style={{ color: colors.ink }}>{choice}</Text></Pressable>)}</View>{durationType === 'For a number of days' && <View className="mt-3"><Field label="Duration (days)" value={duration} onChangeText={setDuration} keyboardType="number-pad" /></View>}{durationType === 'End date' && <View className="mt-3"><DatePickerField label="Course end date" value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" title="Course End Date" minDate={startDate} /></View>}</View></>}
        {step === 2 && <View className="rounded-[24px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><View className="mb-4 flex-row items-center gap-3"><View className="flex-1"><Text className="text-[17px] font-semibold " style={{ color: colors.ink }}>Track stock for this medicine</Text><Text className="mt-1 text-[13px] " style={{ color: colors.secondary }}>Get low-stock alerts and never run out.</Text></View><Switch accessibilityLabel="Track stock" value={trackStock} onValueChange={setTrackStock} trackColor={{ true: TEAL }} /></View>{trackStock && <><Info>{`Stock uses the same unit as your dose amount (${plural}).`}</Info><View className="mt-5"><Field label={`Current quantity (${plural})`} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="e.g. 21" /><Field label={`Low-stock threshold (${plural})`} value={threshold} onChangeText={setThreshold} keyboardType="number-pad" placeholder="e.g. 6" /><Text className="text-[13px] leading-5 " style={{ color: colors.secondary }}>We’ll warn you when your stock reaches this number or below.</Text></View></>}</View>}
        {step === 3 && <View className="rounded-[24px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><View className="mb-4 flex-row items-center gap-4"><View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: color.value }}><MaterialCommunityIcons name="pill" size={36} color="white" /></View><View className="min-w-0 flex-1"><Text className="text-[21px] font-semibold " style={{ color: colors.ink }}>{name.trim()}</Text><Text className="text-[14px] " style={{ color: colors.secondary }}>{strength} {strengthUnit} {unit}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Edit medicine details" onPress={() => setStep(0)} className="min-h-10 flex-row items-center gap-2 rounded-xl border px-3" style={{ borderColor: colors.border }}><Feather name="edit-2" size={16} color={colors.ink} /><Text style={{ color: colors.ink }}>Edit</Text></Pressable></View><ReviewRow icon="user" label="Person" value={currentProfile?.name || 'Me'} /><ReviewRow icon="circle" label="Form" value={form} /><ReviewRow icon="activity" label="Strength" value={`${strength} ${strengthUnit}`} /><ReviewRow icon="plus-circle" label="Dose amount" value={`${amount} ${Number(amount) === 1 ? unit : plural}`} /><ReviewRow icon="clock" label="Schedule" value={schedule} sub={frequency === 'As needed' ? undefined : `Starting ${startDate}, ${startTime}`} /><ReviewRow icon="calendar" label="Course duration" value={durationLabel} /><ReviewRow icon="bell" label="Reminders" value={wantsReminder ? "On" : "Off"} sub={wantsReminder ? "Device notifications requested" : "Dose tracking only"} />{!!purpose.trim() && <ReviewRow icon="list" label="Purpose" value={purpose.trim()} />}{!!instructions.trim() && <ReviewRow icon="file-text" label="Instructions" value={instructions.trim()} />}<ReviewRow icon="archive" label="Stock tracking" value={trackStock ? 'On' : 'Off'} sub={trackStock ? `${stock} ${plural} available · warning at ${threshold}` : undefined} />{!!notes.trim() && <ReviewRow icon="file-text" label="Notes" value={notes.trim()} />}</View>}
        {!!error && <Text accessibilityRole="alert" className="mt-3 text-[14px] text-[#D90008]">{error}</Text>}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        <View className="flex-row gap-3">
          {step > 0 && <Pressable accessibilityRole="button" onPress={back} className="min-h-[52px] flex-1 items-center justify-center rounded-full border" style={{ borderColor: colors.border, backgroundColor: colors.surface }}><Text className="text-[16px] font-semibold" style={{ color: colors.ink }}>Back</Text></Pressable>}
          <Pressable accessibilityRole="button" disabled={savingNow} onPress={step === 3 ? () => void save() : next} className="min-h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full" style={{ backgroundColor: isDark ? colors.accent : NAVY }}><Text className="text-[16px] font-semibold text-white">{savingNow ? 'Saving…' : step === 3 ? 'Save Medicine' : 'Next'}</Text><Feather name={step === 3 ? 'check' : 'arrow-right'} size={20} color="white" /></Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
