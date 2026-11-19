// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Archive, onChatsGone, type ArchivedChat } from '../lock/archive';
import { CHUNK_SIZES, deleteChunks, HISTORY_CHUNKS, isFileRef, PREFIX, readChunk, saveChunk, type FileRef, type SharedMark } from '../lock/attachment-files';
import { changeRounds, EMPTY, ID_HEX, loadRounds, MOST_DONE, MOST_WAIT, withHeard, withPack, type InShare, type OutShare, type RoundsData, type RoundsPlace } from '../lock/share-rounds-data';

import { bytesSource, chunkPlan, FileDamagedError, FileGoneError, fileWay, keepFile, openChunk, readFile, room, takeFile, takesItself, type TakenFiles } from './attachments';
import { ROUND_IDS, type Rounds } from './chat-parts';
import { keptFiles, markOf, packBytes, packChats, readPack, receivedChats, refOf } from './chat-share';
import { fromHex, randomBytes, toHex, utf8Decode, utf8Encode } from './crypto';
import type { E2E } from './e2e';
import { freeRoom, listFiles } from './files';
import { t } from './i18n';
import { MAX_IMPORTED_FILE } from './imports';
import { holdChunks, releaseChunks } from './pending-chunks';
import { deleteChunk, getChunk, putChunk, RelaySession, sameRelay, type Relay } from './relay';
import { circuitOf } from './tor-chats';
import type { SpaceChats } from './space-chats';

// The files of imported chats shared with a contact (lib/chat-share.ts) go in rounds through the
// sharer's relay, so a share of any size needs only a little room there at a time. The words go
// first, in one message, as a file (the pack); its files follow, each chunk as it is kept here
// already:
//
// 1. The contact's Erevos keeps the chats at once, its files named but not here yet, and says it
//    keeps them: "took 0" in a message with no words (Rounds, lib/chat-parts.ts), which an Erevos
//    from before never sends, so to one nothing more goes, and the share ends (PACK_KEPT).
// 2. The sharer's Erevos puts the next chunks on its relay, in order, file after file, while what
//    the share keeps there stays under WINDOW, and tells the contact where they wait, ROUND_IDS of
//    them a message.
// 3. The contact's Erevos takes each chunk through its own relay, checks it, keeps it, deletes it
//    from the relay, and says how many it took, every TELL_EVERY chunks and at the end of a round.
//    What it took leaves room for the next chunks to go up.
//
// A relay that says it is full is asked again after PAUSE, then twice as long each time, PAUSE_MOST
// at most. Both sides keep how far a share is in the place it belongs to (lock/share-rounds-data.ts),
// the space or its hidden chats, and go on whenever Erevos runs: each look at the relay drives a
// round (lib/receiver.ts, lib/place-receiver.ts, app/chat.tsx). Chunks go up only as the contact takes
// them, so none waits on the relay long; one that waited up there PUT_AGAIN is put again before
// it expires (14 days), and one the contact finds gone, as when it was away longer than that, is
// put again once it says so. Either side may end a share: the sharer stops it, or the contact
// deletes its chats; the other hears it, the chunks on the relay are taken off, and what came of
// it is deleted.
//
// The contact's Erevos asks nothing of its owner: while the phone has too little room (ROOM_KEPT),
// or the chunks wait on a relay that a place lent on a contact's relay reaches only through Tor
// (takesItself), it takes none and waits, its line saying why, and goes on by itself once it may;
// of the first, the sharer hears too (`full`), and its line says so.
//
// Only the phone that holds the account takes a share's files: an account's linked devices keep its
// words, its files named as ones that stayed behind, and say nothing (the rounds of one share go
// to one phone).

// The most a place's shares keep on our relay at once, all of them together: 64 MB, a sixteenth of
// the 1 GB a relay keeps for files unless set otherwise and a quarter of the 256 MB one keeps in
// memory, never a lot of what others use. Enough that the next round goes up while the last is
// taken, so files go about as fast as the slower of the two phones' networks.
export const WINDOW = 64 * 1024 * 1024;
// And the most chunks: a share of small photos says where they wait in a few messages a round.
export const WINDOW_CHUNKS = 2 * ROUND_IDS;
// After the relay said it is full, or could not be reached: the first wait before chunks go up
// again, and the longest. Full, it is full of others' files, which leave as they are taken or
// expire: a minute catches the first, an hour keeps what a full relay is asked, and refuses, small.
const PAUSE = 60_000;
const PAUSE_MOST = 60 * 60_000;
// A side that heard nothing of a share for a day says again how far it is, or where the chunks
// wait, should a message have been lost; chunks on the relay this long are put there again, before
// they expire after 14 days. Of a contact whose phone said nothing for as long, none wait there,
// until it says something again (it says how far it is once Erevos runs there).
const SAY_AGAIN = 24 * 60 * 60_000;
const PUT_AGAIN = 12 * 24 * 60 * 60_000;
const ASLEEP = 14 * 24 * 60 * 60_000;
// How many chunks are taken between the times the contact says how far it is; and between the
// looks at how much room the phone has left.
const TELL_EVERY = 32;
// The room a phone keeps free as it takes a share's files: no less than Android itself counts as
// storage running low (at most 500 MB), so the phone and its other apps still have theirs. Below
// it, or once a chunk cannot be written, no more are taken, nor fetched again for nothing, until
// the wait is over (PAUSE, then longer each time, PAUSE_MOST at most) and there is room again.
const ROOM_KEPT = 500 * 1000 * 1000;
// A share the contact's Erevos never says it keeps went to an Erevos from before rounds, which
// shows its words as a file, a .json, and takes none of its files; or to a later one that keeps
// them only later: hidden chats keep them once their chat screen opens, which may be days after
// their phone said the message came, and a chat lent on a contact's relay waits for a tap or for
// Tor. Nothing tells which Erevos a contact has, so the share waits for either, its line saying so
// UNTAKEN after their phone said the message came, and ends once the relay no longer keeps the
// message's file (14 days, and a day for clocks): no Erevos can keep its words then. Should a later
// Erevos still say it keeps one ended, it hears that no files come (`end`), and names them as ones
// that stayed behind.
const UNTAKEN = 24 * 60 * 60_000;
const PACK_KEPT = 15 * 24 * 60 * 60_000;
// A chunk of a file that stays behind: none on the relay.
const ZERO = '0'.repeat(ID_HEX);
const CONTACT_PREFIX = 'contact:';
const LIST_META = { name: 'share.json', mime: 'application/json', kind: 'file' as const };

