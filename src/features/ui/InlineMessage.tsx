import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '../../../theme';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

type Tone = 'info' | 'warning' | 'danger' | 'success';

/** Tinted status message for errors, warnings and confirmations inside a screen. */
export function InlineMessage({ tone, title, message, actionTitle, onAction, style }: {
  tone: Tone; title?: string; message: string; actionTitle?: string; onAction?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const text = colors[`${tone}Text`];
  const urgent = tone === 'danger' || tone === 'warning';
  return <View accessibilityRole={urgent ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={[{ backgroundColor: colors[`${tone}Soft`], borderRadius: radii.control, borderCurve: 'continuous',
      paddingHorizontal: 14, paddingVertical: 12, gap: 8 }, style]}>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ paddingTop: 1 }}><Icon name={tone === 'success' ? 'checkCircle' : tone === 'info' ? 'info' : 'warning'} size={18} color={text} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        {!!title && <AppText variant="subhead" weight="600" style={{ color: text }}>{title}</AppText>}
        <AppText variant="footnote" selectable style={{ color: text }}>{message}</AppText>
      </View>
    </View>
    {!!actionTitle && !!onAction && <Button title={actionTitle} onPress={onAction} variant="plain" size="sm" style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />}
  </View>;
}
