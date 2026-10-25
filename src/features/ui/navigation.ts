import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from 'expo-router/native-stack';
import { useTheme } from '@/features/theme/ThemeContext';

/** iOS 26 draws Liquid Glass and scroll-edge effects for a transparent header by itself. */
export const isIOS26 = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26;

/**
 * Native stack header styling shared by every tab stack.
 * - iOS 26+: transparent large-title header; the system adds glass and the scroll edge effect.
 * - iOS 18 and earlier: transparent large title over the screen background, system blur once scrolled.
 * - Android: Material top app bar on the screen background.
 * Screens put a ScrollView/FlatList first with contentInsetAdjustmentBehavior="automatic".
 */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const { colors, isDark } = useTheme();
  const ios = Platform.OS === 'ios';
  return {
    headerShown: true,
    headerLargeTitleEnabled: ios,
    headerTransparent: ios,
    headerBlurEffect: ios && !isIOS26 ? (isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight') : undefined,
    headerLargeStyle: { backgroundColor: ios ? (isIOS26 ? 'transparent' : colors.background) : colors.background },
    headerStyle: ios ? undefined : { backgroundColor: colors.background },
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerTintColor: colors.accentText,
    headerTitleStyle: { color: colors.label },
    headerLargeTitleStyle: { color: colors.label },
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: colors.background },
  };
}
