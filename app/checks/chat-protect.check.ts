// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Chats on Matrix, XMPP and Nostr, and SMS conversations, locked with a PIN of their own and their
// screenshots blocked (lib/chat-protect.ts), as a space's own chats are: the PIN kept only as
// Argon2id of it with the chat, the list and its search showing nothing of a locked one but its
// name; an SMS conversation's PIN, screenshots, look and notifications sealed with the space's SMS
// data (lock/sms-own.ts), and what the phone is told of its notifications (lib/sms-notices.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { changeGuard, LOCKED_ROW, lockedChat, lockSmsThreads, pinOf, shotsBlocked, smsOwnOf, withSmsOwn, type ChatGuard } from '../lib/chat-protect';
import { randomBytes, setHardCost } from '../lib/crypto';
import { buildInbox, filterInbox, matrixInboxRows, nostrInboxRows, xmppInboxRows, type InboxSms } from '../lib/inbox';
import type { MatrixState } from '../lib/matrix';
import type { NostrDmState } from '../lib/nostr-dm';
import { SmsLink } from '../lib/sms-link';
import { noticeLists, smsSoundOf } from '../lib/sms-notices';
import type { XmppState } from '../lib/xmpp';
import { ALWAYS } from '../lock/chat-notify';
import { makeChatPin, opensChat } from '../lock/chat-pin';
import { kept } from '../lock/inbox-cache';
import { checkedSmsOwn, MAX_SMS_OWN, type SmsOwn } from '../lock/sms-own';
import { DEFAULT_LOOK } from '../theme/look';
import { files } from './files-memory';

const ANN = 'a'.repeat(64);

test('a chat on Matrix, XMPP or Nostr locked with its PIN shows its name with a lock, nothing of its messages, and the search finds none', async () => {
  setHardCost({ m: 64, t: 1 });
  try {
    const pin = await makeChatPin('2468');
    assert.equal(JSON.stringify(pin).includes('2468'), false, 'only Argon2id of it');
    const matrix = {
      userId: '@me:example.org',
      rooms: {
        '!a:example.org': { id: '!a:example.org', name: 'Anna', members: {}, encrypted: true, direct: true, unread: 2, messages: [{ id: '$1', sender: '@me:example.org', ts: 5000, text: 'μυστικό' }], pin },
        '!b:example.org': { id: '!b:example.org', name: 'Club', members: {}, encrypted: true, direct: false, unread: 0, messages: [{ id: '$2', sender: '@bo:example.org', ts: 4000, text: 'open words' }] },
      },
    } as unknown as MatrixState;
    const xmpp = {
      jid: 'me@example.org',
      roster: {},
      requests: [],
      chats: { 'ann@example.org': { jid: 'ann@example.org', unread: 1, lastAt: 300, messages: [{ id: 'x', mine: false, text: 'μυστικό', at: 300, encrypted: true }], pin } },
    } as unknown as XmppState;
    const nostr = {
      public: 'c'.repeat(64),
      people: {},
      chats: { [ANN]: { key: ANN, name: 'Ann', unread: 3, lastAt: 10, messages: [{ id: '1', mine: true, text: 'μυστικό', at: 700, state: 'sent' }], pin } },
    } as unknown as NostrDmState;
    const rows = [...matrixInboxRows(matrix, 9000), ...xmppInboxRows(xmpp, 9000), ...nostrInboxRows(nostr, 9000)];
    const by = Object.fromEntries(rows.map((row) => [row.identity, row]));
    for (const [identity, unread, at] of [['matrix:!a:example.org', 2, 5000], ['xmpp:ann@example.org', 1, 300], [`nostr:${ANN}`, 3, 700]] as const) {
      const row = by[identity];
      assert.deepEqual([row.locked, row.last, row.mine, row.mark], [true, '', false, 0], identity);
      assert.deepEqual([row.unread, row.at], [unread, at], 'it still says how many came, and when it moved');
    }
    assert.equal(by['matrix:!b:example.org'].last, 'open words');
    assert.equal(by['matrix:!b:example.org'].locked, undefined);
    assert.deepEqual(filterInbox(rows, 'μυστικό'), []);
    assert.deepEqual(filterInbox(rows, 'anna').map((row) => row.identity), ['matrix:!a:example.org']);
    assert.equal(JSON.stringify(kept(rows)).includes('μυστικό'), false, 'nor does the list kept for next time');
    // It opens only with its own PIN.
    assert.equal(await opensChat('2468', pinOf(matrix.rooms['!a:example.org'])!, Date.UTC(2026, 10, 11)), true);
  } finally {
    setHardCost(null);
  }
});

test('a PIN of the wrong shape locks nothing; a guard is set and taken off in place', async () => {
  setHardCost({ m: 64, t: 1 });
  try {
    const pin = await makeChatPin('1357');
    for (const bad of [undefined, null, {}, { pin: { ...pin, salt: 'x' } }, { pin: 'secret' }]) assert.equal(lockedChat(bad as ChatGuard | null | undefined), false);
    const chat: ChatGuard & { look?: string } = { look: 'kept' };
    changeGuard(chat, { pin });
    assert.deepEqual(pinOf(chat), pin);
    changeGuard(chat, { shots: true });
    assert.deepEqual([lockedChat(chat), shotsBlocked(chat)], [true, true], 'what is not given stays');
    changeGuard(chat, { pin: null, shots: false });
    assert.deepEqual(chat, { look: 'kept' }, 'nothing of them is left, the rest is');
  } finally {
    setHardCost(null);
  }
});

