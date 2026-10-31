// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The computer's side of run.sh: starts the Sailfish shell's server (lan-probe), turns its same
// Wi-Fi link on through /__lan as the page does (app/lib/radio.ts), and links it with
// desktop/lan.js, which echoes every text back. Exits 0 when both ways carried text, UTF-8 too.
const { spawn } = require('node:child_process');
const path = require('node:path');
const { Lan } = require(path.join(__dirname, '../../desktop/lan.js'));

const probe = spawn(process.argv[2], [], { stdio: ['ignore', 'pipe', 'inherit'] });
const fail = (why) => {
  console.error(`Sailfish same Wi-Fi check failed: ${why}`);
  probe.kill();
  process.exit(1);
};
setTimeout(() => fail('took too long'), 60_000).unref();

const lan = new Lan({
  onLink: (id) => console.log(`lan.js: link ${id}`),
  onGone: (id) => console.log(`lan.js: gone ${id}`),
  onText: (id, text) => lan.send(id, `echo ${text}`),
  onLog: (text) => console.log(`lan.js: ${text}`),
});

let base = '';
let token = '';
const shell = async (pathAndQuery, init = {}) => {
  const reply = await fetch(`${base}${pathAndQuery}`, { ...init, headers: { 'X-Erevos-Token': token, ...(init.headers ?? {}) } });
  return reply;
};

async function run() {
  // Without the token: refused.
  const refused = await fetch(`${base}/__lan?after=0`);
  if (refused.status !== 403) fail(`answered ${refused.status} without the token`);

  const on = await (await shell('/__lan?on=1', { method: 'PUT' })).json();
  if (typeof on.after !== 'number' || !Array.isArray(on.links)) fail(`PUT said ${JSON.stringify(on)}`);
  lan.start();
  let after = on.after;
  let link = '';
  const words = 'hello from Sailfish, γεια σου';
  let echoed = false;
  for (const end = Date.now() + 45_000; Date.now() < end && !echoed; ) {
    const { events } = await (await shell(`/__lan?after=${after}`)).json();
    for (const event of events) {
      after = Math.max(after, event.seq);
      console.log(`shell: ${event.kind} ${event.link}${event.text ? ` ${event.text}` : ''}`);
      if (event.kind === 'link' && !link) {
        link = event.link;
        const sent = await shell(`/__lan?link=${encodeURIComponent(link)}`, { method: 'POST', body: words });
        if (sent.status !== 204) fail(`POST answered ${sent.status}`);
      }
      if (event.kind === 'text' && event.text === `echo ${words}`) echoed = true;
    }
  }
  if (!echoed) fail('no echo came back');
  const unknown = await shell('/__lan?link=lan-999', { method: 'POST', body: 'x' });
  if (unknown.status !== 404) fail(`a link that is not there answered ${unknown.status}`);

  // Off: the computer's side sees the link go.
  const gone = new Promise((resolve) => {
    const was = lan.onGone;
    lan.onGone = (id) => {
      was(id);
      resolve();
    };
  });
  await shell('/__lan?on=0', { method: 'PUT' });
  await gone;
  lan.stop();
  probe.kill();
  console.log('The Sailfish shell and desktop/lan.js linked and talked.');
  process.exit(0);
}

let out = '';
probe.stdout.on('data', (chunk) => {
  out += chunk.toString();
  const match = /address (http:\/\/127\.0\.0\.1:\d+)\/#erevos-token=([0-9a-f]+)/.exec(out);
  if (match && !base) {
    base = match[1];
    token = match[2];
    run().catch((error) => fail(error.message));
  }
});
probe.on('exit', (code) => {
  if (!base) fail(`lan-probe ended with ${code}`);
});
