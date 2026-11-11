// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { CallSignal } from './call-signal';

// One account's calls across its devices (lib/devices.ts, docs/linked-devices.md). The phone that
// holds the account sees every call signal between it and its contacts, and decides here where each
// goes: a contact's call rings on the phone and on every linked device; whichever answers first takes
// it, and the others stop ringing; a linked device's own call goes to the contact as the account's.
// A call's sound and picture then go straight between the contact and the device that has it
// (lib/call.ts), encrypted between them with the key its answer or offer names. That answer or offer
// reaches the contact sealed in the account's own conversation with them, after reaching the phone
// sealed in the device's link, so no one else can put their own key in its place.
//
// Only the phone keeps this, in memory: a call is over in minutes, and one cut short by the phone
// closing ends on the contact's side by itself. Self-contained on purpose, so it can run under
// plain Node for checks.

/** Who has a call: the phone, or a linked device by its id. */
export type Holder = 'phone' | string;

/**
 * What to do with a call signal: seal one for the contact (`contact`, as it came from the device),
 * pass one on to devices as the contact's (`devices`), tell devices it was answered or turned down
 * on another device (`done`), or stop the phone ringing for that reason (`phone`).
 */
export type CallStep =
  | { to: 'contact'; c: string; signal: CallSignal }
  | { to: 'devices'; c: string; ids: string[]; signal: CallSignal }
  | { to: 'done'; ids: string[]; id: string; declined: boolean }
  | { to: 'phone'; id: string; declined: boolean };

// A call the devices know of: with whom, since when, the devices it rings on, and who has it once answered or made.
type Relayed = { id: string; c: string; at: number; ringing: string[]; on: Holder | null };

// How long a call that no one answered is kept, a while past ringing (lib/call.ts rings 45 s), and
// how long one that someone has, at most.
const RINGS = 75_000;
const LASTS = 12 * 60 * 60_000;

export class LinkedCalls {
  private calls: Relayed[] = [];

  private find(c: string, id: string, now: number): Relayed | undefined {
    this.calls = this.calls.filter((r) => now - r.at < (r.on ? LASTS : RINGS));
    return this.calls.find((r) => r.c === c && r.id === id);
  }

  private drop(call: Relayed) {
    this.calls = this.calls.filter((r) => r !== call);
  }

  /** Whether the account has a call, on the phone or on a device, that it took or made through here; but the one `id` names. */
  busy(now = Date.now(), id = ''): boolean {
    this.calls = this.calls.filter((r) => now - r.at < (r.on ? LASTS : RINGS));
    return this.calls.some((r) => r.on !== null && r.id !== id);
  }

  /**
   * A call signal from contact `c`, opened on the phone; `devices`: those linked now, and
   * `phoneBusy`: the phone has a call of its own, so it says the account is busy itself.
   */
  contact(c: string, signal: CallSignal, devices: string[], phoneBusy: boolean, now = Date.now()): CallStep[] {
    const call = this.find(c, signal.id, now);
    if (signal.kind === 'offer') {
      if (call || phoneBusy || this.busy(now) || devices.length === 0) return [];
      this.calls.push({ id: signal.id, c, at: now, ringing: [...devices], on: null });
      return [{ to: 'devices', c, ids: [...devices], signal }];
    }
    if (!call) return [];
    if (signal.kind === 'end') this.drop(call);
    if (call.on === null) return signal.kind === 'end' && call.ringing.length > 0 ? [{ to: 'devices', c, ids: call.ringing, signal }] : [];
    return call.on === 'phone' ? [] : [{ to: 'devices', c, ids: [call.on], signal }];
  }

  /** A call signal device `device` wrote to contact `c`; `phoneBusy` as for `contact`. */
  device(device: string, c: string, signal: CallSignal, phoneBusy: boolean, now = Date.now()): CallStep[] {
    const call = this.find(c, signal.id, now);
    switch (signal.kind) {
      case 'offer':
        if (call) return [];
        if (phoneBusy || this.busy(now)) return [{ to: 'devices', c, ids: [device], signal: { id: signal.id, kind: 'end', reason: 'busy' } }];
        this.calls.push({ id: signal.id, c, at: now, ringing: [], on: device });
        return [{ to: 'contact', c, signal }];
      case 'answer': {
        if (call?.on === device) return [];
        if (!call || call.on !== null || !call.ringing.includes(device)) return [{ to: 'done', ids: [device], id: signal.id, declined: false }];
        call.on = device;
        const others = call.ringing.filter((d) => d !== device);
        return [{ to: 'contact', c, signal }, { to: 'phone', id: signal.id, declined: false }, ...(others.length > 0 ? [{ to: 'done' as const, ids: others, id: signal.id, declined: false }] : [])];
      }
      case 'end': {
        if (!call) return [];
        if (call.on === device) {
          this.drop(call);
          return [{ to: 'contact', c, signal }];
        }
        if (call.on !== null || !call.ringing.includes(device)) return [];
        // Turned down on a device: turned down for the account.
        if (signal.reason === 'decline') {
          this.drop(call);
          const others = call.ringing.filter((d) => d !== device);
          return [{ to: 'contact', c, signal }, { to: 'phone', id: signal.id, declined: true }, ...(others.length > 0 ? [{ to: 'done' as const, ids: others, id: signal.id, declined: true }] : [])];
        }
        // It stopped ringing there (not answered, or in a call of its own): the others still ring.
        call.ringing = call.ringing.filter((d) => d !== device);
        return [];
      }
      case 'reoffer':
      case 'reanswer':
        // A change of the call it has, as video is added to it: to the contact, as its other signals.
        return call?.on === device ? [{ to: 'contact', c, signal }] : [];
      default:
        // Ringing: the phone said so to the contact itself.
        return [];
    }
  }

  /** A call signal the phone sealed for contact `c` itself. One it sealed for a device went through `device` first. */
  phone(c: string, signal: CallSignal, now = Date.now()): CallStep[] {
    const call = this.find(c, signal.id, now);
    if (!call || (call.on !== null && call.on !== 'phone')) return [];
    if (signal.kind === 'answer' && call.on === null) {
      call.on = 'phone';
      return call.ringing.length > 0 ? [{ to: 'done', ids: call.ringing, id: signal.id, declined: false }] : [];
    }
    if (signal.kind !== 'end') return [];
    this.drop(call);
    if (call.on === 'phone' || call.ringing.length === 0) return [];
    // Turned down on the phone; or not answered, as the devices will say too.
    return signal.reason === 'decline' ? [{ to: 'done', ids: call.ringing, id: signal.id, declined: true }] : [{ to: 'devices', c, ids: call.ringing, signal }];
  }

  /** A device unlinked: it rings no more, and a call it has ends for the contact. */
  unlinked(device: string): CallStep[] {
    const steps: CallStep[] = [];
    for (const call of [...this.calls]) {
      call.ringing = call.ringing.filter((d) => d !== device);
      if (call.on !== device) continue;
      this.drop(call);
      steps.push({ to: 'contact', c: call.c, signal: { id: call.id, kind: 'end', reason: 'hangup' } });
    }
    return steps;
  }
}
