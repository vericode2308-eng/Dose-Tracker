import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Rect } from 'react-native-svg';
import { useProfiles } from '@/features/profiles/context';
import { ProfileSwitcherTrigger } from '@/features/profiles/ProfileSwitcher';
import { useMedicines, type Medicine } from './context';
import { useTheme } from '@/features/theme/ThemeContext';

type Filter = 'Active' | 'Paused' | 'Archived' | 'As needed';
const FILTERS: Filter[] = ['Active', 'Paused', 'Archived', 'As needed'];

function CapsuleIcon({ medicine }: { medicine: Medicine }) {
  return <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: medicine.color }}>
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Rect x={8} y={2} width={10} height={22} rx={5} fill={medicine.filled ? 'white' : 'none'} stroke="white" strokeWidth={1.8} transform="rotate(42 13 13)" />
      {!medicine.filled && <Line x1={9} y1={13} x2={17} y2={13} stroke="white" strokeWidth={1.8} transform="rotate(42 13 13)" />}
    </Svg>
  </View>;
}

function MedicineCard({ medicine: m, onPress }: { medicine: Medicine; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${m.name}, ${m.dosage}${m.stock ? `, ${m.stock} ${m.form?.toLowerCase() || 'units'} left` : ''}`} onPress={onPress} className="mb-2.5 flex-row gap-4 rounded-[22px] px-3 py-2.5 active:opacity-70" style={{ backgroundColor: colors.surface }}>
    <CapsuleIcon medicine={m} />
    <View className="min-w-0 flex-1">
      <View className="flex-row flex-wrap items-start justify-between gap-1">
        <View className="shrink-0"><Text className="text-[16px] font-semibold leading-5 tracking-[-0.45px]" style={{ color: colors.ink }}>{m.name}</Text><Text className="mt-0.5 text-[14px] leading-[18px]" style={{ color: colors.secondary }}>{m.dosage}</Text></View>
        {!!m.tag && <View className={`shrink-0 rounded-full px-2.5 py-1 ${m.tag === 'After meal' ? 'bg-[#F1EEEA]' : 'bg-[#E4F0FF]'}`}><Text className={`text-[11px] font-medium ${m.tag === 'After meal' ? 'text-[#536073]' : 'text-[#005CF5]'}`}>{m.tag}</Text></View>}
      </View>
      <View className="mt-1 flex-row flex-wrap items-center justify-between gap-1">
        <View className="flex-row items-center gap-2"><Feather name={m.time ? 'clock' : 'star'} size={15} color={colors.secondary} /><Text className="text-[12px] leading-[16px]" style={{ color: colors.secondary }}>{m.schedule || (m.time ? `Daily at ${m.time}` : 'As needed')}</Text></View>
        {m.stock !== undefined && m.stock <= (m.stockThreshold ?? 10) && <View className="mr-3 flex-row items-center gap-1.5 rounded-full bg-[#FFEAEA] px-2 py-1"><View className="h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E11119]"><Text className="text-[10px] font-bold leading-3 text-white">!</Text></View><Text className="text-[11px] font-medium text-[#D90008]">{m.stock} {m.form?.toLowerCase() || 'units'} left</Text></View>}
      </View>
      {m.time && m.next && <View className="mt-0.5 flex-row items-center gap-2"><Feather name="calendar" size={15} color={colors.secondary} /><Text className="flex-shrink text-[12px] leading-[16px]" style={{ color: colors.secondary }}>Next dose: {m.next}, {m.time}</Text></View>}
    </View>
    <View className="absolute bottom-9 right-2"><Feather name="chevron-right" size={20} color={colors.ink} /></View>
  </Pressable>;
}

export default function MedicinesListScreen() {
  const { medicines, error, loading, refresh } = useMedicines();
  const { currentProfile } = useProfiles();
  const { colors, isDark } = useTheme();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const [filter, setFilter] = useState<Filter>('Active');
  const [query, setQuery] = useState('');
  const profile = currentProfile?.name || 'Me';
  const [sheet, setSheet] = useState<'profiles' | Medicine | null>(null);
  const profileMedicines = medicines;
  // The reference counts scheduled medicines separately, but includes PRN in the Active list.
  const count = (value: Filter) => profileMedicines.filter(m => value === 'As needed' ? !m.time && m.status === 'Active' : m.status === value).length;
  const visible = profileMedicines.filter(m => (filter === 'As needed' ? !m.time && m.status === 'Active' : m.status === filter) && `${m.name} ${m.dosage}`.toLowerCase().includes(query.trim().toLowerCase()));
  const close = () => setSheet(null);

  return <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: colors.background }}>
    <FlatList data={visible} keyExtractor={m => m.id} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}
      renderItem={({ item }) => <MedicineCard medicine={item} onPress={() => router.push({ pathname: '/medicine/[id]', params: { id: item.id } })} />}
      ListHeaderComponent={<>
        {!!error && <Pressable accessibilityRole="button" onPress={refresh} className="mb-2 min-h-11 rounded-2xl bg-[#FFF0D8] p-3"><Text>{error} Tap to retry.</Text></Pressable>}
        <View className="mb-1 flex-row items-center gap-5"><Pressable accessibilityRole="button" accessibilityLabel="Back to Today" onPress={() => router.dismissTo('/')} className="h-11 w-11 items-center justify-center"><Feather name="arrow-left" size={25} color={colors.ink} /></Pressable><Text accessibilityRole="header" className="text-[21px] font-semibold tracking-[-0.5px]" style={{ color: colors.ink }}>Medicines</Text></View>
        <ProfileSwitcherTrigger />
        <View className="mb-3 flex-row items-center gap-3 rounded-full border px-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Feather name="search" size={21} color={colors.ink} /><TextInput accessibilityLabel="Search medicines" placeholder="Search medicines..." placeholderTextColor={colors.secondary} value={query} onChangeText={setQuery} returnKeyType="search" className="h-[40px] min-w-0 flex-1 text-[15px]" style={{ color: colors.ink }} />{query !== '' && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={10}><Feather name="x" size={18} color={colors.secondary} /></Pressable>}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
          {FILTERS.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} accessibilityLabel={`${value} (${count(value)})`} onPress={() => setFilter(value)} className="min-h-[38px] items-center justify-center rounded-full border px-[9px]" style={{ backgroundColor: filter === value ? (isDark ? '#08B8BE' : '#071629') : colors.surface, borderColor: filter === value ? (isDark ? '#08B8BE' : '#071629') : colors.border }}><Text className="text-[12px]" style={{ color: filter === value ? '#FFFFFF' : colors.secondary }}>{value} ({count(value)})</Text></Pressable>)}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={() => router.push('/add-medicine')} className="mb-3 min-h-11 flex-row items-center justify-center gap-4 rounded-full active:opacity-80" style={{ backgroundColor: isDark ? '#08B8BE' : '#071629' }}><Feather name="plus" size={23} color="white" /><Text className="text-[17px] font-medium text-white">Add Medicine</Text></Pressable>
      </>}
      ListEmptyComponent={<View className="items-center rounded-[22px] px-6 py-10" style={{ backgroundColor: colors.surface }}><Feather name="inbox" size={28} color={colors.secondary} /><Text className="mt-3 text-base font-medium" style={{ color: colors.ink }}>{loading ? 'Loading medicines…' : error || (query ? 'No matching medicines' : `No ${filter.toLowerCase()} medicines`)}</Text><Text className="mt-2 text-center text-sm" style={{ color: colors.secondary }}>{query ? 'Try a different name or dosage.' : `There are no medicines in this category for ${profile}.`}</Text></View>}
    />
    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/30">
        <SafeAreaView edges={['bottom']} className="max-h-[85%] w-full max-w-[440px] self-center rounded-t-[28px]" style={{ backgroundColor: colors.background }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
            <View className="mb-4 flex-row items-center justify-between"><Text className="flex-1 text-[22px] font-semibold" style={{ color: colors.ink }}>{sheet === 'profiles' ? 'Choose profile' : sheet?.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}><Feather name="x" size={22} color={colors.ink} /></Pressable></View>

            {typeof sheet === 'object' && sheet && <View className="gap-3 rounded-[22px] p-5" style={{ backgroundColor: colors.surface }}><CapsuleIcon medicine={sheet} /><Text className="text-base" style={{ color: colors.secondary }}>{sheet.dosage}</Text><Text className="text-base" style={{ color: colors.secondary }}>{sheet.time ? `Daily at ${sheet.time}` : 'As needed'}</Text>{sheet.tag && <Text className="text-base text-[#005CF5]">{sheet.tag}</Text>}{sheet.stock !== undefined && <Text className="text-base text-[#D90008]">{sheet.stock} tablets left</Text>}</View>}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

