const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// iOS 27 asserts at launch when an app built with the iOS 27 SDK has no scene life cycle.
// Expo 57 ships ExpoAppSceneDelegate but its bare template does not adopt it yet.
// Remove this plugin once the Expo template declares a scene manifest itself.
const WINDOW_START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, config => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: { UIWindowSceneSessionRoleApplication: [{
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
      }] },
    };
    return config;
  });
  return withAppDelegate(config, config => {
    let contents = config.modResults.contents;
    if (contents.includes('ExpoReactNativeFactoryProvider')) return config;
    if (!contents.includes('class AppDelegate: ExpoAppDelegate {') || !contents.includes(WINDOW_START)) {
      throw new Error('withIosSceneLifecycle: unexpected AppDelegate template; update the plugin.');
    }
    // The scene delegate creates the window and starts React Native from this factory.
    contents = contents.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
      .replace(WINDOW_START, '');
    config.modResults.contents = contents;
    return config;
  });
};
