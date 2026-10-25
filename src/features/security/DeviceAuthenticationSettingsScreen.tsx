import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';
import { Card } from '@/features/ui/Card';
import { Icon } from '@/features/ui/Icon';
import { IconButton } from '@/features/ui/IconButton';
import { InlineMessage } from '@/features/ui/InlineMessage';
import { radii } from '../../../theme';
import { useAppLock } from './AppLock';
import { checkSupport, type DeviceSupport } from './SecurityManager';
import { setAppLockWithReminders } from '@/notificationManager';

export default function DeviceAuthenticationSettingsScreen() {
  const { enabled, setEnabled, authenticate } = useAppLock();
  const [support, setSupport] = useState<DeviceSupport | null>(null);
  const [busy, setBusy] = useState(false);
  const changing = useRef(false);
  const { colors } = useTheme();

  useEffect(() => {
    let active = true;
    checkSupport().then(value => { if (active) setSupport(value); }).catch(() => { if (active) setSupport({ available: false, hasBiometrics: false, biometricEnrolled: false, hasDeviceCredential: false }); });
    return () => { active = false; };
  }, []);

  async function change(value: boolean) {
    if (changing.current || !support?.available) return;
    changing.current = true;
    setBusy(true);
    let saved = false;
    try {
      const authenticated = await authenticate();
      if (!authenticated) {
        Alert.alert('Authentication failed', `App lock was not ${value ? 'enabled' : 'disabled'}. Try again with your phone’s screen lock.`);
        return;
      }
      const result = await setAppLockWithReminders(value);
      saved = true;
      await setEnabled(value);
      if (result.message) Alert.alert('Notification controls need a refresh', result.message);
      router.back();
    } catch {
      Alert.alert(saved ? 'App lock needs a retry' : 'Could not save app lock', saved
        ? 'Your preference was saved, but screen protection could not be updated. DoseTracker will stay closed until you retry.'
        : 'Your security setting could not be saved. Please try again.');
    } finally {
      changing.current = false;
      setBusy(false);
    }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
    <View style={{ paddingHorizontal: 8 }}>
      <IconButton icon="back" accessibilityLabel="Back to Settings" color={colors.accentText} onPress={() => router.back()} />
    </View>
    <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <View style={{ width: 72, height: 72, borderRadius: radii.card, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }}>
          <Icon name="lock" size={32} color={colors.accentText} />
        </View>
        <AppText accessibilityRole="header" variant="title1" style={{ textAlign: 'center' }}>Device Authentication</AppText>
        <AppText variant="callout" tone="secondary" style={{ textAlign: 'center' }}>Require your phone’s fingerprint, face, or screen lock whenever DoseTracker opens or returns from the background. This helps keep your health information private if someone else has your unlocked phone.</AppText>
      </View>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="body">App lock</AppText>
          <AppText variant="footnote" tone="secondary">{enabled ? 'On' : 'Off'}</AppText>
        </View>
        <Switch accessibilityLabel="Enable app lock" accessibilityState={{ disabled: busy || !support?.available }} value={enabled} disabled={busy || !support?.available}
          onValueChange={value => void change(value)} trackColor={{ false: colors.fill, true: colors.accent }} ios_backgroundColor={colors.fill} />
      </Card>
      {support && !support.available && <InlineMessage tone="warning" message="Set up a PIN, pattern, passcode, or biometric unlock in your phone’s settings before enabling app lock." />}
      <View style={{ gap: 8, paddingHorizontal: 4 }}>
        <AppText variant="footnote" tone="secondary">Anyone whose fingerprint or face is enrolled on this phone, or who knows its screen lock, can open DoseTracker. App lock controls access to the app; it does not encrypt exported files or the health database.</AppText>
        <AppText variant="footnote" tone="secondary">While app lock is on, open and unlock DoseTracker to take, skip, or snooze a dose. Quick actions on notifications are disabled.</AppText>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
