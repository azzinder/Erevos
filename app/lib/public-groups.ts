import type { FileRef } from '../lock/attachment-files';
import { cleanName } from '../lock/e2e-data';
import { checkedAbout, type About, type Group, type GroupData, type GroupMessage, type GroupParts } from '../lock/group-data';
import {
  MAX_ASKING,
  MAX_EPOCHS,
  MAX_NAMES,
  type Asked,
  type Asking,
  type BanKept,
  type DoorKept,
  type Epoch,
  type PublicData,
  type PublicGroup,
  type Waiting,
} from '../lock/public-group-data';
import type { FileOffer } from './attachments';
import * as core from './core';
import { fromBase64, fromHex, randomBytes, toBase64, toHex, utf8Decode } from './crypto';
import { fromBase64Url, toBase64Url } from './e2e';
import type { Marked } from './group-parts';
import { cleanGroupName } from './group-signal';
import { Groups, type GroupTransport, type Me } from './groups';
import { mark, t } from './i18n';
import {
  decodeAnswer,
  decodeMod,
  decodeRequest,
  decodeRules,
  encodeAnswer,
  encodeMod,
  encodePublicAbout,
  encodeRequest,
  encodeRules,
  isAnswer,
  joinLink,
  laterMark,
  marked,
  mergeMarks,
  MAX_DELETED,
  MAX_WAITING,
  MOST_MEMBERS,
  NO_RULES,
  parseJoinLink,
  publicName,
  readPublicAbout,
  type Door,
  type JoinLink,
  type Mod,
  type PublicAbout,
  type Rules,
} from './public-rules';
import { isQueueNotFound } from './relay';

// Public groups (docs/public-groups.md): groups anyone with the link can ask to join, kept as
// lib/groups.ts keeps every group, with more to them here. The phone that made one owns it: it is
// the group's keeper, the one member whose commits count, and keeps the rules in the group itself
// (lib/public-rules.ts). Its door is a queue of its own on its relay, which requests to join come
// to, sealed to a key only it has; it lets them in, or tells the admins, when it is on.
//
// Each member signs there with a key made for that group alone, and says it as its id, so what a
// member says in one public group does not tell who it is anywhere else. Admins moderate with
// steps said in the group (`Mod`): each phone takes a step if its sender was an admin in the epoch
// it was written in, so every phone reaches the same, whatever order they come in. The owner's
// phone takes out of the group whoever an admin takes out or bans, and every phone sends them
// nothing more as soon as it hears.

// The sender id inside the seal to a door: not used, the request says who asks.
const NO_SENDER = new Uint8Array(24);
// Requests taken from a door at each look, at most: the rest wait for the next.
const DOOR_BATCH = 20;

/** Where public groups' doors are: queues on this phone's relay, and a link's door wherever it is. */
export type DoorPlace = {
  /** Makes a queue on this phone's relay for a door: its relay, that relay's key, and the queue's ids, hex. */
  open(): Promise<{ relay: string; relayKey: string; recipient: string; sender: string }>;
  /** Deletes a door's queue: requests to its link find none from then on. */
  close(door: DoorKept): Promise<void>;
  /** The oldest request in a door, taken from it, or null when none waits. */
  take(door: DoorKept): Promise<Uint8Array | null>;
  /** Leaves a request in a link's door. Throws as the relay does: the queue is not found once the link changed. */
  knock(link: JoinLink, sealed: Uint8Array): Promise<void>;
};

/** A member of a public group as its screens show it. */
export type PublicMember = { leaf: number; key: string; name: string; me: boolean; role: 'owner' | 'admin' | 'member'; muted: boolean };

/** A public group as its screens show it: its link, who this phone is there, and what waits for an admin. */
export type PublicInfo = {
  /** Empty until the owner's phone made the door. */
  link: string;
  approve: boolean;
  me: string;
  owner: boolean;
  admin: boolean;
  muted: boolean;
  /** Who asks to join and waits for an admin's yes. */
  waiting: Asked[];
  bans: Asked[];
};

// A member as the MLS state has it, with the key it signs with and what it says about itself.
type Seat = { leaf: number; key: string; about: PublicAbout | null; me: boolean };

const fresh = (id: string, me: string): PublicGroup => ({
  id,
  me,
  door: null,
  link: '',
  approve: false,
  waiting: [],
  asked: [],
  mutes: [],
  bans: [],
  outs: [],
  deleted: [],
  epochs: [],
  names: {},
});

const ruleDoor = (door: DoorKept): Door => ({ door: door.sender, relay: door.relay, relayKey: door.relayKey, key: door.key });

const lastEpoch = (kept: PublicGroup): Epoch | null => kept.epochs[kept.epochs.length - 1] ?? null;

const trimNames = (names: Record<string, string>) => Object.fromEntries(Object.entries(names).slice(-MAX_NAMES));

export class PublicGroups extends Groups {
  private pub: PublicData;
  private readonly pubStore: (data: PublicData) => Promise<void>;
  private readonly doors: DoorPlace;
  private looking: Promise<number> | null = null;

