import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useOnboarding } from '@/features/onboarding/context';
import { Button, ErrorMessage, Feature, Icon, Page, PrivacyNote, StepHeader, styles } from '@/features/onboarding/ui';

export default function ReadyScreen() {
  const router = useRouter();
  const { data, save } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function finish() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try { await save({ completed: true }); router.replace('/ready'); }
    catch { setError('Setup couldn’t be saved. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Page>
    {!data.completed && <StepHeader step={3} />}
    <View className="items-center" style={{ paddingVertical: 48 }}>
      <View style={{ width: 132, height: 132, borderRadius: 999, backgroundColor: '#DCF5EF', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}><Icon name="shield" size={64} color="#08AD77" /></View>
      <Text accessibilityRole="header" style={[styles.title, { textAlign: 'center' }]}>{data.completed ? 'Your space, privately.' : 'You’re all set.'}</Text>
      <Text style={[styles.subtitle, { textAlign: 'center', paddingHorizontal: 12 }]}>{data.profile ? `${data.profile.name}’s profile is saved on this device.` : 'You can create your first profile whenever you’re ready.'}</Text>
    </View>
    <View style={[styles.card, { gap: 24 }]}>
      <Feature icon="cloud-off" title="Private by design">Your profile stays on this device. No account or cloud connection is needed.</Feature>
      <Feature icon="bell" title={data.notificationChoice === 'granted' ? 'Notification permission enabled' : 'Notifications are optional'}>{data.notificationChoice === 'granted' ? 'Permission is ready. Reminders begin only after you add and schedule medicines.' : 'You can enable notifications later in your device settings.'}</Feature>
    </View>
    <ErrorMessage message={error} />
    <View style={styles.footer}>
      {!data.completed ? <Button title="Finish setup" icon="check" busy={busy} onPress={() => void finish()} /> : <Button title={data.profile ? 'Edit profile' : 'Create a profile'} icon="user" onPress={() => router.push('/profile')} />}
      <PrivacyNote />
    </View>
  </Page>;
}
