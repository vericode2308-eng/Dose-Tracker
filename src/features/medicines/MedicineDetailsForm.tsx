import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/features/theme/ThemeContext';

const FORMS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Inhaler', 'Other'];
const COLORS = [{ name: 'Teal', value: '#079D9D' }, { name: 'Blue', value: '#3297FF' }, { name: 'Orange', value: '#FFA72E' }, { name: 'Purple', value: '#8845FA' }];
type Color = typeof COLORS[number];
type Props = {
  name: string; setName: (value: string) => void;
  strength: string; setStrength: (value: string) => void;
  strengthUnit: string; setStrengthUnit: (value: string) => void;
  form: string; setForm: (value: string) => void;
  doseUnit: string; setDoseUnit: (value: string) => void;
  purpose: string; setPurpose: (value: string) => void;
  instructions: string; setInstructions: (value: string) => void;
  notes: string; setNotes: (value: string) => void;
  color: Color; setColor: (value: Color) => void;
};

function MedicineIcon({ form, selected = false }: { form: string; selected?: boolean }) {
  const { colors } = useTheme();
  const ink = selected ? colors.accent : colors.ink;
  if (form === 'Tablet') return <Svg width={30} height={30} viewBox="0 0 32 32"><Path d="M7 17 L17 7 C24 0 32 8 25 15 L15 25 C8 32 0 24 7 17 Z M12 12 L22 22" stroke={ink} strokeWidth={2} fill="none" /></Svg>;
  if (form === 'Inhaler') return <Svg width={30} height={30} viewBox="0 0 32 32"><Path d="M17 4h8l-2 24H7V18h9z M18 4V1h7v4 M9 23h4" fill="none" stroke={ink} strokeWidth={2} strokeLinejoin="round" /></Svg>;
  return <MaterialCommunityIcons name={form === 'Capsule' ? 'pill' : form === 'Liquid' ? 'water-outline' : form === 'Injection' ? 'needle' : 'dots-horizontal'} size={30} color={ink} />;
}

