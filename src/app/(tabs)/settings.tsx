import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/features/onboarding/context';
import { INITIAL_DATA, initials, isOnboardingData } from '@/features/onboarding/model';
import { readOnboarding, writeOnboarding } from '@/features/onboarding/storage';
import { clearSettings, DEFAULT_SETTINGS, isSettings, readSettings, type SettingsPreferences, writeSettings } from '@/features/settings/storage';

type Menu = 'snooze' | 'privacy' | 'sound' | 'auth' | 'backup' | 'restore' | 'erase' | 'about' | null;
const NAVY = '#0B2540';
const MUTED = '#536073';

export default function SettingsScreen() {
  const { data, save } = useOnboarding();
  const systemScheme = useColorScheme();
  const [prefs, setPrefs] = useState(DEFAULT_SETTINGS);
  const [menu, setMenu] = useState<Menu>(null);
  const [message, setMessage] = useState('');
  const [restoreText, setRestoreText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reminderStatus, setReminderStatus] = useState('Check status');
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemScheme === 'dark');
  const surface = dark ? '#1F2937' : '#FFFFFF';
  const background = dark ? '#0B1220' : '#FBF8F3';
  const ink = dark ? '#F8FAFC' : '#0F172A';
  const secondary = dark ? '#B6C1CF' : MUTED;
  const pill = dark ? '#374151' : '#F2F3F5';
  const profile = data.profile;

  useEffect(() => {
    readSettings().then(setPrefs).catch(() => setMessage('Saved settings could not be loaded.'));
  }, []);

  async function update(patch: Partial<SettingsPreferences>) {
    const next = { ...prefs, ...patch };
    try {
      await writeSettings(next);
      setPrefs(next);
      setMenu(null);
    } catch { setMessage('This setting could not be saved. Please try again.'); }
  }

  async function checkReminderStatus() {
    if (Platform.OS === 'web') { setReminderStatus('Mobile only'); setMessage('Notification status is available in the Android or iOS app.'); return; }
    try {
      const Notifications = await import('expo-notifications');
      const permission = await Notifications.getPermissionsAsync();
      setReminderStatus(permission.granted ? 'Allowed' : 'Permission off');
      setMessage(permission.granted ? 'Notification permission is enabled. Medicine reminders are still being developed.' : 'Enable notifications in your device settings to receive future reminders.');
    } catch { setReminderStatus('Unavailable'); setMessage('Notification status could not be checked.'); }
  }

  async function testReminder() {
    if (Platform.OS === 'web') { setMessage('Test reminders require the Android or iOS app.'); return; }
    setBusy(true);
    try {
      const Notifications = await import('expo-notifications');
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) { setMessage('Allow notifications in device settings before sending a test reminder.'); return; }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'DoseTracker test reminder', body: 'Your reminder notifications are working.', sound: prefs.soundAndVibration ? 'default' : false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
      });
      setMessage('Test reminder scheduled for 3 seconds from now.');
    } catch { setMessage('The test reminder could not be scheduled.'); }
    finally { setBusy(false); }
  }

  async function exportBackup() {
    setBusy(true);
    try {
      const onboarding = await readOnboarding();
      const portableOnboarding = { ...onboarding, profile: onboarding.profile ? { ...onboarding.profile, photoUri: null } : null };
      const backup = JSON.stringify({ format: 'dosetracker-backup-v1', onboarding: portableOnboarding, settings: prefs }, null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dosetracker-backup.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await Share.share({ title: 'DoseTracker backup', message: backup });
      }
      setMenu(null);
    } catch { setMessage('The backup could not be shared.'); }
    finally { setBusy(false); }
  }

  async function restoreBackup() {
    setBusy(true);
    try {
      const parsed: unknown = JSON.parse(restoreText);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid backup');
      const backup = parsed as { format?: unknown; onboarding?: unknown; settings?: unknown };
      if (backup.format !== 'dosetracker-backup-v1' || !isOnboardingData(backup.onboarding) || !isSettings(backup.settings)) throw new Error('Invalid backup');
      const onboarding = { ...backup.onboarding, profile: backup.onboarding.profile ? { ...backup.onboarding.profile, photoUri: null } : null };
      await writeOnboarding(onboarding);
      await writeSettings(backup.settings);
      await save(onboarding);
      setPrefs(backup.settings);
      setRestoreText('');
      setMenu(null);
      setMessage('Your saved profile and preferences were restored.');
    } catch { setMessage('That backup is invalid or could not be restored.'); }
    finally { setBusy(false); }
  }

  async function eraseData() {
    setBusy(true);
    try {
      if (Platform.OS !== 'web') {
        const { Directory, File, Paths } = await import('expo-file-system');
        for (const entry of new Directory(Paths.document).list()) {
          if (entry instanceof File && /^profile-\d+\.(jpg|jpeg|png|webp|heic)$/i.test(entry.name)) entry.delete();
        }
      }
      await writeOnboarding(INITIAL_DATA);
      await clearSettings();
      await save(INITIAL_DATA);
      setPrefs(DEFAULT_SETTINGS);
      setMenu(null);
      setMessage('Saved profile and preferences were erased. Demo medicines are not saved on this device.');
    } catch { setMessage('Saved data could not be erased.'); }
    finally { setBusy(false); }
  }

  function row(label: string, value: string | undefined, action: () => void, danger = false) {
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}${value ? `, ${value}` : ''}`} onPress={action} className="min-h-[48px] flex-row items-center justify-between py-2 pl-[52px]">
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
    return <Pressable key={label} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }} onPress={action} className="min-h-[48px] flex-row items-center justify-between rounded-2xl px-4" style={{ backgroundColor: selected ? NAVY : pill }}><Text className="text-[15px] font-medium" style={{ color: selected ? '#FFFFFF' : ink }}>{label}</Text>{selected && <Feather name="check" color="#FFFFFF" size={20} />}</Pressable>;
  }

  return <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: background }}>
    <ScrollView contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-[440px] self-center">
        <Text accessibilityRole="header" className="mb-4 mt-5 text-[28px] font-bold" style={{ color: ink }}>Settings</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={profile ? 'Active profile, edit profile' : 'Create your profile'} onPress={() => router.push('/profile')} className="mb-4 min-h-[62px] flex-row items-center gap-3">
          <View className="h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: profile?.color || '#08B8BE' }}>{profile?.photoUri ? <Image source={{ uri: profile.photoUri }} className="h-full w-full" /> : <Text className="text-[20px] font-semibold text-white">{initials(profile?.name || 'Me')}</Text>}</View>
          <View><View className="flex-row items-center gap-2"><Text className="text-[18px] font-semibold" style={{ color: ink }}>{profile?.name || 'Create your profile'}</Text><Feather name="chevron-down" size={19} color={ink} /></View><Text className="text-[13px]" style={{ color: secondary }}>{profile ? 'Active profile' : 'No profile saved yet'}</Text></View>
        </Pressable>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}><Pressable accessibilityRole="button" onPress={() => router.push('/profile')} className="flex-row items-center gap-4">{heading('users', 'People & profiles', profile ? 'Edit your saved profile' : 'Create your first profile')}<Feather name="chevron-right" size={21} color={ink} /></Pressable></View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('sun', 'Appearance', 'Choose your theme')}<View className="mt-3 flex-row gap-2">{(['system', 'light', 'dark'] as const).map((theme) => <Pressable key={theme} accessibilityRole="radio" accessibilityLabel={`${theme} theme`} accessibilityState={{ checked: prefs.theme === theme }} onPress={() => void update({ theme })} className="min-h-[42px] flex-1 flex-row items-center justify-center gap-2 rounded-full px-2" style={{ backgroundColor: prefs.theme === theme ? NAVY : pill }}><Feather name={theme === 'system' ? 'check' : theme === 'light' ? 'sun' : 'moon'} size={18} color={prefs.theme === theme ? '#FFFFFF' : ink} /><Text className="text-[14px] font-semibold capitalize" style={{ color: prefs.theme === theme ? '#FFFFFF' : ink }}>{theme}</Text></Pressable>)}</View></View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('bell', 'Reminders', 'Default snooze, notifications and more')}{row('Default snooze duration', `${prefs.snoozeMinutes} minutes`, () => setMenu('snooze'))}{row('Notification privacy', prefs.notificationPrivacy === 'show' ? 'Show content' : 'Hide content', () => setMenu('privacy'))}{row('Sound & vibration', prefs.soundAndVibration ? 'On' : 'Off', () => setMenu('sound'))}{row('Test reminder', undefined, () => void testReminder())}{row('Reminder status', reminderStatus, () => void checkReminderStatus())}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('lock', 'Privacy')}{row('Device authentication', 'Off', () => setMenu('auth'))}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('database', 'Data')}{row('Export backup', undefined, () => setMenu('backup'))}{row('Restore backup', undefined, () => setMenu('restore'))}{row('Export CSV', undefined, () => setMessage('There are no saved dose records to export yet. The current medicines and history are demo data.'))}{row('Erase all data', undefined, () => setMenu('erase'), true)}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('info', 'About')}{row('Offline-first', 'On', () => setMenu('about'))}{row('Privacy information', 'Version 1.0.0', () => setMenu('about'))}</View>
      </View>
    </ScrollView>

    {message ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setMessage('')} className="absolute bottom-3 left-4 right-4 rounded-2xl bg-[#0B2540] p-4"><Text className="text-center text-[14px] text-white">{message}</Text></Pressable> : null}
    <Modal transparent visible={menu !== null} animationType="fade" onRequestClose={() => setMenu(null)}><View className="flex-1 justify-end bg-black/40"><Pressable className="flex-1" onPress={() => setMenu(null)} /><View className="rounded-t-[28px] p-5 pb-9" style={{ backgroundColor: surface }}><View className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#A1A8B0]" /><Text className="mb-4 text-[20px] font-bold" style={{ color: ink }}>{menu === 'snooze' ? 'Default snooze duration' : menu === 'privacy' ? 'Notification privacy' : menu === 'sound' ? 'Sound & vibration' : menu === 'auth' ? 'Device authentication' : menu === 'backup' ? 'Export backup' : menu === 'restore' ? 'Restore backup' : menu === 'erase' ? 'Erase all data?' : 'About DoseTracker'}</Text>
      <View className="gap-2">
        {menu === 'snooze' && ([5, 10, 15, 30] as const).map((minutes) => option(`${minutes} minutes`, prefs.snoozeMinutes === minutes, () => void update({ snoozeMinutes: minutes })))}
        {menu === 'privacy' && <>{option('Show medicine details', prefs.notificationPrivacy === 'show', () => void update({ notificationPrivacy: 'show' }))}{option('Hide details on lock screen', prefs.notificationPrivacy === 'hide', () => void update({ notificationPrivacy: 'hide' }))}</>}
        {menu === 'sound' && <>{option('On', prefs.soundAndVibration, () => void update({ soundAndVibration: true }))}{option('Off', !prefs.soundAndVibration, () => void update({ soundAndVibration: false }))}</>}
        {menu === 'auth' && <Text className="text-[15px] leading-6" style={{ color: secondary }}>App locking is not available yet. Your saved profile remains on this device.</Text>}
        {menu === 'backup' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>Share a JSON backup of your saved profile details and settings. Profile photos, demo medicines and history are not included.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void exportBackup()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#0B2540]"><Text className="font-semibold text-white">{busy ? 'Preparing…' : 'Share backup'}</Text></Pressable></>}
        {menu === 'restore' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>Paste a DoseTracker backup to replace the saved profile and settings on this device.</Text><TextInput accessibilityLabel="Backup JSON" multiline value={restoreText} onChangeText={setRestoreText} placeholder="Paste backup JSON" placeholderTextColor="#94A3B8" className="min-h-[96px] rounded-xl border border-[#CBD5E1] p-3 text-[14px]" style={{ color: ink, textAlignVertical: 'top' }} /><Pressable accessibilityRole="button" disabled={busy || !restoreText.trim()} onPress={() => void restoreBackup()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#0B2540]" style={{ opacity: restoreText.trim() ? 1 : 0.45 }}><Text className="font-semibold text-white">{busy ? 'Restoring…' : 'Restore backup'}</Text></Pressable></>}
        {menu === 'erase' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>This removes the saved profile and settings from this device. Export a backup first if you want to keep them.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void eraseData()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#EF4444]"><Text className="font-semibold text-white">{busy ? 'Erasing…' : 'Erase saved data'}</Text></Pressable></>}
        {menu === 'about' && <Text className="text-[15px] leading-6" style={{ color: secondary }}>DoseTracker 1.0.0 keeps saved profile and settings on this device. No account or cloud connection is used. Medicines and history are currently demo data.</Text>}
        <Pressable accessibilityRole="button" onPress={() => setMenu(null)} className="mt-2 min-h-[44px] items-center justify-center"><Text className="text-[15px] font-medium" style={{ color: ink }}>Close</Text></Pressable>
      </View></View></View></Modal>
  </SafeAreaView>;
}
