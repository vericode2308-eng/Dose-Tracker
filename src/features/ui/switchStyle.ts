import type { ViewStyle } from 'react-native';

/**
 * On iOS the native switch sits at the top of its row unless it centres itself, so a row's own `alignItems`
 * leaves it high beside two-line text. Spread onto every `<Switch style={...}>`.
 */
export const switchStyle: ViewStyle = { alignSelf: 'center' };
