import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { readSettings, writeSettings, type SettingsPreferences } from '@/features/settings/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  isDark: boolean;
  background: string;     // '#0B1220' (dark) | '#FBF8F3' (light)
  surface: string;        // '#1F2937' (dark) | '#FFFFFF' (light)
  card: string;           // '#1F2937' (dark) | '#FFFFFF' (light)
  cardBorder: string;     // '#374151' (dark) | 'transparent' (light)
  ink: string;            // '#F8FAFC' (dark) | '#071629' (light)
  secondary: string;      // '#94A3B8' (dark) | '#536073' (light)
  pill: string;           // '#374151' (dark) | '#F2F3F5' (light)
  border: string;         // '#374151' (dark) | '#E5E7EB' (light)
  tabBar: string;         // '#142337' (dark) | '#FFFFFF' (light)
  tabBarActive: string;   // '#08B8BE' (dark) | '#071629' (light)
  tabBarInactive: string; // '#94A3B8' (dark) | '#536073' (light)
  accent: string;         // '#08B8BE'
  subtleBg: string;       // '#111827' (dark) | '#F1EEEA' (light)
}

const darkColors: ThemeColors = {
  isDark: true,
  background: '#0B1220',
  surface: '#1F2937',
  card: '#1F2937',
  cardBorder: '#374151',
  ink: '#F8FAFC',
  secondary: '#94A3B8',
  pill: '#374151',
  border: '#374151',
  tabBar: '#142337',
  tabBarActive: '#08B8BE',
  tabBarInactive: '#94A3B8',
  accent: '#08B8BE',
  subtleBg: '#111827',
};

const lightColors: ThemeColors = {
  isDark: false,
  background: '#FBF8F3',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: 'transparent',
  ink: '#071629',
  secondary: '#536073',
  pill: '#F2F3F5',
  border: '#E5E7EB',
  tabBar: '#FFFFFF',
  tabBarActive: '#071629',
  tabBarInactive: '#536073',
  accent: '#08B8BE',
  subtleBg: '#F1EEEA',
};

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
  colors: lightColors,
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
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

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
