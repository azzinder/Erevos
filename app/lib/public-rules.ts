// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { cleanName, isRelay, isRelayKey } from '../lock/e2e-data';
import { checkedAbout, type About } from '../lock/group-data';
import { isTag } from '../lock/history';
import { fromBase64, toBase64, utf8Decode, utf8Encode } from './crypto';
import { isGroupId } from './group-signal';
import { mark, t } from './i18n';

// What public groups (docs/public-groups.md, lib/public-groups.ts) say as it travels: their link,
// the rules their owner keeps in the group itself, an admin's moderation inside the group, and a
// request to join with the owner's answer to it. Each is read back checked, as what comes from
// anyone with the link may be anything.

/** The most members a public group has: its welcome, with the group's whole tree, fits in one relay message (crates/erevos-group). */
export const MOST_MEMBERS = 100;
/** The longest the rules are in the group: the oldest bans and mutes drop out past it. */
export const MAX_RULES = 4000;
/** Requests the owner's phone keeps for an admin to answer, at most. */
export const MAX_WAITING = 50;
/** Messages deleted for everyone that each phone remembers, to drop them if they come after. */
export const MAX_DELETED = 200;

const LINK = 'erevos://join?';

/** Where to ask to join a public group, as its link says: the group, the owner's door (its sender
 *  id on the relay at `relay`, whose key is `relayKey`), the key requests are sealed to, and the
 *  group's name when the link was made. */
export type JoinLink = { group: string; door: string; relay: string; relayKey: string; key: string; name: string };

/** The door as the rules keep it: the link without the group, nor its name. */
export type Door = Omit<JoinLink, 'group' | 'name'>;

const isHex = (v: unknown, length: number): v is string => typeof v === 'string' && v.length === length && /^[0-9a-f]*$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
/** A member's key in a public group: the key it signs with there, hex. */
export const isMemberKey = (v: unknown): v is string => isHex(v, 64);

export function joinLink(link: JoinLink): string {
  const name = link.name ? `&n=${encodeURIComponent(link.name)}` : '';
  const rk = link.relayKey ? `&rk=${link.relayKey}` : '';
  return `${LINK}g=${link.group}&d=${link.door}&relay=${encodeURIComponent(link.relay)}${rk}&k=${link.key}${name}`;
}

/** Checks the parts of a link: null when one is missing or not what Erevos makes. */
export function checkJoinLink(group: unknown, door: unknown, relay: unknown, relayKey: unknown, key: unknown, name: unknown): JoinLink | null {
  const rk = relayKey ?? '';
  if (!isGroupId(group) || !isHex(door, 48) || !isRelay(relay) || !isRelayKey(key) || !(rk === '' || isRelayKey(rk))) return null;
  return { group, door, relay, relayKey: rk as string, key, name: typeof name === 'string' ? cleanName(name) : '' };
}

/** Reads a public group's link. Null if the text is not one. */
export function parseJoinLink(text: string): JoinLink | null {
  const clean = text.trim();
  if (!clean.toLowerCase().startsWith(LINK)) return null;
  const fields: Record<string, string> = {};
  for (const pair of clean.slice(LINK.length).split('&')) {
    const at = pair.indexOf('=');
    if (at < 0) continue;
    try {
      fields[pair.slice(0, at)] = decodeURIComponent(pair.slice(at + 1).replace(/\+/g, ' '));
    } catch {
      return null;
    }
  }
  return checkJoinLink(fields.g, fields.d, fields.relay, fields.rk, fields.k, fields.n);
}

/** A member's mute or ban, as the last admin's step about it said: on or off, when, and by whom (their key). */
export type Mark = { key: string; on: boolean; at: number; by: string };
/** A ban also turns away the phone's queue and its key, which a new key in the group does not change. */
export type Ban = Mark & { sender: string; seal: string };

/** What the owner keeps in the group itself (in its MLS group context): every member has the same in an epoch. */
/** `ends`: when the group ends (ms), a burner group: then every member's phone deletes it, and the owner's its door. Missing: it lasts. */
export type Rules = { admins: string[]; approve: boolean; door: Door | null; mutes: Mark[]; bans: Ban[]; ends?: number };

export const NO_RULES: Rules = { admins: [], approve: false, door: null, mutes: [], bans: [] };

function checkedMark(value: unknown): Mark | null {
  const v = (value ?? {}) as Partial<Record<keyof Mark, unknown>>;
  if (!isMemberKey(v.key) || typeof v.on !== 'boolean' || !isTime(v.at) || !isMemberKey(v.by)) return null;
  return { key: v.key, on: v.on, at: v.at, by: v.by };
}

