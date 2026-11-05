import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';
import type { SegmentedControlProps } from '@expo/ui/community/segmented-control';
import { useTheme } from '@/features/theme/ThemeContext';

/**
 * Material 3 single-choice segmented button row (Jetpack Compose) using theme tokens, so the selected
 * segment keeps readable contrast in light and dark. Same props the screens pass to the shared control.
 */
export function AppSegmentedControl({ values, selectedIndex, enabled = true, onChange, style }: SegmentedControlProps) {
  const { colors, isDark } = useTheme();
  const colorsConfig = {
    activeContainerColor: colors.accentSoft, activeContentColor: colors.accentText, activeBorderColor: colors.accent,
    inactiveContainerColor: 'transparent', inactiveContentColor: colors.label, inactiveBorderColor: colors.separator,
  };
  return <Host matchContents={{ vertical: true }} colorScheme={isDark ? 'dark' : 'light'} style={style}>
    <SingleChoiceSegmentedButtonRow>
      {(values ?? []).map((label, index) => <SegmentedButton key={label} selected={index === selectedIndex} enabled={enabled} colors={colorsConfig}
        onClick={() => onChange?.({ nativeEvent: { selectedSegmentIndex: index, value: label } })}>
        <SegmentedButton.Label><Text>{label}</Text></SegmentedButton.Label>
      </SegmentedButton>)}
    </SingleChoiceSegmentedButtonRow>
  </Host>;
}
