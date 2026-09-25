import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function SettingsScreen() {
  return <SafeAreaView className="flex-1 px-5" edges={['top']}><Text className="mb-5 mt-6 text-3xl font-bold text-[#071629]">Settings</Text><Pressable accessibilityRole="button" onPress={() => router.push('/profile')} className="rounded-3xl bg-white p-5"><Text className="text-lg text-[#071629]">Manage your profile →</Text></Pressable><Text className="mt-5 text-base text-[#536073]">Your data stays on this device.</Text></SafeAreaView>;
}
