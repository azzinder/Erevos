import { deleteChunks, type FileRef } from '../lock/attachment-files';
import {
  checkedAbout,
  EMPTY_GROUPS,
  MAX_GIVEN,
  MAX_GROUP_MESSAGES,
  MAX_LATER,
  MAX_ORPHANS,
  MAX_OUTBOX,
  type About,
  type Group,
  type GroupData,
  type GroupMessage,
  type GroupParts,
} from '../lock/group-data';
import { newTag } from '../lock/history';
import { offerRef, readOffer, type FileFrom, type FileOffer } from './attachments';
import * as core from './core';
import { fromBase64, fromHex, randomBytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
import { fromBase64Url, toBase64Url } from './e2e';
import { decodeGroupCall, type GroupCallSignal } from './group-call-signal';
import { groupPartsOf, markedOf, withMarked, type Marked } from './group-parts';
import { cleanGroupName, isGroupId, type GroupSignal } from './group-signal';
import { t, mark } from './i18n';
import type { GroupAsk } from './link-wire';
import { moderated } from './public-rules';
import { MAX_VOICE_MS } from './voice';

// Group chats, MLS (RFC 9420) in the Rust core (crates/erevos-group). Whoever makes a group is its
// admin: it adds contacts and takes members out, and is the only one whose changes count, so no
// server has to put them in order. To add a contact, the admin asks for a key package in their
// own chat; the contact's phone answers with one; the admin sends the welcome that joins the
// group, in that chat too. From then on everything goes as group messages: each one sealed by MLS
// for the whole group, and sealed again for each member (with the key it says about itself), so
// what reaches each member's queue looks like nothing the others get, and no relay can tell who is
// in a group. Each goes straight to each member's queue on its relay (through this phone's own),
// like a message to a contact, whether or not the two are contacts.
//
// A member leaves by asking the admin, who takes it out. A member taken out reads nothing sent
// after. A message from a member that comes before the admin's change it was written after waits
// here (`later`) until the change comes.
//
// Photos, files and voice messages go as with a contact (lib/attachments.ts): encrypted with a key
// of their own and put on the sender's relay, and only where they are and the key go in the
// group's message. Each member takes them from there (lib/group-media.ts) and leaves them for the
// others, so they expire on the relay after 14 days. A member who joins later reads none of what
// came before, its files neither. A phone from before these reads nothing in such a message (a kind
// it does not know) and goes on with the next. When a message leaves the group here, however it
// goes, its chunks on this phone go too.
//
// Replies, stickers, places, polls, link previews and forwarding ride in a message's own fields,
// and reactions, votes, pins and deleting for everyone are kinds of their own (lib/group-parts.ts):
// a phone from before shows the words and leaves the rest.
//
// Every call runs after the one before it ends, as in lib/e2e.ts, and the MLS state is kept before
// anything it made is handed back.
//
// On a device linked to the phone that holds the account (lib/devices.ts), the groups here are the
// phone's, kept as it says them (`mirror`), and what is done in one, the phone does (`GroupLink`):
// this device has no MLS state of its own, and makes and joins no group.

/** The start of a group message, after which comes the message sealed for its member. A chat's
 *  packets start with 1 then 1 or 2 (crates/erevos-core). */
const GROUP_PACKET = [1, 3];
// The sender id inside the per-member seal: not used, the MLS message says who sent it.
const NO_SENDER = new Uint8Array(24);
/** The longest text sent in a group. */
export const MAX_GROUP_TEXT = 4000;

/** How group messages leave this phone: to a member's queue, and to a contact inside their chat. */
export type GroupTransport = {
  post(to: About, packet: Uint8Array): Promise<void>;
  signal(identity: string, signal: GroupSignal): Promise<void>;
};

/** Where this phone's group messages come to, and who it is: what it says about itself, but the seal key. */
export type Me = Omit<About, 'seal'>;

export type GroupMember = { leaf: number; about: About | null; me: boolean };

/** On a linked device (lib/devices.ts): how the groups here are the phone's. */
export type GroupLink = {
  /** Whether the groups here are the phone's now. */
  through(): boolean;
  /** Has the phone do something in a group. */
  ask(id: string, ask: GroupAsk): Promise<void>;
  /** A group's members, as the phone said them. */
  members(id: string): GroupMember[];
  /** Says a photo, file or voice message of a group was taken here from where it waited. */
  took(from: FileFrom): void;
};

/** A group as the screens show it. */
export type GroupInfo = Pick<Group, 'id' | 'name' | 'admin' | 'status'> & {
  last: GroupMessage | null;
  unread: number;
  /** Contacts asked to join who have not answered yet. */
  asked: string[];
};

// What members say inside the group's messages. A `file` with `ms` is a voice message's sound.
type Said =
  | ({ t: 'text'; text: string; tag: string } & GroupParts)
  | { t: 'name'; name: string }
  | { t: 'call'; call: GroupCallSignal }
  | ({ t: 'file'; file: FileOffer; tag: string; ms?: number } & GroupParts)
  | Marked;

function encodeSaid(said: Said): Uint8Array {
  return utf8Encode(JSON.stringify(said));
}

function decodeSaid(bytes: Uint8Array): Said | null {
  try {
    const v = JSON.parse(utf8Decode(bytes)) as Record<string, unknown>;
    if (v.t === 'text' && typeof v.text === 'string' && v.text.length > 0) {
      return { t: 'text', text: v.text.slice(0, MAX_GROUP_TEXT), tag: typeof v.tag === 'string' ? v.tag : '', ...groupPartsOf(v, true) };
    }
    if (v.t === 'name' && typeof v.name === 'string') return { t: 'name', name: cleanGroupName(v.name) };
    if (v.t === 'call') {
      const call = decodeGroupCall(v.call);
      if (call) return { t: 'call', call };
    }
    if (v.t === 'file') {
      const file = readOffer(v.file);
      const voice = file?.kind === 'file' && typeof v.ms === 'number' && v.ms > 0 && v.ms <= MAX_VOICE_MS + 5000;
      if (file) return { t: 'file', file, tag: typeof v.tag === 'string' ? v.tag : '', ...(voice ? { ms: Math.round(v.ms as number) } : {}), ...groupPartsOf(v, false) };
    }
    const marked = markedOf(v);
    if (marked) return marked;
  } catch {
    // Not what an Erevos says.
  }
  return null;
}

function aboutOf(bytes: Uint8Array | string): About | null {
  try {
    return checkedAbout(JSON.parse(typeof bytes === 'string' ? bytes : utf8Decode(bytes)));
  } catch {
    return null;
  }
}

/** Whether a packet from the relay is a group message. */
export function isGroupPacket(packet: Uint8Array): boolean {
  return packet.length > 2 && packet[0] === GROUP_PACKET[0] && packet[1] === GROUP_PACKET[1];
}

// Public groups (lib/public-groups.ts) are these groups with more to them: what they need here is
// `protected` rather than private, and the three hooks below `messages` do nothing for the rest.
export class Groups {
  protected data: GroupData;
  private readonly store: (data: GroupData) => Promise<void>;
  protected readonly me: () => Promise<Me>;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<() => void>();
  private readonly callListeners = new Set<(group: string, from: string, signal: GroupCallSignal) => void>();
  private readonly messageListeners = new Set<(group: string) => void>();
  private link: GroupLink | null = null;

  constructor(data: GroupData, store: (data: GroupData) => Promise<void>, me: () => Promise<Me>) {
    this.data = data;
    this.store = store;
    this.me = me;
  }

  /** Calls `listener` each time a group, or its messages, change. Returns how to stop. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Calls `listener` with each group call signal for this phone, and who in which group said it. */
  onCall(listener: (group: string, from: string, signal: GroupCallSignal) => void): () => void {
    this.callListeners.add(listener);
    return () => {
      this.callListeners.delete(listener);
    };
  }

  /** Calls `listener` with the group each time a member's message comes in one. Returns how to stop. */
  onMessage(listener: (group: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  protected changed() {
    this.listeners.forEach((listener) => listener());
  }

  /** How the groups here are the phone's, on a linked device (lib/devices.ts), or none. */
  useLink(link: GroupLink | null): void {
    this.link = link;
  }

  // The link, while the groups here are the phone's.
  private through(): GroupLink | null {
    return this.link?.through() ? this.link : null;
  }

  /** Every group as kept, with its messages. */
  all(): readonly Group[] {
    return this.data.groups;
  }

  /** On a linked device: the groups as the phone said them, made by `update` from those here, with the groups where a member's message came. */
  mirror(update: (groups: Group[]) => { groups: Group[]; came: string[] }): Promise<void> {
    return this.run(async () => {
      const { groups, came } = update(this.data.groups);
      await this.save({ ...this.data, groups });
      this.changed();
      for (const id of came) this.messageListeners.forEach((listener) => listener(id));
    });
  }

  protected run<T>(call: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(call);
    this.queue = next;
    return next;
  }

  // The chunks of a file whose message left go once the groups without it are kept.
  protected async save(data: GroupData): Promise<void> {
    const kept = new Set(filesIn(data).map((file) => file.id));
    const gone = filesIn(this.data).filter((file) => !kept.has(file.id));
    this.data = data;
    await this.store(data);
    for (const file of gone) await deleteChunks(file.id, file.count).catch(() => undefined);
  }

  protected find(id: string): Group | undefined {
    return this.data.groups.find((g) => g.id === id);
  }

  protected withGroup(group: Group): GroupData {
    const at = this.data.groups.findIndex((g) => g.id === group.id);
    const groups = [...this.data.groups];
    if (at < 0) groups.push(group);
    else groups[at] = group;
    return { ...this.data, groups };
  }

  // The MLS state, made the first time, saying where this phone's group messages come to now.
  protected async state(): Promise<Uint8Array> {
    if (this.through()) throw new Error(t('Make or join groups on the phone that holds this account.'));
    const me = await this.me();
    let seal = this.data.seal ? fromBase64(this.data.seal) : null;
    if (!seal) seal = randomBytes(32);
    const about = utf8Encode(JSON.stringify({ ...me, seal: toBase64Url(await core.sealPublic(seal)) } satisfies About));
    const state = this.data.state ? await core.group.setAbout(fromBase64(this.data.state), about) : await core.group.create(about);
    await this.save({ ...this.data, state: toBase64(state), seal: toBase64(seal) });
    return state;
  }

  protected kept(): Uint8Array {
    if (!this.data.state) throw new Error(t('No groups here yet.'));
    return fromBase64(this.data.state);
  }

  /** The groups, latest moved first. */
  list(): GroupInfo[] {
    return this.data.groups
      .map((g) => {
        const last = g.messages[g.messages.length - 1] ?? null;
        const unread = g.messages.filter((m) => m.from && !m.note && m.at > g.readAt).length;
        return { id: g.id, name: g.name, admin: g.admin, status: g.status, last, unread, asked: g.asked };
      })
      .sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0));
  }

  /** A group's messages, oldest first. */
  messages(id: string): GroupMessage[] {
    return this.find(id)?.messages ?? [];
  }

  /** A group message just opened, before anything of it shows: true when it was taken here, or is not to show. */
  protected async heard(_id: string, _opened: { sender: number; about: Uint8Array; text: Uint8Array }, _message: Uint8Array, _transport: GroupTransport): Promise<boolean> {
    return false;
  }

  /** What was sealed for this phone and is not a group message: true when it was taken here. */
  protected async unsealed(_message: Uint8Array, _transport: GroupTransport): Promise<boolean> {
    return false;
  }

  /** The members of a group, by identity, whose phones are sent nothing more. */
  protected unreached(_id: string): Set<string> {
    return new Set();
  }

  /** A group's members as its MLS state has them; none once out of it. */
  async members(id: string): Promise<GroupMember[]> {
    const link = this.through();
    if (link) return link.members(id);
    const group = this.find(id);
    if (!group || group.status === 'out' || !this.data.state) return [];
    return this.membersIn(id);
  }

  protected async membersIn(id: string): Promise<GroupMember[]> {
    const json = JSON.parse(utf8Decode(await core.group.members(this.kept(), fromHex(id)))) as {
      own: number;
      members: { leaf: number; about: string }[];
    };
    return json.members.map((m) => ({ leaf: m.leaf, about: aboutOf(m.about), me: m.leaf === json.own }));
  }

  /** Marks a group read up to now. */
  markRead(id: string): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group) return;
      const unread = group.messages.some((m) => m.from && !m.note && m.at > group.readAt);
      await this.save(this.withGroup({ ...group, readAt: Date.now() }));
      this.changed();
      // On a linked device, read on the phone too.
      if (unread) await this.through()?.ask(id, { t: 'read' });
    });
  }

  /** Makes a group named `name` and asks each contact (by identity) to join. Returns its id. */
  create(name: string, identities: string[], transport: GroupTransport): Promise<string> {
    return this.run(async () => {
      const clean = cleanGroupName(name);
      if (!clean) throw new Error(t('Give the group a name.'));
      const made = await core.group.newGroup(await this.state());
      const id = toHex(made.id);
      const group: Group = {
        id,
        name: clean,
        admin: true,
        status: 'in',
        asked: [],
        later: [],
        outbox: [],
        messages: [{ at: Date.now(), from: '', text: mark('You made the group.'), tag: '', note: true }],
        readAt: Date.now(),
      };
      await this.save({ ...this.withGroup(group), state: toBase64(made.state) });
      this.changed();
      await this.askLocked(id, identities, transport);
      return id;
    });
  }

  /** Asks more contacts to join a group this phone is the admin of. */
  add(id: string, identities: string[], transport: GroupTransport): Promise<void> {
    return this.run(() => this.askLocked(id, identities, transport));
  }

  private async askLocked(id: string, identities: string[], transport: GroupTransport) {
    const group = this.find(id);
    if (!group?.admin || group.status !== 'in') throw new Error(t('Only the group’s admin adds members.'));
    const fresh = identities.filter((identity) => !group.asked.includes(identity));
    const link = this.through();
    if (link) {
      if (fresh.length > 0) await link.ask(id, { t: 'add', identities: fresh });
      return;
    }
    await this.save(this.withGroup({ ...group, asked: [...group.asked, ...fresh] }));
    this.changed();
    for (const identity of fresh) await transport.signal(identity, { group: id, kind: 'ask' });
  }

  /** Sends a message to the group, with what it is or carries beyond its words (`parts`); with `tag`, the one a linked device kept it by. */
  send(id: string, text: string, transport: GroupTransport, parts: GroupParts = {}, tag = newTag()): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') throw new Error(t('You are not in this group any more.'));
      const said = text.trim().slice(0, MAX_GROUP_TEXT);
      if (!said) return;
      const carried = groupPartsOf(parts, true);
      const link = this.through();
      if (link) await link.ask(id, { t: 'text', text: said, tag, ...(Object.keys(carried).length > 0 ? { parts: carried } : {}) });
      else await this.broadcast(id, encodeSaid({ t: 'text', text: said, tag, ...carried }), transport);
      const now = this.find(id)!;
      await this.save(this.withGroup({ ...now, messages: this.trimmed([...now.messages, { at: Date.now(), from: '', text: said, tag, ...carried }]), readAt: Date.now() }));
      this.changed();
    });
  }

  /**
   * Says something of a message, for every member: our reaction, a pin, our vote, or deleting our
   * own. Returns the message as it was, or null when it changes nothing.
   */
  mark(id: string, marked: Marked, transport: GroupTransport): Promise<GroupMessage | null> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') throw new Error(t('You are not in this group any more.'));
      const before = group.messages.find((m) => !m.note && m.tag === marked.tag) ?? null;
      if (!withMarked(group.messages, '', marked, Date.now())) return null;
      const link = this.through();
      if (link) await link.ask(id, { t: 'mark', marked });
      else await this.broadcast(id, encodeSaid(marked), transport);
      const now = this.find(id)!;
      const messages = withMarked(now.messages, '', marked, Date.now());
      if (messages) await this.save(this.withGroup({ ...now, messages }));
      this.changed();
      return before;
    });
  }

  /** Stars a message, or takes the star off, on this phone only. */
  star(id: string, tag: string, on: boolean): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || !tag) return;
      const messages = group.messages.map((m) => {
        if (m.note || m.tag !== tag) return m;
        const next: GroupMessage = { ...m, starred: true };
        if (!on) delete next.starred;
        return next;
      });
      await this.save(this.withGroup({ ...group, messages }));
      this.changed();
    });
  }

  /** Deletes a message on this phone only; the members keep theirs. */
  deleteHere(id: string, tag: string): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || !tag) return;
      await this.save(this.withGroup({ ...group, messages: group.messages.filter((m) => m.note || m.tag !== tag) }));
      this.changed();
    });
  }

  /**
   * Sends a photo or file, or with `ms` a voice message, to the group: `offer` says where it is on
   * our relay and its key, and `ref` where it is kept here. With `parts`, what it answers, or that
   * it is forwarded; with `tag`, the one a linked device kept it by. Where it is on our relay is
   * kept, to take it off when it is deleted for everyone.
   */
  sendFile(id: string, ref: FileRef, offer: FileOffer, ms: number | undefined, transport: GroupTransport, parts: GroupParts = {}, tag = newTag()): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') throw new Error(t('You are not in this group any more.'));
      const voice = ms === undefined ? {} : { ms: Math.round(ms) };
      const carried = groupPartsOf(parts, false);
      const link = this.through();
      if (link) await link.ask(id, { t: 'file', file: offer, tag, ...voice, ...(Object.keys(carried).length > 0 ? { parts: carried } : {}) });
      else await this.broadcast(id, encodeSaid({ t: 'file', file: offer, tag, ...voice, ...carried }), transport);
      const now = this.find(id)!;
      const kept = { at: Date.now(), from: '', text: '', tag, file: ref, ...voice, ...carried, put: offer.ids };
      await this.save(this.withGroup({ ...now, messages: this.trimmed([...now.messages, kept]), readAt: Date.now() }));
      this.changed();
    });
  }

  /** Keeps where a file that came is, once it is taken from the relay. False if its message is gone. */
  setFile(id: string, file: FileRef): Promise<boolean> {
    return this.run(async () => {
      const group = this.find(id);
      const was = group?.messages.find((m) => m.file?.id === file.id)?.file;
      if (!group || !was) return false;
      await this.save(this.withGroup({ ...group, messages: group.messages.map((m) => (m.file?.id === file.id ? { ...m, file } : m)) }));
      this.changed();
      // On a linked device the phone hears of it: a copy it put on the relay for this device goes then.
      if (was.from) this.through()?.took(was.from);
      return true;
    });
  }

  /** Says something about a group call: to the member `signal.to` names, or else to every member. */
  call(id: string, signal: GroupCallSignal, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      if (this.through()) throw new Error(t('Group calls ring on the phone that holds this account, for now. Call from there.'));
      if (this.find(id)?.status !== 'in') throw new Error(t('You are not in this group any more.'));
      const sealed = await core.group.seal(this.kept(), fromHex(id), encodeSaid({ t: 'call', call: signal }));
      await this.save({ ...this.data, state: toBase64(sealed.state) });
      const members = await this.membersIn(id);
      const to = 'to' in signal ? members.filter((m) => m.about?.id === signal.to) : members;
      // Only `start` and `leave` are worth sending again later: the rest is stale by then.
      if (signal.kind === 'start' || signal.kind === 'leave') await this.deliver(id, to, sealed.message, transport);
      else {
        for (const member of to) {
          if (member.me || !member.about) continue;
          await transport.post(member.about, await this.sealFor(member.about, sealed.message)).catch(() => undefined);
        }
      }
    });
  }

  /** Keeps a line in a group, such as how a call went. */
  line(id: string, text: string): Promise<void> {
    return this.run(() => this.note(id, text));
  }

  /** Renames a group this phone is the admin of, for every member. */
  rename(id: string, name: string, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group?.admin || group.status !== 'in') throw new Error(t('Only the group’s admin renames it.'));
      const clean = cleanGroupName(name);
      if (!clean) throw new Error(t('Give the group a name.'));
      const link = this.through();
      if (link) return link.ask(id, { t: 'name', name: clean });
      await this.broadcast(id, encodeSaid({ t: 'name', name: clean }), transport);
      await this.save(this.withGroup({ ...this.find(id)!, name: clean }));
      this.changed();
    });
  }

  /** Takes a member out of a group this phone is the admin of. */
  remove(id: string, leaf: number, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group?.admin || group.status !== 'in') throw new Error(t('Only the group’s admin takes members out.'));
      const link = this.through();
      if (link) return link.ask(id, { t: 'remove', leaf });
      const before = await this.membersIn(id);
      const removed = await core.group.remove(this.kept(), fromHex(id), leaf);
      await this.save({ ...this.data, state: toBase64(removed.state) });
      // Everyone who was in, the member taken out too, so its phone knows.
      await this.deliver(id, before, removed.commit, transport);
      const gone = before.find((m) => m.leaf === leaf)?.about?.id ?? '';
      await this.note(id, 'left', gone);
    });
  }

  /** Asks the admin to take this phone out of a group; the admin forgets it here once out. */
  leave(id: string, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') return;
      const link = this.through();
      if (link) return link.ask(id, { t: 'leave' });
      if (group.admin) {
        // The admin cannot be taken out by anyone: the group ends for every member.
        const before = await this.membersIn(id);
        for (const member of before.filter((m) => !m.me)) {
          const removed = await core.group.remove(this.kept(), fromHex(id), member.leaf);
          await this.save({ ...this.data, state: toBase64(removed.state) });
          await this.deliver(id, await this.membersIn(id).then((now) => [...now, member]), removed.commit, transport);
        }
        await this.out(id, mark('You closed the group.'));
        return;
      }
      const left = await core.group.leave(this.kept(), fromHex(id));
      await this.save({ ...this.withGroup({ ...group, status: 'leaving' }), state: toBase64(left.state) });
      await this.deliver(id, await this.membersIn(id), left.message, transport);
      await this.note(id, mark('You asked to leave. The group closes here once the admin takes you out.'));
    });
  }

  /** Forgets a group on this phone, with its messages. */
  forget(id: string): Promise<void> {
    return this.run(async () => {
      // On a linked device the phone forgets it too: else it would say it again.
      await this.through()?.ask(id, { t: 'forget' });
      if (this.data.state) {
        const state = await core.group.forget(this.kept(), fromHex(id));
        this.data = { ...this.data, state: toBase64(state) };
      }
      await this.save({ ...this.data, groups: this.data.groups.filter((g) => g.id !== id) });
      this.changed();
    });
  }

  /** Tries again what the relay did not take. */
  flush(transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      for (const group of this.data.groups) {
        if (group.outbox.length === 0) continue;
        const left: Group['outbox'] = [];
        for (const item of group.outbox) {
          try {
            await transport.post(item.to, fromBase64(item.packet));
          } catch {
            left.push(item);
          }
        }
        if (left.length !== group.outbox.length) await this.save(this.withGroup({ ...this.find(group.id)!, outbox: left }));
      }
    });
  }

  // Seals `text` for the group and sends it to every other member.
  private async broadcast(id: string, text: Uint8Array, transport: GroupTransport) {
    const sealed = await core.group.seal(this.kept(), fromHex(id), text);
    await this.save({ ...this.data, state: toBase64(sealed.state) });
    await this.deliver(id, await this.membersIn(id), sealed.message, transport);
  }

  // Sends one MLS message to each of `members` but this phone, sealed for each, and with `all`
  // those sent nothing more too. What the relay does not take waits in the group's outbox.
  protected async deliver(id: string, members: GroupMember[], message: Uint8Array, transport: GroupTransport, all = false) {
    const failed: Group['outbox'] = [];
    const skip = all ? new Set<string>() : this.unreached(id);
    for (const member of members) {
      if (member.me || !member.about || skip.has(member.about.id)) continue;
      const packet = await this.sealFor(member.about, message);
      try {
        await transport.post(member.about, packet);
      } catch {
        failed.push({ to: member.about, packet: toBase64(packet) });
      }
    }
    const group = this.find(id);
    if (failed.length > 0 && group) await this.save(this.withGroup({ ...group, outbox: [...group.outbox, ...failed].slice(-MAX_OUTBOX) }));
  }

  private async sealFor(about: About, message: Uint8Array): Promise<Uint8Array> {
    const sealed = await core.relaySeal(fromBase64Url(about.seal), NO_SENDER, message);
    const packet = new Uint8Array(2 + sealed.length);
    packet.set(GROUP_PACKET, 0);
    packet.set(sealed, 2);
    return packet;
  }

  protected trimmed(messages: GroupMessage[]): GroupMessage[] {
    return messages.slice(-MAX_GROUP_MESSAGES);
  }

  // Adds a note to a group: who joined or left (by identity), or a text of its own.
  protected async note(id: string, what: string, who?: string) {
    const group = this.find(id);
    if (!group || who === '') return;
    const text = who === undefined ? what : `${who}|${what}`;
    await this.save(this.withGroup({ ...group, messages: this.trimmed([...group.messages, { at: Date.now(), from: '', text, tag: '', note: true }]) }));
    this.changed();
  }

  protected async out(id: string, text: string) {
    const group = this.find(id);
    if (!group) return;
    if (this.data.state) {
      const state = await core.group.forget(this.kept(), fromHex(id));
      this.data = { ...this.data, state: toBase64(state) };
    }
    await this.save(this.withGroup({ ...group, status: 'out', asked: [], later: [], outbox: [] }));
    await this.note(id, text);
  }

  /**
   * A group signal from a contact's chat. `request`: they are a message request, and get nothing.
   */
  signal(identity: string, signal: GroupSignal, request: boolean, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      if (request) return;
      if (signal.kind === 'ask') {
        const given = `${signal.group}:${identity}`;
        if (this.find(signal.group) || this.data.given.includes(given) || this.data.given.length >= MAX_GIVEN) return;
        const made = await core.group.keyPackage(await this.state());
        await this.save({ ...this.data, state: toBase64(made.state), given: [...this.data.given, given].slice(-MAX_GIVEN) });
        await transport.signal(identity, { group: signal.group, kind: 'keys', data: made.keyPackage });
        return;
      }
      if (signal.kind === 'keys') {
        const group = this.find(signal.group);
        if (!group?.admin || group.status !== 'in' || !group.asked.includes(identity)) return;
        const before = await this.membersIn(group.id);
        const added = await core.group.add(this.kept(), fromHex(group.id), signal.data);
        await this.save({ ...this.withGroup({ ...group, asked: group.asked.filter((i) => i !== identity) }), state: toBase64(added.state) });
        // The welcome first: whatever the others then write comes after it.
        await transport.signal(identity, { group: group.id, kind: 'welcome', data: added.welcome, name: group.name });
        await this.deliver(group.id, before, added.commit, transport);
        await this.note(group.id, 'joined', identity);
        return;
      }
      // A welcome: only from the contact this phone gave a key package for the group.
      if (this.find(signal.group)?.status === 'in' || !this.data.given.includes(`${signal.group}:${identity}`)) return;
      const joined = await core.group.join(await this.state(), signal.data);
      if (toHex(joined.id) !== signal.group || !isGroupId(signal.group)) return;
      const group: Group = {
        id: signal.group,
        name: signal.name || 'Group',
        admin: false,
        status: 'in',
        asked: [],
        later: [],
        outbox: [],
        messages: [{ at: Date.now(), from: '', text: `${identity}|added you`, tag: '', note: true }],
        readAt: 0,
      };
      await this.save({ ...this.withGroup(group), state: toBase64(joined.state), given: this.data.given.filter((g) => !g.startsWith(`${signal.group}:`)) });
      this.changed();
      // What came for it before the welcome.
      const orphans = this.data.orphans;
      await this.save({ ...this.data, orphans: [] });
      for (const orphan of orphans) await this.openLocked(fromBase64(orphan), transport);
    });
  }

  /** A group message from the relay. Says whether it was one for this phone. */
  receive(packet: Uint8Array, transport: GroupTransport): Promise<boolean> {
    return this.run(async () => {
      if (!isGroupPacket(packet) || !this.data.seal) return false;
      let message: Uint8Array;
      try {
        message = (await core.sealOpen(fromBase64(this.data.seal), packet.slice(2))).message;
      } catch {
        return false;
      }
      if (await this.unsealed(message, transport)) return true;
      await this.openLocked(message, transport);
      return true;
    });
  }

  protected async openLocked(message: Uint8Array, transport: GroupTransport): Promise<void> {
    if (!this.data.state) return;
    let id: string;
    try {
      id = toHex(await core.group.of(message));
    } catch {
      return;
    }
    const group = this.find(id);
    if (!group || group.status === 'out') {
      if (!group) await this.save({ ...this.data, orphans: [...this.data.orphans, toBase64(message)].slice(-MAX_ORPHANS) });
      return;
    }
    const before = await this.membersIn(id).catch(() => [] as GroupMember[]);
    let result: Awaited<ReturnType<typeof core.group.open>>;
    try {
      result = await core.group.open(this.kept(), message);
    } catch {
      // Not from the admin, damaged, or not for this phone: nothing to show.
      return;
    }
    const { opened } = result;
    await this.save({ ...this.data, state: toBase64(result.state) });
    if (opened.kind === 'message') {
      if (await this.heard(id, opened, message, transport)) return;
      const said = decodeSaid(opened.text);
      const from = aboutOf(opened.about)?.id;
      if (!said || !from) return;
      const now = this.find(id)!;
      if (said.t === 'call') {
        const signal = said.call;
        if ('to' in signal && signal.to !== (await this.me()).id) return;
        this.callListeners.forEach((listener) => listener(id, from, signal));
        return;
      }
      if (said.t === 'file') {
        // Not taken yet: where to take it from.
        const media = { file: offerRef(said.file), ...(said.ms === undefined ? {} : { ms: said.ms }) };
        const parts = groupPartsOf(said, false);
        await this.save(this.withGroup({ ...now, messages: this.trimmed([...now.messages, { at: Date.now(), from, text: '', tag: said.tag, ...media, ...parts }]) }));
        this.messageListeners.forEach((listener) => listener(id));
        this.changed();
        return;
      }
      if (said.t === 'react' || said.t === 'pin' || said.t === 'vote' || said.t === 'erase') {
        const messages = withMarked(now.messages, from, said, Date.now());
        if (!messages) return;
        await this.save(this.withGroup({ ...now, messages }));
        this.changed();
        return;
      }
      if (said.t === 'name') {
        // Only the admin names the group.
        if (opened.sender !== 0) return;
        await this.save(this.withGroup({ ...now, name: said.name || now.name }));
      } else {
        const parts = groupPartsOf(said, true);
        await this.save(this.withGroup({ ...now, messages: this.trimmed([...now.messages, { at: Date.now(), from, text: said.text, tag: said.tag, ...parts }]) }));
        this.messageListeners.forEach((listener) => listener(id));
      }
      this.changed();
    } else if (opened.kind === 'later') {
      const now = this.find(id)!;
      await this.save(this.withGroup({ ...now, later: [...now.later, toBase64(message)].slice(-MAX_LATER) }));
    } else if (opened.kind === 'changed') {
      const after = await this.membersIn(id);
      const ids = (list: GroupMember[]) => new Set(list.map((m) => m.about?.id ?? ''));
      const had = ids(before);
      const has = ids(after);
      for (const m of after) if (m.about && !had.has(m.about.id) && !m.me) await this.note(id, 'joined', m.about.id);
      for (const m of before) if (m.about && !has.has(m.about.id)) await this.note(id, 'left', m.about.id);
      // What waited for this change.
      const now = this.find(id)!;
      await this.save(this.withGroup({ ...now, later: [] }));
      for (const waiting of now.later) await this.openLocked(fromBase64(waiting), transport);
    } else if (opened.kind === 'removed') {
      const leaving = this.find(id)?.status === 'leaving';
      // The core forgot the group already.
      await this.save(this.withGroup({ ...this.find(id)!, status: 'out', asked: [], later: [], outbox: [] }));
      await this.note(id, leaving ? mark('You left the group.') : mark('You are no longer in the group.'));
    } else if (opened.kind === 'leaving') {
      const now = this.find(id)!;
      if (!now.admin) return;
      const pending = await core.group.commitPending(this.kept(), fromHex(id));
      await this.save({ ...this.data, state: toBase64(pending.state) });
      if (pending.commit.length === 0) return;
      // Everyone who was in, the member leaving too.
      await this.deliver(id, before, pending.commit, transport);
      const gone = before.find((m) => m.leaf === opened.sender)?.about?.id ?? '';
      await this.note(id, 'left', gone);
    }
  }
}

// Every photo, file and voice message the groups keep.
const filesIn = (data: GroupData): FileRef[] => data.groups.flatMap((g) => g.messages.flatMap((m) => (m.file ? [m.file] : [])));

/** A member's name: the one its chat has here, or the start of its key, as a contact's or a member's. */
export function memberName(identity: string, contacts: { identity: string; name: string }[]): string {
  const contact = contacts.find((c) => c.identity === identity);
  return contact?.name || (contact ? t('contact {id}', { id: identity.slice(0, 8) }) : t('member {id}', { id: identity.slice(0, 8) }));
}

/** A note's text as the group shows it, with `name` giving each identity's name. */
export function noteText(text: string, name: (identity: string) => string): string {
  const bar = text.indexOf('|');
  if (bar !== 64) return t(text);
  const who = name(text.slice(0, 64));
  const what = text.slice(65);
  return what === 'added you' ? t('{who} added you to the group.', { who }) : what === 'joined' ? t('{who} joined.', { who }) : what === 'left' ? t('{who} left.', { who }) : (moderated(who, what) ?? `${who} ${what}`);
}

export { EMPTY_GROUPS };
