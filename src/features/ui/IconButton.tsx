import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

const TARGET = Platform.OS === 'android' ? 48 : 44;

/** Icon-only control with a full platform touch target and a required accessible name. */
export function IconButton({ icon, accessibilityLabel, accessibilityHint, onPress, filled = false, color, disabled, style }: {
  icon: IconName;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  filled?: boolean;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} scaleTo={0.92}
    hitSlop={4}
    style={[{ width: TARGET, height: TARGET, borderRadius: TARGET / 2, alignItems: 'center', justifyContent: 'center',
      backgroundColor: filled ? colors.fill : 'transparent' }, style]}>
    <Icon name={icon} size={filled ? 18 : 22} color={color ?? colors.label} weight="semibold" />
  </PressableScale>;
}
