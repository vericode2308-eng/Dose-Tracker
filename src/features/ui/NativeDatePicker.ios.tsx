import { Host } from '@expo/ui';
import { DatePicker } from '@expo/ui/swift-ui';
import { accessibilityLabel, datePickerStyle, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/features/theme/ThemeContext';

/** iOS renders SwiftUI's compact date/time picker inline; other platforms keep their own pickers. */
export const hasInlineNativeDatePicker = true;

export function NativeDatePicker({ mode, value, onChange, minimumDate, maximumDate, label }: {
  mode: 'date' | 'time'; value: Date; onChange: (date: Date) => void; minimumDate?: Date; maximumDate?: Date; label: string;
}) {
  const { colors } = useTheme();
  return <Host matchContents>
    <DatePicker selection={value} displayedComponents={mode === 'time' ? ['hourAndMinute'] : ['date']}
      range={minimumDate || maximumDate ? { start: minimumDate, end: maximumDate } : undefined}
      onDateChange={onChange}
      modifiers={[datePickerStyle('compact'), labelsHidden(), tint(colors.accent), accessibilityLabel(label)]} />
  </Host>;
}
