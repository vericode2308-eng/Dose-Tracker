import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canChangeReminderChannel, openNotificationSettings, reconcileReminders } from '@/notificationManager';
import { DEFAULT_SETTINGS, readSettings, writeSettings, type SettingsPreferences } from '@/features/settings/storage';
import { useTheme } from '@/features/theme/ThemeContext';

const OPTIONS: { value: SettingsPreferences['notificationPrivacy']; title: string; detail: string }[] = [
  { value: 'show', title: 'Show content', detail: 'Show the medicine name and dose in notifications. Anyone viewing your lock screen may see them if Android allows previews.' },
  { value: 'hide', title: 'Hide sensitive content', detail: 'Show a medication reminder with no medicine or dose details.' },
  { value: 'none', title: 'No info', detail: 'Show only a generic DoseTracker notification with no medication label or dose details.' },
];
export default function NotificationPrivacyScreen() {
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void readSettings().then(setPrefs).catch(() => Alert.alert('Settings unavailable', 'Reopen this screen and try again.')); }, []);
  async function choose(value: SettingsPreferences['notificationPrivacy']) {
    if (busy || value === prefs.notificationPrivacy) return;
    setBusy(true);
    let saved = false;
    try {
      if (!(await canChangeReminderChannel())) {
        Alert.alert('Android notification settings', 'Android has disabled or changed medication reminder alerts. Review this app’s system notification settings before changing this option.', [
          { text: 'Cancel' }, { text: 'Open settings', onPress: () => void openNotificationSettings() },
        ]); return;
      }
      const next = { ...prefs, notificationPrivacy: value };
      await writeSettings(next);
      saved = true;
      setPrefs(next);
      await reconcileReminders();
      router.back();
    } catch {
      Alert.alert(saved ? 'Privacy cleanup needs a retry' : 'Could not update privacy', saved
        ? 'Your preference was saved, but existing notifications could not be fully refreshed. Open Reminder status in Settings and retry.'
        : 'Please try again.');
    }
    finally { setBusy(false); }
  }
  return <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}><View className="mx-auto w-full max-w-[440px] px-5">
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Settings" onPress={() => router.back()} className="mt-3 h-12 w-12 items-center justify-center"><Feather name="arrow-left" size={24} color={colors.ink} /></Pressable>
    <Text accessibilityRole="header" className="mt-5 text-[27px] font-bold" style={{ color: colors.ink }}>Notification privacy</Text>
    <Text className="mt-2 text-[15px] leading-6" style={{ color: colors.secondary }}>Choose what DoseTracker puts in each reminder. Android lock-screen and app notification preferences may hide more information.</Text>
    <View className="mt-6 gap-3">{OPTIONS.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: prefs.notificationPrivacy === option.value, disabled: busy }} onPress={() => void choose(option.value)} className="min-h-[96px] flex-row items-start gap-3 rounded-[20px] p-4" style={{ backgroundColor: colors.surface }}><Feather name={prefs.notificationPrivacy === option.value ? 'check-circle' : 'circle'} size={23} color={colors.accent} /><View className="flex-1"><Text className="text-[16px] font-semibold" style={{ color: colors.ink }}>{option.title}</Text><Text className="mt-1 text-[13px] leading-5" style={{ color: colors.secondary }}>{option.detail}</Text></View></Pressable>)}</View>
    <Pressable accessibilityRole="button" onPress={() => void openNotificationSettings()} className="mt-7 min-h-[48px] justify-center"><Text className="text-center font-semibold" style={{ color: colors.accent }}>Open Android notification settings</Text></Pressable>
  </View></SafeAreaView>;
}
