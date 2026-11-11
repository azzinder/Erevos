// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What a chat's messages can do beyond words: what they carry (lib/chat-parts.ts), their line
// (lib/message-line.ts), finding them again (lib/message-search.ts), writing a chat out
// (lib/chat-export.ts), what a link's preview reads from its page (lib/link-preview.ts), and a
// group's message handed to a contact's chat to forward (lib/forward.ts); a contact card
// (lib/card-share.ts), copying messages chosen together, and a group's threads.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chatText, exportName } from '../lib/chat-export';
import { handForward, takeForward } from '../lib/forward';
import { firstLink, fitPreview, pageInfo } from '../lib/link-preview';
import { acts, carriedOf, checkedCard, checkedChoices, checkedPlace, checkedPoll, choose, contentOf, EDIT_FOR, editableWords, geoLink, joinedText, MAX_CARD, MAX_EDIT, placeWords, pollOf, pollOpen, pollWords, stillEditable, tally, threadRoots, threadSizes, toCarry } from '../lib/chat-parts';
import { cardFields, cardOf, cardShown, cardWords, MAX_CARD_ENTRIES } from '../lib/card-share';
import { EMPTY_FIELDS } from '../lib/contacts';
import { messageLine } from '../lib/message-line';
import { searchMessages, starredOf } from '../lib/message-search';
import { STICKERS, stickerOf } from '../lib/stickers';

// The times written out are the phone's own: here, UTC.
process.env.TZ = 'UTC';

const A = `contact:${'aa'.repeat(32)}`;
const B = `contact:${'bb'.repeat(32)}`;

test('a pin is carried with no words only, and one of the wrong shape is none', () => {
  const pin = { tag: '0123456789ab', on: true };
  assert.deepEqual(carriedOf({ pin }), { pin });
  assert.deepEqual(carriedOf({ pin: { tag: 'x', on: true } }), {});
  assert.deepEqual(carriedOf({ pin: { tag: pin.tag, on: 'yes' } }), {});
  assert.deepEqual(toCarry({ pin }, false), { pin });
  assert.deepEqual(toCarry({ pin }, true), {});
});

test('an edit is carried with no words only, its own words whole, and says the phone is open', () => {
  const edit = { tag: '0123456789ab', text: 'first line\nsecond line' };
  assert.deepEqual(carriedOf({ edit }), { edit });
  assert.deepEqual(toCarry({ edit }, false), { edit });
  assert.deepEqual(toCarry({ edit }, true), {});
  assert.equal(acts({ edit }), true);
  assert.deepEqual(carriedOf({ edit: { tag: 'x', text: 'hi' } }), {});
  assert.deepEqual(carriedOf({ edit: { tag: edit.tag, text: ' \n ' } }), {});
  assert.equal(carriedOf({ edit: { tag: edit.tag, text: 'é'.repeat(MAX_EDIT + 10) } }).edit?.text.length, MAX_EDIT);
  // Only words of the sender's own are edited, for a day.
  assert.equal(editableWords({ text: 'hi' }), true);
  assert.equal(editableWords({ text: '🌝', sticker: 'moon-smile' }), false);
  assert.equal(editableWords({ text: 'hi', forwarded: true }), false);
  assert.equal(editableWords({ text: '' }), false);
  assert.equal(stillEditable(0, EDIT_FOR), true);
  assert.equal(stillEditable(0, EDIT_FOR + 1), false);
});

test('a message in one line: its first line of words, or what it is', () => {
  assert.equal(messageLine({ text: 'first\nsecond' }), 'first');
  assert.equal(messageLine({ text: '', voice: { ms: 7400 } }), 'Voice message, 0:07');
  assert.equal(messageLine({ text: '', file: { kind: 'photo', name: 'a.jpg' } }), 'Photo');
});

test('the starred messages, the latest first, from every chat', () => {
  const found = starredOf([
    { peer: A, tag: '000000000001', at: 1, mine: false, text: 'old', starred: true },
    { peer: B, tag: '000000000002', at: 2, mine: true, text: 'not starred' },
    { peer: B, tag: '000000000003', at: 3, mine: true, text: '', voice: { ms: 2000 }, starred: true },
  ]);
  assert.deepEqual(found, [
    { peer: B, tag: '000000000003', at: 3, mine: true, line: 'Voice message, 0:02' },
    { peer: A, tag: '000000000001', at: 1, mine: false, line: 'old' },
  ]);
});