  constructor(
    data: GroupData,
    store: (data: GroupData) => Promise<void>,
    me: () => Promise<Me>,
    pub: PublicData,
    pubStore: (data: PublicData) => Promise<void>,
    doors: DoorPlace,
  ) {
    super(data, store, me);
    this.pub = pub;
    this.pubStore = pubStore;
    this.doors = doors;
  }

  private record(id: string): PublicGroup | undefined {
    return this.pub.groups.find((g) => g.id === id);
  }

  private async keep(pub: PublicData) {
    this.pub = pub;
    await this.pubStore(pub);
  }

  private async keepGroup(group: PublicGroup) {
    const groups = this.pub.groups.filter((g) => g.id !== group.id);
    await this.keep({ ...this.pub, groups: [...groups, group] });
  }

  /** Whether a group is a public one. */
  isPublic(id: string): boolean {
    return this.record(id) !== undefined;
  }

  /** Whether this phone owns a public group it is still in: only then has it doors to look at. */
  ownsDoors(): boolean {
    return this.pub.groups.some((g) => this.find(g.id)?.admin === true && this.find(g.id)?.status === 'in');
  }

  /** The requests to join this phone sent, still waiting for an answer. */
  asking(): Asking[] {
    return this.pub.asking;
  }

  /** Forgets a request to join: an answer to it, if one comes, is not taken. */
  stopAsking(group: string): Promise<void> {
    return this.run(async () => {
      await this.keep({ ...this.pub, asking: this.pub.asking.filter((a) => a.group !== group) });
      this.changed();
    });
  }

  /** A member's name in a public group: the one it chose, with the start of its key. */
  nameIn(id: string, key: string): string {
    return publicName(this.record(id)?.names[key] ?? '', key);
  }

  /** A member's name in whichever public group has its key, or null when none has: each key is made for one group. */
  nameOf(key: string): string | null {
    const group = this.pub.groups.find((g) => key in g.names);
    return group ? publicName(group.names[key], key) : null;
  }

  // What this phone says about itself in a public group: where it is reached, as in every group,
  // with the key made for this group as its id, and the name it chose. After `state`, which makes
  // the seal.
  private async aboutAs(key: string, name: string): Promise<PublicAbout> {
    const me = await this.me();
    const seal = toBase64Url(await core.sealPublic(fromBase64(this.data.seal)));
    return { ...me, id: key, seal, name: cleanName(name) };
  }

  private async seats(id: string): Promise<Seat[]> {
    const json = JSON.parse(utf8Decode(await core.group.members(this.kept(), fromHex(id)))) as {
      own: number;
      members: { leaf: number; about: string; key: string }[];
    };
    return json.members.map((m) => ({ leaf: m.leaf, key: m.key, about: readPublicAbout(m.about), me: m.leaf === json.own }));
  }

  /** A public group's members, with who owns it and who are its admins. */
  async publicMembers(id: string): Promise<PublicMember[]> {
    const kept = this.record(id);
    if (!kept || this.find(id)?.status === 'out' || !this.data.state) return [];
    const epoch = lastEpoch(kept);
    return (await this.seats(id)).map((s) => ({
      leaf: s.leaf,
      key: s.key,
      name: s.about?.name ?? kept.names[s.key] ?? '',
      me: s.me,
      role: s.key === epoch?.keeper ? 'owner' : epoch?.admins.includes(s.key) ? 'admin' : 'member',
      muted: marked(kept.mutes, s.key),
    }));
  }

  /** A public group's link, and what this phone may do there. Null for a group that is not public. */
  publicInfo(id: string): PublicInfo | null {
    const kept = this.record(id);
    const group = this.find(id);
    if (!kept || !group) return null;
    const epoch = lastEpoch(kept);
    const owner = group.admin && group.status === 'in';
    const admin = owner || (group.status === 'in' && (epoch?.admins.includes(kept.me) ?? false));
    const link = parseJoinLink(kept.link);
    return {
      // The group's name now, which may have changed since the link was made.
      link: link ? joinLink({ ...link, name: group.name }) : '',
      approve: kept.approve,
      me: kept.me,
      owner,
      admin,
      muted: marked(kept.mutes, kept.me),
      waiting: owner ? kept.waiting.map(({ key, name, at }) => ({ key, name, at })) : admin ? kept.asked : [],
      bans: kept.bans.filter((b) => b.on).map((b) => ({ key: b.key, name: b.name || kept.names[b.key] || '', at: b.at })),
    };
  }

  /**
   * Makes a public group named `name`, with this phone as its owner, called `myName` there, and a
   * door on this phone's relay for its link. With `approve`, an admin lets in each who asks.
   * Returns its id.
   */
  createPublic(name: string, myName: string, approve: boolean, transport: GroupTransport): Promise<string> {
    return this.run(async () => {
      const clean = cleanGroupName(name);
      if (!clean) throw new Error(t('Give the group a name.'));
      if (!cleanName(myName)) throw new Error(t('Choose the name the group sees.'));
      const door = await this.makeDoor();
      const signer = await core.publicGroup.newSigner(await this.state());
      const key = toHex(signer.key);
      const about = await this.aboutAs(key, myName);
      const rules: Rules = { ...NO_RULES, approve, door: ruleDoor(door) };
      const made = await core.publicGroup.create(signer.state, signer.key, encodePublicAbout(about), encodeRules(rules));
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
      await this.keepGroup({ ...fresh(id, key), door, approve, names: { [key]: about.name } });
      await this.refresh(id, transport);
      return id;
    });
  }

