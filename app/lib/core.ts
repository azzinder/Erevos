// The Erevos core (Rust, crates/erevos-ffi): PQXDH to start a conversation and the double ratchet
// for every message after it. The app plugs in the core at startup: the Android module
// (modules/erevos-core), or for checks under Node the same core built to WebAssembly. The core
// keeps nothing between calls. What it returns, the app keeps sealed and passes in again.
// Self-contained on purpose, so it can run under plain Node for checks.

/** The core's calls, as both the Android module and the WebAssembly build give them. */
export interface Core {
  accountNew(): Promise<Uint8Array>;
  accountBundle(account: Uint8Array): Promise<Uint8Array>;
  accountIdentity(account: Uint8Array): Promise<Uint8Array>;
  bundleIdentity(bundle: Uint8Array): Promise<Uint8Array>;
  conversationStart(account: Uint8Array, bundle: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array>;
  conversationAccept(account: Uint8Array, packet: Uint8Array): Promise<Uint8Array>;
  conversationSeal(conversation: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array>;
  conversationOpen(conversation: Uint8Array, packet: Uint8Array): Promise<Uint8Array>;
  conversationPeer(conversation: Uint8Array): Promise<Uint8Array>;
  packetKind(packet: Uint8Array): Promise<number>;
  firstMessageId(packet: Uint8Array): Promise<Uint8Array>;
  safetyNumber(ours: Uint8Array, theirs: Uint8Array): Promise<string>;
}

let core: Core | null = null;

export function setCore(next: Core | null): void {
  core = next;
}

/** Whether this build has the core, and so can encrypt. */
export function hasCore(): boolean {
  return core !== null;
}

export class NoCoreError extends Error {
  constructor() {
    super('This build has no Erevos core, so it cannot encrypt. Rebuild the app.');
  }
}

function need(): Core {
  if (!core) throw new NoCoreError();
  return core;
}

/** The values of a call that returns several, each a 4-byte big-endian length and its bytes. */
export function splitParts(bytes: Uint8Array, count: number): Uint8Array[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Uint8Array[] = [];
  let at = 0;
  while (at < bytes.length) {
    if (at + 4 > bytes.length) break;
    const length = view.getUint32(at);
    if (at + 4 + length > bytes.length) break;
    out.push(bytes.slice(at + 4, at + 4 + length));
    at += 4 + length;
  }
  if (out.length !== count || at !== bytes.length) throw new Error('The Erevos core gave back something unexpected.');
  return out;
}

export type Kind = 'first' | 'following' | 'other';

/** A conversation's secret state, and what a call made or opened with it. */
export type Sealed = { conversation: Uint8Array; packet: Uint8Array };
export type Opened = { conversation: Uint8Array; plaintext: Uint8Array };

export const newAccount = () => need().accountNew();
export const accountBundle = (account: Uint8Array) => need().accountBundle(account);
export const accountIdentity = (account: Uint8Array) => need().accountIdentity(account);
/** Checks the signatures of a bundle from a contact link, and returns its identity key. Throws if they do not hold. */
export const bundleIdentity = (bundle: Uint8Array) => need().bundleIdentity(bundle);
export const conversationPeer = (conversation: Uint8Array) => need().conversationPeer(conversation);
export const firstMessageId = (packet: Uint8Array) => need().firstMessageId(packet);
export const safetyNumber = (ours: Uint8Array, theirs: Uint8Array) => need().safetyNumber(ours, theirs);

export async function packetKind(packet: Uint8Array): Promise<Kind> {
  const kind = await need().packetKind(packet);
  return kind === 1 ? 'first' : kind === 2 ? 'following' : 'other';
}

/** Starts a conversation with the account of a bundle: its first packet carries `plaintext`. */
export async function startConversation(account: Uint8Array, bundle: Uint8Array, plaintext: Uint8Array): Promise<Sealed> {
  const [conversation, packet] = splitParts(await need().conversationStart(account, bundle, plaintext), 2);
  return { conversation, packet };
}

/** Opens a first packet sent to this account: the conversation it starts, and its plaintext. */
export async function acceptConversation(account: Uint8Array, packet: Uint8Array): Promise<Opened> {
  const [conversation, plaintext] = splitParts(await need().conversationAccept(account, packet), 2);
  return { conversation, plaintext };
}

export async function seal(conversation: Uint8Array, plaintext: Uint8Array): Promise<Sealed> {
  const [next, packet] = splitParts(await need().conversationSeal(conversation, plaintext), 2);
  return { conversation: next, packet };
}

/** Throws when the packet is not for this conversation, or was changed. */
export async function open(conversation: Uint8Array, packet: Uint8Array): Promise<Opened> {
  const [next, plaintext] = splitParts(await need().conversationOpen(conversation, packet), 2);
  return { conversation: next, plaintext };
}
