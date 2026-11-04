// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The posts of the Nostr tab (lib/nostr-feed.ts, lib/nostr-dm-store.ts nostrDmFeed,
// docs/nostr-chats.md): which relays a page is asked of, and for whose posts; a page made from
// what several relays sent, newest first, each event and each post once (a post shared by someone
// followed shows once, as shared), checked, the people not followed, posts from the future and
// shares with nothing in them let be; paging with until, which stops at what a relay that sent all
// it was asked for may still keep, so that no post is skipped, and never stops on a crowded
// second. Then, with the real core built to WebAssembly and relays played here
// (checks/nostr-relay.ts): the space's follow list, where those it follows write (NIP-65), their
// posts asked in batches where they are, two pages, the names of those shown only, nothing kept.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, mock, test } from 'node:test';

import { setCurrentSpace } from '../lock/keys';
import { setCore, type Core } from '../lib/core';
import { randomBytes, toHex } from '../lib/crypto';
import { FOLLOWS_RELAYS, LOOKUP_RELAYS, newNostrDm, signed, type NostrDmState } from '../lib/nostr-dm';
import { setNostrOpen, type NostrEvent, type NostrLink, type NostrOpen } from '../lib/nostr-dm-net';
import { nostrDmFeed, nostrDmFeedDone, nostrDmMake, nostrDmNow, runNostrDm, stopNostrDm, type NostrFeedPage } from '../lib/nostr-dm-store';
import { FEED_AT_ONCE, feedPage, feedPeople, feedRelays, morePosts, type FeedAnswer } from '../lib/nostr-feed';
import { FakeRelay } from './nostr-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).nostrChat === 'function';
if (!coreReady) console.log('Skipping the checks of the Nostr feed against relays: build the core first with node checks/build-core.mjs');

// Events as relays send them, checked here by their sig alone: "ok" passes.
let made = 0;
const key = (name: string) => toHex(new TextEncoder().encode(name.padEnd(32, '.')));
function event(pubkey: string, kind: number, at: number, content = '', tags: string[][] = []): NostrEvent {
  made += 1;
  return { id: made.toString(16).padStart(64, '0'), pubkey, created_at: at, kind, tags, content, sig: 'ok' };
}
const share = (pubkey: string, at: number, post: NostrEvent) => event(pubkey, 6, at, JSON.stringify(post), [['e', post.id], ['p', post.pubkey]]);
const check = async (e: NostrEvent) => e.sig === 'ok';
// What a relay keeping `events` sends for a page asked until `until`: the newest FEED_AT_ONCE, as NIP-01's limit asks.
function serve(events: NostrEvent[], until?: number): FeedAnswer {
  const sent = events.filter((e) => until === undefined || e.created_at <= until).sort((a, b) => b.created_at - a.created_at).slice(0, FEED_AT_ONCE);
  return { events: sent, full: sent.length >= FEED_AT_ONCE };
}

const ann = key('ann');
const bob = key('bob');
const carol = key('carol');
const now = 1_800_000_000_000;

test('a page is asked of the fixed relays for everyone, then of those that reach the most people not reached yet', () => {
  const [dan, erin] = [key('dan'), key('erin')];
  const writes = new Map([
    [ann, ['wss://one.example/', 'wss://two.example']],
    [bob, ['wss://one.example']],
    // Carol writes on a fixed relay: it reaches her already.
    [carol, ['wss://two.example', 'wss://fixed.example']],
    [dan, ['wss://three.example']],
    [erin, []],
  ]);
  const fixed = ['wss://fixed.example/', 'wss://other.example'];
  const follows = [ann, bob, carol, dan, erin];
  const plan = (most?: number) => feedRelays(follows, writes, fixed, most).map((r) => [r.url, r.authors.length === follows.length ? 'all' : r.authors]);
  // One reaches Ann and Bob, two only Ann then (Carol is reached), three Dan.
  assert.deepEqual(plan(), [
    ['wss://fixed.example', 'all'],
    ['wss://other.example', 'all'],
    ['wss://one.example', [ann, bob]],
    ['wss://three.example', [dan]],
  ]);
  assert.deepEqual(plan(1), plan().slice(0, 3));
  assert.deepEqual(plan(0), plan().slice(0, 2));
});

