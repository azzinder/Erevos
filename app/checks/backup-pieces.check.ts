// A backup's password in pieces with friends: Shamir's secret sharing over GF(256) (lib/shamir.ts)
// and the pieces made of it (lib/backup-pieces.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { carriedOf, toCarry } from '../lib/chat-parts';
import { contactLink, parseContact } from '../lib/contact-code';
import { setCore, type Core } from '../lib/core';
import { randomBytes, setHardCost, setPbkdf2, sha256Bytes, toHex, webCryptoPbkdf2 } from '../lib/crypto';
import { backupKey, isBackupPassword } from '../lock/backup';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { dropPiecesBack, givePieceBack, givePieces, heldPieces, keepPieceFrom, pieceToGo, pieceWent, piecesBack } from '../lib/pieces-kept';
import type { Message as Kept } from '../lock/history';
import { files } from './files-memory';
import './secure-memory';
import { makePieces, NotAPieceError, packSecret, pieceSet, PiecesDoNotFitError, piecesIn, PREFIX, putTogether, readPiece, SECRET, SPLITS, TooFewPiecesError, unpackSecret } from '../lib/backup-pieces';
import { combine, div, mul, split, type Share } from '../lib/shamir';

// Every way of choosing `k` of `items`.
function choices<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...choices(rest, k - 1).map((c) => [first, ...c]), ...choices(rest, k)];
}

// GF(256) multiplied the slow way, bit by bit, modulo 0x11b: what the tables must agree with.
function slowMul(a: number, b: number): number {
  let out = 0;
  for (let i = 0; i < 8; i++) {
    if (b & (1 << i)) out ^= a << i;
  }
  for (let bit = 14; bit >= 8; bit--) if (out & (1 << bit)) out ^= 0x11b << (bit - 8);
  return out;
}

test('GF(256): the tables multiply as the field does, and divide back', () => {
  for (let a = 0; a < 256; a++) {
    for (let b = 0; b < 256; b++) {
      assert.equal(mul(a, b), slowMul(a, b), `${a} × ${b}`);
      if (b !== 0) assert.equal(mul(div(a, b), b), a, `${a} ÷ ${b} × ${b}`);
    }
  }
  assert.throws(() => div(1, 0));
  // AES's own example: 0x57 × 0x83 = 0xc1.
  assert.equal(mul(0x57, 0x83), 0xc1);
});

test('Shamir: every k of n shares give the secret back, for every split offered and more', () => {
  for (const [k, n] of [...SPLITS.map(({ k, n }) => [k, n]), [2, 2], [4, 7], [5, 8]]) {
    for (let round = 0; round < 3; round++) {
      const secret = randomBytes(1 + Math.floor(Math.random() * 64));
      const shares = split(secret, k, n, randomBytes);
      assert.equal(shares.length, n);
      assert.deepEqual(
        shares.map((s) => s.x),
        Array.from({ length: n }, (_, i) => i + 1),
      );
      for (const chosen of choices(shares, k)) {
        assert.deepEqual(combine(chosen), secret, `${k} of ${n}, x ${chosen.map((s) => s.x)}`);
        // In any order.
        assert.deepEqual(combine([...chosen].reverse()), secret);
      }
      // More than k give it too: the polynomial is the same.
      assert.deepEqual(combine(shares), secret);
      // k - 1 give something else: the polynomial through them and 0 is another one.
      for (const chosen of choices(shares, k - 1)) {
        if (chosen.length < 2) continue;
        assert.notDeepEqual(combine(chosen), secret);
      }
    }
  }
});

