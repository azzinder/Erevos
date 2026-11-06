// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { change, emptyLog, setPeers, type Change, type Log } from './log';
import { asking, have, heard, push, upTo, type Said } from './wire';

// The account's log on one device, between its links (lib/devices.ts) and its file
// (lock/sync-data.ts): one after another, what another device said of the log is taken and
// answered, and what changed here is written and told. Who this device is, which device is the
// primary and which are the account's devices now, the links say (`who`), each time: once that
// changes (a new endpoint, a device linked or unlinked) the log follows, and a device whose own id
// changed starts a new log, to take the whole of it from the others. Nothing here knows how what is
// said goes: `send` seals it in that device's link. Self-contained, so it runs under plain Node.

export type Who = { me: string; primary: string; peers: string[] };

export type SyncIo = {
  load(): Promise<Log | null>;
  save(log: Log | null): Promise<void>;
  /** Says it to that device, in its link; never waits for it to go. */
  send(to: string, said: Said): void;
  /** Who is who now; null while this side cannot take part (no endpoint yet, or not linked). */
  who(): Who | null;
};

export class SyncLinks {
  private log: Log | null | undefined;
  // What was given each device since it last said how far it is, so nothing goes to it twice.
  private readonly given = new Map<string, Record<string, number>>();
  private turn: Promise<unknown> = Promise.resolve();
  private readonly io: SyncIo;
  private readonly now: () => number;

  constructor(io: SyncIo, now: () => number = Date.now) {
    this.io = io;
    this.now = now;
  }

  private run<T>(work: () => Promise<T>): Promise<T> {
    const next = this.turn.then(work);
    this.turn = next.catch(() => undefined);
    return next;
  }

  // The log as it is for who is who now, or null while this side takes no part.
  private async ready(): Promise<Log | null> {
    const who = this.io.who();
    if (!who) return null;
    if (this.log === undefined) this.log = await this.io.load().catch(() => null);
    let log = this.log;
    if (!log || log.me !== who.me || log.primary !== who.primary) {
      log = emptyLog(who.me, who.primary);
      this.log = log;
    }
    const peers = [...new Set([who.primary, who.me, ...who.peers])].sort();
    if (JSON.stringify([...log.peers].sort()) !== JSON.stringify(peers)) {
      setPeers(log, peers, this.now());
      await this.io.save(log);
    }
    return log;
  }

  /** What another of the account's devices said of the log: taken, kept, answered. */
  heard(from: string, said: unknown): Promise<void> {
    return this.run(async () => {
      const log = await this.ready();
      if (!log) return;
      const back = heard(log, from, said, this.now());
      // What it said it has is known now: what was given it before, it said it has or lacks.
      if (typeof said === 'object' && said !== null && (said as { k?: unknown }).k === 'have') this.given.delete(from);
      await this.io.save(log);
      for (const s of back) this.io.send(from, s);
    });
  }

  /** Writes what changed here and tells the other devices: true when anything was written. */
  write(changes: readonly Change[]): Promise<boolean> {
    return this.writeFrom(() => changes);
  }

  /** Writes what `changesOf` says is to change, worked out on the log as it is, in the same turn. */
  writeFrom(changesOf: (log: Log) => readonly Change[]): Promise<boolean> {
    return this.run(async () => {
      const log = await this.ready();
      if (!log) return false;
      let wrote = false;
      for (const c of changesOf(log)) if (change(log, this.now(), c)) wrote = true;
      if (!wrote) return false;
      await this.io.save(log);
      this.give(log);
      return true;
    });
  }

  /** Asks each other device that may lack this one's ops how far it is: now and then, as nothing thanks for them. */
  ask(): Promise<void> {
    return this.run(async () => {
      const log = await this.ready();
      if (!log) return;
      // And one never heard from: it may hold ops this one lacks, as a device put back with none.
      for (const p of log.peers) if (p !== log.me && (asking(log, p) || log.seen[p] === undefined)) this.io.send(p, have(log, true));
    });
  }

  /** Lets go of the log, as this device is unlinked: a later link starts a new one. */
  forget(): Promise<void> {
    return this.run(async () => {
      this.log = null;
      await this.io.save(null);
    });
  }

  /** The log as it is now, for what reads it; null while this side takes no part. */
  read(): Promise<Log | null> {
    return this.run(() => this.ready());
  }

  // Gives each other device what it lacks of the log, as far as this one knows.
  private give(log: Log): void {
    for (const p of log.peers) {
      if (p === log.me) continue;
      for (const said of push(log, p, this.given.get(p))) {
        this.io.send(p, said);
        this.given.set(p, upTo(this.given.get(p), said.k === 'ops' ? vectorOf(said.ops) : said.k === 'whole' ? said.vv : {}));
      }
    }
  }
}

function vectorOf(ops: readonly { d: string; s: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const op of ops) out[op.d] = Math.max(out[op.d] ?? 0, op.s);
  return out;
}
