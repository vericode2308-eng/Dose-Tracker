import { publicErrorMessage } from '@/features/security/errors';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { subscribeToDatabaseChanges } from '@/database';

/** Reload on navigation, commits, and returning from Android system settings. */
export function useLocalQuery<T>(query: () => Promise<T>, initial: T, intervalMs?: number) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    try {
      const result = await query();
      if (request === generation.current) { setData(result); setError(''); }
    } catch (error) {
      if (request === generation.current) setError(publicErrorMessage(error, 'Local data could not be loaded.'));
    } finally { if (request === generation.current) setLoading(false); }
  }, [query]);
  useFocusEffect(useCallback(() => {
    void reload();
    const unsubscribe = subscribeToDatabaseChanges(() => void reload());
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void reload(); });
    const timer = intervalMs ? setInterval(() => void reload(), intervalMs) : undefined;
    return () => { generation.current++; unsubscribe(); subscription.remove(); if (timer) clearInterval(timer); };
  }, [reload, intervalMs]));
  return { data, loading, error, reload };
}
