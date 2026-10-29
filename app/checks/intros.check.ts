// Introducing two contacts (lib/intros.ts) with three chats and the real Rust core: nothing comes
// of it unless both say yes; the one who introduces passes on only the link the second gave; the
// first adds it, and the second's phone takes them at once, named as the one who introduced them
// named them. What did not ask, or comes from someone else, or comes again, does nothing.
// Skipped, with a note, when the core is not built (node checks/build-core.mjs).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { carriedOf, checkedIntro, toCarry, type Carried } from '../lib/chat-parts';
import { contactLink, parseContact } from '../lib/contact-code';
import { setCore, type Core } from '../lib/core';
import { randomBytes, toHex } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { addIntroduced, answerIntro, introCame, introduce, introsAsked, introsMade, takeIntro, type IntroSend } from '../lib/intros';
import { files } from './files-memory';
import './secure-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the introduction checks: build the core first with node checks/build-core.mjs');
}

const sender = () => toHex(randomBytes(24));
const at = { relay: '', relayKey: '' };
type Message = Extract<Received, { kind: 'message' }>;

type Phone = { e2e: E2E; from: string; link: string; id: string };

async function phone(space: number): Promise<Phone> {
  const e2e = await E2E.open('space', space, randomBytes(32));
  const from = sender();
  return { e2e, from, link: contactLink({ senderHex: from, relayUrl: 'ws://relay:7879', key: toBase64Url(e2e.bundle) }), id: e2e.identityHex() };
}

// `one` adds `other`'s link, `other` accepts; each names the other.
async function meet(one: Phone, other: Phone, names: [string, string]) {
  await one.e2e.addContact(parseContact(other.link)!, one.from);
  const [first] = one.e2e.pending();
  await other.e2e.receive(first.first);
  await one.e2e.firstSent(other.id);
  await other.e2e.acceptRequest(one.id);
  await one.e2e.rename(other.id, names[0]);
  await other.e2e.rename(one.id, names[1]);
}

// Seals what `from` sends `to` and opens it there, as the relay would bring it.
async function carry(from: Phone, to: Phone, text: string, more: Carried): Promise<Message> {
  const sealed = await from.e2e.seal(to.id, text, from.from, { more });
  const got = (await to.e2e.receive(sealed.packet)) as Message;
  assert.equal(got.kind, 'message');
  return got;
}

const t = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !ready }, async () => {
    files.clear();
    await fn();
  });

test('an introduction step keeps its shape, and goes with words only when it asks', () => {
  const i = 'ab'.repeat(16);
  assert.deepEqual(checkedIntro({ i, s: 'ask', n: '  Maria\n' , g: true }), { i, s: 'ask', n: 'Maria', g: true });
  assert.equal(checkedIntro({ i, s: 'ask' }), null);
  assert.equal(checkedIntro({ i: 'x', s: 'yes' }), null);
  assert.equal(checkedIntro({ i, s: 'go', l: 'erevos://contact?id=1' }), null);
  assert.equal(checkedIntro({ i, s: 'go', l: 'https://evil.example/', h: 'cd'.repeat(16) }), null);
  assert.deepEqual(checkedIntro({ i, s: 'yes', g: true, n: 'x' }), { i, s: 'yes' });
  const ask = { intro: { i, s: 'ask' as const, n: 'Maria' } };
  assert.deepEqual(toCarry(ask, true), ask);
  assert.deepEqual(toCarry(ask, false), {});
  const yes = { intro: { i, s: 'yes' as const } };
  assert.deepEqual(toCarry(yes, false), yes);
  assert.deepEqual(toCarry(yes, true), {});
  assert.deepEqual(carriedOf({ intro: { i, s: 'maybe' } }), {});
});

