// Erevos's launcher icon comes in colours the owner chooses (Appearance → Launcher icons,
// modules/erevos-icons). Android takes an app's icons from its manifest only, so each colour is an
// activity-alias of MainActivity, with the icon drawn in that colour (modules/erevos-icons/res),
// and only the red one is on until the owner chooses another; MainActivity itself is no longer in
// the launcher, else Erevos would show twice. Phone's, SMS's and Contacts's aliases are in their
// modules' manifests. A tap on an alias brings no link, so it is given the one to Erevos's chats
// (modules/erevos-icons, ErevosIconsPackage.kt).
const { withAndroidManifest } = require('expo/config-plugins');

const COLORS = ['red', 'orange', 'green', 'blue', 'violet', 'dark'];
const FIRST = 'red';
const LAUNCHER = 'android.intent.category.LAUNCHER';

module.exports = function withLauncherIcons(config) {
  return withAndroidManifest(config, (c) => {
    const application = c.modResults.manifest.application[0];
    const main = (application.activity || []).find((activity) => activity.$['android:name'] === '.MainActivity');
    if (!main) throw new Error('with-launcher-icons: no .MainActivity in the manifest');
    // MAIN stays (Android starts the app with it); only the launcher's category goes.
    for (const filter of main['intent-filter'] || []) {
      filter.category = (filter.category || []).filter((category) => category.$['android:name'] !== LAUNCHER);
    }
    const label = main.$['android:label'] || application.$['android:label'];
    application['activity-alias'] = [
      ...(application['activity-alias'] || []).filter((alias) => !String(alias.$['android:name']).startsWith('.ErevosIcon')),
      ...COLORS.map((color) => ({
        $: {
          'android:name': `.ErevosIcon${color[0].toUpperCase()}${color.slice(1)}`,
          'android:targetActivity': '.MainActivity',
          'android:enabled': color === FIRST ? 'true' : 'false',
          'android:exported': 'true',
          'android:icon': `@mipmap/erevos_launcher_${color}`,
          'android:roundIcon': `@mipmap/erevos_launcher_${color}`,
          ...(label ? { 'android:label': label } : {}),
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }], category: [{ $: { 'android:name': LAUNCHER } }] }],
      })),
    ];
    return c;
  });
};
