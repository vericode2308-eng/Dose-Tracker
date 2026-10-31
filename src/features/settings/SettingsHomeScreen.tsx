import { Host, Picker } from '@expo/ui';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { reconcileReminders, eraseMedicineDataWithReminders } from '@/notificationManager';
import { openLegalUrl, PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { useOnboarding } from '@/features/onboarding/context';
import { initials } from '@/features/onboarding/model';
import { useProfiles } from '@/features/profiles/context';
import { exportPreferences, importPreferences } from '@/features/settings/backup';
import { clearSettings, DEFAULT_SETTINGS, readSettings, type SettingsPreferences, writeSettings } from '@/features/settings/storage';
import { useAppLock } from '@/features/security/AppLock';
import { clearAuthEnabled } from '@/features/security/SecurityManager';

import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';
import { BottomOverlay } from '@/features/ui/BottomOverlay';
import { ScreenTitle } from '@/features/ui/ScreenTitle';
import { Button } from '@/features/ui/Button';
import { confirmDestructive } from '@/features/ui/confirm';
import { toastEntering, toastExiting } from '@/features/ui/motion';
import { ListRow, ListSection } from '@/features/ui/GroupedList';
import { Icon } from '@/features/ui/Icon';
import { PressableScale } from '@/features/ui/PressableScale';
import { Sheet } from '@/features/ui/Sheet';

type Menu = 'backup' | 'restore' | 'about' | null;

export default function SettingsHomeScreen() {
  const { reset } = useOnboarding();
  const { colors, setTheme, refreshTheme } = useTheme();
  const [prefs, setPrefs] = useState(DEFAULT_SETTINGS);
  const [menu, setMenu] = useState<Menu>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
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

  const privacyLabel = prefs.notificationPrivacy === 'show' ? 'Show content' : prefs.notificationPrivacy === 'hide' ? 'Hide details' : 'No info';
  const themeIndex = (['system', 'light', 'dark'] as const).indexOf(prefs.theme);

  return <View style={{ flex: 1, backgroundColor: colors.background }} collapsable={false}>
    <ScreenTitle title="Settings" />
    <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 24 }}>
      <ListSection>
        <PressableScale accessibilityRole="button" accessibilityLabel={`${profile?.name || 'Me'}, active profile`} accessibilityHint="Switch, add, or manage profiles"
          onPress={showSwitcher} scaleTo={1} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: profile?.color || colors.accent }}>
            {profile?.photoUri ? <Image source={{ uri: profile.photoUri }} style={{ width: 52, height: 52 }} />
              : <AppText variant="headline" style={{ color: '#FFFFFF' }}>{initials(profile?.name || 'Me')}</AppText>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="title3" numberOfLines={1}>{profile?.name || 'Me'}</AppText>
            <AppText variant="subhead" tone="secondary">Switch, add, or manage profiles</AppText>
          </View>
          <Icon name="chevronRight" size={14} color={colors.tertiaryLabel} weight="semibold" />
        </PressableScale>
      </ListSection>

      <ListSection title="Appearance">
        <View style={{ padding: 12 }}>
          <SegmentedControl values={['System', 'Light', 'Dark']} selectedIndex={Math.max(0, themeIndex)} enabled={loaded && !busy}
            onChange={event => { const theme = (['system', 'light', 'dark'] as const)[event.nativeEvent.selectedSegmentIndex]; if (theme && theme !== prefs.theme) void update({ theme }); }} />
        </View>
      </ListSection>

      <ListSection title="Reminders" footer="Reminders are local notifications. Dose tracking works with reminders off.">
        <ListRow icon="bell" title="Reminders" last={!prefs.remindersEnabled} trailing={<Switch accessibilityLabel="Reminders enabled" value={prefs.remindersEnabled} disabled={!loaded || busy}
          onValueChange={(remindersEnabled) => void update({ remindersEnabled })} trackColor={{ false: colors.fill, true: colors.accent }} ios_backgroundColor={colors.fill} />} />
        {prefs.remindersEnabled && <>
          <ListRow icon="snooze" title="Default snooze" trailing={<Host matchContents>
            <Picker selectedValue={prefs.snoozeMinutes} enabled={loaded && !busy} appearance="menu"
              onValueChange={(minutes) => void update({ snoozeMinutes: minutes as SettingsPreferences['snoozeMinutes'] })}>
              {([5, 10, 15, 30] as const).map(minutes => <Picker.Item key={minutes} label={`${minutes} min`} value={minutes} />)}
            </Picker>
          </Host>} />
          <ListRow icon="privacyEye" title="Notification privacy" value={privacyLabel} disabled={busy || !loaded} onPress={() => router.push('/notification-privacy')} />
          <ListRow icon="sound" title="Sound & vibration" value={prefs.reminderSound === 'silent' && !prefs.vibrationEnabled ? 'Off' : 'On'} disabled={busy || !loaded} onPress={() => router.push('/reminder-sound')} />
          <ListRow icon="status" title="Reminder status" subtitle="Send a test, fix delays, open system settings" last disabled={busy || !loaded} onPress={() => router.push('/reminder-status')} />
        </>}
      </ListSection>

      <ListSection title="Privacy">
        <ListRow icon="lock" title="App lock" value={appLockEnabled ? 'On' : 'Off'} last disabled={busy || !loaded} onPress={() => router.push('/device-authentication')} />
      </ListSection>

      <ListSection title="Data" footer="Preference files never include profiles, medicines, or dose history.">
        <ListRow icon="export" title="Export preferences" disabled={busy || !loaded} onPress={() => setMenu('backup')} />
        <ListRow icon="import" title="Restore preferences" disabled={busy || !loaded} onPress={() => setMenu('restore')} />
        <ListRow icon="trash" title="Erase all data" destructive accessory="none" last disabled={busy || !loaded} onPress={() => void confirmErase()} />
      </ListSection>

      <ListSection title="About" footer="Offline-first: your records stay on this device. No account or cloud sync.">
        <ListRow icon="aboutApp" title="About DoseTracker" value="1.0.0" onPress={() => setMenu('about')} />
        <ListRow icon="policy" title="Privacy Policy" accessory="external" accessibilityHint="Opens in your browser" onPress={() => openLegalUrl(PRIVACY_URL)} />
        <ListRow icon="terms" title="Terms of Service" accessory="external" accessibilityHint="Opens in your browser" last onPress={() => openLegalUrl(TERMS_URL)} />
      </ListSection>
    </ScrollView>

    {message ? <BottomOverlay><Animated.View entering={toastEntering} exiting={toastExiting} style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${message} Dismiss.`} onPress={() => setMessage('')}
        style={{ borderRadius: 16, borderCurve: 'continuous', padding: 16, backgroundColor: colors.inverseSurface, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)' }}>
        <AppText accessibilityLiveRegion="polite" variant="subhead" tone="inverse" style={{ textAlign: 'center' }}>{message}</AppText>
      </Pressable>
    </Animated.View></BottomOverlay> : null}
    <Sheet visible={menu !== null} onClose={() => setMenu(null)} closeDisabled={busy}
      title={menu === 'backup' ? 'Export Preferences' : menu === 'restore' ? 'Restore Preferences' : 'About DoseTracker'}>
      {menu === 'backup' && <><AppText variant="callout" tone="secondary">Save a JSON file with preferences only. Your profile, medicines, and dose history are not included.</AppText>
        <Button title={busy ? 'Preparing…' : 'Save Preferences File'} loading={busy} disabled={!loaded} onPress={() => void exportBackup()} /></>}
      {menu === 'restore' && <><AppText variant="callout" tone="secondary">Choose a DoseTracker preferences JSON file. Its settings will replace your current preferences.</AppText>
        <Button title={busy ? 'Restoring…' : 'Choose Preferences File'} loading={busy} disabled={!loaded} onPress={() => void restoreBackup()} /></>}
      {menu === 'about' && <><Image source={require('../../../assets/images/brand-mark.png')} accessibilityLabel="DoseTracker app icon" style={{ width: 72, height: 72, alignSelf: 'center' }} />
        <AppText variant="callout" tone="secondary">DoseTracker 1.0.0 stores your profile, preferences, medicines, and dose records on this device. No account, cloud sync, or remote diagnostics are used. Online help and legal pages require a connection. Ongoing daily and weekday reminders are supported. Course boundaries and interval reminders are still in development. Android notification sound and vibration follow your system channel settings. DoseTracker is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment.</AppText></>}
    </Sheet>
  </View>;
}
