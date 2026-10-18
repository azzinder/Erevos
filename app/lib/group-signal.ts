import { cleanName } from '../lock/e2e-data';

import { fromBase64, toBase64 } from './crypto';

// What a group's admin and a contact it adds say to each other, inside their own end-to-end
// encrypted chat (lib/e2e.ts), to bring the contact into the group (lib/groups.ts): the admin
// asks for a key package, the contact's phone answers with one, and the admin sends the welcome
// that joins the group. Everything after goes as group messages (MLS).

export type GroupSignal =
  | { group: string; kind: 'ask' }
  | { group: string; kind: 'keys'; data: Uint8Array }
  // `name`: the group's name, as the admin gave it.
  | { group: string; kind: 'welcome'; data: Uint8Array; name: string };

/** The longest a group's name is. */
export const MAX_GROUP_NAME = 40;
// A key package or welcome sent, at most: it must fit in one message with room to spare.
const MAX_DATA = 48_000;

export const isGroupId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);

/** A group's name as kept: one line, as contact names are. */
export function cleanGroupName(text: string): string {
  return cleanName(text).slice(0, MAX_GROUP_NAME);
}

/** As it travels inside a message. */
export function encodeGroup(signal: GroupSignal): Record<string, unknown> {
  if (signal.kind === 'ask') return { group: signal.group, kind: 'ask' };
  if (signal.kind === 'keys') return { group: signal.group, kind: 'keys', data: toBase64(signal.data) };
  return { group: signal.group, kind: 'welcome', data: toBase64(signal.data), name: signal.name };
}

/** A group signal from an opened message, or null when it is not one. */
export function decodeGroup(value: unknown): GroupSignal | null {
  const v = value as Record<string, unknown> | null;
  if (!v || !isGroupId(v.group)) return null;
  const group = v.group;
  if (v.kind === 'ask') return { group, kind: 'ask' };
  if (typeof v.data !== 'string' || v.data.length > MAX_DATA) return null;
  let data: Uint8Array;
  try {
    data = fromBase64(v.data);
  } catch {
    return null;
  }
  if (data.length === 0) return null;
  if (v.kind === 'keys') return { group, kind: 'keys', data };
  if (v.kind === 'welcome') return { group, kind: 'welcome', data, name: typeof v.name === 'string' ? cleanGroupName(v.name) : '' };
  return null;
}
