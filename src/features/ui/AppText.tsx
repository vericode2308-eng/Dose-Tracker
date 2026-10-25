import { Text, type TextProps, type TextStyle } from 'react-native';
import { typography } from '../../../theme';
import { useTheme, type ThemeColors } from '@/features/theme/ThemeContext';

export type TextVariant = keyof typeof typography;
export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'onPrimary' | 'inverse';

const TONES: Record<TextTone, keyof ThemeColors> = {
  primary: 'label',
  secondary: 'secondaryLabel',
  tertiary: 'tertiaryLabel',
  accent: 'accentText',
  success: 'successText',
  warning: 'warningText',
  danger: 'dangerText',
  info: 'infoText',
  onPrimary: 'onPrimary',
  inverse: 'inverseLabel',
};

/** Text on the shared Apple-style ramp. Size scales with Dynamic Type. */
export function AppText({ variant = 'body', tone = 'primary', weight, style, ...props }: TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextStyle['fontWeight'];
}) {
  const { colors } = useTheme();
  const base = typography[variant] as TextStyle;
  return <Text {...props} style={[base, { color: colors[TONES[tone]] as string }, weight && { fontWeight: weight }, style]} />;
}
