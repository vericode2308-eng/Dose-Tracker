import { type ReactNode, useEffect, useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Scroll views dismiss the keyboard as the user drags the content down, like Messages and Notes. */
export const keyboardScrollProps = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'on-drag',
} as const;

/**
 * Lifts a pinned footer above the keyboard on iOS. Use it in a screen or sheet that reaches the bottom of the
 * display, inside a SafeAreaView that pads the bottom edge.
 *
 * React Native's KeyboardAvoidingView works out the overlap from its position inside its parent, but a sheet's
 * offset from the top of the display is applied by UIKit and invisible to layout, so inside a sheet it lifts too
 * little and the footer's buttons stay behind the keyboard. Here the lift is the visible keyboard height minus the
 * home-indicator padding the keyboard covers anyway, which does not depend on where the view sits.
 * Android resizes the window itself, so it keeps the stock view.
 */
export function KeyboardAvoider({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { bottom } = useSafeAreaInsets();
  const [lift, setLift] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const subscription = Keyboard.addListener('keyboardWillChangeFrame', event => {
      const visibleKeyboard = Math.max(0, Dimensions.get('window').height - event.endCoordinates.screenY);
      LayoutAnimation.configureNext(LayoutAnimation.create(event.duration || 250, LayoutAnimation.Types.keyboard, LayoutAnimation.Properties.opacity));
      setLift(Math.max(0, visibleKeyboard - bottom));
    });
    return () => subscription.remove();
  }, [bottom]);
  if (Platform.OS !== 'ios') return <KeyboardAvoidingView style={[{ flex: 1 }, style]}>{children}</KeyboardAvoidingView>;
  return <View style={[{ flex: 1, paddingBottom: lift }, style]}>{children}</View>;
}

/**
 * Wraps a fixed header (the part of a screen outside the ScrollView) so a tap on anything that is not a control
 * closes the keyboard. Scroll views already do this for their own content through keyboardShouldPersistTaps="handled".
 * Never wrap a ScrollView in it: on iOS the Pressable claims the touch and the content stops scrolling.
 * Controls keep their own taps; it is invisible to screen readers.
 */
export function DismissKeyboard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessible={false} importantForAccessibility="no" onPress={Keyboard.dismiss} style={style}>{children}</Pressable>;
}
