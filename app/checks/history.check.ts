// The messages kept on the phone (lock/history.ts) and the sealed file under them (lock/sealed-file.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import { FILE, fitted, History, newTag, SIZE, type HistoryData } from '../lock/history';
import { sealedFile } from '../lock/sealed-file';
import { splitVoice, VoiceAssembler, PART_SIZE, MAX_PARTS } from '../lib/voice';
import { loadClip, saveClip } from '../lock/voice-clips';
import { blobs, files } from './files-memory';

const t = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    files.clear();
    blobs.clear();
    await fn();
  });

const values = () => {
  const data = JSON.parse(files.get(FILE)!) as Record<string, string[]>;
  return [...data.space, ...data.hidden];
};

t('keeps the messages of a chat between launches, in order, sealed with its key', async () => {
  const key = randomBytes(32);
  const history = await History.open('space', 0, key);
  await history.add({ peer: 'contact:aa', text: 'γεια σου', mine: true, at: 1, tag: newTag() });
  await history.add({ peer: 'contact:bb', text: 'hello', mine: false, at: 2, tag: newTag() });
  await history.add({ peer: 'contact:aa', text: 'τι κάνεις;', mine: false, at: 3, tag: newTag() });

  const again = await History.open('space', 0, key);
  assert.deepEqual(
    again.messages().map((m) => [m.peer, m.text, m.mine]),
    [
      ['contact:aa', 'γεια σου', true],
      ['contact:bb', 'hello', false],
      ['contact:aa', 'τι κάνεις;', false],
    ],
  );
  assert.ok(!files.get(FILE)!.includes('hello'));
  assert.deepEqual((await History.open('space', 0, randomBytes(32))).messages(), []);
  assert.deepEqual((await History.open('hidden', 0, key)).messages(), []);
});

t('every value is the same size, used or not, whatever the text', async () => {
  const history = await History.open('hidden', 1, randomBytes(32));
  const sizes = () => new Set(values().map((v) => v.length));
  await history.add({ peer: 'contact:aa', text: 'a', mine: true, at: 1, tag: newTag() });
  assert.equal(values().length, 8);
  assert.equal(sizes().size, 1);
  const [size] = sizes();
  await history.add({ peer: 'contact:aa', text: 'αβγδ'.repeat(500), mine: true, at: 2, tag: newTag() });
  assert.deepEqual([...sizes()], [size]);
});

t('the oldest messages go when a chat holds more than fits', async () => {
  const key = randomBytes(32);
  const history = await History.open('space', 2, key);
  const text = 'κείμενο '.repeat(100);
  for (let at = 0; at < 60; at++) await history.add({ peer: at % 2 ? 'contact:aa' : 'contact:bb', text, mine: true, at, tag: newTag() });
  const kept = (await History.open('space', 2, key)).messages();
  assert.ok(kept.length < 60 && kept.length > 30, `${kept.length}`);
  assert.equal(kept[kept.length - 1].at, 59);
  assert.equal(kept[0].at, 60 - kept.length);

  const data: HistoryData = { chats: { x: [[1, 1, 'z'.repeat(SIZE), newTag()]] } };
  assert.deepEqual(fitted(data), { chats: {} });
});

t('deletes one message by its tag, and gives messages kept before tags a tag of their own', async () => {
  const key = randomBytes(32);
  const history = await History.open('space', 0, key);
  const tag = newTag();
  await history.add({ peer: 'contact:aa', text: 'one', mine: true, at: 1, tag });
  await history.add({ peer: 'contact:aa', text: 'two', mine: false, at: 2, tag: newTag() });
  await history.remove('contact:aa', tag);
  await history.remove('contact:bb', tag);
  const kept = (await History.open('space', 0, key)).messages();
  assert.deepEqual(kept.map((m) => m.text), ['two']);
  assert.match(kept[0].tag, /^[0-9a-f]{12}$/);
  await history.remove('contact:aa', kept[0].tag);
  assert.deepEqual((await History.open('space', 0, key)).messages(), []);

  const before = sealedFile<unknown>({ name: FILE, empty: {}, checked: (v) => v, block: SIZE, fixed: true });
  await before.save('space', 0, key, { chats: { 'contact:aa': [[1, 1, 'old']] } });
  const [old] = (await History.open('space', 0, key)).messages();
  assert.equal(old.text, 'old');
  assert.match(old.tag, /^[0-9a-f]{12}$/);
});

