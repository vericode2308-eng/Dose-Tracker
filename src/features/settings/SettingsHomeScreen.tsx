import { publicErrorMessage } from '@/features/security/errors';
import { Feather } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openExactAlarmSettings, openNotificationSettings, reconcileReminders, eraseMedicineDataWithReminders, scheduleTestReminder } from '@/notificationManager';
import { useOnboarding } from '@/features/onboarding/context';
import { useProfiles } from '@/features/profiles/context';
import { exportPreferences, importPreferences } from '@/features/settings/backup';
import { clearSettings, DEFAULT_SETTINGS, readSettings, type SettingsPreferences, writeSettings } from '@/features/settings/storage';
import { useAppLock } from '@/features/security/AppLock';
import { clearAuthEnabled } from '@/features/security/SecurityManager';

import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';
import { Button } from '@/features/ui/Button';
import { confirmDestructive } from '@/features/ui/confirm';
import { toastEntering, toastExiting } from '@/features/ui/motion';
import { Sheet } from '@/features/ui/Sheet';

type Menu = 'snooze' | 'backup' | 'restore' | 'about' | null;

export default function SettingsHomeScreen() {
  const { reset } = useOnboarding();
  const { colors, setTheme, refreshTheme } = useTheme();
  const [prefs, setPrefs] = useState(DEFAULT_SETTINGS);
  const [menu, setMenu] = useState<Menu>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const surface = colors.surface;
  const background = colors.background;
  const ink = colors.ink;
  const secondary = colors.secondary;
  const pill = colors.pill;
  const { currentProfile: profile, showSwitcher } = useProfiles();
  const { enabled: appLockEnabled, setEnabled: setAppLockEnabled } = useAppLock();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage('');
    }, 4000);
    return () => clearTimeout(timer);
  }, [message]);

  useFocusEffect(useCallback(() => {
    let active = true;
    readSettings().then(value => { if (active) { setPrefs(value); setLoaded(true); void refreshTheme(); } }).catch(() => { if (active) setMessage('Saved settings could not be loaded. Reopen Settings to try again.'); });
    return () => { active = false; };
  }, [refreshTheme]));

  async function update(patch: Partial<SettingsPreferences>) {
    if (!loaded || busy) return;
    setBusy(true);
    const next = { ...prefs, ...patch };
    try {
      if (patch.theme) {
        await setTheme(patch.theme);
      }
      await writeSettings(next);
      setPrefs(next);
      setMenu(null);
      if ('remindersEnabled' in patch || 'notificationPrivacy' in patch || 'reminderSound' in patch || 'vibrationEnabled' in patch || 'reminderRinging' in patch) {
        try { const result = await reconcileReminders(); setMessage(result.issues[0] || result.message); }
        catch { setMessage('Preference saved. Reminder setup failed; open Reminder status to retry.'); }
      }
    } catch { setMessage('This setting could not be saved. Please try again.'); }
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
      setMessage(await scheduleTestReminder());
    } catch (error) { setMessage(publicErrorMessage(error, 'The test reminder could not be scheduled.')); }
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
      await clearAuthEnabled();
      await setAppLockEnabled(false);
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

  async function confirmErase() {
    if (busy) return;
    const confirmed = await confirmDestructive({
      title: 'Erase all data?',
      message: 'This permanently removes the local profile, medicines, schedules, dose history, and preferences from this device. Support emails and exported copies are not deleted. A preferences backup does not include your profile or medicines.',
      confirmLabel: 'Erase All Data',
    });
    if (confirmed) void eraseData();
  }

  function row(label: string, value: string | undefined, action: () => void, danger = false) {
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}${value ? `, ${value}` : ''}`} disabled={busy || !loaded} onPress={action} className="min-h-[48px] flex-row items-center justify-between py-2 pl-[52px]">
      <Text className="flex-1 text-[15px]" style={{ color: danger ? colors.dangerText : ink, fontWeight: danger ? '600' : '400' }}>{label}</Text>
      {value && <Text className="mr-2 text-[14px]" style={{ color: secondary }}>{value}</Text>}
      <Feather name="chevron-right" size={20} color={danger ? colors.dangerText : ink} />
    </Pressable>;
  }

  function legalLink(label: string, document: 'privacy' | 'terms') {
    return <Link href={document === 'privacy' ? 'https://dosetracker.pages.dev/privacy.html' : 'https://dosetracker.pages.dev/?legal=terms'} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint="Opens the document in your browser" className="min-h-[48px] flex-row items-center justify-between py-2 pl-[52px]">
        <Text className="flex-1 text-[15px]" style={{ color: ink }}>{label}</Text>
        <Feather name="external-link" size={20} color={ink} />
      </Pressable>
    </Link>;
  }

  function heading(icon: keyof typeof Feather.glyphMap, title: string, subtitle?: string) {
    return <View className="flex-1 flex-row items-center gap-4 pb-1">
      <View className="w-9 items-center"><Feather name={icon} size={27} color={ink} /></View>
      <View className="flex-1"><Text className="text-[17px] font-semibold" style={{ color: ink }}>{title}</Text>{subtitle && <Text className="mt-0.5 text-[13px]" style={{ color: secondary }}>{subtitle}</Text>}</View>
    </View>;
  }

  function option(label: string, selected: boolean, action: () => void, role: 'radio' | 'button' = 'radio') {
    return <Pressable key={label} accessibilityRole={role} accessibilityLabel={label} accessibilityState={role === 'radio' ? { checked: selected } : undefined} disabled={busy || !loaded} onPress={action} className="min-h-[48px] flex-row items-center justify-between rounded-2xl px-4" style={{ backgroundColor: selected ? colors.primary : pill }}><Text className="text-[15px] font-medium" style={{ color: selected ? colors.onPrimary : ink }}>{label}</Text>{selected && <Feather name="check" color={colors.onPrimary} size={20} />}</Pressable>;
  }

  return <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: background }}>
    <ScrollView contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-[440px] self-center">
        <Text accessibilityRole="header" className="mb-4 mt-5 text-[28px] font-bold" style={{ color: ink }}>Settings</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Switch profile" onPress={showSwitcher} className="mb-4 min-h-[62px] flex-row items-center gap-3"><Feather name="users" size={30} color={ink} /><View className="min-w-0 flex-1"><Text className="text-[18px] font-semibold" style={{ color: ink }}>{profile?.name || 'Me'}</Text><Text style={{ color: secondary }}>Active profile</Text></View><Feather name="chevron-down" size={20} color={ink} /></Pressable>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}><Pressable accessibilityRole="button" onPress={showSwitcher} className="flex-row items-center gap-4">{heading('users', 'People & profiles', 'Switch, add, or manage profiles')}<Feather name="chevron-right" size={21} color={ink} /></Pressable></View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('sun', 'Appearance', 'Choose your theme')}<View className="mt-3 flex-row gap-2">{(['system', 'light', 'dark'] as const).map((theme) => <Pressable key={theme} accessibilityRole="radio" accessibilityLabel={`${theme} theme`} accessibilityState={{ checked: prefs.theme === theme }} disabled={busy || !loaded} onPress={() => void update({ theme })} className="min-h-[42px] flex-1 flex-row items-center justify-center gap-2 rounded-full px-2" style={{ backgroundColor: prefs.theme === theme ? colors.primary : pill }}><Feather name={theme === 'system' ? 'smartphone' : theme === 'light' ? 'sun' : 'moon'} size={18} color={prefs.theme === theme ? colors.onPrimary : ink} /><Text className="text-[14px] font-semibold capitalize" style={{ color: prefs.theme === theme ? colors.onPrimary : ink }}>{theme}</Text></Pressable>)}</View></View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('bell', 'Reminders', 'Local reminder preferences')}
          <View className="min-h-[52px] flex-row items-center justify-between pl-[52px]"><Text className="text-[15px]" style={{ color: ink }}>Reminders enabled</Text><Switch accessibilityLabel="Reminders enabled" value={prefs.remindersEnabled} disabled={!loaded || busy} onValueChange={(remindersEnabled) => void update({ remindersEnabled })} trackColor={{ false: colors.fill, true: colors.accent }} ios_backgroundColor={colors.fill} /></View>
          {row('Default snooze duration', `${prefs.snoozeMinutes} minutes`, () => setMenu('snooze'))}{row('Notification privacy', prefs.notificationPrivacy === 'show' ? 'Show content' : prefs.notificationPrivacy === 'hide' ? 'Hide sensitive' : 'No info', () => router.push('/notification-privacy'))}{row('Sound & vibration', prefs.reminderSound === 'silent' && !prefs.vibrationEnabled ? 'Off' : 'On', () => router.push('/reminder-sound'))}{row('Test reminder', undefined, () => void testReminder())}{row('Reminder status', 'Check status', () => router.push('/reminder-status'))}{Platform.OS === 'android' && row('Alarms & reminders access', 'System settings', requestExactAccess)}{Platform.OS !== 'web' && row('Notification system settings', undefined, () => { void openNotificationSettings().catch(() => setMessage('System settings could not be opened.')); })}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('lock', 'Privacy')}{row('Device authentication', appLockEnabled ? 'On' : 'Off', () => router.push('/device-authentication'))}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('database', 'Data')}{row('Export preferences', undefined, () => setMenu('backup'))}{row('Restore preferences', undefined, () => setMenu('restore'))}{row('Erase all data', undefined, () => void confirmErase(), true)}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('info', 'About')}{row('Offline-first', 'On', () => setMenu('about'))}{legalLink('Privacy Policy', 'privacy')}{legalLink('Terms of Service', 'terms')}</View>
      </View>
    </ScrollView>

    {message ? <Animated.View entering={toastEntering} exiting={toastExiting} style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${message} Dismiss.`} onPress={() => setMessage('')}
        style={{ borderRadius: 16, borderCurve: 'continuous', padding: 16, backgroundColor: colors.inverseSurface, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)' }}>
        <AppText accessibilityLiveRegion="polite" variant="subhead" tone="inverse" style={{ textAlign: 'center' }}>{message}</AppText>
      </Pressable>
    </Animated.View> : null}
    <Sheet visible={menu !== null} onClose={() => setMenu(null)} closeDisabled={busy}
      title={menu === 'snooze' ? 'Default Snooze' : menu === 'backup' ? 'Export Preferences' : menu === 'restore' ? 'Restore Preferences' : 'About DoseTracker'}>
      {menu === 'snooze' && ([5, 10, 15, 30] as const).map((minutes) => option(`${minutes} minutes`, prefs.snoozeMinutes === minutes, () => void update({ snoozeMinutes: minutes })))}
      {menu === 'backup' && <><AppText variant="callout" tone="secondary">Save a JSON file with preferences only. Your profile, medicines, and dose history are not included.</AppText>
        <Button title={busy ? 'Preparing…' : 'Save Preferences File'} loading={busy} disabled={!loaded} onPress={() => void exportBackup()} /></>}
      {menu === 'restore' && <><AppText variant="callout" tone="secondary">Choose a DoseTracker preferences JSON file. Its settings will replace your current preferences.</AppText>
        <Button title={busy ? 'Restoring…' : 'Choose Preferences File'} loading={busy} disabled={!loaded} onPress={() => void restoreBackup()} /></>}
      {menu === 'about' && <><Image source={require('../../../assets/images/brand-mark.png')} accessibilityLabel="DoseTracker app icon" style={{ width: 72, height: 72, alignSelf: 'center' }} />
        <AppText variant="callout" tone="secondary">DoseTracker 1.0.0 stores your profile, preferences, medicines, and dose records on this device. No account, cloud sync, or remote diagnostics are used. Online help and legal pages require a connection. Ongoing daily and weekday reminders are supported. Course boundaries and interval reminders are still in development. Android notification sound and vibration follow your system channel settings. DoseTracker is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment.</AppText></>}
    </Sheet>
  </SafeAreaView>;
}
