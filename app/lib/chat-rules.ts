// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The rules of a chat with another service (Matrix, XMPP, Nostr, SMS), as Erevos's own chats have
// them: messages that disappear, by a timer of the chat or one message alone, and messages deleted
// on this phone only. Each chat keeps its rules with itself, sealed with its account in the space
// or in the hidden place it belongs to (lib/matrix.ts, lib/xmpp.ts, lib/nostr-dm.ts,
// lock/sms-data.ts); nothing of them goes anywhere by itself. What each service can make the other
// side do is its own (lib/matrix-rules.ts, lib/xmpp-rules.ts, lib/nostr-rules.ts, lib/sms-rules.ts).
//
// A timer counts from when a message was sent, as its time says, whoever sent it: these services
// tell nothing of when it was read. Turned on, it is for new messages only: each change is kept with
// the time it was made, so a message goes by the timer as it was when it was sent, and those already
// here stay.

/** From `since` (ms) on, new messages go `after` seconds after they were sent; 0 keeps them. */
export type VanishStep = { since: number; after: number };

export type ChatRules = {
  /** The chat's timer as it changed, oldest first. */
  vanish?: VanishStep[];
  /** Messages that go at a time of their own (ms), by id: one sent to disappear, or one that came
   *  with a time to go (Nostr's NIP-40). */
  ones?: Record<string, number>;
  /** Messages deleted on this phone only, by id, the latest last: one that comes again stays away. */
  hidden?: string[];
};

/** The most changes of a timer kept, the most messages with a time of their own, and the most remembered as deleted here. */
export const STEPS_MOST = 20;
export const ONES_MOST = 1000;
export const HIDDEN_MOST = 1000;

/** The timer as it is now, in seconds; 0 when messages stay. */
export function vanishTimer(rules: ChatRules | undefined): number {
  return rules?.vanish?.at(-1)?.after ?? 0;
}

/** The rules with the timer set to `after` seconds from `now` on: what is here already stays as it was. */
export function withTimer(rules: ChatRules | undefined, after: number, now = Date.now()): ChatRules | undefined {
  const steps = [...(rules?.vanish ?? [])];
  if ((steps.at(-1)?.after ?? 0) === after) return rules;
  steps.push({ since: now, after: Math.max(0, Math.floor(after)) });
  // A timer that kept messages counts for none: those sent under it stay, as with none at all.
  while (steps.length && steps[0].after === 0) steps.shift();
  return tidied({ ...rules, vanish: steps.slice(-STEPS_MOST) });
}

/** The rules with the message `id` going at `until` (ms). */
export function withOne(rules: ChatRules | undefined, id: string, until: number): ChatRules {
  const ones = { ...rules?.ones, [id]: until };
  const ids = Object.keys(ones);
  // The ones to go soonest stay, should there be too many.
  if (ids.length > ONES_MOST) for (const gone of ids.sort((a, b) => ones[a] - ones[b]).slice(ONES_MOST)) delete ones[gone];
  return { ...rules, ones };
}

/** When a message goes (ms): its own time, or the timer's as it was when it was sent; 0 for never. */
export function goesAt(rules: ChatRules | undefined, id: string, at: number): number {
  const own = rules?.ones?.[id];
  if (own) return own;
  const steps = rules?.vanish;
  if (!steps?.length) return 0;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].since <= at) return steps[i].after > 0 ? at + steps[i].after * 1000 : 0;
  }
  return 0;
}

/** Whether a message is gone by `now`: its time came, or it was deleted here. */
export function isGone(rules: ChatRules | undefined, id: string, at: number, now = Date.now()): boolean {
  if (rules?.hidden?.includes(id)) return true;
  const until = goesAt(rules, id, at);
  return until > 0 && until <= now;
}

/** Those of `messages` that are gone by `now`. */
export function goneOf<T>(rules: ChatRules | undefined, messages: readonly T[], idOf: (m: T) => string, atOf: (m: T) => number, now = Date.now()): T[] {
  if (!rules?.vanish?.length && !rules?.ones && !rules?.hidden?.length) return [];
  return messages.filter((m) => isGone(rules, idOf(m), atOf(m), now));
}

