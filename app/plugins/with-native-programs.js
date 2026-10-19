// Tor bridges need lyrebird, a program Tor starts, carried among the native libraries as
// liblyrebird.so (modules/erevos-core/android/build.gradle). Android runs no program from the
// app's own folders, only from the folder it unpacks the native libraries into, and unpacks them
// only with legacy packaging, so this turns it on. The program is kept as it was built, not
// stripped again.
const { withGradleProperties } = require('expo/config-plugins');

const PROPERTIES = {
  'expo.useLegacyPackaging': 'true',
  'android.packagingOptions.doNotStrip': '**/liblyrebird.so',
};

module.exports = function withNativePrograms(config) {
  return withGradleProperties(config, (c) => {
    for (const [key, value] of Object.entries(PROPERTIES)) {
      c.modResults = c.modResults.filter((item) => !(item.type === 'property' && item.key === key));
      c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });
};
