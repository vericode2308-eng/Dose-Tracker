import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, Switch, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MEDICATION_CHANNEL, getReminderStatus, openExactAlarmSettings, reconcileReminders, eraseMedicineDataWithReminders } from '@/notificationManager';
import { useOnboarding } from '@/features/onboarding/context';
import { useProfiles } from '@/features/profiles/context';
import { exportPreferences, importPreferences } from '@/features/settings/backup';
import { clearSettings, DEFAULT_SETTINGS, readSettings, type SettingsPreferences, writeSettings } from '@/features/settings/storage';
import { useAppLock } from '@/features/security/AppLock';

type Menu = 'snooze' | 'privacy' | 'sound' | 'backup' | 'restore' | 'erase' | 'about' | null;
const NAVY = '#0B2540';
const MUTED = '#536073';

export default function SettingsHomeScreen() {
  const { reset } = useOnboarding();
  const systemScheme = useColorScheme();
  const [prefs, setPrefs] = useState(DEFAULT_SETTINGS);
  const [menu, setMenu] = useState<Menu>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reminderStatus, setReminderStatus] = useState('Check status');
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemScheme === 'dark');
  const surface = dark ? '#1F2937' : '#FFFFFF';
  const background = dark ? '#0B1220' : '#FBF8F3';
  const ink = dark ? '#F8FAFC' : '#0F172A';
  const secondary = dark ? '#B6C1CF' : MUTED;
  const pill = dark ? '#374151' : '#F2F3F5';
  const { currentProfile: profile, showSwitcher } = useProfiles();
  const { enabled: appLockEnabled } = useAppLock();

  useEffect(() => {
    let active = true;
    readSettings().then(value => { if (active) { setPrefs(value); setLoaded(true); } }).catch(() => { if (active) setMessage('Saved settings could not be loaded. Reopen Settings to try again.'); });
    return () => { active = false; };
  }, []);

  async function update(patch: Partial<SettingsPreferences>) {
    if (!loaded || busy) return;
    setBusy(true);
    const next = { ...prefs, ...patch };
    try {
      await writeSettings(next);
      setPrefs(next);
      setMenu(null);
      if ('remindersEnabled' in patch || 'notificationPrivacy' in patch || 'soundAndVibration' in patch) {
        try { const result = await reconcileReminders(); setMessage(result.issues[0] || result.message); }
        catch { setMessage('Preference saved. Reminder setup failed; open Reminder status to retry.'); }
      }
    } catch { setMessage('This setting could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  async function checkReminderStatus() {
    setBusy(true);
    try {
      await getReminderStatus(true);
      const result = await reconcileReminders();
      setReminderStatus(result.allowed ? Platform.OS === 'android' && result.exact !== true ? 'Check alarm access' : 'Enabled' : 'Off');
      setMessage(result.issues[0] || result.message);
    } catch { setReminderStatus('Unavailable'); setMessage('Reminder setup failed. Please retry.'); }
    finally { setBusy(false); }
  }

  function requestExactAccess() {
    Alert.alert('Allow alarms & reminders', 'DoseTracker needs this Android access to request alarms while your phone is asleep. Inexact reminders can be delayed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open settings', onPress: () => { void openExactAlarmSettings().catch(() => setMessage('Install a new Android development build to enable exact-alarm access.')); } },
    ]);
  }

  async function testReminder() {
    if (Platform.OS === 'web') { setMessage('Test reminders require the Android or iOS app.'); return; }
    if (!prefs.remindersEnabled) { setMessage('Enable reminders before sending a test.'); return; }
    setBusy(true);
    try {
      const Notifications = await import('expo-notifications');
      const status = await getReminderStatus(true);
      if (!status.allowed) { setMessage(status.message); return; }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'DoseTracker test reminder', body: 'Your reminder notifications are working.', sound: prefs.soundAndVibration ? 'default' : false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: MEDICATION_CHANNEL },
      });
      setMessage(Platform.OS === 'android' && status.exact !== true ? 'Test scheduled, but delivery may be delayed until Alarms & reminders access is enabled.' : 'Test reminder scheduled for 3 seconds from now.');
    } catch { setMessage('The test reminder could not be scheduled.'); }
    finally { setBusy(false); }
  }

  async function exportBackup() {
    setBusy(true);
    try {
      await exportPreferences(prefs);
      setMenu(null);
    } catch { setMessage('The preferences file could not be exported.'); }
    finally { setBusy(false); }
  }

  async function restoreBackup() {
    setBusy(true);
    try {
      const restored = await importPreferences();
      if (!restored) return;
      await writeSettings(restored);
      setPrefs(restored);
      setMenu(null);
      try { await reconcileReminders(); setMessage('Preferences restored from the selected file.'); }
      catch { setMessage('Preferences restored. Reminder setup failed; open Reminder status to retry.'); }
    } catch { setMessage('That preferences file is invalid or could not be restored.'); }
    finally { setBusy(false); }
  }

  async function eraseData() {
    setBusy(true);
    try {
      await eraseMedicineDataWithReminders();
      await clearSettings();
      await reset();
      setPrefs(DEFAULT_SETTINGS);
      if (Platform.OS !== 'web') {
        const { Directory, File, Paths } = await import('expo-file-system');
        for (const entry of new Directory(Paths.document).list()) {
          if (entry instanceof File && /^profile-\d+\.(jpg|jpeg|png|webp|heic)$/i.test(entry.name)) entry.delete();
        }
      }
      setMenu(null);
      router.replace('/welcome');
    } catch { setMessage('Erasure did not finish. Some data may already be removed. Please retry.'); }
    finally { setBusy(false); }
  }

  function row(label: string, value: string | undefined, action: () => void, danger = false) {
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}${value ? `, ${value}` : ''}`} disabled={busy || !loaded} onPress={action} className="min-h-[48px] flex-row items-center justify-between py-2 pl-[52px]">
      <Text className="flex-1 text-[15px]" style={{ color: danger ? '#EF4444' : ink, fontWeight: danger ? '600' : '400' }}>{label}</Text>
      {value && <Text className="mr-2 text-[14px]" style={{ color: secondary }}>{value}</Text>}
      <Feather name="chevron-right" size={20} color={danger ? '#EF4444' : ink} />
    </Pressable>;
  }

  function heading(icon: keyof typeof Feather.glyphMap, title: string, subtitle?: string) {
    return <View className="flex-1 flex-row items-center gap-4 pb-1">
      <View className="w-9 items-center"><Feather name={icon} size={27} color={ink} /></View>
      <View className="flex-1"><Text className="text-[17px] font-semibold" style={{ color: ink }}>{title}</Text>{subtitle && <Text className="mt-0.5 text-[13px]" style={{ color: secondary }}>{subtitle}</Text>}</View>
    </View>;
  }

  function option(label: string, selected: boolean, action: () => void) {
    return <Pressable key={label} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }} disabled={busy || !loaded} onPress={action} className="min-h-[48px] flex-row items-center justify-between rounded-2xl px-4" style={{ backgroundColor: selected ? NAVY : pill }}><Text className="text-[15px] font-medium" style={{ color: selected ? '#FFFFFF' : ink }}>{label}</Text>{selected && <Feather name="check" color="#FFFFFF" size={20} />}</Pressable>;
  }

  return <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: background }}>
    <ScrollView contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-[440px] self-center">
        <Text accessibilityRole="header" className="mb-4 mt-5 text-[28px] font-bold" style={{ color: ink }}>Settings</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Switch profile" onPress={showSwitcher} className="mb-4 min-h-[62px] flex-row items-center gap-3"><Feather name="users" size={30} color={ink} /><View className="min-w-0 flex-1"><Text className="text-[18px] font-semibold" style={{ color: ink }}>{profile?.name || 'Me'}</Text><Text style={{ color: secondary }}>Active profile</Text></View><Feather name="chevron-down" size={20} color={ink} /></Pressable>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}><Pressable accessibilityRole="button" onPress={showSwitcher} className="flex-row items-center gap-4">{heading('users', 'People & profiles', 'Switch, add, or manage profiles')}<Feather name="chevron-right" size={21} color={ink} /></Pressable></View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('sun', 'Appearance', 'Choose your theme')}<View className="mt-3 flex-row gap-2">{(['system', 'light', 'dark'] as const).map((theme) => <Pressable key={theme} accessibilityRole="radio" accessibilityLabel={`${theme} theme`} accessibilityState={{ checked: prefs.theme === theme }} disabled={busy || !loaded} onPress={() => void update({ theme })} className="min-h-[42px] flex-1 flex-row items-center justify-center gap-2 rounded-full px-2" style={{ backgroundColor: prefs.theme === theme ? NAVY : pill }}><Feather name={theme === 'system' ? 'check' : theme === 'light' ? 'sun' : 'moon'} size={18} color={prefs.theme === theme ? '#FFFFFF' : ink} /><Text className="text-[14px] font-semibold capitalize" style={{ color: prefs.theme === theme ? '#FFFFFF' : ink }}>{theme}</Text></Pressable>)}</View></View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('bell', 'Reminders', 'Local reminder preferences')}
          <View className="min-h-[52px] flex-row items-center justify-between pl-[52px]"><Text className="text-[15px]" style={{ color: ink }}>Reminders enabled</Text><Switch accessibilityLabel="Reminders enabled" value={prefs.remindersEnabled} disabled={!loaded || busy} onValueChange={(remindersEnabled) => void update({ remindersEnabled })} trackColor={{ false: '#9CA3AF', true: '#08B8BE' }} /></View>
          {row('Default snooze duration', `${prefs.snoozeMinutes} minutes`, () => setMenu('snooze'))}{row('Notification privacy', prefs.notificationPrivacy === 'show' ? 'Show content' : 'Hide content', () => setMenu('privacy'))}{row('Sound & vibration', prefs.soundAndVibration ? 'On' : 'Off', () => setMenu('sound'))}{row('Test reminder', undefined, () => void testReminder())}{row('Reminder status', reminderStatus, () => void checkReminderStatus())}{Platform.OS === 'android' && row('Alarms & reminders access', 'System settings', requestExactAccess)}{Platform.OS !== 'web' && row('Notification system settings', undefined, () => { void Linking.openSettings().catch(() => setMessage('System settings could not be opened.')); })}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('lock', 'Privacy')}{row('Device authentication', appLockEnabled ? 'On' : 'Off', () => router.push('/device-authentication'))}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('database', 'Data')}{row('Export preferences', undefined, () => setMenu('backup'))}{row('Restore preferences', undefined, () => setMenu('restore'))}{row('Erase all data', undefined, () => setMenu('erase'), true)}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('info', 'About')}{row('Offline-first', 'On', () => setMenu('about'))}{row('Privacy information', 'Version 1.0.0', () => setMenu('about'))}</View>
      </View>
    </ScrollView>

    {message ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setMessage('')} className="absolute bottom-3 left-4 right-4 rounded-2xl bg-[#0B2540] p-4"><Text className="text-center text-[14px] text-white">{message}</Text></Pressable> : null}
    <Modal transparent visible={menu !== null} animationType="fade" onRequestClose={() => { if (!busy) setMenu(null); }}><View className="flex-1 justify-end bg-black/40"><Pressable className="flex-1" disabled={busy} onPress={() => setMenu(null)} /><View className="rounded-t-[28px] p-5 pb-9" style={{ backgroundColor: surface }}><View className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#A1A8B0]" /><Text className="mb-4 text-[20px] font-bold" style={{ color: ink }}>{menu === 'snooze' ? 'Default snooze duration' : menu === 'privacy' ? 'Notification privacy' : menu === 'sound' ? 'Sound & vibration' : menu === 'backup' ? 'Export backup' : menu === 'restore' ? 'Restore backup' : menu === 'erase' ? 'Erase all data?' : 'About DoseTracker'}</Text>
      <View className="gap-2">
        {menu === 'snooze' && ([5, 10, 15, 30] as const).map((minutes) => option(`${minutes} minutes`, prefs.snoozeMinutes === minutes, () => void update({ snoozeMinutes: minutes })))}
        {menu === 'privacy' && <>{option('Show medicine details', prefs.notificationPrivacy === 'show', () => void update({ notificationPrivacy: 'show' }))}{option('Hide details on lock screen', prefs.notificationPrivacy === 'hide', () => void update({ notificationPrivacy: 'hide' }))}</>}
        {menu === 'sound' && <>{option('On', prefs.soundAndVibration, () => void update({ soundAndVibration: true }))}{option('Off', !prefs.soundAndVibration, () => void update({ soundAndVibration: false }))}</>}
        {menu === 'backup' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>Save a JSON file with preferences only. Your profile, medicines, and dose history are not included.</Text><Pressable accessibilityRole="button" disabled={busy || !loaded} onPress={() => void exportBackup()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#0B2540]"><Text className="font-semibold text-white">{busy ? 'Preparing…' : 'Save preferences file'}</Text></Pressable></>}
        {menu === 'restore' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>Choose a DoseTracker preferences JSON file. Its settings will replace your current preferences.</Text><Pressable accessibilityRole="button" disabled={busy || !loaded} onPress={() => void restoreBackup()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#0B2540]"><Text className="font-semibold text-white">{busy ? 'Restoring…' : 'Choose preferences file'}</Text></Pressable></>}
        {menu === 'erase' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>This permanently removes the local profile, medicines, schedules, dose history, and preferences from this device. A preferences backup does not include your profile or medicines.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void eraseData()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#EF4444]"><Text className="font-semibold text-white">{busy ? 'Erasing…' : 'Erase all local data'}</Text></Pressable></>}
        {menu === 'about' && <Text className="text-[15px] leading-6" style={{ color: secondary }}>DoseTracker 1.0.0 stores your profile, preferences, medicines, and dose records on this device. No account or cloud connection is used. Ongoing daily and weekday reminders are supported. Course boundaries and interval reminders are still in development. Android notification sound and vibration follow your system channel settings.</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setMenu(null)} className="mt-2 min-h-[44px] items-center justify-center"><Text className="text-[15px] font-medium" style={{ color: ink }}>Close</Text></Pressable>
      </View></View></View></Modal>
  </SafeAreaView>;
}
