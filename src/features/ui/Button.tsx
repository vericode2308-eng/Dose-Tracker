import { ActivityIndicator, Platform, View, type AccessibilityProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, type ThemeColors } from '@/features/theme/ThemeContext';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'plain' | 'destructive' | 'destructiveSoft';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, { background: keyof ThemeColors | null; foreground: keyof ThemeColors }> = {
  primary: { background: 'primary', foreground: 'onPrimary' },
  secondary: { background: 'fill', foreground: 'label' },
  tinted: { background: 'accentSoft', foreground: 'accentText' },
  plain: { background: null, foreground: 'accentText' },
  destructive: { background: 'danger', foreground: 'onPrimary' },
  destructiveSoft: { background: 'dangerSoft', foreground: 'dangerText' },
};

// Every size keeps the platform minimum touch target (44pt iOS, 48dp Android).
const MIN_TARGET = Platform.OS === 'android' ? 48 : 44;
const SIZES: Record<ButtonSize, { height: number; paddingHorizontal: number; icon: number; text: 'subhead' | 'headline' }> = {
  sm: { height: MIN_TARGET, paddingHorizontal: 14, icon: 17, text: 'subhead' },
  md: { height: Math.max(MIN_TARGET, 48), paddingHorizontal: 18, icon: 19, text: 'headline' },
  lg: { height: 54, paddingHorizontal: 22, icon: 20, text: 'headline' },
};

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading = false, disabled = false, style, ...accessibility }: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
} & Pick<AccessibilityProps, 'accessibilityLabel' | 'accessibilityHint'>) {
  const { colors } = useTheme();
  const spec = VARIANTS[variant];
  const metrics = SIZES[size];
  const foreground = colors[spec.foreground] as string;
  const inactive = disabled || loading;
  // The destructive fill keeps white text in both themes (4.8:1 on danger red).
  const textColor = variant === 'destructive' ? '#FFFFFF' : foreground;
  return <PressableScale accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }}
    {...accessibility} disabled={inactive} onPress={onPress}
    style={[{
      minHeight: metrics.height,
      paddingHorizontal: metrics.paddingHorizontal,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: spec.background ? colors[spec.background] as string : 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }, style]}>
    {loading ? <ActivityIndicator color={textColor} /> : <>
      {icon && <Icon name={icon} size={metrics.icon} color={textColor} weight="semibold" />}
      <View style={{ flexShrink: 1 }}><AppText variant={metrics.text} weight="600" numberOfLines={2} style={{ color: textColor, textAlign: 'center' }}>{title}</AppText></View>
    </>}
  </PressableScale>;
}