/** When the next of `messages` goes after `now`, or 0 when none will. */
export function nextGoes<T>(rules: ChatRules | undefined, messages: readonly T[], idOf: (m: T) => string, atOf: (m: T) => number, now = Date.now()): number {
  if (!rules?.vanish?.length && !rules?.ones) return 0;
  let next = 0;
  for (const m of messages) {
    const until = goesAt(rules, idOf(m), atOf(m));
    if (until > now && (!next || until < next)) next = until;
  }
  return next;
}

/** The rules with these messages remembered as deleted here, and without their own times. */
export function withHidden(rules: ChatRules | undefined, ids: readonly string[]): ChatRules {
  const hidden = [...(rules?.hidden ?? []).filter((id) => !ids.includes(id)), ...ids].slice(-HIDDEN_MOST);
  return tidied({ ...rules, hidden, ones: without(rules?.ones, ids) }) ?? {};
}

/** The rules without the own times of these messages, gone by now. */
export function withoutOnes(rules: ChatRules | undefined, ids: readonly string[]): ChatRules | undefined {
  return tidied({ ...rules, ones: without(rules?.ones, ids) });
}

function without(ones: Record<string, number> | undefined, ids: readonly string[]): Record<string, number> | undefined {
  if (!ones) return undefined;
  const rest = { ...ones };
  for (const id of ids) delete rest[id];
  return rest;
}

/** The rules without what keeps nothing: undefined when nothing is left. */
function tidied(rules: ChatRules): ChatRules | undefined {
  const kept: ChatRules = {};
  if (rules.vanish?.length && rules.vanish.some((step) => step.after > 0)) kept.vanish = rules.vanish;
  if (rules.ones && Object.keys(rules.ones).length) kept.ones = rules.ones;
  if (rules.hidden?.length) kept.hidden = rules.hidden;
  return Object.keys(kept).length ? kept : undefined;
}

const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Rules as kept, checked: what is damaged is left out. */
export function checkedRules(value: unknown): ChatRules | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const vanish = (Array.isArray(v.vanish) ? v.vanish : [])
    .filter((s): s is VanishStep => typeof s === 'object' && s !== null && isTime((s as VanishStep).since) && isTime((s as VanishStep).after))
    .map((s) => ({ since: s.since, after: s.after }))
    .slice(-STEPS_MOST);
  const ones = Object.fromEntries(
    Object.entries(typeof v.ones === 'object' && v.ones !== null ? (v.ones as Record<string, unknown>) : {})
      .filter((entry): entry is [string, number] => entry[0].length <= 200 && isTime(entry[1]))
      .slice(-ONES_MOST),
  );
  const hidden = (Array.isArray(v.hidden) ? v.hidden : []).filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200).slice(-HIDDEN_MOST);
  return tidied({ vanish, ones, hidden });
}

/** How often the accounts look for what is gone, while nothing else changes them. */
export const RULES_TICK = 30_000;

const ticks = new Set<() => void>();
let clock: ReturnType<typeof setInterval> | null = null;

/**
 * Calls `tick` every RULES_TICK, for an account's store to sweep what is gone while nothing comes
 * (lib/matrix-store.ts, lib/xmpp-store.ts, lib/nostr-dm-store.ts). The clock never holds Node open.
 */
export function onRulesTick(tick: () => void): () => void {
  ticks.add(tick);
  if (!clock) {
    clock = setInterval(() => ticks.forEach((each) => each()), RULES_TICK);
    (clock as { unref?: () => void }).unref?.();
  }
  return () => {
    ticks.delete(tick);
    if (ticks.size || !clock) return;
    clearInterval(clock);
    clock = null;
  };
}

/** A list of who is blocked with `who` on or off it, the latest last; undefined when it is empty. */
export function withBlocked(list: readonly string[] | undefined, who: string, on: boolean, most = 1000): string[] | undefined {
  const rest = (list ?? []).filter((one) => one !== who);
  if (on) rest.push(who);
  return rest.length ? rest.slice(-most) : undefined;
}
