import { currentSpace } from '../lock/keys';
import { loadXmpp, saveXmpp } from '../lock/xmpp-data';
import { canXmpp } from './core';
import { t } from './i18n';
import {
  addCallLine,
  addXmppContact,
  declineXmppRequest,
  forgetXmppChat,
  markXmppRead,
  publishOmemo,
  sendKeepAlive,
  sendXmppText,
  signInXmpp,
  signOutXmpp,
  startSession,
  takeStanza,
  XmppConnection,
  XmppError,
  type Taken,
  type XmppState,
} from './xmpp';
import type { connectXmpp, XmppServer } from './xmpp-net';

// The open space's XMPP account as the screens use it (app/xmpp.tsx, app/xmpp-chat.tsx): loaded
// from its sealed value (lock/xmpp-data.ts), connected to its server while the space is open, and
// kept again after each change. Everything that changes the account runs one after another, as
// lib/matrix-store.ts does; what the server sends is read all the while, apart from that.
//
// It runs once something asks for it (runXmpp), and goes on until the space closes or another
// opens: then it disconnects and lets go of the account.

type Live = {
  space: number;
  key: Uint8Array;
  state: XmppState | null;
  loaded: boolean;
  /** What went wrong last, for the screen. */
  problem: string;
  stopped: boolean;
  running: boolean;
  connection: XmppConnection | null;
  queue: Promise<unknown>;
  saving: ReturnType<typeof setTimeout> | null;
};

let live: Live | null = null;
let connect: typeof connectXmpp | undefined;
const listeners = new Set<() => void>();

/** Told each time the account, its contacts or its chats change. */
export function onXmppChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const told = () => listeners.forEach((listener) => listener());

/** For the checks: how the store reaches servers. */
export function setXmppConnect(next: typeof connectXmpp | undefined): void {
  connect = next;
}

/** The open space's account as it is now: null while it loads, or when there is none. */
export function xmppNow(): { loaded: boolean; state: XmppState | null; problem: string; online: boolean } {
  return { loaded: live?.loaded ?? false, state: live?.state ?? null, problem: live?.problem ?? '', online: Boolean(live?.connection?.isOpen) };
}

/** How many messages are not read in the open space's XMPP chats, contact requests counted as one each. */
export function xmppUnread(): number {
  const state = live?.state;
  if (!state) return 0;
  return Object.values(state.chats).reduce((sum, chat) => sum + chat.unread, 0) + state.requests.length;
}