test('a sticker goes by its name, with words, and an Erevos from before reads its emoji', () => {
  assert.deepEqual(toCarry({ sticker: 'moon-smile' }, true), { sticker: 'moon-smile' });
  assert.deepEqual(toCarry({ sticker: 'moon-smile' }, false), {});
  assert.deepEqual(carriedOf({ sticker: 'Not A Name!' }), {});
  assert.deepEqual(contentOf({ sticker: 'heart' }), { sticker: 'heart' });
  // A later Erevos's sticker is still one, drawn as its emoji here.
  assert.deepEqual(carriedOf({ sticker: 'moon-dance' }), { sticker: 'moon-dance' });
  assert.equal(stickerOf('moon-dance'), null);
  assert.equal(messageLine({ text: '🌝', sticker: 'moon-smile' }), 'Sticker: Smiling moon');
  assert.equal(messageLine({ text: '💃', sticker: 'moon-dance' }), 'Sticker');
  assert.equal(new Set(STICKERS.map((s) => s.name)).size, STICKERS.length);
  assert.ok(STICKERS.every((s) => carriedOf({ sticker: s.name }).sticker === s.name && s.emoji));
});

test('a place goes with its coordinates as words, to six decimals, and opens as a geo: link', () => {
  const place = checkedPlace({ lat: 37.97536123, lon: 23.7349512, acc: 12.4 })!;
  assert.deepEqual(place, { lat: 37.975361, lon: 23.734951, acc: 12 });
  assert.equal(placeWords(place), '📍 37.975361, 23.734951');
  assert.equal(geoLink(place), 'geo:37.975361,23.734951?q=37.975361,23.734951');
  assert.deepEqual(toCarry({ place }, true), { place });
  assert.deepEqual(toCarry({ place }, false), {});
  assert.deepEqual(contentOf({ place }), { place });
  assert.equal(checkedPlace({ lat: 91, lon: 0 }), null);
  assert.equal(checkedPlace({ lat: '1', lon: 0 }), null);
  assert.deepEqual(checkedPlace({ lat: 1, lon: 2, acc: -3 }), { lat: 1, lon: 2 });
  assert.equal(messageLine({ text: placeWords(place), place }), 'Location');
});

test('a poll is checked, said in words for an Erevos from before, and counted', () => {
  const poll = pollOf('  Where   do we meet? ', ['Here', ' ', 'There\n'], false)!;
  assert.deepEqual(poll, { q: 'Where do we meet?', o: ['Here', 'There'] });
  assert.equal(pollOf('Only one?', ['Yes'], false), null);
  assert.equal(pollWords(poll), '📊 Where do we meet?\n1. Here\n2. There');
  assert.equal(messageLine({ text: pollWords(poll), poll }), 'Poll: Where do we meet?');
  assert.deepEqual(checkedPoll({ q: 'q', o: ['a', 'b'], m: true }), { q: 'q', o: ['a', 'b'], m: true });
  assert.equal(checkedPoll({ q: 'q', o: ['a', 7] }), null);
  assert.deepEqual(toCarry({ poll }, true), { poll });
  assert.deepEqual(toCarry({ poll }, false), {});
  // Choosing: one, another instead, or the same again to take it back; more than one when it allows.
  assert.deepEqual(choose([], 1, false), [1]);
  assert.deepEqual(choose([1], 0, false), [0]);
  assert.deepEqual(choose([0], 0, false), []);
  assert.deepEqual(choose([2], 0, true), [0, 2]);
  assert.deepEqual(checkedChoices([3, 1, 1], 4), [1, 3]);
  assert.deepEqual(checkedChoices([3, 1], 4, false), [1]);
  assert.equal(checkedChoices([4], 4), null);
  assert.deepEqual(tally({ q: 'q', o: ['a', 'b', 'c'] }, [[0], [0, 2], undefined]), [2, 0, 1]);
});

test('a vote travels with no words, says the phone is open, and one of the wrong shape is none', () => {
  const vote = { tag: '0123456789ab', chose: [0] };
  assert.deepEqual(toCarry({ vote }, false), { vote });
  assert.deepEqual(toCarry({ vote }, true), {});
  assert.equal(acts({ vote }), true);
  assert.deepEqual(carriedOf({ vote: { tag: vote.tag, chose: [] } }), { vote: { tag: vote.tag, chose: [] } });
  assert.deepEqual(carriedOf({ vote: { tag: vote.tag, chose: ['0'] } }), {});
});

