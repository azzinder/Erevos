import { checkedChatNotify, type ChatNotify } from '../lock/chat-notify';
import { loadMatrix, saveMatrix } from '../lock/matrix-data';
import { currentSpace } from '../lock/keys';
import { lastRestore } from '../lock/restored';
import type { Holder } from '../lock/sealed-file';
import { canMatrix } from './core';
import { randomBytes, sha256Bytes, toHex } from './crypto';
import { t } from './i18n';
import {
  deleteMessage,
  findHomeserver,
  loginWays,
  signInWithToken,
  ssoLink,
  type LoginWays,
  createGroup,
  inviteToRoom,
  joinRoom,
  leaveRoom,
  loadEarlier,
  markRead,
  MatrixError,
  sendChange,
  sendReaction,
  sendReply,
  sendText,
  sendTyping,
  fetchOwnAvatar,
  setOwnAvatar,
  signIn,
  signOut,
  startChat,
  syncApply,
  syncFetch,
  takeBackReaction,
  type MatrixFile,
  type MatrixRoom,
  type MatrixState,
} from './matrix';
import { backUpKeys, recoveryInfo, restoreLocked, setUpRecovery, unlockRecovery, type Unlocked } from './matrix-backup';
import { fetchFile, fetchPicture, sendFile, uploadPicture, type OutgoingFile } from './matrix-media';
import {
  acceptVerification,
  cancelVerification,
  confirmScanned,
  confirmVerification,
  forgetVerifications,
  onVerificationChange,
  requestVerification,
  scanCode,
  type Verification,
  verifications,
  verifyByEmoji,
} from './matrix-verify';
import { followDoor, spaceRelayOf } from './closed-notices';
import { keepMatrixPush, startMatrixPush, stopMatrixPush } from './matrix-push';
import { addNetwork, hearing } from './network-notices';
import type { MatrixCallsAccount } from './matrix-calls';
import { actingWhere, type NetworkWhere } from './network-place';
import { PlaceLives, type PlaceKey } from './place-lives';

// The open space's Matrix account as the screens use it (app/matrix.tsx, app/matrix-chat.tsx):
// loaded from its sealed value (lock/matrix-data.ts), synced with its homeserver while it runs,
// and kept again after each change. Everything that changes the account runs one after another;
// a sync waits on the homeserver outside of that, so a message goes out while it waits.
//
// It runs once something asks for it (runMatrix), and goes on until the space closes or another
// opens: then it stops and lets go of the account. A hidden place's own account runs beside it
// while its hidden chats are open, and while they are closed too if they receive while closed
// (followMatrixPlaces, lib/place-networks.ts): the open one's screens show it and act on it
// (lib/network-place.ts); what comes to one tells only of its place (lib/network-notices.ts), and
// none has push. Its calls are made while its hidden chats are open, and ring then, or with no
// name while they are closed and receive (lib/matrix-calls.ts).

type Live = {
  /** The space's account, or a hidden place's. */
  holder: Holder;
  space: number;
  key: Uint8Array;
  state: MatrixState | null;
  loaded: boolean;
  /** What went wrong last, for the screen. */
  problem: string;
  stopped: boolean;
  running: boolean;
  queue: Promise<unknown>;
  saving: ReturnType<typeof setTimeout> | null;
  /** Room keys already asked of the key backup while it runs. */
  asked: Set<string>;
  /** What its rooms had not read after the last change, to tell of what came (lib/network-notices.ts). */
  heard: ReturnType<typeof hearing>;
  /** Whether its push while closed (lib/matrix-push.ts) was looked at this run. */
  pushChecked: boolean;
};

let live: Live | null = null;
// The hidden places' own accounts that run: the open hidden chats', and those receiving while closed.
const places = new PlaceLives<Live>(start, end);
const listeners = new Set<() => void>();

/** Told each time the account, its rooms or their messages change. */
export function onMatrixChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const told = () => listeners.forEach((listener) => listener());
onVerificationChange(told);

/** The open space's account as it is now, or the open hidden place's: null while it loads, or when there is none. */
export function matrixNow(where: NetworkWhere = 'space'): { loaded: boolean; state: MatrixState | null; problem: string } {
  const it = where === 'place' ? places.shown() : live;
  return { loaded: it?.loaded ?? false, state: it?.state ?? null, problem: it?.problem ?? '' };
}