test('Shamir: one share, or k - 1, says nothing of the secret: each value comes as often for every secret', () => {
  // With k = 2, share x is a1·x + s: for each secret byte s, the 256 coefficients a1 give each
  // value at x once. With k = 3, the 65536 pairs of coefficients give each pair of values at two
  // xs once. So what k - 1 shares hold is uniform, whatever the secret.
  const counter = (k: number, s: number, xs: number[]) => {
    const seen = new Map<string, number>();
    const total = 256 ** (k - 1);
    for (let c = 0; c < total; c++) {
      const coefficients = Uint8Array.from({ length: k - 1 }, (_, i) => (c >> (8 * i)) & 255);
      const shares = split(new Uint8Array([s]), k, Math.max(k, ...xs), () => coefficients.slice());
      const key = xs.map((x) => shares[x - 1].y[0]).join(',');
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return seen;
  };
  for (const s of [0, 1, 0x5a, 255]) {
    for (const x of [1, 2, 3, 200]) {
      const seen = counter(2, s, [x]);
      assert.equal(seen.size, 256, `k 2, secret ${s}, x ${x}`);
      assert.ok([...seen.values()].every((count) => count === 1));
    }
  }
  for (const s of [0, 0xc3]) {
    const seen = counter(3, s, [1, 2]);
    assert.equal(seen.size, 65536, `k 3, secret ${s}`);
    assert.ok([...seen.values()].every((count) => count === 1));
  }
});

test('Shamir: refuses what cannot be shares', () => {
  const shares = split(new Uint8Array([1, 2, 3]), 2, 3, randomBytes);
  assert.throws(() => split(new Uint8Array([1]), 1, 3, randomBytes));
  assert.throws(() => split(new Uint8Array([1]), 4, 3, randomBytes));
  assert.throws(() => split(new Uint8Array([1]), 2, 256, randomBytes));
  assert.throws(() => split(new Uint8Array(0), 2, 3, randomBytes));
  assert.throws(() => combine([shares[0]]));
  assert.throws(() => combine([shares[0], shares[0]]));
  assert.throws(() => combine([shares[0], { x: 0, y: shares[1].y } as Share]));
  assert.throws(() => combine([shares[0], { x: 2, y: new Uint8Array(2) }]));
});

const SERVER = { url: 'https://cloud.example/remote.php/dav/files/me/Backups/', user: 'me', password: 'app-password-123' };

test('Pieces: every k of n put together give the password and server back; k - 1 do not', () => {
  for (const { k, n } of SPLITS) {
    for (const server of [null, SERVER]) {
      const password = 'correct horse battery stáple ✓';
      const pieces = makePieces({ password, server }, k, n);
      assert.equal(pieces.length, n);
      for (const chosen of choices(pieces, k)) assert.deepEqual(putTogether(chosen), { password, server });
      assert.deepEqual(putTogether(pieces), { password, server });
      for (const chosen of choices(pieces, k - 1)) {
        assert.throws(
          () => putTogether(chosen),
          (error: unknown) => error instanceof TooFewPiecesError && error.have === k - 1 && error.need === k,
        );
      }
    }
  }
});

test('Pieces: their size and look tell nothing of the password, the server or whose they are', () => {
  const short = makePieces({ password: 'abcd', server: null }, 2, 3);
  const long = makePieces({ password: 'x'.repeat(150), server: SERVER }, 3, 5);
  const lengths = new Set([...short, ...long].map((p) => p.length));
  assert.equal(lengths.size, 1);
  // A new set id each time, even for the same password: two splits are not linked by it.
  const again = makePieces({ password: 'abcd', server: null }, 2, 3);
  assert.notEqual(pieceSet(short[0]), pieceSet(again[0]));
  assert.equal(pieceSet(short[0]), pieceSet(short[2]));
  // The secret split is always SECRET bytes, whatever it holds.
  assert.equal(packSecret({ password: 'a', server: null }).length, SECRET);
  assert.equal(packSecret({ password: 'b'.repeat(200), server: SERVER }).length, SECRET);
  assert.throws(() => packSecret({ password: 'b'.repeat(201), server: null }));
  assert.throws(() => packSecret({ password: '', server: null }));
  assert.throws(() => packSecret({ password: 'a'.repeat(100), server: { ...SERVER, url: `https://x/${'y'.repeat(300)}` } }));
  // Only pieces made of the same split go together.
  assert.equal(unpackSecret(packSecret({ password: 'abcd', server: null }))?.password, 'abcd');
});

test('Pieces: one mistyped is refused, one forged or from another split does no harm with enough others', () => {
  const pieces = makePieces({ password: 'hunter22', server: null }, 2, 3);
  // A letter changed: its own hash says so.
  const letters = pieces[0].slice(PREFIX.length);
  const swapped = PREFIX + letters.slice(0, 10) + (letters[10] === 'A' ? 'B' : 'A') + letters.slice(11);
  assert.throws(() => readPiece(swapped), NotAPieceError);
  assert.throws(() => readPiece(PREFIX + letters.slice(0, 100)), NotAPieceError);
  assert.throws(() => readPiece(pieces[0].replace(PREFIX, 'something:')), NotAPieceError);
  assert.throws(() => putTogether([pieces[0], `${pieces[1]}x`]), NotAPieceError);

  // Forged: its share changed, its hash made anew, as a friend could. With exactly k, the secret's
  // own check says they do not fit; with more, the others give it.
  const forged = (() => {
    const piece = readPiece(pieces[1]);
    const y = piece.y.slice();
    y[0] ^= 1;
    const body = new Uint8Array(3 + 8 + SECRET + 4);
    body[0] = 1;
    body[1] = piece.k;
    body[2] = piece.x;
    body.set(Buffer.from(piece.set, 'hex'), 3);
    body.set(y, 11);
    body.set(sha256Bytes(body.subarray(0, body.length - 4)).subarray(0, 4), body.length - 4);
    return PREFIX + Buffer.from(body).toString('base64url');
  })();
  readPiece(forged);
  assert.throws(() => putTogether([pieces[0], forged]), PiecesDoNotFitError);
  // Two pieces with the same x and different shares: one of them is not what it says.
  assert.throws(() => putTogether([pieces[0], pieces[1], forged]), PiecesDoNotFitError);
  // A piece of another split among them: the split with the most pieces is used.
  const other = makePieces({ password: 'another one', server: null }, 2, 3);
  assert.equal(putTogether([other[0], pieces[0], pieces[2]]).password, 'hunter22');
  // Pieces of an older split with a newer one: the newer, with enough, wins.
  assert.throws(() => putTogether([other[0], pieces[0]]), TooFewPiecesError);
  // The same piece twice counts once.
  assert.throws(() => putTogether([pieces[0], pieces[0]]), TooFewPiecesError);
});

test('Pieces: found in a message or in what was pasted', () => {
  const pieces = makePieces({ password: 'hunter22', server: null }, 2, 3);
  assert.deepEqual(piecesIn(`A piece of my backup password, for you to keep.\n\n${pieces[0]}`), [pieces[0]]);
  assert.deepEqual(piecesIn(`${pieces[0]}\n${pieces[1]} ${pieces[0]}`), [pieces[0], pieces[1]]);
  assert.deepEqual(piecesIn(`${pieces[0]}x`), []);
  assert.deepEqual(piecesIn('nothing here erevos-piece:abc'), []);
});

// With three friends' chats and the real Rust core: pieces go beside words that never hold them,
// are kept by each friend apart from the chat, nothing of them stays on the giver's phone once
// they went, and given back they put the password together again. Skipped, with a note, when the
// core is not built (node checks/build-core.mjs).
const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the backup pieces chat checks: build the core first with node checks/build-core.mjs');
}

