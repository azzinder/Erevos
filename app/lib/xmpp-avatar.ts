// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { sha1 } from '@noble/hashes/legacy.js';

import { fromBase64, toBase64, toHex } from './crypto';
import type { XmppConnection } from './xmpp';
import { child, children, el, textOf, type XmlElement } from './xmpp-xml';

// Profile pictures on XMPP (XEP-0084), as Conversations, Dino, Gajim, Monal and Kaidan keep them:
// each account puts its picture in two nodes of its own PEP, the bytes and a note of them (their
// SHA-1, type and size), and its contacts are told of the note as it changes. The bytes are fetched
// only when a picture is shown, checked against the note's SHA-1, and kept in memory only. Ours is
// published with the server's default access, which lets only the contacts who see our presence
// have it. Pictures are not encrypted, in any of those apps: the server sees them.

export const NS_AVATAR_META = 'urn:xmpp:avatar:metadata';
export const NS_AVATAR_DATA = 'urn:xmpp:avatar:data';
const NS_PUBSUB = 'http://jabber.org/protocol/pubsub';

/** The largest picture fetched or published: a profile picture is small. */
export const AVATAR_MOST = 256 * 1024;

/** A picture as its note says: the SHA-1 of its bytes in hex, and their type. */
export type XmppAvatar = { id: string; type: string };

/**
 * What a note of a picture says (the `metadata` of an item): the picture in its data node, or null
 * when the account took its picture away. One only at another address (a `url`) is none here.
 */
export function avatarOf(metadata: XmlElement | undefined): XmppAvatar | null {
  const infos = children(metadata, 'info').filter((info) => /^[0-9a-f]{40}$/.test(info.attrs.id ?? '') && !info.attrs.url && Number(info.attrs.bytes ?? 0) <= AVATAR_MOST);
  const chosen = infos.find((info) => info.attrs.type === 'image/png') ?? infos[0];
  return chosen ? { id: chosen.attrs.id, type: chosen.attrs.type || 'image/png' } : null;
}

/** Someone's picture, fetched from their PEP and checked against its SHA-1. */
export async function fetchXmppAvatar(connection: XmppConnection, jid: string, avatar: XmppAvatar): Promise<Uint8Array> {
  const answer = await connection.iq('get', jid, el('pubsub', { xmlns: NS_PUBSUB }, el('items', { node: NS_AVATAR_DATA }, el('item', { id: avatar.id }))));
  const item = children(child(child(answer, 'pubsub', NS_PUBSUB), 'items'), 'item').find((i) => i.attrs.id === avatar.id);
  const text = textOf(child(item, 'data', NS_AVATAR_DATA)).replace(/\s+/g, '');
  if (!text || text.length > (AVATAR_MOST * 4) / 3 + 4) throw new Error('No picture');
  const bytes = fromBase64(text);
  if (toHex(sha1(bytes)) !== avatar.id) throw new Error('The picture is not the one its note names');
  return bytes;
}

/** Puts our picture on our PEP, bytes first, then the note that tells our contacts of it. */
export async function publishXmppAvatar(connection: XmppConnection, bytes: Uint8Array, type: string): Promise<XmppAvatar> {
  if (bytes.length > AVATAR_MOST) throw new Error('The picture is too large');
  const id = toHex(sha1(bytes));
  await connection.iq('set', undefined, el('pubsub', { xmlns: NS_PUBSUB }, el('publish', { node: NS_AVATAR_DATA }, el('item', { id }, el('data', { xmlns: NS_AVATAR_DATA }, toBase64(bytes))))));
  await connection.iq(
    'set',
    undefined,
    el('pubsub', { xmlns: NS_PUBSUB }, el('publish', { node: NS_AVATAR_META }, el('item', { id }, el('metadata', { xmlns: NS_AVATAR_META }, el('info', { id, type, bytes: bytes.length }))))),
  );
  return { id, type };
}

/** Takes our picture away: an empty note, which the apps read as none. */
export async function removeXmppAvatar(connection: XmppConnection): Promise<void> {
  await connection.iq('set', undefined, el('pubsub', { xmlns: NS_PUBSUB }, el('publish', { node: NS_AVATAR_META }, el('item', { id: 'current' }, el('metadata', { xmlns: NS_AVATAR_META })))));
}
