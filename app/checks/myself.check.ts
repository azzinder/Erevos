// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Chat with myself (lock/myself-data.ts): each space's and each hidden place's notes apart, sealed
// so no other key reads them; a note's reminder set, changed, taken away and seen; what the home
// screen's row shows of them; a note deleted with its photo's chunks and its voice message; and a
// hidden place's reminders told by the phone only while that place receives closed.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { reminders, seen } from './device-memory';
import { blobs, files } from './files-memory';
import { bytesSource, keepFile } from '../lib/attachments';
import { randomBytes } from '../lib/crypto';
import { armPlaceReminders, deleteNote, myNotes, remindAt, seenReminders, writeNote } from '../lib/myself';
import { setCurrentSpace } from '../lock/keys';
import { addNote, changeNote, FILE, isDue, isWaiting, loadNotes, markTold, newNoteId, notesSummary, removeNote, type NotesPlace } from '../lock/myself-data';
import { saveClip } from '../lock/voice-clips';

const place = (holder: NotesPlace['holder'] = 'space', space = 0, key = randomBytes(32)): NotesPlace => ({ holder, space, key });
const note = (text: string, at = Date.now(), more = {}) => ({ id: newNoteId(), at, text, ...more });

test("a space's notes are its own: the oldest first, sealed, and apart from another space's and its hidden places'", async () => {
  files.clear();
  blobs.clear();
  const mine = place();
  const other = place('space', 1);
  const hidden = place('hidden', 0);
  await addNote(mine, note('first', 1000));
  await addNote(mine, note('second', 2000));
  await addNote(other, note('elsewhere'));
  await addNote(hidden, note('hidden'));
  assert.deepEqual((await loadNotes(mine)).map((n) => n.text), ['first', 'second']);
  assert.deepEqual((await loadNotes(other)).map((n) => n.text), ['elsewhere']);
  assert.deepEqual((await loadNotes(hidden)).map((n) => n.text), ['hidden']);
  // Another key finds nothing there, and the file says nothing of the words.
  assert.deepEqual(await loadNotes({ ...mine, key: randomBytes(32) }), []);
  assert.ok(!files.get(FILE)?.includes('first'));
});

test('a reminder is set, changed, taken away and seen; the home row counts those that came', async () => {
  files.clear();
  const mine = place();
  const now = 10_000_000;
  const soon = await addNote(mine, note('call the bank', now - 5000, { due: now + 60_000 }));
  const past = await addNote(mine, note('water the plants', now - 4000, { due: now - 1000 }));
  await addNote(mine, note('just a note', now - 3000));
  let notes = await loadNotes(mine);
  assert.ok(isWaiting(notes[0], now) && !isDue(notes[0], now));
  assert.ok(isDue(notes[1], now));
  let summary = notesSummary(notes, now);
  assert.equal(summary.last?.text, 'just a note');
  assert.deepEqual(summary.due.map((n) => n.text), ['water the plants']);
  assert.equal(summary.next, now + 60_000);
  // Seen: no longer counted, and it does not come again.
  await markTold(mine, [past.id]);
  notes = await loadNotes(mine);
  assert.equal(notesSummary(notes, now).due.length, 0);
  assert.ok(!isWaiting(notes[1], now));
  // A new time for a seen one makes it remind again; taking it away leaves the note.
  await changeNote(mine, past.id, { due: now + 120_000 });
  assert.ok(isWaiting((await loadNotes(mine))[1], now));
  await changeNote(mine, soon.id, { due: null });
  notes = await loadNotes(mine);
  assert.equal(notes[0].due, undefined);
  assert.equal(notes[0].text, 'call the bank');
  assert.equal(notesSummary(notes, now).next, now + 120_000);
  assert.equal(await changeNote(mine, newNoteId(), { due: now }), null);
});

test('reminders seen in the chat are told to the phone, which takes them out of its notice; only those that came', async () => {
  files.clear();
  seen.clear();
  setCurrentSpace(0, randomBytes(32));
  try {
    const now = Date.now();
    await writeNote({ text: 'came', due: now - 1000 });
    const waiting = await writeNote({ text: 'later', due: now + 3_600_000 });
    const came = (await myNotes()).find((n) => n.text === 'came')!;
    await seenReminders(await myNotes(), now);
    assert.deepEqual([...seen], [came.id]);
    assert.ok(!seen.has(waiting.id));
    // Seen once: nothing again.
    seen.clear();
    await seenReminders(await myNotes(), now);
    assert.deepEqual([...seen], []);
  } finally {
    setCurrentSpace(null);
  }
});

test('a note deleted takes its photo or file and its voice message with it', async () => {
  files.clear();
  blobs.clear();
  const mine = place();
  const file = await keepFile(bytesSource(randomBytes(3000)), { name: 'a.jpg', mime: 'image/jpeg', kind: 'photo' });
  const voice = await saveClip(randomBytes(500), 2000);
  const withFile = await addNote(mine, note('', Date.now(), { file }));
  const withVoice = await addNote(mine, note('', Date.now(), { voice }));
  assert.ok([...blobs.keys()].some((name) => name.includes(file.id)));
  assert.ok([...blobs.keys()].some((name) => name.includes(voice.id)));
  assert.equal((await removeNote(mine, withFile.id))?.id, withFile.id);
  await removeNote(mine, withVoice.id);
  assert.ok(![...blobs.keys()].some((name) => name.includes(file.id) || name.includes(voice.id)));
  assert.deepEqual(await loadNotes(mine), []);
  assert.equal(await removeNote(mine, withFile.id), null);
});

test("a hidden place's reminders are told by the phone only while it receives closed; the space's always are", async () => {
  files.clear();
  blobs.clear();
  reminders.clear();
  setCurrentSpace(0, randomBytes(32));
  try {
    const later = Date.now() + 3_600_000;
    const own = await writeNote({ text: 'space', due: later });
    assert.equal(reminders.get(own.id), later);
    const hidden = place('hidden1');
    const closed = { place: hidden, arm: false };
    const kept = await writeNote({ text: 'hidden', due: later }, closed);
    assert.ok(!reminders.has(kept.id));
    assert.deepEqual((await myNotes()).map((n) => n.text), ['space']);
    assert.deepEqual((await myNotes(closed)).map((n) => n.text), ['hidden']);

    // Its switch on, what is still to come is told; off, no longer, and the space's stays.
    await armPlaceReminders(hidden, true);
    assert.equal(reminders.get(kept.id), later);
    await armPlaceReminders(hidden, false);
    assert.ok(!reminders.has(kept.id));
    assert.equal(reminders.get(own.id), later);

    // While it receives, a time set is told; while it does not, it is not.
    const receiving = { place: hidden, arm: true };
    await remindAt(kept.id, later + 1000, receiving);
    assert.equal(reminders.get(kept.id), later + 1000);
    await remindAt(kept.id, later + 2000, closed);
    assert.ok(!reminders.has(kept.id));
    assert.equal((await myNotes(closed))[0].due, later + 2000);

    // Deleted there, the space's note stays.
    await deleteNote(kept.id, closed);
    assert.deepEqual(await myNotes(closed), []);
    assert.deepEqual((await myNotes()).map((n) => n.text), ['space']);
  } finally {
    setCurrentSpace(null);
  }
});