  // A door: a queue on this phone's relay, and the secret requests to it are sealed to.
  private async makeDoor(): Promise<DoorKept> {
    const queue = await this.doors.open();
    const secret = randomBytes(32);
    return { ...queue, secret: toBase64(secret), key: toBase64Url(await core.sealPublic(secret)) };
  }

  /**
   * Asks to join a public group by its link, called `name` there. Its owner's phone answers when it
   * is on: the group shows here once it lets this phone in.
   */
  ask(link: JoinLink, name: string): Promise<void> {
    return this.run(async () => {
      const group = this.find(link.group);
      if (group && group.status !== 'out') throw new Error(t('You are in this group already.'));
      const chosen = cleanName(name);
      if (!chosen) throw new Error(t('Choose the name the group sees.'));
      const signer = await core.publicGroup.newSigner(await this.state());
      const key = toHex(signer.key);
      const made = await core.publicGroup.keyPackage(signer.state, signer.key, encodePublicAbout(await this.aboutAs(key, chosen)));
      const sealed = await core.relaySeal(fromBase64Url(link.key), NO_SENDER, encodeRequest(link.group, made.keyPackage));
      // Kept first: the welcome needs what made the key package.
      await this.save({ ...this.data, state: toBase64(made.state) });
      try {
        await this.doors.knock(link, sealed);
      } catch (error) {
        if (isQueueNotFound(error)) throw new Error(t('This link no longer works. Ask someone in the group for the new one.'));
        throw error;
      }
      const asking: Asking = { group: link.group, door: link.door, key, name: chosen, title: link.name, at: Date.now() };
      await this.keep({ ...this.pub, asking: [...this.pub.asking.filter((a) => a.group !== link.group), asking].slice(-MAX_ASKING) });
      this.changed();
    });
  }

  /**
   * Takes the requests waiting at the doors of the public groups this phone owns, and answers each,
   * or keeps it for an admin. Makes a door for a group that has none, as after it was handed over.
   * Says how many it took.
   */
  lookAtDoors(transport: GroupTransport): Promise<number> {
    this.looking ??= this.lookLocked(transport).finally(() => {
      this.looking = null;
    });
    return this.looking;
  }

  private async lookLocked(transport: GroupTransport): Promise<number> {
    let took = 0;
    for (const { id } of [...this.pub.groups]) {
      const group = this.find(id);
      if (!group?.admin || group.status !== 'in') continue;
      if (!this.record(id)?.door) {
        await this.run(() => this.openDoor(id, transport)).catch(() => undefined);
        continue;
      }
      for (let i = 0; i < DOOR_BATCH; i++) {
        const door = this.record(id)?.door;
        if (!door) break;
        let request: Uint8Array | null;
        try {
          request = await this.doors.take(door);
        } catch (error) {
          // The relay forgot the door: a new one, and so a new link.
          if (isQueueNotFound(error)) await this.run(() => this.openDoor(id, transport)).catch(() => undefined);
          break;
        }
        if (!request) break;
        const taken = request;
        took++;
        await this.run(() => this.request(id, taken, transport)).catch(() => undefined);
      }
    }
    return took;
  }

  // A new door for a group this phone owns, said in the group's rules; the old one is deleted.
  private async openDoor(id: string, transport: GroupTransport) {
    const kept = this.record(id);
    if (!kept || !this.find(id)?.admin) return;
    const door = await this.makeDoor();
    await this.keepGroup({ ...kept, door });
    await this.commitPublic(id, transport, { rules: { door: ruleDoor(door) } });
    if (kept.door) await this.doors.close(kept.door).catch(() => undefined);
  }

  // A request from the door, on the owner's phone: let in, kept for an admin, or turned away.
  private async request(id: string, sealed: Uint8Array, transport: GroupTransport) {
    const kept = this.record(id);
    if (!kept?.door || !this.find(id)?.admin) return;
    let asked: ReturnType<typeof decodeRequest>;
    try {
      asked = decodeRequest((await core.sealOpen(fromBase64(kept.door.secret), sealed)).message);
    } catch {
      return;
    }
    if (!asked || asked.group !== id) return;
    let about: PublicAbout | null;
    let key: string;
    try {
      const read = await core.publicGroup.packageAbout(asked.keyPackage);
      about = readPublicAbout(read.about);
      key = toHex(read.key);
    } catch {
      return;
    }
    // It says its own key as its id, so what it says in the group is its own.
    const plain = about && checkedAbout(about);
    if (!about || !plain || about.id !== key) return;
    if (this.banned(kept, plain)) return this.answer(id, plain, 'no', transport);
    if ((await this.seats(id)).some((s) => s.key === key)) return;
    const waiting: Waiting = { key, name: about.name, about: plain, keyPackage: toBase64(asked.keyPackage), at: Date.now() };
    if (!kept.approve) return this.admit(id, waiting, transport);
    if (kept.waiting.some((w) => w.key === key)) return;
    if (kept.waiting.length >= MAX_WAITING) return this.answer(id, plain, 'no', transport);
    await this.keepGroup({ ...kept, waiting: [...kept.waiting, waiting] });
    await this.say(id, { do: 'asks', key, name: about.name, at: waiting.at }, transport, true);
    this.changed();
  }

