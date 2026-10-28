import { currentSpace } from '../lock/keys';
import { loadNostrDm, saveNostrDm } from '../lock/nostr-dm-data';
import { canNostrChat } from './core';
import { t } from './i18n';
import {
  addMessage,
  authEvent,
  chatOf,
  forgetChat,
  inboxEvent,
  inboxFilter,
  inboxOf,
  LOOKUP_RELAYS,
  markRead,
  nameIn,
  newNostrDm,
  profileEvent,
  readKey,
  setInbox,
  takeWrap,
  wrapText,
  type NostrDmState,
} from './nostr-dm';
import { lookUpNip05, NostrRelay, type NostrEvent } from './nostr-dm-net';

// The open space's Nostr chats as the screens use them (app/nostr-chats.tsx, app/nostr-chat.tsx):
// loaded from their sealed value (lock/nostr-dm-data.ts), reading the space's inbox relays while
// the space is open, and kept again after each change. Everything that changes the account runs one
// after another, as lib/xmpp-store.ts does; the relays are read all the while, apart from that.
//
// Each inbox relay has a connection of its own that reads, and answers one that asks who reads
// (NIP-42). Messages go out on other connections, which never say whose they are; so do look-ups
// of where someone reads and what they call themselves.

type Live = {
  space: number;
  key: Uint8Array;
  state: NostrDmState | null;
  loaded: boolean;
  problem: string;
  stopped: boolean;
  queue: Promise<unknown>;
  saving: ReturnType<typeof setTimeout> | null;
  /** The inbox relays read now, by address. */
  reading: Map<string, NostrRelay>;
  /** Which inbox each reader belongs to: a new inbox stops the old ones. */
  inboxAt: number;
  telling: boolean;
  /** The inbox or name changed while they were being told: told again after. */
  tellAgain: boolean;
  /** When the last list or name went out (seconds): the next one is newer, or relays keep the old. */
  listedAt: number;
};

let live: Live | null = null;
const listeners = new Set<() => void>();

/** Told each time the account or its chats change. */
export function onNostrDmChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const told = () => listeners.forEach((listener) => listener());

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));
const seconds = (now = Date.now()) => Math.floor(now / 1000);

/** The open space's account as it is now, how many of its inbox relays it reads, and whether through Tor. */
export function nostrDmNow(): { loaded: boolean; state: NostrDmState | null; problem: string; reading: number; tor: boolean } {
  const readers = [...(live?.reading.values() ?? [])].filter((relay) => relay.open);
  return { loaded: live?.loaded ?? false, state: live?.state ?? null, problem: live?.problem ?? '', reading: readers.length, tor: readers.length > 0 && readers.every((relay) => relay.tor) };
}

/** How many messages are not read in the open space's Nostr chats. */
export function nostrDmUnread(): number {
  const state = live?.state;
  return state ? Object.values(state.chats).reduce((sum, chat) => sum + chat.unread, 0) : 0;
}

function stillOpen(it: Live): boolean {
  if (it.stopped) return false;
  try {
    return currentSpace().space === it.space;
  } catch {
    return false;
  }
}

function keepSoon(it: Live): void {
  if (it.saving) return;
  it.saving = setTimeout(() => {
    it.saving = null;
    saveNostrDm(it.space, it.key, it.state).catch((error: unknown) => {
      it.problem = reason(error);
      told();
    });
  }, 500);
}

function changeAccount<T>(it: Live, change: () => Promise<T>): Promise<T> {
  const run = it.queue.catch(() => undefined).then(change);
  it.queue = run;
  return run.finally(() => {
    keepSoon(it);
    told();
  });
}

// Connections that only send or look up, by relay, kept a minute after their last use.
const IDLE_CLOSE = 60_000;
const out = new Map<string, { relay: Promise<NostrRelay>; idle: ReturnType<typeof setTimeout> | null }>();

