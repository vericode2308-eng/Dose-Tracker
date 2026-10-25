import { View, type ViewProps } from 'react-native';
import { radii } from '../../../theme';
import { useTheme } from '@/features/theme/ThemeContext';

/**
 * Grouped content surface. Light mode lifts with a soft shadow on ivory; dark mode separates
 * with a hairline instead, since shadows disappear on dark backgrounds.
 */
export function Card({ style, padded = true, ...props }: ViewProps & { className?: string; padded?: boolean }) {
  const { colors, isDark } = useTheme();
  return <View {...props} style={[{
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderCurve: 'continuous',
    padding: padded ? 16 : 0,
  }, isDark
    ? { borderWidth: 1, borderColor: colors.separator }
    : { boxShadow: '0 1px 2px rgba(14, 26, 43, 0.04), 0 6px 20px rgba(14, 26, 43, 0.05)' }, style]} />;
}