/**
 * How a place's shares go and come, as a look at its relay found it: its chats (where they keep
 * their values: `pieces`), our relay, how to say something to a contact, and whether it stopped
 * (the chat screen opened, the hidden chats closed). `packs`: whether the shared chats that came
 * are kept now (not by a hidden place's run while its chat screen is closed); `leave`, for their
 * file, as for a message's (lib/attachments.ts takeFile).
 */
export type ShareWay = {
  chats: SpaceChats;
  own: Relay | null;
  send(identity: string, rounds: Rounds): Promise<void>;
  stopped?: () => boolean;
  packs?: boolean;
  leave?: boolean | TakenFiles;
};

/**
 * What changed of a place's shares: a chat that came kept (`peer`, `tag`, its file now), or not (no
 * file), a file of one whole (`peer`), how far one is, one on or done; `chats` once the place's
 * imported chats changed with it.
 */
/** `taking`: how far shared chats tapped to take have come ('40%'), or 'failed' when they did not. */
export type SharesChanged = { holder: RoundsPlace['holder']; space: number; peer?: string; tag?: string; file?: FileRef; chats?: true; taking?: string };

const listeners = new Set<(change: SharesChanged) => void>();

/** Calls `listener` each time a place's shares change. Returns how to stop. */
export function onShares(listener: (change: SharesChanged) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const placeName = ({ holder, space }: RoundsPlace) => `${holder}/${space}`;

function told(place: RoundsPlace, more: Omit<SharesChanged, 'holder' | 'space'> = {}) {
  listeners.forEach((listener) => listener({ holder: place.holder, space: place.space, ...more }));
}

/** Whether this chat's device takes the files of shares: not one of an account's linked devices. */
export const takesRounds = (e2e: E2E): boolean => !e2e.onLinkedDevice() && !e2e.own();

// `relay` as a contact's shared chat goes through it: on that chat's own circuits through Tor when
// the chat goes only through Tor (lib/tor-chats.ts), as its messages and files do.
function forChat(way: ShareWay, identity: string, relay: Relay): Relay {
  return way.chats.e2e.torChat(identity) ? { ...relay, torChat: circuitOf(identity) } : relay;
}

// A session on `relay`, with its chat's circuits when it has some.
const sessionOn = (relay: Relay): Promise<RelaySession> => RelaySession.open({ url: relay.url, token: relay.token, ...(relay.torChat ? { torChat: relay.torChat } : {}) }, true);

// The shares stopped here meanwhile, by id: a round under way puts up none of theirs more.
const ended = new Set<string>();
// The shares coming whose chats were found here since Erevos started, or since chats went (onChatsGone).
const found = new Set<string>();
onChatsGone(() => found.clear());
// When each place's relay may be asked to keep chunks again, and how long the next wait is.
const paused = new Map<string, { until: number; wait: number }>();
// The lists of files read, by their own id, a few.
const lists = new Map<string, unknown[]>();

const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// --- Sharing ---

/** A share readied (readyShare): its id, to whom, its pack and mark, its list of files kept here, and how many chunks they have. */
export type ReadyShare = { s: string; to: string; bytes: Uint8Array; mark: SharedMark; list: FileRef | null; total: number };

/**
 * Readies the chats to share with `to` (their identity key, hex): the files they keep whole here go
 * in rounds, in the order they first come; any other is named as one that stayed behind. The list
 * of them is kept as a file, noted as pending (lib/pending-chunks.ts) until the share begins.
 */
export async function readyShare(to: string, chats: ArchivedChat[]): Promise<ReadyShare> {
  const s = toHex(randomBytes(16));
  const here = new Map<string, number>();
  for (const name of await listFiles(PREFIX)) {
    const id = name.slice(PREFIX.length, PREFIX.length + 32);
    here.set(id, (here.get(id) ?? 0) + 1);
  }
  // Whole here, and in chunks as any file of its size has them, which the contact's Erevos reads.
  const files = keptFiles(chats).filter((ref) => {
    const plan = chunkPlan(ref.size);
    return (here.get(ref.id) ?? 0) >= ref.count && ref.chunk === plan.chunk && ref.count === plan.count && ref.count <= HISTORY_CHUNKS && ref.size <= MAX_IMPORTED_FILE;
  });
  const bytes = packBytes(packChats(s, chats, files));
  const total = files.reduce((sum, ref) => sum + ref.count, 0);
  const list = files.length > 0 ? await keepFile(bytesSource(utf8Encode(JSON.stringify(files.map((ref) => [ref.id, ref.count, ref.chunk])))), LIST_META, undefined, MAX_IMPORTED_FILE, holdChunks) : null;
  return { s, to, bytes, mark: markOf(chats), list, total };
}

/** Lets go of a share readied that did not go. */
export async function dropReady(ready: ReadyShare): Promise<void> {
  if (!ready.list) return;
  await deleteChunks(ready.list.id, ready.list.count).catch(() => undefined);
  await releaseChunks([ready.list.id]).catch(() => undefined);
}

/**
 * Begins the rounds of a share whose words go in the message `tag`, before they go: its files go
 * from then on, as the contact takes them. A share to them still under way stops, and they hear so
 * first: this one takes its place.
 */
export async function beginShare(way: ShareWay, ready: ReadyShare, tag: string): Promise<void> {
  const place = way.chats.pieces;
  if (!place || !ready.list) return dropReady(ready);
  const now = Date.now();
  const share: OutShare = { s: ready.s, to: ready.to, tag, list: ready.list, total: ready.total, took: 0, r: way.own?.url ?? '', out: '', said: 0, put: 0, heard: now, at: now };
  let before: OutShare[] = [];
  await changeRounds(place, (data) => {
    before = data.out.filter((out) => out.to === ready.to);
    return { ...data, out: [...data.out.filter((out) => out.to !== ready.to), share] };
  });
  await releaseChunks([ready.list.id]).catch(() => undefined);
  for (const old of before) await endOut(way, old, true);
  told(place);
}

/** Stops sharing: the chunks on the relay are taken off, and the contact hears that it ends, unless not to `tell`. */
export async function stopShare(way: ShareWay, s: string, tell = true): Promise<void> {
  const place = way.chats.pieces;
  if (!place) return;
  ended.add(s);
  let gone: OutShare | undefined;
  await changeRounds(place, (data) => {
    gone = data.out.find((out) => out.s === s);
    return gone ? { ...data, out: data.out.filter((out) => out !== gone) } : null;
  });
  if (gone) await endOut(way, gone, tell);
  told(place);
}

/** The share still going with the message `tag` to `to`, by its id, and how far it is, in hundredths; or null. */
export async function sharingNow(place: RoundsPlace, to: string, tag: string): Promise<{ s: string; percent: number } | null> {
  const out = (await loadRounds(place).catch(() => EMPTY)).out.find((share) => share.to === to && share.tag === tag && !ended.has(share.s));
  return out ? { s: out.s, percent: percentOf(out) } : null;
}

const percentOf = (out: OutShare) => Math.floor((out.took / Math.max(1, out.total)) * 100);

/**
 * How far the place's shares are, by the chat line of the message their words went or came in
 * (`contact:<identity>|<tag>`): going, how much the contact took; coming, how many files are whole;
 * and why they wait, or that a share ended with only its messages taken.
 */
export async function shareLines(place: RoundsPlace): Promise<Record<string, string>> {
  const data = await loadRounds(place).catch(() => EMPTY);
  const lines: Record<string, string> = {};
  const now = Date.now();
  for (const [to, tag] of data.old) if (tag) lines[`${CONTACT_PREFIX}${to}|${tag}`] = t('Their Erevos did not take the files; only the messages went');
  for (const out of data.out) {
    if (!out.tag || ended.has(out.s)) continue;
    const percent = percentOf(out);
    const untaken = !out.ready && (out.came ?? 0) > 0 && now - out.came! > UNTAKEN;
    lines[`${CONTACT_PREFIX}${out.to}|${out.tag}`] = out.full
      ? t('Sharing, {percent}% · waiting for free space on their phone', { percent })
      : untaken
        ? t('Sharing, {percent}% · waiting for their Erevos to take it; an older one takes only the messages', { percent })
        : t('Sharing, {percent}%', { percent });
  }
  for (const share of data.in) {
    if (!share.tag) continue;
    const counts = { done: share.whole, count: share.files };
    lines[`${CONTACT_PREFIX}${share.by}|${share.tag}`] =
      share.waits === 'room'
        ? t('Files: {done} of {count} · waiting for free space on this phone', counts)
        : share.waits === 'tor'
          ? t('Files: {done} of {count} · waiting for Tor (Everything)', counts)
          : t('Files: {done} of {count}', counts);
  }
  return lines;
}

// --- What came ---

/** Keeps what a contact said of a share (`identity`, theirs), for the next round. */
export async function roundsCame(chats: SpaceChats, identity: string, rounds: Rounds): Promise<void> {
  if (chats.pieces) await changeRounds(chats.pieces, (data) => withHeard(data, identity, rounds));
}

/** Notes chats a contact shared, in the message `tag`, to keep with the next round. */
export async function packCame(chats: SpaceChats, identity: string, tag: string): Promise<void> {
  if (chats.pieces && tag) await changeRounds(chats.pieces, (data) => withPack(data, identity, tag));
}

// The shared chats tapped, by who and the message's tag: taken even from where the sharer chose straight.
const tapped = new Set<string>();

/** Keeps the chats a contact shared, in the message `tag`, now that it was tapped (keepPacks). */
export async function takePack(way: ShareWay, identity: string, tag: string): Promise<void> {
  tapped.add(`${identity}|${tag}`);
  await packCame(way.chats, identity, tag);
  driveShares(way);
}

// --- Rounds ---

const running = new Map<string, { next: ShareWay | null; done: Promise<void> }>();

/**
 * Has a round of the place's shares go now, or once the one under way ends: what was heard taken
 * in, the shared chats that came kept, the next chunks put up and those waiting taken, while they
 * may. Each look at the relay calls it; nothing waits for it.
 */
export function driveShares(way: ShareWay): void {
  const place = way.chats.pieces;
  if (!place) return;
  const name = placeName(place);
  const run = running.get(name);
  if (run) {
    run.next = way;
    return;
  }
  const entry: { next: ShareWay | null; done: Promise<void> } = { next: null, done: Promise.resolve() };
  running.set(name, entry);
  entry.done = (async () => {
    const used = new Set<string>();
    let now: ShareWay | null = way;
    try {
      while (now && !now.stopped?.()) {
        entry.next = null;
        await roundOf(now, used).catch(() => undefined);
        now = entry.next;
      }
    } finally {
      running.delete(name);
      // A hidden place's files are not named in memory once its round ends.
      if (place.holder !== 'space') for (const id of used) lists.delete(id);
    }
  })();
}

/** Once the place's rounds under way end (the checks). */
export function sharesSettled(place: RoundsPlace): Promise<void> {
  return running.get(placeName(place))?.done ?? Promise.resolve();
}

/** Forgets what a round keeps in memory between rounds, as Erevos starting again would (the checks). */
export function forgetRounds(): void {
  ended.clear();
  found.clear();
  paused.clear();
  lists.clear();
}

async function roundOf(way: ShareWay, used: Set<string>): Promise<void> {
  const place = way.chats.pieces!;
  let data = await loadRounds(place);
  if (data.out.length + data.in.length + data.heard.length + data.packs.length === 0) return;
  if (data.heard.length > 0) data = await takeHeard(way, data);
  if (way.packs !== false && data.packs.length > 0 && !way.stopped?.()) {
    await keepPacks(way, data.packs).catch(() => undefined);
    data = await loadRounds(place);
  }
  if (!way.stopped?.()) await endUnanswered(way, data.out).catch(() => undefined);
  // Each on its own: a relay full for what goes still gives what comes.
  if (!way.stopped?.()) await goOut(way, data.out, used).catch(() => undefined);
  if (!way.stopped?.()) await comeIn(way, data.in, used).catch(() => undefined);
}

// What the other phones said, taken in: how far a share going from here is, where the chunks of
// one coming wait, or that one ends.
async function takeHeard(way: ShareWay, data: RoundsData): Promise<RoundsData> {
  const place = way.chats.pieces!;
  const taken = data.heard.length;
  const outsGone: OutShare[] = [];
  const insGone: InShare[] = [];
  const done: OutShare[] = [];
  const again: OutShare[] = [];
  const doneSaid: [string, string, number][] = [];
  const noFiles: [string, string][] = [];
  const insEnd: InShare[] = [];
  let freed = false;
  const next = await changeRounds(place, (now) => {
    let out = now.out;
    let ins = now.in;
    let old = now.old;
    for (const [identity, r] of now.heard.slice(0, taken)) {
      if (r.drop) {
        outsGone.push(...out.filter((o) => o.s === r.s && o.to === identity));
        insGone.push(...ins.filter((i) => i.s === r.s && i.by === identity));
        out = out.filter((o) => !(o.s === r.s && o.to === identity));
        ins = ins.filter((i) => !(i.s === r.s && i.by === identity));
      } else if (r.end) {
        insEnd.push(...ins.filter((i) => i.s === r.s && i.by === identity));
        ins = ins.filter((i) => !(i.s === r.s && i.by === identity));
      } else if (r.took !== undefined) {
        // One ended as their Erevos said nothing: it keeps it after all, and hears no files come;
        // its line here still says that only the messages went.
        if (!out.some((o) => o.s === r.s && o.to === identity) && old.some(([to, , s]) => to === identity && s === r.s)) noFiles.push([identity, r.s]);
        out = out.map((o) => {
          if (o.s !== r.s || o.to !== identity) return o;
          const next = tookOut(o, r.took!, r.gone === true, r.full === true, again);
          freed ||= next.took > o.took;
          return next;
        });
      } else if (r.ids !== undefined) {
        if (ins.some((i) => i.s === r.s && i.by === identity)) ins = ins.map((i) => (i.s === r.s && i.by === identity ? heardIds(i, r.at!, r.r!, r.ids!) : i));
        else doneSaid.push(...now.done.filter(([who, s]) => who === identity && s === r.s));
      }
    }
    done.push(...out.filter((o) => o.took >= o.total));
    return { ...now, out: out.filter((o) => o.took < o.total), in: ins, old, heard: now.heard.slice(taken) };
  });
  for (const share of outsGone) await endOut(way, share, false);
  for (const share of done) {
    await deleteChunks(share.list.id, share.list.count).catch(() => undefined);
    lists.delete(share.list.id);
  }
  if (freed || again.length > 0) roomAgain(place);
  // Gone from the relay, as the contact found: what is left there of them is taken off, and they go up again.
  if (way.own) for (const share of again) await takeOff(forChat(way, share.to, way.own), share.r, share.out);
  for (const share of insGone) await endIn(way, share, false);
  for (const share of insEnd) await filesEnd(way, share);
  for (const [who, s] of noFiles) await way.send(who, { s, end: true }).catch(() => undefined);
  // Kept whole here, which they did not hear: said again.
  for (const [who, s, total] of doneSaid) await way.send(who, { s, took: total }).catch(() => undefined);
  // How far the shares going are, now.
  told(place);
  return next;
}

// A share going, once the contact said it took `took` chunks, in order (and that those after
// are `gone` from the relay, or that its phone is `full`): those leave our relay's room, and are
// no longer said.
function tookOut(o: OutShare, took: number, gone: boolean, full: boolean, again: OutShare[]): OutShare {
  const outs = o.out.length / ID_HEX;
  const upTo = Math.min(took, o.total, o.took + outs);
  const left = Math.max(0, upTo - o.took);
  const { came: _came, full: _full, ...was } = o;
  let next: OutShare = { ...was, ready: true, heard: Date.now(), took: o.took + left, out: o.out.slice(left * ID_HEX), said: Math.max(0, o.said - left), ...(full ? { full: true as const } : {}) };
  if (!next.out) next.put = 0;
  // Nothing more taken: they wait for word of where the chunks are, which goes again; not while
  // their phone waits for room, word of them had.
  if (left === 0 && took === o.took && !gone && !full) next.said = 0;
  if (gone && next.out) {
    again.push(next);
    next = { ...next, out: '', said: 0, put: 0 };
  }
  return next;
}

// A share coming, once the sharer said where chunks wait: kept, unless all of them came already,
// when the sharer did not hear how far it is, which is said again.
function heardIds(share: InShare, at: number, relay: string, ids: string): InShare {
  if (at + ids.length / ID_HEX <= share.taken) return { ...share, told: -1 };
  const wait = share.wait.filter(([from, , them]) => from + them.length / ID_HEX > share.taken && from !== at);
  return { ...share, wait: [...wait, [at, relay, ids] as [number, string, string]].slice(-MOST_WAIT) };
}

// Ends a share going from here: its chunks taken off our relay, its list deleted, and, when
// stopped here, the contact told.
async function endOut(way: ShareWay, share: OutShare, tell: boolean): Promise<void> {
  ended.add(share.s);
  if (way.own) await takeOff(forChat(way, share.to, way.own), share.r, share.out);
  if (share.out && way.chats.pieces) roomAgain(way.chats.pieces);
  await deleteChunks(share.list.id, share.list.count).catch(() => undefined);
  lists.delete(share.list.id);
  if (tell) await way.send(share.to, { s: share.s, drop: true }).catch(() => undefined);
}

// Ends a share coming here: its chats deleted from the place's imported chats with what came of
// their files, and its list; and, when it ends here, the sharer told.
async function endIn(way: ShareWay, share: InShare, tell: boolean): Promise<void> {
  const place = way.chats.pieces!;
  const archive = await Archive.open(place.holder, place.space, place.key).catch(() => null);
  for (const id of share.chats) await archive?.remove(id).catch(() => undefined);
  await deleteChunks(share.list.id, share.list.count).catch(() => undefined);
  lists.delete(share.list.id);
  told(place, { chats: true });
  if (tell) await way.send(share.by, { s: share.s, drop: true }).catch(() => undefined);
}

// The shares going from here that the contact's Erevos never said it keeps: when their phone first
// said the message came is kept, for the line (UNTAKEN); once the relay no longer keeps its file
// (PACK_KEPT), the share ends, its list deleted, its line saying why when that phone had the message.
async function endUnanswered(way: ShareWay, outs: OutShare[]): Promise<void> {
  const place = way.chats.pieces!;
  const now = Date.now();
  for (const share of outs) {
    if (share.ready || ended.has(share.s)) continue;
    let came = share.came ?? 0;
    if (!came) {
      const peer = `${CONTACT_PREFIX}${share.to}`;
      const message = way.chats.history.messages().find((m) => m.mine && m.peer === peer && m.tag === share.tag);
      if ((message?.mark ?? 0) >= 1) {
        came = now;
        await updateOut(place, share.s, (one) => (one.ready || one.came ? null : { ...one, came: now }));
      }
    }
    if (!(share.at > 0 && now - share.at > PACK_KEPT)) continue;
    let gone: OutShare | undefined;
    await changeRounds(place, (data) => {
      gone = data.out.find((one) => one.s === share.s && !one.ready);
      if (!gone) return null;
      const end: [string, string, string] = [share.to, came > 0 ? share.tag : '', share.s];
      return { ...data, out: data.out.filter((one) => one !== gone), old: [...data.old, end].slice(-MOST_DONE) };
    });
    if (gone) await endOut(way, gone, false);
    told(place);
  }
}

// A share coming here whose sharer said no more of its files come: its chats stay, with the files
// that came whole; what came of the one under way is deleted, as is the list, and the others are
// named as ones that stayed behind.
async function filesEnd(way: ShareWay, share: InShare): Promise<void> {
  const place = way.chats.pieces!;
  const refs = await inList(share, new Set()).catch(() => null);
  if (refs && share.taken < share.total) {
    const [file, n] = chunkAt(startsOf(refs.map((ref) => ref.count)), share.taken);
    if (n > 0 && !share.skip.includes(file)) await deleteChunks(refs[file].id, n).catch(() => undefined);
  }
  if (refs) await leftBehind(place, share, refs);
  await deleteChunks(share.list.id, share.list.count).catch(() => undefined);
  lists.delete(share.list.id);
  told(place, { peer: `${CONTACT_PREFIX}${share.by}`, chats: true });
}

// Names the files of a share coming here that are not whole, and will not be, as ones that stayed
// behind in its chats: those after the chunks taken, and those skipped. Returns whether any were.
async function leftBehind(place: RoundsPlace, share: InShare, refs: FileRef[]): Promise<boolean> {
  const starts = startsOf(refs.map((ref) => ref.count));
  const gone = new Set(refs.flatMap((ref, file) => (share.skip.includes(file) || starts[file] + ref.count > share.taken ? [ref.id] : [])));
  if (gone.size === 0) return false;
  const archive = await Archive.open(place.holder, place.space, place.key).catch(() => null);
  await archive?.leaveBehind(share.chats, gone).catch(() => undefined);
  return true;
}

// Takes chunks off our relay, by their ids (hex, one after another), those of files that stayed
// behind skipped; only from our relay as it is now, and one it cannot take off expires there.
async function takeOff(own: Relay, relay: string, ids: string): Promise<void> {
  if (!ids || !sameRelay(relay, own.url)) return;
  const session = await sessionOn(own).catch(() => null);
  if (!session) return;
  try {
    for (let at = 0; at + ID_HEX <= ids.length; at += ID_HEX) {
      const id = ids.slice(at, at + ID_HEX);
      if (id !== ZERO) await deleteChunk(session, fromHex(id)).catch(() => false);
    }
  } finally {
    session.close();
  }
}

// Changes one share going from here, should it still be there; returns it as it is after, or null.
async function updateOut(place: RoundsPlace, s: string, make: (share: OutShare) => OutShare | null): Promise<OutShare | null> {
  const data = await changeRounds(place, (now) => {
    const share = now.out.find((out) => out.s === s);
    const next = share ? make(share) : null;
    return next ? { ...now, out: now.out.map((out) => (out.s === s ? next : out)) } : null;
  });
  return data.out.find((out) => out.s === s) ?? null;
}

async function updateIn(place: RoundsPlace, share: InShare, make: (now: InShare) => InShare): Promise<InShare | null> {
  const same = (one: InShare) => one.s === share.s && one.by === share.by;
  const data = await changeRounds(place, (now) => (now.in.some(same) ? { ...now, in: now.in.map((one) => (same(one) ? make(one) : one)) } : null));
  return data.in.find(same) ?? null;
}

// The list of a share's files, read once and kept in memory a while.
async function readList(ref: FileRef, used: Set<string>): Promise<unknown[] | null> {
  used.add(ref.id);
  const kept = lists.get(ref.id);
  if (kept) return kept;
  const bytes = await readFile(ref).catch(() => null);
  if (!bytes) return null;
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(bytes));
  } catch {
    return null;
  }
  if (!Array.isArray(value)) return null;
  lists.set(ref.id, value);
  if (lists.size > 8) lists.delete(lists.keys().next().value!);
  return value;
}

