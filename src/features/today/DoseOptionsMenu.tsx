import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DoseAction, ScheduledDose } from '@/database';
import { useTheme } from '@/features/theme/ThemeContext';

export function DoseOptionsMenu({ dose, onClose, onAction }: {
  dose: ScheduledDose; onClose: () => void; onAction: (dose: ScheduledDose, action: DoseAction) => void;
}) {
  const { colors } = useTheme();
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 justify-end bg-black/40">
      <Pressable className="absolute inset-0" accessibilityRole="button" accessibilityLabel="Dismiss dose options" onPress={onClose} />
      <SafeAreaView edges={['bottom']} accessibilityViewIsModal className="max-h-[85%] w-full max-w-[440px] self-center rounded-t-[28px]"
        style={{ backgroundColor: colors.surface }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text accessibilityRole="header" className="mb-1 text-xl font-semibold" style={{ color: colors.ink }}>{dose.medicine.name}</Text>
          <Text className="mb-3 text-sm" style={{ color: colors.secondary }}>{new Date(dose.scheduledAtMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {dose.status}</Text>
          {(['Taken', 'Skipped', 'Reset'] as const).filter(action => action !== dose.status).map(action =>
            <Pressable key={action} accessibilityRole="button" onPress={() => { onClose(); onAction(dose, action); }}
              className="min-h-12 justify-center rounded-2xl px-4 py-3 mb-2" style={{ backgroundColor: colors.pill }}>
              <Text className="text-base font-medium" style={{ color: colors.ink }}>{action === 'Reset' ? 'Reset to pending' : `Mark as ${action}`}</Text>
            </Pressable>)}
          <Pressable accessibilityRole="button" onPress={onClose} className="min-h-12 items-center justify-center px-4 py-3">
            <Text className="text-base font-semibold" style={{ color: colors.ink }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}
