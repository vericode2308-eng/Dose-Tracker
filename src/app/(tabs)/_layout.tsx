import { Tabs, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/features/theme/ThemeContext';

export default function DashboardLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { colors, isDark } = useTheme();
  const hideTabBar = pathname === '/medicines' || pathname.startsWith('/medicine/')
    || pathname === '/add-medicine' || pathname === '/edit-medicine';
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View className="w-full max-w-[440px] flex-1 self-center">
      <Tabs screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: isDark ? '#FFFFFF' : '#071629',
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: { fontSize: 13, lineHeight: 18, flexShrink: 0, marginTop: 3 },
        tabBarStyle: {
          display: hideTabBar ? 'none' : 'flex',
          height: 76 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(8, insets.bottom),
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: colors.tabBar,
          elevation: 0
        },
        tabBarIconStyle: { height: 36 },
        tabBarItemStyle: { flexDirection: 'column', paddingVertical: 0 }
      }}>
        {([{ name: '(today)', label: 'Today', icon: 'home' }, { name: 'history', label: 'History', icon: 'clock' }, { name: 'settings', label: 'Settings', icon: 'settings' }] as const).map(item =>
          <Tabs.Screen key={item.name} name={item.name} options={{
            title: item.label,
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.tabIcon, { backgroundColor: focused ? (isDark ? '#08B8BE' : '#071629') : 'transparent' }]}>
                <Feather name={item.icon} size={23} color={focused ? '#FFFFFF' : color} />
              </View>
            )
          }} />
        )}
      </Tabs>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  // Keep the pill geometry on the native view across focus and stack transitions.
  tabIcon: {
    width: 48,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
