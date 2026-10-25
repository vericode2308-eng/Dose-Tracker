import { Stack } from 'expo-router';
import { AppText } from '@/features/ui/AppText';

/**
 * Puts the screen title at the left of the native header row instead of in a large-title area of its own,
 * so the content starts right under the status bar. Render it inside the screen; pass `headerRight` for actions.
 */
export function ScreenTitle({ title }: { title: string }) {
  return <>
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.View hidesSharedBackground>
        <AppText accessibilityRole="header" variant="title1" numberOfLines={1} maxFontSizeMultiplier={1.2}>{title}</AppText>
      </Stack.Toolbar.View>
    </Stack.Toolbar>
    <Stack.Screen options={{ headerLargeTitleEnabled: false, headerTitle: '' }} />
  </>;
}
