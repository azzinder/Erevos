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