type Phone = { e2e: E2E; from: string; link: string; id: string; chat: Kept[]; space: number; key: Uint8Array };
type Came = Extract<Received, { kind: 'message' }>;

async function phone(space: number): Promise<Phone> {
  const key = randomBytes(32);
  const e2e = await E2E.open('space', space, key);
  const from = toHex(randomBytes(24));
  return { e2e, from, link: contactLink({ senderHex: from, relayUrl: 'ws://relay:7879', key: toBase64Url(e2e.bundle) }), id: e2e.identityHex(), chat: [], space, key };
}

async function meet(one: Phone, other: Phone, accept = true) {
  await one.e2e.addContact(parseContact(other.link)!, one.from);
  const [first] = one.e2e.pending();
  await other.e2e.receive(first.first);
  await one.e2e.firstSent(other.id);
  if (accept) await other.e2e.acceptRequest(one.id);
}

// What waits in `from`'s chats goes as lib/waiting.ts sends it: words, and its piece beside them.
async function sendWaiting(from: Phone, phones: Phone[]): Promise<Came[]> {
  const came: Came[] = [];
  for (const m of from.chat.splice(0)) {
    const to = phones.find((p) => `contact:${p.id}` === m.peer)!;
    const sealed = await from.e2e.seal(to.id, m.text, from.from, { tag: m.tag, more: pieceToGo(from.e2e, m.tag) });
    await pieceWent(from.e2e, m.tag);
    const got = (await to.e2e.receive(sealed.packet)) as Came;
    assert.equal(got.kind, 'message');
    if (got.more.piece) await keepPieceFrom(to.e2e, from.id, got.more.piece, got.request);
    came.push(got);
  }
  return came;
}

const chatOf = (p: Phone) => ({ add: async (m: Kept) => void p.chat.push(m) });