  private banned(kept: PublicGroup, about: About): boolean {
    return kept.bans.some((b) => b.on && (b.key === about.id || b.sender === about.sender || b.seal === about.seal));
  }

  // The owner's answer that is not a welcome, sealed for the one who asked.
  private async answer(id: string, to: About, kind: 'no' | 'full', transport: GroupTransport) {
    await this.deliver(id, [{ leaf: -1, about: to, me: false }], encodeAnswer({ group: id, kind }), transport, true);
  }

  // Lets one who asked in. A phone that asks again while still in (its group forgotten there) comes
  // in anew, in place of the one it was.
  private async admit(id: string, come: Waiting, transport: GroupTransport) {
    const seats = await this.seats(id);
    const again = seats.filter((s) => !s.me && s.about?.sender === come.about.sender && s.about.seal === come.about.seal).map((s) => s.leaf);
    if (seats.length - again.length >= MOST_MEMBERS) return this.answer(id, come.about, 'full', transport);
    await this.commitPublic(id, transport, { add: [come], remove: again });
  }

  // The owner's one commit: lets in `add`, takes out `remove` and whoever was taken out or banned,
  // and puts the rules as this phone has them, with `rules` over them, in the group; with `keeper`,
  // the group goes to that leaf. The welcome goes first, then the commit to everyone who was in,
  // those taken out too, so their phones know.
  private async commitPublic(id: string, transport: GroupTransport, change: { add?: Waiting[]; remove?: number[]; rules?: Partial<Rules>; keeper?: number } = {}) {
    const kept = this.record(id)!;
    const ruled = await core.publicGroup.rules(this.kept(), fromHex(id));
    const now = decodeRules(ruled.rules) ?? NO_RULES;
    const rules: Rules = { ...now, mutes: kept.mutes, bans: kept.bans.map(({ name: _, ...ban }) => ban), ...change.rules };
    const seats = await this.seats(id);
    const gone = new Set([...kept.outs, ...kept.bans.filter((b) => b.on).map((b) => b.key)]);
    const remove = [...new Set([...(change.remove ?? []), ...seats.filter((s) => !s.me && gone.has(s.key)).map((s) => s.leaf)])];
    const add = change.add ?? [];
    const before = await this.membersIn(id);
    const made = await core.publicGroup.commit(
      this.kept(),
      fromHex(id),
      add.map((w) => fromBase64(w.keyPackage)),
      remove,
      { keeper: change.keeper ?? ruled.keeper, rules: encodeRules(rules) },
    );
    await this.save({ ...this.data, state: toBase64(made.state) });
    const name = this.find(id)!.name;
    for (const w of add) {
      await this.deliver(id, [{ leaf: -1, about: w.about, me: false }], encodeAnswer({ group: id, kind: 'welcome', name, welcome: made.welcome }), transport, true);
    }
    await this.deliver(id, before, made.commit, transport, true);
    const after = new Set((await this.seats(id)).map((s) => s.key));
    for (const w of add) if (after.has(w.key)) await this.note(id, 'joined', w.key);
    // Those an admin took out have a note of that already.
    for (const s of seats) if (!after.has(s.key) && !gone.has(s.key)) await this.note(id, 'left', s.key);
    await this.refresh(id, transport);
  }

