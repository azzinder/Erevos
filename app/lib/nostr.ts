// Nostr for what is written: a text to a contact who said they read on Nostr (lib/e2e.ts, `ns`)
// goes to the Nostr relays they named, through Tor, instead of through our relay, sealed once more
// for the key they gave this chat (a gift wrap, NIP-59, crates/erevos-nostr), signed by a key made
// for it alone. The relays see neither who wrote it nor to whom: only that someone wrote to a key
// that names no one, as each chat gives each contact a key of its own. What the wrap carries is
// the packet our relay would have carried, as it is: Nostr only carries it.
//
// Whether a space reads on Nostr, and on which relays (SpaceData.nostr), is set as it opens
// (setNostr): none with Tor off, or in a build without Nostr (lib/core.ts canNostr). Texts go
// there only while Tor is ready (lib/relay.ts torFor), as messages never wait for it.
//
// Sending (publishNostr): the wrap to each of the contact's relays, one connection to each, done
// once one of them took it. A connection that only sent closes after a minute.
//
// Reading (readNostr): one connection to each of the space's relays while something reads, asking
// for what came for the keys of the chats that read (the space's while it is open, a hidden place's
// while its chats are), from somewhat over an hour before they last read, as a wrap's time is set
// back by as much as an hour, then what comes as it comes, and again at once when the keys change.
// A connection that ends opens again, after a wait that grows. One subscription for all the keys:
// a relay sees that they are read together, through Tor, never from where.

import { isNostrRelay, MAX_NOSTR_RELAYS, type NostrKey } from '../lock/e2e-data';
import type { NostrSetting } from '../lock/space-data';
import { canNostr, nostrCore } from './core';
import { fromHex, randomBytes, toHex } from './crypto';
import { t } from './i18n';
import { torFor } from './relay';

/** How long after a text went through Nostr it goes through the relay as well, should its contact's phone not have said it came. */
export const NOSTR_BACKUP_MS = 5 * 60_000;

/** The largest packet a wrap carries (crates/erevos-nostr MAX_BYTES). */
export const NOSTR_MOST = 49_151;

// How far a wrap's time may be set back (crates/erevos-nostr WRAP_BACKDATE), and how long a relay
// is asked to keep one (WRAP_LIFETIME), seconds.
const BACKDATE = 3600;
const LIFETIME = 2 * 24 * 3600;
// What is asked of a relay starts this much before the wrap's time can be, seconds.
const SLACK = 600;
// How long a relay's answer to a wrap is waited for; one wait for what a relay says next; how long a
// connection that only sends stays open; the first and longest wait before a connection opens
// again, and the wait while nothing is to be read; milliseconds.
const ANSWER_WAIT = 20_000;
const FRAME_WAIT = 25_000;
const IDLE_CLOSE = 60_000;
const RETRY = 5000;
const RETRY_MOST = 300_000;
const IDLE_LOOK = 30_000;
// How often a chat that reads is told it read until now while its connection stays, seconds.
const CAUGHT_EVERY = 600;
// The most keys in one filter, and the most wraps remembered as taken.
const KEYS_EACH = 256;
const SEEN_MOST = 4096;

/**
 * What each Nostr relay did last, this run, for the Nostr screen (app/nostr.tsx): with the last
 * text given to it, whether it said it took it, how long after, or why not; and whether it is read
 * on now, or why it could not be. Kept in memory only, and only of the space's own relays and its
 * contacts', never which text or for whom.
 */
export type NostrRelayState = {
  sent?: { at: number; took: boolean; ms: number; why?: string };
  read?: { at: number; reading: boolean; why?: string };
};

const states = new Map<string, NostrRelayState>();
const stateListeners = new Set<() => void>();

function said(url: string, change: NostrRelayState): void {
  states.set(url, { ...states.get(url), ...change });
  stateListeners.forEach((listener) => listener());
}

const whyOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** What each relay did last, by its address. */
export function nostrStates(): Map<string, NostrRelayState> {
  return new Map(states);
}