test('a page from what several relays sent: newest first, each event and each post once, checked', async () => {
  const p1 = event(ann, 1, 1100, 'the first');
  const p2 = event(bob, 1, 1105, 'Bob says');
  const p3 = event(ann, 1, 1103, 'as Ann wrote it', [['content-warning', 'birds']]);
  // A changed copy of it, come first, hides nothing.
  const forged = { ...p3, content: 'not as Ann wrote it', sig: 'bad' };
  const theirs = event(carol, 1, 1110, 'Carol is not followed');
  const ahead = event(ann, 1, Math.floor(now / 1000) + 3600, 'from the future');
  // Bob shares Ann's first post: it shows once, as his share, at its time.
  const shared = share(bob, 1108, p1);
  const forgedInside = share(bob, 1109, { ...p2, content: 'not what Bob said', sig: 'bad' });
  const notAPost = event(bob, 6, 1107, JSON.stringify(event(ann, 7, 1000, '+')));
  const answer = event(ann, 1, 1101, 'an answer', [['e', 'a'.repeat(64), '', 'reply']]);
  const one: FeedAnswer = { events: [forged, p1, theirs, ahead, shared, forgedInside, notAPost], full: false };
  const two: FeedAnswer = { events: [p1, p2, p3, answer, shared], full: false };
  const follows = new Set([ann, bob]);
  const page = await feedPage(follows, [one, two], [], undefined, now, check);
  assert.deepEqual(
    page.posts.map((p) => [p.text, p.by, p.sharedFrom ?? null, p.at / 1000, p.warning ?? null, p.answer ?? false]),
    [
      ['the first', bob, ann, 1108, null, false],
      ['Bob says', bob, null, 1105, null, false],
      ['as Ann wrote it', ann, null, 1103, 'birds', false],
      ['an answer', ann, null, 1101, null, true],
    ],
  );
  assert.deepEqual([page.posts[0].id, page.posts[0].note], [shared.id, p1.id]);
  // Nothing more: no relay sent as many as asked. The next page would go on from the oldest second shown.
  assert.deepEqual([page.until, page.older], [1101, false]);
  assert.deepEqual(feedPeople(page.posts), [bob, ann]);

  // Asked again until then, what shows already does not come twice, nor Ann's first post, shared above.
  const next = await feedPage(follows, [one, two], page.posts, page.until, now, check);
  assert.deepEqual([next.posts, next.until, next.older], [[], 1100, false]);
  // A page that brings a post shown already, under the posts shown, leaves it once.
  assert.deepEqual(morePosts(page.posts, [...page.posts.slice(1), page.posts[0]]).map((p) => p.id), page.posts.map((p) => p.id));
});

test('paging with until stops at what a relay that sent all it was asked for may still keep, and skips nothing', async () => {
  // Ann posts every two seconds, on a relay that keeps them all; Bob now and then, on another.
  const anns = Array.from({ length: 40 }, (_, i) => event(ann, 1, 2000 + 2 * i, `Ann ${i}`));
  const bobs = [2011, 2031, 2051].map((at) => event(bob, 1, at, `Bob ${at}`));
  const follows = new Set([ann, bob]);
  const first = await feedPage(follows, [serve(anns), serve(bobs)], [], undefined, now, check);
  // Ann's relay sent its newest thirty, down to 2020: Bob's 2011 cannot show before what it keeps under that.
  assert.equal(first.posts.length, FEED_AT_ONCE);
  assert.ok(first.posts.every((p) => p.at / 1000 >= 2020));
  assert.deepEqual([first.until, first.older], [2024, true]);
  const second = await feedPage(follows, [serve(anns, first.until), serve(bobs, first.until)], first.posts, first.until, now, check);
  assert.equal(second.older, false);
  const all = morePosts(first.posts, second.posts);
  assert.deepEqual(
    all.map((p) => p.text),
    [...anns, ...bobs].sort((a, b) => b.created_at - a.created_at).map((e) => e.content),
  );

  // A second with more posts than a page holds stops nothing: the next page asks before it.
  const crowd = Array.from({ length: FEED_AT_ONCE + 5 }, () => event(ann, 1, 3000, 'at once'));
  const full = await feedPage(follows, [serve(crowd)], [], undefined, now, check);
  assert.deepEqual([full.posts.length, full.until, full.older], [FEED_AT_ONCE, 3000, true]);
  const same = await feedPage(follows, [serve(crowd, 3000)], full.posts, 3000, now, check);
  assert.deepEqual([same.posts.length, same.until, same.older], [0, 2999, true]);
  const past = await feedPage(follows, [serve(crowd, 2999)], full.posts, 2999, now, check);
  assert.deepEqual([past.posts.length, past.older], [0, false]);
  // A relay cut short counts as full: the page stops at the oldest it sent.
  const cut = await feedPage(follows, [{ events: anns.slice(30), full: true }, serve(bobs)], [], undefined, now, check);
  assert.ok(cut.posts.every((p) => p.at / 1000 >= 2060));
  assert.equal(cut.older, true);
});

