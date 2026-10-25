import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';
import { useTheme } from '@/features/theme/ThemeContext';

type SFSymbol = Extract<SymbolViewProps['name'], string>;

export type ActionMenuItem = {
  id: string;
  title: string;
  /** SF Symbol shown on iOS. */
  icon?: SFSymbol;
  destructive?: boolean;
  /** Shows a checkmark, for choosing one option from a list. */
  checked?: boolean;
};

/**
 * Native pop-up menu (SwiftUI Menu on iOS, Compose DropdownMenu on Android) opened by tapping
 * the trigger. The trigger must be a plain view: the native menu owns the tap.
 */
export function ActionMenu({ title, items, onSelect, accessibilityLabel, children }: {
  title?: string; items: ActionMenuItem[]; onSelect: (id: string) => void; accessibilityLabel: string; children: ReactNode;
}) {
  const { isDark } = useTheme();
  const actions: MenuAction[] = items.map(item => ({
    id: item.id,
    title: item.title,
    image: Platform.OS === 'ios' ? item.icon : undefined,
    state: item.checked === undefined ? undefined : item.checked ? 'on' : 'off',
    attributes: item.destructive ? { destructive: true } : undefined,
  }));
  return <MenuView title={title} actions={actions} colorScheme={isDark ? 'dark' : 'light'}
    onPressAction={event => onSelect(event.nativeEvent.event)}>
    <View accessible accessibilityRole="button" accessibilityLabel={accessibilityLabel}>{children}</View>
  </MenuView>;
}
