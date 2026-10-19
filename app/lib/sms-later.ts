// SMS sent for later (app/sms.tsx): the space keeps each sealed (lock/sms-data.ts), never in the
// phone's SMS store, and hands it to Android (modules/erevos-sms, LaterSms.kt), which holds it until
// its time and sends it then, with Erevos closed and the space locked too; with the phone off, once
// it is on again. From then on it is in the store as any SMS sent from here. The space forgets one
// once Android says it went. Where Android cannot hold it (a build without that, or one kept
// before it, whose time came), it goes from here, while Erevos runs: beside the receiver, in the
// background too while the space is open (app/_layout.tsx), or else when Erevos next opens.

import { currentSpace } from '../lock/keys';
import type { LaterSms } from '../lock/sms-data';
import { laterSmsHolder, onSmsEvent, sendSms, smsReady, type LaterSmsHolder, type LaterSmsState } from '../modules/erevos-sms';
import { SmsLink } from './sms-link';

// One that could not go (no permission to send, say) is tried again after this, milliseconds.
const RETRY = 5 * 60_000;

type Send = (to: string, text: string, sim: number) => Promise<unknown>;

/**
 * Hands Android what it does not hold yet and forgets what it says went; sends from here the SMS
 * whose time came that Android does not hold, the soonest first, each forgotten once it went; one
 * that could not go stays, and is tried again. Says which went, and when to look again: the next
 * one's time that goes from here, or RETRY from now when one stays or Android's is late, or 0 when
 * there is nothing to look at.
 */
export async function sendDue(link: SmsLink, send: Send, now = Date.now(), holder: LaterSmsHolder | null = null): Promise<{ went: LaterSms[]; next: number }> {
  const went: LaterSms[] = [];
  let stays = false;
  let ahead = 0;
  const later = link.later;
  if (later.length === 0) return { went, next: 0 };
  let held: Record<string, LaterSmsState> | null = null;
  if (holder) {
    try {
      held = await holder.state(later.map((l) => l.id));
    } catch {
      // Android may hold some of them, and send them: none goes from here this time.
      return { went, next: now + RETRY };
    }
  }
  for (const sms of later) {
    const state = held?.[sms.id];
    if (state === 'went') {
      went.push(sms);
      await link.removeLater(sms.id);
      continue;
    }
    if (state === 'waiting') {
      stays ||= sms.at <= now;
      continue;
    }
    if (held && sms.at > now) {
      try {
        await holder!.schedule(sms);
        continue;
      } catch {
        // It goes from here, then.
      }
    }
    if (sms.at > now) {
      ahead ||= sms.at;
      continue;
    }
    try {
      await send(sms.to, sms.text, sms.sim);
    } catch {
      stays = true;
      continue;
    }
    went.push(sms);
    await link.removeLater(sms.id);
  }
  const retry = stays ? now + RETRY : 0;
  return { went, next: ahead && retry ? Math.min(ahead, retry) : ahead || retry };
}

/** Forgets an SMS sent for later, Android first, so it cannot go once that is done. False when it
 *  had gone already. Throws, and nothing is forgotten, when Android could not be asked. */
export async function cancelLater(link: SmsLink, id: string, holder: LaterSmsHolder | null = laterSmsHolder()): Promise<boolean> {
  const waited = holder ? await holder.cancel(id) : true;
  const went = !waited && (await holder!.state([id]))[id] === 'went';
  await link.removeLater(id);
  return !went;
}

let recheck: (() => void) | null = null;
const listeners = new Set<() => void>();

/** Says an SMS was kept for later, or cancelled, so the time to look again follows. */
export function laterChanged(): void {
  recheck?.();
}

/** Calls `listener` each time SMS sent for later went, until the function it gives is called. */
export function onLaterSent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hands the open space's SMS for later to Android, or sends them as their time comes, until the
 *  function it gives is called. */
export function startSmsLater(): () => void {
  if (!smsReady()) return () => undefined;
  const { space, key } = currentSpace();
  const holder = laterSmsHolder();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let turn: Promise<unknown> = Promise.resolve();
  const check = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    turn = turn
      .then(async () => {
        if (stopped) return;
        const { went, next } = await sendDue(await SmsLink.open(space, key), sendSms, Date.now(), holder);
        if (went.length > 0) listeners.forEach((listener) => listener());
        // Timers longer than about 24 days go off at once: one that far looks again then.
        if (!stopped && next > 0) timer = setTimeout(check, Math.min(Math.max(0, next - Date.now()), 2 ** 31 - 1));
      })
      .catch(() => {
        // The space's SMS data could not be read: looked at again with the next change, or when
        // Erevos next opens.
      });
  };
  recheck = check;
  check();
  // Android sent one: the space forgets it.
  const sent = onSmsEvent('onSmsLaterSent', check);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (recheck === check) recheck = null;
    sent?.remove();
  };
}
