import { View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';
import { PressableScale } from '@/features/ui/PressableScale';
import { hapticSelection } from '@/features/ui/haptics';

/** `done` all taken, `attention` something missed or skipped, `pending` still to log, `none` nothing scheduled. */
export type DayStatus = 'done' | 'attention' | 'pending' | 'none';

export type WeekDay = {
  date: string;
  weekday: string;
  dayNumber: number;
  isToday: boolean;
  status: DayStatus;
  /** Spoken description, e.g. "Monday 20 October, 2 of 3 doses taken". */
  label: string;
};

/** Seven days share one row, so their text stops growing past this Dynamic Type multiplier; the whole day stays tappable and is read aloud in full. */
const FIXED_SLOT_SCALE = 1.2;

/** A row of days for a quick glance at the week; the dot under each day shows how it went. */
export function WeekStrip({ days, selected, onSelect }: { days: WeekDay[]; selected: string; onSelect: (date: string) => void }) {
  const { colors } = useTheme();
  const dotColor = (status: DayStatus, active: boolean) => {
    if (active) return colors.onPrimary;
    if (status === 'done') return colors.success;
    if (status === 'attention') return colors.warning;
    return colors.accent;
  };
  return <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4 }}>
    {days.map(day => {
      const active = day.date === selected;
      return <PressableScale key={day.date} scaleTo={0.94} accessibilityRole="tab" accessibilityLabel={day.label}
        accessibilityState={{ selected: active }}
        onPress={() => { if (!active) { void hapticSelection(); onSelect(day.date); } }}
        style={{
          flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8,
          borderRadius: 16, borderCurve: 'continuous', backgroundColor: active ? colors.primary : 'transparent',
        }}>
        <AppText variant="caption" weight="600" tone={active ? 'onPrimary' : day.isToday ? 'accent' : 'secondary'}
          numberOfLines={1} maxFontSizeMultiplier={FIXED_SLOT_SCALE} style={{ textTransform: 'uppercase' }}>{day.weekday}</AppText>
        <AppText variant="headline" tone={active ? 'onPrimary' : 'primary'} numberOfLines={1} maxFontSizeMultiplier={FIXED_SLOT_SCALE}
          style={{ fontVariant: ['tabular-nums'] }}>{day.dayNumber}</AppText>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: day.status === 'none' ? 'transparent' : dotColor(day.status, active),
          opacity: day.status === 'pending' && !active ? 0.45 : 1 }} />
      </PressableScale>;
    })}
  </View>;
}
