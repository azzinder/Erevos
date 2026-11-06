// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { MatrixMessage, MatrixRoom, MatrixState } from './matrix';
import type { FeedPost } from './nostr-feed';

// The Public tab of home (components/public-feed.tsx): the public posts of the people the space's
// Nostr key follows (lib/nostr-feed.ts) and the messages of the public Matrix rooms the space is
// in, in one list, newest first, as one feed. The Nostr posts are looked up a page at a time; the
// Matrix messages are those the phone keeps of each room (lib/matrix.ts), so they are shown down
// to the oldest Nostr post shown while older posts may come, and all of them after. Kept pure.

/** Which of the feed shows: all of it, or one network's. */
export type PublicShow = 'all' | 'nostr' | 'matrix';

/** One row of the feed. */
export type PublicItem =
  | { kind: 'nostr'; id: string; at: number; post: FeedPost }
  | { kind: 'matrix'; id: string; at: number; roomId: string; room: string; server: string; message: MatrixMessage };

/** The most Matrix messages the feed holds, the newest. */
export const MATRIX_FEED_MOST = 500;

/** Whether a room is a public one we are in: anyone may join it, and it is not a space. */
export function isPublicRoom(state: Pick<MatrixState, 'userId'>, room: MatrixRoom): boolean {
  return room.joins === 'public' && !room.space && !room.direct && !room.invitedBy && room.members[state.userId]?.membership !== 'invite';
}

/** The server a room is on, as its address or ID says. */
export function roomServer(room: Pick<MatrixRoom, 'id' | 'alias'>): string {
  const of = room.alias ?? room.id;
  const at = of.indexOf(':');
  return at > 0 ? of.slice(at + 1) : '';
}

/** Whether a message shows in the feed: words or a photo, not a call's line, not taken back, not
 *  still locked, not an answer inside a thread, which shows in its thread. */
function shows(message: MatrixMessage): boolean {
  if (message.call || message.deleted || message.locked || message.state === 'failed') return false;
  if (message.thread && message.thread !== message.id) return false;
  if (message.poll || message.place) return true;
  return message.text.trim() !== '' || message.file?.kind === 'image';
}

/** The messages of the public rooms we are in, as rows of the feed, newest first, MATRIX_FEED_MOST at most. */
export function matrixFeed(state: MatrixState): PublicItem[] {
  const items: PublicItem[] = [];
  for (const room of Object.values(state.rooms)) {
    if (!isPublicRoom(state, room)) continue;
    const name = room.name || room.alias || room.id;
    const server = roomServer(room);
    for (const message of room.messages) {
      if (!shows(message)) continue;
      items.push({ kind: 'matrix', id: `matrix:${room.id}:${message.id}`, at: message.ts, roomId: room.id, room: name, server, message });
    }
  }
  return items.sort((a, b) => b.at - a.at || (a.id < b.id ? -1 : 1)).slice(0, MATRIX_FEED_MOST);
}

/**
 * The feed as it shows: the Nostr posts and the Matrix messages of `show`, newest first. While
 * older Nostr posts may come (`older`) and some are shown, a Matrix message older than the oldest
 * of them waits for them, so the two stay in order as the list grows.
 */
export function mergeFeed(posts: readonly FeedPost[], matrix: readonly PublicItem[], show: PublicShow, older: boolean): PublicItem[] {
  const nostr: PublicItem[] = show === 'matrix' ? [] : posts.map((post) => ({ kind: 'nostr', id: `nostr:${post.note}`, at: post.at, post }));
  if (show === 'nostr') return nostr;
  const floor = show === 'all' && older && posts.length ? Math.min(...posts.map((post) => post.at)) : -Infinity;
  const rooms = matrix.filter((item) => item.at >= floor);
  return [...nostr, ...rooms].sort((a, b) => b.at - a.at || (a.id < b.id ? -1 : 1));
}

/** Whether a row of home's list is one of the feed. */
export const isPublicItem = (item: object): item is PublicItem => 'kind' in item && ((item as PublicItem).kind === 'nostr' || (item as PublicItem).kind === 'matrix') && 'at' in item;
