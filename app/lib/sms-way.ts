// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Encrypted messages by SMS, when nothing else takes them (lib/nearby.ts, Nearby.deliver): after
// the relay, Nostr, the phones nearby and LoRa, a text or a delete to an Erevos contact whose
// phone number is linked goes in data SMS to Erevos's SMS port (lib/sms-packets.ts), the same
// end-to-end encrypted packets the relay would have carried. Off unless the owner turns it on,
// for all such contacts or for one (Settings → SMS, Chat Details), as SMS cost money and tell the
// phone company who wrote to whom, and when. Never from hidden chats, never photos, files or voice
// messages, and nothing larger than MAX_SMS_BYTES. Both phones need Erevos as their SMS app, as
// Android lets only an app allowed SMS send and take them.
//
// What comes on the port is put together here and opened as what comes from a phone nearby
// (lib/receiver.ts, openNearby): in the open space's chats, or kept a while for the others. Whether
// it came is said back as for any message, through the relay or Nostr once they can be reached:
// no SMS goes back by itself. Nothing of it is written to the phone's SMS, nor said in any log.

import { t } from './i18n';
import { nearby, SMS_LINK, type SmsWay } from './nearby';
import { openNearby } from './receiver';
import { gatherSmsPieces, PIECE, smsPiecesOf } from './sms-packets';
import { spaceSmsLink } from './sms-relay';
import { spaceChatsNow } from './space-chats';
import type { SmsLink } from './sms-link';
import { fromBase64 } from './crypto';
import { forgetSmsPacketParts, onSmsEvent, sendSmsPacket, smsPacketParts, smsPacketsReady, smsReady, smsStatus, type SmsPacketPart } from '../modules/erevos-sms';

/** The phone's SMS as this way uses it. */
export type SmsPort = {
  /** Whether SMS can go now: a build with it, and Erevos the SMS app. */
  ready(): boolean;
  send(address: string, data: Uint8Array, piece: number, sim: number): Promise<boolean>;
  parts(): Promise<SmsPacketPart[]>;
  forget(ns: number[]): Promise<void>;
};

/** Whom SMS is on for, as the space keeps it (lib/sms-link.ts), and their numbers. */
export type SmsWaySettings = {
  /** Reads again what the settings screens changed since. */
  refresh(): Promise<void>;
  on(identity: string): boolean;
  /** The number linked to a contact, or ''. */
  phone(identity: string): string;
  /** The SIM chosen for a number, or -1. */
  sim(number: string): number;
};

// Messages taken already, by digest, so one that comes twice opens once.
const MAX_SEEN = 200;

/** Sends packets by SMS and takes those that come, for one phone. */
export class SmsWayRunner {
  private readonly port: SmsPort;
  private readonly open: (packet: Uint8Array) => Promise<void>;
  private readonly seen: string[] = [];
  private taking: Promise<number> = Promise.resolve(0);

  constructor(port: SmsPort, open: (packet: Uint8Array) => Promise<void>) {
    this.port = port;
    this.open = open;
  }

  /** The way to give lib/nearby.ts, with the settings of the space open now, or none. */
  way(settings: () => SmsWaySettings | null): SmsWay {
    const can = (identity: string) => {
      const now = settings();
      return !!now && this.port.ready() && now.on(identity) && !!now.phone(identity);
    };
    return {
      can,
      send: async (identity, packets) => {
        const now = settings();
        if (!now) return false;
        await now.refresh();
        if (!can(identity)) return false;
        const pieces = smsPiecesOf(packets);
        if (!pieces) return false;
        const data = new Uint8Array(pieces.reduce((n, p) => n + p.length, 0));
        pieces.reduce((at, p) => (data.set(p, at), at + p.length), 0);
        const phone = now.phone(identity);
        if (!(await this.port.send(phone, data, PIECE, now.sim(phone)))) throw new Error(t('The SMS did not go.'));
        return true;
      },
    };
  }

  /**
   * Puts together what came by SMS, opens each message whole, in order, and forgets its pieces;
   * those still waiting for the rest stay kept. One at a time. Says how many messages opened.
   */
  take(now = Date.now()): Promise<number> {
    const next = this.taking.catch(() => 0).then(() => this.takeNow(now));
    this.taking = next;
    return next;
  }

  private async takeNow(now: number): Promise<number> {
    const parts = await this.port.parts();
    if (parts.length === 0) return 0;
    const pieces = parts.flatMap((p) => {
      try {
        return [{ n: p.n, from: p.from, data: fromBase64(p.data), at: p.at }];
      } catch {
        return [{ n: p.n, from: p.from, data: new Uint8Array(0), at: p.at }];
      }
    });
    const { came, done } = gatherSmsPieces(pieces, now);
    let opened = 0;
    for (const message of came) {
      if (this.seen.includes(message.digest)) continue;
      this.seen.push(message.digest);
      if (this.seen.length > MAX_SEEN) this.seen.shift();
      for (const packet of message.packets) await this.open(packet).catch(() => undefined);
      opened++;
    }
    await this.port.forget(done);
    return opened;
  }
}

const port: SmsPort = {
  ready: () => smsPacketsReady() && !!smsStatus()?.isDefault,
  send: sendSmsPacket,
  parts: smsPacketParts,
  forget: forgetSmsPacketParts,
};

const runner = new SmsWayRunner(port, (packet) => openNearby(SMS_LINK, packet));

/** Whom SMS is on for in the open space, from its SMS state and its contacts' numbers. */
export function spaceSmsSettings(link: SmsLink, phones: () => { identity: string; phone: string }[]): SmsWaySettings {
  return {
    refresh: () => link.refresh(),
    on: (identity) => link.smsWayOn(identity),
    phone: (identity) => phones().find((p) => p.identity === identity)?.phone ?? '',
    sim: (number) => link.simFor(number),
  };
}

/**
 * Sends by SMS when nothing else takes a message, for whom it is on, and takes what comes by SMS,
 * while the space is open (app/_layout.tsx). Returns how to stop.
 */
export function startSmsWay(): () => void {
  if (!smsReady() || !smsPacketsReady()) return () => undefined;
  let active = true;
  let settings: SmsWaySettings | null = null;
  void spaceSmsLink()
    .then((link) => {
      if (active) settings = spaceSmsSettings(link, () => spaceChatsNow()?.e2e.phones() ?? []);
    })
    .catch(() => undefined);
  const way = runner.way(() => settings);
  nearby.smsWay = way;
  const take = () => void runner.take().catch(() => undefined);
  const subscription = onSmsEvent('onSmsPacket', take);
  // What came while Erevos was closed, or another space was open.
  take();
  return () => {
    active = false;
    if (nearby.smsWay === way) nearby.smsWay = null;
    subscription?.remove();
  };
}
