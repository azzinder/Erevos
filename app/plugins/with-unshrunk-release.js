// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Since Expo 58 a new Android project shrinks and renames the release build's code with R8. Erevos
// reaches much of its native code by name, through JNI to its Rust core and Tor, Android's own
// component names and libraries that look classes up as they run, so the release is built as it
// was before, whole, as every Erevos so far was tested.
const { withGradleProperties } = require('expo/config-plugins');

const PROPERTIES = {
  'android.enableMinifyInReleaseBuilds': 'false',
  'android.enableShrinkResourcesInReleaseBuilds': 'false',
};

module.exports = function withUnshrunkRelease(config) {
  return withGradleProperties(config, (c) => {
    for (const [key, value] of Object.entries(PROPERTIES)) {
      c.modResults = c.modResults.filter((item) => !(item.type === 'property' && item.key === key));
      c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });
};