function checkedBan(value: unknown): Ban | null {
  const mark = checkedMark(value);
  const v = (value ?? {}) as { sender?: unknown; seal?: unknown };
  if (!mark || !isHex(v.sender, 48) || !isRelayKey(v.seal)) return null;
  return { ...mark, sender: v.sender, seal: v.seal };
}

function checkedDoor(value: unknown): Door | null {
  const v = (value ?? {}) as Partial<Record<keyof Door, unknown>>;
  const link = checkJoinLink('0'.repeat(32), v.door, v.relay, v.relayKey, v.key, '');
  return link ? { door: link.door, relay: link.relay, relayKey: link.relayKey, key: link.key } : null;
}

const list = <T>(items: unknown, check: (item: unknown) => T | null): T[] =>
  Array.isArray(items) ? items.map(check).filter((item): item is T => item !== null) : [];

/** The rules as they go in the group, at most MAX_RULES bytes: the oldest marks drop out first. */
export function encodeRules(rules: Rules): Uint8Array {
  let { mutes, bans } = rules;
  for (;;) {
    const bytes = utf8Encode(JSON.stringify({ v: 1, admins: rules.admins, approve: rules.approve, door: rules.door, mutes, bans, ...(rules.ends ? { ends: rules.ends } : {}) }));
    if (bytes.length <= MAX_RULES || (mutes.length === 0 && bans.length === 0)) return bytes;
    // Marks that are off say least: they go first, then the oldest.
    const all = [...mutes, ...bans].sort((a, b) => Number(a.on) - Number(b.on) || a.at - b.at);
    const drop = all[0];
    mutes = mutes.filter((m) => m !== drop);
    bans = bans.filter((m) => m !== drop);
  }
}

/** The rules from the group, or null when they are not a public group's. */
export function decodeRules(bytes: Uint8Array): Rules | null {
  if (bytes.length === 0) return null;
  try {
    const v = JSON.parse(utf8Decode(bytes)) as Record<string, unknown>;
    if (v.v !== 1) return null;
    return {
      admins: Array.isArray(v.admins) ? v.admins.filter(isMemberKey) : [],
      approve: v.approve === true,
      door: checkedDoor(v.door),
      mutes: list(v.mutes, checkedMark),
      bans: list(v.bans, checkedBan),
      ...(isTime(v.ends) && v.ends > 0 ? { ends: v.ends } : {}),
    };
  } catch {
    return null;
  }
}

/** Of two steps about the same member, the one that counts: the later, and at the same time, the
 *  one from the admin whose key sorts first. Every phone so reaches the same, whatever the order. */
export function laterMark<T extends Mark>(kept: T | undefined, come: T): T {
  if (!kept) return come;
  if (come.at !== kept.at) return come.at > kept.at ? come : kept;
  return come.by < kept.by ? come : kept;
}

/** Marks merged, one for each member. */
export function mergeMarks<T extends Mark>(kept: T[], come: T[]): T[] {
  const by = new Map<string, T>();
  for (const mark of [...kept, ...come]) by.set(mark.key, laterMark(by.get(mark.key), mark));
  return [...by.values()];
}

/** Whether the marks say the member at `key` is muted, or banned. */
export const marked = (marks: Mark[], key: string): boolean => marks.some((m) => m.key === key && m.on);

/** What an admin says in the group to moderate it (lib/public-groups.ts). */
export type Mod =
  | { do: 'mute'; key: string; on: boolean; at: number }
  | { do: 'ban'; key: string; sender: string; seal: string; name: string; on: boolean; at: number }
  | { do: 'out'; key: string; at: number }
  | { do: 'delete'; from: string; tag: string }
  // The owner's phone tells the admins who asks to join, when joining needs their yes.
  | { do: 'asks'; key: string; name: string; at: number }
  | { do: 'let' | 'no'; key: string };

/** As it goes inside a group message, beside the words and files lib/groups.ts sends. */
export function encodeMod(mod: Mod): Uint8Array {
  return utf8Encode(JSON.stringify({ t: 'mod', ...mod }));
}

/** An admin's step, from a group message's JSON, or null when it is not one. */
export function decodeMod(v: Record<string, unknown>): Mod | null {
  if (v.t !== 'mod') return null;
  const at = isTime(v.at) ? v.at : 0;
  if (v.do === 'delete') return isMemberKey(v.from) && isTag(v.tag) ? { do: 'delete', from: v.from, tag: v.tag } : null;
  if (!isMemberKey(v.key)) return null;
  const key = v.key;
  if (v.do === 'mute' && typeof v.on === 'boolean') return { do: 'mute', key, on: v.on, at };
  if (v.do === 'ban' && typeof v.on === 'boolean' && isHex(v.sender, 48) && isRelayKey(v.seal)) {
    return { do: 'ban', key, sender: v.sender, seal: v.seal, name: typeof v.name === 'string' ? cleanName(v.name) : '', on: v.on, at };
  }
  if (v.do === 'out') return { do: 'out', key, at };
  if (v.do === 'asks' && typeof v.name === 'string') return { do: 'asks', key, name: cleanName(v.name), at };
  if (v.do === 'let' || v.do === 'no') return { do: v.do, key };
  return null;
}

