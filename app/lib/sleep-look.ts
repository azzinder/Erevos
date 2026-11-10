// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The look the battery mode Sleep makes each time its alarm wakes the phone (lib/battery-mode.ts,
// modules/erevos-call SleepWake.kt). The phone is held awake for it, and let sleep again as soon
// as every part that looks has looked once and found nothing: the space's receiver, each hidden
// place's that receives, and the waits on the contacts' queues (lib/receiver.ts,
// lib/place-receiver.ts, lib/contact-queues.ts). While it goes on, they ask the relay without
// waiting there (briefLook), so an empty look takes one answer from the relay, not a minute's wait.
// When something came, or something else is under way (awakeWhile, stayAwakeWhen), the phone is not
// let go early: it stays awake for as long as the alarm holds it, as before.
//
// The battery mode Light sleep goes one further: the phone sleeps with the waits at the relay
// left open, and what comes there wakes it through the network, so a message need not wait for
// the alarm, which goes less often. Each wait that ends takes the hold (the phone was woken by
// its answer, and must stay awake to take what came); once every look is back in a wait at the
// relay and nothing came, the hold is let go. Where the answer does not wake the phone, or the
// phone sleeps again before this hears of it, the alarm's look finds what came, as in Sleep.

type Part = { kick: () => void };

/** How a part's look ended: nothing came, something came, or the relay could not be reached. */
export type LookEnd = 'quiet' | 'came' | 'failed';

/** A part that looks, as it joined (joinSleepLooks). */
export type LookPart = {
  /** At the start of a look: what to give `ended` with, so only a look that began after the alarm counts. */
  begin(): number;
  ended(began: number, how: LookEnd): void;
  /** The part looks no more. */
  leave(): void;
};

// A look that failed is tried again after RETRY_MS, RETRIES times: the network may not be up yet
// as the phone wakes. One look goes on for MOST_MS at most.
const RETRY_MS = 2000;
const RETRIES = 2;
const MOST_MS = 20_000;

const parts = new Set<Part>();
const reasons = new Set<() => boolean>();
let busy = 0;
// The parts that have not looked yet in the round under way; null while no look goes on.
let owed: Set<Part> | null = null;
let round = 0;
let failed = false;
let tries = 0;
let settle: ((quiet: boolean) => void) | null = null;
let under: Promise<boolean> | null = null;
let most: ReturnType<typeof setTimeout> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;

/** Whether the alarm's look goes on: the relay is then asked without waiting there. */
export function briefLook(): boolean {
  return owed !== null;
}

/** Joins the parts that look when the alarm wakes the phone: `kick` has it look at once. */
export function joinSleepLooks(kick: () => void): LookPart {
  const part: Part = { kick };
  parts.add(part);
  return {
    begin: () => (owed?.has(part) ? round : 0),
    ended: (began, how) => {
      if (!owed || began !== round || !owed.has(part)) return;
      if (how === 'came') return finish(false);
      if (how === 'failed') failed = true;
      owed.delete(part);
      if (owed.size === 0) roundOver();
    },
    leave: () => {
      parts.delete(part);
      if (owed?.delete(part) && owed.size === 0) roundOver();
    },
  };
}

/** Keeps the phone awake for as long as the alarm holds it while `still` says so, asked as a look ends. Returns how to stop. */
export function stayAwakeWhen(still: () => boolean): () => void {
  reasons.add(still);
  return () => reasons.delete(still);
}

/** Has the phone not let go early while `work` goes on (an automatic backup, say). */
export async function awakeWhile<T>(work: Promise<T>): Promise<T> {
  busy++;
  try {
    return await work;
  } finally {
    busy--;
  }
}

function startRound() {
  retry = null;
  round++;
  failed = false;
  owed = new Set(parts);
  if (owed.size === 0) return finish(true);
  for (const part of [...owed]) {
    try {
      part.kick();
    } catch {
      owed.delete(part);
    }
  }
  if (owed && owed.size === 0) roundOver();
}

function roundOver() {
  if (failed && tries < RETRIES) {
    tries++;
    owed = new Set();
    retry = setTimeout(startRound, RETRY_MS);
    return;
  }
  finish(true);
}

