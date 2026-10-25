import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { INITIAL_DATA, type OnboardingData } from './model';
import { clearOnboarding, onboardingFlags, writeOnboarding } from './storage';
import { loadOnboarding } from './migration';
import { useTheme } from '@/features/theme/ThemeContext';

type Context = { data: OnboardingData; save: (patch: Partial<OnboardingData>) => Promise<void>; reset: () => Promise<void> };
const OnboardingContext = createContext<Context | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(INITIAL_DATA);
  const current = useRef(data);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      const stored = await loadOnboarding();
      current.current = stored;
      setData(stored);
      setFailed(false);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    loadOnboarding().then((stored) => {
      if (!active) return;
      current.current = stored;
      setData(stored);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setFailed(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const save = useCallback(async (patch: Partial<OnboardingData>) => {
    const next = onboardingFlags({ ...current.current, ...patch });
    await writeOnboarding(next);
    current.current = next;
    setData(next);
  }, []);
  const reset = useCallback(async () => {
    await clearOnboarding();
    current.current = INITIAL_DATA;
    setData(INITIAL_DATA);
  }, []);
  const { colors } = useTheme();
  if (loading || failed) return (
    <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.background }}>
      {loading ? <ActivityIndicator accessibilityLabel="Loading your local setup" color={colors.secondaryLabel} /> : <>
        <Text className="text-center text-lg" style={{ color: colors.label }}>Your saved setup couldn’t be opened.</Text>
        <Pressable accessibilityRole="button" onPress={() => { setLoading(true); void load(); }} className="mt-6 rounded-pill px-8 py-4" style={{ backgroundColor: colors.primary }}><Text style={{ color: colors.onPrimary }}>Try again</Text></Pressable>
      </>}
    </View>
  );
  return <OnboardingContext.Provider value={{ data, save, reset }}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('OnboardingProvider is required.');
  return context;
}
