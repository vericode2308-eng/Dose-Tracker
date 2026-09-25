import { Tabs, usePathname } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isMedicines = pathname === '/medicines' || pathname.startsWith('/medicine/');
  return <View className="flex-1 bg-[#FBF8F3]">
    <View className="w-full max-w-[440px] flex-1 self-center">
      <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FBF8F3' }, tabBarActiveTintColor: '#071629', tabBarInactiveTintColor: '#536073', tabBarLabelStyle: { fontSize: 13, lineHeight: 18, flexShrink: 0, marginTop: 3 }, tabBarStyle: { height: 76 + insets.bottom, paddingTop: 7, paddingBottom: Math.max(8, insets.bottom), borderTopWidth: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFFFFF', elevation: 0 }, tabBarIconStyle: { height: 36 }, tabBarItemStyle: { flexDirection: 'column', paddingVertical: 0 } }}>
        {([{ name: '(today)', label: 'Today', icon: 'home' }, { name: 'history', label: 'History', icon: 'clock' }, { name: 'settings', label: 'Settings', icon: 'settings' }] as const).map(item => <Tabs.Screen key={item.name} name={item.name} options={{ title: item.label, tabBarIcon: ({ focused, color }) => <View className="h-9 w-12 items-center justify-center rounded-full" style={{ backgroundColor: focused && !isMedicines ? '#071629' : 'transparent' }}>{focused && isMedicines ? <Ionicons name="home" size={25} color="#071629" /> : <Feather name={item.icon} size={23} color={focused ? '#FFFFFF' : color} />}</View> }} />)}
      </Tabs>
    </View>
  </View>;
}