// The relays the space looks things up on, played here: the one that gathers lists keeps them, the
// others keep posts; those that gather lists besides are away. Ann writes on a relay of her own.
const relays = new Map<string, FakeRelay>();
const relay = (url: string) => {
  const one = new FakeRelay(url);
  relays.set(url, one);
  return one;
};
const index = relay(LOOKUP_RELAYS[0]);
const big = relay(LOOKUP_RELAYS[1]);
for (const url of LOOKUP_RELAYS.slice(2)) relay(url);
const annOutbox = relay('wss://outbox.ann.example');
const openFake: NostrOpen = async (url) => {
  const found = relays.get(url);
  if (!found) throw new Error(`No relay at ${url}`);
  return found.link();
};

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
  setNostrOpen(openFake);
});


after(() => {
  stopNostrDm();
  setNostrOpen(null);
  setCore(null);
});

async function until(done: () => boolean, what: string, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error(`Waited in vain for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

// The asks for posts each relay heard: the authors of each.
const postAsks = (r: FakeRelay) =>
  r.heard.filter((f) => f[0] === 'REQ').flatMap((f) => (f.slice(2) as Record<string, unknown>[]).filter((x) => JSON.stringify(x.kinds) === '[1,6]').map((x) => x.authors as string[]));

test("the posts of the people the space's key follows, from where they write, two pages, the names of those shown only", { skip: !coreReady }, async () => {
  const people: NostrDmState[] = await Promise.all([newNostrDm(), newNostrDm(), newNostrDm()]);
  const [a, b, c] = people;
  // 250 more it follows, who post nothing: their posts are asked in batches of 200 at most.
  const quiet = Array.from({ length: 250 }, () => toHex(randomBytes(32)));
  const start = Math.floor(Date.now() / 1000) - 3 * 24 * 3600;
  const at = (minute: number) => (start + minute * 60) * 1000;
  // Ann writes on her own relay, as her NIP-65 list says; Bob on a big public one, where he shares Ann's newest post.
  const annPosts = await Promise.all(Array.from({ length: 35 }, (_, i) => signed(a, 1, [], `Ann ${i}`, at(i))));
  const bobPosts = await Promise.all([20, 10, 2].map((m) => signed(b, 1, [], `Bob ${m}`, at(m) + 30_000)));
  const shared = await signed(b, 6, [['e', annPosts[34].id], ['p', a.public]], JSON.stringify(annPosts[34]), at(40));
  const carols = await signed(c, 1, [], 'Carol is not followed', at(41));
  annOutbox.events.push(...annPosts);
  big.events.push(...bobPosts, shared, carols);
  index.events.push(
    await signed(a, 10002, [['r', annOutbox.url, 'write'], ['r', 'wss://reads.ann.example', 'read']], '', at(0)),
    await signed(a, 0, [], JSON.stringify({ name: 'Ann' }), at(0)),
    await signed(b, 0, [], JSON.stringify({ display_name: 'Bob' }), at(0)),
    await signed(c, 0, [], JSON.stringify({ name: 'Carol' }), at(0)),
  );

  setCurrentSpace(11, randomBytes(32));
  try {
    runNostrDm();
    await until(() => nostrDmNow().loaded, 'the account to load');
    await nostrDmMake();
    const me = nostrDmNow().state!;
    // Following no one yet: it says so, and asks for no posts.
    const none = await nostrDmFeed();
    assert.deepEqual([none.posts, none.follows, none.answered, none.older], [[], 0, true, false]);
    assert.deepEqual(postAsks(big), []);

    index.events.push(await signed(me, 3, [['p', a.public], ['p', b.public], ...quiet.map((k) => ['p', k])], '', Date.now()));
    const first = await nostrDmFeed();
    assert.deepEqual([first.follows, first.answered, first.older, first.posts.length], [252, true, true, FEED_AT_ONCE]);
    // Bob's share of Ann's newest first, which does not show again as hers; Carol, not followed, not at all.
    assert.deepEqual(first.posts.slice(0, 3).map((p) => [p.text, p.by, p.sharedFrom ?? null]), [
      ['Ann 34', b.public, a.public],
      ['Ann 33', a.public, null],
      ['Ann 32', a.public, null],
    ]);
    assert.equal(first.posts.filter((p) => p.text === 'Ann 34').length, 1);
    assert.deepEqual(first.names, { [a.public]: 'Ann', [b.public]: 'Bob' });
    const second = await nostrDmFeed(first.until, first.posts);
    assert.equal(second.older, false);
    const all = morePosts(first.posts, second.posts);
    // Every post once, newest first, Ann's 34th as Bob's share.
    assert.deepEqual(
      all.map((p) => p.text),
      [shared, ...annPosts.slice(0, 34), ...bobPosts].sort((x, y) => y.created_at - x.created_at).map((e) => (e === shared ? 'Ann 34' : e.content)),
    );
    assert.deepEqual(second.names, { [a.public]: 'Ann', [b.public]: 'Bob' });

    // Ann's relay was asked for her posts alone; the fixed ones for everyone, 200 at most in each ask.
    assert.ok(postAsks(annOutbox).length >= 2);
    assert.ok(postAsks(annOutbox).every((authors) => authors.length === 1 && authors[0] === a.public));
    const asks = postAsks(big);
    assert.ok(asks.every((authors) => authors.length <= 200));
    assert.deepEqual(new Set(asks.slice(0, 2).flat()), new Set([a.public, b.public, ...quiet]));
    // Names and relay lists are asked of the relay that gathers them; names only of those shown, once.
    const nameAsks = [...relays.values()].flatMap((r) => r.heard.filter((f) => f[0] === 'REQ' && JSON.stringify((f[2] as Record<string, unknown>).kinds) === '[0]').map((f) => [r.url, (f[2] as { authors: string[] }).authors]));
    assert.deepEqual(nameAsks, [[index.url, [b.public, a.public]]]);
    assert.ok(!big.heard.some((f) => f[0] === 'REQ' && JSON.stringify((f[2] as Record<string, unknown>).kinds) === '[10002]' && (f[2] as { authors: string[] }).authors.length > 1));
    // Nothing of them is kept.
    const kept = JSON.stringify(nostrDmNow().state);
    assert.ok(!kept.includes('Ann 3') && !kept.includes('Bob') && !kept.includes(annOutbox.url));

    // Once the feed went, its next showing looks up the follow list again, as an older page then does too.
    const lists = () => index.heard.filter((f) => f[0] === 'REQ' && JSON.stringify((f[2] as Record<string, unknown>).kinds) === '[3,10002]').length;
    const before = lists();
    nostrDmFeedDone();
    await nostrDmFeed(first.until, first.posts);
    assert.equal(lists(), before + 1);
  } finally {
    stopNostrDm();
    setCurrentSpace(null);
  }
});

test('a relay that answers the follow list and then cannot be reached keeps the posts waiting no longer than its reach', { skip: !coreReady }, async () => {
  const [a, b] = await Promise.all([newNostrDm(), newNostrDm()]);
  const outbox = relay('wss://outbox.far.example');
  const at = Date.now() - 3600_000;
  outbox.events.push(await signed(a, 1, [], 'Far away', at));
  big.events.push(...(await Promise.all([1, 2].map((m) => signed(b, 1, [], `Near ${m}`, at + m * 60_000)))));
  index.events.push(await signed(a, 10002, [['r', outbox.url, 'write']], '', at), await signed(b, 0, [], JSON.stringify({ name: 'Bea' }), at));
  // The relay that gathers lists answers the follow list, then goes; through Tor, a new connection
  // to it never comes, nor says why.
  let listAsk = '';
  let away = false;
  setNostrOpen(async (url) => {
    if (url === index.url && away) return new Promise<never>(() => undefined);
    const link = await openFake(url);
    if (url !== index.url) return link;
    const watched: NostrLink = {
      ...link,
      async send(frame) {
        const filter = frame[2] as { kinds?: number[] } | undefined;
        if (frame[0] === 'REQ' && JSON.stringify(filter?.kinds) === '[3,10002]') listAsk = frame[1] as string;
        return link.send(frame);
      },
      async next(ms) {
        const frame = await link.next(ms);
        if (frame?.[0] === 'EOSE' && listAsk && frame[1] === listAsk) {
          away = true;
          setImmediate(() => index.drop());
        }
        return frame;
      },
    };
    return watched;
  });
  setCurrentSpace(12, randomBytes(32));
  try {
    runNostrDm();
    await until(() => nostrDmNow().loaded, 'the account to load');
    await nostrDmMake();
    const me = nostrDmNow().state!;
    index.events.push(await signed(me, 3, [['p', a.public], ['p', b.public]], '', Date.now()));
    // Time goes as the checks say: the waits for the relay that went pass at once.
    mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
    let page: NostrFeedPage | null = null;
    let failed: unknown = null;
    void nostrDmFeed().then(
      (got) => (page = got),
      (error) => (failed = error),
    );
    for (let step = 0; step < 3000 && !page && !failed; step++) {
      for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve));
      mock.timers.tick(100);
    }
    assert.equal(failed, null);
    assert.ok(away, 'the relay that gathers lists went');
    const got = page as NostrFeedPage | null;
    assert.ok(got, 'the page came');
    // Bea's posts from the big relay; where Ann writes was not found, so her relay was not asked.
    assert.deepEqual(got.posts.map((p) => p.text), ['Near 2', 'Near 1']);
    assert.deepEqual([got.follows, got.answered], [2, true]);
    assert.deepEqual(got.names, {});
    assert.equal(outbox.heard.length, 0);
  } finally {
    mock.timers.reset();
    setNostrOpen(openFake);
    stopNostrDm();
    setCurrentSpace(null);
  }
});
