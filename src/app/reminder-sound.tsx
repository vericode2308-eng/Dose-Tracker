import { Feather } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canChangeReminderChannel, openNotificationSettings, reconcileReminders, scheduleTestReminder } from '@/notificationManager';
import { DEFAULT_SETTINGS, readSettings, writeSettings, type SettingsPreferences } from '@/features/settings/storage';

const OPTIONS: { value: SettingsPreferences['reminderSound']; label: string }[] = [
  { value: 'default', label: 'Phone default' }, { value: 'gentle', label: 'Gentle chime' },
  { value: 'clear', label: 'Clear chime' }, { value: 'silent', label: 'Silent' },
];
export default function ReminderSoundScreen() {
  const [prefs, setPrefs] = useState(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const gentle = useAudioPlayer(require('../../assets/sounds/gentle.wav'));
  const clear = useAudioPlayer(require('../../assets/sounds/clear.wav'));
  useEffect(() => { void readSettings().then(setPrefs).catch(() => Alert.alert('Settings unavailable', 'Reopen this screen and try again.')); }, []);
  async function change(patch: Partial<SettingsPreferences>) {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await canChangeReminderChannel())) {
        Alert.alert('Android notification settings', 'Android has disabled or changed medication reminder alerts. Review this app’s system notification settings before changing sound or vibration.', [
          { text: 'Cancel' }, { text: 'Open settings', onPress: () => void openNotificationSettings() },
        ]); return;
      }
      const next = { ...prefs, ...patch };
      await writeSettings(next);
      setPrefs(next);
      await reconcileReminders();
    } catch { Alert.alert('Could not update reminder alert', 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function preview(value: SettingsPreferences['reminderSound']) {
    if (value === 'silent') return;
    if (value === 'default') {
      try { Alert.alert('Phone default sound', await scheduleTestReminder('default')); }
      catch (error) { Alert.alert('Test unavailable', error instanceof Error ? error.message : 'Could not schedule a test reminder.'); }
      return;
    }
    const player = value === 'gentle' ? gentle : clear;
    await player.seekTo(0);
    player.play();
  }
  return <SafeAreaView className="flex-1 bg-[#FBF8F3]" edges={['top']}><View className="mx-auto w-full max-w-[440px] px-5">
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Settings" onPress={() => router.back()} className="mt-3 h-12 w-12 items-center justify-center"><Feather name="arrow-left" size={24} color="#102238" /></Pressable>
    <Text accessibilityRole="header" className="mt-5 text-[27px] font-bold text-[#102238]">Sound & vibration</Text>
    <Text className="mt-2 text-[15px] leading-6 text-[#536073]">Choose a reminder sound, then use Test reminder in Settings to hear it as a real notification. Android notification channel controls have the final say.</Text>
    <View className="mt-6 gap-2">{OPTIONS.map(option => <View key={option.value} className="min-h-[64px] flex-row items-center rounded-[18px] bg-white px-4"><Pressable accessibilityRole="radio" accessibilityState={{ checked: prefs.reminderSound === option.value, disabled: busy }} onPress={() => void change({ reminderSound: option.value })} className="min-h-[52px] flex-1 flex-row items-center gap-3"><Feather name={prefs.reminderSound === option.value ? 'check-circle' : 'circle'} size={22} color="#087E80" /><Text className="text-[15px] text-[#102238]">{option.label}</Text></Pressable>{option.value !== 'silent' && <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${option.label}`} onPress={() => void preview(option.value)} className="min-h-[48px] min-w-[72px] items-center justify-center"><Text className="font-semibold text-[#087E80]">Preview</Text></Pressable>}</View>)}</View>
    <View className="mt-5 min-h-[72px] flex-row items-center justify-between rounded-[18px] bg-white px-4"><View><Text className="text-[16px] font-semibold text-[#102238]">Vibration</Text><Text className="mt-1 text-[13px] text-[#536073]">Vibrate for medication reminders</Text></View><Switch accessibilityLabel="Reminder vibration" disabled={busy} value={prefs.vibrationEnabled} onValueChange={value => void change({ vibrationEnabled: value })} trackColor={{ false: '#9CA3AF', true: '#08B8BE' }} /></View>
    <Text className="mt-5 text-[13px] leading-5 text-[#536073]">Android may override your selection if you muted or changed this app’s notification channel. Existing Android channels keep their original alert behavior; each sound and vibration combination uses its own channel.</Text>
  </View></SafeAreaView>;
}
