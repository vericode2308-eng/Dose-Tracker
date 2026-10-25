import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { darkColors, lightColors } from '../../../theme';
import { readSettings, writeSettings, type SettingsPreferences } from '@/features/settings/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

type SemanticColors = typeof lightColors;

export interface ThemeColors extends SemanticColors {
  isDark: boolean;
  /** @deprecated Use `surface`. */
  card: string;
  /** @deprecated Cards use a hairline `separator` border in dark mode only. */
  cardBorder: string;
  /** @deprecated Use `label`. */
  ink: string;
  /** @deprecated Use `secondaryLabel`. */
  secondary: string;
  /** @deprecated Use `fill`. */
  pill: string;
  /** @deprecated Use `separator`. */
  border: string;
  /** @deprecated Use `primary`. */
  tabBarActive: string;
  /** @deprecated Use `secondaryLabel`. */
  tabBarInactive: string;
  /** @deprecated Use `surfaceSecondary`. */
  subtleBg: string;
}

function withAliases(colors: SemanticColors, isDark: boolean): ThemeColors {
  return {
    ...colors,
    isDark,
    card: colors.surface,
    cardBorder: isDark ? colors.separator : 'transparent',
    ink: colors.label,
    secondary: colors.secondaryLabel,
    pill: colors.fill,
    border: colors.separator,
    tabBarActive: colors.primary,
    tabBarInactive: colors.secondaryLabel,
    subtleBg: colors.surfaceSecondary,
  };
}

const LIGHT = withAliases(lightColors, false);
const DARK = withAliases(darkColors, true);

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => Promise<void>;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDark: false,
  colors: LIGHT,
  setTheme: async () => {},
  refreshTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');

  const refreshTheme = useCallback(async () => {
    try {
      const prefs = await readSettings();
      if (prefs?.theme) {
        setThemeState(prefs.theme);
      }
    } catch {
      // Fallback to default
    }
  }, []);

  useEffect(() => {
    readSettings().then(prefs => setThemeState(prefs.theme)).catch(() => undefined);
  }, []);

  // Native views (alerts, pickers, menus, keyboards, @expo/ui, headers) follow the window's
  // appearance, not React state, so mirror an explicit in-app choice onto the window.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      const current = await readSettings().catch(() => ({}) as SettingsPreferences);
      await writeSettings({ ...current, theme: newTheme });
    } catch {
      // Ignore write errors
    }
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && systemScheme === 'dark');
  const colors = isDark ? DARK : LIGHT;

  // The root view shows behind sheets, keyboards and transitions; keep it on-theme.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      colors,
      setTheme,
      refreshTheme,
    }),
    [theme, isDark, colors, setTheme, refreshTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
