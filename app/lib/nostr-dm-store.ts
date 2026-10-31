import { checkedChatNotify, type ChatNotify } from '../lock/chat-notify';
import { currentSpace } from '../lock/keys';
import { loadNostrDm, saveNostrDm } from '../lock/nostr-dm-data';
import type { Holder } from '../lock/sealed-file';
import { canNostrChat } from './core';
import { fileCache } from './file-cache';
import { t } from './i18n';
import { addNetwork, hearing } from './network-notices';
import { actingWhere, type NetworkWhere } from './network-place';
import { PlaceLives, type PlaceKey } from './place-lives';
import {
  addMessage,
  authEvent,
  chatOf,
  followsIn,
  forgetChat,
  INBOX_MOST,
  inboxEvent,
  inboxFilter,
  inboxOf,
  LOOKUP_RELAYS,
  markRead,
  nameIn,
  newGroup,
  newNostrDm,
  profileEvent,
  reactionOf,
  readersOf,
  readKey,
  setInbox,
  signedOnce,
  takeWrap,
  wrapMessage,
  type NostrDmMessage,
  type NostrDmState,
} from './nostr-dm';
import { lookUpNip05, NostrRelay, type NostrEvent } from './nostr-dm-net';
import { downloadBlob, FILE_SERVERS, fileTags, NOSTR_FILE_MOST, openFile, sealFile, uploadBlob, type NostrDmFile } from './nostr-files';

// The open space's Nostr chats as the screens use them (app/nostr-chats.tsx, app/nostr-chat.tsx):
// loaded from their sealed value (lock/nostr-dm-data.ts), reading the space's inbox relays while
// the space is open, and kept again after each change. Everything that changes the account runs one
// after another, as lib/xmpp-store.ts does; the relays are read all the while, apart from that.
//
// Each inbox relay has a connection of its own that reads, and answers one that asks who reads
// (NIP-42). Messages go out on other connections, which never say whose they are; so do look-ups
// of where someone reads and what they call themselves. A message to a group goes to each of its
// members' relays, a wrap for each; photos and files go to a Blossom server first
// (lib/nostr-files.ts).
//
// A hidden place's own key runs beside the space's while its hidden chats are open, and while they
// are closed too if they receive while closed (followNostrDmPlaces, lib/place-networks.ts): the
// open one's screens show it and act on it (lib/network-place.ts); what comes to one tells only of
// its place (lib/network-notices.ts), and its connections are its own, so no relay sees two keys on one.

type Live = {
  /** The space's account, or a hidden place's. */
  holder: Holder;
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
  /** What its chats had not read after the last change, to tell of what came (lib/network-notices.ts). */
  heard: ReturnType<typeof hearing>;
  /** Its connections that only send or look up, by relay. */
  out: Map<string, { relay: Promise<NostrRelay>; idle: ReturnType<typeof setTimeout> | null }>;
};

let live: Live | null = null;
// The hidden places' own keys that run: the open hidden chats', and those receiving while closed.
const places = new PlaceLives<Live>(start, end);
const listeners = new Set<() => void>();

/** Told each time the account or its chats change. */
export function onNostrDmChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const told = () => listeners.forEach((listener) => listener());

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));
const seconds = (now = Date.now()) => Math.floor(now / 1000);

/** The open space's account as it is now, or the open hidden place's, how many of its inbox relays it reads, and whether through Tor. */
export function nostrDmNow(where: NetworkWhere = 'space'): { loaded: boolean; state: NostrDmState | null; problem: string; reading: number; tor: boolean } {
  const it = where === 'place' ? places.shown() : live;
  const readers = [...(it?.reading.values() ?? [])].filter((relay) => relay.open);
  return { loaded: it?.loaded ?? false, state: it?.state ?? null, problem: it?.problem ?? '', reading: readers.length, tor: readers.length > 0 && readers.every((relay) => relay.tor) };
}

/** The account the screen on top acts on. */
function acting(): Live | null {
  return actingWhere() === 'place' ? places.shown() : live;
}

/** How many messages are not read in the open space's Nostr chats. */
export function nostrDmUnread(): number {
  const state = live?.state;
  return state ? Object.values(state.chats).reduce((sum, chat) => sum + chat.unread, 0) : 0;
}

// Each chat's messages not read, by its home row (lib/inbox.ts).
function unreadAt(state: NostrDmState | null): Map<string, number> {
  const at = new Map<string, number>();
  for (const chat of Object.values(state?.chats ?? {})) if (chat.unread > 0) at.set(`nostr:${chat.key}`, chat.unread);
  return at;
}

