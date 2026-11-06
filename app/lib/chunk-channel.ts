// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Platform } from 'react-native';

import { chunksAllow, chunksForget, chunksServe, chunksTake } from '../modules/erevos-radio';
import { toHex } from './crypto';
import { handChunks } from './devices';
import { SHELL, shellFetch } from './shell';
import type { ChunkChannel } from './sync/lan-chunks';

// This device's fast channel for the chunks of large files (lib/sync/lan-chunks.ts): on Android the
// phone's own (modules/erevos-radio, ChunkChannel.kt), in the desktop app the shell's
// (desktop/chunks.js, at /__chunks). The web app and Sailfish OS have none: their files come by
// the other ways.

const android: ChunkChannel = {
  serve: async (on) => {
    const at = await chunksServe(on);
    return at && at.port > 0 ? at : null;
  },
  allow: chunksAllow,
  forget: chunksForget,
  take: (offer, want, n) => chunksTake(offer.hosts, offer.port, offer.key, want.id, n, toHex(want.key), want.chunk),
};

const post = (op: string, body: unknown) => shellFetch(`/__chunks?op=${op}`, { method: 'POST', body: JSON.stringify(body) });

const desktop: ChunkChannel = {
  serve: async (on) => {
    const reply = await shellFetch(`/__chunks?on=${on ? 1 : 0}`, { method: 'PUT' });
    if (!on || !reply.ok) return null;
    const at = (await reply.json()) as { port?: unknown; hosts?: unknown };
    return typeof at.port === 'number' && Array.isArray(at.hosts) ? { port: at.port, hosts: at.hosts.filter((h): h is string => typeof h === 'string') } : null;
  },
  allow: (key, ids) => void post('allow', { key, ids }).catch(() => undefined),
  forget: (key) => void post('forget', { key }).catch(() => undefined),
  take: async (offer, want, n) => {
    const reply = await post('take', { ...offer, id: want.id, n, fileKey: toHex(want.key), size: want.chunk });
    if (!reply.ok) throw new Error('cut off');
    return ((await reply.json()) as { kept?: unknown }).kept === true;
  },
};

/** This device's channel, null where there is none. */
export function chunkChannel(): ChunkChannel | null {
  if (Platform.OS === 'android') return android;
  if (SHELL === 'electron') return desktop;
  return null;
}

/** Has the links of the account's devices give and take chunks by this device's channel, until stopped. */
export function startChunkChannel(): () => void {
  const channel = chunkChannel();
  handChunks(channel);
  return () => {
    handChunks(null);
    void channel?.serve(false).catch(() => null);
  };
}
