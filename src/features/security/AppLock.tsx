import * as ScreenCapture from 'expo-screen-capture';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { authenticateUser, isAuthEnabled } from './SecurityManager';

type LockContextValue = { enabled: boolean; setEnabled: (enabled: boolean) => Promise<void>; authenticate: () => Promise<boolean> };
const LockContext = createContext<LockContextValue | null>(null);
const CAPTURE_KEY = 'dose-tracker-app-lock';
const isInBackground = () => AppState.currentState === 'background';

async function protectPreviews(enabled: boolean) {
  if (Platform.OS === 'android') {
    if (enabled) await ScreenCapture.preventScreenCaptureAsync(CAPTURE_KEY);
    else await ScreenCapture.allowScreenCaptureAsync(CAPTURE_KEY);
  } else if (Platform.OS === 'ios') {
    if (enabled) await ScreenCapture.enableAppSwitcherProtectionAsync(1);
    else await ScreenCapture.disableAppSwitcherProtectionAsync();
  }
}

export function AppLock({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'locked' | 'unlocked' | 'error'>('loading');
  const [enabled, updateEnabled] = useState(false);
  const enabledRef = useRef(false);
  const authenticating = useRef(false);
  const autoPrompt = useRef(true);

  const load = useCallback(async () => {
    try {
      const stored = await isAuthEnabled();
      await protectPreviews(stored);
      enabledRef.current = stored;
      updateEnabled(stored);
      setStatus(stored ? 'locked' : 'unlocked');
    } catch {
      // An unreadable secure setting must never result in an unlocked app.
      setStatus('error');
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' && enabledRef.current && !authenticating.current) {
        autoPrompt.current = true;
        setStatus('locked');
      }
    });
    return () => subscription.remove();
  }, []);

  const authenticate = useCallback(async () => {
    if (authenticating.current) return false;
    authenticating.current = true;
    try {
      return await authenticateUser();
    } finally {
      authenticating.current = false;
      if (AppState.currentState === 'background' && enabledRef.current) {
        autoPrompt.current = true;
        setStatus('locked');
      }
    }
  }, []);

  const unlock = useCallback(async () => {
    if (isInBackground()) return;
    if (await authenticate()) {
      if (!isInBackground()) setStatus('unlocked');
    }
  }, [authenticate]);

  useEffect(() => {
    if (status !== 'locked') return;
    const promptOnce = () => {
      if (!autoPrompt.current) return;
      autoPrompt.current = false;
      void unlock();
    };
    if (AppState.currentState !== 'background') void Promise.resolve().then(promptOnce);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') promptOnce(); });
    return () => subscription.remove();
  }, [status, unlock]);

  const setEnabled = useCallback(async (value: boolean) => {
    await protectPreviews(value);
    enabledRef.current = value;
    updateEnabled(value);
    setStatus('unlocked');
  }, []);

  if (status !== 'unlocked') return <View className="flex-1 items-center justify-center bg-[#FBF8F3] px-8">
    <Text accessibilityRole="header" className="text-center text-[25px] font-bold text-[#102238]">{status === 'error' ? 'App lock unavailable' : status === 'loading' ? 'Opening DoseTracker…' : 'DoseTracker is locked'}</Text>
    {status !== 'loading' && <>
      <Text className="mt-3 text-center text-[15px] leading-6 text-[#536073]">{status === 'error' ? 'The secure app-lock setting could not be read. Try again after unlocking your phone.' : 'Use your phone’s fingerprint, face, or screen lock to continue.'}</Text>
      <Pressable accessibilityRole="button" onPress={() => { if (status === 'error') { setStatus('loading'); void load(); } else void unlock(); }} className="mt-6 min-h-[48px] justify-center rounded-full bg-[#0B2540] px-8"><Text className="font-semibold text-white">{status === 'error' ? 'Try again' : 'Unlock'}</Text></Pressable>
    </>}
  </View>;

  return <LockContext.Provider value={{ enabled, setEnabled, authenticate }}>{children}</LockContext.Provider>;
}

export function useAppLock() {
  const value = useContext(LockContext);
  if (!value) throw new Error('AppLock is required.');
  return value;
}