/** Where each file's chunks begin among all a share's, and where they end. */
export function startsOf(counts: number[]): number[] {
  const starts = [0];
  for (const count of counts) starts.push(starts[starts.length - 1] + count);
  return starts;
}

/** Which file a share's chunk `g` is of, and which of its chunks: by where each file's begin (startsOf). */
export function chunkAt(starts: number[], g: number): [file: number, n: number] {
  let low = 0;
  let high = starts.length - 2;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] <= g) low = mid;
    else high = mid - 1;
  }
  return [low, g - starts[low]];
}

// The files of a share going from here: their ids, how many chunks each has and their size.
type OutList = { ids: string[]; chunks: number[]; starts: number[] };

async function outList(share: OutShare, used: Set<string>): Promise<OutList | null> {
  const value = await readList(share.list, used);
  if (!value) return null;
  const ids: string[] = [];
  const counts: number[] = [];
  const chunks: number[] = [];
  for (const entry of value) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !/^[0-9a-f]{32}$/.test(entry[0])) return null;
    if (!Number.isSafeInteger(entry[1]) || entry[1] < 1 || entry[1] > HISTORY_CHUNKS || !CHUNK_SIZES.includes(entry[2])) return null;
    ids.push(entry[0]);
    counts.push(entry[1]);
    chunks.push(entry[2]);
  }
  const starts = startsOf(counts);
  return starts[starts.length - 1] === share.total ? { ids, chunks, starts } : null;
}

