import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { motion } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable with immediate press-in feedback: a slight scale plus dim, as a CSS transition on
 * the UI thread. Reduce Motion keeps only the dim. `style` must be a static style, not a function.
 */
export function PressableScale({ style, children, scaleTo = 0.97, disabled, onPressIn, onPressOut, ...props }: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number;
}) {
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
