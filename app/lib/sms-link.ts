// Linking phone numbers to Erevos contacts through SMS invites (lib/sms-invite.ts), for one space:
// what was sent and is waiting for an answer, what came and was answered. The chat screen does the
// relay side (answering an invite, opening an answer, accepting the first message that follows);
// this keeps the state, sealed in the space (lock/sms-data.ts).

import { canSealOpen, sealOpen, sealPublic } from './core';
import { fromBase64, randomBytes, toBase64 } from './crypto';
import { fromBase64Url, toBase64Url } from './e2e';
import { collectInvites, invitePieces, plainNumber, readInviteAnswer, sameNumber, type InvitePiece, type SmsInvite } from './sms-invite';
import { fresh, loadSmsData, saveSmsData, type SmsData } from '../lock/sms-data';

/** Where this chat can be reached, for an invite. */
export type Own = { senderHex: string; relay: string; relayKey: string };

export class SmsLink {
  private readonly space: number;
  private readonly key: Uint8Array;
  private data: SmsData;

  private constructor(space: number, key: Uint8Array, data: SmsData) {
    this.space = space;
    this.key = key;
    this.data = data;
  }

  static async open(space: number, key: Uint8Array): Promise<SmsLink> {
    return new SmsLink(space, key, fresh(await loadSmsData('space', space, key), Date.now()));
  }

  /** Reads what another screen may have changed since. */
  async refresh(): Promise<void> {
    this.data = fresh(await loadSmsData('space', this.space, this.key), Date.now());
  }

  // Changes the data as it is on the phone now: the chat and the SMS screen each keep one.
  private async update(change: (data: SmsData) => SmsData): Promise<void> {
    await this.refresh();
    const data = change(this.data);
    await saveSmsData('space', this.space, this.key, data);
    this.data = data;
  }

  get invites(): boolean {
    return this.data.invites;
  }

  setInvites(on: boolean): Promise<void> {
    return this.update((d) => ({ ...d, invites: on }));
  }

  /** Whether the first SMS to `number` should carry an invite: invites are on, the core can open
   *  the answer, and the number was not invited, nor invited this chat, lately. */
  wantsInvite(number: string): boolean {
    return (
      this.data.invites &&
      canSealOpen() &&
      !this.data.sent.some((s) => sameNumber(s.number, number)) &&
      !this.data.got.some((g) => sameNumber(g.number, number))
    );
  }

  /** Sends an invite to `number`, a data SMS for each piece, and keeps the key that opens the answer. */
  async invite(number: string, own: Own, send: (number: string, piece: Uint8Array) => Promise<void>): Promise<void> {
    const secret = randomBytes(32);
    const invite: SmsInvite = { sender: own.senderHex, key: await sealPublic(secret), relay: own.relay, relayKey: own.relayKey };
    const pieces = invitePieces(invite, randomBytes(4));
    await this.update((d) => ({ ...d, sent: [...d.sent, { number: plainNumber(number), secret: toBase64Url(secret), at: Date.now() }] }));
    for (const piece of pieces) await send(number, piece);
  }

  /** The invites complete with `pieces` and the ones kept waiting, from numbers not answered yet. */
  async collect(pieces: InvitePiece[]): Promise<{ from: string; invite: SmsInvite }[]> {
    let invites: { from: string; invite: SmsInvite }[] = [];
    await this.update((d) => {
      const kept = d.waiting.map((w) => ({ from: w.from, data: fromBase64(w.data), at: w.at }));
      const collected = collectInvites([...kept, ...pieces]);
      invites = collected.invites;
      return { ...d, waiting: collected.waiting.map((w) => ({ from: w.from, data: toBase64(w.data), at: w.at })) };
    });
    return invites.filter((i) => !this.data.got.some((g) => g.sender === i.invite.sender));
  }

  /** Remembers that the invite from `number` was answered, so the first message from `sender` is
   *  accepted and linked to the number. */
  answered(number: string, sender: string): Promise<void> {
    return this.update((d) => ({ ...d, got: [...d.got, { number: plainNumber(number), sender, at: Date.now() }] }));
  }

  /** The number whose invite this chat answered, for a contact who writes from `sender`. */
  invitedBy(sender: string): string | null {
    return this.data.got.find((g) => g.sender === sender)?.number ?? null;
  }

  /** Whether any invite sent from here still waits for its answer. */
  get waiting(): boolean {
    return this.data.sent.length > 0;
  }

  /** Opens an answer to an invite sent from here: the number invited and its contact link. Null
   *  when `bytes` answers none of them. The invite is then done. */
  async openAnswer(bytes: Uint8Array): Promise<{ number: string; link: string } | null> {
    if (!canSealOpen() || bytes[0] !== 1) return null;
    for (const sent of this.data.sent) {
      let link: string | null;
      try {
        link = readInviteAnswer((await sealOpen(fromBase64Url(sent.secret), bytes)).message);
      } catch {
        continue;
      }
      if (!link) continue;
      await this.update((d) => ({ ...d, sent: d.sent.filter((s) => s.secret !== sent.secret) }));
      return { number: sent.number, link };
    }
    return null;
  }
}