test('typing travels with no words, and does not say the phone is open as writing does', () => {
  assert.deepEqual(toCarry({ typing: true }, false), { typing: true });
  assert.deepEqual(toCarry({ typing: true }, true), {});
  assert.equal(acts({ typing: true }), false);
  assert.deepEqual(carriedOf({ typing: 'yes' }), {});
});

test('a search finds messages by their words, ignoring case and Greek accents, the latest first', () => {
  const messages = [
    { peer: A, tag: '000000000001', at: 1, mine: false, text: 'Πάμε για ΚΑΦΕ;\nστις πέντε' },
    { peer: B, tag: '000000000002', at: 2, mine: true, text: 'no coffee here' },
    { peer: B, tag: '000000000003', at: 3, mine: true, text: '', file: { kind: 'file' as const, name: 'καφές.pdf' } },
    { peer: A, tag: '000000000004', at: 4, mine: false, text: 'x', poll: { q: 'Where?', o: ['Καφενείο', 'Home'] } },
    { peer: A, tag: '000000000005', at: 5, mine: false, text: '', voice: { ms: 1000 } },
  ];
  assert.deepEqual(
    searchMessages(messages, 'καφε').map((m) => [m.tag, m.line]),
    [
      ['000000000004', 'Καφενείο'],
      ['000000000003', 'καφές.pdf'],
      ['000000000001', 'Πάμε για ΚΑΦΕ;'],
    ],
  );
  assert.deepEqual(searchMessages(messages, 'ΠΕΝΤΕ').map((m) => m.line), ['στις πέντε']);
  assert.deepEqual(searchMessages(messages, '  '), []);
  assert.equal(searchMessages(messages, 'e', 2).length, 2);
});

test('a chat written out: each day, then each message with its time, who wrote it and what it is', () => {
  const day = Date.UTC(2026, 9, 18, 9, 15);
  const minute = 60_000;
  const text = chatText(
    [
      { mine: true, at: day + minute, tag: '000000000002', text: 'Morning!\nWhat now?', re: '000000000001', myReaction: '👍' },
      { mine: false, at: day, tag: '000000000001', text: 'Good morning', theirReaction: '❤️' },
      { mine: false, at: day + 2 * minute, text: '', file: { kind: 'photo', name: 'sea.jpg' }, forwarded: true },
      { mine: false, at: day + 3 * minute, text: 'gone soon', lasts: 300 },
      { mine: true, at: day + 4 * minute, text: '', voice: { ms: 7000 }, re: '000000000009' },
      { mine: false, at: day + 24 * 60 * minute, text: '📍 1, 2', place: { lat: 37.97536, lon: 23.73495 } },
      { mine: true, at: day + 24 * 60 * minute + minute, text: 'x', poll: { q: 'Tea?', o: ['Yes', 'No'] }, myVote: [0], theirVote: [0] },
    ],
    'Nekten',
    Date.UTC(2026, 9, 19, 14, 3),
  );
  assert.equal(
    text,
    [
      'Chat with Nekten, written out of Erevos',
      'Written out 2026-10-19 14:03. This file is not encrypted: anyone who has it can read it.',
      '',
      '2026-10-18',
      '09:15  Nekten: Good morning',
      '       ❤️ Nekten',
      '09:16  You (answering “Good morning”): Morning!',
      '       What now?',
      '       👍 You',
      '09:17  Nekten (forwarded): [Photo: sea.jpg]',
      '09:19  You: [Voice message, 0:07]',
      '',
      '2026-10-19',
      '09:15  Nekten: [Location: 37.975360, 23.734950]',
      '09:16  You: [Poll: Tea?]',
      '         Yes: You, Nekten',
      '         No',
      '',
    ].join('\n'),
  );
  assert.equal(exportName('A/B: C', Date.UTC(2026, 9, 19)), 'Erevos - A-B C - 2026-10-19.txt');
});

test('a group written out names who wrote each message, and each reaction and vote', () => {
  const at = Date.UTC(2026, 9, 18, 9, 15);
  const text = chatText(
    [
      { mine: false, by: 'Bob', at, text: 'x', poll: { q: 'Tea?', o: ['Yes', 'No'] }, votedBy: [{ chose: [1], name: 'Bob' }, { chose: [1], name: 'You' }] },
      { mine: true, at: at + 60_000, text: 'ok', reactedBy: [{ emoji: '👍', name: 'Carol' }, { emoji: '❤️', name: 'Bob' }] },
    ],
    'Friends',
    at,
  );
  assert.deepEqual(text.split('\n').slice(3), ['2026-10-18', '09:15  Bob: [Poll: Tea?]', '         Yes', '         No: Bob, You', '09:16  You: ok', '       👍 Carol  ❤️ Bob', '']);
  assert.ok(text.startsWith('Chat with Friends, written out of Erevos'));
});

