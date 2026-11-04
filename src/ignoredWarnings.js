import { LogBox } from 'react-native';

// NativeWind's css-interop wraps every React Native component at import, including the deprecated
// ImageBackground, which the app never renders. This must load before any JSX module.
// Remove once NativeWind stops touching ImageBackground.
LogBox.ignoreLogs(['ImageBackground is deprecated']);
