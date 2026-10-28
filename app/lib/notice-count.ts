import { isNetworkChat } from './network-notices';

// How many messages the Android messages notice says (lib/background.ts), by where they show: kept
// apart from React Native, so the checks run in Node. What came since Erevos last showed counts by
// where it shows (a chat, a group, a chat on another network, a hidden place); with the number on
// the icon, what the open space had not read as Erevos left the screen counts too, by chat and
// group (lib/unread.ts spaceUnreadAt). A message deleted for everyone before it was read, or read on a linked device,
// no longer counts: the count only ever goes down for them, never up.

const add = (map: Map<string, number>, key: string, n: number) => {
  if (n > 0) map.set(key, n);
  else map.delete(key);
};

const sum = (map: ReadonlyMap<string, number>) => [...map.values()].reduce((all, n) => all + n, 0);

const spaceWhere = (where: string) => where.startsWith('chat:') || where.startsWith('group:') || isNetworkChat(where);

export class NoticeCount {
  // What came since Erevos last showed, by where it shows.
  private readonly unseen = new Map<string, number>();
  // What the open space had not read as Erevos left the screen, by chat and group (and network chat).
  private readonly left = new Map<string, number>();
  // The messages counted in `unseen` by their chat and tag: where each was counted.
  private readonly tags = new Map<string, Map<string, string>>();

  total(): number {
    return sum(this.left) + sum(this.unseen);
  }

  /** `times` messages came in `chat`, shown at `where`; `tag` is the one's, when it is one. */
  came(where: string, chat: string, times = 1, tag?: string): void {
    add(this.unseen, where, (this.unseen.get(where) ?? 0) + times);
    if (!tag || times !== 1) return;
    const of = this.tags.get(chat) ?? new Map<string, string>();
    of.set(tag, where);
    this.tags.set(chat, of);
  }

  /** What came at `where` shows on the screen: it no longer counts. Says whether the count changed. */
  seen(where: string): boolean {
    this.forget((at) => at === where);
    return this.unseen.delete(where);
  }

  /** The space shows again: nothing counts. Says whether anything did. */
  clear(): boolean {
    const any = this.unseen.size > 0 || this.left.size > 0;
    this.unseen.clear();
    this.left.clear();
    this.tags.clear();
    return any;
  }

  /** What came in the space's chats and groups, as it counts now: for leave. */
  spaceCounted(): Map<string, number> {
    return new Map([...this.unseen].filter(([where]) => spaceWhere(where)));
  }

  /**
   * Erevos left the screen with `notRead` not read in the space's chats and groups, which counts
   * from now on; of what `counted` (spaceCounted, as Erevos began to leave) says came there, only
   * what is not in it yet counts besides (a voice message whose parts are still coming has no row).
   */
  leave(counted: ReadonlyMap<string, number>, notRead: ReadonlyMap<string, number>): void {
    this.left.clear();
    notRead.forEach((n, where) => add(this.left, where, n));
    counted.forEach((count, where) => add(this.unseen, where, (this.unseen.get(where) ?? 0) - Math.min(count, notRead.get(where) ?? 0)));
    // Which of them still counts by itself is not known now: none is, by its tag.
    this.forget((at) => counted.has(at));
  }

  /** The message `tag` of `chat`, or all its messages (null), went: it no longer counts, where it is known to. Says whether the count changed. */
  gone(chat: string, tag: string | null): boolean {
    const of = this.tags.get(chat);
    if (!of) return false;
    const went = tag === null ? [...of.values()] : of.has(tag) ? [of.get(tag)!] : [];
    if (tag === null) of.clear();
    else of.delete(tag);
    if (of.size === 0) this.tags.delete(chat);
    went.forEach((where) => add(this.unseen, where, (this.unseen.get(where) ?? 0) - 1));
    return went.length > 0;
  }

  /** Whether anything counts at any of `where`. */
  counts(where: readonly string[]): boolean {
    return where.some((at) => this.unseen.has(at) || this.left.has(at));
  }

  /**
   * The space's chats and groups `where` have `notRead` not read now, after a message there went
   * or was read on a linked device: each counts no more than that. Says whether the count changed.
   */
  readNow(where: readonly string[], notRead: ReadonlyMap<string, number>): boolean {
    let changed = false;
    for (const at of where) {
      const now = notRead.get(at) ?? 0;
      const left = this.left.get(at) ?? 0;
      const unseen = this.unseen.get(at) ?? 0;
      const keptLeft = Math.min(left, now);
      const keptUnseen = Math.min(unseen, Math.max(0, now - keptLeft));
      add(this.left, at, keptLeft);
      add(this.unseen, at, keptUnseen);
      if (keptUnseen < unseen) this.forget((of) => of === at);
      changed ||= keptLeft < left || keptUnseen < unseen;
    }
    return changed;
  }

  private forget(where: (at: string) => boolean) {
    for (const [chat, of] of this.tags) {
      for (const [tag, at] of of) if (where(at)) of.delete(tag);
      if (of.size === 0) this.tags.delete(chat);
    }
  }
}

const readListeners = new Set<(where: string[]) => void>();

/** Says that the open space's chats or groups `where` (`chat:` and its identity, `group:` and its id) were read on a linked device or the phone (lib/devices.ts). */
export function readElsewhere(where: string[]): void {
  readListeners.forEach((listener) => listener(where));
}

/** Calls `listener` with the chats and groups read elsewhere. Returns how to stop. */
export function onReadElsewhere(listener: (where: string[]) => void): () => void {
  readListeners.add(listener);
  return () => {
    readListeners.delete(listener);
  };
}
