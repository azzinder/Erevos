// Invites to a relay (lib/relay-invite.ts, lib/relay.ts, crates/erevos-relay/src/invites.rs): the
// link in the QR code, its hand-off to the chat of the space it was opened in, and making, taking,
// listing and taking back invites against a real relay with a file of phones' tokens, where a phone
// let in by an invite goes with the phone that invited it. The relay part is skipped, with a note,
// when the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { ready, relayNote, startRelay } from './real-relay';
import {
  createQueue,
  listInvites,
  makeInvite,
  newPhoneToken,
  receiveMessage,
  redeemInvite,
  RelayError,
  relayPath,
  RelaySession,
  sendMessage,
  takeBackInvite,
  type Relay,
} from '../lib/relay';
import { checkInvite, inviteLink, offerInvite, onInviteOffered, parseInvite, type Invite } from '../lib/relay-invite';

relayNote('the relay invite checks');

const code = 'ab'.repeat(32);
const sha = (token: string) => createHash('sha256').update(token).digest('hex');

test('an invite goes in a link and comes out of it whole', () => {
  const invite = { relayUrl: 'wss://relay.example.org/erevos', code };
  const link = inviteLink(invite);
  assert.ok(link.startsWith('erevos://relay-invite?relay=wss%3A%2F%2Frelay.example.org%2Ferevos&code='));
  assert.deepEqual(parseInvite(link), invite);
  assert.deepEqual(parseInvite(`  ${link.replace(code, code.toUpperCase())}\n`), invite, 'spaces round it and capitals read');
  assert.deepEqual(checkInvite(' ws://10.0.0.2:7879 ', code), { relayUrl: 'ws://10.0.0.2:7879', code });
});

test('an invite names a wss:// relay, or a ws:// one on this computer or a private network only', () => {
  for (const relay of [
    'wss://relay.example.org',
    'wss://203.0.113.5:7879',
    'ws://192.168.178.29:7879',
    'ws://10.0.0.2:7879/erevos',
    'ws://172.16.0.1:7879',
    'ws://172.31.255.254',
    'ws://169.254.1.1',
    'ws://127.0.0.1:7879',
    'ws://localhost:7879',
    'ws://[::1]:7879',
    'ws://[fd12:3456::1]:7879',
    'ws://[fe80::1]',
  ]) {
    assert.deepEqual(checkInvite(relay, code), { relayUrl: relay, code }, relay);
  }
  for (const relay of [
    'ws://relay.example.org',
    'ws://203.0.113.5:7879',
    'ws://172.32.0.1',
    'ws://192.169.1.1',
    'ws://10.0.0.2.example.org',
    'ws://dell:7879',
    'ws://[2001:db8::1]',
    'ws://[fc::1]',
    'ws://user@10.0.0.2',
  ]) {
    assert.equal(checkInvite(relay, code), null, relay);
  }
});

test('a link that is not an invite reads as none', () => {
  const link = inviteLink({ relayUrl: 'wss://relay.example.org', code });
  for (const text of [
    '',
    'hello',
    link.replace('relay-invite', 'contact'),
    link.replace(code, code.slice(2)),
    link.replace(code, `${code.slice(2)}zz`),
    link.replace('wss%3A', 'https%3A'),
    'erevos://relay-invite?code=' + code,
    'erevos://relay-invite?relay=wss%3A%2F%2Frelay.example.org',
    'erevos://relay-invite?relay=%E0%A4%A&code=' + code,
  ]) {
    assert.equal(parseInvite(text), null, text);
  }
  assert.equal(checkInvite(undefined, code), null);
  assert.equal(checkInvite(['wss://a.example'], code), null);
});

test('an invite goes to the chat of the space it was opened in, and to no other', () => {
  const invite: Invite = { relayUrl: 'wss://relay.example.org', code };
  const got: string[] = [];
  // Opened while no chat is open: it waits, for its own space only.
  offerInvite(invite, 2);
  const stop1 = onInviteOffered(1, () => got.push('space 1'));
  stop1();
  assert.equal(got.length, 0, 'another space never takes it');
  offerInvite(invite, 2);
  const stop2 = onInviteOffered(2, (taken) => got.push(`space 2 ${taken.code === code}`));
  assert.deepEqual(got, ['space 2 true']);
  // While that chat is open it takes the next at once; once it closes, nothing does.
  offerInvite(invite, 2);
  assert.deepEqual(got, ['space 2 true', 'space 2 true']);
  stop2();
  offerInvite(invite, 3);
  const stop3 = onInviteOffered(2, () => got.push('space 2 again'));
  stop3();
  assert.equal(got.length, 2);
});