test('a preview is of the first https link, from what its page says of itself', () => {
  assert.equal(firstLink('see http://a.example/x and https://b.example/y, then www.c.example'), 'https://b.example/y');
  assert.equal(firstLink('no link here'), null);
  const page = `<!doctype html><html><head><title>Plain &amp; old</title>
    <meta content="Sea &#x26; sun" property="og:title">
    <meta name='description' content='A day&nbsp;out,   by the sea'>
    <meta property="og:image" content="/pics/sea.jpg?w=1">
    </head><body><meta property="og:description" content="not the head"></body></html>`;
  assert.deepEqual(pageInfo(page, 'https://news.example/a/b.html'), { title: 'Sea & sun', text: 'A day out, by the sea', picture: 'https://news.example/pics/sea.jpg?w=1' });
  assert.deepEqual(pageInfo('<title>Only a title</title><meta property="og:image" content="pic.png">', 'https://x.example/a/b'), {
    title: 'Only a title',
    text: '',
    picture: 'https://x.example/a/pic.png',
  });
  assert.equal(pageInfo('<meta property="og:image" content="javascript:alert(1)"><title>t</title>', 'https://x.example/')?.picture, null);
  assert.equal(pageInfo('<html><body>Nothing said</body></html>', 'https://x.example/'), null);
});

test('a preview goes whole when it fits, without its picture when only that is too much, and is checked as it comes', () => {
  const preview = { url: 'https://x.example/', title: 'T', text: 'About it', image: `/9j/${'A'.repeat(4000)}` };
  assert.deepEqual(fitPreview('look https://x.example/', preview), preview);
  assert.deepEqual(fitPreview('x'.repeat(7000), preview), { url: preview.url, title: 'T', text: 'About it' });
  assert.equal(fitPreview('x'.repeat(10_000), preview), null);
  assert.equal(fitPreview('x', { ...preview, url: 'ftp://x.example/' }), null);
  // Not a JPEG, or too large: the picture is left out; with nothing to show, there is none.
  assert.deepEqual(carriedOf({ preview: { ...preview, image: 'iVBORw0KGgo=' } }), { preview: { url: preview.url, title: 'T', text: 'About it' } });
  assert.deepEqual(carriedOf({ preview: { ...preview, image: `/9j/${'A'.repeat(9000)}` } }).preview?.image, undefined);
  assert.deepEqual(carriedOf({ preview: { url: preview.url, title: ' ', text: '' } }), {});
  assert.deepEqual(toCarry({ preview }, true), { preview });
  assert.deepEqual(toCarry({ preview }, false), {});
  assert.deepEqual(contentOf({ preview }), { preview });
});

test("a group's message to forward is handed to that contact's chat only, once, within a minute", () => {
  const message = { text: 'pass it on' };
  handForward(A, message, 1000);
  assert.equal(takeForward(B, 1000), null);
  assert.equal(takeForward(A, 61_000), null);
  assert.equal(takeForward(A, 2000), message);
  assert.equal(takeForward(A, 2000), null);
});

test("several of a group's messages chosen to forward go to that contact's chat one after the other, and another chat starts anew", () => {
  const first = { text: 'one' };
  const second = { text: 'two' };
  handForward(A, first, 1000);
  handForward(A, second, 1000);
  assert.equal(takeForward(A, 2000), first);
  assert.equal(takeForward(A, 2000), second);
  assert.equal(takeForward(A, 2000), null);
  handForward(A, first, 1000);
  handForward(B, second, 1000);
  assert.equal(takeForward(A, 2000), null);
  assert.equal(takeForward(B, 2000), second);
});

test('a poll ended by its sender travels with no words, says the phone is open, and one of the wrong shape is none', () => {
  const close = { tag: '0123456789ab' };
  assert.deepEqual(carriedOf({ close }), { close });
  assert.deepEqual(carriedOf({ close: { tag: 'x' } }), {});
  assert.deepEqual(carriedOf({ close: 'yes' }), {});
  assert.deepEqual(toCarry({ close }, false), { close });
  assert.deepEqual(toCarry({ close }, true), {});
  assert.equal(acts({ close }), true);
  const poll = { q: 'q', o: ['a', 'b'] };
  assert.equal(pollOpen({ poll }), true);
  assert.equal(pollOpen({ poll, closed: 5 }), false);
  assert.equal(pollOpen({}), false);
});

