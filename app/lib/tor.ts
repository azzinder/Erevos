// The "Through Tor" switch of a space (SpaceData.tor, off unless set): while it is on, every relay
// request of the space goes through the core's Tor (lib/relay.ts). Calls do not: their audio and
// video go straight between the phones, or through the call relay. Where Tor is blocked, it goes
// through the space's bridges (lib/bridges.ts), and then only through them.

import { bridgeLines, NO_BRIDGES, type Bridges } from './bridges';
import { canTor, tor } from './core';
import { setThroughTor } from './relay';

export type TorStatus = { text: string; ready: boolean };

export class NoBridgesError extends Error {
  constructor() {
    super('noBridges');
  }
}

// Sends the open space's relay requests through Tor or not, and starts Tor when they do, through
// its bridges if it has any. Bridges chosen but none usable: Tor stops rather than going
// without them, and requests fail until there are some. Tor saying no stops it the same way
// (crates/erevos-tor start).
export async function applyTor(on: boolean, bridges: Bridges = NO_BRIDGES): Promise<void> {
  setThroughTor(on);
  if (!on || !canTor()) return;
  const lines = bridgeLines(bridges);
  if (bridges.use !== 'none' && lines.length === 0) {
    await tor().torStop();
    throw new NoBridgesError();
  }
  await tor().torStart(lines.join('\n'));
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
