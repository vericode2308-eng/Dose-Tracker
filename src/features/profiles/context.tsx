import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { fetchProfileState, selectProfile, subscribeToDatabaseChanges, type ProfileSummary } from '@/database';

type ProfilesContext = { profiles: ProfileSummary[]; currentProfile: ProfileSummary | null; refresh: () => Promise<void>; select: (id: string) => Promise<void>; visible: boolean; showSwitcher: () => void; hideSwitcher: () => void };
const Context = createContext<ProfilesContext | null>(null);
export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ profiles: ProfileSummary[]; activeProfileId: string | null }>({ profiles: [], activeProfileId: null });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try { const next = await fetchProfileState(); if (request === generation.current) { setState(next); setReady(true); setError(''); } }
    catch (e) { if (request === generation.current) setError('Your profiles could not be loaded. Please retry.'); throw e; }
  }, []);
  useEffect(() => {
    const load = () => { void refresh().catch(() => {}); };
    load();
    const requests = generation;
    const unsubscribe = subscribeToDatabaseChanges(load);
    const timer = setInterval(load, 30000);
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') load(); });
    return () => { requests.current++; unsubscribe(); clearInterval(timer); subscription.remove(); };
  }, [refresh]);
  const select = async (id: string) => { await selectProfile(id); await refresh(); setVisible(false); };
  if (!ready) return <View className="flex-1 items-center justify-center bg-[#FBF8F3] p-6"><Text>{error || 'Opening profiles…'}</Text>{!!error && <Pressable accessibilityRole="button" onPress={() => void refresh().catch(() => {})} className="p-4"><Text>Retry</Text></Pressable>}</View>;
  return <Context.Provider value={{ ...state, currentProfile: state.profiles.find(p => p.id === state.activeProfileId) || null, refresh, select, visible, showSwitcher: () => setVisible(true), hideSwitcher: () => setVisible(false) }}>{children}</Context.Provider>;
}
export function useProfiles() { const value = useContext(Context); if (!value) throw new Error('ProfilesProvider is required.'); return value; }
