import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps, type SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type SFSymbol = Extract<SymbolViewProps['name'], string>;

type Fallback =
  | { feather: ComponentProps<typeof Feather>['name'] }
  | { mci: ComponentProps<typeof MaterialCommunityIcons>['name'] };

// One registry keeps glyphs consistent: SF Symbols on iOS, the existing vector set elsewhere.
const ICONS = {
  back: { sf: 'chevron.backward', feather: 'arrow-left' },
  close: { sf: 'xmark', feather: 'x' },
  edit: { sf: 'pencil', feather: 'edit-2' },
  more: { sf: 'ellipsis.circle', feather: 'more-vertical' },
  pill: { sf: 'pills.fill', mci: 'pill' },
  calendar: { sf: 'calendar', feather: 'calendar' },
  clock: { sf: 'clock', feather: 'clock' },
  duration: { sf: 'infinity', mci: 'infinity' },
  dose: { sf: 'capsule', mci: 'pill' },
  stock: { sf: 'shippingbox', feather: 'archive' },
  refill: { sf: 'plus.circle.fill', feather: 'plus-circle' },
  notes: { sf: 'note.text', feather: 'file-text' },
  purpose: { sf: 'heart.text.square', mci: 'heart-pulse' },
  pause: { sf: 'pause.circle', feather: 'pause' },
  resume: { sf: 'play.circle', feather: 'play' },
  archive: { sf: 'archivebox', feather: 'archive' },
  restore: { sf: 'arrow.uturn.backward.circle', feather: 'rotate-ccw' },
  trash: { sf: 'trash', feather: 'trash-2' },
  taken: { sf: 'checkmark', feather: 'check' },
  skipped: { sf: 'minus', feather: 'minus' },
  check: { sf: 'checkmark', feather: 'check' },
  checkCircle: { sf: 'checkmark.circle.fill', feather: 'check-circle' },
  lock: { sf: 'lock.fill', feather: 'lock' },
  warning: { sf: 'exclamationmark.triangle.fill', feather: 'alert-triangle' },
  info: { sf: 'info.circle.fill', feather: 'info' },
  chevronRight: { sf: 'chevron.forward', feather: 'chevron-right' },
  arrowRight: { sf: 'arrow.forward', feather: 'arrow-right' },
  history: { sf: 'clock.arrow.circlepath', feather: 'clock' },
  bell: { sf: 'bell', feather: 'bell' },
  undo: { sf: 'arrow.uturn.backward', feather: 'rotate-ccw' },
  medicines: { sf: 'pills', mci: 'pill-multiple' },
  profiles: { sf: 'person.2.fill', feather: 'users' },
  appearance: { sf: 'circle.lefthalf.filled', feather: 'sun' },
  privacyEye: { sf: 'eye.slash.fill', feather: 'eye-off' },
  sound: { sf: 'speaker.wave.2.fill', feather: 'volume-2' },
  test: { sf: 'paperplane.fill', feather: 'send' },
  status: { sf: 'checklist', feather: 'activity' },
  alarm: { sf: 'alarm.fill', feather: 'clock' },
  systemSettings: { sf: 'gearshape.fill', feather: 'settings' },
  export: { sf: 'square.and.arrow.up', feather: 'upload' },
  import: { sf: 'square.and.arrow.down', feather: 'download' },
  aboutApp: { sf: 'info.circle.fill', feather: 'info' },
  policy: { sf: 'hand.raised.fill', feather: 'shield' },
  terms: { sf: 'doc.text.fill', feather: 'file-text' },
  external: { sf: 'arrow.up.right', feather: 'external-link' },
  add: { sf: 'plus', feather: 'plus' },
  snooze: { sf: 'moon.zzz', feather: 'moon' },
  emptyDay: { sf: 'sun.max', feather: 'sun' },
} as const satisfies Record<string, { sf: SFSymbol } & Fallback>;

export type IconName = keyof typeof ICONS;

/** Decorative by default; give the surrounding control the accessibility label. */
export function Icon({ name, size = 22, color, weight = 'medium' }: {
  name: IconName; size?: number; color: ColorValue; weight?: SymbolWeight;
}) {
  const icon: { sf: SFSymbol } & Partial<{ feather: ComponentProps<typeof Feather>['name']; mci: ComponentProps<typeof MaterialCommunityIcons>['name'] }> = ICONS[name];
  const fallback = icon.feather
    ? <Feather name={icon.feather} size={size} color={color as string} />
    : <MaterialCommunityIcons name={icon.mci!} size={size} color={color as string} />;
  return <SymbolView name={icon.sf} size={size} tintColor={color} weight={weight} fallback={fallback}
    accessible={false} importantForAccessibility="no-hide-descendants" />;
}
