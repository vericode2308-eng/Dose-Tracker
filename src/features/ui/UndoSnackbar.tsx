import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, Text, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/features/theme/ThemeContext';
import { toastEntering, toastExiting } from './motion';

/** Render as a sibling below scroll content; the tab navigator owns bottom insets. */
export function UndoSnackbar({ message, disabled, onUndo, onDismiss }: {
  message: string; disabled: boolean; onUndo: () => void; onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(`${message}. Undo available.`);
  }, [message]);
  useEffect(() => {
    if (disabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const duration = Platform.OS === 'android'
      ? AccessibilityInfo.getRecommendedTimeoutMillis(7000).catch(() => 7000)
      : Promise.resolve(7000);
    void duration.then(ms => { if (active) timer = setTimeout(onDismiss, Math.max(7000, ms)); });
    return () => { active = false; clearTimeout(timer); };
  }, [disabled, onDismiss]);
  const stacked = fontScale > 1.3;
  return <Animated.View testID="dose-undo-snackbar" entering={toastEntering} exiting={toastExiting} style={{ marginHorizontal: 16, marginBottom: 8, paddingLeft: 16, paddingRight: 8,
    paddingVertical: 4, borderRadius: 16, borderCurve: 'continuous', backgroundColor: colors.inverseSurface, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
    flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', gap: 8 }}>
    <Text accessibilityLiveRegion="polite" style={{ flex: stacked ? undefined : 1, flexShrink: 1, paddingTop: stacked ? 10 : 0,
      fontSize: 15, lineHeight: 20, color: colors.inverseLabel }}>{message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Undo last dose change" accessibilityState={{ disabled }}
      disabled={disabled} onPress={onUndo} style={({ pressed }) => ({ minWidth: 64, minHeight: 48, paddingHorizontal: 10,
        alignSelf: stacked ? 'flex-end' : 'center', justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.inverseAccent }}>Undo</Text>
    </Pressable>
  </Animated.View>;
}