  // What the group's rules say now, kept here: who owns it and who are its admins in this epoch,
  // its link, and its mutes and bans folded into what this phone has. Notes who became what. The
  // owner's phone makes a door for a group that has none; one that no longer owns it deletes its own.
  private async refresh(id: string, transport: GroupTransport, ruled?: core.PublicRules) {
    const kept = this.record(id);
    const group = this.find(id);
    if (!kept || !group || group.status === 'out') return;
    const now = ruled ?? (await core.publicGroup.rules(this.kept(), fromHex(id)));
    const rules = decodeRules(now.rules) ?? NO_RULES;
    const seats = await this.seats(id);
    const keeper = seats.find((s) => s.leaf === now.keeper)?.key ?? '';
    const epoch: Epoch = { epoch: now.epoch, keeper, admins: rules.admins };
    const last = lastEpoch(kept);
    const keys = new Set(seats.map((s) => s.key));
    const names = { ...kept.names };
    for (const s of seats) if (s.about) names[s.key] = s.about.name;
    const named = (ban: Rules['bans'][number]): BanKept => ({ ...ban, name: kept.bans.find((b) => b.key === ban.key)?.name || names[ban.key] || '' });
    await this.keepGroup({
      ...kept,
      link: rules.door ? joinLink({ ...rules.door, group: id, name: group.name }) : '',
      approve: rules.approve,
      mutes: mergeMarks(kept.mutes, rules.mutes),
      bans: mergeMarks(kept.bans, rules.bans.map(named)),
      outs: kept.outs.filter((key) => keys.has(key)),
      asked: kept.asked.filter((a) => !keys.has(a.key)),
      waiting: kept.waiting.filter((w) => !keys.has(w.key)),
      epochs: last?.epoch === epoch.epoch ? [...kept.epochs.slice(0, -1), epoch] : [...kept.epochs, epoch].slice(-MAX_EPOCHS),
      names: trimNames(names),
    });
    if (last) {
      if (keeper && last.keeper !== keeper) await this.note(id, 'owns the group', keeper);
      for (const key of epoch.admins) if (!last.admins.includes(key) && key !== last.keeper) await this.note(id, 'is an admin', key);
      for (const key of last.admins) if (!epoch.admins.includes(key) && key !== keeper && keys.has(key)) await this.note(id, 'is not an admin', key);
    }
    const owner = seats.some((s) => s.me && s.leaf === now.keeper);
    if (group.admin !== owner) await this.save(this.withGroup({ ...this.find(id)!, admin: owner }));
    const door = this.record(id)!.door;
    if (owner && !door) await this.openDoor(id, transport).catch(() => undefined);
    if (!owner && door) {
      // Handed over: the new owner's phone makes a door of its own.
      await this.doors.close(door).catch(() => undefined);
      await this.keepGroup({ ...this.record(id)!, door: null, waiting: [] });
    }
    this.changed();
  }

  protected async openLocked(message: Uint8Array, transport: GroupTransport): Promise<void> {
    await super.openLocked(message, transport);
    let id: string;
    try {
      id = toHex(await core.group.of(message));
    } catch {
      return;
    }
    const kept = this.record(id);
    if (!kept || !this.data.state || this.find(id)?.status !== 'in') return;
    // A commit moved the group to a new epoch: its rules may have changed.
    const ruled = await core.publicGroup.rules(this.kept(), fromHex(id)).catch(() => null);
    if (ruled && ruled.epoch !== lastEpoch(kept)?.epoch) await this.refresh(id, transport, ruled);
  }

  protected async heard(id: string, opened: { sender: number; about: Uint8Array; text: Uint8Array }, message: Uint8Array, transport: GroupTransport): Promise<boolean> {
    if (!this.record(id)) return false;
    const from = readPublicAbout(opened.about);
    if (!from) return true;
    const at = await core.publicGroup.epoch(message).catch(() => -1);
    // A message that waited for a commit opens before the commit's rules are kept here.
    if (!this.record(id)!.epochs.some((e) => e.epoch === at)) {
      const ruled = await core.publicGroup.rules(this.kept(), fromHex(id)).catch(() => null);
      if (ruled?.epoch === at) await this.refresh(id, transport, ruled);
    }
    const kept = this.record(id)!;
    const epoch = kept.epochs.find((e) => e.epoch === at) ?? null;
    let said: Record<string, unknown>;
    try {
      said = JSON.parse(utf8Decode(opened.text)) as Record<string, unknown>;
    } catch {
      return false;
    }
    if (!said || typeof said !== 'object') return false;
    if (said.t === 'mod') {
      const mod = decodeMod(said);
      if (mod) await this.moderate(id, mod, from.id, epoch, transport);
      return true;
    }
    if (said.t === 'name') {
      // Only the owner names the group.
      const name = typeof said.name === 'string' ? cleanGroupName(said.name) : '';
      if (epoch?.keeper === from.id && name) {
        await this.save(this.withGroup({ ...this.find(id)!, name }));
        this.changed();
      }
      return true;
    }
    // Nothing from a member who is muted, banned or taken out, nor what was deleted for everyone.
    if (marked(kept.mutes, from.id) || marked(kept.bans, from.id) || kept.outs.includes(from.id)) return true;
    if (typeof said.tag === 'string' && kept.deleted.includes(`${from.id}|${said.tag}`)) return true;
    if (kept.names[from.id] !== from.name) await this.keepGroup({ ...kept, names: trimNames({ ...kept.names, [from.id]: from.name }) });
    return false;
  }