t('both say yes: the first adds the second, who takes them at once, named as introduced', async () => {
  const r = await phone(0);
  const a = await phone(1);
  const b = await phone(2);
  await meet(r, a, ['Anna', 'Rena']);
  await meet(r, b, ['Bob', 'Rena']);

  const [toA, toB] = await introduce(r.e2e, a.id, b.id);
  assert.match(toA.text, /Bob/);
  assert.match(toB.text, /Anna/);
  // Each sees the words, and the ask.
  const askA = await carry(r, a, toA.text, toA.more);
  assert.equal(askA.text, toA.text);
  assert.deepEqual(await introCame(a.e2e, r.id, askA.more.intro!, askA.request), { kind: 'asked', from: r.id, name: 'Bob' });
  const askB = await carry(r, b, toB.text, toB.more);
  await introCame(b.e2e, r.id, askB.more.intro!, askB.request);
  // Again, as a relay may bring it twice: kept once.
  assert.equal(await introCame(a.e2e, r.id, askA.more.intro!, false), null);
  assert.deepEqual(introsAsked(a.e2e, r.id).map((x) => x.name), ['Bob']);
  assert.deepEqual(introsAsked(b.e2e, r.id).map((x) => x.name), ['Anna']);

  // A says yes, with nothing to give; B says yes with its link and a secret.
  const i = askA.more.intro!.i;
  const yesA = await answerIntro(a.e2e, r.id, i, true, a.link);
  assert.deepEqual(yesA.more, { intro: { i, s: 'yes' } });
  const yesB = await answerIntro(b.e2e, r.id, i, true, b.link);
  assert.equal(yesB.more.intro?.l, b.link);
  assert.match(yesB.more.intro?.h ?? '', /^[0-9a-f]{32}$/);
  assert.deepEqual(introsAsked(a.e2e, r.id), []);
  await assert.rejects(answerIntro(a.e2e, r.id, i, true, a.link));

  // R: the first yes changes nothing yet; the second gives A the link.
  const gotA = await carry(a, r, '', yesA.more);
  assert.equal(await introCame(r.e2e, a.id, gotA.more.intro!, gotA.request), null);
  assert.equal(introsMade(r.e2e, a.id)[0].ya, true);
  const gotB = await carry(b, r, '', yesB.more);
  const sent: IntroSend[] = [];
  await takeIntro(r.e2e, b.id, gotB.more.intro!, gotB.request, async (m) => void sent.push(m), r.from, at);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, a.id);
  assert.deepEqual(sent[0].more.intro, { i, s: 'go', l: b.link, h: yesB.more.intro!.h });
  assert.equal(introsMade(r.e2e, b.id)[0].end, 'went');
  // What R keeps no longer holds the link.
  assert.ok(!JSON.stringify(r.e2e.intros()).includes(b.link));

  // A adds B, saying the secret back; B takes A at once, named as R named them.
  const go = await carry(r, a, '', sent[0].more);
  const came = await introCame(a.e2e, r.id, go.more.intro!, go.request);
  assert.equal(came?.kind, 'add');
  const bobId = await addIntroduced(a.e2e, came as Extract<typeof came, { kind: 'add' }>, a.from, at);
  assert.equal(bobId, b.id);
  assert.equal(a.e2e.contacts().find((c) => c.identity === b.id)?.name, 'Bob');
  const [first] = a.e2e.pending().filter((p) => p.identity === b.id);
  const hello = (await b.e2e.receive(first.first)) as Message;
  assert.equal(hello.identity, a.id);
  const anna = b.e2e.contacts().find((c) => c.identity === a.id);
  assert.equal(anna?.request, false);
  assert.equal(anna?.name, 'Anna');
  // The same 'go' again adds nothing more.
  assert.equal(await introCame(a.e2e, r.id, go.more.intro!, false), null);
});

t('without both yeses nothing goes; a no, a stranger, someone else\'s link and a go not asked for do nothing', async () => {
  const r = await phone(0);
  const a = await phone(1);
  const b = await phone(2);
  const m = await phone(3);
  await meet(r, a, ['Anna', 'Rena']);
  await meet(r, b, ['Bob', 'Rena']);
  await meet(r, m, ['Mallory', 'Rena']);

  // Names are needed: each sees the one given the other.
  await r.e2e.rename(b.id, '');
  await assert.rejects(introduce(r.e2e, a.id, b.id), /name/);
  await r.e2e.rename(b.id, 'Bob');
  await assert.rejects(introduce(r.e2e, a.id, a.id));

  const [toA, toB] = await introduce(r.e2e, a.id, b.id);
  const i = toA.more.intro!.i;
  await introCame(a.e2e, r.id, toA.more.intro!, false);
  await introCame(b.e2e, r.id, toB.more.intro!, false);

  // A 'go' to A before A said yes is dropped.
  assert.equal(await introCame(a.e2e, r.id, { i, s: 'go', l: b.link, h: 'cd'.repeat(16) }, false), null);
  // Nor does anyone but R give one: Mallory is a contact of A here.
  await meet(m, a, ['Anna', 'Mallory']);
  await answerIntro(a.e2e, r.id, i, true, a.link);
  assert.equal(await introCame(a.e2e, m.id, { i, s: 'go', l: m.link, h: 'cd'.repeat(16) }, false), null);
  // An ask from a message request is dropped.
  assert.equal(await introCame(a.e2e, r.id, { i: 'ef'.repeat(16), s: 'ask', n: 'X' }, true), null);

  // B's yes with someone else's link is no yes.
  assert.equal(await introCame(r.e2e, b.id, { i, s: 'yes', l: m.link, h: 'cd'.repeat(16) }, false), null);
  assert.equal(introsMade(r.e2e, b.id)[0].yb, false);
  // Someone not asked answers nothing.
  assert.equal(await introCame(r.e2e, m.id, { i, s: 'yes', l: m.link, h: 'cd'.repeat(16) }, false), null);

  // A said yes; B says no: it ends, and nothing goes to A.
  await introCame(r.e2e, a.id, { i, s: 'yes' }, false);
  const no = await answerIntro(b.e2e, r.id, i, false, b.link);
  assert.deepEqual(no.more, { intro: { i, s: 'no' } });
  // B's no gives no secret: nothing waits on B's phone for A.
  assert.equal(await introCame(r.e2e, b.id, no.more.intro!, false), null);
  assert.equal(introsMade(r.e2e, a.id)[0].end, 'no');
  // A late yes of B changes nothing now.
  assert.equal(await introCame(r.e2e, b.id, { i, s: 'yes', l: b.link, h: 'cd'.repeat(16) }, false), null);
  assert.equal(a.e2e.contacts().some((c) => c.identity === b.id), false);
});
