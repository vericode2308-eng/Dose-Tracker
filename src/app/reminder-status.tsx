import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReminderDiagnostics, openExactAlarmSettings, openNotificationSettings, reconcileReminders } from '@/notificationManager';
import type { ReminderDiagnostics } from '@/notificationManager';
import { useTheme } from '@/features/theme/ThemeContext';

export default function ReminderStatusScreen() {
  const { colors, isDark } = useTheme();
  const [status, setStatus] = useState<ReminderDiagnostics | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { setStatus(await getReminderDiagnostics()); setError(''); }
    catch { setError('Reminder status could not be checked. Try again.'); }
    finally { setBusy(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  const active = !!status?.enabled && !!status.allowed && status.scheduled > 0 && (Platform.OS !== 'android' || status.exact === true);
  return <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}><ScrollView contentContainerClassName="mx-auto w-full max-w-[440px] px-5 pb-10">
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Settings" onPress={() => router.back()} className="mt-3 h-12 w-12 items-center justify-center"><Feather name="arrow-left" size={24} color={colors.ink} /></Pressable>
    <Text accessibilityRole="header" className="mt-5 text-[27px] font-bold" style={{ color: colors.ink }}>Reminder status</Text>
    <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: colors.surface }}><View className="flex-row items-center gap-3"><View className="h-4 w-4 rounded-full" style={{ backgroundColor: status?.requested === 0 ? colors.secondary : active ? '#159447' : '#D64545' }} /><Text className="text-[19px] font-bold" style={{ color: colors.ink }}>{status?.requested === 0 ? 'Reminders optional' : active ? 'Active reminders' : 'No active reminders'}</Text></View>
      <Text className="mt-3 text-[14px] leading-6" style={{ color: colors.secondary }}>{status ? status.requested === 0 ? 'No medicine has dose reminders turned on. Dose tracking still works as usual.' : !status.enabled ? 'Reminders are switched off in DoseTracker Settings.' : !status.allowed ? `${status.message} Open notification settings below to restore access.` : status.scheduled === 0 ? 'No medication reminders are currently scheduled. Check the reminder switch on the medicine detail screen.' : Platform.OS === 'android' && status.exact !== true ? `${status.scheduled} reminders are scheduled, but exact-alarm access needs attention for precise timing.` : `${status.scheduled} medication notification${status.scheduled === 1 ? '' : 's'} scheduled with the device.` : busy ? 'Checking Android notification access and scheduled reminders…' : error}</Text>
      {status?.requested !== 0 && status?.exact === false && <Text className="mt-2 text-[13px] leading-5 text-[#9A3412]">Exact-alarm access is off. Android may delay reminders during sleep.</Text>}
      {status?.ringingAvailable === false && <Text className="mt-2 text-[13px] leading-5 text-[#9A3412]">Repeating sound needs the updated Android build and Android 8 or later. These reminders currently use a single alert.</Text>}
    </View>
    <Text className="mt-7 text-[18px] font-bold" style={{ color: colors.ink }}>Known issues · past 7 days</Text>
    <Text className="mt-2 text-[13px] leading-5" style={{ color: colors.secondary }}>These are problems DoseTracker observed while checking permissions or scheduling. Android does not provide a dependable receipt for every local reminder, so this list cannot prove that a notification was delivered or missed during deep sleep.</Text>
    {status?.issues.length ? <View className="mt-4 gap-2">{status.issues.map(issue => <View key={`${issue.code}-${issue.lastSeenMs}`} className="rounded-[18px] p-4" style={{ backgroundColor: colors.surface }}><Text className="text-[14px] font-semibold" style={{ color: colors.ink }}>{issue.message}</Text><Text className="mt-1 text-[12px]" style={{ color: colors.secondary }}>{new Date(issue.lastSeenMs).toLocaleString()}{issue.occurrences > 1 ? ` · seen ${issue.occurrences} times` : ''}</Text></View>)}</View> : <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: colors.surface }}><Text className="text-[14px]" style={{ color: colors.secondary }}>No known setup or scheduling issues recorded.</Text></View>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void (async () => { setBusy(true); try { await reconcileReminders(); await refresh(); } catch { setError('Could not retry reminder setup.'); } finally { setBusy(false); } })()} className="mt-6 min-h-[48px] items-center justify-center rounded-full" style={{ backgroundColor: isDark ? colors.accent : '#0B2540' }}><Text className="font-semibold text-white">Retry setup and refresh</Text></Pressable>
    {Platform.OS === 'android' && !!status?.requested && status?.exact === false && <Pressable accessibilityRole="button" onPress={() => void openExactAlarmSettings().catch(() => setError('Alarms & reminders settings could not be opened.'))} className="mt-3 min-h-[48px] items-center justify-center"><Text className="font-semibold" style={{ color: colors.accent }}>Allow alarms & reminders</Text></Pressable>}
    <Pressable accessibilityRole="button" onPress={() => void openNotificationSettings().catch(() => setError('Notification settings could not be opened.'))} className="mt-3 min-h-[48px] items-center justify-center"><Text className="font-semibold" style={{ color: colors.accent }}>Open DoseTracker notification settings</Text></Pressable>
    {!!error && !!status && <Text className="mt-2 text-center text-[13px] text-[#9A3412]">{error}</Text>}
  </ScrollView></SafeAreaView>;
}
