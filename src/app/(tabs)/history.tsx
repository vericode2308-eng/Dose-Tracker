import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function HistoryScreen() {
  return <SafeAreaView className="flex-1 px-5" edges={['top']}><Text className="mb-5 mt-6 text-3xl font-bold text-[#071629]">Dose history</Text><Text className="mb-4 text-base text-[#536073]">Tue, 25 Sep 2024 · Demo records</Text><View className="gap-5 rounded-3xl bg-white p-5"><Text className="text-base text-[#071629]">✓ Lisinopril · Taken at 8:05 AM</Text><Text className="text-base text-[#071629]">✓ Levothyroxine · Taken at 7:03 AM</Text></View></SafeAreaView>;
}