function Label({ children, required = false }: { children: string; required?: boolean }) {
  const { colors } = useTheme();
  const [main, optional] = children.split(' (');
  return <Text accessibilityLabel={required ? `${children}, required` : children} className="text-[14px] leading-[19px]" style={{ color: colors.ink }}>{main}{required ? ' *' : ''}{optional && <Text style={{ color: colors.secondary }}> ({optional}</Text>}</Text>;
}

function InputCard({ label, value, onChangeText, placeholder, outlined = false, multiline = false, required = false }: { required?: boolean; label: string; value: string; onChangeText: (value: string) => void; placeholder: string; outlined?: boolean; multiline?: boolean }) {
  const { colors } = useTheme();
  return <View className="mb-[10px] rounded-[17px] border px-[14px] py-[8px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
    <Label required={required}>{label}</Label>
    <TextInput accessibilityLabel={required ? `${label}, required` : label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondary} multiline={multiline} className={`min-h-[28px] py-0 text-[18px] leading-[25px] ${outlined ? 'mt-[3px] rounded-[11px] border px-[10px] py-[4px]' : ''}`} style={{ color: colors.ink, borderColor: outlined ? colors.border : 'transparent' }} />
  </View>;
}

export function MedicineDetailsForm(p: Props) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState<'strength' | 'dose' | 'color' | null>(null);
  function choices(kind: 'strength' | 'dose' | 'color', values: string[], onSelect: (value: string) => void) {
    return open === kind && <View className="mt-2 border-t" style={{ borderColor: colors.border }}>{values.map(value => <Pressable key={value} accessibilityRole="button" onPress={() => { onSelect(value); setOpen(null); }} className="min-h-11 justify-center"><Text className="text-[16px]" style={{ color: colors.ink }}>{value}</Text></Pressable>)}</View>;
  }
  return <>
    <InputCard required label="Medicine name" value={p.name} onChangeText={p.setName} placeholder="e.g. Amoxicillin" outlined />
    <View className="mb-[10px] rounded-[17px] border px-[14px] py-[8px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="flex-row items-center"><View className="flex-1"><Label>Strength (optional)</Label><TextInput accessibilityLabel="Strength (optional)" value={p.strength} onChangeText={p.setStrength} placeholder="e.g. 250" placeholderTextColor={colors.secondary} keyboardType="decimal-pad" className="min-h-[28px] py-0 text-[18px]" style={{ color: colors.ink }} /></View><Pressable accessibilityRole="button" accessibilityLabel={`Strength unit, ${p.strengthUnit}`} onPress={() => setOpen(open === 'strength' ? null : 'strength')} className="min-h-[42px] w-[85px] flex-row items-center justify-between border-l pl-4" style={{ borderColor: colors.border }}><Text className="text-[18px]" style={{ color: colors.ink }}>{p.strengthUnit}</Text><Feather name="chevron-down" size={19} color={colors.ink} /></Pressable></View>
      {choices('strength', ['mg', 'mcg', 'g', 'mL', 'IU'], p.setStrengthUnit)}
    </View>
    <View className="mb-[10px] rounded-[17px] border px-[10px] pb-[8px] pt-[7px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="mb-[3px] pl-[3px]"><Label required>Form</Label></View>
      <View className="flex-row flex-wrap justify-between gap-y-[8px]">{FORMS.map(form => <Pressable key={form} accessibilityRole="radio" accessibilityLabel={`${form}, medicine form, required`} accessibilityState={{ checked: p.form === form }} onPress={() => p.setForm(form)} className="h-[72px] w-[32%] items-center justify-center rounded-[14px] border" style={{ borderWidth: p.form === form ? 2 : 1, borderColor: p.form === form ? colors.accent : colors.border, backgroundColor: p.form === form ? (isDark ? colors.pill : '#EFFBFA') : colors.surface }}><MedicineIcon form={form} selected={p.form === form} /><Text className={`mt-[3px] text-[14px] ${p.form === form ? 'font-semibold' : ''}`} style={{ color: p.form === form ? colors.ink : colors.secondary }}>{form}</Text></Pressable>)}</View>
    </View>
    <View className="mb-[10px] rounded-[17px] border px-[14px] py-[8px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Pressable accessibilityRole="button" accessibilityLabel={`Dose unit, required, ${p.doseUnit}`} onPress={() => setOpen(open === 'dose' ? null : 'dose')} className="flex-row items-center justify-between"><View><Label required>Dose unit</Label><Text className="text-[18px] leading-[28px]" style={{ color: colors.ink }}>{p.doseUnit}</Text></View><Feather name="chevron-down" size={19} color={colors.ink} /></Pressable>{choices('dose', FORMS, p.setDoseUnit)}</View>
    <InputCard label="Purpose (optional)" value={p.purpose} onChangeText={p.setPurpose} placeholder="What is it for?" />
    <InputCard label="Instructions (optional)" value={p.instructions} onChangeText={p.setInstructions} placeholder="e.g. Take after food" />
    <View className="flex-row items-start gap-[10px]">
      <View className="min-h-[73px] w-[43%] rounded-[17px] border px-[14px] py-[8px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Label>Color & icon</Label><Pressable accessibilityRole="button" accessibilityLabel={`Color and icon, ${p.color.name}`} onPress={() => setOpen(open === 'color' ? null : 'color')} className="mt-[4px] min-h-[36px] flex-row items-center gap-[9px]"><View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: p.color.value }}><MaterialCommunityIcons name="pill" size={23} color="white" /></View><Text className="flex-1 text-[16px]" style={{ color: colors.ink }}>{p.color.name}</Text><Feather name="chevron-down" size={18} color={colors.ink} /></Pressable>{choices('color', COLORS.map(c => c.name), value => p.setColor(COLORS.find(c => c.name === value)!))}</View>
      <View className="min-h-[73px] flex-1 rounded-[17px] border px-[14px] py-[8px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Label>Notes (optional)</Label><TextInput accessibilityLabel="Notes (optional)" value={p.notes} onChangeText={p.setNotes} placeholder="Anything else to remember" placeholderTextColor={colors.secondary} multiline className="mt-[4px] min-h-[32px] py-0 text-[16px] leading-[23px]" style={{ color: colors.ink }} /></View>
    </View>
  </>;
}