// What a share's chunks on the relay take there.
function onRelay(share: OutShare, list: OutList): number {
  let bytes = 0;
  for (let k = 0; k * ID_HEX < share.out.length; k++) {
    if (share.out.slice(k * ID_HEX, (k + 1) * ID_HEX) === ZERO) continue;
    bytes += list.chunks[chunkAt(list.starts, share.took + k)[0]];
  }
  return bytes;
}

function pause(name: string): void {
  const was = paused.get(name);
  const wait = was ? Math.min(PAUSE_MOST, was.wait * 2) : PAUSE;
  paused.set(name, { until: Date.now() + wait, wait });
}

// Chunks of ours taken from our relay, by the contact or off it: what it said was full, often with
// our own, may have room again, and is asked at once; full again, it waits longer than before.
function roomAgain(place: RoundsPlace): void {
  const was = paused.get(placeName(place));
  if (was) paused.set(placeName(place), { until: 0, wait: was.wait });
}

// Tells the contact where the chunks of a share not said yet wait, ROUND_IDS a message.
async function sayWhere(way: ShareWay, share: OutShare): Promise<OutShare> {
  const outs = share.out.length / ID_HEX;
  let said = share.said;
  while (said < outs) {
    const ids = share.out.slice(said * ID_HEX, (said + ROUND_IDS) * ID_HEX);
    await way.send(share.to, { s: share.s, at: share.took + said, r: share.r, ids });
    said += ids.length / ID_HEX;
  }
  if (said === share.said) return share;
  return (await updateOut(way.chats.pieces!, share.s, (now) => (now.out === share.out && now.took === share.took ? { ...now, said: Math.max(now.said, said) } : null))) ?? share;
}