/** The account the screen on top acts on. */
function acting(): Live | null {
  return actingWhere() === 'place' ? places.shown() : live;
}

/** How many messages are not read in the open space's Matrix rooms, invites counted as one each. */
export function matrixUnread(): number {
  const rooms = Object.values(live?.state?.rooms ?? {});
  return rooms.reduce((sum, room) => sum + (room.invitedBy ? 1 : room.unread), 0);
}

// Each room's messages not read, by its home row (lib/inbox.ts): an invite counts as one.
function unreadAt(state: MatrixState | null): Map<string, number> {
  const at = new Map<string, number>();
  for (const room of Object.values(state?.rooms ?? {})) {
    const n = room.invitedBy ? 1 : room.unread;
    if (n > 0) at.set(`matrix:${room.id}`, n);
  }
  return at;
}

addNetwork('matrix:', {
  unread: () => (live && !live.stopped ? unreadAt(live.state) : new Map()),
  notifyOf: (where) => checkedChatNotify(live?.state?.rooms[where.slice('matrix:'.length)]?.notify),
});

function reason(error: unknown): string {
  if (error instanceof MatrixError && error.code === 'M_FORBIDDEN') return t('The Matrix server says the name or the password is wrong.');
  return error instanceof Error ? error.message : String(error);
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
    // Kept even after the space closed: the keys of what came last must not be lost.
    saveMatrix(it.space, it.key, it.state, it.holder).catch((error: unknown) => {
      it.problem = reason(error);
      told();
    });
  }, 500);
}

/**
 * Runs `change` on the account after every change asked for before, then keeps it and tells the
 * screens, and of the messages that came or were read. Until its first sync, an account only takes
 * in what came before it, and tells of none of it.
 */