/** Has `listener` called each time a relay did something new. Returns how to stop. */
export function onNostrStates(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

/** The relays a space reads on (SpaceData.nostr), or null when it does not: off, no relays, or Tor off. */
export function nostrOf(tor: string, setting: NostrSetting): string[] | null {
  return tor !== 'off' && setting.on && setting.relays.length > 0 ? setting.relays : null;
}

let relays: string[] | null = null;

/** Reads on these relays from now on, and says so to contacts (lib/e2e.ts), or on none: then the connections that send close too. */
export function setNostr(next: string[] | null): void {
  const list = next && canNostr() ? [...new Set(next.filter(isNostrRelay))].slice(0, MAX_NOSTR_RELAYS) : [];
  const now = list.length > 0 ? list : null;
  if (!now) closeSenders();
  if (now?.join(' ') === relays?.join(' ')) return;
  relays = now;
  readAgain();
}

/** The relays the open space reads on, or null. */
export function nostrRelays(): string[] | null {
  return relays;
}

/** Whether a text can go through Nostr now: the space reads there, and Tor is ready. */
export function nostrReady(): boolean {
  return relays !== null && torFor(false);
}

// A number as 8 bytes, big-endian, as the core takes times and waits.
function be8(n: number): Uint8Array {
  const v = Math.max(0, Math.floor(n));
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setUint32(0, Math.floor(v / 2 ** 32));
  view.setUint32(4, v >>> 0);
  return out;
}

const seconds = () => Math.floor(Date.now() / 1000);

// One connection to a Nostr relay through Tor (crates/erevos-tor text_open): JSON both ways.
class Line {
  private readonly id: Uint8Array;

  private constructor(id: Uint8Array) {
    this.id = id;
  }

  static async open(url: string): Promise<Line> {
    return new Line(await nostrCore().torTextOpen(url));
  }

  async send(frame: string): Promise<void> {
    await nostrCore().torTextSend(this.id, frame);
  }

  /** What the relay says next, or null when it said nothing for `ms`. Throws once the connection ended. */
  async next(ms: number): Promise<unknown[] | null> {
    const until = Date.now() + ms;
    for (;;) {
      const frame = await nostrCore().torTextNext(this.id, be8(Math.max(1, until - Date.now())));
      if (frame === '') return null;
      try {
        const said = JSON.parse(frame) as unknown;
        if (Array.isArray(said)) return said;
      } catch {
        // Not a frame of Nostr's: the next one.
      }
      if (Date.now() >= until) return null;
    }
  }

  close(): void {
    nostrCore()
      .torTextClose(this.id)
      .catch(() => undefined);
  }
}

// The connections that send, by relay, one wrap after another on each.
type Sender = { line: Promise<Line>; turn: Promise<unknown>; idle: ReturnType<typeof setTimeout> | null };
const senders = new Map<string, Sender>();

function senderFor(url: string): Sender {
  const known = senders.get(url);
  if (known) return known;
  const sender: Sender = { line: Line.open(url), turn: Promise.resolve(), idle: null };
  sender.line.catch(() => {
    if (senders.get(url) === sender) senders.delete(url);
  });
  senders.set(url, sender);
  return sender;
}

// Closes the connections that send, once what each is sending went.
function closeSenders(): void {
  for (const [url, sender] of senders) {
    senders.delete(url);
    if (sender.idle) clearTimeout(sender.idle);
    sender.idle = null;
    void sender.turn.then(() => sender.line).then(
      (line) => line.close(),
      () => undefined,
    );
  }
}

// Gives one relay the wrap `event` (its id `id`) and waits until it says it took it: also when it
// says it has it already. Throws when it refused it, or said nothing in time; that connection goes.
function sendOn(url: string, event: string, id: string): Promise<void> {
  const sender = senderFor(url);
  const run = sender.turn.then(async () => {
    if (sender.idle) clearTimeout(sender.idle);
    sender.idle = null;
    let line: Line | null = null;
    const began = Date.now();
    let sent = 0;
    try {
      line = await sender.line;
      await line.send(`["EVENT",${event}]`);
      sent = Date.now();
      const until = sent + ANSWER_WAIT;
      for (;;) {
        const left = until - Date.now();
        if (left <= 0) throw new Error(t('It did not say it took it within {seconds} seconds.', { seconds: ANSWER_WAIT / 1000 }));
        const answer = await line.next(left);
        if (answer?.[0] !== 'OK' || answer[1] !== id) continue;
        if (answer[2] === true || (typeof answer[3] === 'string' && answer[3].startsWith('duplicate:'))) break;
        throw new Error(typeof answer[3] === 'string' && answer[3] ? t('It refused it: "{reason}"', { reason: answer[3].slice(0, 200) }) : t('It refused it.'));
      }
    } catch (error) {
      if (senders.get(url) === sender) senders.delete(url);
      line?.close();
      said(url, { sent: { at: Date.now(), took: false, ms: Date.now() - began, why: sent ? whyOf(error) : t('Not reached: {reason}', { reason: whyOf(error) }) } });
      throw error;
    }
    said(url, { sent: { at: Date.now(), took: true, ms: Date.now() - sent } });
    if (senders.get(url) !== sender) return;
    const done = line;
    sender.idle = setTimeout(() => {
      if (senders.get(url) !== sender) return;
      senders.delete(url);
      done.close();
    }, IDLE_CLOSE);
  });
  sender.turn = run.catch(() => undefined);
  return run;
}

// Done with the first that is; throws with the last failure once all failed.
function firstOf(tries: Promise<void>[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let left = tries.length;
    if (left === 0) reject(new Error('no relay'));
    for (const one of tries) {
      one.then(resolve, (error: unknown) => {
        left--;
        if (left === 0) reject(error);
      });
    }
  });
}

