import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppLock } from './AppLock';
import { checkSupport, type DeviceSupport } from './SecurityManager';
import { setAppLockWithReminders } from '@/notificationManager';

export default function DeviceAuthenticationSettingsScreen() {
  const { enabled, setEnabled, authenticate } = useAppLock();
  const [support, setSupport] = useState<DeviceSupport | null>(null);
  const [busy, setBusy] = useState(false);
  const changing = useRef(false);

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

  return <SafeAreaView className="flex-1 bg-[#FBF8F3]" edges={['top']}>
    <View className="w-full max-w-[440px] flex-1 self-center px-5">
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Settings" onPress={() => router.back()} className="mt-3 h-12 w-12 items-center justify-center"><Feather name="arrow-left" size={24} color="#102238" /></Pressable>
      <View className="mt-6 items-center"><View className="h-20 w-20 items-center justify-center rounded-[24px] bg-[#DDEDEA]"><Feather name="lock" size={34} color="#0B635F" /></View>
        <Text accessibilityRole="header" className="mt-5 text-center text-[27px] font-bold text-[#102238]">Device authentication</Text>
        <Text className="mt-3 text-center text-[15px] leading-6 text-[#536073]">Require your phone’s fingerprint, face, or screen lock whenever DoseTracker opens or returns from the background. This helps keep your health information private if someone else has your unlocked phone.</Text>
      </View>
      <View className="mt-9 rounded-[22px] bg-white p-5"><View className="flex-row items-center justify-between gap-4"><View className="flex-1"><Text className="text-[17px] font-semibold text-[#102238]">Enable app lock</Text><Text className="mt-1 text-[13px] leading-5 text-[#536073]">{enabled ? 'On' : 'Off'}</Text></View><Switch accessibilityLabel="Enable app lock" accessibilityState={{ disabled: busy || !support?.available }} value={enabled} disabled={busy || !support?.available} onValueChange={value => void change(value)} trackColor={{ false: '#9CA3AF', true: '#08B8BE' }} /></View></View>
      {support && !support.available && <Text className="mt-4 text-center text-[14px] leading-5 text-[#9A3412]">Set up a PIN, pattern, passcode, or biometric unlock in your phone’s settings before enabling app lock.</Text>}
      <Text className="mt-6 text-center text-[13px] leading-5 text-[#536073]">Anyone whose fingerprint or face is enrolled on this phone, or who knows its screen lock, can open DoseTracker. App lock controls access to the app; it does not encrypt exported files or the health database.</Text>
      <Text className="mt-3 text-center text-[13px] leading-5 text-[#536073]">While app lock is on, open and unlock DoseTracker to take, skip, or snooze a dose. Quick actions on notifications are disabled.</Text>
    </View>
  </SafeAreaView>;
}
