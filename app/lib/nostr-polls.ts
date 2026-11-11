// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { isNostrRelay } from '../lock/e2e-data';
import { randomBytes } from './crypto';
import type { NostrEvent } from './nostr-dm-net';
import { fetchable } from './public-media';

// Polls in public posts, as other Nostr apps make them (NIP-88), in the public feed
// (components/public-feed.tsx): a poll is an event of its own (kind 1068), its question as its
// words, each option an option tag with an id and its words, the relays its votes go to, whether
// one or more options can be chosen (polltype), and when it ends (endsAt, in seconds): that end,
// chosen as it is made, is how a poll closes. A vote (kind 1018) names the poll (an e tag) and the
// options chosen, by id (response tags). Each key counts once, its latest vote before the end; on
// a poll of one choice only its first response counts, on one of more each option once. Votes are
// public and signed, as the poll is: anyone can see who chose what. Here, what is read and made of
// them, kept pure; lib/nostr-dm-store.ts sends and asks the relays.
//
// Not in private chats (NIP-17): it has no polls, and the other apps would not show one there.

export const POLL_KIND = 1068;
export const VOTE_KIND = 1018;
/** The most options of a poll that are read, and the longest words of one. */
export const POLL_OPTIONS_MOST = 20;
const OPTION_MOST = 200;
/** The most relays of a poll that its votes are sent to and asked of. */
export const POLL_RELAYS_MOST = 4;
/** How long a poll made here is open, as offered: a day, three days, a week (seconds). */
export const POLL_LASTS = [24 * 3600, 3 * 24 * 3600, 7 * 24 * 3600];

const OPTION_ID = /^[A-Za-z0-9_-]{1,64}$/;

export type NostrPoll = {
  options: { id: string; label: string }[];
  multiple: boolean;
  /** When it ends, in seconds; none for one that does not. */
  endsAt?: number;
  /** Where its votes go and are asked for. */
  relays: string[];
};

/**
 * A relay a poll names that may be reached from here: wss:// on a name or an address out on the
 * internet, or an onion. As with a post's photos (lib/public-media.ts fetchable), anyone can name
 * any address in a public event, and one on this phone or its home network is let be.
 */