  protected async unsealed(message: Uint8Array, transport: GroupTransport): Promise<boolean> {
    if (!isAnswer(message)) return false;
    const answer = decodeAnswer(message);
    // Only for a group this phone asked to join.
    const asking = answer && this.pub.asking.find((a) => a.group === answer.group);
    if (!answer || !asking) return true;
    const group = this.find(answer.group);
    if (group && group.status !== 'out') return true;
    const rest = this.pub.asking.filter((a) => a !== asking);
    if (answer.kind !== 'welcome') {
      await this.keep({ ...this.pub, asking: rest });
      const text = answer.kind === 'full' ? mark('The group is full: its owner could not let you in.') : mark('Your request to join was turned down.');
      const closed: Group = group ?? { id: answer.group, name: asking.title || 'Group', admin: false, status: 'out', asked: [], later: [], outbox: [], messages: [], readAt: 0 };
      await this.save(this.withGroup({ ...closed, messages: this.trimmed([...closed.messages, { at: Date.now(), from: '', text, tag: '', note: true }]) }));
      this.changed();
      return true;
    }
    let joined: Awaited<ReturnType<typeof core.group.join>>;
    try {
      joined = await core.group.join(this.kept(), answer.welcome);
    } catch {
      return true;
    }
    if (toHex(joined.id) !== answer.group) return true;
    const now: Group = {
      id: answer.group,
      name: answer.name || asking.title || 'Group',
      admin: false,
      status: 'in',
      asked: [],
      later: [],
      outbox: [],
      messages: this.trimmed([...(group?.messages ?? []), { at: Date.now(), from: '', text: mark('You joined the group.'), tag: '', note: true }]),
      readAt: 0,
    };
    await this.save({ ...this.withGroup(now), state: toBase64(joined.state) });
    const old = this.record(answer.group);
    const me = (await this.seats(answer.group)).find((s) => s.me)?.key ?? asking.key;
    await this.keep({ groups: [...this.pub.groups.filter((g) => g.id !== answer.group), { ...fresh(answer.group, me), names: old?.names ?? {} }], asking: rest });
    await this.refresh(answer.group, transport);
    // What came for it before the welcome.
    const orphans = this.data.orphans;
    await this.save({ ...this.data, orphans: [] });
    for (const orphan of orphans) await this.openLocked(fromBase64(orphan), transport);
    return true;
  }

  protected unreached(id: string): Set<string> {
    const kept = this.record(id);
    if (!kept) return new Set();
    return new Set([...kept.outs, ...kept.bans.filter((b) => b.on).map((b) => b.key)]);
  }

  // An admin's step, from the member at `by` (its key), written in `epoch`: taken if it could take
  // it then. Admins moderate members; only the owner moderates admins; nobody moderates the owner.
  private async moderate(id: string, mod: Mod, by: string, epoch: Epoch | null, transport: GroupTransport) {
    const kept = this.record(id);
    if (!kept || !epoch) return;
    const owner = epoch.keeper === by;
    const admin = owner || epoch.admins.includes(by);
    const over = (key: string) => admin && key !== epoch.keeper && (owner || !epoch.admins.includes(key));
    if (mod.do === 'mute') {
      if (!over(mod.key)) return;
      const was = kept.mutes.find((m) => m.key === mod.key);
      const next = laterMark(was, { key: mod.key, on: mod.on, at: mod.at, by });
      if (next === was) return;
      await this.keepGroup({ ...kept, mutes: [...kept.mutes.filter((m) => m !== was), next] });
      await this.note(id, mod.on ? 'muted' : 'unmuted', mod.key);
    } else if (mod.do === 'ban') {
      if (!over(mod.key)) return;
      const was = kept.bans.find((b) => b.key === mod.key);
      const next = laterMark(was, { key: mod.key, on: mod.on, at: mod.at, by, sender: mod.sender, seal: mod.seal, name: mod.name || kept.names[mod.key] || '' });
      if (next === was) return;
      const outs = next.on && !kept.outs.includes(mod.key) ? [...kept.outs, mod.key] : kept.outs;
      await this.keepGroup({ ...kept, bans: [...kept.bans.filter((b) => b !== was), next], outs });
      await this.note(id, mod.on ? 'banned' : 'unbanned', mod.key);
      if (next.on) await this.takenOut(id, mod.key, transport);
    } else if (mod.do === 'out') {
      if (!over(mod.key) || kept.outs.includes(mod.key)) return;
      if (!(await this.seats(id)).some((s) => s.key === mod.key)) return;
      await this.keepGroup({ ...kept, outs: [...kept.outs, mod.key] });
      await this.note(id, 'taken out', mod.key);
      await this.takenOut(id, mod.key, transport);
    } else if (mod.do === 'delete') {
      // Its writer, or an admin over them.
      if (mod.from !== by && !over(mod.from)) return;
      await this.deleteLocked(id, mod.from, mod.tag);
    } else if (mod.do === 'asks') {
      // Only the owner's phone has the door.
      if (!owner || kept.asked.some((a) => a.key === mod.key)) return;
      await this.keepGroup({ ...kept, asked: [...kept.asked, { key: mod.key, name: mod.name, at: mod.at }].slice(-MAX_WAITING) });
      this.changed();
    } else {
      if (!admin) return;
      await this.keepGroup({ ...kept, asked: kept.asked.filter((a) => a.key !== mod.key) });
      if (this.find(id)?.admin) await this.decide(id, mod.key, mod.do === 'let', transport).catch(() => undefined);
      this.changed();
    }
  }

  // On the owner's phone: an admin let in, or turned away, one who waits.
  private async decide(id: string, key: string, yes: boolean, transport: GroupTransport) {
    const kept = this.record(id)!;
    const come = kept.waiting.find((w) => w.key === key);
    if (!come) return;
    await this.keepGroup({ ...kept, waiting: kept.waiting.filter((w) => w !== come) });
    if (yes && !this.banned(kept, come.about)) await this.admit(id, come, transport);
    else await this.answer(id, come.about, 'no', transport);
  }

