import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/features/theme/ThemeContext';

// SDK 57 import path; SDK 58 renames it to 'expo-router/native-tabs'.
export function AppTabs() {
  const { colors } = useTheme();
  return <NativeTabs
    minimizeBehavior="never"
    tintColor={colors.accentText}
    // iOS 26 draws the Liquid Glass bar itself; earlier iOS and Android use the themed surface.
    backgroundColor={colors.tabBar}
    iconColor={{ default: colors.secondaryLabel, selected: colors.accentText }}
    indicatorColor={Platform.OS === 'android' ? colors.accentSoft : undefined}
    labelStyle={{ default: { color: colors.secondaryLabel }, selected: { color: colors.accentText } }}>
    <NativeTabs.Trigger name="(today)">
      <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} md="today" />
      <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="(history)">
      <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="(settings)">
      <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
  </NativeTabs>;
}
