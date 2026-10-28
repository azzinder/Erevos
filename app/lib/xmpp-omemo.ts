import { xmppCore } from './core';
import { randomBytes, utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';
import { child, children, el, find, textOf, type XmlElement } from './xmpp-xml';

// OMEMO for XMPP chats (docs/xmpp.md): version 0.3, `eu.siacs.conversations.axolotl`, as
// Conversations, Monal, Gajim and Dino speak it. The cryptography is the core's
// (crates/erevos-xmpp); here are the device lists and bundles kept on the server with PEP
// (XEP-0163), and which devices a message goes to.

export const OMEMO = 'eu.siacs.conversations.axolotl';
export const DEVICES_NODE = `${OMEMO}.devicelist`;
export const bundleNode = (device: number) => `${OMEMO}.bundles:${device}`;
const PUBSUB = 'http://jabber.org/protocol/pubsub';

/** How many one-time pre-keys this device keeps on the server, as Conversations does. */
export const PRE_KEYS = 100;

export type KeyPair = { secret: string; public: string };
export type SignedPreKey = KeyPair & { id: number; signature: string };
export type PreKey = KeyPair & { id: number };

/** This device's OMEMO: its id, its identity, its signed pre-key and one-time pre-keys. */
export type OwnOmemo = {
  device: number;
  identity: KeyPair;
  signedPreKey: SignedPreKey;
  preKeys: PreKey[];
  /** One-time pre-keys used, kept a while (keptPreKeys). */
  used?: UsedPreKey[];
  nextPreKey: number;
  /** Whether the bundle on the server is the one kept here. */
  published: boolean;
  /** The ids this device had before a backup was restored (renewDevice in lib/xmpp.ts): taken off the account's lists as it next publishes. */
  gone?: number[];
};

/** A one-time pre-key a message used, and when. */
export type UsedPreKey = { key: PreKey; at: number };

/** How long, and how many, used one-time pre-keys are kept. */
const KEEP_USED_MS = 3 * 24 * 3600_000;
const KEEP_USED = 50;

/**
 * The one-time pre-keys a message to this device may use: those on the server, and those used in
 * the last days. Two people who took the same pre-key from the bundle before the new one was out
 * both begin a session with it; one used and deleted at once would leave the second one's messages
 * locked for good. XEP-0384 lets a device keep used pre-keys a while, as python-omemo does until
 * the archive is read.
 */
export function keptPreKeys(own: { preKeys: PreKey[]; used?: UsedPreKey[] }, now = Date.now()): PreKey[] {
  own.used = (own.used ?? []).filter((u) => now - u.at < KEEP_USED_MS).slice(-KEEP_USED);
  return [...own.preKeys, ...own.used.map((u) => u.key)];
}

/** Takes a used one-time pre-key off the bundle, keeping it a while: whether it was on it, and needs another in its place. */
export function usePreKey(own: { preKeys: PreKey[]; used?: UsedPreKey[] }, id: number, now = Date.now()): boolean {
  const key = own.preKeys.find((k) => k.id === id);
  if (!key) return false;
  own.preKeys = own.preKeys.filter((k) => k !== key);
  own.used = [...(own.used ?? []), { key, at: now }].slice(-KEEP_USED);
  return true;
}

/** One device of a person, ours included: its identity key once seen, and the session with it. */
export type OmemoDevice = {
  identity?: string;
  session?: unknown;
  /** Its identity key changed: shown in the chat, and the device is used again only once seen. */
  changed?: boolean;
  /** Its bundle could not be had: tried again later. */
  failedAt?: number;
  /** In the device list the account last published. */
  listed: boolean;
};

export type OmemoPeople = Record<string, { fetchedAt: number; devices: Record<string, OmemoDevice> }>;

type Json = Record<string, unknown>;

export async function omemoCall<T = Json>(request: Json): Promise<T> {
  const answer = await xmppCore()(utf8Encode(JSON.stringify(request)));
  return JSON.parse(utf8Decode(answer)) as T;
}

/** A new device: its identity, a signed pre-key, and PRE_KEYS one-time pre-keys. */
export async function newOwnOmemo(): Promise<OwnOmemo> {
  const { identity, device } = await omemoCall<{ identity: KeyPair; device: number }>({ op: 'identity_new' });
  const signedPreKey = await omemoCall<SignedPreKey>({ op: 'signed_pre_key_new', identity, id: 1 });
  const { pre_keys } = await omemoCall<{ pre_keys: PreKey[] }>({ op: 'pre_keys_new', start: 1, count: PRE_KEYS });
  return { device, identity, signedPreKey, preKeys: pre_keys, nextPreKey: PRE_KEYS + 1, published: false };
}

/** A key's fingerprint as OMEMO apps show it: its 32 bytes in hex, in groups of eight. */
export function fingerprint(identity: string): string {
  const bytes = Uint8Array.from(atob(identity.replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const key = bytes.length === 33 ? bytes.subarray(1) : bytes;
  const hex = Array.from(key, (b) => b.toString(16).padStart(2, '0')).join('');
  return hex.match(/.{8}/g)?.join(' ') ?? hex;
}

export function bundleElement(own: OwnOmemo): XmlElement {
  return el(
    'bundle',
    { xmlns: OMEMO },
    el('signedPreKeyPublic', { signedPreKeyId: own.signedPreKey.id }, own.signedPreKey.public),
    el('signedPreKeySignature', {}, own.signedPreKey.signature),
    el('identityKey', {}, own.identity.public),
    el('prekeys', {}, ...own.preKeys.map((k) => el('preKeyPublic', { preKeyId: k.id }, k.public))),
  );
}

export function deviceListElement(devices: number[]): XmlElement {
  return el('list', { xmlns: OMEMO }, ...devices.map((id) => el('device', { id })));
}

/** The device ids of a <list>. */
export function devicesOf(list: XmlElement | undefined): number[] {
  return children(list, 'device')
    .map((d) => Number(d.attrs.id))
    .filter((id) => Number.isInteger(id) && id > 0 && id < 2 ** 31);
}

/** A bundle as the core takes it, with one of its pre-keys picked at random. */
export function bundleOf(bundle: XmlElement | undefined): Json | null {
  const spk = child(bundle, 'signedPreKeyPublic');
  const signature = textOf(child(bundle, 'signedPreKeySignature')).trim();
  const identity = textOf(child(bundle, 'identityKey')).trim();
  const preKeys = children(child(bundle, 'prekeys'), 'preKeyPublic').filter((k) => k.attrs.preKeyId && textOf(k).trim());
  if (!spk || !signature || !identity || !preKeys.length) return null;
  const pick = preKeys[randomBytes(2).reduce((a, b) => a * 256 + b, 0) % preKeys.length];
  return {
    identity,
    signed_pre_key: { id: Number(spk.attrs.signedPreKeyId), public: textOf(spk).trim(), signature },
    pre_key: { id: Number(pick.attrs.preKeyId), public: textOf(pick).trim() },
  };
}

/** A PEP publish of `item` to `node`, readable by anyone, as OMEMO needs. */
export function publishElement(node: string, item: XmlElement, itemId = 'current', open = true): XmlElement {
  return el(
    'pubsub',
    { xmlns: PUBSUB },
    el('publish', { node }, el('item', { id: itemId }, item)),
    open
      ? el(
          'publish-options',
          {},
          el(
            'x',
            { xmlns: 'jabber:x:data', type: 'submit' },
            el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, 'http://jabber.org/protocol/pubsub#publish-options')),
            el('field', { var: 'pubsub#access_model' }, el('value', {}, 'open')),
          ),
        )
      : null,
  );
}

export function itemsElement(node: string): XmlElement {
  return el('pubsub', { xmlns: PUBSUB }, el('items', { node, max_items: 1 }));
}

/** The first item's payload in a pubsub answer, or a pubsub#event: `name` in `ns`. */
export function itemOf(answer: XmlElement | undefined, name: string, ns: string = OMEMO): XmlElement | undefined {
  const items = find(answer, `pubsub|${PUBSUB}`, 'items') ?? find(answer, 'event|http://jabber.org/protocol/pubsub#event', 'items');
  const item = children(items, 'item')[0];
  return child(item, name, ns);
}

export class NoOmemoError extends Error {
  constructor(jid: string) {
    super(t('{jid} has no app with OMEMO encryption, or has not published its keys.', { jid }));
  }
}

/** One device's key in an encrypted message to us, if the message has one. */
export function keyFor(encrypted: XmlElement, device: number): { key: string; prekey: boolean } | null {
  const header = child(encrypted, 'header', OMEMO);
  const key = children(header, 'key', OMEMO).find((k) => Number(k.attrs.rid) === device);
  if (!key) return null;
  return { key: textOf(key).trim(), prekey: key.attrs.prekey === 'true' || key.attrs.prekey === '1' };
}

export const HINT_BODY = 'I sent you an OMEMO encrypted message but your client doesn’t seem to support that. Find more information on https://conversations.im/omemo';