function outTo(url: string): Promise<NostrRelay> {
  let held = out.get(url);
  if (held) {
    if (held.idle) clearTimeout(held.idle);
    held.idle = null;
  } else {
    held = { relay: NostrRelay.open(url, null), idle: null };
    const it = held;
    out.set(url, it);
    it.relay.then(
      (relay) => relay.onEnd(() => out.get(url) === it && out.delete(url)),
      () => out.get(url) === it && out.delete(url),
    );
  }
  const used = held;
  used.idle = setTimeout(() => {
    if (out.get(url) !== used) return;
    out.delete(url);
    void used.relay.then((relay) => relay.close()).catch(() => undefined);
  }, IDLE_CLOSE);
  return held.relay;
}

function closeOut(): void {
  for (const [url, held] of out) {
    if (held.idle) clearTimeout(held.idle);
    out.delete(url);
    void held.relay.then((relay) => relay.close()).catch(() => undefined);
  }
}

/** Sends `event` to each relay; answers how many took it. */
async function publish(urls: string[], event: NostrEvent): Promise<number> {
  const took = await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        return (await (await outTo(url)).publish(event)).ok;
      } catch {
        return false;
      }
    }),
  );
  return took.filter(Boolean).length;
}

/** What these relays have for `filters`, together. */
async function lookUp(urls: string[], filters: Record<string, unknown>[], ms = 8000): Promise<NostrEvent[]> {
  const found = await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        return await (await outTo(url)).query(filters, ms);
      } catch {
        return [];
      }
    }),
  );
  return found.flat();
}

/** Says where the space reads, once its inbox changed or a week went by, and its name if it gave one. */
async function tell(it: Live): Promise<void> {
  if (it.telling) {
    it.tellAgain = true;
    return;
  }
  it.telling = true;
  try {
    do {
      it.tellAgain = false;
      const state = it.state;
      if (!state || state.told > seconds() - 7 * 24 * 3600) return;
      const where = [...state.inbox, ...LOOKUP_RELAYS];
      // A relay keeps one list per key, the newest: two in the same second could keep the older.
      const at = Math.max(Date.now(), (it.listedAt + 1) * 1000);
      it.listedAt = seconds(at);
      const events = [await inboxEvent(state, at)];
      if (state.name !== undefined) events.push(await profileEvent(state, at));
      let took = 0;
      for (const event of events) took += await publish(where, event);
      if (took > 0 && it.state === state && !it.tellAgain) {
        await changeAccount(it, async () => {
          state.told = seconds();
        });
      }
    } while (it.tellAgain && stillOpen(it));
  } finally {
    it.telling = false;
  }
}

