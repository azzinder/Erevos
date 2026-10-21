import { setHardKey } from './crypto';
import { t } from './i18n';
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
  /** Missing in a build made before conversations were made safe after a restore. */
  conversationRestored?(conversation: Uint8Array): Promise<Uint8Array>;
  packetKind(packet: Uint8Array): Promise<number>;
  firstMessageId(packet: Uint8Array): Promise<Uint8Array>;
  safetyNumber(ours: Uint8Array, theirs: Uint8Array): Promise<string>;
  importChats(name: Uint8Array, data: Uint8Array): Promise<Uint8Array>;
  /** Missing in a build made before two-hop sending. */
  relaySeal?(relayKey: Uint8Array, senderId: Uint8Array, message: Uint8Array): Promise<Uint8Array>;
  sealPublic?(secret: Uint8Array): Promise<Uint8Array>;
  sealOpen?(secret: Uint8Array, sealed: Uint8Array): Promise<Uint8Array>;
  /** Argon2id for keys from passwords (lib/crypto.ts hardKey); `cost` is the memory in KiB and the
   *  passes, 4 bytes each, big-endian. Missing in a build made before it. */
  hardKey?(input: Uint8Array, salt: Uint8Array, cost: Uint8Array): Promise<Uint8Array>;
  /** One byte, 1 when `signature` is the Ed25519 signature of `message` by `key`. Missing in a build made before it. */
  signatureVerify?(key: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<Uint8Array>;
  /** Group chats (crates/erevos-group): missing in a build made before them. */
  groupNew?(about: Uint8Array): Promise<Uint8Array>;
  groupKeyPackage?(state: Uint8Array): Promise<Uint8Array>;
  groupSetAbout?(state: Uint8Array, about: Uint8Array): Promise<Uint8Array>;
  groupCreate?(state: Uint8Array): Promise<Uint8Array>;
  groupAdd?(state: Uint8Array, id: Uint8Array, keyPackage: Uint8Array): Promise<Uint8Array>;
  groupRemove?(state: Uint8Array, id: Uint8Array, leaf: Uint8Array): Promise<Uint8Array>;
  groupCommitPending?(state: Uint8Array, id: Uint8Array): Promise<Uint8Array>;
  groupJoin?(state: Uint8Array, welcome: Uint8Array): Promise<Uint8Array>;
  groupSeal?(state: Uint8Array, id: Uint8Array, text: Uint8Array): Promise<Uint8Array>;
  groupLeave?(state: Uint8Array, id: Uint8Array): Promise<Uint8Array>;
  groupForget?(state: Uint8Array, id: Uint8Array): Promise<Uint8Array>;
  groupMembers?(state: Uint8Array, id: Uint8Array): Promise<Uint8Array>;
  groupOf?(message: Uint8Array): Promise<Uint8Array>;
  groupOpen?(state: Uint8Array, message: Uint8Array): Promise<Uint8Array>;
  /** Public groups (docs/public-groups.md): missing in a build made before them. */
  groupNewSigner?(state: Uint8Array): Promise<Uint8Array>;
  groupKeyPackageAs?(state: Uint8Array, key: Uint8Array, about: Uint8Array): Promise<Uint8Array>;
  groupCreatePublic?(state: Uint8Array, key: Uint8Array, about: Uint8Array, rules: Uint8Array): Promise<Uint8Array>;
  groupRules?(state: Uint8Array, id: Uint8Array): Promise<Uint8Array>;
  groupCommit?(state: Uint8Array, id: Uint8Array, keyPackages: Uint8Array, removes: Uint8Array, rules: Uint8Array): Promise<Uint8Array>;
  groupPackageAbout?(keyPackage: Uint8Array): Promise<Uint8Array>;
  groupEpoch?(message: Uint8Array): Promise<Uint8Array>;
  /** Relay requests through Tor: only in the Android app, and not in a build made before it. Bridges one per line. */
  torStart?(bridges: string): Promise<void>;
  torStatus?(): Promise<string>;
  torStop?(): Promise<void>;
  torRequest?(url: string, token: string, message: Uint8Array): Promise<Uint8Array>;
  torOpen?(url: string, token: string): Promise<Uint8Array>;
  torCall?(id: Uint8Array, message: Uint8Array): Promise<Uint8Array>;
  torClose?(id: Uint8Array): Promise<Uint8Array>;
}

