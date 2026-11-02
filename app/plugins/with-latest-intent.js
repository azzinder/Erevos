// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Erevos's MainActivity, as the links its icons, the widget and its notices bring need it
// (lib/open-link.ts):
// - The link that brings Erevos back becomes its intent. React Native reads the link Erevos
//   starts with from the intent, which Android keeps from the first time, and Expo drops a link
//   that comes while Erevos is still starting: so another icon could show what the first one did
//   (the SMS), once its screens started again.
// - Back on its first screen puts Erevos behind, as Android does when Erevos's own icon opened it,
//   also when the SMS, Contacts or Phone icon, the widget or a notice did: Android closed it then,
//   and the next icon started its screens again.
const { withMainActivity } = require('expo/config-plugins');

const CLASS = /class MainActivity\s*:\s*ReactActivity\(\)\s*\{\n/;
const BACK = /override fun invokeDefaultOnBackPressed\(\)\s*\{\n/;
const MARK = 'plugins/with-latest-intent.js';

const NEW_INTENT = `  // ${MARK}: the link that brought Erevos back is its intent from now on.
  override fun onNewIntent(intent: android.content.Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }

`;
const BEHIND = `      // ${MARK}: behind, not closed, whatever opened Erevos.
      if (isTaskRoot && moveTaskToBack(false)) return
`;

module.exports = function withLatestIntent(config) {
  return withMainActivity(config, (c) => {
    const activity = c.modResults;
    if (activity.language !== 'kt') throw new Error('with-latest-intent: MainActivity is not Kotlin');
    if (activity.contents.includes(MARK)) return c;
    if (!CLASS.test(activity.contents)) throw new Error('with-latest-intent: no "class MainActivity : ReactActivity() {" in MainActivity');
    if (!BACK.test(activity.contents)) throw new Error('with-latest-intent: no "override fun invokeDefaultOnBackPressed() {" in MainActivity');
    activity.contents = activity.contents.replace(CLASS, (head) => head + NEW_INTENT).replace(BACK, (head) => head + BEHIND);
    return c;
  });
};
