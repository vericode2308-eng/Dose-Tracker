import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';

const glassSupported = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

export function useReduceTransparency(): boolean {
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (!glassSupported) return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => subscription.remove();
  }, []);
  return reduceTransparency;
}

/**
 * Drop-in bottom-sheet surface: a frosted Liquid Glass panel on iOS 26+ (when the
 * user hasn't enabled Reduce Transparency), otherwise the same solid-color surface
 * every call site previously rendered directly. Edge insets are applied as the
 * surface's own padding in both branches, so the background (color or glass) always
 * paints to the true screen edge while content is inset — matching how backgroundColor
 * already behaved on a padded SafeAreaView, instead of shrinking the glass layer inward.
 */
export function GlassSheetSurface({ tint, edges = [], className, style, children, ...rest }: {
  tint: string;
  edges?: readonly Edge[];
  className?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  [key: string]: unknown;
}) {
  const reduceTransparency = useReduceTransparency();
  const useGlass = glassSupported && !reduceTransparency;
  const insets = useSafeAreaInsets();
  if (!useGlass) {
    return <SafeAreaView {...rest} edges={edges} className={className} style={[{ backgroundColor: tint }, style]}>{children}</SafeAreaView>;
  }
  const edgeStyle: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };
  return <GlassView {...rest} glassEffectStyle="regular" tintColor={tint} className={className} style={[edgeStyle, style]}>{children}</GlassView>;
}
