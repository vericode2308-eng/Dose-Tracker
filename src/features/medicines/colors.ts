export type MedicineColor = { name: string; value: string };

export const MEDICINE_COLORS: MedicineColor[] = [
  { name: 'Teal', value: '#079D9D' },
  { name: 'Blue', value: '#3297FF' },
  { name: 'Orange', value: '#FFA72E' },
  { name: 'Purple', value: '#8845FA' },
  { name: 'Pink', value: '#DB4688' },
  { name: 'Green', value: '#43883B' },
  { name: 'Red', value: '#D94747' },
  { name: 'Slate', value: '#64748B' },
];

// Pick once per draft. Random ties spread new medicines across the palette.
export function chooseMedicineColor(medicines: { color: string; status?: string }[], random = Math.random): MedicineColor {
  const counts = MEDICINE_COLORS.map(color => medicines.filter(medicine =>
    medicine.status !== 'Archived' && medicine.color.toLowerCase() === color.value.toLowerCase()).length);
  const minimum = Math.min(...counts);
  const candidates = MEDICINE_COLORS.filter((_, index) => counts[index] === minimum);
  return candidates[Math.floor(random() * candidates.length)];
}