  // A member an admin took out or banned: this phone sends it nothing more (`unreached`), the
  // owner's phone takes it out of the group, and its own phone closes the group.
  private async takenOut(id: string, key: string, transport: GroupTransport) {
    if (key === this.record(id)?.me) {
      await this.out(id, mark('An admin took you out of the group.'));
      return;
    }
    if (this.find(id)?.admin && (await this.seats(id)).some((s) => s.key === key)) await this.commitPublic(id, transport);
  }

  // A message deleted for everyone, and a note saying so. This phone's own are kept with no sender.
  private async deleteLocked(id: string, from: string, tag: string) {
    const kept = this.record(id)!;
    const group = this.find(id);
    if (!group) return;
    const sender = from === kept.me ? '' : from;
    const gone = (m: GroupMessage) => !m.note && m.tag === tag && m.from === sender;
    await this.keepGroup({ ...kept, deleted: [...kept.deleted.filter((d) => d !== `${from}|${tag}`), `${from}|${tag}`].slice(-MAX_DELETED) });
    if (!group.messages.some(gone)) return;
    await this.save(this.withGroup({ ...group, messages: group.messages.filter((m) => !gone(m)) }));
    this.changed();
    await this.note(id, mark('A message was deleted for everyone.'));
  }

  // Says an admin's step in the group: to every member, or with `admins` to the owner and the admins only.
  private async say(id: string, mod: Mod, transport: GroupTransport, admins = false) {
    const sealed = await core.group.seal(this.kept(), fromHex(id), encodeMod(mod));
    await this.save({ ...this.data, state: toBase64(sealed.state) });
    const epoch = lastEpoch(this.record(id)!);
    const members = await this.membersIn(id);
    const to = admins ? members.filter((m) => m.about && (m.about.id === epoch?.keeper || epoch?.admins.includes(m.about.id))) : members;
    await this.deliver(id, to, sealed.message, transport);
  }

  // Takes an admin's step on this phone: says it in the group, and takes it here as the others will.
  private async step(id: string, mod: Mod, transport: GroupTransport, admins = false) {
    const kept = this.record(id);
    if (!kept || this.find(id)?.status !== 'in') throw new Error(t('You are not in this group any more.'));
    if (!this.publicInfo(id)?.admin) throw new Error(t('Only the group’s admins do that.'));
    await this.say(id, mod, transport, admins);
    await this.moderate(id, mod, kept.me, lastEpoch(kept), transport);
  }

  // Whether this phone may moderate the member at `key`: an admin, over a member, or the owner, over anyone else.
  private canModerate(id: string, key: string): boolean {
    const kept = this.record(id);
    const info = this.publicInfo(id);
    const epoch = kept && lastEpoch(kept);
    if (!info?.admin || !epoch || key === epoch.keeper || key === kept.me) return false;
    return info.owner || !epoch.admins.includes(key);
  }

  private checkModerate(id: string, key: string) {
    if (!this.canModerate(id, key)) throw new Error(t('Admins moderate members, and only the owner moderates admins.'));
  }

