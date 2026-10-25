import { publicErrorMessage } from '@/features/security/errors';
import { Feather } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { canChangeReminderChannel, isAlarmRingingAvailable, openNotificationSettings, reconcileReminders, requestAlarmRingingAccess, scheduleTestReminder } from '@/notificationManager';
import { DEFAULT_SETTINGS, readSettings, writeSettings, type SettingsPreferences } from '@/features/settings/storage';
import { useTheme } from '@/features/theme/ThemeContext';

const OPTIONS: { value: SettingsPreferences['reminderSound']; label: string }[] = [
  { value: 'default', label: 'Phone default' }, { value: 'gentle', label: 'Gentle chime' },
  { value: 'clear', label: 'Clear chime' }, { value: 'silent', label: 'Silent' },
];
export default function ReminderSoundScreen() {
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const gentle = useAudioPlayer(require('../../../assets/sounds/gentle.wav'));
  const clear = useAudioPlayer(require('../../../assets/sounds/clear.wav'));
  useEffect(() => { void readSettings().then(value => { setPrefs(value); setLoaded(true); }).catch(() => Alert.alert('Settings unavailable', 'Reopen this screen and try again.')); }, []);
  async function change(patch: Partial<SettingsPreferences>) {
    if (busy || !loaded) return;
    setBusy(true);
    try {
      if (patch.reminderRinging && !isAlarmRingingAvailable()) {
        Alert.alert(Platform.OS === 'ios' ? 'Update required' : 'Updated Android app required', Platform.OS === 'ios'
          ? 'Ringing alarms need iOS 26.1 or later and the updated app.'
          : 'Install the updated Android build to enable repeating sound. Android 8 or later is required.');
        return;
      }
      if (patch.reminderRinging && Platform.OS === 'ios' && !(await requestAlarmRingingAccess())) {
        Alert.alert('Alarm access is off', 'Allow Alarms for DoseTracker in iPhone Settings to ring until you stop it.', [
          { text: 'Cancel' }, { text: 'Open settings', onPress: () => void openNotificationSettings() },
        ]); return;
      }
      if (('reminderSound' in patch || 'vibrationEnabled' in patch) && !(await canChangeReminderChannel())) {
        Alert.alert('Android notification settings', 'Android has disabled or changed medication reminder alerts. Review this app’s system notification settings before changing sound or vibration.', [
          { text: 'Cancel' }, { text: 'Open settings', onPress: () => void openNotificationSettings() },
        ]); return;
      }
      const next = { ...prefs, ...patch };
      await writeSettings(next);
      setPrefs(next);
      const result = await reconcileReminders();
      if (!result.allowed || result.issues.length) Alert.alert('Preference saved', result.issues.length
        ? 'Open Reminder status in Settings to retry reminder setup.' : result.message);
    } catch { Alert.alert('Could not update reminder alert', 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function preview(value: SettingsPreferences['reminderSound']) {
    if (value === 'silent') return;
    if (value === 'default') {
      try { Alert.alert('Phone default sound', await scheduleTestReminder('default')); }
      catch (error) { Alert.alert('Test unavailable', publicErrorMessage(error, 'Could not schedule a test reminder.')); }
      return;
    }
    const player = value === 'gentle' ? gentle : clear;
    await player.seekTo(0);
    player.play();
  }
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32 }}><View className="mx-auto w-full max-w-[440px] px-5 pt-2">
    <Text className="mt-2 text-[15px] leading-6" style={{ color: colors.secondary }}>Choose how reminders sound.</Text>
    {(Platform.OS === 'android' || Platform.OS === 'ios') && <View className="mt-5 rounded-[18px] p-4" style={{ backgroundColor: colors.surface }}>
      <View className="flex-row items-center gap-3"><View className="flex-1"><Text className="text-[16px] font-semibold" style={{ color: colors.ink }}>Ring repeatedly</Text><Text className="mt-1 text-[13px]" style={{ color: colors.secondary }}>{Platform.OS === 'ios' ? 'Shows an alarm until you stop it' : 'Rings for up to 2 minutes'}</Text></View><Switch accessibilityLabel="Ring reminders repeatedly" disabled={busy} value={prefs.reminderRinging ?? false} onValueChange={value => void change({ reminderRinging: value })} trackColor={{ false: '#9CA3AF', true: '#08B8BE' }} /></View>
      <Text className="mt-3 text-[13px] leading-5" style={{ color: colors.secondary }}>{Platform.OS === 'ios' ? 'Tap Stop or Open to silence. Your dose stays pending until you mark it.' : 'Tap Stop ringing to silence. Your dose stays pending.'}</Text>
      {prefs.reminderSound === 'silent' && <Text className="mt-2 text-[13px] leading-5" style={{ color: colors.secondary }}>Choose a sound to enable ringing.</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void scheduleTestReminder().then(message => Alert.alert('Test reminder', message)).catch(error => Alert.alert('Test unavailable', publicErrorMessage(error, 'Could not schedule a test reminder.'))); }} className="mt-2 min-h-[48px] justify-center"><Text className="font-semibold" style={{ color: colors.accentText }}>Test reminder in 10 seconds</Text></Pressable>
    </View>}
    <View className="mt-6 gap-2">{OPTIONS.map(option => <View key={option.value} className="min-h-[64px] flex-row items-center rounded-[18px] px-4" style={{ backgroundColor: colors.surface }}><Pressable accessibilityRole="radio" accessibilityState={{ checked: prefs.reminderSound === option.value, disabled: busy }} onPress={() => void change({ reminderSound: option.value })} className="min-h-[52px] flex-1 flex-row items-center gap-3"><Feather name={prefs.reminderSound === option.value ? 'check-circle' : 'circle'} size={22} color={colors.accent} /><Text className="text-[15px]" style={{ color: colors.ink }}>{option.label}</Text></Pressable>{option.value !== 'silent' && <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${option.label}`} onPress={() => void preview(option.value)} className="min-h-[48px] min-w-[72px] items-center justify-center"><Text className="font-semibold" style={{ color: colors.accentText }}>Preview</Text></Pressable>}</View>)}</View>
    <View className="mt-5 min-h-[72px] flex-row items-center justify-between rounded-[18px] px-4" style={{ backgroundColor: colors.surface }}><View><Text className="text-[16px] font-semibold" style={{ color: colors.ink }}>Vibration</Text><Text className="mt-1 text-[13px]" style={{ color: colors.secondary }}>Vibrate for medication reminders</Text></View><Switch accessibilityLabel="Reminder vibration" disabled={busy} value={prefs.vibrationEnabled} onValueChange={value => void change({ vibrationEnabled: value })} trackColor={{ false: '#9CA3AF', true: '#08B8BE' }} /></View>
    <Text className="mt-5 text-[13px] leading-5" style={{ color: colors.secondary }}>Uses your phone’s notification volume and settings.</Text>
  </View></ScrollView>;
}