let core: Core | null = null;

export function setCore(next: Core | null): void {
  core = next;
  const hardKey = next?.hardKey?.bind(next);
  setHardKey(
    hardKey
      ? (input, salt, { m, t }) => {
          const cost = new Uint8Array(8);
          const view = new DataView(cost.buffer);
          view.setUint32(0, m);
          view.setUint32(4, t);
          return hardKey(input, salt, cost);
        }
      : null,
  );
}

/** Whether this build has the core, and so can encrypt. */
export function hasCore(): boolean {
  return core !== null;
}

export class NoCoreError extends Error {
  constructor() {
    super(t('This build has no Erevos core, so it cannot encrypt. Rebuild the app.'));
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
  if (out.length !== count || at !== bytes.length) throw new Error(t('The Erevos core gave back something unexpected.'));
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

/** Whether this build can seal a send for a contact's relay (two-hop sending). */
export function canRelaySeal(): boolean {
  return typeof core?.relaySeal === 'function';
}

/** Seals a send for the contact's relay, so this phone's own relay can carry it without reading it. */
export function relaySeal(relayKey: Uint8Array, senderId: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const it = need();
  if (!it.relaySeal) throw new NoCoreError();
  return it.relaySeal(relayKey, senderId, message);
}

/** Whether this build can reach relays through Tor. */
export function canTor(): boolean {
  return typeof core?.torRequest === 'function';
}

/** The core's Tor calls, or an error saying this build has none. */
export function tor(): Required<Pick<Core, 'torStart' | 'torStatus' | 'torStop' | 'torRequest' | 'torOpen' | 'torCall' | 'torClose'>> {
  const it = need();
  if (!it.torStart || !it.torStatus || !it.torStop || !it.torRequest || !it.torOpen || !it.torCall || !it.torClose) {
    throw new Error(t('This build of Erevos has no Tor.'));
  }
  return {
    torStart: it.torStart.bind(it),
    torStatus: it.torStatus.bind(it),
    torStop: it.torStop.bind(it),
    torRequest: it.torRequest.bind(it),
    torOpen: it.torOpen.bind(it),
    torCall: it.torCall.bind(it),
    torClose: it.torClose.bind(it),
  };
}

/** Whether the core can make and open SMS invites (a core from before them cannot). */
export function canSealOpen(): boolean {
  return typeof core?.sealPublic === 'function' && typeof core?.sealOpen === 'function';
}

/** The public key for a 32-byte secret, for others to seal to with `relaySeal`. */
export function sealPublic(secret: Uint8Array): Promise<Uint8Array> {
  const it = need();
  if (!it.sealPublic) throw new NoCoreError();
  return it.sealPublic(secret);
}

/** Opens what `relaySeal` sealed to the public key of `secret`: the sender id, then the message. */
export async function sealOpen(secret: Uint8Array, sealed: Uint8Array): Promise<{ senderId: Uint8Array; message: Uint8Array }> {
  const it = need();
  if (!it.sealOpen) throw new NoCoreError();
  const plain = await it.sealOpen(secret, sealed);
  return { senderId: plain.slice(0, 24), message: plain.slice(24) };
}

/** Whether the core can check Ed25519 signatures (a core from before them cannot). */
export function canVerify(): boolean {
  return typeof core?.signatureVerify === 'function';
}

/** Whether `signature` is the Ed25519 signature of `message` by the 32-byte public key `key`. */
export async function verifySignature(key: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const it = need();
  if (!it.signatureVerify) throw new NoCoreError();
  const answer = await it.signatureVerify(key, message, signature).catch(() => null);
  return answer?.length === 1 && answer[0] === 1;
}

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

/** Whether this build can make a conversation put back from a backup safe to seal in again. */
export function canRestore(): boolean {
  return typeof core?.conversationRestored === 'function';
}

/** A conversation put back from a backup, moved past the message keys it may have used since
 *  that backup was made, so none is used twice. */
export function restored(conversation: Uint8Array): Promise<Uint8Array> {
  const it = need();
  if (!it.conversationRestored) throw new NoCoreError();
  return it.conversationRestored(conversation);
}

/** Throws when the packet is not for this conversation, or was changed. */
export async function open(conversation: Uint8Array, packet: Uint8Array): Promise<Opened> {
  const [next, plaintext] = splitParts(await need().conversationOpen(conversation, packet), 2);
  return { conversation: next, plaintext };
}

/** Whether this build's core reads other messengers' exports: one built before it could not. */
export function canImport(): boolean {
  return typeof core?.importChats === 'function';
}

/** Reads another messenger's export: the chats in it as UTF-8 JSON (lib/imports.ts reads it). */
export const importChats = (name: Uint8Array, data: Uint8Array) => need().importChats(name, data);

/** Whether this build's core has group chats: one built before them has not. */
export function canGroup(): boolean {
  return typeof core?.groupOpen === 'function' && canSealOpen();
}

type GroupCalls = Required<Pick<Core, 'groupNew' | 'groupKeyPackage' | 'groupSetAbout' | 'groupCreate' | 'groupAdd' | 'groupRemove' | 'groupCommitPending' | 'groupJoin' | 'groupSeal' | 'groupLeave' | 'groupForget' | 'groupMembers' | 'groupOf' | 'groupOpen'>>;

function groups(): GroupCalls {
  const it = need();
  if (!canGroup()) throw new NoCoreError();
  return it as GroupCalls;
}

/** What a group message was, once opened (lib/groups.ts). */
export type GroupOpened =
  | { kind: 'message'; group: Uint8Array; sender: number; about: Uint8Array; text: Uint8Array }
  | { kind: 'changed' | 'removed' | 'later'; group: Uint8Array }
  | { kind: 'leaving'; group: Uint8Array; sender: number }
  | { kind: 'nothing' };

const leafBytes = (leaf: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, leaf);
  return bytes;
};

/** A member's MLS state: its signing key, what it says about itself, and its groups. The calls
 *  that change it give it back first. */
export const group = {
  create: async (about: Uint8Array) => groups().groupNew(about),
  keyPackage: async (state: Uint8Array) => {
    const [next, keyPackage] = splitParts(await groups().groupKeyPackage(state), 2);
    return { state: next, keyPackage };
  },
  setAbout: async (state: Uint8Array, about: Uint8Array) => groups().groupSetAbout(state, about),
  newGroup: async (state: Uint8Array) => {
    const [next, id] = splitParts(await groups().groupCreate(state), 2);
    return { state: next, id };
  },
  add: async (state: Uint8Array, id: Uint8Array, keyPackage: Uint8Array) => {
    const [next, commit, welcome] = splitParts(await groups().groupAdd(state, id, keyPackage), 3);
    return { state: next, commit, welcome };
  },
  remove: async (state: Uint8Array, id: Uint8Array, leaf: number) => {
    const [next, commit] = splitParts(await groups().groupRemove(state, id, leafBytes(leaf)), 2);
    return { state: next, commit };
  },
  /** The commit is empty when there is nothing to commit. */
  commitPending: async (state: Uint8Array, id: Uint8Array) => {
    const [next, commit] = splitParts(await groups().groupCommitPending(state, id), 2);
    return { state: next, commit };
  },
  join: async (state: Uint8Array, welcome: Uint8Array) => {
    const [next, id] = splitParts(await groups().groupJoin(state, welcome), 2);
    return { state: next, id };
  },
  seal: async (state: Uint8Array, id: Uint8Array, text: Uint8Array) => {
    const [next, message] = splitParts(await groups().groupSeal(state, id, text), 2);
    return { state: next, message };
  },
  leave: async (state: Uint8Array, id: Uint8Array) => {
    const [next, message] = splitParts(await groups().groupLeave(state, id), 2);
    return { state: next, message };
  },
  forget: async (state: Uint8Array, id: Uint8Array) => groups().groupForget(state, id),
  /** UTF-8 JSON: `{own, members: [{leaf, about}]}`. */
  members: async (state: Uint8Array, id: Uint8Array) => groups().groupMembers(state, id),
  of: async (message: Uint8Array) => groups().groupOf(message),
  open: async (state: Uint8Array, message: Uint8Array): Promise<{ state: Uint8Array; opened: GroupOpened }> => {
    const [next, kind, id, sender, about, text] = splitParts(await groups().groupOpen(state, message), 6);
    const leaf = sender.length === 4 ? new DataView(sender.buffer, sender.byteOffset, 4).getUint32(0) : 0;
    const opened: GroupOpened =
      kind[0] === 1
        ? { kind: 'message', group: id, sender: leaf, about, text }
        : kind[0] === 2
          ? { kind: 'changed', group: id }
          : kind[0] === 3
            ? { kind: 'removed', group: id }
            : kind[0] === 4
              ? { kind: 'leaving', group: id, sender: leaf }
              : kind[0] === 5
                ? { kind: 'later', group: id }
                : { kind: 'nothing' };
    return { state: next, opened };
  },
};

/** Whether this build's core has public groups (docs/public-groups.md): one built before them has not. */
export function canPublicGroup(): boolean {
  return canGroup() && typeof core?.groupCommit === 'function' && typeof core?.groupEpoch === 'function';
}

type PublicCalls = Required<Pick<Core, 'groupNewSigner' | 'groupKeyPackageAs' | 'groupCreatePublic' | 'groupRules' | 'groupCommit' | 'groupPackageAbout' | 'groupEpoch'>>;

function publicCalls(): PublicCalls {
  const it = need();
  if (!canPublicGroup()) throw new NoCoreError();
  return it as PublicCalls;
}

/** Values joined for a call that takes several in one: each a 4-byte big-endian length and its bytes. */
export function joinParts(items: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(items.reduce((sum, item) => sum + 4 + item.length, 0));
  const view = new DataView(out.buffer);
  let at = 0;
  for (const item of items) {
    view.setUint32(at, item.length);
    out.set(item, at + 4);
    at += 4 + item.length;
  }
  return out;
}

const bigEndian = (bytes: Uint8Array) => bytes.reduce((value, byte) => value * 256 + byte, 0);

/** A public group's rules as its group context has them now: its epoch, its keeper's leaf, then the app's rules. */
export type PublicRules = { epoch: number; keeper: number; rules: Uint8Array };

/** A public group's calls (lib/public-groups.ts), on the same state as `group`'s. Those that change it give it back first. */
export const publicGroup = {
  /** A key to sign with in one public group: its public half. */
  newSigner: async (state: Uint8Array) => {
    const [next, key] = splitParts(await publicCalls().groupNewSigner(state), 2);
    return { state: next, key };
  },
  keyPackage: async (state: Uint8Array, key: Uint8Array, about: Uint8Array) => {
    const [next, keyPackage] = splitParts(await publicCalls().groupKeyPackageAs(state, key, about), 2);
    return { state: next, keyPackage };
  },
  create: async (state: Uint8Array, key: Uint8Array, about: Uint8Array, rules: Uint8Array) => {
    const [next, id] = splitParts(await publicCalls().groupCreatePublic(state, key, about, rules), 2);
    return { state: next, id };
  },
  rules: async (state: Uint8Array, id: Uint8Array): Promise<PublicRules> => {
    const [epoch, keeper, rules] = splitParts(await publicCalls().groupRules(state, id), 3);
    return { epoch: bigEndian(epoch), keeper: bigEndian(keeper), rules };
  },
  /**
   * The keeper's one commit: who comes in (key packages), who goes (leaves), and with `rules`, the
   * keeper's leaf and the rules from then on. The welcome is empty when no one comes in.
   */
  commit: async (state: Uint8Array, id: Uint8Array, add: Uint8Array[], remove: number[], rules?: { keeper: number; rules: Uint8Array }) => {
    const leaves = new Uint8Array(remove.length * 4);
    remove.forEach((leaf, i) => new DataView(leaves.buffer).setUint32(i * 4, leaf));
    const ruled = new Uint8Array(rules ? 4 + rules.rules.length : 0);
    if (rules) {
      new DataView(ruled.buffer).setUint32(0, rules.keeper);
      ruled.set(rules.rules, 4);
    }
    const [next, commit, welcome] = splitParts(await publicCalls().groupCommit(state, id, joinParts(add), leaves, ruled), 3);
    return { state: next, commit, welcome };
  },
  /** What a key package says about its member, and the key it signs with. Throws when its signatures do not hold. */
  packageAbout: async (keyPackage: Uint8Array) => {
    const [about, key] = splitParts(await publicCalls().groupPackageAbout(keyPackage), 2);
    return { about, key };
  },
  /** The epoch a group message was sent in. */
  epoch: async (message: Uint8Array) => bigEndian(await publicCalls().groupEpoch(message)),
};
