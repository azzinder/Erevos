// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Each chat's own look (theme/look.ts, components/chat-look.tsx): the letters and the text size kept
// with a look, and a look from an older Erevos taking the usual ones; the messages' text drawn
// larger or smaller, and as it was at the normal size; the letters set for every text while the
// look shows; a Matrix, XMPP or Nostr bubble in the look's shape; Chat with myself's own look kept
// with its notes, apart in each place, and kept when notes come from another device; and a hidden
// place's muted chat on Matrix, XMPP or Nostr telling of nothing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { files } from './files-memory';
import { randomBytes } from '../lib/crypto';
import { hearing, onPlaceNetworkMessage } from '../lib/network-notices';
import { ALWAYS, type ChatNotify } from '../lock/chat-notify';
import { addNote, loadNotes, loadNotesLook, mergeNotes, newNoteId, saveNotesLook, type NotesPlace } from '../lock/myself-data';
import { softBubble, textSized, bubbleStyles } from '../theme/bubbles';
import { applyStyle, buildColors, shape } from '../theme/colors';
import { checkedLook, DEFAULT_LOOK, TEXT_SIZES } from '../theme/look';

const colors = buildColors('classic', 'dark', 'auto');

test('a look keeps its letters and its text size; an older one takes the usual ones', () => {
  const look = checkedLook({ ...DEFAULT_LOOK, font: 'serif', textSize: 'larger' });
  assert.equal(look.font, 'serif');
  assert.equal(look.textSize, 'larger');
  // Made by an Erevos before these: the style's own letters, at the normal size.
  const { font: _font, textSize: _size, ...older } = DEFAULT_LOOK;
  const was = checkedLook(older);
  assert.equal(was.font, 'style');
  assert.equal(was.textSize, 'normal');
  // Written by a newer Erevos, or damaged: the usual ones too.
  const odd = checkedLook({ ...DEFAULT_LOOK, font: 'comic', textSize: 'huge' });
  assert.equal(odd.font, 'style');
  assert.equal(odd.textSize, 'normal');
});

test("the messages' text grows with the text size, and stays as each chat had it at the normal one", () => {
  assert.equal(textSized('normal', 15), null);
  const sizes = TEXT_SIZES.map((size) => textSized(size, 15)?.fontSize ?? 15);
  assert.deepEqual([...sizes].sort((a, b) => a - b), sizes);
  assert.ok(sizes[0] < 15 && sizes[sizes.length - 1] > 15);
  // The line grows with the letters.
  const large = textSized('large', 16)!;
  assert.ok(large.lineHeight! > large.fontSize!);
  // The space's chats: the bubbles' text, at the normal size as before.
  assert.equal(bubbleStyles('round', colors).mineText.fontSize, undefined);
  assert.equal(bubbleStyles('round', colors, 'larger').theirsText.fontSize, textSized('larger', 15)!.fontSize);
  assert.equal(bubbleStyles('line', colors, 'small').mineText.fontSize, textSized('small', 15)!.fontSize);
});

test('the letters chosen win over the style’s while its look shows, and go with it', () => {
  applyStyle('modernist', null, 'flat', 'mono');
  assert.equal(shape.face, 'mono');
  // Matrix keeps its own monospace family; letters chosen go over it.
  applyStyle('matrix', null, 'flat', 'sans');
  assert.equal(shape.family, 'mono');
  assert.equal(shape.face, 'sans');
  applyStyle('classic');
  assert.equal(shape.face, null);
});

test("a Matrix, XMPP or Nostr bubble takes the look's shape and keeps its colours", () => {
  const round = softBubble('round', colors, true);
  assert.equal(round.backgroundColor, colors.primarySoft);
  assert.ok(Number(softBubble('square', colors, false).borderRadius) <= 4);
  assert.equal(softBubble('square', colors, false).backgroundColor, colors.surfaceAlt);
  // A line beside the text, and no fill.
  const line = softBubble('line', colors, true);
  assert.equal(line.backgroundColor, undefined);
  assert.equal(line.borderRightWidth, 3);
  assert.equal(softBubble('line', colors, false).borderLeftWidth, 3);
});

test("Chat with myself's own look is kept with its notes, apart in each place, and stays as notes come", async () => {
  files.clear();
  const mine: NotesPlace = { holder: 'space', space: 0, key: randomBytes(32) };
  const hidden: NotesPlace = { holder: 'hidden', space: 0, key: randomBytes(32) };
  assert.equal(await loadNotesLook(mine), null);
  await addNote(mine, { id: newNoteId(), at: 1000, text: 'first' });
  await saveNotesLook(mine, { ...DEFAULT_LOOK, wallpaper: 'stars', textSize: 'large' });
  assert.equal((await loadNotesLook(mine))?.wallpaper, 'stars');
  assert.equal(await loadNotesLook(hidden), null);
  // The notes stay as they were.
  assert.deepEqual((await loadNotes(mine)).map((n) => n.text), ['first']);
  // Notes from another device of the account leave the look as it is here.
  const id = newNoteId();
  await mergeNotes(mine, [{ note: { id, at: 2000, text: 'from the computer', v: 2000 }, make: async () => ({}) }], []);
  assert.deepEqual((await loadNotes(mine)).map((n) => n.text), ['first', 'from the computer']);
  assert.equal((await loadNotesLook(mine))?.textSize, 'large');
  // Same as the app again.
  await saveNotesLook(mine, null);
  assert.equal(await loadNotesLook(mine), null);
  assert.deepEqual((await loadNotes(mine)).map((n) => n.text), ['first', 'from the computer']);
});

test("a hidden place's muted chat on Matrix, XMPP or Nostr tells of nothing; the others do", () => {
  const notify: Record<string, ChatNotify> = { 'matrix:!quiet': { until: ALWAYS }, 'matrix:!past': { until: 1 } };
  const came: string[] = [];
  const stop = onPlaceNetworkMessage((_space, pocket, where) => came.push(`${pocket}:${where}`));
  const heard = hearing({ space: 0, pocket: 2 }, (where) => notify[where] ?? null);
  heard.hear(new Map());
  heard.hear(
    new Map([
      ['matrix:!quiet', 3],
      ['matrix:!past', 1],
      ['matrix:!loud', 2],
    ]),
  );
  assert.deepEqual(came.sort(), ['2:matrix:!loud', '2:matrix:!past']);
  stop();
});