// A relay with its own token and a file of phones' tokens, which invites: Alice has a line.
let folder = '';
let file = '';
let url = '';
const alicesToken = newPhoneToken();
let alice: Relay = { url: '' };

before(async () => {
  if (!ready) return;
  folder = mkdtempSync(join(tmpdir(), 'erevos-relay-invites-'));
  file = join(folder, 'phones.tokens');
  writeFileSync(file, `# The phones of this relay\n${sha(alicesToken)} alice\n`);
  url = await startRelay(false, 'shared token', false, { EREVOS_RELAY_TOKENS: file, EREVOS_RELAY_INVITES: 'on' });
  alice = { url, token: alicesToken };
});

after(() => {
  if (folder) rmSync(folder, { recursive: true, force: true });
});

const refused = (status: number) => (error: unknown) => error instanceof RelayError && error.status === status;
const lets = async (relay: Relay) =>
  RelaySession.open(relay).then(
    (session) => (session.close(), true),
    () => false,
  );

test('a phone invites one more, which makes its own token and uses the relay with it', { skip: !ready }, async () => {
  assert.deepEqual(await listInvites(alice), []);
  const made = await makeInvite(alice, 'Μαρία Π.');
  assert.ok(made && /^[0-9a-f]{64}$/.test(made.code));
  assert.ok(Math.abs(made.expires - (Date.now() + 7 * 24 * 3600 * 1000)) < 60_000, 'lasts 7 days');
  const waiting = await listInvites(alice);
  assert.equal(waiting?.length, 1);
  assert.equal(waiting![0].name, 'maria-p');
  assert.equal(waiting![0].used, 0);

  const taken = await redeemInvite(url, made.code);
  assert.equal(taken.name, 'maria-p');
  assert.match(taken.token, /^[0-9a-f]{64}$/);
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(readFileSync(file, 'utf8').includes(`${sha(taken.token)} maria-p # invited by alice on ${today}\n`), 'its line, with whose invite it was');
  assert.ok(readFileSync(file, 'utf8').startsWith(`# The phones of this relay\n${sha(alicesToken)} alice\n`), 'the rest of the file as it was');
  assert.ok(!readFileSync(file, 'utf8').includes(taken.token), 'the relay holds no token');

  // Its token is a token of its own: it makes a queue, sends, and may invite too.
  const maria: Relay = { url, token: taken.token };
  const queue = await createQueue(maria);
  await sendMessage(alice, queue.senderId, new TextEncoder().encode('welcome'));
  assert.deepEqual(new TextDecoder().decode((await receiveMessage(maria, queue.recipientId))!), 'welcome');
  assert.deepEqual(await listInvites(maria), []);

  // Another phone with the same invite is refused, and the list says it was used.
  await assert.rejects(redeemInvite(url, made.code), refused(2));
  const used = await listInvites(alice);
  assert.equal(used?.length, 1);
  assert.ok(Math.abs(used![0].used - Date.now()) < 60_000);

  // Taken back, its line goes and the phone is let in no more.
  assert.equal(await takeBackInvite(alice, used![0].id), true);
  assert.ok(!readFileSync(file, 'utf8').includes(sha(taken.token)));
  assert.equal(await lets(maria), false);
  assert.deepEqual(await listInvites(alice), []);
  assert.equal(await takeBackInvite(alice, used![0].id), false, 'gone already');
});

test('an invite taken back, or never made, lets no phone in', { skip: !ready }, async () => {
  const made = await makeInvite(alice, 'Bob');
  assert.ok(made);
  const [listed] = (await listInvites(alice))!;
  assert.equal(listed.name, 'bob');
  assert.equal(await takeBackInvite(alice, listed.id), true);
  await assert.rejects(redeemInvite(url, made.code), refused(1));
  await assert.rejects(redeemInvite(url, 'cd'.repeat(32)), refused(1));
  await assert.rejects(redeemInvite(url, 'not a code'), RelayError);
});

test('names are made unique on the relay', { skip: !ready }, async () => {
  const first = await redeemInvite(url, (await makeInvite(alice, 'Kim'))!.code);
  const second = await redeemInvite(url, (await makeInvite(alice, 'kim'))!.code);
  assert.deepEqual([first.name, second.name], ['kim', 'kim-2']);
  for (const invite of (await listInvites(alice))!) await takeBackInvite(alice, invite.id);
});

test('a phone may have 5 invites waiting at once, and only its own token invites', { skip: !ready }, async () => {
  for (let i = 0; i < 5; i++) assert.ok(await makeInvite(alice, `friend ${i}`));
  await assert.rejects(makeInvite(alice, 'one more'), refused(2));
  for (const invite of (await listInvites(alice))!) await takeBackInvite(alice, invite.id);
  // The relay's own token is no phone's: it invites nobody, and the app shows no invites with it.
  const shared: Relay = { url, token: 'shared token' };
  assert.equal(await lets(shared), true);
  assert.equal(await listInvites(shared), null);
  assert.equal(await makeInvite(shared, 'Eve'), null);
  assert.equal(await takeBackInvite(shared, '00'.repeat(16)), false);
});

