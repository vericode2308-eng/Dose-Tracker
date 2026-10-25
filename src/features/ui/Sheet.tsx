import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { radii } from '../../../theme';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from './AppText';
import { GlassSheetSurface } from './GlassSheetSurface';
import { IconButton } from './IconButton';

/**
 * Shared bottom sheet: grabber, title, close button, scrollable body. Liquid Glass on iOS 26+
 * via GlassSheetSurface, a solid elevated surface elsewhere. One implementation so every sheet
 * looks and dismisses the same way.
 */
export function Sheet({ visible, title, onClose, closeDisabled = false, children }: {
  visible: boolean; title: string; onClose: () => void; closeDisabled?: boolean; children: ReactNode;
}) {
  const { colors } = useTheme();
  const close = () => { if (!closeDisabled) onClose(); };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={close} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
      <GlassSheetSurface edges={['bottom']} accessibilityViewIsModal tint={colors.surfaceElevated}
        style={{ maxHeight: '88%', width: '100%', maxWidth: 440, alignSelf: 'center', overflow: 'hidden',
          borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, borderCurve: 'continuous' }}>
        <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 6, backgroundColor: colors.tertiaryLabel, opacity: 0.5 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20, paddingRight: 12, paddingTop: 6 }}>
          <AppText accessibilityRole="header" variant="title3" style={{ flex: 1 }}>{title}</AppText>
          <IconButton icon="close" accessibilityLabel="Close" filled disabled={closeDisabled} onPress={close} color={colors.secondaryLabel} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 12 }}>
          {children}
        </ScrollView>
      </GlassSheetSurface>
    </KeyboardAvoidingView>
  </Modal>;
}
