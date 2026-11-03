import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Svg, { Line, Rect } from 'react-native-svg';
import { useProfiles } from '@/features/profiles/context';
import { ProfileSwitcherTrigger } from '@/features/profiles/ProfileSwitcher';
import { useMedicines, type Medicine } from './context';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';
import { Button } from '@/features/ui/Button';
import { Card } from '@/features/ui/Card';
import { Icon } from '@/features/ui/Icon';
import { IconButton } from '@/features/ui/IconButton';
import { InlineMessage } from '@/features/ui/InlineMessage';
import { PressableScale } from '@/features/ui/PressableScale';
import { confirmDestructive } from '@/features/ui/confirm';
import { formatClockList } from '@/features/ui/format';
import { deleteMedicineWithReminders } from '@/notificationManager';
import { radii } from '../../../theme';

type Filter = 'Active' | 'Paused' | 'Archived' | 'As needed';
const FILTERS: Filter[] = ['Active', 'Paused', 'Archived', 'As needed'];

function CapsuleIcon({ medicine }: { medicine: Medicine }) {
  return <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: medicine.color }}>
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Rect x={8} y={2} width={10} height={22} rx={5} fill={medicine.filled ? 'white' : 'none'} stroke="white" strokeWidth={1.8} transform="rotate(42 13 13)" />
      {!medicine.filled && <Line x1={9} y1={13} x2={17} y2={13} stroke="white" strokeWidth={1.8} transform="rotate(42 13 13)" />}
    </Svg>
  </View>;
}

function MedicineCard({ medicine: m, onPress, onDelete }: { medicine: Medicine; onPress: () => void; onDelete: (swipeable: SwipeableMethods | null) => void }) {
  const { colors } = useTheme();
  const unit = m.form?.toLowerCase() || 'units';
  const lowStock = m.stock !== undefined && m.stock <= (m.stockThreshold ?? 10);
  // A native iOS long-press context menu was tried by wrapping each FlatList row in @expo/ui's
  // Host+ContextMenu; it broke touch dispatch for the whole list (iOS 27.0 simulator,
  // 2026-10-22) because a Host owns layout and touch for its subtree. A row menu should use
  // Expo Router Link.Menu or @expo/ui's own List instead.
  const swipeable = useRef<SwipeableMethods>(null);
  // Swipe left to reveal Delete, like a native iOS list row. Screen-reader users get the same
  // action from the medicine's detail screen, and from the row's custom accessibility action.
  return <Swipeable ref={swipeable} friction={2} rightThreshold={40} overshootRight={false} containerStyle={{ marginBottom: 10 }}
    renderRightActions={() => <View style={{ width: 62, alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* iOS 26 style swipe action: a round, icon-only button centred beside the card; the label is spoken, not drawn. */}
      <PressableScale accessibilityRole="button" accessibilityLabel={`Delete ${m.name}`} onPress={() => onDelete(swipeable.current)}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="trash" size={19} color={colors.onPrimary} />
      </PressableScale>
    </View>}>
  <PressableScale accessibilityRole="button" onPress={onPress}
    accessibilityLabel={`View ${m.name}, ${m.dosage}${m.stock !== undefined ? `, ${m.stock} ${unit} left` : ''}`}
    accessibilityActions={[{ name: 'delete', label: 'Delete medicine' }]}
    onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') onDelete(swipeable.current); }}>
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingRight: 12 }}>
      <CapsuleIcon medicine={m} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AppText variant="headline" style={{ flexShrink: 1 }}>{m.name}</AppText>
          {!!m.tag && <View style={{ backgroundColor: colors.infoSoft, borderRadius: radii.chip, paddingHorizontal: 8, paddingVertical: 2 }}>
            <AppText variant="caption2" weight="600" tone="info">{m.tag}</AppText>
          </View>}
        </View>
        <AppText variant="subhead" tone="secondary">{m.dosage}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Icon name={m.time ? 'clock' : 'pill'} size={13} color={colors.secondaryLabel} />
          <AppText variant="footnote" tone="secondary" style={{ flexShrink: 1 }}>
            {m.time ? `${m.schedule ?? 'Daily'} at ${formatClockList(m.time)}` : m.schedule ?? 'As needed'}{m.time && m.next ? ` · Next ${m.next}` : ''}
          </AppText>
        </View>
        {lowStock && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-start', backgroundColor: colors.dangerSoft, borderRadius: radii.chip, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Icon name="warning" size={12} color={colors.dangerText} />
          <AppText variant="caption" weight="600" tone="danger">{m.stock} {unit} left</AppText>
        </View>}
      </View>
      <Icon name="chevronRight" size={14} color={colors.tertiaryLabel} weight="semibold" />
    </Card>
  </PressableScale>
  </Swipeable>;
}

