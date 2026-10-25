import { useState, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { Button } from './Button';
import { Sheet } from './Sheet';
import type { ActionMenuItem } from './ActionMenu';

export type { ActionMenuItem } from './ActionMenu';

/** Web has no native pop-up menu, so the same actions open in the shared sheet. */
export function ActionMenu({ title, items, onSelect, accessibilityLabel, children }: {
  title?: string; items: ActionMenuItem[]; onSelect: (id: string) => void; accessibilityLabel: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => setOpen(true)}>{children}</Pressable>
    <Sheet visible={open} title={title || accessibilityLabel} onClose={() => setOpen(false)}>
      {items.map(item => <Button key={item.id} title={item.checked ? `✓ ${item.title}` : item.title}
        variant={item.destructive ? 'destructiveSoft' : 'secondary'} onPress={() => { setOpen(false); onSelect(item.id); }} />)}
    </Sheet>
  </>;
}
