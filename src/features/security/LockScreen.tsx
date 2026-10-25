import { View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';
import { Button } from '@/features/ui/Button';
import { Icon } from '@/features/ui/Icon';
import { radii } from '../../../theme';

/** Presentation only; AppLock decides when this shows and what the button does. */
export function LockScreen({ status, onPress }: { status: 'loading' | 'locked' | 'error'; onPress: () => void }) {
  const { colors } = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12, backgroundColor: colors.background }}>
    <View style={{ width: 72, height: 72, borderRadius: radii.card, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
      backgroundColor: status === 'error' ? colors.warningSoft : colors.accentSoft }}>
      <Icon name={status === 'error' ? 'warning' : 'lock'} size={32} color={status === 'error' ? colors.warningText : colors.accentText} />
    </View>
    <AppText accessibilityRole="header" variant="title2" style={{ textAlign: 'center' }}>{status === 'error' ? 'App lock unavailable' : status === 'loading' ? 'Opening DoseTracker…' : 'DoseTracker is locked'}</AppText>
    {status !== 'loading' && <>
      <AppText variant="callout" tone="secondary" style={{ textAlign: 'center', maxWidth: 320 }}>{status === 'error' ? 'The secure app-lock setting could not be read. Try again after unlocking your phone.' : 'Use your phone’s fingerprint, face, or screen lock to continue.'}</AppText>
      <Button title={status === 'error' ? 'Try Again' : 'Unlock'} onPress={onPress} style={{ marginTop: 16, minWidth: 200 }} />
    </>}
  </View>;
}