// The shares going from here, those the contact keeps: said again after a day with no word, put
// up again before they expire, and their next chunks put on our relay while there is room, each
// said as it goes.
async function goOut(way: ShareWay, outs: OutShare[], used: Set<string>): Promise<void> {
  const own = way.own;
  const place = way.chats.pieces!;
  const name = placeName(place);
  if (!own) return;
  const ready: { share: OutShare; list: OutList }[] = [];
  for (const share of outs) {
    if (!share.ready || ended.has(share.s)) continue;
    const list = await outList(share, used);
    if (list) ready.push({ share, list });
  }
  if (ready.length === 0) return;
  let left = WINDOW - ready.reduce((sum, { share, list }) => sum + onRelay(share, list), 0);
  // One session for each way: our relay straight or as the space's Tor way says, and each chat that goes only through Tor on its own circuits.
  const sessions = new Map<string, RelaySession>();
  try {
    for (const { share: first, list } of ready) {
      let share: OutShare | null = first;
      const now = Date.now();
      if (now - share.heard > ASLEEP) {
        // Their phone said nothing for two weeks: what waits for it is taken off, and no more goes up.
        if (share.out) {
          await takeOff(forChat(way, share.to, own), share.r, share.out);
          left += onRelay(share, list);
          await updateOut(place, share.s, (one) => ({ ...one, out: '', said: 0, put: 0 }));
        }
        continue;
      }
      if (share.out && share.put && now - share.put > PUT_AGAIN) {
        // Up there almost as long as the relay keeps them: put again, said again.
        await takeOff(forChat(way, share.to, own), share.r, share.out);
        left += onRelay(share, list);
        share = await updateOut(place, share.s, (one) => ({ ...one, out: '', said: 0, put: 0 }));
      } else if (share.out && share.said > 0 && !share.full && now - Math.max(share.heard, share.again ?? 0) > SAY_AGAIN) {
        // Not while their phone waits for room, which said it has word of them.
        share = await updateOut(place, share.s, (one) => ({ ...one, said: 0, again: now }));
      }
      if (!share) continue;
      share = await sayWhere(way, share);
      const wait = paused.get(name);
      if (wait && wait.until > Date.now()) continue;
      // Chunks still on the relay we had before: the next go up once those are taken.
      if (share.out && !sameRelay(share.r, own.url)) continue;
      let batch = '';
      const flush = async () => {
        if (!batch || !share) return;
        const add = batch;
        batch = '';
        const next: OutShare | null = await updateOut(place, share.s, (one) => (one.took === share!.took ? { ...one, out: one.out + add, r: own.url, put: one.put || Date.now() } : null));
        // Stopped meanwhile: what went up is taken off again.
        if (!next || ended.has(share.s)) {
          await takeOff(forChat(way, share.to, own), own.url, add);
          share = null;
          return;
        }
        share = await sayWhere(way, next);
      };
      try {
        while (share && !way.stopped?.() && !ended.has(share.s)) {
          const outsNow = (share.out.length + batch.length) / ID_HEX;
          const g = share.took + outsNow;
          if (g >= share.total || outsNow >= WINDOW_CHUNKS) break;
          const [file, n] = chunkAt(list.starts, g);
          const count = list.starts[file + 1] - list.starts[file];
          const sealed = await readChunk(list.ids[file], n).catch(() => null);
          if (!sealed) {
            // Deleted here since: the rest of the file stays behind.
            batch += ZERO.repeat(Math.min(count - n, WINDOW_CHUNKS - outsNow));
          } else {
            if (left < list.chunks[file]) break;
            const to = forChat(way, share.to, own);
            let session = sessions.get(to.torChat ?? '');
            if (!session) sessions.set(to.torChat ?? '', (session = await sessionOn(to)));
            batch += toHex(await putChunk(session, sealed));
            left -= list.chunks[file];
            paused.delete(name);
          }
          if (batch.length / ID_HEX >= ROUND_IDS) await flush();
          await breathe();
        }
      } catch (error) {
        // Full, or not reached: asked again later, longer each time.
        pause(name);
        await flush().catch(() => undefined);
        throw error;
      }
      await flush();
    }
  } finally {
    for (const session of sessions.values()) session.close();
  }
}