test('an SMS conversation keeps its PIN, screenshots, look and notifications sealed with the space, and the list shows nothing of a locked one', async () => {
  setHardCost({ m: 64, t: 1 });
  files.clear();
  try {
    const key = randomBytes(32);
    const link = await SmsLink.open(0, key);
    const pin = await makeChatPin('9753');
    await link.setOwn('+306911111111', { pin, shots: true });
    await link.setOwn('+306922222222,+306933333333', { look: { ...DEFAULT_LOOK, theme: 'light' }, notify: { until: ALWAYS } });
    const again = await SmsLink.open(0, key);
    // Found by its number however it is written.
    assert.deepEqual(pinOf(again.own('6911111111')), pin);
    assert.equal(shotsBlocked(again.own('+30 691 111 1111')), true);
    assert.equal(again.own('+306933333333,+306922222222')?.look?.theme, 'light');
    assert.equal(again.own('+306944444444'), null);
    // Nothing of it shows in the phone's files, and another space's key opens none of it.
    assert.doesNotMatch([...files.values()].join('\n'), /6911111111|9753/);
    assert.equal((await SmsLink.open(0, randomBytes(32)).catch(() => null))?.own('+306911111111') ?? null, null);

    // The list: its row says that it moved and how many came; a contact with that number shows nothing of it either.
    const threads: InboxSms[] = [
      { address: '+306911111111', text: 'code 4321', at: 50, mine: false, unread: 2 },
      { address: '+306955555555', text: 'hello', at: 40, mine: false, unread: 0 },
    ];
    const marked = lockSmsThreads(threads, again.state.own);
    assert.deepEqual(marked.map((t) => !!t.locked), [true, false]);
    assert.equal(marked[0].text, 'code 4321', 'the threads keep what they say, for what shares them');
    const rows = buildInbox([], [], [], 100, marked);
    const locked = rows.find((r) => r.sms === '+306911111111')!;
    assert.deepEqual([locked.locked, locked.last, locked.unread, locked.at], [true, '', 2, 50]);
    assert.equal(rows.find((r) => r.sms === '+306955555555')!.last, 'hello');
    assert.deepEqual(filterInbox(rows, '4321'), []);
    const anna = buildInbox([{ identity: ANN, name: 'Anna', timer: 0, phone: '+306911111111' }], [], [], 100, marked).find((r) => r.identity === ANN)!;
    assert.deepEqual([anna.last, anna.unread], ['', 2]);

    // Taken off, it is as any other again; one left with nothing of its own goes from the list.
    await again.setOwn('6911111111', { pin: null, shots: false });
    assert.equal(again.own('+306911111111'), null);
    assert.deepEqual(again.state.own.map((own) => own.address), ['+306922222222,+306933333333']);
  } finally {
    setHardCost(null);
  }
});

test('what an SMS conversation has of its own is checked as it is read, and past the most a PIN never goes', async () => {
  setHardCost({ m: 64, t: 1 });
  try {
    const pin = await makeChatPin('2468');
    const list = checkedSmsOwn([
      { address: '+306911111111', pin, shots: true, notify: { until: 5, sound: 'content://media/1' } },
      { address: '+306922222222', pin: { ...pin, hash: 'x' } },
      { address: '', shots: true },
      { address: '+306933333333', shots: 'yes', look: 'dark' },
      null,
    ]);
    assert.deepEqual(list, [{ address: '+306911111111', pin, shots: true, notify: { until: 5, sound: 'content://media/1' } }]);
    const many: SmsOwn[] = [{ address: '+306911111111', pin }, ...Array.from({ length: MAX_SMS_OWN + 5 }, (_, i) => ({ address: `+3068${String(i).padStart(8, '0')}`, shots: true as const }))];
    const read = checkedSmsOwn(many);
    assert.equal(read.length, MAX_SMS_OWN);
    assert.deepEqual(read[0], { address: '+306911111111', pin }, 'the oldest, with a PIN, stays');
    // The six oldest without one went.
    assert.deepEqual([smsOwnOf(read, '+306800000000'), smsOwnOf(read, '+306800000005')], [null, null]);
    assert.equal(smsOwnOf(read, '+306800000006')?.shots, true);
    // A change made and undone leaves the list as it was.
    const one = withSmsOwn([], '+306911111111', { notify: { until: ALWAYS } });
    assert.deepEqual(withSmsOwn(one, '6911111111', { notify: null }), []);
  } finally {
    setHardCost(null);
  }
});

test('the phone is told the numbers muted and until when, and those with a sound of their own; a group none', () => {
  const now = 1_000_000;
  const lists = noticeLists(
    [
      { address: '+306911111111', notify: { until: now + 60_000, sound: 'content://media/1' } },
      { address: '+306922222222', notify: { until: ALWAYS } },
      { address: '+306933333333', notify: { until: now - 1, sound: '' } },
      { address: '+306944444444', notify: { sound: 'content://media/2' } },
      { address: '+306955555555,+306966666666', notify: { until: ALWAYS } },
      { address: '+306977777777', shots: true },
    ],
    now,
  );
  assert.deepEqual(lists.muted, [
    { number: '+306911111111', until: now + 60_000 },
    { number: '+306922222222', until: ALWAYS },
  ]);
  // A mute that ended sounds again, as it says: here, without sound.
  assert.deepEqual(lists.sounds, ['+306933333333', '+306944444444']);
  assert.equal(lists.next, now + 60_000, 'told again as the first mute ends');
  // With no phone that keeps them, every SMS sounds as the app has it.
  assert.equal(smsSoundOf('+306922222222', now), undefined);
});

test('the row of a locked chat says nothing of its last message', () => {
  assert.deepEqual(LOCKED_ROW, { last: '', mine: false, mark: 0, fades: false, locked: true });
});
