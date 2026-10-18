// The "Through Tor" switch of a space (SpaceData.tor, off unless set): while it is on, every relay
// request of the space goes through the core's Tor (lib/relay.ts). Calls do not: their audio and
// video go straight between the phones, or through the call relay.

import { canTor, tor } from './core';
import { setThroughTor } from './relay';

export type TorStatus = { text: string; ready: boolean };

/** Sends the open space's relay requests through Tor or not, and starts Tor when they do. */
export async function applyTor(on: boolean): Promise<void> {
  setThroughTor(on);
  if (on && canTor()) await tor().torStart();
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