t('deletes the messages of one chat and keeps the others', async () => {
  const key = randomBytes(32);
  const history = await History.open('space', 0, key);
  await history.add({ peer: 'contact:aa', text: 'one', mine: true, at: 1, tag: newTag() });
  await history.add({ peer: 'contact:bb', text: 'two', mine: true, at: 2, tag: newTag() });
  await history.clear('contact:aa');
  assert.deepEqual(
    (await History.open('space', 0, key)).messages().map((m) => m.text),
    ['two'],
  );
});

t('a disappearing message is kept with its time, and goes once that has passed', async () => {
  const key = randomBytes(32);
  const history = await History.open('space', 0, key);
  await history.add({ peer: 'contact:aa', text: 'stays', mine: true, at: 1, tag: newTag() });
  await history.add({ peer: 'contact:aa', text: 'soon', mine: false, at: 2, tag: newTag(), until: 1000 });
  await history.add({ peer: 'contact:bb', text: 'later', mine: true, at: 3, tag: newTag(), until: 5000 });
  assert.equal(await history.expire(999), false);

  const again = await History.open('space', 0, key);
  assert.deepEqual(again.messages().map((m) => [m.text, m.until]), [['stays', 0], ['soon', 1000], ['later', 5000]]);
  assert.equal(await again.expire(1000), true);
  assert.deepEqual((await History.open('space', 0, key)).messages().map((m) => m.text), ['stays', 'later']);
  await again.expire(10_000);
  assert.deepEqual((await History.open('space', 0, key)).messages().map((m) => m.text), ['stays']);
  assert.ok(values().every((v) => v.length === values()[0].length));
});

t('marks what came and was read, and a disappearing message starts its time once read', async () => {
  const key = randomBytes(32);
  const history = await History.open('space', 0, key);
  const [one, two, three] = [newTag(), newTag(), newTag()];
  await history.add({ peer: 'contact:aa', text: 'one', mine: true, at: 1, tag: one, lasts: 60 });
  await history.add({ peer: 'contact:aa', text: 'two', mine: true, at: 2, tag: two });
  await history.add({ peer: 'contact:aa', text: 'three', mine: false, at: 3, tag: three, lasts: 300 });
  await history.add({ peer: 'contact:bb', text: 'four', mine: false, at: 4, tag: newTag() });

  // Ours came to their phone; nothing starts yet, and waiting messages do not expire.
  assert.deepEqual((await history.mark('contact:aa', true, 1, 100, [one, two])).sort(), [one, two].sort());
  assert.deepEqual(await history.mark('contact:aa', true, 1, 100, [one]), []);
  assert.equal(await history.expire(Number.MAX_SAFE_INTEGER), false);

  // They read the first: it disappears 60 seconds from then. Read here: theirs starts too.
  assert.deepEqual(await history.mark('contact:aa', true, 2, 1000, [one]), [one]);
  assert.deepEqual(await history.mark('contact:aa', false, 2, 2000), [three]);
  const again = await History.open('space', 0, key);
  assert.deepEqual(
    again.messages().map((m) => [m.text, m.mark, m.until, m.lasts]),
    [
      ['one', 2, 61_000, 0],
      ['two', 1, 0, 0],
      ['three', 2, 302_000, 0],
      ['four', 0, 0, 0],
    ],
  );
  await again.expire(61_000);
  assert.deepEqual((await History.open('space', 0, key)).messages().map((m) => m.text), ['two', 'three', 'four']);

  // A message kept before marks reads as not read.
  const before = sealedFile<unknown>({ name: FILE, empty: {}, checked: (v) => v, block: SIZE, fixed: true });
  await before.save('space', 1, key, { chats: { 'contact:aa': [[1, 0, 'old', one, 0, 0, 7]] } });
  assert.deepEqual((await History.open('space', 1, key)).messages().map((m) => [m.mark, m.until, m.lasts]), [[0, 0, 0]]);
});

