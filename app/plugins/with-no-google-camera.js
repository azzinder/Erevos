// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// expo-camera builds Google's barcode scanner (ML Kit, Play services' code scanner) and Play
// services' document scanner into the app unless told not to. Erevos's camera uses neither (it reads
// QR codes with its own reader), they are closed code of Google, ML Kit reports its use to Google,
// and F-Droid takes no app with them. So the build leaves both out (checks/no-google.check.ts).
const { withGradleProperties } = require('expo/config-plugins');

const PROPERTIES = {
  'expo.camera.barcode-scanner-enabled': 'false',
  'expo.camera.document-scanner-enabled': 'false',
};

module.exports = function withNoGoogleCamera(config) {
  return withGradleProperties(config, (c) => {
    for (const [key, value] of Object.entries(PROPERTIES)) {
      c.modResults = c.modResults.filter((item) => !(item.type === 'property' && item.key === key));
      c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });
};

module.exports.PROPERTIES = PROPERTIES;
