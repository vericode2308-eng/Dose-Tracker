import { createContext, useContext, useState, useEffect, useCallback, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { useProfiles } from '@/features/profiles/context';
import { fetchAllMedicines, subscribeToDatabaseChanges } from '@/database';

export type Medicine = {
  id: string;
  name: string;
  dosage: string;
  time?: string;
  next?: string;
  tag?: string;
  stock?: number;
  color: string;
  filled?: boolean;
  status: 'Active' | 'Paused' | 'Archived';
  purpose?: string;
  notes?: string;
  form?: string;
  strength?: string;
  doseAmount?: string;
  schedule?: string;
  startDate?: string;
  duration?: string;
  stockThreshold?: number;
  instructions?: string;
};

type MedicinesContextValue = { medicines: Medicine[]; setMedicines: Dispatch<SetStateAction<Medicine[]>>; error: string; loading: boolean; refresh: () => void };
const MedicinesContext = createContext<MedicinesContextValue | null>(null);

// SQLite is authoritative; the context is a view cache for the medicine screens.
export function MedicinesProvider({ children }: { children: ReactNode }) {
  const { currentProfile } = useProfiles();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [ownerId, setOwnerId] = useState<string | undefined>();
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey(value => value + 1), []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let generation = 0;
    const load = () => { const request = ++generation; return fetchAllMedicines({ profileId: currentProfile?.id }).then(stored => {
      if (!active || request !== generation) return;
      setOwnerId(currentProfile?.id);
      setError('');
      setMedicines(stored.map(m => ({ id: m.id, name: m.name,
        dosage: [m.strength, m.dosageForm].filter(Boolean).join(' '),
        color: m.color || '#079D9D', status: m.status, form: m.dosageForm,
        purpose: m.purpose || undefined, notes: m.notes || undefined,
        instructions: m.instructions || undefined, stock: m.stockRemaining ?? undefined,
        strength: m.strength || undefined, stockThreshold: m.lowStockThreshold ?? undefined,
        doseAmount: m.schedules[0] ? `${m.schedules[0].doseAmount} ${m.doseUnit || m.dosageForm}` : undefined,
        startDate: m.schedules[0]?.pattern.startDate,
        duration: m.schedules[0]?.pattern.endDate ? `Until ${m.schedules[0].pattern.endDate}` : 'Ongoing',
        schedule: m.schedules[0]?.pattern.kind === 'weekdays' ? `Weekdays: ${m.schedules[0].pattern.weekdays?.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')}`
          : m.schedules[0]?.pattern.kind === 'prn' ? 'As needed'
          : m.schedules[0]?.pattern.kind === 'day_interval' ? `Every ${m.schedules[0].pattern.interval} days`
          : m.schedules[0]?.pattern.kind === 'hour_interval' ? `Every ${m.schedules[0].pattern.interval} hours` : undefined,
        time: m.schedules[0]?.timeLocalMinute == null ? undefined : `${String(Math.floor(m.schedules[0].timeLocalMinute / 60)).padStart(2, '0')}:${String(m.schedules[0].timeLocalMinute % 60).padStart(2, '0')}`,
      })));
    }).catch(() => { if (active) setError('Your medicines could not be loaded. Reopen this screen to retry.'); }).finally(() => { if (active) setLoading(false); }); };
    void load();
    const unsubscribe = subscribeToDatabaseChanges(() => void load());
    return () => { active = false; unsubscribe(); };
  }, [reloadKey, currentProfile?.id]);
  return <MedicinesContext.Provider value={{ medicines: ownerId === currentProfile?.id ? medicines : [], setMedicines, error, loading: loading || ownerId !== currentProfile?.id, refresh }}>{children}</MedicinesContext.Provider>;
}

export function useMedicines() {
  const context = useContext(MedicinesContext);
  if (!context) throw new Error('MedicinesProvider is required.');
  return context;
}