/** Whether `ended` came within `ms`. */
function endedWithin(ended: Promise<unknown>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    void ended.then(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

/** Reads one inbox relay while the space is open and the inbox still names it, connecting again after a wait that grows. */
async function read(it: Live, url: string, inboxAt: number): Promise<void> {
  let wait = 3000;
  while (stillOpen(it) && it.state && it.inboxAt === inboxAt) {
    const state = it.state;
    try {
      const relay = await NostrRelay.open(url, (where, challenge) => authEvent(state, where, challenge));
      if (!stillOpen(it) || it.inboxAt !== inboxAt) {
        relay.close();
        return;
      }
      it.reading.set(url, relay);
      told();
      const askedAt = seconds();
      let caughtUp = false;
      const stop = relay.subscribe(
        [inboxFilter(state)],
        (event) =>
          void changeAccount(it, async () => {
            if (it.state === state) await takeWrap(state, event);
          }),
        () => {
          caughtUp = true;
          void changeAccount(it, async () => {
            state.caught = Math.max(state.caught, askedAt);
          });
        },
      );
      wait = 3000;
      // While it reads: what came since counts as read too, every ten minutes.
      const ended = relay.whenEnded();
      for (;;) {
        const done = await endedWithin(ended, 600_000);
        if (done || !stillOpen(it) || it.inboxAt !== inboxAt) break;
        if (caughtUp) {
          void changeAccount(it, async () => {
            state.caught = Math.max(state.caught, seconds() - 60);
          });
        }
      }
      stop();
      relay.close();
      if (it.reading.get(url) === relay) it.reading.delete(url);
      told();
    } catch (error) {
      it.problem = reason(error);
      told();
    }
    if (!stillOpen(it) || it.inboxAt !== inboxAt) return;
    await new Promise((resolve) => setTimeout(resolve, wait));
    wait = Math.min(wait * 2, 300_000);
  }
}

function startReading(it: Live): void {
  const state = it.state;
  if (!state) return;
  it.inboxAt += 1;
  for (const relay of it.reading.values()) relay.close();
  it.reading.clear();
  for (const url of state.inbox) void read(it, url, it.inboxAt);
  void tell(it).catch(() => undefined);
}

/** Loads the open space's account, once, and reads its inbox while the space stays open. */
export function runNostrDm(): void {
  if (!canNostrChat()) return;
  let space: { space: number; key: Uint8Array };
  try {
    space = currentSpace();
  } catch {
    return;
  }
  if (live && live.space === space.space && !live.stopped) return;
  stopNostrDm();
  const it: Live = { ...space, state: null, loaded: false, problem: '', stopped: false, queue: Promise.resolve(), saving: null, reading: new Map(), inboxAt: 0, telling: false, tellAgain: false, listedAt: 0 };
  live = it;
  loadNostrDm(space.space, space.key)
    .then((state) => {
      // What was still going when the space closed did not go.
      for (const chat of Object.values(state?.chats ?? {})) for (const m of chat.messages) if (m.state === 'sending') m.state = 'failed';
      it.state = state;
      it.loaded = true;
      told();
      startReading(it);
    })
    .catch((error: unknown) => {
      it.loaded = true;
      it.problem = reason(error);
      told();
    });
}

/** Stops reading and lets go of the account, as its space closes. */
export function stopNostrDm(): void {
  if (!live) return;
  live.stopped = true;
  live.inboxAt += 1;
  for (const relay of live.reading.values()) relay.close();
  live.reading.clear();
  live = null;
  closeOut();
  told();
}

function need(): Live & { state: NostrDmState } {
  if (!live?.state) throw new Error(t('There are no Nostr chats in this space.'));
  return live as Live & { state: NostrDmState };
}

function opened(): Live {
  if (!live || live.stopped) throw new Error(t('There are no Nostr chats in this space.'));
  return live;
}

async function begin(it: Live, state: NostrDmState): Promise<void> {
  await changeAccount(it, async () => {
    it.state = state;
    it.problem = '';
  });
  await saveNostrDm(it.space, it.key, state);
  startReading(it);
}

/** Makes the open space a Nostr key of its own. */
export async function nostrDmMake(): Promise<void> {
  const it = opened();
  await begin(it, await newNostrDm());
}

/** Brings a key from another Nostr app: its nsec. */
export async function nostrDmBring(nsec: string): Promise<void> {
  const it = opened();
  const written = await readKey(nsec);
  if (written.type !== 'nsec' || !written.secret) throw new Error(t('Write the key that starts with nsec1, from the app that has it.'));
  await begin(it, await newNostrDm(written.secret));
}

/** Forgets the space's key and its chats here. */
export async function nostrDmForget(): Promise<void> {
  const it: Live = need();
  await changeAccount(it, async () => {
    it.state = null;
    it.inboxAt += 1;
    for (const relay of it.reading.values()) relay.close();
    it.reading.clear();
  });
  await saveNostrDm(it.space, it.key, null);
}

/** Reads on these relays from now on, and tells others so. */
export async function nostrDmSetInbox(relays: string[]): Promise<void> {
  const it = need();
  await changeAccount(it, async () => setInbox(it.state, relays));
  startReading(it);
}

/** The name the space shows to other Nostr apps (published, so anyone can read it), or none. */
export async function nostrDmSetName(name: string): Promise<void> {
  const it = need();
  await changeAccount(it, async () => {
    it.state.name = name.trim().slice(0, 64);
    it.state.told = 0;
  });
  await tell(it);
}

/** Where `key` reads (their kind 10050), as looked up now, and their name. */
async function lookUpPerson(it: Live & { state: NostrDmState }, key: string): Promise<string[] | null> {
  const state = it.state;
  const chat = state.chats[key];
  const where = [...state.inbox, ...LOOKUP_RELAYS, ...(chat?.hints ?? [])];
  const events = await lookUp(where, [{ kinds: [10050, 0], authors: [key] }]);
  const relays = await inboxOf(key, events);
  const name = await nameIn(key, events);
  await changeAccount(it, async () => {
    state.people[key] = { ...(name ? { name } : {}), at: seconds() };
    if (relays && state.chats[key]) {
      state.chats[key].relays = relays;
      state.chats[key].relaysAt = seconds();
    }
  });
  return relays;
}

/** Starts a chat with someone written as an npub, an nprofile or a name@domain (NIP-05); answers their key. */
export async function nostrDmStart(written: string, name = ''): Promise<string> {
  const it = need();
  const text = written.trim();
  let found: { public: string; relays: string[] } | null;
  if (/^[^@\s]+@[^@\s]+$/.test(text) && !text.startsWith('npub') && !text.startsWith('nprofile')) {
    found = await lookUpNip05(text).catch((error: unknown) => {
      // Tor not ready says so; a name that cannot be reached is one with no key.
      if (error instanceof Error && error.message === t('Tor is not ready.')) throw error;
      return null;
    });
    if (!found) throw new Error(t('No Nostr key was found for {name}.', { name: text }));
  } else {
    const key = await readKey(text);
    if (key.type === 'nsec') throw new Error(t('This is a secret key (nsec): never give it to anyone. Write their npub.'));
    found = key;
  }
  const key = found.public;
  await changeAccount(it, async () => {
    const chat = chatOf(it.state, key);
    if (name.trim()) chat.name = name.trim().slice(0, 64);
    const hints = found!.relays.filter((r) => /^wss?:\/\//.test(r)).slice(0, 5);
    if (hints.length) chat.hints = hints;
    chat.lastAt ||= Date.now();
  });
  void lookUpPerson(it, key).catch(() => undefined);
  return key;
}

/** Looks up the name and inbox of `key` again when it is a week old or never was. */
export function nostrDmFreshen(key: string): void {
  const it = live;
  if (!it?.state) return;
  const at = it.state.people[key]?.at ?? 0;
  if (at > seconds() - 7 * 24 * 3600) return;
  void lookUpPerson(it as Live & { state: NostrDmState }, key).catch(() => undefined);
}

/** Sends `text` to `key`: to the relays they read on, and a copy to the space's own. */
export async function nostrDmSend(key: string, text: string): Promise<void> {
  const it = need();
  const state = it.state;
  const self = key === state.public;
  const chat = chatOf(state, key);
  let relays = self ? state.inbox : chat.relays && (chat.relaysAt ?? 0) > seconds() - 6 * 3600 ? chat.relays : null;
  if (!relays) relays = (await lookUpPerson(it, key).catch(() => null)) ?? chat.relays ?? null;
  if (!relays?.length) throw new Error(t('Their Nostr app does not say where it takes private messages (NIP-17), so they cannot get one yet.'));
  const { message, theirs, ours } = await wrapText(state, key, text);
  await changeAccount(it, async () => {
    addMessage(state, key, message);
    state.seen.push(ours.id);
  });
  // Our own copy, for the space's other apps with this key; then theirs, which says whether it went.
  if (!self) void publish(state.inbox, ours);
  const took = await publish(relays, theirs);
  await changeAccount(it, async () => {
    message.state = took > 0 ? 'sent' : 'failed';
  });
  if (!took) throw new Error(t('None of their relays took the message. Try again later.'));
}

/** Sends a message that failed once more, as a new one. */
export async function nostrDmRetry(key: string, id: string): Promise<void> {
  const it = need();
  const chat = it.state.chats[key];
  const failed = chat?.messages.find((m) => m.id === id && m.state === 'failed');
  if (!failed) return;
  await changeAccount(it, async () => {
    chat.messages = chat.messages.filter((m) => m !== failed);
  });
  await nostrDmSend(key, failed.text);
}

export function nostrDmRead(key: string): Promise<void> {
  const it = need();
  if (!it.state.chats[key]?.unread) return Promise.resolve();
  return changeAccount(it, async () => markRead(it.state, key));
}

export function nostrDmRename(key: string, name: string): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    const chat = chatOf(it.state, key);
    chat.name = name.trim().slice(0, 64) || undefined;
  });
}

export function nostrDmForgetChat(key: string): Promise<void> {
  const it = need();
  return changeAccount(it, async () => forgetChat(it.state, key));
}
