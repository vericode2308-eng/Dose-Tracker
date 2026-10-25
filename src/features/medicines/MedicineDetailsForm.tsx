import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MEDICINE_COLORS, type MedicineColor as Color } from './colors';
import { useTheme } from '@/features/theme/ThemeContext';
import { ActionMenu } from '@/features/ui/ActionMenu';

const FORMS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Inhaler', 'Other'];
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
  const [showOptional, setShowOptional] = useState(!!(p.purpose || p.instructions || p.notes));
  return <>
    <InputCard required label="Medicine name" value={p.name} onChangeText={p.setName} placeholder="e.g. Amoxicillin" outlined />
    <View className="mb-[10px] rounded-[17px] border px-[14px] py-[8px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="flex-row items-center"><View className="flex-1"><Label>Strength (optional)</Label><TextInput accessibilityLabel="Strength (optional)" value={p.strength} onChangeText={p.setStrength} placeholder="e.g. 250" placeholderTextColor={colors.secondary} keyboardType="decimal-pad" className="min-h-[28px] py-0 text-[18px]" style={{ color: colors.ink }} /></View><View className="border-l pl-3" style={{ borderColor: colors.border }}><ActionMenu title="Strength unit" accessibilityLabel={`Strength unit, ${p.strengthUnit}`} onSelect={p.setStrengthUnit}
        items={['mg', 'mcg', 'g', 'mL', 'IU'].map(unit => ({ id: unit, title: unit, checked: unit === p.strengthUnit }))}>
        <View className="min-h-[44px] w-[76px] flex-row items-center justify-between"><Text className="text-[18px]" style={{ color: colors.accentText }}>{p.strengthUnit || 'Unit'}</Text><Feather name="chevron-down" size={17} color={colors.accentText} /></View>
      </ActionMenu></View></View>
    </View>
    <View className="mb-[10px] rounded-[17px] border px-[10px] pb-[8px] pt-[7px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="mb-[3px] pl-[3px]"><Label required>Form</Label></View>
      <View className="flex-row flex-wrap justify-between gap-y-[8px]">{FORMS.map(form => <Pressable key={form} accessibilityRole="radio" accessibilityLabel={`${form}, medicine form, required`} accessibilityState={{ checked: p.form === form }} onPress={() => p.setForm(form)} className="h-[72px] w-[32%] items-center justify-center rounded-[14px] border" style={{ borderWidth: p.form === form ? 2 : 1, borderColor: p.form === form ? colors.accent : colors.border, backgroundColor: p.form === form ? (isDark ? colors.pill : '#EFFBFA') : colors.surface }}><MedicineIcon form={form} selected={p.form === form} /><Text className={`mt-[3px] text-[14px] ${p.form === form ? 'font-semibold' : ''}`} style={{ color: p.form === form ? colors.ink : colors.secondary }}>{form}</Text></Pressable>)}</View>
    </View>
    <View className="mb-[10px] rounded-[17px] border px-[14px] py-[8px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><View className="flex-row items-center justify-between gap-3"><Label required>Dose unit</Label><ActionMenu title="Dose unit" accessibilityLabel={`Dose unit, required, ${p.doseUnit}`} onSelect={p.setDoseUnit}
        items={FORMS.map(unit => ({ id: unit, title: unit, checked: unit === p.doseUnit }))}>
        <View className="min-h-[44px] flex-row items-center gap-2"><Text className="text-[18px]" style={{ color: colors.accentText }}>{p.doseUnit}</Text><Feather name="chevron-down" size={17} color={colors.accentText} /></View>
      </ActionMenu></View></View>
    <View className="mb-[10px] rounded-[17px] border px-[14px] py-[8px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <Label>Color & icon</Label>
      <View accessibilityRole="radiogroup" accessibilityLabel="Medicine color" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {(MEDICINE_COLORS.some(c => c.value.toLowerCase() === p.color.value.toLowerCase()) ? MEDICINE_COLORS : [...MEDICINE_COLORS, p.color]).map(color => {
          const selected = color.value.toLowerCase() === p.color.value.toLowerCase();
          return <Pressable key={color.value} accessibilityRole="radio" accessibilityLabel={`${color.name} medicine color`} accessibilityState={{ checked: selected }} onPress={() => p.setColor(color)}
            style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 2, borderColor: selected ? colors.ink : 'transparent', opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: color.value, alignItems: 'center', justifyContent: 'center' }}>
              {selected && <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={16} color={colors.onPrimary} /></View>}
            </View>
          </Pressable>;
        })}
      </View>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showOptional }} onPress={() => setShowOptional(value => !value)} className="min-h-12 flex-row items-center justify-between"><Text style={{ color: colors.accentText }}>{showOptional ? 'Hide extra details' : 'Add notes or instructions (optional)'}</Text><Feather name={showOptional ? 'chevron-up' : 'chevron-down'} size={20} color={colors.accent} /></Pressable>
    {showOptional && <>
    <InputCard label="Purpose (optional)" value={p.purpose} onChangeText={p.setPurpose} placeholder="What is it for?" />
    <InputCard label="Instructions (optional)" value={p.instructions} onChangeText={p.setInstructions} placeholder="e.g. Take after food" />
    <InputCard label="Notes (optional)" value={p.notes} onChangeText={p.setNotes} placeholder="Anything else to remember" multiline />
    </>}
  </>;
}
