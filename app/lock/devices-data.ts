import { readOffer, type FileOffer } from '../lib/attachments';
import { checkedPlace, checkedSynced, type Place, type Synced } from '../lib/link-wire';

import { sealedFile } from './sealed-file';

// What each space keeps of its links to the account's other devices (lib/devices.ts): on the phone
// that holds the account (the primary), each linked device; on a linked device, the primary. For
// each, the conversation of the link, where it reads, and what waits to go to it. Kept sealed with the
// space's key in FILE, one value for each space (sealed-file.ts), in blocks of BLOCK bytes. Hidden
// chats have none: they are never linked. A backup leaves this file out, so after restoring one the
// devices are linked again.

/** What of the history still goes to a device: from `since` (milliseconds, 0 for all of it) up to `upTo`, photos and files too or not, and how many of those messages went. */
export type Job = { since: number; files: boolean; upTo: number; done: number };

export type Peer = {
  /** The identity of its link key, hex. */
  id: string;
  /** What it is called. */
  name: string;
  /** The link's conversation, base64. */
  conversation: string;
  /** Where it reads. */
  at: Place;
  /** When it was linked, and when last heard from, milliseconds. */
  since: number;
  heard: number;
  /** On the primary: whether the device said the codes match. Nothing but the first message goes to it before. */
  linked: boolean;
  /** Packets for it, base64, oldest first, that the relay has not taken yet. */
  outbox: string[];
  /** Where this side's queue was last said to it, as JSON, so a new one is said at once. */
  told: string;
  /** On the primary: what of the history still goes to it, whether photos and files were chosen to go, and since when the outbox had no room for it (0 if it had). */
  history: Job | null;
  files: boolean;
  behind: number;
};

/**
 * On the primary: a photo or file that came, passed on to devices, or a copy of one put on the relay
 * for them, left there until each device it went to took it (`devices`, by id) and, if it is still
 * to, this phone (`phone`): where it is (as FileRef's `from`), and when it was left.
 */
export type Left = { relay: string; ids: string; at: number; phone: boolean; devices: string[] };

/** A device being linked: the key its code shows (its secret, base64), the code's secret, its name, and when it was made. */
export type Offer = { account: string; secret: string; name: string; made: number };

/** A device being linked, once a phone answered: the phone, the account's identity, and the code to compare. */
export type Answer = { peer: Peer; account: string; code: string };

export type DevicesData = {
  /** On the primary: its linked devices, and those still being linked. */
  devices: Peer[];
  /** On a linked device: the phone that holds the account. */
  primary: Peer | null;
  /** On a linked device: the account's identity, hex. */
  account: string;
  /** The account's contact link: on the primary as last said, on a linked device as last heard. */
  link: string;
  offer: Offer | null;
  answer: Answer | null;
  /** What of each contact was last said between the devices, by identity, so only what changed goes. */
  synced: Record<string, Synced>;
  /** On a linked device: packs of the history the primary put on the relay, still to take. */
  packs: FileOffer[];
  /** On the primary: photos and files left on the relay for devices still to take them. */
  left: Left[];
};

export const EMPTY_DEVICES: DevicesData = { devices: [], primary: null, account: '', link: '', offer: null, answer: null, synced: {}, packs: [], left: [] };

export const FILE = 'erevos-devices';
const BLOCK = 16 * 1024;
/** The most packets that wait for one device: once there are as many, nothing more is sealed for it until they went. */
export const MAX_OUTBOX = 300;
/** The most photos and files kept track of as left on the relay for devices: the oldest are let go, to expire there. */
export const MAX_LEFT = 1000;

const isText = (v: unknown): v is string => typeof v === 'string';
const isBase64 = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]+$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function checkedJob(value: unknown): Job | null {
  const v = value as Partial<Record<keyof Job, unknown>> | null;
  if (!v || typeof v !== 'object' || !isTime(v.since) || !isTime(v.upTo) || !isTime(v.done)) return null;
  return { since: v.since, files: v.files === true, upTo: v.upTo, done: v.done };
}

function checkedLeft(value: unknown): Left | null {
  const v = (value ?? {}) as Partial<Record<keyof Left, unknown>>;
  if (!isText(v.relay) || !isText(v.ids) || !/^(?:[0-9a-f]{48})+$/.test(v.ids) || !isTime(v.at)) return null;
  const devices = Array.isArray(v.devices) ? v.devices.filter((id): id is string => isHex(id, 64)) : [];
  return { relay: v.relay, ids: v.ids, at: v.at, phone: v.phone === true, devices };
}

function checkedPeer(value: unknown): Peer | null {
  const v = (value ?? {}) as Partial<Record<keyof Peer, unknown>>;
  const at = checkedPlace(v.at);
  if (!isHex(v.id, 64) || !isBase64(v.conversation) || !v.conversation || !at) return null;
  return {
    id: v.id,
    name: isText(v.name) ? v.name : '',
    conversation: v.conversation,
    at,
    since: isTime(v.since) ? v.since : 0,
    heard: isTime(v.heard) ? v.heard : 0,
    linked: v.linked === true,
    outbox: Array.isArray(v.outbox) ? v.outbox.filter(isBase64) : [],
    told: isText(v.told) ? v.told : '',
    history: checkedJob(v.history),
    files: v.files === true,
    behind: isTime(v.behind) ? v.behind : 0,
  };
}

function checked(value: unknown): DevicesData {
  const v = (value ?? {}) as Partial<Record<keyof DevicesData, unknown>>;
  const o = v.offer as Partial<Record<keyof Offer, unknown>> | null;
  const a = v.answer as Partial<Record<keyof Answer, unknown>> | null;
  const answerPeer = a ? checkedPeer(a.peer) : null;
  const synced: Record<string, Synced> = {};
  if (v.synced && typeof v.synced === 'object') {
    for (const [id, s] of Object.entries(v.synced)) {
      const one = checkedSynced(s);
      if (one && one.identity === id) synced[id] = one;
    }
  }
  return {
    devices: Array.isArray(v.devices) ? v.devices.map(checkedPeer).filter((p): p is Peer => p !== null) : [],
    primary: checkedPeer(v.primary),
    account: isHex(v.account, 64) ? v.account : '',
    link: isText(v.link) ? v.link : '',
    offer: o && isBase64(o.account) && o.account && isHex(o.secret, 32) ? { account: o.account, secret: o.secret, name: isText(o.name) ? o.name : '', made: isTime(o.made) ? o.made : 0 } : null,
    answer: a && answerPeer && isHex(a.account, 64) && isText(a.code) ? { peer: answerPeer, account: a.account, code: a.code } : null,
    synced,
    packs: Array.isArray(v.packs) ? v.packs.map(readOffer).filter((o): o is FileOffer => o !== null) : [],
    left: Array.isArray(v.left) ? v.left.map(checkedLeft).filter((l): l is Left => l !== null).slice(-MAX_LEFT) : [],
  };
}

const store = sealedFile({ name: FILE, empty: EMPTY_DEVICES, checked, block: BLOCK });

export const loadDevicesData = (space: number, key: Uint8Array) => store.load('space', space, key);
export const saveDevicesData = (space: number, key: Uint8Array, data: DevicesData) => store.save('space', space, key, data);
