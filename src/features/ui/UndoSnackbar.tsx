import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

/** Render as a sibling below scroll content; the tab navigator owns bottom insets. */
export function UndoSnackbar({ message, disabled, onUndo, onDismiss }: {
  message: string; disabled: boolean; onUndo: () => void; onDismiss: () => void;
}) {
  const { isDark } = useTheme();
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
  return <View testID="dose-undo-snackbar" style={{ marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 16,
    paddingVertical: 6, borderRadius: 16, backgroundColor: isDark ? '#E7EDF3' : '#071629',
    flexDirection: fontScale > 1.3 ? 'column' : 'row', alignItems: fontScale > 1.3 ? 'stretch' : 'center', gap: 8 }}>
    <Text accessibilityLiveRegion="polite" style={{ flex: fontScale > 1.3 ? undefined : 1, flexShrink: 1,
      fontSize: 14, color: isDark ? '#071629' : '#FFFFFF' }}>{message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Undo last dose change" accessibilityState={{ disabled }}
      disabled={disabled} onPress={onUndo} style={{ minWidth: 64, minHeight: 48, paddingHorizontal: 8,
        alignSelf: fontScale > 1.3 ? 'flex-end' : 'center', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontWeight: '700', color: isDark ? '#006B6B' : '#5EE5DC' }}>UNDO</Text>
    </Pressable>
  </View>;
}