// Whether a chunk is the `n`th of the file, whole: it opens with the file's key, as large as that one is.
function fits(ref: FileRef, n: number, sealed: Uint8Array): boolean {
  try {
    const piece = room(ref.chunk);
    const size = n < ref.count - 1 ? piece : ref.size - (ref.count - 1) * piece;
    return openChunk(fromHex(ref.key), n, sealed, ref.chunk).length === size;
  } catch {
    return false;
  }
}

// The files of a share coming here, as they are kept.
async function inList(share: InShare, used: Set<string>): Promise<FileRef[] | null> {
  const value = await readList(share.list, used);
  if (!value || !value.every((ref) => isFileRef(ref, HISTORY_CHUNKS))) return null;
  const refs = value as FileRef[];
  return refs.reduce((sum, ref) => sum + ref.count, 0) === share.total ? refs : null;
}

// Where the `g`th chunk of a share waits, as the sharer said: the relay and its id; null when not said yet.
function waitingAt(share: InShare, g: number): [relay: string, id: string] | null {
  for (let k = share.wait.length - 1; k >= 0; k--) {
    const [at, relay, ids] = share.wait[k];
    const n = g - at;
    if (n >= 0 && n * ID_HEX < ids.length) return [relay, ids.slice(n * ID_HEX, (n + 1) * ID_HEX)];
  }
  return null;
}