/** A request to join, before it is sealed to the door's key: the group, and the key package. */
export function encodeRequest(group: string, keyPackage: Uint8Array): Uint8Array {
  return utf8Encode(JSON.stringify({ v: 1, group, kp: toBase64(keyPackage) }));
}

export function decodeRequest(bytes: Uint8Array): { group: string; keyPackage: Uint8Array } | null {
  try {
    const v = JSON.parse(utf8Decode(bytes)) as Record<string, unknown>;
    if (v.v !== 1 || !isGroupId(v.group) || typeof v.kp !== 'string' || v.kp.length > 8000) return null;
    const keyPackage = fromBase64(v.kp);
    return keyPackage.length > 0 ? { group: v.group, keyPackage } : null;
  } catch {
    return null;
  }
}

/** The owner's answer to whoever asked: the welcome, with the group's name, or no (`full`: the group has MOST_MEMBERS). */
export type Answer = { group: string; kind: 'welcome'; name: string; welcome: Uint8Array } | { group: string; kind: 'no' | 'full' };

/** The answer as it goes, sealed for its member like a group message: a line of JSON, then a zero
 *  byte and the welcome as it is, so a welcome as big as the group's tree still fits. It starts
 *  with "{", which no MLS message does. */
export function encodeAnswer(answer: Answer): Uint8Array {
  const head = utf8Encode(JSON.stringify(answer.kind === 'welcome' ? { v: 1, group: answer.group, kind: 'welcome', name: answer.name } : { v: 1, group: answer.group, kind: answer.kind }));
  const welcome = answer.kind === 'welcome' ? answer.welcome : new Uint8Array(0);
  const out = new Uint8Array(head.length + 1 + welcome.length);
  out.set(head, 0);
  out.set(welcome, head.length + 1);
  return out;
}

/** Whether what was sealed for this phone is an owner's answer rather than a group message. */
export const isAnswer = (bytes: Uint8Array): boolean => bytes[0] === 0x7b;

export function decodeAnswer(bytes: Uint8Array): Answer | null {
  const end = bytes.indexOf(0);
  if (!isAnswer(bytes) || end < 0) return null;
  try {
    const v = JSON.parse(utf8Decode(bytes.subarray(0, end))) as Record<string, unknown>;
    if (v.v !== 1 || !isGroupId(v.group)) return null;
    if (v.kind === 'no' || v.kind === 'full') return { group: v.group, kind: v.kind };
    const welcome = bytes.slice(end + 1);
    if (v.kind !== 'welcome' || welcome.length === 0) return null;
    return { group: v.group, kind: 'welcome', name: typeof v.name === 'string' ? cleanName(v.name) : '', welcome };
  } catch {
    return null;
  }
}

/** What a member says about itself in a public group: where it is reached, as in any group, and the name it chose. */
export type PublicAbout = About & { name: string };

export function encodePublicAbout(about: PublicAbout): Uint8Array {
  return utf8Encode(JSON.stringify({ ...about, name: cleanName(about.name) }));
}

/** What a member says about itself, checked, with its name; null when it is not what an Erevos says. */
export function readPublicAbout(bytes: Uint8Array | string): PublicAbout | null {
  try {
    const v = JSON.parse(typeof bytes === 'string' ? bytes : utf8Decode(bytes)) as Record<string, unknown>;
    const about = checkedAbout(v);
    return about ? { ...about, name: typeof v.name === 'string' ? cleanName(v.name) : '' } : null;
  } catch {
    return null;
  }
}

/** A member of a public group as the group shows it: the name it chose and the start of its key,
 *  so two who chose the same name are told apart. */
export function publicName(name: string, key: string): string {
  return name ? `${name} · ${key.slice(0, 4)}` : t('member {id}', { id: key.slice(0, 8) });
}

/** A note of what an admin did in a public group, as lib/groups.ts keeps it: `who|what`. */
const MODERATED: Record<string, string> = {
  muted: mark('{who} was muted.'),
  unmuted: mark('{who} can write again.'),
  banned: mark('{who} was banned.'),
  unbanned: mark('{who} is no longer banned.'),
  'taken out': mark('{who} was taken out.'),
  'is an admin': mark('{who} is an admin.'),
  'is not an admin': mark('{who} is no longer an admin.'),
  'owns the group': mark('{who} owns the group now.'),
};

/** The note's text, or null when it is not one of these. */
export function moderated(who: string, what: string): string | null {
  const text = MODERATED[what];
  return text ? t(text, { who }) : null;
}
