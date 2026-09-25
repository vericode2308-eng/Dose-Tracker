import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { INITIAL_DATA, type OnboardingData } from './model';
import { readOnboarding, writeOnboarding } from './storage';

type Context = { data: OnboardingData; save: (patch: Partial<OnboardingData>) => Promise<void> };
const OnboardingContext = createContext<Context | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(INITIAL_DATA);
  const current = useRef(data);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      const stored = await readOnboarding();
      current.current = stored;
      setData(stored);
      setFailed(false);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    readOnboarding().then((stored) => {
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
    const next = { ...current.current, ...patch };
    await writeOnboarding(next);
    current.current = next;
    setData(next);
  }, []);
  if (loading || failed) return (
    <View className="flex-1 items-center justify-center bg-luminous p-6">
      {loading ? <ActivityIndicator accessibilityLabel="Loading your local setup" color="#0B2540" /> : <>
        <Text className="text-center text-lg text-medical">Your saved setup couldn’t be opened.</Text>
        <Pressable accessibilityRole="button" onPress={() => { setLoading(true); void load(); }} className="mt-6 rounded-pill bg-medical px-8 py-4"><Text className="text-white">Try again</Text></Pressable>
      </>}
    </View>
  );
  return <OnboardingContext.Provider value={{ data, save }}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('OnboardingProvider is required.');
  return context;
}
