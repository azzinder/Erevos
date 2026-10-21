// The app's settings are in app.json; this adds what a build changes. The release workflow
// (.github/workflows/release.yml) sets EREVOS_VERSION (2.0.0 and up) and EREVOS_BUILD (the run's
// number, which goes up with every release), so each release has its own version and Android
// installs it over the one before; Updates (app/updates.tsx) reads the build in `extra`. A build on a
// computer without them keeps app.json's version and has no build number.
module.exports = ({ config }) => {
  const build = Number(process.env.EREVOS_BUILD || 0);
  return {
    ...config,
    version: process.env.EREVOS_VERSION || config.version,
    android: { ...config.android, ...(build > 0 ? { versionCode: build } : {}) },
    extra: { ...config.extra, ...(build > 0 ? { build } : {}) },
    plugins: [...(config.plugins || []), './plugins/with-release-signing', './plugins/with-native-programs'],
  };
};
