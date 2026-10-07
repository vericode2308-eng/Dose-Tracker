const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

// Expo SDK 57 / AGP 8.12. Keep this in source, never edit generated android/.
module.exports = function withAndroidRelease(config) {
  config = withGradleProperties(config, config => {
    const properties = {
      'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1536m',
      'android.enableR8.fullMode': 'true',
      'android.r8.optimizedResourceShrinking': 'true',
    };
    config.modResults = config.modResults.filter(item => !Object.hasOwn(properties, item.key));
    for (const [key, value] of Object.entries(properties)) {
      config.modResults.push({ type: 'property', key, value });
    }
    return config;
  });
  return withAppBuildGradle(config, config => {
    const pattern = /getDefaultProguardFile\((["'])proguard-android(?:-optimize)?\.txt\1\)/g;
    if (config.modResults.language !== 'groovy' || !pattern.test(config.modResults.contents)) {
      throw new Error('Android release template changed: review the R8 configuration before building.');
    }
    config.modResults.contents = config.modResults.contents.replace(
      pattern, 'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
    const hook = 'apply from: new File(rootDir, "../plugins/android-release.gradle")';
    if (!config.modResults.contents.includes(hook)) config.modResults.contents += `\n${hook}\n`;
    return config;
  });
};
