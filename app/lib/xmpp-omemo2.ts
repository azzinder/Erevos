import { randomBytes, toBase64 } from './crypto';
import { omemoCall, PRE_KEYS, type KeyPair, type PreKey, type SignedPreKey } from './xmpp-omemo';
import { child, children, el, parseXml, render, textOf, type XmlElement } from './xmpp-xml';

// OMEMO 2 for XMPP chats (docs/xmpp.md): version 0.8 of XEP-0384, `urn:xmpp:omemo:2`, as Kaidan
// and the apps built on QXmpp speak it. The cryptography is the core's (crates/erevos-xmpp,
// omemo2.rs), with the same identity as OMEMO 0.3 and pre-keys of its own; here are its device
// list and bundles on the server, its <encrypted>, and the SCE envelope (XEP-0420) its payload
// carries. Which version a message goes in is lib/xmpp.ts's: OMEMO 2 to each device that has it.

export const OMEMO2 = 'urn:xmpp:omemo:2';
export const DEVICES2_NODE = 'urn:xmpp:omemo:2:devices';
export const BUNDLES2_NODE = 'urn:xmpp:omemo:2:bundles';
const SCE = 'urn:xmpp:sce:1';
const PUBSUB = 'http://jabber.org/protocol/pubsub';

/** This device's OMEMO 2: its identity as Ed25519, and its own signed pre-key and pre-keys. */
export type OwnOmemo2 = {
  ik: string;
  signedPreKey: SignedPreKey;
  preKeys: PreKey[];
  nextPreKey: number;
  /** Whether the bundle on the server is the one kept here. */
  published: boolean;
  /** Its bundle was on the server once: from then on OMEMO 2 is written to the devices that have it. */
  live?: boolean;
};

type Json = Record<string, unknown>;

/** OMEMO 2 for a device that has an identity already. */
export async function newOwnOmemo2(identity: KeyPair): Promise<OwnOmemo2> {
  const { ik } = await omemoCall<{ ik: string }>({ op: 'two_identity', identity });
  const signedPreKey = await omemoCall<SignedPreKey>({ op: 'two_signed_pre_key_new', identity, id: 1 });
  const { pre_keys } = await omemoCall<{ pre_keys: PreKey[] }>({ op: 'two_pre_keys_new', start: 1, count: PRE_KEYS });
  return { ik, signedPreKey, preKeys: pre_keys, nextPreKey: PRE_KEYS + 1, published: false };
}

export function bundle2Element(own: OwnOmemo2): XmlElement {
  return el(
    'bundle',
    { xmlns: OMEMO2 },
    el('spk', { id: own.signedPreKey.id }, own.signedPreKey.public),
    el('spks', {}, own.signedPreKey.signature),
    el('ik', {}, own.ik),
    el('prekeys', {}, ...own.preKeys.map((k) => el('pk', { id: k.id }, k.public))),
  );
}

/** The device ids of a <devices>. */
export function devices2Of(devices: XmlElement | undefined): number[] {
  return children(devices, 'device')
    .map((d) => Number(d.attrs.id))
    .filter((id) => Number.isInteger(id) && id > 0 && id < 2 ** 32);
}

/** The list `devices` with `id` in it, or without it: the others' entries kept as they are, labels too. */
export function devices2With(devices: XmlElement | undefined, id: number, kept = true): XmlElement {
  const others = children(devices, 'device').filter((d) => Number(d.attrs.id) !== id);
  return el('devices', { xmlns: OMEMO2 }, ...others.map((d) => el('device', { ...d.attrs, xmlns: undefined })), kept ? el('device', { id }) : null);
}

/** A bundle as the core takes it, with one of its pre-keys picked at random. */
export function bundle2Of(bundle: XmlElement | undefined): Json | null {
  const spk = child(bundle, 'spk', OMEMO2);
  const signature = textOf(child(bundle, 'spks', OMEMO2)).trim();
  const ik = textOf(child(bundle, 'ik', OMEMO2)).trim();
  const preKeys = children(child(bundle, 'prekeys', OMEMO2), 'pk', OMEMO2).filter((k) => k.attrs.id && textOf(k).trim());
  if (!spk || !signature || !ik || !preKeys.length) return null;
  const pick = preKeys[randomBytes(2).reduce((a, b) => a * 256 + b, 0) % preKeys.length];
  return {
    ik,
    spk: { id: Number(spk.attrs.id), public: textOf(spk).trim(), signature },
    pk: { id: Number(pick.attrs.id), public: textOf(pick).trim() },
  };
}