// Whether a share's chats are still among the place's imported chats, as found once since Erevos
// started or chats went: the files of a chat deleted meanwhile are taken off the relay, not kept,
// and a share with none left ends. Returns it as it is now, or null once it ended.
async function stillHere(way: ShareWay, share: InShare, refs: FileRef[]): Promise<InShare | null> {
  const place = way.chats.pieces!;
  const key = `${placeName(place)}|${share.by}|${share.s}`;
  if (found.has(key)) return share;
  const archive = await Archive.open(place.holder, place.space, place.key);
  const chats = share.chats.map((id) => archive.chat(id)).filter((chat): chat is ArchivedChat => !!chat);
  if (chats.length === 0) {
    await changeRounds(place, (now) => ({ ...now, in: now.in.filter((one) => !(one.s === share.s && one.by === share.by)) }));
    await endIn(way, share, true);
    return null;
  }
  const named = new Set(keptFiles(chats).map((ref) => ref.id));
  const skip = refs.flatMap((ref, file) => (named.has(ref.id) || share.skip.includes(file) ? [] : [file]));
  for (const file of skip) await deleteChunks(refs[file].id, refs[file].count).catch(() => undefined);
  const now = skip.length > 0 ? await updateIn(place, share, (one) => ({ ...one, skip: [...one.skip, ...skip] })) : share;
  found.add(key);
  return now;
}

// The shares coming here: each chunk said to wait taken through our relay, checked, kept, and
// deleted there; how many came said to the sharer as they come, and once they all came, the share
// done. While the phone has too little room, or a chunk waits where only Tor may take it from, none
// is taken, and the share says why (`waits`).
async function comeIn(way: ShareWay, ins: InShare[], used: Set<string>): Promise<void> {
  const place = way.chats.pieces!;
  const own = way.own;
  const name = `in ${placeName(place)}`;
  // Chunks kept since the room left was last looked at: before the first, and every TELL_EVERY.
  let looked = TELL_EVERY;
  // Whether a chunk may be fetched to keep: not while a wait for room lasts, nor with less than
  // ROOM_KEPT left, which begins the next wait, longer than the one before. After a wait, the
  // room is looked at before the next.
  const room = async (): Promise<boolean> => {
    const wait = paused.get(name);
    if (wait && wait.until > Date.now()) return false;
    if (!wait && looked < TELL_EVERY) return true;
    const free = await freeRoom().catch(() => null);
    if (free !== null && free < ROOM_KEPT) {
      pause(name);
      return false;
    }
    looked = 0;
    return true;
  };
  for (const first of ins) {
    if (way.stopped?.()) return;
    const refs = await inList(first, used);
    if (!refs) continue;
    let share = await stillHere(way, first, refs);
    if (!share) continue;
    const starts = startsOf(refs.map((ref) => ref.count));
    const skip = new Set(share.skip);
    const sessions = new Map<string, { session: RelaySession; via?: string }>();
    let since = 0;
    let gone = false;
    let why: InShare['waits'];
    let now: InShare = share;
    // Kept as far as it came, and why it waits; false once the share is no longer there (it ended meanwhile).
    const save = async (): Promise<boolean> => {
      const kept = now;
      const saved = await updateIn(place, kept, ({ waits: _waits, ...one }) => ({ ...one, taken: kept.taken, whole: kept.whole, skip: [...skip], wait: one.wait.filter(([at, , ids]) => at + ids.length / ID_HEX > kept.taken), ...(why ? { waits: why } : {}) }));
      if (saved) now = saved;
      return saved !== null;
    };
    try {
      while (now.taken < now.total && !way.stopped?.()) {
        const g = now.taken;
        const [file, n] = chunkAt(starts, g);
        const ref = refs[file];
        const at = waitingAt(now, g);
        if (!at) break;
        const [relay, id] = at;
        if (id !== ZERO) {
          if (!own) break;
          // Through our relay, never from where the sharer chose straight unless Tor takes it
          // (takesItself): from a place lent on a contact's relay, with Everything through Tor, which
          // it waits for, and goes on once it is so.
          if (!takesItself(own, { relay, ids: id })) {
            why = 'tor';
            break;
          }
          let open = sessions.get(relay);
          if (!open) {
            const where = fileWay(forChat(way, now.by, own), relay);
            open = { session: await RelaySession.open(where.at, true), via: where.via };
            sessions.set(relay, open);
          }
          if (!skip.has(file)) {
            const kept = await readChunk(ref.id, n).catch(() => null);
            if (!kept || !fits(ref, n, kept)) {
              if (!(await room())) {
                why = 'room';
                break;
              }
              const sealed = await getChunk(open.session, fromHex(id), open.via);
              if (!sealed) {
                gone = true;
                break;
              }
              if (fits(ref, n, sealed)) {
                try {
                  await saveChunk(ref.id, n, sealed);
                } catch {
                  // Not written, as with no room left: it stays on the relay, and waits as for room.
                  pause(name);
                  why = 'room';
                  break;
                }
                looked++;
                paused.delete(name);
              } else {
                // Changed on the way: the file is not kept, and the rest of it only taken off the relay.
                skip.add(file);
                await deleteChunks(ref.id, ref.count).catch(() => undefined);
              }
            }
          }
          await deleteChunk(open.session, fromHex(id), open.via).catch(() => false);
        } else if (!skip.has(file)) {
          // No longer on the sharer's phone: it stays behind.
          skip.add(file);
          await deleteChunks(ref.id, ref.count).catch(() => undefined);
        }
        const whole = n === ref.count - 1 && !skip.has(file);
        now = { ...now, taken: g + 1, whole: whole ? now.whole + 1 : now.whole };
        if (whole) told(place, { peer: `${CONTACT_PREFIX}${now.by}` });
        if (++since >= TELL_EVERY) {
          since = 0;
          if (!(await save())) return;
          now = await sayTook(way, now);
        }
        await breathe();
      }
    } catch {
      // The relay could not be reached: the next round goes on from here.
    } finally {
      for (const { session } of sessions.values()) session.close();
    }
    if (!(await save())) continue;
    if (gone) {
      // Gone from the relay, as after more than 14 days away: the sharer puts them up again.
      await way.send(now.by, { s: now.s, took: now.taken, gone: true }).catch(() => undefined);
      await updateIn(place, now, (one) => ({ ...one, wait: [], told: now.taken, toldAt: Date.now() }));
      continue;
    }
    now = await sayTook(way, now);
    if (now.taken >= now.total) await doneIn(way, now);
    else told(place);
  }
}

