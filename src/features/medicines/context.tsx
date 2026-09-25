import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

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
};

const INITIAL_MEDICINES: Medicine[] = [
  { id: 'levothyroxine', name: 'Levothyroxine', dosage: '50 mcg tablet', time: '7:00 AM', next: 'Tomorrow', tag: 'On empty stomach', color: '#31C47A', filled: true, status: 'Active' },
  { id: 'lisinopril', name: 'Lisinopril', dosage: '10 mg tablet', time: '8:00 AM', next: 'Tomorrow', tag: 'With food', stock: 8, color: '#00B7BD', status: 'Active', purpose: 'Blood pressure', notes: 'Take with food to reduce stomach upset.' },
  { id: 'atorvastatin', name: 'Atorvastatin', dosage: '20 mg tablet', time: '1:00 PM', next: 'Today', tag: 'After meal', color: '#FFA72E', filled: true, status: 'Active' },
  { id: 'metformin', name: 'Metformin', dosage: '500 mg tablet', time: '8:00 PM', next: 'Today', tag: 'With dinner', color: '#3297FF', status: 'Active' },
  { id: 'vitamin-d3', name: 'Vitamin D3', dosage: '1000 IU softgel', color: '#8845FA', status: 'Active' },
];
type MedicinesContextValue = { medicines: Medicine[]; setMedicines: Dispatch<SetStateAction<Medicine[]>> };
const MedicinesContext = createContext<MedicinesContextValue | null>(null);

// Session-only sample data for the reference screens; no real dose records are changed.
export function MedicinesProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState(INITIAL_MEDICINES);
  return <MedicinesContext.Provider value={{ medicines, setMedicines }}>{children}</MedicinesContext.Provider>;
}

export function useMedicines() {
  const context = useContext(MedicinesContext);
  if (!context) throw new Error('MedicinesProvider is required.');
  return context;
}
