import { Switch, Text, View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';
import type { DiagnosticsPreferences } from './diagnostics';

export const DIAGNOSTICS_DISCLOSURE = 'Choose which optional reports DoseTracker may send to Sentry for VeriCode to investigate faults and slow operations. Reports include time, app version, platform and testing or production environment. Errors include code line numbers. Logs include fixed operation names and success/failure; traces include operation timing and random report identifiers. Only database initialization and reminder reconciliation are logged or timed. Medicine and profile details, error-message text, console output, request contents, device identifiers and screenshots are excluded. Sentry receives your IP address through the connection. Tracking and reminders work with all choices off. Turn reporting off here anytime; reports already sent are not deleted by disabling it or erasing local data.';

export function DiagnosticsChoices({ value, onChange, disabled = false }: {
  value: DiagnosticsPreferences; onChange: (value: DiagnosticsPreferences) => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  return <View>
    {([['errors', 'Error reports'], ['logs', 'Diagnostic logs'], ['traces', 'Performance traces']] as const).map(([key, label]) =>
      <View key={key} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: 12 }}>
        <Text style={{ flex: 1, color: colors.ink, fontSize: 16 }}>{label}</Text>
        <Switch accessibilityLabel={label} disabled={disabled} value={value[key]} onValueChange={enabled => onChange({ ...value, [key]: enabled })} />
      </View>)}
  </View>;
}
