import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useOnboarding } from '@/features/onboarding/context';
import { Button, Feature, Page, PrivacyNote, ReferenceArt, styles } from '@/features/onboarding/ui';

export default function WelcomeScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  if (data.completed) return <Redirect href="/ready" />;
  return <Page>
    <View style={{ paddingTop: 30, paddingHorizontal: 16, marginBottom: 20 }}>
      <Text accessibilityRole="header" style={[styles.title, { textAlign: 'center', fontSize: 32, lineHeight: 40 }]}>DoseTracker</Text>
      <Text style={[styles.subtitle, { textAlign: 'center' }]}>Simple medicine management{'\n'}for you and your family.</Text>
    </View>
    <View style={{ marginHorizontal: -12 }}><ReferenceArt kind="family" /></View>
    <View style={[styles.card, { marginTop: -2, gap: 20, paddingVertical: 20 }]}>
      <Feature icon="cloud-off" title="Works entirely offline">Your data stays on this device.{'\n'}No cloud. No account.</Feature>
      <Feature icon="users" title="For you and your family">Keep track of everyone’s medicines in one place.</Feature>
      <Feature icon="lock" title="No subscription">All features are free. No sign up required.</Feature>
    </View>
    <View accessibilityLabel="Introduction, page 1 of 3" style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, paddingVertical: 24 }}>
      {[0, 1, 2].map((dot) => <View key={dot} style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: dot === 0 ? '#0B2540' : '#C4C6C8' }} />)}
    </View>
    <View style={[styles.footer, { paddingTop: 0 }]}>
      <Button title="Get started" icon="arrow-right" onPress={() => router.push('/profile')} />
      <PrivacyNote />
    </View>
  </Page>;
}
