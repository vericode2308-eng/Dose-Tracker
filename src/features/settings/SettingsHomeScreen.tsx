import { Feather } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openExactAlarmSettings, openNotificationSettings, reconcileReminders, eraseMedicineDataWithReminders, scheduleTestReminder } from '@/notificationManager';
import { useOnboarding } from '@/features/onboarding/context';
import { useProfiles } from '@/features/profiles/context';
import { exportPreferences, importPreferences } from '@/features/settings/backup';
import { clearSettings, DEFAULT_SETTINGS, readSettings, type SettingsPreferences, writeSettings } from '@/features/settings/storage';
import { useAppLock } from '@/features/security/AppLock';
import { clearAuthEnabled } from '@/features/security/SecurityManager';

import { readDiagnosticsConsent, setDiagnosticsConsent } from '@/features/diagnostics/diagnostics';
import { useTheme } from '@/features/theme/ThemeContext';

type Menu = 'snooze' | 'backup' | 'restore' | 'erase' | 'about' | 'diagnostics' | null;
const NAVY = '#0B2540';

export default function SettingsHomeScreen() {
  const { reset } = useOnboarding();
  const { isDark, colors, setTheme, refreshTheme } = useTheme();
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_SETTINGS);
  const [menu, setMenu] = useState<Menu>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dark = isDark;
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
    void readDiagnosticsConsent().then(value => { if (active) setDiagnosticsEnabled(value); });
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
      if ('remindersEnabled' in patch || 'notificationPrivacy' in patch || 'reminderSound' in patch || 'vibrationEnabled' in patch) {
        try { const result = await reconcileReminders(); setMessage(result.issues[0] || result.message); }
        catch { setMessage('Preference saved. Reminder setup failed; open Reminder status to retry.'); }
      }
    } catch { setMessage('This setting could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  async function updateDiagnostics(enabled: boolean) {
    setBusy(true);
    try {
      await setDiagnosticsConsent(enabled);
      setDiagnosticsEnabled(enabled);
      setMenu(null);
      setMessage(enabled ? 'Optional diagnostics enabled.' : 'Diagnostics disabled. Reports already sent are not deleted.');
    } catch { setMessage('The diagnostics choice could not be saved. Please retry.'); }
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
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The test reminder could not be scheduled.'); }
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
      await setDiagnosticsConsent(false);
      setDiagnosticsEnabled(false);
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

  function row(label: string, value: string | undefined, action: () => void, danger = false) {
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}${value ? `, ${value}` : ''}`} disabled={busy || !loaded} onPress={action} className="min-h-[48px] flex-row items-center justify-between py-2 pl-[52px]">
      <Text className="flex-1 text-[15px]" style={{ color: danger ? '#EF4444' : ink, fontWeight: danger ? '600' : '400' }}>{label}</Text>
      {value && <Text className="mr-2 text-[14px]" style={{ color: secondary }}>{value}</Text>}
      <Feather name="chevron-right" size={20} color={danger ? '#EF4444' : ink} />
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
    return <Pressable key={label} accessibilityRole={role} accessibilityLabel={label} accessibilityState={role === 'radio' ? { checked: selected } : undefined} disabled={busy || !loaded} onPress={action} className="min-h-[48px] flex-row items-center justify-between rounded-2xl px-4" style={{ backgroundColor: selected ? NAVY : pill }}><Text className="text-[15px] font-medium" style={{ color: selected ? '#FFFFFF' : ink }}>{label}</Text>{selected && <Feather name="check" color="#FFFFFF" size={20} />}</Pressable>;
  }

  return <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: background }}>
    <ScrollView contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-[440px] self-center">
        <Text accessibilityRole="header" className="mb-4 mt-5 text-[28px] font-bold" style={{ color: ink }}>Settings</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Switch profile" onPress={showSwitcher} className="mb-4 min-h-[62px] flex-row items-center gap-3"><Feather name="users" size={30} color={ink} /><View className="min-w-0 flex-1"><Text className="text-[18px] font-semibold" style={{ color: ink }}>{profile?.name || 'Me'}</Text><Text style={{ color: secondary }}>Active profile</Text></View><Feather name="chevron-down" size={20} color={ink} /></Pressable>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}><Pressable accessibilityRole="button" onPress={showSwitcher} className="flex-row items-center gap-4">{heading('users', 'People & profiles', 'Switch, add, or manage profiles')}<Feather name="chevron-right" size={21} color={ink} /></Pressable></View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('sun', 'Appearance', 'Choose your theme')}<View className="mt-3 flex-row gap-2">{(['system', 'light', 'dark'] as const).map((theme) => <Pressable key={theme} accessibilityRole="radio" accessibilityLabel={`${theme} theme`} accessibilityState={{ checked: prefs.theme === theme }} disabled={busy || !loaded} onPress={() => void update({ theme })} className="min-h-[42px] flex-1 flex-row items-center justify-center gap-2 rounded-full px-2" style={{ backgroundColor: prefs.theme === theme ? (dark ? '#08B8BE' : NAVY) : pill }}><Feather name={theme === 'system' ? 'smartphone' : theme === 'light' ? 'sun' : 'moon'} size={18} color={prefs.theme === theme ? '#FFFFFF' : ink} /><Text className="text-[14px] font-semibold capitalize" style={{ color: prefs.theme === theme ? '#FFFFFF' : ink }}>{theme}</Text></Pressable>)}</View></View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('bell', 'Reminders', 'Local reminder preferences')}
          <View className="min-h-[52px] flex-row items-center justify-between pl-[52px]"><Text className="text-[15px]" style={{ color: ink }}>Reminders enabled</Text><Switch accessibilityLabel="Reminders enabled" value={prefs.remindersEnabled} disabled={!loaded || busy} onValueChange={(remindersEnabled) => void update({ remindersEnabled })} trackColor={{ false: '#9CA3AF', true: '#08B8BE' }} /></View>
          {row('Default snooze duration', `${prefs.snoozeMinutes} minutes`, () => setMenu('snooze'))}{row('Notification privacy', prefs.notificationPrivacy === 'show' ? 'Show content' : prefs.notificationPrivacy === 'hide' ? 'Hide sensitive' : 'No info', () => router.push('/notification-privacy'))}{row('Sound & vibration', prefs.reminderSound === 'silent' && !prefs.vibrationEnabled ? 'Off' : 'On', () => router.push('/reminder-sound'))}{row('Test reminder', undefined, () => void testReminder())}{row('Reminder status', 'Check status', () => router.push('/reminder-status'))}{Platform.OS === 'android' && row('Alarms & reminders access', 'System settings', requestExactAccess)}{Platform.OS !== 'web' && row('Notification system settings', undefined, () => { void openNotificationSettings().catch(() => setMessage('System settings could not be opened.')); })}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('lock', 'Privacy')}{row('Optional diagnostics', diagnosticsEnabled ? 'On' : 'Off', () => setMenu('diagnostics'))}{row('Device authentication', appLockEnabled ? 'On' : 'Off', () => router.push('/device-authentication'))}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('database', 'Data')}{row('Export preferences', undefined, () => setMenu('backup'))}{row('Restore preferences', undefined, () => setMenu('restore'))}{row('Erase all data', undefined, () => setMenu('erase'), true)}</View>

        <View className="mb-3 rounded-[22px] p-4" style={{ backgroundColor: surface }}>{heading('info', 'About')}{row('Offline-first', 'On', () => setMenu('about'))}{legalLink('Privacy Policy', 'privacy')}{legalLink('Terms of Service', 'terms')}</View>
      </View>
    </ScrollView>

    {message ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setMessage('')} className="absolute bottom-3 left-4 right-4 rounded-2xl bg-[#0B2540] p-4"><Text className="text-center text-[14px] text-white">{message}</Text></Pressable> : null}
    <Modal transparent visible={menu !== null} animationType="fade" onRequestClose={() => { if (!busy) setMenu(null); }}><View className="flex-1 justify-end bg-black/40"><Pressable className="flex-1" disabled={busy} onPress={() => setMenu(null)} /><View className="rounded-t-[28px] p-5 pb-9" style={{ backgroundColor: surface, maxHeight: '90%' }}><View className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#A1A8B0]" /><Text className="mb-4 text-[20px] font-bold" style={{ color: ink }}>{menu === 'snooze' ? 'Default snooze duration' : menu === 'backup' ? 'Export backup' : menu === 'restore' ? 'Restore backup' : menu === 'erase' ? 'Erase all data?' : menu === 'diagnostics' ? 'Share optional diagnostics?' : 'About DoseTracker'}</Text>
      <ScrollView contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {menu === 'diagnostics' && <>
          <Text style={{ color: secondary, fontSize: 15, lineHeight: 22 }}>If you enable this, DoseTracker sends limited JavaScript error reports to Sentry for VeriCode to diagnose faults. Reports include app version, operating-system platform, error time, and code line numbers. Medicine details, profile data, error messages, screenshots, and device identifiers are excluded. Sentry receives your IP address as part of the network connection. Tracking and reminders work with diagnostics off. You can turn this off here; reports already sent are not erased by disabling it or erasing local data.</Text>
          <Link href="https://dosetracker.pages.dev/privacy.html" style={{ color: secondary, paddingVertical: 12, textDecorationLine: 'underline' }}>Privacy Policy and contact</Link>
          {option(diagnosticsEnabled ? 'Turn off diagnostics' : 'Not now', false, () => { if (diagnosticsEnabled) void updateDiagnostics(false); else setMenu(null); }, 'button')}
          {!diagnosticsEnabled && option('Enable optional diagnostics', false, () => void updateDiagnostics(true), 'button')}
        </>}
        {menu === 'snooze' && ([5, 10, 15, 30] as const).map((minutes) => option(`${minutes} minutes`, prefs.snoozeMinutes === minutes, () => void update({ snoozeMinutes: minutes })))}
        {menu === 'backup' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>Save a JSON file with preferences only. Your profile, medicines, and dose history are not included.</Text><Pressable accessibilityRole="button" disabled={busy || !loaded} onPress={() => void exportBackup()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#0B2540]"><Text className="font-semibold text-white">{busy ? 'Preparing…' : 'Save preferences file'}</Text></Pressable></>}
        {menu === 'restore' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>Choose a DoseTracker preferences JSON file. Its settings will replace your current preferences.</Text><Pressable accessibilityRole="button" disabled={busy || !loaded} onPress={() => void restoreBackup()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#0B2540]"><Text className="font-semibold text-white">{busy ? 'Restoring…' : 'Choose preferences file'}</Text></Pressable></>}
        {menu === 'erase' && <><Text className="text-[15px] leading-6" style={{ color: secondary }}>This permanently removes the local profile, medicines, schedules, dose history, and preferences from this device. Diagnostics will turn off. Reports already sent to Sentry, support emails, and exported copies are not deleted. A preferences backup does not include your profile or medicines.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void eraseData()} className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-[#EF4444]"><Text className="font-semibold text-white">{busy ? 'Erasing…' : 'Erase all local data'}</Text></Pressable></>}
        {menu === 'about' && <><Image source={require('../../../assets/images/brand-mark.png')} accessibilityLabel="DoseTracker app icon" style={{ width: 72, height: 72, alignSelf: 'center', marginBottom: 10 }} /><Text className="text-[15px] leading-6" style={{ color: secondary }}>DoseTracker 1.0.0 stores your profile, preferences, medicines, and dose records on this device. No account or health-record sync is used. Optional error diagnostics are sent to Sentry only if you enable them in Settings. Online help and legal pages require a connection. Ongoing daily and weekday reminders are supported. Course boundaries and interval reminders are still in development. Android notification sound and vibration follow your system channel settings. DoseTracker is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment.</Text></>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setMenu(null)} className="mt-2 min-h-[44px] items-center justify-center"><Text className="text-[15px] font-medium" style={{ color: ink }}>Close</Text></Pressable>
      </ScrollView></View></View></Modal>
  </SafeAreaView>;
}
