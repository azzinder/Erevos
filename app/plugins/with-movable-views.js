// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// React Native's plain views come from modules/erevos-views (MovableViews.kt), where a view
// moved out of a screen that is still going away leaves it for good, instead of Erevos stopping.
// React Native takes each view from the first package that has it, so MainApplication puts that
// package before React Native's own.
const { withMainApplication } = require('expo/config-plugins');

const PACKAGES = 'PackageList(this).packages.apply {';
const ADD = 'add(0, expo.modules.erevosviews.MovableViewsPackage())';

module.exports = function withMovableViews(config) {
  return withMainApplication(config, (c) => {
    const app = c.modResults;
    if (app.language !== 'kt') throw new Error('with-movable-views: MainApplication is not Kotlin');
    if (app.contents.includes(ADD)) return c;
    const at = app.contents.indexOf(PACKAGES);
    if (at < 0) throw new Error(`with-movable-views: no "${PACKAGES}" in MainApplication`);
    const end = at + PACKAGES.length;
    const indent = (app.contents.slice(0, at).match(/[ \t]*$/) || [''])[0];
    app.contents = `${app.contents.slice(0, end)}\n${indent}  ${ADD}${app.contents.slice(end)}`;
    return c;
  });
};
