// The messages kept on the phone (lock/history.ts) and the sealed file under them (lock/sealed-file.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import { FILE, fitted, History, newTag, SIZE, type HistoryData } from '../lock/history';
import { sealedFile } from '../lock/sealed-file';
import { files } from './files-memory';

const t = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    files.clear();
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
