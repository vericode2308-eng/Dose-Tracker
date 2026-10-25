import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { motion } from '../../../theme';

export { motion };

/** Strong ease-out for UI that enters or responds to the user. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Movement between two on-screen positions. */
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

// Layout animations for frequent list changes (marking doses) stay at or under 150ms and
// collapse to an opacity change when the system Reduce Motion setting is on.
export const listItemEntering = FadeIn.duration(motion.fast).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
export const listItemExiting = FadeOut.duration(motion.fast).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
export const listItemLayout = LinearTransition.duration(motion.base).easing(EASE_IN_OUT).reduceMotion(ReduceMotion.System);

// Occasional surfaces (snackbars, banners) get a short rise.
export const toastEntering = FadeInDown.duration(motion.base).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
export const toastExiting = FadeOut.duration(motion.fast).reduceMotion(ReduceMotion.System);
