import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Host, ModalBottomSheet, RNHostView, type ModalBottomSheetRef } from '@expo/ui/jetpack-compose';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from './AppText';
import { keyboardScrollProps } from './keyboard';

/**
 * Android bottom sheet: a Material 3 ModalBottomSheet (Jetpack Compose) with its own drag handle, swipe-to-dismiss,
 * scrim and Back handling. The React Native content is hosted inside it. Same props as the shared Sheet.
 * While `closeDisabled` (a save is running) Back and scrim taps do nothing; it opens fully expanded.
 */
export function Sheet({ visible, title, onClose, closeDisabled = false, children }: {
  visible: boolean; title: string; onClose: () => void; closeDisabled?: boolean; children: ReactNode;
}) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible) return;
    let cancelled = false;
    void sheetRef.current?.hide().then(() => { if (!cancelled) setMounted(false); });
    return () => { cancelled = true; };
  }, [visible]);
  if (!mounted) return null;
  return <Host style={StyleSheet.absoluteFill} pointerEvents="none">
    <ModalBottomSheet ref={sheetRef} onDismissRequest={() => { if (!closeDisabled) onClose(); }} skipPartiallyExpanded
      properties={{ shouldDismissOnBackPress: !closeDisabled, shouldDismissOnClickOutside: !closeDisabled }}
      containerColor={colors.surfaceElevated} contentColor={colors.label} scrimColor={colors.overlay}>
      <RNHostView matchContents={{ vertical: true }}>
        <View style={{ width: '100%', paddingBottom: 12 }}>
          <AppText accessibilityRole="header" variant="title3" style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 8 }}>{title}</AppText>
          <ScrollView {...keyboardScrollProps} style={{ maxHeight: height * 0.7 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 12 }}>
            {children}
          </ScrollView>
        </View>
      </RNHostView>
    </ModalBottomSheet>
  </Host>;
}