addNetwork('nostr:', {
  unread: () => (live && !live.stopped ? unreadAt(live.state) : new Map()),
  notifyOf: (where) => checkedChatNotify(live?.state?.chats[where.slice('nostr:'.length)]?.notify),
});

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
    saveNostrDm(it.space, it.key, it.state, it.holder).catch((error: unknown) => {
      it.problem = reason(error);
      told();
    });
  }, 500);
}

/**
 * Runs `change` on the account after every change asked for before, then keeps it and tells the
 * screens, and of the messages that came or were read. A key brought from another app first takes
 * what its relays still keep, until they say that was all, and tells of none of it.
 */
function changeAccount<T>(it: Live, change: () => Promise<T>): Promise<T> {
  const run = it.queue
    .catch(() => undefined)
    .then(async () => {
      const quiet = !it.state || it.state.caught === 0;
      try {
        return await change();
      } finally {
        // A hidden place's tell only of its place (hearing).
        if (!it.stopped) it.heard.hear(unreadAt(it.state), quiet);
      }
    });
  it.queue = run;
  return run.finally(() => {
    keepSoon(it);
    told();
  });
}

// Connections that only send or look up, by relay, kept a minute after their last use.
const IDLE_CLOSE = 60_000;

function outTo(it: Live, url: string): Promise<NostrRelay> {
  const out = it.out;
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

function closeOut(it: Live): void {
  const out = it.out;
  for (const [url, held] of out) {
    if (held.idle) clearTimeout(held.idle);
    out.delete(url);
    void held.relay.then((relay) => relay.close()).catch(() => undefined);
  }
}

/** Sends `event` to each relay; answers how many took it. */
async function publish(it: Live, urls: string[], event: NostrEvent): Promise<number> {
  const took = await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        return (await (await outTo(it, url)).publish(event)).ok;
      } catch {
        return false;
      }
    }),
  );
  return took.filter(Boolean).length;
}

/** What these relays have for `filters`, together. */
async function lookUp(it: Live, urls: string[], filters: Record<string, unknown>[], ms = 8000): Promise<NostrEvent[]> {
  const found = await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        return await (await outTo(it, url)).query(filters, ms);
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
      for (const event of events) took += await publish(it, where, event);
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
  live = start('space', space.space, space.key);
}

/**
 * Runs the own keys of the hidden places of `space` in `wanted`, each loaded once and its inbox read
 * while it stays wanted, and lets go of the others; `shown` is the pocket of the open hidden chats.
 */
export function followNostrDmPlaces(space: number, wanted: PlaceKey[], shown: number | null): void {
  const was = places.shown();
  if (!places.follow(space, canNostrChat() ? wanted : [], shown)) return;
  // What was fetched for the open hidden chats goes as they close.
  if (was && !places.isShown(was)) fetched.clear();
  told();
}

/** Stops reading every hidden place's key and lets go of them. */
export function closeNostrDmPlaces(): void {
  if (!places.stopAll()) return;
  fetched.clear();
  told();
}

function start(holder: Holder, space: number, key: Uint8Array, pocket?: number): Live {
  const it: Live = {
    holder,
    space,
    key,
    state: null,
    loaded: false,
    problem: '',
    stopped: false,
    queue: Promise.resolve(),
    saving: null,
    reading: new Map(),
    inboxAt: 0,
    telling: false,
    tellAgain: false,
    listedAt: 0,
    heard: hearing(pocket === undefined ? undefined : { space, pocket }),
    out: new Map(),
  };
  loadNostrDm(space, key, holder)
    .then((state) => {
      // What was still going when the space closed did not go.
      for (const chat of Object.values(state?.chats ?? {})) for (const m of chat.messages) if (m.state === 'sending') m.state = 'failed';
      it.state = state;
      it.heard.hear(unreadAt(state), true);
      it.loaded = true;
      told();
      startReading(it);
    })
    .catch((error: unknown) => {
      it.loaded = true;
      it.problem = reason(error);
      told();
    });
  return it;
}

function end(it: Live): void {
  it.stopped = true;
  it.inboxAt += 1;
  for (const relay of it.reading.values()) relay.close();
  it.reading.clear();
  closeOut(it);
}

/** Stops reading and lets go of the account, as its space closes, and of its hidden place's. */
export function stopNostrDm(): void {
  closeNostrDmPlaces();
  if (!live) return;
  end(live);
  live = null;
  fetched.clear();
  told();
}

function need(): Live & { state: NostrDmState } {
  const it = acting();
  if (!it?.state) throw new Error(t('There are no Nostr chats in this space.'));
  return it as Live & { state: NostrDmState };
}

