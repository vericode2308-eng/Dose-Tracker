import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useOnboarding } from '@/features/onboarding/context';
import { requestLocalNotifications } from '@/features/onboarding/permissions';
import { getReminderStatus, openExactAlarmSettings, openNotificationSettings } from '@/notificationManager';
import { Button, ErrorMessage, Feature, Page, PrivacyNote, ReferenceArt, StepHeader, styles } from '@/features/onboarding/ui';

export default function NotificationsScreen() {
  const router = useRouter();
  const { save } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [exactNeeded, setExactNeeded] = useState(false);
  const lock = useRef(false);
  async function proceed(skip = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const choice = skip ? 'skipped' : await requestLocalNotifications();
      await save({ notificationChoice: choice });
      if (choice === 'denied') { setExactNeeded(false); setDenied(true); setError('Notifications are turned off. You can enable them in Settings or continue without reminders.'); }
      else if (choice === 'unavailable') { setError('Local reminders are available in the Android or iOS app. You can continue this preview with Not now.'); }
      else if (choice === 'granted' && Platform.OS === 'android' && (await getReminderStatus()).exact === false) {
        setExactNeeded(true);
        setError('Allow Alarms & reminders for more precise dose timing. Android can delay reminders when this access is off.');
      } else router.push('/ready');
    } catch { setError('Notification preferences couldn’t be saved. Please try again, or choose Not now.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Page>
    <StepHeader step={2} />
    <ReferenceArt kind="reminders" />
    <View style={{ marginTop: 18, marginBottom: 22, paddingHorizontal: 4 }}>
      <Text accessibilityRole="header" style={[styles.title, { textAlign: 'center', fontSize: 27 }]}>Get reminder notifications</Text>
      <Text style={[styles.subtitle, { textAlign: 'center' }]}>We’ll notify you when it’s time to take your medicines.</Text>
    </View>
    <View style={[styles.card, { gap: 22, paddingVertical: 18 }]}>
      <Feature icon="bell" title="Never miss a dose">Get timely reminders for you and your family.</Feature>
      <Feature icon="settings" title="Uses Android permissions">Notifications require permission to send alerts. Exact alarms may be needed for precise timing on some devices.</Feature>
      <Feature icon="shield" title="Tracking still works" green>If you don’t allow notifications, you can still track your medicines in the app.</Feature>
    </View>
    <ErrorMessage message={error} />
    <View style={styles.footer}>
      {denied && <Button title="Open notification settings" secondary onPress={() => { void openNotificationSettings().catch(() => setError('Open your device Settings to change notification permissions.')); }} />}
      {exactNeeded && <Button title="Allow alarms & reminders" onPress={() => { void openExactAlarmSettings().catch(() => setError('Open Android Settings to allow Alarms & reminders.')); }} />}
      <Button title={exactNeeded ? 'Check access again' : denied ? 'Check permission again' : 'Allow notifications'} busy={busy} onPress={() => void proceed()} />
      <Button title={exactNeeded ? 'Continue with possible delays' : 'Not now'} secondary busy={busy} onPress={() => { if (exactNeeded) router.push('/ready'); else void proceed(true); }} />
      <PrivacyNote />
    </View>
  </Page>;
}
