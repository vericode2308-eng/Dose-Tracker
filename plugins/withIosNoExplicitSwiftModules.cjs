const { withPodfile } = require('expo/config-plugins');

const MARKER = '# dosetracker: disable Swift explicit modules';

// Xcode 27 explicit-module builds fail compiling ExpoSQLite
// ("module '_Builtin_stdarg' is needed but has not been provided").
// Remove this plugin once an Expo/Xcode update fixes it.
module.exports = function withIosNoExplicitSwiftModules(config) {
  return withPodfile(config, config => {
    const contents = config.modResults.contents;
    if (contents.includes(MARKER)) return config;
    const patch = `    ${MARKER}
    installer.pods_project.build_configurations.each do |c|
      c.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
    end
    installer.pods_project.targets.each do |t|
      t.build_configurations.each { |c| c.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO' }
    end
`;
    const anchor = /(react_native_post_install\([\s\S]*?\n\s*\)\n)/;
    if (!anchor.test(contents)) {
      throw new Error('withIosNoExplicitSwiftModules: react_native_post_install call not found in Podfile');
    }
    config.modResults.contents = contents.replace(anchor, `$1${patch}`);
    return config;
  });
};
