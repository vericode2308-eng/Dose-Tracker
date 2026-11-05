import { Host, Switch } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { SwitchProps } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

/**
 * Material 3 switch (Jetpack Compose) with the same props the screens already pass to the React Native switch.
 * Colours come from theme tokens: accent track when on, neutral fill with an outline when off.
 */
export function AppSwitch({ value, onValueChange, disabled, accessibilityLabel, style }: SwitchProps) {
  const { colors } = useTheme();
  const checked = value === true;
  return <Host matchContents style={[{ alignSelf: 'center' }, style]}>
    <Switch value={checked} enabled={!disabled} onCheckedChange={next => onValueChange?.(next)}
      modifiers={accessibilityLabel ? [semantics({ contentDescription: accessibilityLabel })] : undefined}
      colors={{
        checkedTrackColor: colors.accent, checkedThumbColor: colors.onPrimary, checkedBorderColor: colors.accent,
        uncheckedTrackColor: colors.fill, uncheckedThumbColor: colors.secondaryLabel, uncheckedBorderColor: colors.tertiaryLabel,
      }} />
  </Host>;
}