function changeAccount<T>(it: Live, change: () => Promise<T>): Promise<T> {
  const run = it.queue
    .catch(() => undefined)
    .then(async () => {
      const quiet = !it.state?.since;
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

async function loop(it: Live): Promise<void> {
  if (it.running) return;
  it.running = true;
  let wait = 2000;
  try {
    while (it.state && stillOpen(it)) {
      const since = it.state.since;
      try {
        const news = await syncFetch(it.state, since ? 30_000 : 0);
        if (!stillOpen(it) || !it.state || it.state.since !== since) continue;
        await changeAccount(it, async () => {
          if (!it.state) return;
          await syncApply(it.state, news);
          // With a key backup: locked messages ask it for their keys, and new keys go into it.
          if (it.state.backup) {
            await restoreLocked(it.state, it.asked).catch(() => 0);
            await backUpKeys(it.state).catch(() => 0);
          }
        });
        if (it.problem) {
          it.problem = '';
          told();
        }
        if (!it.pushChecked && it.holder === 'space') {
          it.pushChecked = true;
          void keepPush(it);
          void changeAccount(it, async () => {
            if (it.state) await fetchOwnAvatar(it.state);
          }).catch(() => undefined);
        }
        wait = 2000;
      } catch (error) {
        // The homeserver signed this device out: the account is forgotten here too.
        if (error instanceof MatrixError && error.code === 'M_UNKNOWN_TOKEN') {
          it.state = null;
          it.problem = t('The Matrix server signed this device out. Sign in again.');
          keepSoon(it);
          told();
          return;
        }
        it.problem = reason(error);
        told();
        await new Promise((resolve) => setTimeout(resolve, wait));
        wait = Math.min(wait * 2, 60_000);
      }
    }
  } finally {
    it.running = false;
  }
}

// Once a run, after a sync: the push while closed as it should be now, as the space moved to another
// relay, or the homeserver or the relay let go of it. What fails is tried again the next run.
async function keepPush(it: Live): Promise<void> {
  const push = it.state?.push;
  if (!push || !it.state) return;
  try {
    const relay = await spaceRelayOf(it.space, it.key);
    if (!relay || !stillOpen(it) || !it.state) return;
    const next = await keepMatrixPush(it.state, push, relay);
    if (next === push || !stillOpen(it)) return;
    await changeAccount(it, async () => {
      if (it.state) it.state.push = next;
    });
    await saveMatrix(it.space, it.key, it.state);
    await followDoor(it.space, it.key);
  } catch {
    // Unreachable, or refused: the push stays as it was.
  }
}

/** Whether the open space tells of Matrix messages while closed (lib/matrix-push.ts). */
export function matrixPushOn(): boolean {
  return !!live?.state?.push;
}

/**
 * Lets the open space tell of Matrix messages while closed, or no more: a queue at its relay and a
 * pusher on the homeserver, or neither. Its door names the queue as it changes (lib/closed-notices.ts).
 */
export async function matrixSetPush(on: boolean): Promise<void> {
  const it = need();
  if (it.holder !== 'space') throw new Error('A hidden place says nothing while closed.');
  const was = it.state.push;
  if (on === !!was) return;
  const relay = await spaceRelayOf(it.space, it.key);
  if (on) {
    if (!relay) throw new Error(t('This space has no queue at a relay yet: it can say nothing while closed.'));
    const push = await startMatrixPush(it.state, relay);
    await changeAccount(it, async () => {
      it.state.push = push;
    });
  } else if (was) {
    await stopMatrixPush(it.state, was, relay ?? undefined);
    await changeAccount(it, async () => {
      delete it.state.push;
    });
  }
  // Kept at once, as the door reads it from what is kept.
  await saveMatrix(it.space, it.key, it.state);
  await followDoor(it.space, it.key).catch(() => undefined);
}

/** Loads the open space's account, once, and syncs it while the space stays open. */
export function runMatrix(): void {
  if (!canMatrix()) return;
  let space: { space: number; key: Uint8Array };
  try {
    space = currentSpace();
  } catch {
    return;
  }
  if (live && live.space === space.space && !live.stopped) {
    void loop(live);
    return;
  }
  stopMatrix();
  live = start('space', space.space, space.key);
}

/**
 * Runs the own accounts of the hidden places of `space` in `wanted`, each loaded once and synced
 * while it stays wanted, and lets go of the others; `shown` is the pocket of the open hidden chats.
 */
export function followMatrixPlaces(space: number, wanted: PlaceKey[], shown: number | null): void {
  const was = places.shown();
  if (!places.follow(space, canMatrix() ? wanted : [], shown)) return;
  // What was fetched for the open hidden chats goes as they close.
  if (was && !places.isShown(was)) fetched.clear();
  told();
}

/** Stops every hidden place's account and lets go of them. */
export function closeMatrixPlaces(): void {
  if (!places.stopAll()) return;
  fetched.clear();
  pictures.clear();
  told();
}

function end(it: Live): void {
  it.stopped = true;
  if (it.state) forgetVerifications(it.state);
}

function start(holder: Holder, space: number, key: Uint8Array, pocket?: number): Live {
  const heard = hearing(pocket === undefined ? undefined : { space, pocket });
  const it: Live = { holder, space, key, state: null, loaded: false, problem: '', stopped: false, running: false, queue: Promise.resolve(), saving: null, asked: new Set(), heard, pushChecked: false };
  loadMatrix(space, key, holder)
    .then(async (loaded) => {
      let state = loaded;
      // Restored from a backup since it was signed in: its device's keys are as the backup kept them,
      // which would use again what was used since, on a device the phone it came from may still be.
      // The Matrix server takes no device back, so it is let go of here (never signed out, which
      // would end the other phone's), and the space signs in again as a new one.
      const restore = await lastRestore();
      if (state && state.restored !== restore) {
        if (state.restored !== undefined) {
          state = null;
          it.problem = t('A backup was restored here: sign in to Matrix again, as a new device. Your Security Key opens the messages from before.');
        } else state.restored = restore;
        await saveMatrix(space, key, state, holder);
      }
      it.state = state;
      it.heard.hear(unreadAt(state), true);
      it.loaded = true;
      told();
      void loop(it);
    })
    .catch((error: unknown) => {
      it.loaded = true;
      it.problem = reason(error);
      told();
    });
  return it;
}

/** Stops syncing and lets go of the account, as its space closes, and of its hidden place's. */
export function stopMatrix(): void {
  closeMatrixPlaces();
  if (!live) return;
  live.stopped = true;
  if (live.state) forgetVerifications(live.state);
  live = null;
  fetched.clear();
  pictures.clear();
  told();
}

/** An account for its calls (lib/matrix-calls.ts): as it is now, and changed after what was asked
 *  before, then kept. */
function callAccount(of: () => Live | null): MatrixCallsAccount {
  return {
    now: () => of()?.state ?? null,
    change<T>(use: (state: MatrixState) => Promise<T>): Promise<T> {
      const it = need(of());
      return changeAccount(it, () => use(it.state));
    },
    /** For what changes nothing of the account: at once, and nothing kept. */
    async read<T>(use: (state: MatrixState) => Promise<T>): Promise<T> {
      return use(need(of()).state);
    },
  };
}

/** Of the account `state` is, when it is a closed hidden place's that receives (lib/place-receiver.ts):
 *  its space and pocket, and the account, for the calls that ring it. */
function closedPlace(state: MatrixState): { space: number; pocket: number; account: MatrixCallsAccount } | null {
  const found = places.closed((it) => it.state === state);
  if (!found) return null;
  const { it, pocket } = found;
  return { space: it.space, pocket, account: callAccount(() => (it.stopped ? null : it)) };
}

/** The open space's account for its calls, its open hidden place's while their chats are open, and
 *  those of its closed places that receive. */
export const matrixCallAccount: MatrixCallsAccount & {
  place: MatrixCallsAccount;
  closed: typeof closedPlace;
  watch(listener: () => void): () => void;
} = {
  ...callAccount(() => live),
  place: callAccount(() => places.shown()),
  closed: closedPlace,
  watch: onMatrixChange,
};

function need(it = acting()): Live & { state: MatrixState } {
  if (!it?.state) throw new Error(t('There is no Matrix account in this space.'));
  return it as Live & { state: MatrixState };
}

/** Signs the open space in to Matrix: `who` is a Matrix ID, `server` a homeserver when it is not the ID's own. */
export async function matrixSignIn(who: string, password: string, server = ''): Promise<void> {
  const it = acting();
  if (!it || it.stopped) throw new Error(t('There is no Matrix account in this space.'));
  try {
    const homeserver = await findHomeserver(server.trim() || who);
    const state = await signIn(homeserver, who, password);
    state.restored = await lastRestore();
    await changeAccount(it, async () => {
      it.state = state;
      it.problem = '';
    });
    await saveMatrix(it.space, it.key, state, it.holder);
    void loop(it);
  } catch (error) {
    throw new Error(reason(error));
  }
}

// A sign-in with single sign-on under way: whose account it is for (the space's, or a hidden
// place's, which may have locked and opened again meanwhile), its homeserver, and the one-use mark
// the address back carries, so a login token that comes for another sign-in, or long after, is not
// taken. In memory only: closing the app ends it.
let sso: { holder: Holder; space: number; whose: string; homeserver: string; mark: string; at: number } | null = null;
// Which key an account is sealed with, without keeping the key.
const whoseOf = (it: Live) => toHex(sha256Bytes(it.key));
const SSO_LASTS = 10 * 60_000;

/** The ways the homeserver of `whoOrServer` lets one sign in. */
export async function matrixLoginWays(whoOrServer: string): Promise<LoginWays & { homeserver: string }> {
  try {
    const homeserver = await findHomeserver(whoOrServer);
    return { homeserver, ...(await loginWays(homeserver)) };
  } catch (error) {
    throw new Error(reason(error));
  }
}

/**
 * Starts signing in with single sign-on: answers the page for the browser, which comes back to
 * `back` (Erevos's own address) with a login token once the person signed in there.
 */
export function matrixSsoStart(homeserver: string, back: string, idp?: string): string {
  const it = acting();
  if (!it || it.stopped) throw new Error(t('There is no Matrix account in this space.'));
  const mark = toHex(randomBytes(16));
  sso = { holder: it.holder, space: it.space, whose: whoseOf(it), homeserver, mark, at: Date.now() };
  return ssoLink(homeserver, `${back}${back.includes('?') ? '&' : '?'}sso=${mark}`, idp);
}

/** Ends a sign-in with single sign-on: the login token that came back with `mark`. */
export async function matrixSsoFinish(mark: string, token: string): Promise<void> {
  const under = sso;
  const it = acting();
  const same = !!under && !!it && !it.stopped && it.holder === under.holder && it.space === under.space && whoseOf(it) === under.whose;
  if (!under || under.mark !== mark || Date.now() - under.at > SSO_LASTS || !same || !it) {
    sso = null;
    throw new Error(t('This sign-in is not the one Erevos started, or it took too long. Start it again.'));
  }
  sso = null;
  if (it.state) throw new Error(t('This space is signed in to Matrix already.'));
  try {
    const state = await signInWithToken(under.homeserver, token);
    state.restored = await lastRestore();
    await changeAccount(it, async () => {
      it.state = state;
      it.problem = '';
    });
    await saveMatrix(it.space, it.key, state, it.holder);
    void loop(it);
  } catch (error) {
    throw new Error(reason(error));
  }
}

/** Signs out, and forgets the account in this space. */
export async function matrixSignOut(): Promise<void> {
  const it: Live = need();
  if (it.state) {
    forgetVerifications(it.state);
    // Its pusher goes with the device; its queue at the relay is deleted here.
    if (it.state.push) await stopMatrixPush(it.state, it.state.push, (await spaceRelayOf(it.space, it.key).catch(() => null)) ?? undefined);
    await signOut(it.state).catch(() => undefined);
  }
  await changeAccount(it, async () => {
    it.state = null;
  });
  await saveMatrix(it.space, it.key, null, it.holder);
  if (it.holder === 'space') await followDoor(it.space, it.key).catch(() => undefined);
}

/** Tells a room we write, or stopped, when the account says so; nothing on failure. */
export function matrixTyped(roomId: string, typing: boolean): void {
  const it = acting();
  if (!it?.state?.sayTyping) return;
  void sendTyping(it.state, roomId, typing).catch(() => undefined);
}

/** Puts our profile picture on the homeserver, or takes it away with null. */
export function matrixSetAvatar(picture: { bytes: Uint8Array; mime: string } | null): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    await setOwnAvatar(it.state, picture ? await uploadPicture(it.state, picture.bytes, picture.mime) : '');
  });
}

