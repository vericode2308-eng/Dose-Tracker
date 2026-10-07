import { publicErrorMessage } from '@/features/security/errors';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfiles } from '@/features/profiles/context';
import { useMedicines } from './context';
import { addMedicine, fetchMedicineDetails, type RecurringPattern, type StoredMedicine, type StoredSchedule } from '@/database';
import { parseReminderTime, scheduleMedicineReminders, editMedicineWithReminders } from '@/notificationManager';
import { MEDICINE_COLORS as COLORS, chooseMedicineColor } from './colors';
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const formatTime = (minute: number) => `${Math.floor(minute / 60) % 12 || 12}:${String(minute % 60).padStart(2, '0')} ${minute < 720 ? 'AM' : 'PM'}`;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const isPositiveNumber = (value: string) => /^\d+(?:\.\d+)?$/.test(value.trim()) && Number(value) > 0;
const isWholeNumber = (value: string) => /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value));
function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, required = false }: { required?: boolean; label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'number-pad' | 'decimal-pad'; multiline?: boolean }) {
  const { colors } = useTheme();
  return <View className="mb-3 rounded-[20px] border px-4 py-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
    <Text className="mb-1 text-[14px]" style={{ color: colors.secondary }}>{label}{required ? ' *' : ''}</Text>
    <TextInput accessibilityLabel={required ? `${label}, required` : label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondary} keyboardType={keyboardType} multiline={multiline} className="min-h-8 text-[17px] font-medium" style={{ color: colors.ink }} />
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

type MedicineFormProps = { initialMedicine?: StoredMedicine; initialSchedule?: StoredSchedule };

export default function AddMedicineScreen(props: MedicineFormProps = {}) {
  const { loading, error, refresh } = useMedicines();
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  // Only gate initial creation; a later cache refresh must not discard a draft.
  if (!ready && (props.initialMedicine || (!loading && !error))) setReady(true);
  if (!ready && !props.initialMedicine && (loading || error)) return <SafeAreaView className="flex-1 p-5" style={{ backgroundColor: colors.background }}>
    <Text style={{ color: colors.ink }}>{error || 'Loading medicines…'}</Text>
    {!!error && <Pressable accessibilityRole="button" onPress={refresh} className="min-h-12 justify-center"><Text style={{ color: colors.accent }}>Retry</Text></Pressable>}
  </SafeAreaView>;
  return <MedicineForm {...props} />;
}

function MedicineForm({ initialMedicine, initialSchedule }: MedicineFormProps) {
  const editing = !!initialMedicine;
  const pattern = initialSchedule?.pattern;
  const parsedStrength = initialMedicine?.strength?.match(/^(.*?)\s+(mg|mcg|g|mL|IU)$/);
  const initialStrength = parsedStrength?.[1] ?? initialMedicine?.strength ?? '';
  const initialStrengthUnit = parsedStrength?.[2] ?? (initialMedicine?.strength ? '' : 'mg');
  const minute = initialSchedule?.timeLocalMinute ?? 540;
  const initialTime = `${Math.floor(minute / 60) % 12 || 12}:${String(minute % 60).padStart(2, '0')} ${minute < 720 ? 'AM' : 'PM'}`;
  const { colors, isDark } = useTheme();
  const { medicines } = useMedicines();
  const { currentProfile: selectedProfile, profiles } = useProfiles();
  const [currentProfile] = useState(initialMedicine ? profiles.find(p => p.id === initialMedicine.profileId) : selectedProfile);
  const saving = useRef(false);
  const [savingNow, setSavingNow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialMedicine?.name ?? '');
  const [strength, setStrength] = useState(initialStrength);
  const [strengthUnit, setStrengthUnit] = useState(initialStrengthUnit);
  const [form, setForm] = useState<string>(initialMedicine?.dosageForm ?? 'Capsule');
  const [doseUnit, setDoseUnit] = useState(initialMedicine?.doseUnit || initialMedicine?.dosageForm || 'Capsule');
  const [purpose, setPurpose] = useState(initialMedicine?.purpose ?? '');
  const [instructions, setInstructions] = useState(initialMedicine?.instructions ?? '');
  const [notes, setNotes] = useState(initialMedicine?.notes ?? '');
  const [color, setColor] = useState(() => COLORS.find(c => c.value.toLowerCase() === initialMedicine?.color?.toLowerCase()) ?? (initialMedicine?.color ? { name: 'Custom', value: initialMedicine.color } : initialMedicine ? COLORS[0] : chooseMedicineColor(medicines)));
  const [frequency, setFrequency] = useState<string>(pattern ? ({ daily: 'Every day', weekdays: 'Selected weekdays', day_interval: 'Every N days', hour_interval: 'Every N hours', prn: 'As needed' })[pattern.kind] : 'Every day');
  const [interval, setInterval] = useState(String(pattern?.interval ?? 8));
  const [weekdays, setWeekdays] = useState<string[]>(pattern?.weekdays?.map(day => WEEKDAYS[day]) ?? []);
  const [startDate, setStartDate] = useState(pattern?.startDate ?? today());
  const [startTime, setStartTime] = useState(initialTime);
  const [additionalDoses, setAdditionalDoses] = useState<{ key: number; id?: string; time: string; amount: string }[]>(() =>
    initialMedicine?.schedules.filter(s => s.id !== initialSchedule?.id && JSON.stringify(s.pattern) === JSON.stringify(pattern) && s.reminderEnabled === initialSchedule?.reminderEnabled && ['daily', 'weekdays', 'day_interval'].includes(s.pattern.kind)).map((s, key) => ({ key, id: s.id, time: formatTime(s.timeLocalMinute!), amount: String(s.doseAmount) })) ?? []);
  const nextDoseKey = useRef(initialMedicine?.schedules.length ?? 0);
  const [moreOptions, setMoreOptions] = useState(!!pattern && (pattern.kind !== 'daily' || !!pattern.endDate || pattern.startDate > today()));
  const [reminderEnabled, setReminderEnabled] = useState(initialSchedule?.reminderEnabled ?? true);
  const [amount, setAmount] = useState(String(initialSchedule?.doseAmount ?? 1));
  const [durationType, setDurationType] = useState(pattern?.endDate ? 'End date' : 'Ongoing');
  const [duration, setDuration] = useState('7');
  const [endDate, setEndDate] = useState(pattern?.endDate ?? '');
  const [trackStock, setTrackStock] = useState(initialMedicine?.stockRemaining != null);
  const [stock, setStock] = useState(initialMedicine?.stockRemaining == null ? '' : String(initialMedicine.stockRemaining));
  const [threshold, setThreshold] = useState(initialMedicine?.lowStockThreshold == null ? '' : String(initialMedicine.lowStockThreshold));
  const [error, setError] = useState('');
  const strengthText = strength.trim() ? `${strength.trim()} ${strengthUnit}`.trim() : undefined;
  const unit = doseUnit.toLowerCase();
  const plural = `${unit}${unit.endsWith('s') ? '' : 's'}`;
  const schedule = frequency === 'Every N hours' ? `Every ${interval} hours` : frequency === 'Every N days' ? `Every ${interval} days` : frequency === 'Selected weekdays' ? weekdays.join(', ') : frequency;
  const reminderSupported = (frequency === 'Every day' || frequency === 'Selected weekdays') && durationType === 'Ongoing' && startDate <= today();
  const wantsReminder = reminderEnabled && reminderSupported;
  const multipleTimesSupported = ['Every day', 'Selected weekdays', 'Every N days'].includes(frequency);
  const reminderExplanation = reminderSupported
    ? 'We’ll remind you at every time listed above.'
    : durationType !== 'Ongoing' ? 'Reminders for courses with an end date are not supported yet. This course will be tracked without alerts.'
    : startDate > today() ? `Reminders for a future start date (${startDate}) are not supported yet. This course will be tracked without alerts.`
    : 'Reminders for hourly or every-N-days schedules are not supported yet. This course will be tracked without alerts.';
  function addDoseTime() {
    const occupied = [startTime, ...additionalDoses.map(d => d.time), ...(initialMedicine?.schedules.filter(s => s.id !== initialSchedule?.id).map(s => s.timeLocalMinute == null ? '' : `${Math.floor(s.timeLocalMinute / 60) % 12 || 12}:${String(s.timeLocalMinute % 60).padStart(2, '0')} ${s.timeLocalMinute < 720 ? 'AM' : 'PM'}`) ?? [])];
    const time = ['6:00 PM', '9:00 AM', '12:00 PM', '9:00 PM'].find(t => !occupied.includes(t)) ?? '';
    const key = nextDoseKey.current++;
    setAdditionalDoses(doses => [...doses, { key, time, amount }]);
  }
  const durationLabel = durationType === 'For a number of days' ? `For ${duration} days` : durationType === 'End date' ? `Until ${endDate}` : 'Ongoing';
  function next() {
    if (step === 0 && !name.trim()) { setError('Enter a medicine name.'); return; }
    if (step === 0 && strength.trim() && !isPositiveNumber(strength) && !(editing && strength === initialStrength && strengthUnit === initialStrengthUnit)) { setError('Enter a valid strength or leave it blank.'); return; }
    if (step === 0 && medicines.some(m => m.id !== initialMedicine?.id && m.name.toLowerCase() === name.trim().toLowerCase())) { setError('This medicine is already in your list.'); return; }
    if (step === 1 && frequency === 'Selected weekdays' && !weekdays.length) { setError('Select at least one weekday.'); return; }
    if (step === 1 && (frequency === 'Every N days' || frequency === 'Every N hours') && (!isWholeNumber(interval) || Number(interval) < 1)) { setError('Enter a valid repeat interval.'); return; }
    if (step === 1 && !isPositiveNumber(amount)) { setError('Enter a valid dose amount.'); return; }
    if (step === 1 && (!parseDate(startDate) || (frequency !== 'As needed' && !/^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/.test(startTime)))) { setError('Enter a valid start date and time.'); return; }
    if (step === 1 && additionalDoses.length) {
      if (!multipleTimesSupported) { setError('Remove additional times before choosing an hourly or as-needed schedule.'); return; }
      if (additionalDoses.some(d => !/^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/.test(d.time) || !isPositiveNumber(d.amount))) { setError('Enter a valid time and amount for each dose.'); return; }
      const times = [startTime, ...additionalDoses.map(d => d.time)].map(parseReminderTime);
      if (new Set(times).size !== times.length) { setError('Choose a different time for each dose.'); return; }
    }
    if (step === 1 && durationType === 'For a number of days' && (!isWholeNumber(duration) || Number(duration) < 1)) { setError('Enter a valid course duration.'); return; }
    if (step === 1 && durationType === 'End date' && (!parseDate(endDate) || endDate < startDate)) { setError('Choose an end date on or after the start date.'); return; }
    if (step === 2 && trackStock && (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(stock) || !/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(threshold))) { setError('Enter valid nonnegative quantities for stock and the warning level (up to six decimal places).'); return; }
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
      const input = {
        profileId: currentProfile?.id,
        medicine: { name, dosageForm: form, strength: strengthText, doseUnit,
          purpose: purpose.trim(), instructions: instructions.trim(), notes: notes.trim(), color: color.value,
          stockRemaining: trackStock ? stock : null, lowStockThreshold: trackStock ? threshold : null },
        schedule: { pattern: { kind, startDate, endDate: courseEnd,
          ...(kind === 'weekdays' ? { weekdays: weekdays.map(day => WEEKDAYS.indexOf(day)) } : {}),
          ...(kind === 'day_interval' || kind === 'hour_interval' ? { interval: Number(interval) } : {}) },
          timeLocalMinute: kind === 'prn' ? null : parseReminderTime(startTime), doseAmount: amount, reminderEnabled: wantsReminder, specialInstructions: initialSchedule?.specialInstructions ?? undefined },
      };
      const additionalSchedules = additionalDoses.map(dose => ({ ...input.schedule, id: dose.id, timeLocalMinute: parseReminderTime(dose.time), doseAmount: dose.amount, specialInstructions: initialMedicine?.schedules.find(s => s.id === dose.id)?.specialInstructions ?? input.schedule.specialInstructions }));
      if (initialMedicine && initialSchedule) {
        const result = await editMedicineWithReminders(initialMedicine.id, { ...input, additionalSchedules, scheduleId: initialSchedule.id, expectedStockRemaining: initialMedicine.stockRemaining });
        savedId = initialMedicine.id;
        void hapticSuccess();
        if (result.issues.length || (wantsReminder && (!result.allowed || (Platform.OS === 'android' && result.exact !== true)))) {
          setError(`Changes saved. ${result.issues.join(' ') || result.message}`);
          setSaved(true);
        } else if (router.canGoBack()) router.back();
        else router.replace('/medicines');
        return;
      }
      const result = await addMedicine({ ...input, additionalSchedules });
      savedId = result.medicineId;
      void hapticSuccess();
      const stored = await fetchMedicineDetails(result.medicineId);
      if (!stored) throw new Error('Saved medicine could not be reopened.');
      const reminders = await scheduleMedicineReminders(stored);
      if (wantsReminder && (reminders.issues.length || !reminders.allowed || (Platform.OS === 'android' && reminders.exact !== true))) {
        setError(`Medicine saved. ${reminders.issues.join(' ') || reminders.message}`);
        setSaved(true);
      } else router.dismissTo('/medicines');
    } catch (error) {
      if (savedId) {
        if (wantsReminder) {
          setError('Medicine saved. Reminder setup failed. Open Reminder status in Settings to retry.');
          setSaved(true);
        } else router.dismissTo('/medicines');
      } else setError(publicErrorMessage(error, 'The medicine could not be saved. Check the values and try again.'));
    } finally { saving.current = false; setSavingNow(false); }
  }
  const close = useCallback(() => {
    if (saving.current) return;
    if (router.canGoBack()) router.back();
    else router.replace('/medicines');
  }, []);
  const draft = JSON.stringify({ name, strength, strengthUnit, form, doseUnit, purpose, instructions, notes, color,
    frequency, interval, weekdays, startDate, startTime, additionalDoses, reminderEnabled, amount, durationType, duration, endDate, trackStock, stock, threshold });
  const [initialDraft] = useState(draft);
  const hasUnsavedChanges = !saved && draft !== initialDraft;
  const handleExit = useCallback(() => {
    if (saving.current) return;
    if (hasUnsavedChanges) {
      if (Platform.OS === 'web') {
        if (window.confirm('Discard your unsaved medicine changes?')) close();
        return;
      }
      Alert.alert(
        'Discard changes?',
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
    if (saved) { close(); return; }
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
    <View className="flex-row items-center justify-between px-4 pt-1"><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} className="h-11 w-11 items-center justify-center"><Feather name="arrow-left" size={25} color={colors.ink} /></Pressable><Text className="text-[20px] font-semibold" style={{ color: colors.ink }}>{editing ? 'Edit Medicine' : 'Add Medicine'}</Text><Pressable accessibilityRole="button" accessibilityLabel={editing ? "Close edit medicine" : "Close add medicine"} onPress={handleExit} className="h-11 w-11 items-center justify-center"><Feather name="x" size={25} color={colors.ink} /></Pressable></View>
    <View className="flex-row px-5 pb-4 pt-3"><View pointerEvents="none" className="absolute left-[16%] right-[16%] top-[28px] h-[1px]" style={{ backgroundColor: colors.border }} />{STEPS.map((label, index) => <View key={label} className="flex-1 items-center"><View className="z-10 h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: index <= step ? colors.accent : colors.pill }}>{index < step ? <Feather name="check" size={19} color="white" /> : <Text className="text-[16px] font-semibold" style={{ color: index === step ? '#FFFFFF' : colors.secondary }}>{index + 1}</Text>}</View><Text className={`mt-1 text-[12px] ${index === step ? 'font-semibold' : ''}`} style={{ color: index === step ? colors.ink : colors.secondary }}>{label}</Text></View>)}</View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView key={step} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <Text accessibilityRole="header" className="mt-2 text-[27px] font-bold tracking-[-0.6px]" style={{ color: colors.ink }}>{['Medicine details', 'When do you take it?', 'Set stock (optional)', 'Review and save'][step]}</Text><Text className="mb-3 mt-1 text-[16px]" style={{ color: colors.secondary }}>{['Tell us about your medicine.', 'Choose your usual dose times.', 'Track how much you have at home.', editing ? 'Check your changes before saving this medicine.' : 'Check your details before adding this medicine.'][step]}</Text>
        {step < 3 && <Text className="mb-3 text-[13px]" style={{ color: colors.secondary }}>* Required</Text>}
        {step === 0 && <MedicineDetailsForm name={name} setName={setName} strength={strength} setStrength={setStrength} strengthUnit={strengthUnit} setStrengthUnit={setStrengthUnit} form={form} setForm={(value) => { setForm(value); setDoseUnit(value); }} doseUnit={doseUnit} setDoseUnit={setDoseUnit} purpose={purpose} setPurpose={setPurpose} instructions={instructions} setInstructions={setInstructions} notes={notes} setNotes={setNotes} color={color} setColor={setColor} />}
        {step === 1 && <>
          <Text className="mb-3 text-sm" style={{ color: colors.secondary }}>One dose time is enough. Add another only if you take this medicine more than once a day.</Text>
          <View className="mb-3 rounded-[22px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            {frequency !== 'As needed' && <TimePickerField required label="Dose time" value={startTime} onChange={setStartTime} placeholder="9:00 AM" title="Select Dose Time" />}
            <Field required label={`How many ${plural}?`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            {additionalDoses.map((dose, index) => <View key={dose.key} className="mt-3 border-t pt-3" style={{ borderColor: colors.border }}>
              <TimePickerField label={`Additional dose ${index + 2} time`} value={dose.time} onChange={time => setAdditionalDoses(items => items.map(d => d.key === dose.key ? { ...d, time } : d))} placeholder="6:00 PM" title={`Select Dose ${index + 2} Time`} />
              <Field label={`Dose ${index + 2}: how many ${plural}?`} value={dose.amount} onChangeText={amount => setAdditionalDoses(items => items.map(d => d.key === dose.key ? { ...d, amount } : d))} keyboardType="decimal-pad" />
              {!dose.id && <Pressable accessibilityRole="button" accessibilityLabel={`Remove dose ${index + 2}`} onPress={() => setAdditionalDoses(items => items.filter(d => d.key !== dose.key))} className="min-h-11 justify-center"><Text style={{ color: colors.accent }}>Remove this time</Text></Pressable>}
            </View>)}
            {multipleTimesSupported && <Pressable accessibilityRole="button" accessibilityLabel="Add another dose time (optional)" onPress={addDoseTime} className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border" style={{ borderColor: colors.accent }}><Feather name="plus" size={20} color={colors.accent} /><Text style={{ color: colors.accent }}>Add another dose time (optional)</Text></Pressable>}
          </View>
          {frequency !== 'As needed' && <View className="mb-3 flex-row items-center gap-3 rounded-[22px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><View className="flex-1"><Text className="text-base font-semibold" style={{ color: colors.ink }}>Remind me</Text><Text className="mt-1 text-sm" style={{ color: colors.secondary }}>{reminderExplanation}</Text></View><Switch accessibilityLabel="Remind me" value={wantsReminder} disabled={!reminderSupported} onValueChange={setReminderEnabled} trackColor={{ true: TEAL }} /></View>}
          <Text className="mb-2 text-sm" style={{ color: colors.secondary }}>{schedule} · {durationLabel}{startDate === today() ? ' · Starts today' : ` · Starts ${startDate}`}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: moreOptions }} onPress={() => setMoreOptions(value => !value)} className="min-h-12 flex-row items-center justify-between"><Text style={{ color: colors.accent }}>{moreOptions ? 'Hide schedule options' : 'More schedule options'}</Text><Feather name={moreOptions ? 'chevron-up' : 'chevron-down'} size={20} color={colors.accent} /></Pressable>
          {moreOptions && <View className="rounded-[22px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text className="mb-2 font-semibold" style={{ color: colors.ink }}>How often? *</Text>
            {FREQUENCIES.map(([label]) => <Pressable key={label} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: frequency === label }} onPress={() => { if (additionalDoses.length && (label === 'Every N hours' || label === 'As needed')) { setError('This medicine has multiple dose times. Keep a daily, weekday or every-N-days schedule.'); return; } setFrequency(label); setError(''); }} className="min-h-11 flex-row items-center gap-3"><Feather name={frequency === label ? 'check-circle' : 'circle'} size={20} color={colors.accent} /><Text style={{ color: colors.ink }}>{label}</Text></Pressable>)}
            {frequency === 'Selected weekdays' && <><Text className="my-2" style={{ color: colors.ink }}>Days *</Text><View className="mb-3 flex-row justify-between">{WEEKDAYS.map(day => <Pressable key={day} accessibilityRole="button" accessibilityLabel={day} accessibilityState={{ selected: weekdays.includes(day) }} onPress={() => setWeekdays(days => days.includes(day) ? days.filter(d => d !== day) : [...days, day])} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: weekdays.includes(day) ? colors.accent : colors.subtleBg }}><Text style={{ color: weekdays.includes(day) ? '#FFFFFF' : colors.ink }}>{day[0]}</Text></Pressable>)}</View></>}
            {(frequency === 'Every N days' || frequency === 'Every N hours') && <Field required label={`Repeat every (${frequency.endsWith('hours') ? 'hours' : 'days'})`} value={interval} onChangeText={setInterval} keyboardType="number-pad" />}
            <DatePickerField required label="Start date" value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" title="Start Date" />
            <Text className="mb-2 mt-3 font-semibold" style={{ color: colors.ink }}>When should it stop? *</Text>
            {['Ongoing', 'End date', 'For a number of days'].map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={choice} accessibilityState={{ checked: durationType === choice }} onPress={() => setDurationType(choice)} className="min-h-11 flex-row items-center gap-3"><Feather name={durationType === choice ? 'check-circle' : 'circle'} size={20} color={colors.accent} /><Text style={{ color: colors.ink }}>{choice === 'Ongoing' ? 'No end date' : choice}</Text></Pressable>)}
            {durationType === 'For a number of days' && <Field required label="Number of days" value={duration} onChangeText={setDuration} keyboardType="number-pad" />}
            {durationType === 'End date' && <DatePickerField required label="End date" value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" title="End Date" minDate={startDate} />}
          </View>}
        </>}
        {step === 2 && <View className="rounded-[24px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><View className="mb-4 flex-row items-center gap-3"><View className="flex-1"><Text className="text-[17px] font-semibold " style={{ color: colors.ink }}>Track stock for this medicine</Text><Text className="mt-1 text-[13px] " style={{ color: colors.secondary }}>See in-app warnings when recorded stock is low.</Text></View><Switch accessibilityLabel="Track stock" value={trackStock} onValueChange={setTrackStock} trackColor={{ true: TEAL }} /></View>{trackStock && <>{editing && doseUnit !== initialMedicine?.doseUnit && <Text className="mb-3 text-sm" style={{ color: colors.secondary }}>Dose unit changed. Check the stock quantity and warning level in the new unit before saving.</Text>}<Info>{`Stock uses the same unit as your dose amount (${plural}).`}</Info><View className="mt-5"><Field required label={`Current quantity (${plural})`} value={stock} onChangeText={setStock} keyboardType="decimal-pad" placeholder="e.g. 21" /><Field required label={`Low-stock threshold (${plural})`} value={threshold} onChangeText={setThreshold} keyboardType="decimal-pad" placeholder="e.g. 6" /><Text className="text-[13px] leading-5 " style={{ color: colors.secondary }}>We’ll warn you when your stock reaches this number or below.</Text></View></>}</View>}
        {step === 3 && <View className="rounded-[24px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><View className="mb-4 flex-row items-center gap-4"><View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: color.value }}><MaterialCommunityIcons name="pill" size={36} color="white" /></View><View className="min-w-0 flex-1"><Text className="text-[21px] font-semibold " style={{ color: colors.ink }}>{name.trim()}</Text><Text className="text-[14px] " style={{ color: colors.secondary }}>{[strengthText, unit].filter(Boolean).join(' ')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Edit medicine details" disabled={savingNow || saved} onPress={() => setStep(0)} className="min-h-10 flex-row items-center gap-2 rounded-xl border px-3" style={{ borderColor: colors.border }}><Feather name="edit-2" size={16} color={colors.ink} /><Text style={{ color: colors.ink }}>Edit</Text></Pressable></View><ReviewRow icon="user" label="Person" value={currentProfile?.name || 'Me'} /><ReviewRow icon="circle" label="Form" value={form} /><ReviewRow icon="activity" label="Strength" value={strengthText || 'Not specified'} /><ReviewRow icon="plus-circle" label="Dose amount" value={[`${frequency === 'As needed' ? 'As needed' : startTime}: ${amount} ${Number(amount) === 1 ? unit : plural}`, ...additionalDoses.map(d => `${d.time}: ${d.amount} ${Number(d.amount) === 1 ? unit : plural}`)].join("\n")} /><ReviewRow icon="clock" label="Schedule" value={schedule} sub={frequency === 'As needed' ? undefined : `Starting ${startDate}, ${[startTime, ...additionalDoses.map(d => d.time)].join(", ")}`} /><ReviewRow icon="calendar" label="Course duration" value={durationLabel} /><ReviewRow icon="bell" label="Reminders" value={wantsReminder ? "On" : "Off"} sub={wantsReminder ? "Device notifications requested" : "Dose tracking only"} />{!!purpose.trim() && <ReviewRow icon="list" label="Purpose" value={purpose.trim()} />}{!!instructions.trim() && <ReviewRow icon="file-text" label="Instructions" value={instructions.trim()} />}<ReviewRow icon="archive" label="Stock tracking" value={trackStock ? 'On' : 'Off'} sub={trackStock ? `${stock} ${plural} available · warning at ${threshold}` : undefined} />{!!notes.trim() && <ReviewRow icon="file-text" label="Notes" value={notes.trim()} />}</View>}
        {!!error && <Text accessibilityRole="alert" className="mt-3 text-[14px] text-[#D90008]">{error}</Text>}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        <View className="flex-row gap-3">
          {step > 0 && !saved && <Pressable accessibilityRole="button" onPress={back} className="min-h-[52px] flex-1 items-center justify-center rounded-full border" style={{ borderColor: colors.border, backgroundColor: colors.surface }}><Text className="text-[16px] font-semibold" style={{ color: colors.ink }}>Back</Text></Pressable>}
          <Pressable accessibilityRole="button" disabled={savingNow} onPress={saved ? close : step === 3 ? () => void save() : next} className="min-h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full" style={{ backgroundColor: isDark ? colors.accent : NAVY }}><Text className="text-[16px] font-semibold text-white">{saved ? 'Done' : savingNow ? 'Saving…' : step === 3 ? (editing ? 'Save changes' : 'Save Medicine') : 'Next'}</Text><Feather name={step === 3 ? 'check' : 'arrow-right'} size={20} color="white" /></Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