/** How many items the bundles node is asked to keep: as many as it may, else fewer (as QXmpp tries). */
export const BUNDLE_ITEMS = ['max', '1000', '100', '10'];

/** A PEP publish of `item` to `node` with id `itemId`, open to all, the node keeping `most` items. */
export function publish2Element(node: string, item: XmlElement, itemId: string, most?: string): XmlElement {
  const field = (name: string, value: string) => el('field', { var: name }, el('value', {}, value));
  return el(
    'pubsub',
    { xmlns: PUBSUB },
    el('publish', { node }, el('item', { id: itemId }, item)),
    el(
      'publish-options',
      {},
      el(
        'x',
        { xmlns: 'jabber:x:data', type: 'submit' },
        el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, 'http://jabber.org/protocol/pubsub#publish-options')),
        field('pubsub#access_model', 'open'),
        most ? field('pubsub#max_items', most) : null,
      ),
    ),
  );
}

/** Asks for one item of a node: a device's bundle, by its id. */
export function itemElement(node: string, itemId: string): XmlElement {
  return el('pubsub', { xmlns: PUBSUB }, el('items', { node }, el('item', { id: itemId })));
}

/** An OMEMO 2 <encrypted>: `keys` by whose devices they are for, the payload unless it only moves ratchets on. */
export function encrypted2Element(sid: number, keys: { jid: string; id: string; key: string; kex: boolean }[], payload: string | null): XmlElement {
  const jids = [...new Set(keys.map((k) => k.jid))];
  return el(
    'encrypted',
    { xmlns: OMEMO2 },
    el(
      'header',
      { sid },
      ...jids.map((jid) =>
        el(
          'keys',
          { jid },
          ...keys.filter((k) => k.jid === jid).map((k) => el('key', { rid: k.id, kex: k.kex ? 'true' : undefined }, k.key)),
        ),
      ),
    ),
    payload ? el('payload', {}, payload) : null,
  );
}

/** This device's key in an OMEMO 2 message, if it has one. */
export function key2For(encrypted: XmlElement, jid: string, device: number): { key: string; kex: boolean } | null {
  const header = child(encrypted, 'header', OMEMO2);
  for (const keys of children(header, 'keys', OMEMO2)) {
    if ((keys.attrs.jid ?? '').toLowerCase() !== jid) continue;
    const key = children(keys, 'key', OMEMO2).find((k) => Number(k.attrs.rid) === device);
    if (key) return { key: textOf(key).trim(), kex: key.attrs.kex === 'true' || key.attrs.kex === '1' };
  }
  return null;
}

/** What an OMEMO 2 payload carries: `body` in an SCE envelope, from us to `to`, padded to hide its length. */
export function envelope(body: string, from: string, to: string): string {
  const pad = toBase64(randomBytes(randomBytes(1)[0] % 150)).replace(/=+$/, '');
  return render(
    el(
      'envelope',
      { xmlns: SCE },
      el('content', {}, el('body', { xmlns: 'jabber:client' }, body)),
      el('rpad', {}, pad),
      el('time', { stamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }),
      el('to', { jid: to }),
      el('from', { jid: from }),
    ),
  );
}

/**
 * The words of an SCE envelope that came: its <body>, '' for one with none (a mark or a state, kept
 * for apps that read them), or null when it is not one, or says it is from someone else or for
 * another chat than the one it came in (XEP-0420: one envelope must not be passed on as another's).
 */
export function openEnvelope(text: string, from: string, to: string): string | null {
  let envelope: XmlElement;
  try {
    envelope = parseXml(text);
  } catch {
    return null;
  }
  if (envelope.name !== 'envelope' || envelope.ns !== SCE) return null;
  const said = (name: string) => (child(envelope, name, SCE)?.attrs.jid ?? '').toLowerCase();
  if (said('from') && said('from') !== from) return null;
  if (said('to') && said('to') !== to) return null;
  const content = child(envelope, 'content', SCE);
  if (!content) return null;
  return textOf(children(content, 'body').find((b) => b.ns === 'jabber:client' || b.ns === SCE || !b.ns)).trim();
}
