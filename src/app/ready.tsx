import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { DIAGNOSTICS_OFF, type DiagnosticsPreferences, setDiagnosticsConsent } from '@/features/diagnostics/diagnostics';
import { DiagnosticsChoices, DIAGNOSTICS_DISCLOSURE } from '@/features/diagnostics/DiagnosticsChoices';
import { useOnboarding } from '@/features/onboarding/context';
import { useProfiles } from '@/features/profiles/context';
import { Button, ErrorMessage, Feature, Page, PrivacyNote, StepHeader, styles } from '@/features/onboarding/ui';

export default function ReadyScreen() {
  const router = useRouter();
  const { data, save } = useOnboarding();
  const { currentProfile } = useProfiles();
  const [diagnostics, setDiagnostics] = useState<DiagnosticsPreferences>({ ...DIAGNOSTICS_OFF });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function finish(enabled: DiagnosticsPreferences | false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      setError('');
      await setDiagnosticsConsent(enabled);
      await save({ completed: true });
      router.replace('/');
    }
    catch { setError('Setup couldn’t be saved. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  if (showDiagnostics) return <Page footer={<View style={styles.footer}>
    <Button title="Save choices and finish setup" busy={busy} onPress={() => void finish(diagnostics)} />
    <Button title="Continue without diagnostics" secondary busy={busy} onPress={() => void finish(false)} />
  </View>}>
    <Text accessibilityRole="header" style={styles.title}>Help improve Dose Tracker?</Text>
    <Text style={styles.subtitle}>{DIAGNOSTICS_DISCLOSURE}</Text>
    <DiagnosticsChoices value={diagnostics} onChange={setDiagnostics} disabled={busy} />
    <Link href="https://dosetracker.pages.dev/privacy.html" style={{ paddingVertical: 16, textDecorationLine: 'underline' }}>Privacy Policy and contact</Link>
    <ErrorMessage message={error} />
  </Page>;
  return <Page footer={<View style={[styles.footer, { paddingTop: 8 }]}>
    {!data.completed ? <Button title="Finish setup" icon="check" busy={busy} onPress={() => setShowDiagnostics(true)} /> : <Button title={currentProfile ? 'Edit profile' : 'Create a profile'} icon="user" onPress={() => router.push('/profile')} />}
    <PrivacyNote />
  </View>}>
    {!data.completed && <StepHeader step={3} />}
    <View className="items-center" style={{ paddingVertical: 20 }}>
      <Image source={require('../../assets/images/brand-mark.png')} accessibilityLabel="DoseTracker app icon" style={{ width: 72, height: 72, marginBottom: 14 }} />
      <Text accessibilityRole="header" style={[styles.title, { textAlign: 'center', fontSize: 26, lineHeight: 32 }]}>{data.completed ? 'Your space, privately.' : 'You’re all set.'}</Text>
      <Text style={[styles.subtitle, { textAlign: 'center', paddingHorizontal: 12, fontSize: 15, lineHeight: 20, marginTop: 4 }]}>{currentProfile ? `${currentProfile.name}’s profile is saved on this device.` : 'You can create your first profile whenever you’re ready.'}</Text>
    </View>
    <View style={[styles.card, { gap: 12, paddingVertical: 14, paddingHorizontal: 14 }]}>
      <Feature icon="cloud-off" title="Private by design">Your profile stays on this device. No account or cloud connection is needed.</Feature>
      <Feature icon="bell" title={data.notificationChoice === 'granted' ? 'Notification permission enabled' : 'Notifications are optional'}>{data.notificationChoice === 'granted' ? 'Permission is ready. Reminders begin only after you add and schedule medicines.' : 'You can enable notifications later in your device settings.'}</Feature>
    </View>
    <ErrorMessage message={error} />
  </Page>;
}
