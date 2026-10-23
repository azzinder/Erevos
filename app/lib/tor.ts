// The Tor way of a space (SpaceData.tor, lib/relay.ts TorWay): what of its relay requests goes
// through the core's Tor. 'messages' unless changed: what is written and what tells contacts
// something, but not files, and only while Tor is ready, so messages never wait for it. 'all':
// everything, files too, and nothing without Tor. Calls never do: their audio and video go straight
// between the phones, or through the call relay. Where Tor is blocked, it goes through the space's
// bridges (lib/bridges.ts), and then only through them.

import { bridgeLines, NO_BRIDGES, type Bridges } from './bridges';
import { canTor, tor } from './core';
import { setThroughTor, setTorReady, type TorWay } from './relay';

export type TorStatus = { text: string; ready: boolean };

export class NoBridgesError extends Error {
  constructor() {
    super('noBridges');
  }
}

// How often whether Tor is ready is asked, the way 'messages': while it starts, and once it is.
const LOOK_STARTING = 3000;
const LOOK_READY = 30_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let watching = 0;

// The way 'messages' sends through Tor only while it is ready: asked of the core until it stops.
function watchReady(way: TorWay): void {
  const run = ++watching;
  if (timer) clearTimeout(timer);
  timer = null;
  setTorReady(false);
  if (way !== 'messages' || !canTor()) return;
  const look = () => {
    void torStatus()
      .then(
        (status) => status?.ready === true,
        () => false,
      )
      .then((ready) => {
        if (run !== watching) return;
        setTorReady(ready);
        timer = setTimeout(look, ready ? LOOK_READY : LOOK_STARTING);
      });
  };
  look();
}

// Sends the open space's relay requests through Tor as its way says, and starts Tor when some go
// through it, through its bridges if it has any. Bridges chosen but none usable: Tor stops rather
// than going without them; the way 'all' then fails its requests until there are some, the way
// 'messages' sends them straight. Tor saying no stops it the same way (crates/erevos-tor start).
export async function applyTor(way: TorWay, bridges: Bridges = NO_BRIDGES): Promise<void> {
  setThroughTor(way);
  watchReady(way);
  if (way === 'off' || !canTor()) return;
  const lines = bridgeLines(bridges);
  if (bridges.use !== 'none' && lines.length === 0) {
    await tor().torStop();
    throw new NoBridgesError();
  }
  await tor().torStart(lines.join('\n'));
}

/** Stops sending through Tor, as the space closes. */
export function leaveTor(): void {
  setThroughTor('off');
  watchReady('off');
}

/** How far Tor is, or null when this build has no Tor. */
export async function torStatus(): Promise<TorStatus | null> {
  if (!canTor()) return null;
  const raw = await tor().torStatus();
  try {
    const parsed = JSON.parse(raw) as Partial<TorStatus>;
    return { text: typeof parsed.text === 'string' ? parsed.text : raw, ready: parsed.ready === true };
  } catch {
    return { text: raw, ready: false };
  }
}
