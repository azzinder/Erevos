// SMS sent for later (app/sms.tsx): kept sealed in the space (lock/sms-data.ts), never in the
// phone's SMS store, until their time comes. Then they go as any SMS sent from here, and are in the
// store from then on. That needs Erevos running: beside the receiver, in the background too while
// the space is open (app/_layout.tsx), or else when Erevos next opens.

import { currentSpace } from '../lock/keys';
import type { LaterSms } from '../lock/sms-data';
import { sendSms, smsReady } from '../modules/erevos-sms';
import { SmsLink } from './sms-link';

// One that could not go (no permission to send, say) is tried again after this, milliseconds.
const RETRY = 5 * 60_000;

type Send = (to: string, text: string, sim: number) => Promise<unknown>;

/**
 * Sends the SMS whose time came, the soonest first, each forgotten once it went; one that could not
 * go stays, and is tried again. Says which went, and when to look again: the next one's time, or
 * RETRY from now when one stays, or 0 when none waits.
 */
export async function sendDue(link: SmsLink, send: Send, now = Date.now()): Promise<{ went: LaterSms[]; next: number }> {
  const went: LaterSms[] = [];
  let stays = false;
  for (const sms of link.later.filter((l) => l.at <= now)) {
    try {
      await send(sms.to, sms.text, sms.sim);
    } catch {
      stays = true;
      continue;
    }
    went.push(sms);
    await link.removeLater(sms.id);
  }
  const ahead = link.later.find((l) => l.at > now)?.at ?? 0;
  const retry = stays ? now + RETRY : 0;
  return { went, next: ahead && retry ? Math.min(ahead, retry) : ahead || retry };
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

/** Sends the open space's SMS for later as their time comes, until the function it gives is called. */
export function startSmsLater(): () => void {
  if (!smsReady()) return () => undefined;
  const { space, key } = currentSpace();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let turn: Promise<unknown> = Promise.resolve();
  const check = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    turn = turn
      .then(async () => {
        if (stopped) return;
        const { went, next } = await sendDue(await SmsLink.open(space, key), sendSms);
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
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (recheck === check) recheck = null;
  };
}
