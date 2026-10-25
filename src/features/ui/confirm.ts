import { Alert, Platform } from 'react-native';
import { hapticImpactMedium } from './haptics';

/**
 * Native confirmation: a system alert with Cancel and the action (red when destructive) on iOS
 * and Android. Resolves true only when the action is chosen.
 */
export function confirmDestructive({ title, message, confirmLabel, cancelLabel = 'Cancel', destructive = true }: {
  title: string; message?: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof globalThis.confirm === 'function' && globalThis.confirm([title, message].filter(Boolean).join('\n\n')));
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => {
        if (destructive) void hapticImpactMedium();
        resolve(true);
      } },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
