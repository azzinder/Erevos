// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { postParts, POSTS_AT_ONCE, verified, type NostrPost } from './nostr-dm';
import { isEvent, type NostrEvent } from './nostr-dm-net';

// The feed of the Nostr tab on home (components/nostr-feed.tsx, docs/nostr-chats.md), as Amethyst's
// home or a Telegram channel shows one: the public posts (kind 1) of the people the space's Nostr
// key follows, and the posts they shared again (kind 6, NIP-18), newest first, a page at a time.
// This is what is worked out from what the relays sent: which relays to ask for whose posts, and
// the next page, each post checked and shown once. lib/nostr-dm-store.ts (nostrDmFeed) asks the
// relays. Read only, never kept: the screen holds it while it shows.

/** How many posts a page has, as a person's public posts do (app/nostr-posts.tsx). */
export const FEED_AT_ONCE = POSTS_AT_ONCE;
/** The most relays asked besides the fixed ones: those the people followed write on (NIP-65). */
export const FEED_RELAYS_MOST = 8;

/** One post of the feed, as the screen shows it. */
export type FeedPost = NostrPost & {
  /** Who posted it, or shared it again: someone the key follows. */
  by: string;
  /** The post that shows: its own id, or, for a share, the id of the post shared, so that a post
   *  shows once however many people shared it. */
  note: string;
};

const bare = (url: string) => url.replace(/\/+$/, '');

/**
 * Which relays a page is asked of, and for whose posts: the fixed ones (for look-ups, and those
 * that gather lists) for everyone followed; then, `most` at most, relays the people followed say
 * they write on (their NIP-65 lists, `writes`), each for those who write there. Each next one is
 * the relay that reaches the most people not reached yet (someone is reached by a relay asked that
 * their list names), then the one more of them write on, then by its address; none that reaches no
 * one new.
 */
export function feedRelays(follows: readonly string[], writes: ReadonlyMap<string, readonly string[]>, fixed: readonly string[], most = FEED_RELAYS_MOST): { url: string; authors: string[] }[] {
  const base = [...new Set(fixed.map(bare))];
  const asked = new Set(base);
  const listed = (key: string) => [...new Set((writes.get(key) ?? []).map(bare))];
  const reached = new Set(follows.filter((key) => listed(key).some((url) => asked.has(url))));
  const writers = new Map<string, string[]>();
  for (const key of new Set(follows)) {
    for (const url of listed(key)) {
      if (asked.has(url)) continue;
      const list = writers.get(url);
      if (list) list.push(key);
      else writers.set(url, [key]);
    }
  }
  const chosen: string[] = [];
  while (chosen.length < most) {
    let best: { url: string; fresh: number; all: number } | null = null;
    for (const [url, keys] of writers) {
      if (chosen.includes(url)) continue;
      const fresh = keys.filter((key) => !reached.has(key)).length;
      if (!fresh) continue;
      if (!best || fresh > best.fresh || (fresh === best.fresh && (keys.length > best.all || (keys.length === best.all && url < best.url)))) best = { url, fresh, all: keys.length };
    }
    if (!best) break;
    chosen.push(best.url);
    for (const key of writers.get(best.url)!) reached.add(key);
  }
  return [...base.map((url) => ({ url, authors: [...new Set(follows)] })), ...chosen.map((url) => ({ url, authors: writers.get(url)! }))];
}

/** What one relay sent for one ask of a page: its events, and whether it sent as many as asked
 *  (FEED_AT_ONCE), so that it may keep older ones too. */
export type FeedAnswer = { events: NostrEvent[]; full: boolean };

/**
 * The next page of the feed, from what the relays sent for it: asked `until` (seconds, as NIP-01
 * counts it in), or the newest when not. Posts (kind 1) and shares (kind 6) whose shared post is
 * inside, of the people followed, each checked (a share's post too), newest first, FEED_AT_ONCE at
 * most, each event once and each post once (the newest share of it or itself wins), none of those
 * `shown` already. One dated more than ten minutes ahead is let be, as is a share with nothing to
 * show in it.
 *
 * A relay that sent as many as asked may keep more, older: what it did not send could come before
 * what another relay sent. So the page stops at the oldest time such a relay sent (its horizon),
 * and the next page is asked until the oldest time on this one, that second too, so that what else
 * came in it comes then; when a page brings nothing new, the horizon or a second before is asked,
 * so that a second with more posts than a page holds stops nothing. `older`: there may be more.
 */
export async function feedPage(
  follows: ReadonlySet<string>,
  answers: readonly FeedAnswer[],
  shown: readonly FeedPost[] = [],
  until?: number,
  now = Date.now(),
  check: (event: NostrEvent) => Promise<boolean> = verified,
): Promise<{ posts: FeedPost[]; until: number; older: boolean }> {
  const latest = Math.min(Math.floor(now / 1000) + 600, until ?? Infinity);
  const fulls = answers.filter((answer) => answer.full && answer.events.length);
  const horizon = Math.max(0, ...fulls.map((answer) => Math.min(...answer.events.map((e) => e.created_at))));
  const candidates = answers
    .flatMap((answer) => answer.events)
    .filter((e) => follows.has(e.pubkey) && (e.kind === 1 || e.kind === 6) && e.created_at <= latest && e.created_at >= horizon)
    .sort((a, b) => b.created_at - a.created_at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const ids = new Set(shown.map((post) => post.id));
  const notes = new Set(shown.map((post) => post.note));
  const posts: FeedPost[] = [];
  let more = false;
  for (const event of candidates) {
    // A changed copy that keeps a post's id hides nothing: only a checked one counts as seen.
    if (ids.has(event.id)) continue;
    if (posts.length >= FEED_AT_ONCE) {
      more = true;
      break;
    }
    if (!(await check(event))) continue;
    ids.add(event.id);
    if (event.kind === 1) {
      if (notes.has(event.id)) continue;
      notes.add(event.id);
      posts.push({ id: event.id, note: event.id, by: event.pubkey, at: event.created_at * 1000, ...postParts(event) });
      continue;
    }
    let inner: unknown;
    try {
      inner = JSON.parse(event.content);
    } catch {
      continue;
    }
    if (!isEvent(inner) || inner.kind !== 1 || notes.has(inner.id) || !(await check(inner))) continue;
    notes.add(inner.id);
    posts.push({ id: event.id, note: inner.id, by: event.pubkey, at: event.created_at * 1000, ...postParts(inner), sharedFrom: inner.pubkey });
  }
  const asked = until ?? latest;
  const next = posts.length ? Math.floor(posts[posts.length - 1].at / 1000) : horizon > 0 && horizon < asked ? horizon : asked - 1;
  return { posts, until: next, older: fulls.length > 0 || more };
}

/** The posts shown with a page more under them: newest first, each post once. */
export function morePosts(shown: readonly FeedPost[], page: readonly FeedPost[]): FeedPost[] {
  const notes = new Set(shown.map((post) => post.note));
  return [...shown, ...page.filter((post) => !notes.has(post.note))].sort((a, b) => b.at - a.at);
}

/** The keys a page names, whose names it shows: who posted or shared, and whose post was shared. */
export function feedPeople(posts: readonly FeedPost[]): string[] {
  return [...new Set(posts.flatMap((post) => (post.sharedFrom ? [post.by, post.sharedFrom] : [post.by])))];
}