// Tells the sharer how many chunks came, when that changed, or after a day with no word of where
// the next wait (their message may have been lost); and that the phone has no room for more, or
// has again.
async function sayTook(way: ShareWay, share: InShare): Promise<InShare> {
  const full = share.waits === 'room';
  const quiet = !waitingAt(share, share.taken) && share.taken < share.total && Date.now() - share.toldAt > SAY_AGAIN;
  if (share.told === share.taken && full === !!share.toldRoom && !quiet) return share;
  try {
    await way.send(share.by, { s: share.s, took: share.taken, ...(full ? { full: true as const } : {}) });
  } catch {
    return share;
  }
  const taken = share.taken;
  return (await updateIn(way.chats.pieces!, share, ({ toldRoom: _told, ...one }) => ({ ...one, told: taken, toldAt: Date.now(), ...(full ? { toldRoom: true as const } : {}) }))) ?? share;
}

// A share whose chunks all came: kept as done, to say so again should the sharer ask, its list deleted.
async function doneIn(way: ShareWay, share: InShare): Promise<void> {
  const place = way.chats.pieces!;
  // Files that did not come whole (skipped) stayed behind.
  const refs = share.skip.length > 0 ? await inList(share, new Set()).catch(() => null) : null;
  const left = refs ? await leftBehind(place, share, refs) : false;
  await changeRounds(place, (now) => ({
    ...now,
    in: now.in.filter((one) => !(one.s === share.s && one.by === share.by)),
    done: [...now.done, [share.by, share.s, share.total] as [string, string, number]].slice(-MOST_DONE),
  }));
  await deleteChunks(share.list.id, share.list.count).catch(() => undefined);
  lists.delete(share.list.id);
  told(place, { peer: `${CONTACT_PREFIX}${share.by}`, ...(left ? { chats: true as const } : {}) });
}

const forgetPack = (place: RoundsPlace, identity: string, tag: string) =>
  changeRounds(place, (now) => ({ ...now, packs: now.packs.filter(([who, said]) => !(who === identity && said === tag)) }));

// The shared chats that came: each from a contact taken (not a message request) kept at once, with
// its files named, to come in rounds; one whose file is gone, or holds none, forgotten. One from
// where the sharer chose straight waits for Tor, or a tap (takesItself).
async function keepPacks(way: ShareWay, packs: RoundsData['packs']): Promise<void> {
  const place = way.chats.pieces!;
  const { e2e, history } = way.chats;
  for (const [identity, tag] of packs) {
    if (way.stopped?.()) return;
    const contact = e2e.contacts().find((one) => one.identity === identity);
    const peer = `${CONTACT_PREFIX}${identity}`;
    const message = history.messages().find((m) => m.peer === peer && m.tag === tag && !m.mine);
    const file = message?.file;
    if (!contact || !file?.history || !file.from) {
      await forgetPack(place, identity, tag);
      continue;
    }
    const tap = `${identity}|${tag}`;
    if (contact.request || (!tapped.has(tap) && !takesItself(way.own, file.from))) continue;
    try {
      await keepPack(way, identity, contact.name, tag, file, !tapped.has(tap));
    } catch (error) {
      // Not reached: tried again with the next round, and one tapped says so, to be tapped again.
      if (!(error instanceof FileGoneError) && !(error instanceof FileDamagedError)) {
        if (tapped.has(tap)) told(place, { peer, tag, taking: 'failed' });
        continue;
      }
      told(place, { peer, tag });
    } finally {
      tapped.delete(tap);
    }
    await forgetPack(place, identity, tag);
  }
}

async function keepPack(way: ShareWay, identity: string, name: string, tag: string, file: FileRef, itself: boolean): Promise<void> {
  const place = way.chats.pieces!;
  const peer = `${CONTACT_PREFIX}${identity}`;
  // Tapped: how far it has come shows on its line.
  const progress = itself ? undefined : (done: number, count: number) => told(place, { peer, tag, taking: `${Math.floor((done / Math.max(1, count)) * 100)}%` });
  const pack = await takeFile(way.own && forChat(way, identity, way.own), file, progress, way.leave, place, itself);
  const bytes = await readFile(pack);
  if (!bytes) throw new FileGoneError();
  const read = readPack(bytes);
  if (read && read.chats.length > 0) {
    // Its files come here only on the phone that holds the account, and only when each reads.
    const files = read.files.filter((one) => one !== null);
    const rounds = takesRounds(way.chats.e2e) && !!read.share && read.files.length > 0 && files.length === read.files.length;
    // The same share kept before, as when Erevos stopped before it forgot its message: its files
    // keep their places here, and what came of them.
    const was = rounds ? (await loadRounds(place)).in.find((one) => one.s === read.share && one.by === identity) : undefined;
    const wasRefs = was ? await inList(was, new Set()) : null;
    const again = was && wasRefs && wasRefs.length === files.length ? { share: was, refs: wasRefs } : null;
    const refs = again ? again.refs : rounds ? files.map(refOf) : read.files.map(() => null);
    const list = again ? null : rounds ? await keepFile(bytesSource(utf8Encode(JSON.stringify(refs))), LIST_META, undefined, MAX_IMPORTED_FILE, holdChunks) : null;
    try {
      const archive = await Archive.open(place.holder, place.space, place.key);
      const ids = await archive.keepShared(receivedChats(read, identity, name, refs));
      if (again) {
        await updateIn(place, again.share, (one) => ({ ...one, tag, chats: ids }));
      } else if (list) {
        const total = refs.reduce((sum, one) => sum + (one?.count ?? 0), 0);
        const share: InShare = { s: read.share, by: identity, tag, list, total, files: refs.length, whole: 0, taken: 0, wait: [], skip: [], told: -1, toldAt: 0, chats: ids };
        // A share from them still coming takes its place: this one has its chats.
        let before: InShare[] = [];
        await changeRounds(place, (now) => {
          before = now.in.filter((one) => one.by === identity);
          return { ...now, in: [...now.in.filter((one) => one.by !== identity), share] };
        });
        for (const old of before) {
          await deleteChunks(old.list.id, old.list.count).catch(() => undefined);
          lists.delete(old.list.id);
        }
      } else if (read.share && read.files.length > 0 && takesRounds(way.chats.e2e)) {
        // Files that do not read: none come, and the sharer hears so.
        await way.send(identity, { s: read.share, drop: true }).catch(() => undefined);
      }
    } catch (error) {
      if (list) await deleteChunks(list.id, list.count).catch(() => undefined);
      throw error;
    } finally {
      if (list) await releaseChunks([list.id]).catch(() => undefined);
    }
  }
  // Its file is not kept: its chats are, among the imported ones.
  await deleteChunks(pack.id, pack.count).catch(() => undefined);
  await way.chats.history.setFile(peer, tag, pack);
  told(place, { peer, tag, file: pack, chats: true });
}
