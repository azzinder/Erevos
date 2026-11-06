// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A chat thread going to its end by itself (lib/thread-follow.ts, app/chat.tsx): the scrolling on
// the way, near the top of what shows, is not the person's, so it draws no earlier messages, which
// kept the chat at a message long read; it ends at the end, as the person takes hold of the thread,
// or after GOING_MOST.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GOING_MOST, ThreadFollow } from '../lib/thread-follow';

test('scrolling is the person\'s unless the thread goes to its end by itself', () => {
  const follow = new ThreadFollow();
  assert.equal(follow.person(false, 0), true);
  assert.equal(follow.person(true, 0), true);
  assert.equal(follow.going(0), false);
});

test('on its own way to the end, what it passes is not the person\'s, until it is at the end', () => {
  const follow = new ThreadFollow();
  follow.go(1000);
  assert.equal(follow.going(1000), true);
  // Passing the top of what shows, as it opens: no earlier messages.
  assert.equal(follow.person(false, 1100), false);
  assert.equal(follow.person(false, 1200), false);
  assert.equal(follow.person(true, 1300), false, 'the scroll that reaches the end is its own too');
  assert.equal(follow.going(1300), false);
  assert.equal(follow.person(false, 1400), true, 'after that, the person scrolls');
});

test('the person taking hold of the thread ends it, and so does a way that never gets to the end', () => {
  const follow = new ThreadFollow();
  follow.go(0);
  follow.take();
  assert.equal(follow.person(false, 10), true);
  follow.go(0);
  assert.equal(follow.person(false, GOING_MOST - 1), false);
  assert.equal(follow.person(false, GOING_MOST), true);
  // Going again (the chat grew) starts it over.
  follow.go(5000);
  assert.equal(follow.person(false, 5000 + GOING_MOST - 1), false);
});
