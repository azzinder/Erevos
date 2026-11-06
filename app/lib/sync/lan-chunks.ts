// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { randomBytes, toHex } from '../crypto';
import type { ChunkWay, Wanted } from './chunks';

// The fast way for large files between the account's devices on the same Wi-Fi or hotspot
// (docs/sync.md, phase S3): a channel of its own beside the links, desktop/chunks.js on a computer
// and ChunkChannel.kt on a phone (lib/chunk-channel.ts reaches them). A device that has chunks to
// give listens, and tells a linked device inside their end-to-end encrypted link where it listens
// and a key of 32 random bytes for that device alone (`ChunkOffer`, the link envelope `chunks`),
// with the files that key may take. The device taking connects with that key, and each chunk is
// kept there only once it opens with the file's key (lib/sync/chunks.ts brings them).

/** Where a device gives chunks, and the key for this one device to take them with. */
export type ChunkOffer = { hosts: string[]; port: number; key: string };

/** The channel on this device: desktop/chunks.js or ChunkChannel.kt. */
export type ChunkChannel = {
  /** Gives (on) or stops: where it listens, null when it cannot. */
  serve(on: boolean): Promise<{ port: number; hosts: string[] } | null>;
  allow(key: string, ids: string[]): void;
  forget(key: string): void;
  /** Takes the `n`th chunk of `want` from `offer` into this device's files, kept once it opens: true; false when not there whole. Throws when cut off. */
  take(offer: ChunkOffer, want: Wanted, n: number): Promise<boolean>;
};

const KEY = /^[0-9a-f]{64}$/;
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
/** The most addresses an offer names. */
export const MOST_HOSTS = 8;

/** An offer as it came in a link envelope, or null when it is not one. */
export function checkedOffer(v: unknown): ChunkOffer | null {
  if (!v || typeof v !== 'object') return null;
  const { hosts, port, key } = v as Record<string, unknown>;
  if (!Array.isArray(hosts) || !Number.isInteger(port) || (port as number) < 1 || (port as number) > 65535 || typeof key !== 'string' || !KEY.test(key)) return null;
  const good = hosts.filter((h): h is string => typeof h === 'string' && IPV4.test(h)).slice(0, MOST_HOSTS);
  return good.length > 0 ? { hosts: good, port: port as number, key } : null;
}

/** The way to bring chunks from the device that made `offer`: kept here as they come, never through the app. */
export function lanWay(channel: ChunkChannel, offer: ChunkOffer): ChunkWay {
  return {
    name: 'lan',
    get: async () => {
      throw new Error('kept as they come');
    },
    keep: (want, n) => channel.take(offer, want, n),
  };
}

/** Gives chunks to the linked devices, a key of its own to each. */
export class ChunkGiver {
  private readonly channel: ChunkChannel;
  private readonly keys = new Map<string, string>();

  constructor(channel: ChunkChannel) {
    this.channel = channel;
  }

  /** Lets `device` take the chunks of the files `ids`, in place of what it could before: the offer to tell it, null when this device cannot give. */
  async offer(device: string, ids: string[]): Promise<ChunkOffer | null> {
    const at = await this.channel.serve(true).catch(() => null);
    if (!at || at.port <= 0) return null;
    const hosts = at.hosts.filter((h) => IPV4.test(h)).slice(0, MOST_HOSTS);
    if (hosts.length === 0) return null;
    let key = this.keys.get(device);
    if (!key) {
      key = toHex(randomBytes(32));
      this.keys.set(device, key);
    }
    this.channel.allow(key, ids);
    return { hosts, port: at.port, key };
  }

  /** `device` takes nothing more (unlinked), and its connections are cut; with no one left, it stops listening. */
  async forget(device: string): Promise<void> {
    const key = this.keys.get(device);
    if (!key) return;
    this.keys.delete(device);
    this.channel.forget(key);
    if (this.keys.size === 0) await this.channel.serve(false).catch(() => null);
  }
}
