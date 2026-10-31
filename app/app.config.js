// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The app's settings are in app.json; this adds what a build changes. The release workflow
// (.github/workflows/release.yml) sets EREVOS_VERSION (2.0.0 and up) and EREVOS_BUILD (the run's
// number, which goes up with every release), so each release has its own version and Android
// installs it over the one before; Updates (app/updates.tsx) reads the build in `extra`. A build on a
// computer without them keeps app.json's version and has no build number.
// EREVOS_DISTRIBUTION=fdroid makes the F-Droid build: F-Droid updates it, so it has no Check for
// updates (lib/distribution.ts) and may not install packages. The release workflow does not set it.
const INSTALL_PACKAGES = 'android.permission.REQUEST_INSTALL_PACKAGES';

module.exports = ({ config }) => {
  const build = Number(process.env.EREVOS_BUILD || 0);
  const distribution = process.env.EREVOS_DISTRIBUTION || '';
  if (distribution && distribution !== 'fdroid') throw new Error(`EREVOS_DISTRIBUTION is "${distribution}": only "fdroid" is known`);
  const fdroid = distribution === 'fdroid';
  return {
    ...config,
    version: process.env.EREVOS_VERSION || config.version,
    android: {
      ...config.android,
      ...(build > 0 ? { versionCode: build } : {}),
      ...(fdroid
        ? {
            permissions: (config.android?.permissions || []).filter((permission) => permission !== INSTALL_PACKAGES),
            blockedPermissions: [...(config.android?.blockedPermissions || []), INSTALL_PACKAGES],
          }
        : {}),
    },
    extra: { ...config.extra, ...(build > 0 ? { build } : {}), ...(fdroid ? { distribution } : {}) },
    plugins: [...(config.plugins || []), './plugins/with-release-signing', './plugins/with-native-programs', './plugins/with-no-gms-entry', './plugins/with-launcher-icons', './plugins/with-movable-views'],
  };
};