/**
 * Sends `bytes` to a contact's Nostr key (`k`, hex) on its relays (`r`), through Tor, wrapped for
 * that key alone: done once one relay took it, the others still trying. Throws when none did.
 */
export async function publishNostr(to: { k: string; r: string[] }, bytes: Uint8Array): Promise<void> {
  if (bytes.length > NOSTR_MOST) throw new Error('too large');
  const event = await nostrCore().nostrWrap(fromHex(to.k), bytes, be8(seconds()));
  const { id } = JSON.parse(event) as { id: string };
  await firstOf(to.r.filter(isNostrRelay).map((url) => sendOn(url, event, id)));
}

/**
 * What reads on Nostr: a chat's keys, until when it read (seconds, 0 for never), told when it read
 * until a time, and what to do with what came for one of its keys (a packet, as from the relay).
 */
export type NostrReader = {
  keys(): NostrKey[];
  since(): number;
  caught(at: number): void;
  take(bytes: Uint8Array): Promise<void>;
};

const readers = new Set<NostrReader>();
const readings = new Map<string, Reading>();
// The wraps taken this run, by id, as each comes from every relay it went to.
const seen = new Set<string>();

/** Reads for `reader` on the space's relays until the function it gives is called. */
export function readNostr(reader: NostrReader): () => void {
  readers.add(reader);
  readAgain();
  return () => {
    readers.delete(reader);
    readAgain();
  };
}

/** Asks the relays again for the keys as they are now: one was just made. */
export function nostrKeysChanged(): void {
  for (const reading of readings.values()) reading.wake();
}

// A connection to each relay while something reads, none to others.
function readAgain(): void {
  const wanted = relays && readers.size > 0 ? relays : [];
  for (const [url, reading] of readings) {
    if (wanted.includes(url)) continue;
    reading.stop();
    readings.delete(url);
  }
  for (const url of wanted) if (!readings.has(url)) readings.set(url, new Reading(url));
  nostrKeysChanged();
}

// What to ask a relay for: a filter for each reader with keys, from before when it last read.
function wanted(): { says: string; filters: object[]; of: NostrReader[] } {
  const now = seconds();
  const filters: object[] = [];
  const of: NostrReader[] = [];
  const says: string[] = [];
  for (const reader of readers) {
    const keys = [...new Set(reader.keys().map((key) => key.p))].sort();
    if (keys.length === 0) continue;
    const read = reader.since();
    const since = read > 0 ? Math.max(0, read - BACKDATE - SLACK) : now - LIFETIME - BACKDATE;
    for (let i = 0; i < keys.length; i += KEYS_EACH) filters.push({ kinds: [1059], '#p': keys.slice(i, i + KEYS_EACH), since });
    of.push(reader);
    says.push(keys.join(','));
  }
  return { says: says.join(';'), filters, of };
}

// One wrap a relay sent: opened for the reader whose key it names, once.
async function takeWrap(event: unknown): Promise<void> {
  const wrap = event as { id?: unknown; tags?: unknown } | null;
  if (typeof wrap?.id !== 'string' || seen.has(wrap.id) || !Array.isArray(wrap.tags)) return;
  const p = (wrap.tags as unknown[]).find((tag): tag is [string, string] => Array.isArray(tag) && tag[0] === 'p' && typeof tag[1] === 'string')?.[1];
  for (const reader of readers) {
    const key = reader.keys().find((k) => k.p === p);
    if (!key) continue;
    seen.add(wrap.id);
    if (seen.size > SEEN_MOST) seen.delete(seen.values().next().value as string);
    let opened: Uint8Array;
    try {
      opened = await nostrCore().nostrUnwrap(fromHex(key.s), JSON.stringify(event));
    } catch {
      return;
    }
    // Its id (32 bytes) and time (8) first, then what it carried.
    await reader.take(opened.slice(40)).catch(() => undefined);
    return;
  }
}

