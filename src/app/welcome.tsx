import { Link, Redirect, useRouter } from 'expo-router';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/features/onboarding/context';
import { Button, Feature, Page, PrivacyNote, ReferenceArt, styles } from '@/features/onboarding/ui';

export default function WelcomeScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableHeight = height - insets.top - insets.bottom;
  // Decorative art yields space first; keep the action outside the content area.
  const illustrationMaxHeight = Math.max(0, Math.min(140, availableHeight - 650));
  const needsAccessibleScroll = availableHeight < 560 || fontScale > 1.15;

  if (data.completed) return <Redirect href="/" />;
  return <Page scrollable={needsAccessibleScroll} footer={<View style={[styles.footer, { paddingTop: 0 }]}>
    <Button title="Get started" icon="arrow-right" onPress={() => router.push('/profile')} />
    <PrivacyNote />
  </View>}>
    <View style={{ alignItems: 'center', paddingTop: 4, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image source={require('../../assets/images/brand-mark.png')} accessibilityLabel="DoseTracker app icon" style={{ width: 44, height: 44 }} />
        <Text accessibilityRole="header" style={[styles.title, { fontSize: 28, lineHeight: 34 }]}>DoseTracker</Text>
      </View>
      <Text style={[styles.subtitle, { textAlign: 'center', fontSize: 15, lineHeight: 20, marginTop: 6 }]}>Simple medicine management{'\n'}for you and your family.</Text>
    </View>
    {illustrationMaxHeight >= 60 && !needsAccessibleScroll && <ReferenceArt kind="family" maxHeight={illustrationMaxHeight} />}
    <View style={[styles.card, { marginTop: 4, gap: 8, paddingVertical: 10, paddingHorizontal: 12 }]}>
      <Feature icon="cloud-off" title="Track medicines offline">Records stay on your device. No account needed.</Feature>
      <Feature icon="users" title="For you and your family">Keep everyone’s medicines in one place.</Feature>
      <Feature icon="lock" title="No subscription">Free features, with no sign up.</Feature>
    </View>
    <Text style={{ marginTop: 6, paddingHorizontal: 4, fontSize: 12, lineHeight: 16, color: '#536073' }}>For adults 18+ managing their own or authorized dependents’ medicines. DoseTracker is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment.</Text>
    <Link href="https://dosetracker.pages.dev/privacy.html" style={{ padding: 10, textAlign: 'center', color: '#0B2540', textDecorationLine: 'underline' }}>Privacy Policy</Link>
  </Page>;
}
