import { loadMatrix, saveMatrix } from '../lock/matrix-data';
import { currentSpace } from '../lock/keys';
import { canMatrix } from './core';
import { t } from './i18n';
import {
  findHomeserver,
  joinRoom,
  leaveRoom,
  markRead,
  MatrixError,
  sendText,
  signIn,
  signOut,
  startChat,
  syncApply,
  syncFetch,
  type MatrixFile,
  type MatrixRoom,
  type MatrixState,
} from './matrix';
import { backUpKeys, recoveryInfo, restoreLocked, setUpRecovery, unlockRecovery, type Unlocked } from './matrix-backup';
import { fetchFile, sendFile, type OutgoingFile } from './matrix-media';
import {
  acceptVerification,
  cancelVerification,
  confirmVerification,
  forgetVerifications,
  onVerificationChange,
  requestVerification,
  verifications,
  type Verification,
} from './matrix-verify';

// The open space's Matrix account as the screens use it (app/matrix.tsx, app/matrix-chat.tsx):
// loaded from its sealed value (lock/matrix-data.ts), synced with its homeserver while it runs,
// and kept again after each change. Everything that changes the account runs one after another;
// a sync waits on the homeserver outside of that, so a message goes out while it waits.
//
// It runs once something asks for it (runMatrix), and goes on until the space closes or another
// opens: then it stops and lets go of the account.

type Live = {
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
};

let live: Live | null = null;
const listeners = new Set<() => void>();

/** Told each time the account, its rooms or their messages change. */
export function onMatrixChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const told = () => listeners.forEach((listener) => listener());
onVerificationChange(told);

/** The open space's account as it is now: null while it loads, or when there is none. */
export function matrixNow(): { loaded: boolean; state: MatrixState | null; problem: string } {
  return { loaded: live?.loaded ?? false, state: live?.state ?? null, problem: live?.problem ?? '' };
}

/** How many messages are not read in the open space's Matrix rooms, invites counted as one each. */
export function matrixUnread(): number {
  const rooms = Object.values(live?.state?.rooms ?? {});
  return rooms.reduce((sum, room) => sum + (room.invitedBy ? 1 : room.unread), 0);
}

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
    saveMatrix(it.space, it.key, it.state).catch((error: unknown) => {
      it.problem = reason(error);
      told();
    });
  }, 500);
}

/** Runs `change` on the account after every change asked for before, then keeps it and tells the screens. */
function changeAccount<T>(it: Live, change: () => Promise<T>): Promise<T> {
  const run = it.queue.catch(() => undefined).then(change);
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
  const it: Live = { ...space, state: null, loaded: false, problem: '', stopped: false, running: false, queue: Promise.resolve(), saving: null, asked: new Set() };
  live = it;
  loadMatrix(space.space, space.key)
    .then((state) => {
      it.state = state;
      it.loaded = true;
      told();
      void loop(it);
    })
    .catch((error: unknown) => {
      it.loaded = true;
      it.problem = reason(error);
      told();
    });
}

/** Stops syncing and lets go of the account, as its space closes. */
export function stopMatrix(): void {
  if (!live) return;
  live.stopped = true;
  if (live.state) forgetVerifications(live.state);
  live = null;
  fetched.clear();
  told();
}

function need(): Live & { state: MatrixState } {
  if (!live?.state) throw new Error(t('There is no Matrix account in this space.'));
  return live as Live & { state: MatrixState };
}

/** Signs the open space in to Matrix: `who` is a Matrix ID, `server` a homeserver when it is not the ID's own. */
export async function matrixSignIn(who: string, password: string, server = ''): Promise<void> {
  const it = live;
  if (!it || it.stopped) throw new Error(t('There is no Matrix account in this space.'));
  try {
    const homeserver = await findHomeserver(server.trim() || who);
    const state = await signIn(homeserver, who, password);
    await changeAccount(it, async () => {
      it.state = state;
      it.problem = '';
    });
    await saveMatrix(it.space, it.key, state);
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
    await signOut(it.state).catch(() => undefined);
  }
  await changeAccount(it, async () => {
    it.state = null;
  });
  await saveMatrix(it.space, it.key, null);
}

export function matrixSend(roomId: string, text: string): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    await sendText(it.state, roomId, text);
  });
}

export function matrixStartChat(userId: string): Promise<MatrixRoom> {
  const it = need();
  return changeAccount(it, () => startChat(it.state, userId));
}

export function matrixJoin(roomId: string): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    await joinRoom(it.state, roomId);
  });
}

export function matrixLeave(roomId: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => leaveRoom(it.state, roomId));
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

/** The open space's checks by emoji (lib/matrix-verify.ts): asked, going on, or just ended. */
export function matrixVerifications(): Verification[] {
  return live?.state ? verifications(live.state) : [];
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