function finish(quiet: boolean) {
  if (most) clearTimeout(most);
  if (retry) clearTimeout(retry);
  most = null;
  retry = null;
  owed = null;
  under = null;
  const done = settle;
  settle = null;
  if (!quiet && light) cameAt = Date.now();
  let still = busy > 0;
  for (const reason of reasons) {
    try {
      still ||= reason();
    } catch {
      still = true;
    }
  }
  done?.(quiet && !still);
}

/**
 * The alarm woke the phone: every part looks at once. Says whether the phone may sleep again now:
 * each looked and nothing came, and nothing else is under way. Otherwise the alarm's own hold ends
 * in its time.
 */
export function sleepLook(): Promise<boolean> {
  if (under) return under;
  tries = 0;
  under = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  const running = under;
  most = setTimeout(() => finish(false), MOST_MS);
  startRound();
  return running;
}

// Light sleep, while Erevos is in the background: how the phone is held awake and let go (the call
// module's, lib/background.ts), the looks under way, the waits at the relay under way inside
// looks and outside them (the contacts' queues'), and whether something came since the hold.
let light: { hold: () => void; release: () => void } | null = null;
let looks = 0;
let lookWaits = 0;
let otherWaits = 0;
let cameAt = 0;
// After something came the phone is not let go early for this long: a notice, a ring, an answer.
const CAME_MS = 25_000;
const cameLately = () => Date.now() - cameAt < CAME_MS && Date.now() >= cameAt;
let settleTimer: ReturnType<typeof setTimeout> | null = null;
// How long every look must have been back in its wait before the phone is let go.
const SETTLE_MS = 1500;

/** Turns Light sleep's holds on, with how to hold the phone awake and let it go, or off (null). */
export function setLightSleep(hooks: { hold: () => void; release: () => void } | null): void {
  light = hooks;
  cameAt = 0;
  if (!hooks && settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
}

/** Whether Light sleep's holds are on. */
export function lightSleep(): boolean {
  return light !== null;
}

function letGoWhenBack() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = null;
  if (!light || cameLately() || owed) return;
  // Every look is in its wait, and at least one wait is there for the network to wake the phone on.
  if (looks - lookWaits > 0 || lookWaits + otherWaits === 0) return;
  settleTimer = setTimeout(() => {
    settleTimer = null;
    if (!light || cameLately() || owed || looks - lookWaits > 0 || lookWaits + otherWaits === 0) return;
    let still = busy > 0;
    for (const reason of reasons) {
      try {
        still ||= reason();
      } catch {
        still = true;
      }
    }
    if (!still) light.release();
  }, SETTLE_MS);
}

/** A look at the relay began (lib/receiver.ts, lib/place-receiver.ts). */
export function lookBegan(): void {
  looks++;
  letGoWhenBack();
}

/** A look at the relay ended. */
export function lookEnded(): void {
  looks = Math.max(0, looks - 1);
  letGoWhenBack();
}

/** A wait at the relay began: inside a look, or not (the contacts' queues'). */
export function waitBegan(inLook: boolean): void {
  if (inLook) lookWaits++;
  else otherWaits++;
  letGoWhenBack();
}

/**
 * A wait at the relay ended, with something come or not: in Light sleep the phone is held awake
 * from now, as its answer woke it. Not for one that `failed`: with no network there is nothing to
 * stay awake for, and the alarm's look tries again.
 */
export function waitEnded(inLook: boolean, came: boolean, failed = false): void {
  if (inLook) lookWaits = Math.max(0, lookWaits - 1);
  else otherWaits = Math.max(0, otherWaits - 1);
  if (light && !failed) {
    try {
      light.hold();
    } catch {
      // A build from before it: the alarm's look takes what came.
    }
    if (came) cameAt = Date.now();
  }
  letGoWhenBack();
}

/** For the checks: as at the start. */
export function forgetSleepLooks(): void {
  setLightSleep(null);
  looks = 0;
  lookWaits = 0;
  otherWaits = 0;
}
