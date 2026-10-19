// The app's settings are in app.json; this adds what a build changes. The release workflow
// (.github/workflows/release.yml) sets EREVOS_VERSION (0.1.<build>) and EREVOS_BUILD (<build>), so
// each release has its own version and Android installs it over the one before. A build on a
// computer without them keeps app.json's version.
module.exports = ({ config }) => {
  const build = Number(process.env.EREVOS_BUILD || 0);
  return {
    ...config,
    version: process.env.EREVOS_VERSION || config.version,
    android: { ...config.android, ...(build > 0 ? { versionCode: build } : {}) },
    plugins: [...(config.plugins || []), './plugins/with-release-signing', './plugins/with-native-programs'],
  };
};
