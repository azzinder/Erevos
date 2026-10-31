// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// expo-image-picker's manifest declares a disabled service of Google Play services
// (com.google.android.gms.metadata.ModuleDependencies), only a hint for Play to install its
// backported photo picker on Android 10 and older. Erevos uses no Google services, and F-Droid's
// scanner flags any com.google.android.gms name, so the merged manifest leaves it out. Without it,
// those phones pick photos in Android's documents picker, unless Play installed its photo picker
// for another app.
const { withAndroidManifest } = require('expo/config-plugins');

const SERVICE = 'com.google.android.gms.metadata.ModuleDependencies';

module.exports = function withNoGmsEntry(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const application = manifest.application[0];
    application.service = (application.service || []).filter((service) => service.$['android:name'] !== SERVICE);
    application.service.push({ $: { 'android:name': SERVICE, 'tools:node': 'remove' } });
    return c;
  });
};
