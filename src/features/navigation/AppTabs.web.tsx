import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '@/features/theme/ThemeContext';

// Native tabs have no web tab bar; the web preview keeps a themed JS tab bar instead.
export function AppTabs() {
  const { colors } = useTheme();
  return <Tabs screenOptions={{
    headerShown: false,
    sceneStyle: { backgroundColor: colors.background },
    tabBarActiveTintColor: colors.accentText,
    tabBarInactiveTintColor: colors.secondaryLabel,
    tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.separator },
  }}>
    <Tabs.Screen name="(today)" options={{ title: 'Today', tabBarIcon: ({ color, size }) => <Feather name="sun" color={color} size={size} /> }} />
    <Tabs.Screen name="(history)" options={{ title: 'History', tabBarIcon: ({ color, size }) => <Feather name="clock" color={color} size={size} /> }} />
    <Tabs.Screen name="(settings)" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={size} /> }} />
  </Tabs>;
}