// Reading one relay: a connection while there is something to read, opened again when it ends.
class Reading {
  private stopped = false;
  private line: Line | null = null;
  private waking: (() => void) | null = null;
  // What the open connection asked for: on which subscription, for what (`wanted` says), when, of
  // which readers, whether the relay sent all it had (`live`), and when they were last told so.
  private asking: { line: Line; sub: string; says: string; at: number; of: NostrReader[]; live: boolean; caught: number } | null = null;
  private turn: Promise<void> = Promise.resolve();

  private readonly url: string;

  constructor(url: string) {
    this.url = url;
    void this.run();
  }

  stop(): void {
    this.stopped = true;
    this.line?.close();
    this.wake();
  }

  /** Ends a wait before opening the connection again, or while there was nothing to read, and asks again on an open one. */
  wake(): void {
    this.waking?.();
    if (this.asking) this.ask().catch(() => undefined);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        if (this.waking === done) this.waking = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.waking = done;
    });
  }

  private async run(): Promise<void> {
    let wait = RETRY;
    while (!this.stopped) {
      if (!torFor(false) || wanted().of.length === 0) {
        await this.sleep(IDLE_LOOK);
        continue;
      }
      let ended = false;
      try {
        this.line = await Line.open(this.url);
        if (this.stopped) break;
        said(this.url, { read: { at: Date.now(), reading: true } });
        ended = await this.read(this.line);
        wait = RETRY;
      } catch (error) {
        said(this.url, { read: { at: Date.now(), reading: false, why: whyOf(error) } });
        ended = true;
      }
      this.line?.close();
      this.line = null;
      if (this.stopped) break;
      if (ended) {
        await this.sleep(wait);
        wait = Math.min(wait * 2, RETRY_MOST);
      }
    }
    this.line?.close();
  }

  // Asks for what `wanted` says now, should that differ from what was asked: on a subscription of
  // its own, the one before closed, so only the end of what it has says what was read. One at a
  // time, as the keys may change while the connection waits for the relay.
  private ask(): Promise<void> {
    const run = this.turn.then(async () => {
      const asking = this.asking;
      const now = wanted();
      if (!asking || now.of.length === 0 || now.says === asking.says) return;
      const before = asking.sub;
      Object.assign(asking, { sub: toHex(randomBytes(8)), says: now.says, at: seconds(), of: now.of, live: false });
      if (before) await asking.line.send(JSON.stringify(['CLOSE', before]));
      await asking.line.send(JSON.stringify(['REQ', asking.sub, ...now.filters]));
    });
    this.turn = run.catch(() => undefined);
    return run;
  }

  // Asks for what came, then takes it as it comes. Returns false when nothing is to be read any
  // more (the connection closes), true when the relay ended the subscription; throws when the
  // connection ended.
  private async read(line: Line): Promise<boolean> {
    const asking = { line, sub: '', says: '', at: 0, of: [] as NostrReader[], live: false, caught: 0 };
    this.asking = asking;
    try {
      for (;;) {
        if (this.stopped || wanted().of.length === 0 || !torFor(false)) return false;
        await this.ask();
        const said = await line.next(FRAME_WAIT);
        if (!said) {
          if (asking.live && seconds() - asking.caught >= CAUGHT_EVERY) {
            asking.caught = seconds() - 60;
            for (const reader of asking.of) reader.caught(asking.caught);
          }
          continue;
        }
        // What a subscription closed before still sends is taken too; only the last one ends.
        if (said[0] === 'EVENT') await takeWrap(said[2]);
        else if (said[1] !== asking.sub) continue;
        else if (said[0] === 'EOSE') {
          asking.live = true;
          asking.caught = asking.at;
          for (const reader of asking.of) reader.caught(asking.at);
        } else if (said[0] === 'CLOSED') return true;
      }
    } finally {
      if (this.asking === asking) this.asking = null;
    }
  }
}