// Profile and room pictures fetched while Erevos runs, by address: kept in memory only.
const pictures = new Map<string, Uint8Array>();

/** The picture at an mxc:// address, or null when it cannot be had now. */
export async function matrixPicture(mxc: string, where: NetworkWhere = 'space'): Promise<Uint8Array | null> {
  const it = where === 'place' ? places.shown() : live;
  if (!it?.state) return null;
  const kept = pictures.get(mxc);
  if (kept) return kept;
  try {
    const bytes = await fetchPicture(it.state, mxc);
    if (pictures.size >= 200) pictures.delete(pictures.keys().next().value as string);
    pictures.set(mxc, bytes);
    return bytes;
  } catch {
    return null;
  }
}

/** Whether the others are told when we write. */
export function matrixSetSayTyping(on: boolean): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    if (on) it.state.sayTyping = true;
    else delete it.state.sayTyping;
  });
}

export function matrixSend(roomId: string, text: string, mentions: string[] = []): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    await sendText(it.state, roomId, text, mentions);
  });
}

/** Answers a message of the room with `text`. */
export function matrixReply(roomId: string, text: string, replyTo: string, mentions: string[] = []): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    await sendReply(it.state, roomId, text, replyTo, mentions);
  });
}

/** Reacts to a message with an emoji, or takes our reaction back when it is there. */
export function matrixReact(roomId: string, target: string, key: string): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    const ours = it.state.rooms[roomId]?.messages.find((m) => m.id === target)?.reactions?.[key]?.includes(it.state.userId);
    if (ours) await takeBackReaction(it.state, roomId, target, key);
    else await sendReaction(it.state, roomId, target, key);
  });
}

