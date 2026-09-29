import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { useTheme } from '@/features/theme/ThemeContext';

type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 22, color = theme.palette.navy }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

export function Page({ children, footer, backgroundColor = theme.colors.background }: { children: ReactNode; footer?: ReactNode; backgroundColor?: string }) {
  return <SafeAreaView className="flex-1" style={{ backgroundColor }} edges={['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      {footer && <View style={{ width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, backgroundColor }}>{footer}</View>}
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
  const { colors, isDark } = useTheme();
  const foreground = secondary ? colors.ink : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onPress}
    className={secondary ? 'rounded-pill border border-border bg-surface active:opacity-70' : 'rounded-pill bg-medical active:opacity-70'}
    style={[styles.button, { opacity: busy ? 0.7 : 1, backgroundColor: secondary ? colors.surface : isDark ? colors.accent : theme.palette.navy, borderColor: colors.border }]}>
    {busy ? <ActivityIndicator color={foreground} /> : <>
      <Text style={[styles.buttonText, { color: foreground }]}>{title}</Text>
      {icon && <Icon name={icon} color={foreground} />}
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
    <Text style={{ fontSize: 11, color: theme.palette.textSecondary }}>Local health records · Optional diagnostics</Text>
  </View>;
}

export function ErrorMessage({ message }: { message: string }) {
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{message}</Text> : null;
}

// Only the illustration regions are displayed; all text and controls are native.
export function ReferenceArt({ kind, maxHeight }: { kind: 'family' | 'reminders'; maxHeight?: number }) {
  const { height: windowHeight } = useWindowDimensions();
  const effectiveMaxHeight = maxHeight ?? Math.round(windowHeight * 0.25);
  const family = kind === 'family';

  if (family) {
    const artWidth = Math.round(effectiveMaxHeight * (2282 / 1856));
    return (
      <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: 4 }}>
        <Image
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          source={require('../../../assets/onboarding/family-illustration.png')}
          resizeMode="contain"
          style={{ width: artWidth, height: effectiveMaxHeight, maxWidth: '100%' }}
        />
      </View>
    );
  }

  const cropTop = 113;
  const cropHeight = 420;
  const sourceHeight = 1614;
  const cropWidth = 674;
  const scale = effectiveMaxHeight / cropHeight;
  const containerWidth = Math.round(cropWidth * scale);
  const containerHeight = effectiveMaxHeight;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: containerWidth,
        height: containerHeight,
        alignSelf: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
        borderRadius: 16,
        marginVertical: 4,
      }}
    >
      <Image
        resizeMode="stretch"
        source={require('../../../assets/onboarding/reminders-reference.png')}
        style={{
          position: 'absolute',
          width: Math.round(706 * scale),
          height: Math.round(sourceHeight * scale),
          top: -Math.round(cropTop * scale),
          left: -Math.round(16 * scale),
        }}
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  back: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: theme.palette.navy, letterSpacing: -0.5, lineHeight: 32 },
  subtitle: { fontSize: 16, lineHeight: 22, color: theme.palette.textSecondary, marginTop: 6 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.card, padding: 14, borderWidth: 1, borderColor: '#E8EAF0' },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  featureTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: theme.palette.textDark, marginTop: 1, marginBottom: 2 },
  featureBody: { fontSize: 13, lineHeight: 18, color: theme.palette.textSecondary },
  button: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 10, borderRadius: 999 },
  buttonText: { fontSize: 17, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  footer: { gap: 10, paddingHorizontal: 4, paddingTop: 8, marginTop: 'auto' },
  error: { color: '#B42318', fontSize: 14, lineHeight: 20, marginVertical: 6 },
});