test('a contact card goes as a vCard of its name, numbers and emails only, with its words for an Erevos from before', () => {
  const mobile = { value: '+30 210 1234567', kind: 'mobile' as const, label: '' };
  const contact = {
    ...EMPTY_FIELDS,
    given: 'Ada',
    family: 'Lovelace',
    company: 'Engines',
    note: 'not for anyone',
    birthday: '1815-12-10',
    phones: [mobile, mobile],
    emails: [{ value: 'ada@example.org', kind: 'home' as const, label: '' }],
    addresses: [{ value: '12 St James Square', kind: 'home' as const, label: '' }],
  };
  const card = cardOf({ ...contact, name: 'Ada Lovelace' })!;
  assert.match(card, /^BEGIN:VCARD\r?\n/);
  for (const kept of ['Engines', 'not for anyone', '1815', 'St James']) assert.equal(card.includes(kept), false, kept);
  assert.deepEqual(cardShown(card), { name: 'Ada Lovelace', phones: ['+30 210 1234567'], emails: ['ada@example.org'] });
  assert.equal(cardWords(card), '👤 Ada Lovelace\n+30 210 1234567\nada@example.org');
  const filled = cardFields(card)!;
  assert.deepEqual([filled.given, filled.family, filled.company, filled.note], ['Ada', 'Lovelace', '', '']);
  assert.deepEqual(filled.phones.map((p) => p.value), ['+30 210 1234567']);
  assert.equal(messageLine({ text: cardWords(card) }), '👤 Ada Lovelace');
  // It goes with its words, is checked as it comes, and its words are not edited.
  assert.deepEqual(toCarry({ card }, true), { card });
  assert.deepEqual(toCarry({ card }, false), {});
  assert.deepEqual(carriedOf({ card }), { card });
  assert.deepEqual(contentOf({ card }), { card });
  assert.deepEqual(carriedOf({ card: 'Ada, +30 210 1234567' }), {});
  assert.deepEqual(carriedOf({ card: card.replace('Ada', 'A\u0007da') }), {});
  assert.equal(checkedCard(`BEGIN:VCARD\nFN:${'a'.repeat(MAX_CARD)}\nEND:VCARD`), null);
  assert.equal(editableWords({ text: cardWords(card), card }), false);
  // One with too many numbers keeps the first of them; a nameless one does not go.
  const many = cardOf({ ...EMPTY_FIELDS, name: 'Many', given: 'Many', phones: Array.from({ length: 12 }, (_, i) => ({ value: `+3069000000${String(i).padStart(2, '0')}`, kind: 'mobile' as const, label: '' })) })!;
  assert.equal(cardShown(many).phones.length, MAX_CARD_ENTRIES);
  assert.equal(cardShown('not a card').name, '');
  assert.equal(cardFields('not a card'), null);
});

test('messages chosen are copied as one text: one alone its words, several each with its time and who wrote it', () => {
  const at = Date.UTC(2026, 10, 11, 9, 5);
  assert.equal(joinedText([{ at, who: 'You', text: 'only this' }]), 'only this');
  assert.equal(
    joinedText([
      { at: at + 60_000, who: 'Ada', text: 'second' },
      { at, who: 'You', text: 'first' },
    ]),
    '[09:05] You: first\n[09:06] Ada: second',
  );
  assert.equal(
    joinedText([
      { at, who: 'You', text: 'today' },
      { at: at - 86_400_000, who: 'Ada', text: 'yesterday' },
    ]),
    '[2026-11-10 09:05] Ada: yesterday\n[2026-11-11 09:05] You: today',
  );
});

test("a group's threads: each answer is in the thread of the first message it answers, answer after answer", () => {
  const roots = threadRoots([
    { tag: 'a' },
    { tag: 'b', re: 'a' },
    { tag: 'c', re: 'b' },
    { tag: 'd' },
    { tag: 'e', re: 'gone' },
    { tag: 'f', re: 'e' },
    // Answering each other, round and round, as only a changed Erevos could send.
    { tag: 'x', re: 'y' },
    { tag: 'y', re: 'x' },
  ]);
  assert.deepEqual(['a', 'b', 'c', 'd', 'e', 'f'].map((tag) => roots.get(tag)), ['a', 'a', 'a', 'd', 'e', 'e']);
  assert.equal(roots.get('x'), roots.get('y'));
  const sizes = threadSizes(roots);
  assert.equal(sizes.get('a'), 2);
  assert.equal(sizes.get('e'), 1);
  assert.equal(sizes.has('d'), false);
});