t('a voice message keeps its sound sealed in a file of its own, deleted with the message', async () => {
  const key = randomBytes(32);
  const sound = randomBytes(25_000);
  const voice = await saveClip(sound, 7400.4);
  assert.equal(voice.ms, 7400);
  const [name] = blobs.keys();
  assert.ok(name.startsWith('erevos-voice-') && name.endsWith(voice.id));
  assert.notDeepEqual(blobs.get(name)!.slice(12, 40), sound.slice(0, 28));
  assert.deepEqual(await loadClip(voice), sound);
  await assert.rejects(loadClip({ ...voice, key: '00'.repeat(32) }));

  const history = await History.open('space', 0, key);
  const tag = newTag();
  await history.add({ peer: 'contact:aa', text: '', mine: false, at: 1, tag, voice, lasts: 60 });
  await history.add({ peer: 'contact:aa', text: 'text', mine: true, at: 2, tag: newTag() });
  const [kept] = (await History.open('space', 0, key)).messages();
  assert.deepEqual([kept.voice, kept.lasts, kept.mark], [voice, 60, 0]);
  assert.ok(!files.get(FILE)!.includes(voice.key));

  // Read, its time runs out, and its sound goes with it.
  await history.mark('contact:aa', false, 2, 1000);
  await history.expire(61_000);
  assert.equal(blobs.size, 0);
  assert.equal(await loadClip(voice), null);

  // However a message goes: deleted by its tag, or with its chat.
  const one = await saveClip(randomBytes(10), 1000);
  const two = await saveClip(randomBytes(10), 1000);
  await history.add({ peer: 'contact:aa', text: '', mine: true, at: 3, tag: 'aaaaaaaaaaaa', voice: one });
  await history.add({ peer: 'contact:bb', text: '', mine: true, at: 4, tag: newTag(), voice: two });
  await history.remove('contact:aa', 'aaaaaaaaaaaa');
  assert.deepEqual([await loadClip(one), (await loadClip(two))?.length], [null, 10]);
  await history.clear('contact:bb');
  assert.equal(blobs.size, 0);
});

test('a voice message is cut in parts and put back together, whatever order they come in', () => {
  const sound = randomBytes(PART_SIZE * 2 + 123);
  const parts = splitVoice(sound, 5000);
  assert.deepEqual(parts.map((p) => [p.part, p.parts, p.data.length]), [[0, 3, PART_SIZE], [1, 3, PART_SIZE], [2, 3, 123]]);
  const assembler = new VoiceAssembler();
  assert.equal(assembler.add('contact:aa', parts[2], 0), null);
  // Another chat's parts with the same id are another message.
  assert.equal(assembler.add('contact:bb', parts[0], 0), null);
  assert.equal(assembler.add('contact:aa', parts[0], 0), null);
  const whole = assembler.add('contact:aa', parts[1], 0)!;
  assert.deepEqual([whole.audio, whole.ms], [sound, 5000]);
  // Parts that stop coming are dropped after a while.
  assert.equal(assembler.add('contact:bb', parts[1], 11 * 60_000), null);
  assert.equal(assembler.add('contact:bb', parts[2], 11 * 60_000), null);
  assert.throws(() => splitVoice(new Uint8Array(PART_SIZE * MAX_PARTS + 1), 1000), /too long/);
});
