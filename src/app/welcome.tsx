import { Link, Redirect, useRouter } from 'expo-router';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { useOnboarding } from '@/features/onboarding/context';
import { Button, Feature, Page, PrivacyNote, ReferenceArt, styles } from '@/features/onboarding/ui';

export default function WelcomeScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  const { height } = useWindowDimensions();
  const illustrationMaxHeight = Math.round(Math.min(height * 0.24, 175));

  if (data.completed) return <Redirect href="/" />;
  return <Page footer={<View style={[styles.footer, { paddingTop: 0 }]}>
    <Button title="Get started" icon="arrow-right" onPress={() => router.push('/profile')} />
    <PrivacyNote />
  </View>}>
    <View style={{ paddingTop: 10, paddingHorizontal: 16, marginBottom: 8, alignItems: 'center' }}>
      <Image source={require('../../assets/images/brand-mark.png')} accessibilityLabel="DoseTracker app icon" style={{ width: 52, height: 52, alignSelf: 'center', marginBottom: 8 }} />
      <Text accessibilityRole="header" style={[styles.title, { textAlign: 'center', fontSize: 28, lineHeight: 34 }]}>DoseTracker</Text>
      <Text style={[styles.subtitle, { textAlign: 'center', fontSize: 15, lineHeight: 21, marginTop: 4 }]}>Simple medicine management{'\n'}for you and your family.</Text>
    </View>
    <ReferenceArt kind="family" maxHeight={illustrationMaxHeight} />
    <View style={[styles.card, { marginTop: 4, gap: 12, paddingVertical: 14, paddingHorizontal: 14 }]}>
      <Feature icon="cloud-off" title="Track medicines offline">Health records stay on this device.{'\n'}No account. Diagnostics are optional.</Feature>
      <Feature icon="users" title="For you and your family">Keep track of everyone’s medicines in one place.</Feature>
      <Feature icon="lock" title="No subscription">All features are free. No sign up required.</Feature>
    </View>
    <Text style={{ marginTop: 12, paddingHorizontal: 16, fontSize: 12, lineHeight: 17, color: '#536073' }}>For adults 18+ managing their own or authorized dependents’ medicines. DoseTracker is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment.</Text>
    <Link href="https://dosetracker.pages.dev/privacy.html" style={{ padding: 12, textAlign: 'center', color: '#0B2540', textDecorationLine: 'underline' }}>Privacy Policy</Link>
    <View accessibilityLabel="Introduction, page 1 of 3" style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 14 }}>
      {[0, 1, 2].map((dot) => <View key={dot} style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: dot === 0 ? '#0B2540' : '#C4C6C8' }} />)}
    </View>
  </Page>;
}