/** Changes the words of a message of ours. */
export function matrixChange(roomId: string, target: string, text: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => sendChange(it.state, roomId, target, text));
}

/** Takes a message back, for everyone in the room. */
export function matrixDelete(roomId: string, target: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => deleteMessage(it.state, roomId, target));
}

/** Fetches older messages of a room; answers how many came. Locked ones are tried with the key backup. */
export function matrixLoadEarlier(roomId: string): Promise<number> {
  const it = need();
  return changeAccount(it, async () => {
    const added = await loadEarlier(it.state, roomId);
    if (added && it.state.backup) await restoreLocked(it.state).catch(() => 0);
    return added;
  });
}

export function matrixStartChat(userId: string): Promise<MatrixRoom> {
  const it = need();
  return changeAccount(it, () => startChat(it.state, userId));
}

/** Makes an encrypted group with a name, and invites `invite` to it. */
export function matrixCreateGroup(name: string, invite: string[]): Promise<MatrixRoom> {
  const it = need();
  return changeAccount(it, () => createGroup(it.state, name, invite));
}

/** Asks someone to join a room we are in. */
export function matrixInvite(roomId: string, userId: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => inviteToRoom(it.state, roomId, userId));
}

/** Joins a room we were invited to, or one by its ID or #alias:server; says its ID. */
export function matrixJoin(roomId: string): Promise<string> {
  const it = need();
  return changeAccount(it, () => joinRoom(it.state, roomId));
}

