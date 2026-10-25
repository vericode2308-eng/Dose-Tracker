import type { ReactNode } from 'react';
import { View } from 'react-native';
import { radii } from '../../../theme';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

/**
 * Inset grouped section in the iOS Settings pattern, drawn in the app's own palette:
 * uppercase header, rounded group, optional footer note.
 */
export function ListSection({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const { colors, isDark } = useTheme();
  return <View style={{ gap: 6 }}>
    {!!title && <AppText accessibilityRole="header" variant="footnote" tone="secondary" style={{ textTransform: 'uppercase', paddingHorizontal: 16 }}>{title}</AppText>}
    <View style={[{ backgroundColor: colors.surface, borderRadius: radii.card, borderCurve: 'continuous', overflow: 'hidden' },
      isDark ? { borderWidth: 1, borderColor: colors.separator } : { boxShadow: '0 1px 2px rgba(14, 26, 43, 0.04)' }]}>
      {children}
    </View>
    {!!footer && <AppText variant="footnote" tone="secondary" style={{ paddingHorizontal: 16 }}>{footer}</AppText>}
  </View>;
}

/** Rounded icon tile at the start of a row. Monochrome brand tint keeps the list calm. */
function IconTile({ icon, destructive }: { icon: IconName; destructive?: boolean }) {
  const { colors } = useTheme();
  return <View style={{ width: 30, height: 30, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
    backgroundColor: destructive ? colors.dangerSoft : colors.accentSoft }}>
    <Icon name={icon} size={16} color={destructive ? colors.dangerText : colors.accentText} weight="semibold" />
  </View>;
}

/**
 * One row. Pass `onPress` for navigation (chevron by default) or `trailing` for an inline
 * control (switch, picker). The separator starts at the text, as in iOS.
 */
export function ListRow({ icon, title, subtitle, value, onPress, trailing, accessory = 'chevron', destructive = false, disabled = false, last = false, accessibilityHint }: {
  icon?: IconName; title: string; subtitle?: string; value?: string; onPress?: () => void; trailing?: ReactNode;
  accessory?: 'chevron' | 'external' | 'none'; destructive?: boolean; disabled?: boolean; last?: boolean; accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const content = <>
    {!!icon && <IconTile icon={icon} destructive={destructive} />}
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch', minHeight: 52, paddingVertical: 10, paddingRight: 16,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.separator }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="body" tone={destructive ? 'danger' : 'primary'} weight={destructive ? '600' : undefined}>{title}</AppText>
        {!!subtitle && <AppText variant="footnote" tone="secondary">{subtitle}</AppText>}
      </View>
      {!!value && <AppText variant="body" tone="secondary" numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</AppText>}
      {trailing}
      {!!onPress && accessory !== 'none' && <Icon name={accessory === 'external' ? 'external' : 'chevronRight'} size={accessory === 'external' ? 15 : 14}
        color={colors.tertiaryLabel} weight="semibold" />}
    </View>
  </>;
  const rowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, paddingLeft: 16 };
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  // PressableScale takes a static style (a function style is dropped by NativeWind); scaleTo 1 keeps full-width rows from shrinking.
  return <PressableScale accessibilityRole={accessory === 'external' ? 'link' : 'button'} accessibilityLabel={value ? `${title}, ${value}` : title}
    accessibilityHint={accessibilityHint} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} scaleTo={1} style={rowStyle}>
    {content}
  </PressableScale>;
}
