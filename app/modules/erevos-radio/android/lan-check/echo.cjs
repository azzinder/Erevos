// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The computer's side of LanInteropTest: desktop/lan.js, echoing every text back on its link.
const path = require('node:path');
const { Lan } = require(path.join(__dirname, '../../../../../desktop/lan.js'));
const lan = new Lan({
  onLink: (id) => console.log(`link ${id}`),
  onGone: (id) => console.log(`gone ${id}`),
  onText: (id, text) => lan.send(id, `echo ${text}`),
  onLog: (text) => console.log(`log ${text}`),
});
lan.start();
setTimeout(() => process.exit(0), 40_000);
