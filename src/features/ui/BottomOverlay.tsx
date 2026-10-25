import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Pins snackbars and toasts to the bottom of a tab screen, above the tab bar. On iOS the
 * screen runs under the native tab bar, whose height cannot be measured, but the native
 * SafeAreaView's own inset includes it. Android tab screens already end above the bar.
 */
export function BottomOverlay({ children }: { children: ReactNode }) {
  return <SafeAreaView edges={Platform.OS === 'ios' ? ['bottom'] : []} pointerEvents="box-none"
    style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
    {children}
  </SafeAreaView>;
}
