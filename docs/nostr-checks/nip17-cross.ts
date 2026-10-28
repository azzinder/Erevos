// Erevos's Nostr chats (app/lib/nostr-dm.ts, with the real core built to WebAssembly) against
// nostr-tools, the library many Nostr apps are built on: a message Erevos wraps opens there, as the
// reader's and as the sender's copy; one nostr-tools wraps opens here; npub, nsec and nprofile read
// the same both ways; the inbox list (kind 10050), the name (kind 0) and the answer to a relay that
// asks who reads (kind 22242) are signed as it checks them. Prints each step, and stops at the first
// that fails. nostr-tools is not part of the app: install it in a folder of its own first.
// Usage, from app/: node --import ./checks/register.mjs ../docs/nostr-checks/nip17-cross.ts /path/to/node_modules/nostr-tools
/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { setCore, type Core } from '../../app/lib/core';
import { authEvent, chatCore, inboxEvent, newNostrDm, npubOf, profileEvent, readKey, takeWrap, wrapText } from '../../app/lib/nostr-dm';

const require = createRequire(import.meta.url);
const where = process.argv[2];
if (!where) throw new Error('Name the nostr-tools folder: …/node_modules/nostr-tools');
const tools = (await import(join(where, 'lib/esm/index.js'))) as Record<string, any>;
const nip17 = (await import(join(where, 'lib/esm/nip17.js'))) as Record<string, any>;
const { getPublicKey, generateSecretKey, verifyEvent, nip19 } = tools;

const wasm = require(new URL('../../app/checks/.core/erevos_ffi.js', import.meta.url).pathname) as Record<string, (...args: never[]) => unknown>;
setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const unhex = (text: string) => Uint8Array.from(Buffer.from(text, 'hex'));
const step = (what: string) => console.log(`ok  ${what}`);

const alice = await newNostrDm();
const bobSecret: Uint8Array = generateSecretKey();
const bobPublic: string = getPublicKey(bobSecret);
assert.equal(getPublicKey(unhex(alice.secret)), alice.public);
step('the key Erevos makes has the public key nostr-tools finds for it');

const npub = (await chatCore<{ npub: string }>('npub', { public: alice.public })).npub;
assert.equal(npub, nip19.npubEncode(alice.public));
assert.equal(npubOf(bobPublic), nip19.npubEncode(bobPublic));
assert.equal((await readKey(nip19.npubEncode(bobPublic))).public, bobPublic);
const nsec = (await chatCore<{ nsec: string }>('nsec', { secret: alice.secret })).nsec;
assert.equal(hex(nip19.decode(nsec).data), alice.secret);
assert.equal((await readKey(nip19.nsecEncode(bobSecret))).secret, hex(bobSecret));
const relays = ['wss://inbox.alice.example', 'wss://relay.example.org'];
const nprofile = (await chatCore<{ nprofile: string }>('nprofile', { public: alice.public, relays })).nprofile;
assert.deepEqual(nip19.decode(nprofile).data, { pubkey: alice.public, relays });
assert.deepEqual(await readKey(nip19.nprofileEncode({ pubkey: bobPublic, relays })), { type: 'nprofile', public: bobPublic, relays });
step('npub, nsec and nprofile read the same both ways');

const text = 'Γεια σου Bob 👋 — from Erevos';
const sent = await wrapText(alice, bobPublic, text);
const opened = nip17.unwrapEvent(sent.theirs, bobSecret);
assert.equal(opened.kind, 14);
assert.equal(opened.pubkey, alice.public);
assert.equal(opened.content, text);
assert.deepEqual(opened.tags, [['p', bobPublic]]);
assert.ok(verifyEvent(sent.theirs));
assert.notEqual(sent.theirs.pubkey, alice.public);
step('a message Erevos wraps opens in nostr-tools, from Alice, and its wrap is signed by a key of its own');

const copy = nip17.unwrapEvent(sent.ours, unhex(alice.secret));
assert.equal(copy.content, text);
assert.equal(copy.id, opened.id);
step("Alice's own copy opens there too, the same message");

const answer = 'Hi Alice, from nostr-tools ✓';
const wrap = nip17.wrapEvent(bobSecret, { publicKey: alice.public }, answer);
assert.equal(await takeWrap(alice, wrap), bobPublic);
const got = alice.chats[bobPublic].messages.at(-1)!;
assert.equal(got.text, answer);
assert.equal(got.mine, false);
step('a message nostr-tools wraps opens in Erevos, from Bob');

const forged = nip17.wrapEvent(bobSecret, { publicKey: alice.public }, 'not me');
const tampered = { ...forged, content: forged.content.slice(0, -8) + 'AAAAAAA=' };
assert.equal(await takeWrap(alice, tampered).catch(() => null), null);
step('a wrap changed on the way is let be');

alice.inbox = relays;
alice.name = 'Alice';
for (const event of [await inboxEvent(alice), await profileEvent(alice), await authEvent(alice, relays[0], 'challenge-1')]) {
  assert.ok(verifyEvent(event), `kind ${event.kind}`);
  assert.equal(event.pubkey, alice.public);
}
step('the inbox list, the name and the answer to a relay asking who reads are signed as nostr-tools checks them');
console.log('All the same as nostr-tools.');
