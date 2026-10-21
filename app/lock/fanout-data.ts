import { sealedFile, type Holder } from './sealed-file';

// The copies of what a space's chat, or its hidden chats, sealed for a contact that wait for the
// relay, one for each endpoint of their account it went to beside the account itself (lib/e2e.ts,
// docs/multi-device.md), oldest first. Kept sealed with that chat's key in FILE, one value for each
// space and each hidden chats (sealed-file.ts), apart from the chat's own (lock/e2e-data.ts), which
// is saved first: a copy lost in between is a message that endpoint does not get, never a message
// key used twice. No backup holds it. Each space's chat writes its own value as it opens, should it
// find none it opens (the file not there yet, or written first by another space), so the file is
// there whichever chats copy, every space's value in it opens with that space's key, and neither
// tells anything of the other spaces or of hidden chats.

/**
 * A copy for one endpoint: its contact, the endpoint's identity (`w`, hex), the packet (base64),
 * when it was sealed (`at`, ms), and whether it is the first of a conversation started with it
 * (`first`), which goes before anything else of that one. It goes where the way to that endpoint
 * says it reads when it goes, not when it was sealed. `n` tells it apart from the others. With
 * `mark`, it is the last packet of a message someone reads, and tells the relay so (lib/relay.ts,
 * Mark), as what went to the account does; without it, quiet.
 */
export type Copy = { n: number; c: string; w: string; p: string; at: number; first?: true; mark?: 'message' };

export type FanoutData = { copies: Copy[]; next: number };

export const EMPTY_FANOUT: FanoutData = { copies: [], next: 1 };

export const FILE = 'erevos-fanout';
const BLOCK = 4 * 1024;
/**
 * How many copies wait for one endpoint before nothing new is copied to it, the most in all, and
 * for how long. Once as many wait for one, for the relay or for what went to the account, nothing
 * new is copied to it until some went, but a voice message goes on to its last part (lib/e2e.ts),
 * so it goes whole or not at all, and one endpoint holds at most 114 (49, 64 parts and a first
 * packet); once all are taken, the oldest of the contact with the most give way. A list names at
 * most four endpoints, so one contact holds less than half of all. One older than the relay keeps
 * a message goes unsent.
 */
export const MAX_COPIES_EACH = 50;
export const MAX_COPIES = 1000;
export const COPIES_LAST = 14 * 24 * 60 * 60_000;

const isText = (v: unknown): v is string => typeof v === 'string';
const isBase64 = (v: unknown): v is string => isText(v) && v.length > 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]+$/.test(v);
const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;

function checkedCopy(value: unknown): Copy | null {
  const v = (value ?? {}) as Partial<Record<keyof Copy, unknown>>;
  if (!isCount(v.n) || !isHex(v.c, 64) || !isHex(v.w, 64) || !isBase64(v.p) || !isCount(v.at)) return null;
  return { n: v.n, c: v.c, w: v.w, p: v.p, at: v.at, ...(v.first === true ? { first: true as const } : {}), ...(v.mark === 'message' ? { mark: 'message' as const } : {}) };
}

function checked(value: unknown): FanoutData {
  const v = (value ?? {}) as Partial<Record<keyof FanoutData, unknown>>;
  const copies = Array.isArray(v.copies) ? v.copies.map(checkedCopy).filter((c): c is Copy => c !== null).slice(-MAX_COPIES) : [];
  const next = Math.max(isCount(v.next) ? v.next : 1, ...copies.map((c) => c.n + 1));
  return { copies, next };
}

const store = sealedFile({ name: FILE, empty: EMPTY_FANOUT, checked, block: BLOCK });

export const loadFanoutData = (holder: Holder, space: number, key: Uint8Array) => store.load(holder, space, key);
export const saveFanoutData = (holder: Holder, space: number, key: Uint8Array, data: FanoutData) => store.save(holder, space, key, data);

/** Writes a space's copies as they are when its value in FILE does not open with its key: FILE is not there yet, or another space wrote it first. */
export async function keepFanoutFile(space: number, key: Uint8Array, data: FanoutData): Promise<void> {
  if (!(await store.opens('space', space, key))) await store.save('space', space, key, data);
}