test('a piece is carried only beside words, and only whole', () => {
  const [piece] = makePieces({ password: 'abcd', server: null }, 2, 3);
  assert.deepEqual(carriedOf({ piece }), { piece });
  assert.deepEqual(carriedOf({ piece: `${piece}x` }), {});
  assert.deepEqual(carriedOf({ piece: 'erevos-piece:abc' }), {});
  assert.deepEqual(toCarry({ piece }, true), { piece });
  assert.deepEqual(toCarry({ piece }, false), {});
});

test('pieces go to three friends, are kept by each, and given back put the password together', { skip: !ready }, async () => {
  files.clear();
  const owner = await phone(0);
  const friends = [await phone(1), await phone(2), await phone(3)];
  for (const friend of friends) await meet(owner, friend);
  const password = 'a long backup password';
  const given = await givePieces({ e2e: owner.e2e, history: chatOf(owner) }, { password, server: null }, 2, friends.map((f) => f.id));
  assert.deepEqual([given.k, given.n], [2, 3]);
  // Waiting in the chats, words only: no piece in the words, nor anywhere in the chat kept.
  assert.equal(owner.chat.length, 3);
  for (const m of owner.chat) {
    assert.equal(m.mark, -1);
    assert.deepEqual(piecesIn(JSON.stringify(m)), []);
  }
  assert.equal(owner.e2e.pieces().out?.length, 3);
  const came = await sendWaiting(owner, friends);
  for (const got of came) {
    assert.match(got.text, /piece of my Erevos backup password/);
    assert.deepEqual(piecesIn(got.text), []);
  }
  // Once they went, the giver's phone keeps no piece at all: only to whom, and the split.
  assert.deepEqual(piecesIn(JSON.stringify(owner.e2e.pieces())), []);
  assert.deepEqual(owner.e2e.pieces().given?.[0].to, friends.map((f) => f.id));
  // Each friend keeps one, from the owner, each a different one.
  const pieces = friends.map((f) => heldPieces(f.e2e));
  for (const kept of pieces) {
    assert.equal(kept.length, 1);
    assert.equal(kept[0].from, owner.id);
  }
  assert.equal(new Set(pieces.map((k) => k[0].p)).size, 3);
  // The same message again keeps it once.
  await keepPieceFrom(friends[0].e2e, owner.id, pieces[0][0].p, false);
  assert.equal(heldPieces(friends[0].e2e).length, 1);
  // Kept when the chat is opened anew, as on the next start.
  const reopened = await E2E.open('space', friends[0].space, friends[0].key);
  assert.equal(reopened.identityHex(), friends[0].id);
  assert.deepEqual(heldPieces(reopened), heldPieces(friends[0].e2e));

  // Two give theirs back: the owner keeps them as its own, and they put the password together.
  for (const friend of friends.slice(0, 2)) {
    await givePieceBack({ e2e: friend.e2e, history: chatOf(friend) }, heldPieces(friend.e2e)[0]);
    assert.deepEqual(piecesIn(JSON.stringify(friend.chat)), []);
    await sendWaiting(friend, [owner]);
  }
  assert.equal(piecesBack(owner.e2e).length, 2);
  assert.deepEqual(heldPieces(owner.e2e), []);
  assert.equal(putTogether(piecesBack(owner.e2e)).password, password);
  await dropPiecesBack(owner.e2e);
  assert.deepEqual(piecesBack(owner.e2e), []);
});

test('a piece from a message request, or from someone not a contact, is not kept', { skip: !ready }, async () => {
  files.clear();
  const stranger = await phone(0);
  const me = await phone(1);
  await meet(stranger, me, false);
  const [piece] = makePieces({ password: 'abcd', server: null }, 2, 3);
  const sealed = await stranger.e2e.seal(me.id, 'keep this', stranger.from, { more: { piece } });
  const got = (await me.e2e.receive(sealed.packet)) as Came;
  assert.equal(got.request, true);
  assert.equal(await keepPieceFrom(me.e2e, stranger.id, got.more.piece!, got.request), null);
  assert.equal(await keepPieceFrom(me.e2e, 'ab'.repeat(32), piece, false), null);
  assert.deepEqual(heldPieces(me.e2e), []);
});

test('the password typed for pieces is checked against automatic backups, when they are on', async () => {
  setHardCost({ m: 64, t: 1 });
  setPbkdf2(webCryptoPbkdf2()!);
  for (const kept of [await backupKey('the right password', randomBytes(16), 1000), await backupKey('the right password', randomBytes(16), 1000, null)]) {
    assert.equal(await isBackupPassword('the right password', kept), true);
    assert.equal(await isBackupPassword('the wrong password', kept), false);
  }
});
