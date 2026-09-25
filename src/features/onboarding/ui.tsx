import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';

type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 22, color = theme.palette.navy }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

export function Page({ children }: { children: ReactNode }) {
  return <SafeAreaView className="flex-1 bg-luminous" edges={['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function StepHeader({ step }: { step: number }) {
  const router = useRouter();
  return <View className="flex-row items-center justify-between px-2" style={{ marginBottom: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}><Icon name="arrow-left" size={25} /></Pressable>
    <Text className="text-base text-textSecondary">Step {step} of 3</Text>
  </View>;
}

export function Button({ title, onPress, secondary = false, busy = false, icon }: {
  title: string; onPress: () => void; secondary?: boolean; busy?: boolean; icon?: IconName;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onPress}
    className={secondary ? 'rounded-pill border border-border bg-surface active:opacity-70' : 'rounded-pill bg-medical active:opacity-70'}
    style={[styles.button, { opacity: busy ? 0.7 : 1 }]}>
    {busy ? <ActivityIndicator color={secondary ? theme.palette.navy : '#FFFFFF'} /> : <>
      <Text style={[styles.buttonText, { color: secondary ? theme.palette.textDark : '#FFFFFF' }]}>{title}</Text>
      {icon && <Icon name={icon} color={secondary ? theme.palette.navy : '#FFFFFF'} />}
    </>}
  </Pressable>;
}

export function Feature({ icon, title, children, green = false }: { icon: IconName; title: string; children: ReactNode; green?: boolean }) {
  return <View style={styles.feature}>
    <View style={[styles.featureIcon, { backgroundColor: green ? '#DCF5EF' : '#EAF5FF' }]}><Icon name={icon} size={29} color={green ? '#08AD77' : '#168CF4'} /></View>
    <View className="flex-1"><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureBody}>{children}</Text></View>
  </View>;
}

export function PrivacyNote() {
  return <View className="flex-row items-center justify-center" style={{ gap: 6, paddingTop: 12 }}>
    <Icon name="cloud-off" size={13} color={theme.palette.textSecondary} />
    <Text style={{ fontSize: 11, color: theme.palette.textSecondary }}>On-device only · No account · Works offline</Text>
  </View>;
}

export function ErrorMessage({ message }: { message: string }) {
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{message}</Text> : null;
}

// Only the illustration regions are displayed; all text and controls are native.
export function ReferenceArt({ kind }: { kind: 'family' | 'reminders' }) {
  const [width, setWidth] = useState(0);
  const family = kind === 'family';
  const cropTop = family ? 298 : 113;
  const cropHeight = family ? 530 : 420;
  const sourceHeight = family ? 1626 : 1614;
  const cropWidth = family ? 690 : 674;
  const scale = width / cropWidth;
  return <View accessible={false} importantForAccessibility="no-hide-descendants"
    onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    style={{ width: '100%', aspectRatio: cropWidth / cropHeight, overflow: 'hidden', pointerEvents: 'none' }}>
    {width > 0 && <Image resizeMode="stretch" source={family
      ? require('../../../assets/onboarding/family-reference.png')
      : require('../../../assets/onboarding/reminders-reference.png')}
      style={{ position: 'absolute', width: 706 * scale, height: sourceHeight * scale, top: -cropTop * scale, left: -(family ? 8 : 16) * scale }} />}
  </View>;
}

export const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16 },
  back: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: theme.palette.navy, letterSpacing: -0.65, lineHeight: 35 },
  subtitle: { fontSize: 18, lineHeight: 24, color: theme.palette.textSecondary, marginTop: 8 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.card, padding: 16 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  featureIcon: { width: 62, height: 62, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  featureTitle: { fontSize: 17, lineHeight: 23, fontWeight: '600', color: theme.palette.textDark, marginTop: 3, marginBottom: 3 },
  featureBody: { fontSize: 16, lineHeight: 21, color: theme.palette.textSecondary },
  button: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 13, gap: 12 },
  buttonText: { fontSize: 18, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  footer: { gap: 10, paddingHorizontal: 4, paddingTop: 12, marginTop: 'auto' },
  error: { color: '#B42318', fontSize: 14, lineHeight: 20, marginVertical: 8 },
});
