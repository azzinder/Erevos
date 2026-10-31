// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A small Nostr relay for the checks (checks/nostr-dm.check.ts), as far as lib/nostr-dm-net.ts uses
// one (NIP-01): events kept and given again by filter, then live; OK for each event; EOSE; CLOSE.
// An inbox relay can keep its wraps for their reader only, as NIP-17 asks: it then asks who reads
// (NIP-42 AUTH) and closes a subscription for wraps until it knows.
/// <reference types="node" />
import type { NostrEvent, NostrFilter, NostrLink } from '../lib/nostr-dm-net';

type Connection = { frames: unknown[][]; wake: (() => void) | null; subs: Map<string, NostrFilter[]>; authed: string | null; challenge: string; closed: boolean };

function matches(event: NostrEvent, filter: NostrFilter): boolean {
  const kinds = filter.kinds as number[] | undefined;
  const authors = filter.authors as string[] | undefined;
  const p = filter['#p'] as string[] | undefined;
  if (kinds && !kinds.includes(event.kind)) return false;
  if (authors && !authors.includes(event.pubkey)) return false;
  if (p && !event.tags.some((tag) => tag[0] === 'p' && p.includes(tag[1]))) return false;
  if (typeof filter.since === 'number' && event.created_at < filter.since) return false;
  if (typeof filter.until === 'number' && event.created_at > filter.until) return false;
  return true;
}

export class FakeRelay {
  readonly url: string;
  readonly events: NostrEvent[] = [];
  /** Who said they read, by connection, in order. */
  readonly authed: string[] = [];
  /** Every frame each connection sent, in order. */
  readonly heard: unknown[][] = [];
  connections = 0;
  private readonly live = new Set<Connection>();
  private readonly guarded: boolean;
  private readonly refuses: boolean;

  /** `guarded`: wraps only for who they are for, once they said who they are. `refuses`: takes no event. */
  constructor(url: string, options: { guarded?: boolean; refuses?: boolean } = {}) {
    this.url = url;
    this.guarded = options.guarded ?? false;
    this.refuses = options.refuses ?? false;
  }

  private say(c: Connection, frame: unknown[]): void {
    if (c.closed) return;
    c.frames.push(frame);
    const wake = c.wake;
    c.wake = null;
    wake?.();
  }

  private canRead(c: Connection, filter: NostrFilter): boolean {
    if (!this.guarded) return true;
    const kinds = filter.kinds as number[] | undefined;
    if (!kinds?.includes(1059)) return true;
    const p = filter['#p'] as string[] | undefined;
    return !!c.authed && !!p && p.every((key) => key === c.authed);
  }

  private hear(c: Connection, frame: unknown[]): void {
    this.heard.push(frame);
    const [type, a, ...rest] = frame;
    if (type === 'EVENT') {
      const event = a as NostrEvent;
      if (this.refuses) return this.say(c, ['OK', event.id, false, 'blocked: not here']);
      if (!this.events.some((e) => e.id === event.id)) {
        // A replaceable list or profile: only the newest of each key is kept.
        if (event.kind === 0 || (event.kind >= 10000 && event.kind < 20000)) {
          const older = this.events.findIndex((e) => e.kind === event.kind && e.pubkey === event.pubkey);
          if (older >= 0) this.events.splice(older, 1);
        }
        this.events.push(event);
        for (const other of this.live) {
          for (const [id, filters] of other.subs) {
            if (filters.some((f) => matches(event, f) && this.canRead(other, f))) this.say(other, ['EVENT', id, event]);
          }
        }
      }
      return this.say(c, ['OK', event.id, true, '']);
    }
    if (type === 'REQ') {
      const id = a as string;
      const filters = rest as NostrFilter[];
      if (!filters.every((f) => this.canRead(c, f))) {
        this.say(c, ['AUTH', c.challenge]);
        return this.say(c, ['CLOSED', id, 'auth-required: we only show wraps to whom they are for']);
      }
      c.subs.set(id, filters);
      for (const event of this.events) if (filters.some((f) => matches(event, f))) this.say(c, ['EVENT', id, event]);
      return this.say(c, ['EOSE', id]);
    }
    if (type === 'CLOSE') {
      c.subs.delete(a as string);
      return;
    }
    if (type === 'AUTH') {
      const event = a as NostrEvent;
      const tag = (name: string) => event.tags.find((t) => t[0] === name)?.[1];
      const ok = event.kind === 22242 && tag('challenge') === c.challenge && tag('relay') === this.url;
      if (ok) {
        c.authed = event.pubkey;
        this.authed.push(event.pubkey);
      }
      return this.say(c, ['OK', event.id, ok, ok ? '' : 'auth-required: wrong challenge']);
    }
  }

  /** A new connection to it, as lib/nostr-dm-net.ts opens one. */
  async link(): Promise<NostrLink> {
    this.connections += 1;
    const c: Connection = { frames: [], wake: null, subs: new Map(), authed: null, challenge: `ch${Math.random().toString(36).slice(2)}`, closed: false };
    this.live.add(c);
    return {
      tor: false,
      send: async (frame) => {
        if (c.closed) throw new Error('closed');
        // As over a network: what is sent arrives a moment later.
        setImmediate(() => !c.closed && this.hear(c, JSON.parse(JSON.stringify(frame)) as unknown[]));
      },
      next: async (ms) => {
        if (!c.frames.length && !c.closed) {
          await new Promise<void>((done) => {
            const timer = setTimeout(() => {
              c.wake = null;
              done();
            }, ms);
            c.wake = () => {
              clearTimeout(timer);
              done();
            };
          });
        }
        if (c.frames.length) return c.frames.shift()!;
        if (c.closed) throw new Error('The connection to the Nostr relay ended.');
        return null;
      },
      close: () => {
        c.closed = true;
        this.live.delete(c);
        const wake = c.wake;
        c.wake = null;
        wake?.();
      },
    };
  }

  /** Ends every connection, as a relay that goes away. */
  drop(): void {
    for (const c of this.live) {
      c.closed = true;
      const wake = c.wake;
      c.wake = null;
      wake?.();
    }
    this.live.clear();
  }

  get open(): number {
    return this.live.size;
  }
}