export function reachableRelay(url: string): boolean {
  if (!isNostrRelay(url)) return false;
  if (/^ws:\/\//i.test(url)) return true;
  return fetchable(url.replace(/^wss:\/\//i, 'https://'));
}

/** The poll an event is (kind 1068), or null when it is none that can be shown. */
export function pollOf(event: NostrEvent): NostrPoll | null {
  if (event.kind !== POLL_KIND) return null;
  const options: NostrPoll['options'] = [];
  const relays: string[] = [];
  let multiple = false;
  let endsAt: number | undefined;
  for (const tag of event.tags) {
    const [name, a, b] = tag;
    if (name === 'option' && typeof a === 'string' && typeof b === 'string') {
      const label = b.trim().slice(0, OPTION_MOST);
      if (OPTION_ID.test(a) && label && options.length < POLL_OPTIONS_MOST && !options.some((o) => o.id === a)) options.push({ id: a, label });
    } else if (name === 'relay' && typeof a === 'string') {
      const url = a.replace(/\/+$/, '');
      if (relays.length < POLL_RELAYS_MOST && reachableRelay(url) && !relays.includes(url)) relays.push(url);
    } else if (name === 'polltype') multiple = a === 'multiplechoice';
    else if (name === 'endsAt') {
      const at = Number(a);
      if (Number.isSafeInteger(at) && at > 0) endsAt = at;
    }
  }
  if (!options.length) return null;
  return { options, multiple, ...(endsAt !== undefined ? { endsAt } : {}), relays };
}

/** Whether a poll still takes votes. */
export function pollOpen(poll: Pick<NostrPoll, 'endsAt'>, now = Date.now()): boolean {
  return poll.endsAt === undefined || poll.endsAt * 1000 > now;
}

/** An option's id, as NIP-88 has them: nine letters and digits, made for it alone. */
export function optionId(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return [...randomBytes(9)].map((byte) => letters[byte % letters.length]).join('');
}

/** The tags of a poll made here: its options, the relays its votes go to, one or more choices, and its end. */
export function pollTags(options: string[], multiple: boolean, endsAt: number, relays: string[], id: () => string = optionId): string[][] {
  const ids = new Set<string>();
  const tags: string[][] = [];
  for (const option of options.map((o) => o.trim().slice(0, OPTION_MOST)).filter(Boolean).slice(0, POLL_OPTIONS_MOST)) {
    let made = id();
    while (ids.has(made)) made = id();
    ids.add(made);
    tags.push(['option', made, option]);
  }
  for (const url of [...new Set(relays.map((r) => r.replace(/\/+$/, '')))].slice(0, POLL_RELAYS_MOST)) tags.push(['relay', url]);
  tags.push(['polltype', multiple ? 'multiplechoice' : 'singlechoice'], ['endsAt', String(Math.floor(endsAt))]);
  return tags;
}

/** The tags of a vote on the poll `pollId` for the options `chosen` (ids), in the poll's order: one only on a poll of one choice. Null for none. */
export function voteTags(pollId: string, poll: NostrPoll, chosen: readonly string[]): string[][] | null {
  const ids = poll.options.map((o) => o.id).filter((id) => chosen.includes(id));
  const kept = poll.multiple ? ids : ids.slice(0, 1);
  return kept.length ? [['e', pollId], ...kept.map((id) => ['response', id])] : null;
}

/** How a poll stands: how many chose each option (in the poll's order), how many voted, and what this key chose. */
export type PollCount = { counts: number[]; voters: number; mine: string[] };

/** How a poll stands with this key's vote for `chosen` (ids) in place of its vote before: as it shows
 *  just after voting, whether or not the relays asked had the vote yet. */
export function withMyVote(count: PollCount, poll: NostrPoll, chosen: readonly string[]): PollCount {
  const index = (id: string) => poll.options.findIndex((o) => o.id === id);
  const counts = [...count.counts];
  for (const id of count.mine) if (index(id) >= 0) counts[index(id)] -= 1;
  const mine = poll.options.map((o) => o.id).filter((id) => chosen.includes(id));
  const kept = poll.multiple ? mine : mine.slice(0, 1);
  for (const id of kept) counts[index(id)] += 1;
  const voters = count.voters - (count.mine.length ? 1 : 0) + (kept.length ? 1 : 0);
  return { counts, voters, mine: kept };
}

/** The options a vote counts for, by id, as the poll allows. */
function choicesOf(poll: NostrPoll, vote: NostrEvent): string[] {
  const said = vote.tags.filter((tag) => tag[0] === 'response' && typeof tag[1] === 'string').map((tag) => tag[1]);
  const ids = new Set(poll.options.map((o) => o.id));
  if (!poll.multiple) return said.length && ids.has(said[0]) ? [said[0]] : [];
  return [...new Set(said.filter((id) => ids.has(id)))];
}

/**
 * Counts the votes among these events on the poll `pollId`: of each key, its latest checked vote
 * dated before the poll's end (and not more than ten minutes ahead), as the poll allows; `me`'s
 * choices with them.
 */
export async function pollCount(pollId: string, poll: NostrPoll, events: readonly NostrEvent[], me: string, check: (event: NostrEvent) => Promise<boolean>, now = Date.now()): Promise<PollCount> {
  const latest = Math.min(Math.floor(now / 1000) + 600, poll.endsAt ?? Infinity);
  const byKey = new Map<string, NostrEvent[]>();
  const seen = new Set<string>();
  for (const event of events) {
    if (event.kind !== VOTE_KIND || event.created_at > latest || seen.has(event.id)) continue;
    if (!event.tags.some((tag) => tag[0] === 'e' && tag[1] === pollId)) continue;
    seen.add(event.id);
    const list = byKey.get(event.pubkey);
    if (list) list.push(event);
    else byKey.set(event.pubkey, [event]);
  }
  const counts = poll.options.map(() => 0);
  let voters = 0;
  let mine: string[] = [];
  for (const [key, votes] of byKey) {
    votes.sort((a, b) => b.created_at - a.created_at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    let vote: NostrEvent | undefined;
    for (const one of votes) {
      if (await check(one)) {
        vote = one;
        break;
      }
    }
    if (!vote) continue;
    const chose = choicesOf(poll, vote);
    if (!chose.length) continue;
    voters += 1;
    for (const id of chose) counts[poll.options.findIndex((o) => o.id === id)] += 1;
    if (key === me) mine = chose;
  }
  return { counts, voters, mine };
}
