import { useState, type ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/features/theme/ThemeContext';
import { motion } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number;
  /** Android ripple tint; defaults to a neutral state layer for the current theme. */
  rippleColor?: string;
};

/**
 * Pressable with immediate press-in feedback. iOS and web: a slight scale plus dim, as a CSS transition on
 * the UI thread (Reduce Motion keeps only the dim). Android: the Material ripple state layer.
 * `style` must be a static style, not a function.
 */
export function PressableScale(props: Props) {
  return Platform.OS === 'android' ? <RipplePressable {...props} /> : <ScalePressable {...props} />;
}

function RipplePressable({ style, children, disabled, rippleColor, scaleTo: _scaleTo, ...props }: Props) {
  const { isDark } = useTheme();
  return <Pressable {...props} disabled={disabled}
    android_ripple={{ color: rippleColor ?? (isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(14, 26, 43, 0.12)'), foreground: true }}
    style={[style, disabled ? { opacity: 0.4 } : null]}>
    {children}
  </Pressable>;
}

function ScalePressable({ style, children, scaleTo = 0.97, disabled, onPressIn, onPressOut, rippleColor: _rippleColor, ...props }: Props) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();
  const active = pressed && !disabled;
  return <AnimatedPressable {...props} disabled={disabled}
    pressRetentionOffset={{ top: 16, bottom: 16, left: 16, right: 16 }}
    onPressIn={event => { setPressed(true); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); onPressOut?.(event); }}
    style={[style, {
      opacity: disabled ? 0.4 : active ? 0.82 : 1,
      transform: [{ scale: active && !reduceMotion ? scaleTo : 1 }],
      transitionProperty: ['opacity', 'transform'],
      transitionDuration: motion.press,
      transitionTimingFunction: 'ease-out',
    }]}>
    {children}
  </AnimatedPressable>;
}