  /** Mutes a member of a public group, or with `on` false lets them write again. */
  mute(id: string, key: string, on: boolean, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      this.checkModerate(id, key);
      await this.step(id, { do: 'mute', key, on, at: Date.now() }, transport);
    });
  }

  /** Takes a member out of a public group: they can ask again through the link. */
  takeOut(id: string, key: string, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      this.checkModerate(id, key);
      await this.step(id, { do: 'out', key, at: Date.now() }, transport);
    });
  }

  /** Bans a member, or with `on` false lifts a ban: a ban takes them out, and turns away what that phone asks after. */
  ban(id: string, key: string, on: boolean, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const kept = this.record(id);
      const seat = on ? (await this.seats(id)).find((s) => s.key === key)?.about : kept?.bans.find((b) => b.key === key);
      if (!kept || !seat) throw new Error(t('That member is not in the group any more.'));
      if (on) this.checkModerate(id, key);
      else if (!this.publicInfo(id)?.admin) throw new Error(t('Only the group’s admins do that.'));
      const name = kept.names[key] ?? '';
      await this.step(id, { do: 'ban', key, sender: seat.sender, seal: seat.seal, name, on, at: Date.now() }, transport);
    });
  }

  /** Deletes a message on every member's phone: an admin's, for a member's message, or the owner's for anyone's. */
  deleteForEveryone(id: string, message: GroupMessage, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const kept = this.record(id);
      if (!kept || message.note || !message.tag) throw new Error(t('That message cannot be deleted for everyone.'));
      const from = message.from || kept.me;
      if (from !== kept.me) this.checkModerate(id, from);
      await this.step(id, { do: 'delete', from, tag: message.tag }, transport);
    });
  }

  /** Lets in, or with `yes` false turns away, one who asks to join and waits for an admin. */
  letIn(id: string, key: string, yes: boolean, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      await this.step(id, { do: yes ? 'let' : 'no', key }, transport, true);
    });
  }

  // The owner's steps: they change the rules, so they go in a commit.
  private async ownerCommit(id: string, transport: GroupTransport, change: { rules?: Partial<Rules>; keeper?: number }) {
    const group = this.find(id);
    if (!this.record(id) || !group?.admin || group.status !== 'in') throw new Error(t('Only the group’s owner does that.'));
    await this.commitPublic(id, transport, change);
  }

  /** Makes a member an admin of a public group this phone owns, or with `on` false no longer one. */
  setAdmin(id: string, key: string, on: boolean, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const kept = this.record(id);
      if (!kept || !(await this.seats(id)).some((s) => s.key === key && !s.me)) throw new Error(t('That member is not in the group any more.'));
      const admins = (lastEpoch(kept)?.admins ?? []).filter((a) => a !== key);
      await this.ownerCommit(id, transport, { rules: { admins: on ? [...admins, key] : admins } });
    });
  }

  /** Whether an admin lets in each who asks to join, in a public group this phone owns. */
  setApprove(id: string, on: boolean, transport: GroupTransport): Promise<void> {
    return this.run(() => this.ownerCommit(id, transport, { rules: { approve: on } }));
  }

  /** Gives a public group this phone owns a new link: the old one stops working. */
  changeLink(id: string, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!this.record(id) || !group?.admin || group.status !== 'in') throw new Error(t('Only the group’s owner does that.'));
      await this.openDoor(id, transport);
    });
  }

  /** Hands a public group this phone owns to another member, who owns it from then on; this phone is an admin there after. */
  handOver(id: string, key: string, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const kept = this.record(id);
      const seat = (await this.seats(id)).find((s) => s.key === key && !s.me);
      if (!kept || !seat) throw new Error(t('That member is not in the group any more.'));
      const admins = (lastEpoch(kept)?.admins ?? []).filter((a) => a !== key && a !== kept.me);
      await this.ownerCommit(id, transport, { keeper: seat.leaf, rules: { admins: [...admins, kept.me] } });
    });
  }

  // A member muted in a public group sends nothing there.
  private mutedHere(id: string): boolean {
    const kept = this.record(id);
    return kept !== undefined && marked(kept.mutes, kept.me);
  }

  send(id: string, text: string, transport: GroupTransport, parts: GroupParts = {}): Promise<void> {
    if (this.mutedHere(id)) return Promise.reject(new Error(t('An admin muted you in this group.')));
    return super.send(id, text, transport, parts);
  }

  sendFile(id: string, ref: FileRef, offer: FileOffer, ms: number | undefined, transport: GroupTransport, parts: GroupParts = {}): Promise<void> {
    if (this.mutedHere(id)) return Promise.reject(new Error(t('An admin muted you in this group.')));
    return super.sendFile(id, ref, offer, ms, transport, parts);
  }

  // Nor a reaction, a vote, a pin or deleting for everyone: the others' phones drop them too.
  mark(id: string, marked: Marked, transport: GroupTransport): Promise<GroupMessage | null> {
    if (this.mutedHere(id)) return Promise.reject(new Error(t('An admin muted you in this group.')));
    return super.mark(id, marked, transport);
  }

  // A public group's members come through its link, not from contacts.
  add(id: string, identities: string[], transport: GroupTransport): Promise<void> {
    if (this.isPublic(id)) return Promise.reject(new Error(t('Share the group’s link to have people join.')));
    return super.add(id, identities, transport);
  }

  // Taking a member out of a public group is an admin's step there.
  remove(id: string, leaf: number, transport: GroupTransport): Promise<void> {
    if (!this.isPublic(id)) return super.remove(id, leaf, transport);
    return this.run(async () => {
      const seat = (await this.seats(id)).find((s) => s.leaf === leaf);
      if (!seat) return;
      this.checkModerate(id, seat.key);
      await this.step(id, { do: 'out', key: seat.key, at: Date.now() }, transport);
    });
  }

  // The owner of a public group leaving closes it for every member, with one commit, and its door.
  leave(id: string, transport: GroupTransport): Promise<void> {
    if (!this.isPublic(id) || !this.find(id)?.admin) return super.leave(id, transport);
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') return;
      const before = await this.membersIn(id);
      const others = before.filter((m) => !m.me).map((m) => m.leaf);
      if (others.length > 0) {
        const made = await core.publicGroup.commit(this.kept(), fromHex(id), [], others);
        await this.save({ ...this.data, state: toBase64(made.state) });
        await this.deliver(id, before, made.commit, transport, true);
      }
      await this.shut(id);
      await this.out(id, mark('You closed the group.'));
    });
  }

  forget(id: string): Promise<void> {
    if (!this.isPublic(id)) return super.forget(id);
    return super.forget(id).then(() =>
      this.run(async () => {
        await this.shut(id);
        await this.keep({ ...this.pub, groups: this.pub.groups.filter((g) => g.id !== id) });
      }),
    );
  }

  // Deletes a group's door, if this phone has one.
  private async shut(id: string) {
    const kept = this.record(id);
    if (!kept?.door) return;
    await this.doors.close(kept.door).catch(() => undefined);
    await this.keepGroup({ ...kept, door: null, waiting: [] });
  }
}
