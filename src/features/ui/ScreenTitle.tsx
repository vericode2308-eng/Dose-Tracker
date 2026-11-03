import { Stack } from 'expo-router';
import { useTheme } from '@/features/theme/ThemeContext';
import { AppText } from '@/features/ui/AppText';

/**
 * Puts the screen title at the left of the native header row instead of in a large-title area of its own,
 * so the content starts right under the status bar. Render it inside the screen, after the ScrollView.
 * The header is opaque: a transparent one lets scrolling content draw through the floating title.
 */
export function ScreenTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return <>
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.View hidesSharedBackground>
        <AppText accessibilityRole="header" variant="title1" numberOfLines={1} maxFontSizeMultiplier={1.2}>{title}</AppText>
      </Stack.Toolbar.View>
    </Stack.Toolbar>
    <Stack.Screen options={{
      headerLargeTitleEnabled: false, headerTitle: '', headerTransparent: false, headerBlurEffect: undefined,
      headerStyle: { backgroundColor: colors.background },
    }} />
  </>;
}