function opened(): Live {
  const it = acting();
  if (!it || it.stopped) throw new Error(t('There are no Nostr chats in this space.'));
  return it;
}

async function begin(it: Live, state: NostrDmState): Promise<void> {
  await changeAccount(it, async () => {
    it.state = state;
    it.problem = '';
  });
  await saveNostrDm(it.space, it.key, state, it.holder);
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

// The space's own account, never a hidden place's, loaded, for what Linked devices brings or lets
// go of (lib/linked-accounts.ts): null when `space` is not the open one, or this build has no Nostr chats.
async function spaceAccount(space: number): Promise<Live | null> {
  runNostrDm();
  for (let waited = 0; live && !live.loaded && !live.stopped && waited < 20_000; waited += 200) await new Promise((resolve) => setTimeout(resolve, 200));
  return live && live.loaded && !live.stopped && live.holder === 'space' && live.space === space ? live : null;
}

/**
 * Gives the space `space` the Nostr key its phone gave it (lib/linked-accounts.ts), with the relays
 * it reads on, its name and file servers, when it has none: answers whether it did, had that key
 * already, or has another; null when `space` is not open.
 */
export async function nostrDmTake(space: number, given: { secret: string; inbox: string[]; name?: string; files?: string[] }): Promise<'brought' | 'had' | 'other' | null> {
  const it = await spaceAccount(space);
  if (!it) return null;
  const now = () => (it.state ? (it.state.secret === given.secret ? 'had' : 'other') : null);
  if (it.state) return now();
  const state = await newNostrDm(given.secret);
  if (given.inbox.length > 0) state.inbox = given.inbox.slice(0, INBOX_MOST);
  if (given.name !== undefined) state.name = given.name;
  if (given.files?.length) state.files = given.files.slice(0, 5);
  // The phone told where the key reads, and its name: told again from here once that is a week
  // old, or changed here.
  state.told = seconds();
  if (it.state || it.stopped) return it.stopped ? null : now();
  await begin(it, state);
  return 'brought';
}

/** Lets the space `space` forget the Nostr key it brought from its phone (`publicKey`, hex), once unlinked from it, if it still has it. */
export async function nostrDmLetGo(space: number, publicKey: string): Promise<void> {
  const it = await spaceAccount(space);
  if (it?.state?.public === publicKey) await forgetOf(it);
}

/** Forgets the space's key and its chats here. */
export async function nostrDmForget(): Promise<void> {
  await forgetOf(need());
}

async function forgetOf(it: Live): Promise<void> {
  await changeAccount(it, async () => {
    it.state = null;
    it.inboxAt += 1;
    for (const relay of it.reading.values()) relay.close();
    it.reading.clear();
  });
  await saveNostrDm(it.space, it.key, null, it.holder);
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
  const events = await lookUp(it, where, [{ kinds: [10050, 0], authors: [key] }]);
  const relays = await inboxOf(key, events);
  const name = await nameIn(key, events);
  await changeAccount(it, async () => {
    const before = state.people[key];
    state.people[key] = {
      ...(name ? { name } : {}),
      at: seconds(),
      ...(relays ? { relays, relaysAt: seconds() } : before?.relays ? { relays: before.relays, relaysAt: before.relaysAt } : {}),
    };
  });
  return relays;
}

/** Where `key` reads: as looked up in the last six hours, or looked up now, or as last known. */
async function relaysOf(it: Live & { state: NostrDmState }, key: string): Promise<string[] | null> {
  const state = it.state;
  if (key === state.public) return state.inbox;
  const person = state.people[key];
  // Before groups, a chat kept where its person reads.
  const known = person?.relays ?? state.chats[key]?.relays;
  const knownAt = person?.relaysAt ?? state.chats[key]?.relaysAt ?? 0;
  if (known && knownAt > seconds() - 6 * 3600) return known;
  return (await lookUpPerson(it, key).catch(() => null)) ?? known ?? null;
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

/** Someone the space's Nostr key follows: their key, and the name they gave themselves if one was found. */
export type NostrFollow = { key: string; name?: string };

// How many people one look-up of names asks for, and how many such look-ups go at once.
const NAMES_AT_ONCE = 200;
const LOOKUPS_AT_ONCE = 2;

/**
 * Whom the space's Nostr key follows, as its follow list (kind 3) says, looked up now on the
 * relays it reads on and the usual ones for look-ups, with the names they gave themselves (kind
 * 0): named ones first, by name. The list is public, so asking for it and their names tells a
 * relay nothing it could not know; it goes as the space's Tor way says, as every look-up does.
 * Empty when none was found.
 */
export async function nostrDmFollows(): Promise<NostrFollow[]> {
  const it = need();
  const state = it.state;
  const where = [...state.inbox, ...LOOKUP_RELAYS];
  const keys = await followsIn(state.public, await lookUp(it, where, [{ kinds: [3], authors: [state.public], limit: 1 }]));
  if (keys.length === 0) return [];
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += NAMES_AT_ONCE) batches.push(keys.slice(i, i + NAMES_AT_ONCE));
  const profiles: NostrEvent[] = [];
  for (let i = 0; i < batches.length; i += LOOKUPS_AT_ONCE) {
    const found = await Promise.all(batches.slice(i, i + LOOKUPS_AT_ONCE).map((batch) => lookUp(it, where, [{ kinds: [0], authors: batch }])));
    profiles.push(...found.flat());
  }
  const byKey = new Map<string, NostrEvent[]>();
  for (const profile of profiles) {
    if (profile.kind !== 0) continue;
    const list = byKey.get(profile.pubkey);
    if (list) list.push(profile);
    else byKey.set(profile.pubkey, [profile]);
  }
  const follows = await Promise.all(
    keys.map(async (key): Promise<NostrFollow> => {
      // A name this space gave them comes first, as in their chat.
      const name = (!state.chats[key]?.members && state.chats[key]?.name) || (await nameIn(key, byKey.get(key) ?? [])) || state.people[key]?.name;
      return name ? { key, name } : { key };
    }),
  );
  const named = follows.filter((f) => f.name).sort((a, b) => a.name!.localeCompare(b.name!));
  return [...named, ...follows.filter((f) => !f.name)];
}

/** Looks up the name and inbox of `key` again when it is a week old or never was. */
export function nostrDmFreshen(key: string): void {
  const it = acting();
  if (!it?.state) return;
  const at = it.state.people[key]?.at ?? 0;
  if (at > seconds() - 7 * 24 * 3600) return;
  void lookUpPerson(it as Live & { state: NostrDmState }, key).catch(() => undefined);
}

/**
 * Sends a message of `kind` to the chat `key`: to the relays each of its readers reads on, a wrap
 * for each, and a copy to the space's own. `shown` makes the message as the chat shows it, from its
 * id and time; `changed` changes the chat as it goes (a reaction). It went once one relay of one
 * reader took it.
 */
async function sendTo(
  it: Live & { state: NostrDmState },
  key: string,
  kind: number,
  tags: string[][],
  content: string,
  shown?: (id: string, at: number) => NostrDmMessage,
  changed?: () => void,
): Promise<void> {
  const state = it.state;
  const readers = readersOf(state, key);
  const where = await Promise.all(readers.map(async (reader) => [reader, await relaysOf(it, reader)] as const));
  const reachable = where.filter(([, relays]) => relays?.length) as (readonly [string, string[]])[];
  if (readers.length && !reachable.length) {
    throw new Error(
      readers.length === 1
        ? t('Their Nostr app does not say where it takes private messages (NIP-17), so they cannot get one yet.')
        : t('None of their Nostr apps says where it takes private messages (NIP-17), so they cannot get one yet.'),
    );
  }
  const made = await wrapMessage(state, key, kind, tags, content);
  const ours = made.wraps[state.public];
  const message = shown?.(made.id, made.at);
  await changeAccount(it, async () => {
    if (message) addMessage(state, key, message);
    changed?.();
    state.seen.push(ours.id);
  });
  // Our own copy, for the space's other apps with this key (in notes to oneself, the message
  // itself); then each reader's, which say whether it went.
  const tookOurs = publish(it, state.inbox, ours);
  const took = readers.length ? (await Promise.all(reachable.map(([reader, relays]) => publish(it, relays, made.wraps[reader])))).filter((n) => n > 0).length : await tookOurs;
  const chat = state.chats[key];
  const told = made.subject !== undefined && took > 0 && (chat?.subject ?? '') === made.subject;
  if (message || told) {
    await changeAccount(it, async () => {
      if (message) message.state = took > 0 ? 'sent' : 'failed';
      // The name went: the next messages need not carry it.
      if (told) delete chat.subjectOwed;
    });
  }
  if (!took) throw new Error(t('None of their relays took the message. Try again later.'));
}

/** Sends `text` to `key`, answering the message `replyTo` when given: to the relays they read on,
 *  and a copy to the space's own. */
export async function nostrDmSend(key: string, text: string, replyTo?: string): Promise<void> {
  const it = need();
  const answers = replyTo ? { replyTo } : {};
  await sendTo(it, key, 14, replyTo ? [['e', replyTo, '', 'reply']] : [], text, (id, at) => ({ id, mine: true, text, at, state: 'sending', ...answers }));
}

/** A photo, file or voice message as picked, to send; a voice message says how long it lasts. */
export type NostrOutgoingFile = { bytes: Uint8Array; name: string; mime: string; dim?: string; durationMs?: number };

/** The file is larger than a file server takes. */
export class NostrFileTooLargeError extends Error {
  constructor() {
    super(t('Files up to {size} MB go in Nostr chats.', { size: String(NOSTR_FILE_MOST / (1024 * 1024)) }));
  }
}

/** Sends a photo or file: encrypted here, put on the space's file server, and its key in the message
 *  (kind 15), answering the message `replyTo` when given, as a text does. */
export async function nostrDmSendFile(key: string, picked: NostrOutgoingFile, replyTo?: string): Promise<void> {
  const it = need();
  if (picked.bytes.length > NOSTR_FILE_MOST) throw new NostrFileTooLargeError();
  const { sealed, file } = await sealFile(picked.bytes, picked.mime, picked.name, picked.dim, picked.durationMs);
  const url = await uploadBlob(it.state.files?.length ? it.state.files : FILE_SERVERS, sealed, (kind, tags, content) => signedOnce(kind, tags, content));
  await sendFile(it, key, { ...file, url }, replyTo);
}

async function sendFile(it: Live & { state: NostrDmState }, key: string, file: NostrDmFile, replyTo?: string): Promise<void> {
  const answers = replyTo ? { replyTo } : {};
  await sendTo(it, key, 15, [...(replyTo ? [['e', replyTo, '', 'reply']] : []), ...fileTags(file)], file.url, (id, at) => ({ id, mine: true, text: '', at, state: 'sending', file, ...answers }));
}

/** Reacts to a message with `emoji`, as NIP-25 says, to everyone in the chat. */
export async function nostrDmReact(key: string, id: string, emoji: string): Promise<void> {
  const it = need();
  const state = it.state;
  const target = state.chats[key]?.messages.find((m) => m.id === id);
  if (!target) return;
  const reaction = reactionOf(emoji);
  await sendTo(it, key, 7, [['e', id], ['k', target.file ? '15' : '14']], reaction, undefined, () => {
    target.reactions = { ...target.reactions, [state.public]: reaction };
  });
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
  if (typeof failed.file === 'object') await sendFile(it, key, failed.file, failed.replyTo);
  else await nostrDmSend(key, failed.text, failed.replyTo);
}

/** Makes a group with these people (their keys), named or not: answers its key. Nothing goes until its first message. */
export async function nostrDmNewGroup(members: string[], subject = ''): Promise<string> {
  const it = need();
  let key = '';
  await changeAccount(it, async () => {
    key = newGroup(it.state, members, subject);
  });
  for (const member of members) nostrDmFreshen(member);
  return key;
}

/** Names a group for all its members: the name goes with the next message. */
export function nostrDmSetSubject(key: string, subject: string): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    const chat = it.state.chats[key];
    if (!chat?.members) return;
    chat.subject = subject.trim().slice(0, 100) || undefined;
    chat.subjectAt = seconds();
    chat.subjectOwed = true;
  });
}

/** The Blossom servers photos and files go to; none for Erevos's own list. */
export function nostrDmSetFileServers(servers: string[]): Promise<void> {
  const it = need();
  const list = [...new Set(servers.map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean))];
  const bad = list.find((s) => !/^https:\/\/[^/\s]+$/.test(s));
  if (bad) return Promise.reject(new Error(t('{server} is not a file server address (https://…).', { server: bad })));
  return changeAccount(it, async () => {
    if (list.length) it.state.files = list.slice(0, 5);
    else delete it.state.files;
  });
}

// Files fetched while Erevos runs, so one looked at again is not fetched again (lib/file-cache.ts).
const fetched = fileCache(40 * 1024 * 1024);

/** A message's photo or file, fetched from its server and opened, or kept from before. */
export function nostrDmFile(file: NostrDmFile): Promise<Uint8Array> {
  return fetched.get(file.url, async () => openFile(file, await downloadBlob(file.url)));
}

/** A chat's own notifications (lock/chat-notify.ts), or the app's again with null. */
export function nostrDmSetNotify(key: string, notify: ChatNotify | null): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    const chat = chatOf(it.state, key);
    if (notify) chat.notify = notify;
    else delete chat.notify;
  });
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
