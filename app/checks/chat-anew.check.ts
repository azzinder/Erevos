// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shownAnew } from '../lib/shown-anew';
import type { Message } from '../lib/chat-screen';

const message = (id: number, tag: string, text = tag): Message => ({ id, peer: 'contact:a', text, mine: false, tag, until: 0, lasts: 0, mark: 0, at: id });

test('a chat opened while a look took messages shows them once that look ends, each once', () => {
  // Shown as the history held them as the chat opened (ids 1, 2); then one the radio brought (3),
  // and one the chat's own look took and kept, now also in the history (4).
  const list = [message(1, 'a'), message(2, 'b'), message(3, 'radio'), message(4, 'own')];
  // The history read whole again: the two from before, the one the look under way took, and the chat's own.
  const whole = [message(11, 'a'), message(12, 'b', 'b, read'), message(13, 'took'), message(14, 'own')];
  const shown = shownAnew(whole, list, new Set([1, 2]));
  assert.deepEqual(shown.map((m) => m.id), [11, 12, 13, 14, 3]);
  assert.equal(shown[1].text, 'b, read');
  // A message with no tag stays as it was shown, unless the history held it.
  const untagged = { ...message(5, ''), tag: '' };
  assert.deepEqual(shownAnew(whole, [untagged], new Set()).map((m) => m.id), [11, 12, 13, 14, 5]);
});
