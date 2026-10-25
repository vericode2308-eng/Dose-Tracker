/** Android and web keep their dialog and modal pickers; see NativeDatePicker.ios.tsx. */
export const hasInlineNativeDatePicker = false;

export function NativeDatePicker(_props: {
  mode: 'date' | 'time'; value: Date; onChange: (date: Date) => void; minimumDate?: Date; maximumDate?: Date; label: string;
}): null {
  return null;
}