export function matrixLeave(roomId: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => leaveRoom(it.state, roomId));
}

/** A room's own notifications (lock/chat-notify.ts), or the app's again with null. */
export function matrixSetNotify(roomId: string, notify: ChatNotify | null): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    const room = it.state.rooms[roomId];
    if (!room) return;
    if (notify) room.notify = notify;
    else delete room.notify;
  });
}

export function matrixRead(roomId: string): Promise<void> {
  const it = need();
  if (!it.state.rooms[roomId]?.unread) return Promise.resolve();
  return changeAccount(it, () => markRead(it.state, roomId));
}

/** Sends a photo or file to a room. */
export function matrixSendFile(roomId: string, file: OutgoingFile): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    await sendFile(it.state, roomId, file);
  });
}

// Files fetched while Erevos runs, by their address, so a photo scrolled past is not fetched again:
// the newest few, up to FETCHED_MOST bytes in all. Never written to the phone.
const FETCHED_MOST = 40 * 1024 * 1024;
const fetched = new Map<string, Uint8Array>();

/** A message's file, fetched from the homeserver and opened, or kept from before. */
export async function matrixFile(file: MatrixFile): Promise<Uint8Array> {
  const it = need();
  const where = file.encrypted?.url ?? file.url ?? '';
  const kept = fetched.get(where);
  if (kept) return kept;
  const bytes = await fetchFile(it.state, file);
  fetched.set(where, bytes);
  let total = [...fetched.values()].reduce((sum, b) => sum + b.length, 0);
  for (const [key, b] of fetched) {
    if (total <= FETCHED_MOST || key === where) continue;
    fetched.delete(key);
    total -= b.length;
  }
  return bytes;
}

/** The open space's checks by emoji (lib/matrix-verify.ts), or the open hidden place's: asked, going on, or just ended. */
export function matrixVerifications(where: NetworkWhere = 'space'): Verification[] {
  const it = where === 'place' ? places.shown() : live;
  return it?.state ? verifications(it.state) : [];
}

/** Asks `userId` to check by emoji, in the chat `roomId`; without one, another device of ours. */
export function matrixVerify(userId: string, roomId?: string): Promise<Verification> {
  const it = need();
  return changeAccount(it, () => requestVerification(it.state, userId, roomId));
}

export function matrixVerifyAccept(id: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => acceptVerification(it.state, id));
}

/** The pictures match, or they do not. What the check proves is kept with the account. */
export function matrixVerifyMatch(id: string, match: boolean): Promise<void> {
  const it = need();
  return changeAccount(it, () => confirmVerification(it.state, id, match));
}

/** Compares emoji instead of a code. */
export function matrixVerifyEmoji(id: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => verifyByEmoji(it.state, id));
}

/** Their code, photographed: checked, and its secret sent back. */
export function matrixVerifyScan(id: string, bytes: Uint8Array): Promise<void> {
  const it = need();
  return changeAccount(it, () => scanCode(it.state, id, bytes));
}

/** They photographed our code: their app said it went well, or not. */
export function matrixVerifyScanned(id: string, ok: boolean): Promise<void> {
  const it = need();
  return changeAccount(it, () => confirmScanned(it.state, id, ok));
}

export function matrixVerifyCancel(id: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => cancelVerification(it.state, id));
}

/** Whether the account has a Security Key, and a phrase that makes it. */
export function matrixRecoveryInfo(): Promise<{ storage: boolean; phrase: boolean }> {
  return recoveryInfo(need().state);
}

/** Opens the account's secret storage and key backup with its Security Key or phrase. */
export function matrixUnlock(words: string): Promise<Unlocked> {
  const it = need();
  return changeAccount(it, () => unlockRecovery(it.state, words));
}

/** Sets up a Security Key and key backup for an account with none. Answers the key, to write down. */
export function matrixSetUpRecovery(): Promise<string> {
  const it = need();
  return changeAccount(it, () => setUpRecovery(it.state));
}

