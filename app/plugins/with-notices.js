// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Android app carries NOTICES.txt (public/NOTICES.txt, made by scripts/notices.mjs: Erevos's
// licence and AUTHORS.md, and every package it is built on with its licence text) in its assets,
// as the web app, the computer app and the Sailfish app carry it at their root: those licences ask
// that their text comes with every copy, the built ones too.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

module.exports = function withNotices(config) {
  return withDangerousMod(config, [
    'android',
    async (c) => {
      const from = path.join(c.modRequest.projectRoot, 'public', 'NOTICES.txt');
      if (!fs.existsSync(from)) throw new Error('public/NOTICES.txt is missing: run node scripts/notices.mjs');
      const assets = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets');
      fs.mkdirSync(assets, { recursive: true });
      fs.copyFileSync(from, path.join(assets, 'NOTICES.txt'));
      return c;
    },
  ]);
};