function reason(error: unknown): string {
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
    saveXmpp(it.space, it.key, it.state).catch((error: unknown) => {
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

/** Takes what waits in the connection's inbox. */
function drain(it: Live, connection: XmppConnection): Promise<void> {
  return changeAccount(it, async () => {
    if (!it.state || it.connection !== connection) return;
    const taken: Taken = { chats: [], republish: false };
    for (const stanza of connection.take()) {
      await takeStanza(it.state, connection, stanza, taken).catch(() => undefined);
    }
    if (taken.republish) await publishOmemo(it.state, connection).catch(() => undefined);
  });
}

/** Stays connected while the space is open: connects, waits for the connection to end, and
 *  connects again after a pause that grows while the server cannot be reached. */
async function loop(it: Live): Promise<void> {
  if (it.running) return;
  it.running = true;
  let wait = 2000;
  try {
    while (it.state && stillOpen(it)) {
      const state = it.state;
      try {
        const connection = await XmppConnection.open(state, connect);
        if (!stillOpen(it) || it.state !== state) {
          connection.close();
          continue;
        }
        it.connection = connection;
        await changeAccount(it, () => startSession(state, connection));
        connection.listen(() => void drain(it, connection));
        if (it.problem) it.problem = '';
        told();
        wait = 2000;
        // While it is open: a ping when the server has said nothing for a while, so a connection
        // that died quietly is known.
        while (connection.isOpen && stillOpen(it) && it.state === state) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          if (connection.isOpen && Date.now() - connection.lastHeard > 240_000) {
            await sendKeepAlive(connection).catch(() => connection.close());
          }
        }
        if (connection.error) throw connection.error;
        connection.close();
      } catch (error) {
        it.connection = null;
        // The server no longer takes the password: the account is kept, and asks for it again.
        if (error instanceof XmppError && (error.condition === 'not-authorized' || error.condition === 'conflict')) {
          it.problem = reason(error);
          told();
          return;
        }
        it.problem = reason(error);
        told();
        await new Promise((resolve) => setTimeout(resolve, wait));
        wait = Math.min(wait * 2, 120_000);
      }
    }
  } finally {
    it.connection?.close();
    it.connection = null;
    it.running = false;
    told();
  }
}

/** Loads the open space's account, once, and connects it while the space stays open. */
export function runXmpp(): void {
  if (!canXmpp()) return;
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
  stopXmpp();
  const it: Live = { ...space, state: null, loaded: false, problem: '', stopped: false, running: false, connection: null, queue: Promise.resolve(), saving: null };
  live = it;
  loadXmpp(space.space, space.key)
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

/** Disconnects and lets go of the account, as its space closes. */
export function stopXmpp(): void {
  if (!live) return;
  live.stopped = true;
  live.connection?.close();
  live = null;
  told();
}

function need(): Live & { state: XmppState } {
  if (!live?.state) throw new Error(t('There is no XMPP account in this space.'));
  return live as Live & { state: XmppState };
}

function online(it: Live): XmppConnection {
  if (!it.connection?.isOpen) throw new Error(t('Not connected to the XMPP server yet. Try again in a moment.'));
  return it.connection;
}

/** Signs the open space in to XMPP: `jid` as name@example.org, `server` a host[:port] when its DNS does not say. */
export async function xmppSignIn(jid: string, password: string, server = ''): Promise<void> {
  const it = live;
  if (!it || it.stopped) throw new Error(t('There is no XMPP account in this space.'));
  const given = serverOf(server);
  const { state, connection } = await signInXmpp(jid, password, given, connect);
  connection.close();
  await changeAccount(it, async () => {
    it.state = state;
    it.problem = '';
  });
  await saveXmpp(it.space, it.key, state);
  void loop(it);
}

/** host, host:port or a wss:// address, as written on the sign-in screen. */
export function serverOf(text: string): XmppServer | undefined {
  const given = text.trim();
  if (!given) return undefined;
  if (/^wss:\/\//.test(given)) return { websocket: given };
  const match = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/i.exec(given);
  if (!match) throw new Error(t('Write the server as a name, such as xmpp.example.org, or name:port.'));
  const port = Number(match[2] ?? 5222);
  return { host: match[1], port, tls: port === 5223 || port === 443 ? 'direct' : 'starttls' };
}

/** Signs out, and forgets the account in this space. */
export async function xmppSignOut(): Promise<void> {
  const it: Live = need();
  const state = it.state;
  const connection = it.connection;
  await changeAccount(it, async () => {
    if (state) await signOutXmpp(state, connection);
    it.connection = null;
    it.state = null;
  });
  await saveXmpp(it.space, it.key, null);
}

export function xmppSend(jid: string, text: string): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    await sendXmppText(it.state, online(it), jid, text);
  });
}

/** Writes to a person whose apps have no OMEMO without encryption from now on (or with it again). */
export function xmppSetPlain(jid: string, plain: boolean): Promise<void> {
  const it = need();
  return changeAccount(it, async () => {
    const chat = (it.state.chats[jid] ??= { jid, messages: [], unread: 0, lastAt: 0 });
    chat.plain = plain || undefined;
  });
}

export function xmppRead(jid: string): Promise<void> {
  const it = need();
  if (!it.state.chats[jid]?.unread) return Promise.resolve();
  return changeAccount(it, () => markXmppRead(it.state, it.connection, jid));
}

export function xmppAddContact(jid: string, name?: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => addXmppContact(it.state, online(it), jid, name));
}

export function xmppDecline(jid: string): Promise<void> {
  const it = need();
  return changeAccount(it, () => declineXmppRequest(it.state, online(it), jid));
}

/** The open space's account and its connection, while it is connected: for calls (lib/xmpp-calls.ts). */
export function xmppLink(): { state: XmppState; connection: XmppConnection } | null {
  const it = live;
  return it?.state && it.connection?.isOpen ? { state: it.state, connection: it.connection } : null;
}

/** Keeps a call's line in a chat; one with the same `id` is said again in its place. */
export function xmppCallLine(jid: string, mine: boolean, text: string, id: string, at = Date.now()): Promise<void> {
  const it = live;
  if (!it?.state) return Promise.resolve();
  return changeAccount(it, async () => {
    if (it.state) addCallLine(it.state, jid, mine, text, id, at);
  });
}

export function xmppForgetChat(jid: string): Promise<void> {
  const it = need();
  return changeAccount(it, async () => forgetXmppChat(it.state, jid));
}