test('a phone let in by an invite goes with the phone that invited it, and so do those it invited', { skip: !ready }, async () => {
  const maria = await redeemInvite(url, (await makeInvite(alice, 'Maria'))!.code);
  const nick = await redeemInvite(url, (await makeInvite({ url, token: maria.token }, 'Nick'))!.code);
  const ann = await redeemInvite(url, (await makeInvite({ url, token: nick.token }, 'Ann'))!.code);
  // CREATE, on a connection Nick's phone keeps open.
  const theirs = await RelaySession.open({ url, token: nick.token });
  assert.equal((await theirs.call(Uint8Array.of(1)))[0], 0);
  assert.ok(await lets({ url, token: ann.token }));

  // Alice takes back Maria's access: Nick's and Ann's go too, and Nick's open connection is closed
  // at its next request.
  const [used] = (await listInvites(alice))!;
  assert.equal(used.name, 'maria');
  assert.equal(await takeBackInvite(alice, used.id), true);
  for (const phone of [maria, nick, ann]) {
    assert.equal(await lets({ url, token: phone.token }), false, phone.name);
    assert.ok(!readFileSync(file, 'utf8').includes(sha(phone.token)), phone.name);
  }
  await assert.rejects(theirs.call(Uint8Array.of(1)), RelayError);
  theirs.close();
  assert.ok(await lets(alice), 'the phone that took it back stays');
});

test('a token whose line is in the file already takes no invite', { skip: !ready }, async () => {
  // A relay of its own: Alice made all the invites she may today on the one above.
  const again = join(folder, 'again.tokens');
  writeFileSync(again, `${sha(alicesToken)} alice\n`);
  const relay = await startRelay(false, '', false, { EREVOS_RELAY_TOKENS: again, EREVOS_RELAY_INVITES: 'on' });
  const hers: Relay = { url: relay, token: alicesToken };
  const made = await makeInvite(hers, 'Again');
  const session = await RelaySession.open(relayPath(relay, '/join'));
  const secret = Buffer.from(made!.code, 'hex');
  // REDEEM, with the SHA-256 of Alice's own token: refused (FAILED), and her line stays hers.
  const reply = await session.call(Uint8Array.of(24, ...secret, ...Buffer.from(sha(alicesToken), 'hex')));
  session.close();
  assert.deepEqual([...reply], [3]);
  assert.equal(readFileSync(again, 'utf8'), `${sha(alicesToken)} alice\n`);
  assert.equal((await listInvites(hers))![0].used, 0, 'the invite is still waiting');
  assert.equal((await redeemInvite(relay, made!.code)).name, 'again', 'and a phone with a token of its own takes it');
});

test('a relay lets in so many phones by invite, and no more', { skip: !ready }, async () => {
  const capped = join(folder, 'capped.tokens');
  writeFileSync(capped, `${sha(alicesToken)} alice\n`);
  const relay = await startRelay(false, '', false, { EREVOS_RELAY_TOKENS: capped, EREVOS_RELAY_INVITES: 'on', EREVOS_RELAY_MAX_INVITED: '2' });
  const hers: Relay = { url: relay, token: alicesToken };
  // Invites waiting count too, so the relay never lets in more than it said.
  const first = await makeInvite(hers, 'One');
  assert.ok(await makeInvite(hers, 'Two'));
  await assert.rejects(makeInvite(hers, 'Three'), refused(2));
  await redeemInvite(relay, first!.code);
  await assert.rejects(makeInvite(hers, 'Three'), refused(2));
  // One taken back makes room for one more.
  const waiting = (await listInvites(hers))!.find((invite) => invite.used === 0)!;
  assert.equal(await takeBackInvite(hers, waiting.id), true);
  assert.ok(await makeInvite(hers, 'Three'));
});

test('a relay that does not invite shows no invites to its phones', { skip: !ready }, async () => {
  const quiet = join(folder, 'quiet.tokens');
  writeFileSync(quiet, `${sha(alicesToken)} alice\n`);
  const plain = await startRelay(false, '', false, { EREVOS_RELAY_TOKENS: quiet });
  assert.equal(await lets({ url: plain, token: alicesToken }), true);
  assert.equal(await listInvites({ url: plain, token: alicesToken }), null);
  assert.equal(await makeInvite({ url: plain, token: alicesToken }, 'Maria'), null);
  await assert.rejects(redeemInvite(plain, code), refused(1));
});