export default function MedicinesListScreen() {
  const { medicines, setMedicines, error, loading, refresh } = useMedicines();
  const [actionError, setActionError] = useState('');
  const { currentProfile } = useProfiles();
  const { colors } = useTheme();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const [filter, setFilter] = useState<Filter>('Active');
  const [query, setQuery] = useState('');
  const profile = currentProfile?.name || 'Me';
  const deleting = useRef(false);
  async function remove(medicine: Medicine, swipeable: SwipeableMethods | null) {
    if (deleting.current) return;
    deleting.current = true;
    try {
      const confirmed = await confirmDestructive({ title: `Delete ${medicine.name}?`,
        message: 'This permanently deletes the medicine, its dose history and its reminders. This can’t be undone.', confirmLabel: 'Delete Medicine' });
      if (!confirmed) { swipeable?.close(); return; }
      await deleteMedicineWithReminders(medicine.id);
      setMedicines(items => items.filter(item => item.id !== medicine.id));
    } catch {
      swipeable?.close();
      setActionError('Could not delete the medicine. Please try again.');
    } finally { deleting.current = false; }
  }
  // The reference counts scheduled medicines separately, but includes PRN in the Active list.
  const count = (value: Filter) => medicines.filter(m => value === 'As needed' ? !m.time && m.status === 'Active' : m.status === value).length;
  const visible = medicines.filter(m => (filter === 'As needed' ? !m.time && m.status === 'Active' : m.status === filter) && `${m.name} ${m.dosage}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <>
    <Stack.Screen options={{ headerRight: () => <IconButton icon="add" accessibilityLabel="Add medicine" color={colors.accentText} onPress={() => router.push('/add-medicine')} /> }} />
    <Stack.SearchBar placeholder="Search medicines" onChangeText={event => setQuery(event.nativeEvent.text)}
      onCancelButtonPress={() => setQuery('')} hideWhenScrolling={false} tintColor={colors.accentText} />
    <FlatList data={visible} keyExtractor={m => m.id} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      renderItem={({ item }) => <MedicineCard medicine={item} onDelete={swipeable => remove(item, swipeable)} onPress={() => router.push({ pathname: '/medicine/[id]', params: { id: item.id } })} />}
      ListHeaderComponent={<View style={{ gap: 12, marginBottom: 12 }}>
        {!!error && <InlineMessage tone="danger" message={error} actionTitle="Retry" onAction={refresh} />}
        {!!actionError && <InlineMessage tone="danger" message={actionError} actionTitle="Dismiss" onAction={() => setActionError('')} />}
        <ProfileSwitcherTrigger />
        {/* Bleeds to the screen edges so a clipped chip reads as scrollable; the first chip still aligns with the 16pt gutter. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {FILTERS.map(value => {
            const selected = filter === value;
            return <PressableScale key={value} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${value}, ${count(value)}`}
              hitSlop={{ top: 4, bottom: 4 }} onPress={() => setFilter(value)} style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center',
                backgroundColor: selected ? colors.primary : colors.fill }}>
              <AppText variant="subhead" weight={selected ? '600' : '400'} style={{ color: selected ? colors.onPrimary : colors.label, fontVariant: ['tabular-nums'] }}>
                {value} {count(value)}
              </AppText>
            </PressableScale>;
          })}
        </ScrollView>
      </View>}
      ListEmptyComponent={<Card style={{ alignItems: 'center', gap: 6, paddingVertical: 32 }}>
        <Icon name="medicines" size={30} color={colors.tertiaryLabel} />
        <AppText variant="headline" style={{ textAlign: 'center', marginTop: 4 }}>{loading ? 'Loading medicines…' : query ? 'No matching medicines' : `No ${filter.toLowerCase()} medicines`}</AppText>
        <AppText variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>{query ? 'Try a different name or dosage.' : `There are no medicines in this category for ${profile}.`}</AppText>
        {!loading && !query && filter === 'Active' && <Button title="Add Medicine" icon="add" onPress={() => router.push('/add-medicine')} style={{ marginTop: 10 }} />}
      </Card>}
    />
  </>;
}
