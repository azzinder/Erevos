import { useRef, useState, type ElementRef, type ReactElement } from 'react';
import { Keyboard, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { leftOff } from '../lib/left-off';
import { space } from '../theme/colors';
import type { KeyboardAwareScrollView } from './keyboard';
import { BELOW_TOP, ThreadArrows } from './thread-arrows';

// What the chats with Matrix, XMPP and Nostr share, as the Erevos chat, a group and SMS have it
// (their threads sit above a field of their own; these screens scroll the head, the thread and the
// message field together): the thread opens at its last message with the message field under it,
// follows what comes while it is read at the end, and has the arrows to its start, to where it was
// last seen and to its end (components/thread-arrows.tsx).

/** How far from its start or end the thread counts as away from it: half of what shows of it. */
const AWAY = 0.5;
/** How near the end the thread is read, for what comes to be followed. */
const NEAR = 80;

type Place = { y: number; height: number };

/**
 * The scrolling of a chat screen made of its head, the thread (`threadProps`), and what is under it
 * (the message field and its buttons, the last of which takes `endProps`), all in one scrolling
 * view (`scrollProps`) that `withArrows` draws the arrows over. `list` is the thread, the oldest
 * first, and `unread` how many of the newest, not `mine`, were not read when the chat opened. `held`
 * says when something else keeps the place (older messages coming in above): the thread then
 * follows nothing.
 */
export function useNetworkThread<T>({
  list,
  idOf,
  mine,
  unread,
  held,
}: {
  list: readonly T[];
  idOf: (message: T) => string;
  mine: (message: T) => boolean;
  unread: number;
  held?: () => boolean;
}) {
  const scroll = useRef<ElementRef<typeof KeyboardAwareScrollView>>(null);
  const view = useRef({ y: 0, height: 0 });
  const thread = useRef<Place>({ y: 0, height: 0 });
  const end = useRef<Place>({ y: 0, height: 0 });
  const placed = useRef<Record<string, number>>({});
  const following = useRef(true);
  const [footHeight, setFootHeight] = useState(0);
  const [at, setAt] = useState({ start: false, end: false, below: false, seen: false });
  const last = useRef(at);

  // Where the chat was left: the first of the messages that were new when it opened, taken once.
  const left = useRef<string | null | undefined>(undefined);
  if (left.current === undefined && list.length > 0) left.current = leftOff(list, unread, idOf, mine);
  const seenId = left.current ?? null;

  // The end of what is under the thread: the screen's foot.
  const footEnd = () => end.current.y + end.current.height + space.md;

  // How much sits under the thread, to lift the arrows above it.
  function sayFoot() {
    const height = Math.max(0, footEnd() - (thread.current.y + thread.current.height));
    setFootHeight((before) => (Math.abs(before - height) < 1 ? before : height));
  }

  // How much of the view shows: the keyboard, while it is open, covers its lower part, as the screen
  // does not shrink for it (components/keyboard.tsx).
  const shows = () => view.current.height - (Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0);

  // Scrolls so that the message field ends what shows, and the last message is just above it.
  function toFoot(animated = false) {
    if (!view.current.height || !end.current.height) return;
    scroll.current?.scrollTo({ y: Math.max(0, footEnd() - shows()), animated });
  }

  // The arrows follow the scrolling: the thread's start and end, and where it was left, away from the view.
  function arrowsAt() {
    const { y, height } = view.current;
    const room = height * AWAY;
    const top = thread.current.y;
    const bottom = top + thread.current.height;
    const seenY = seenId !== null && placed.current[seenId] !== undefined ? top + placed.current[seenId] : null;
    const now = {
      start: y > top + room,
      end: bottom - (y + height) > room,
      below: y > bottom,
      // Where it was left shows until it is in sight.
      seen: seenY !== null && !(seenY >= y && seenY <= y + height - BELOW_TOP),
    };
    if (now.start === last.current.start && now.end === last.current.end && now.below === last.current.below && now.seen === last.current.seen) return;
    last.current = now;
    setAt(now);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    view.current.y = event.nativeEvent.contentOffset.y;
    following.current = Math.abs(view.current.y + shows() - footEnd()) < NEAR;
    arrowsAt();
  }

  // Opened, or grown: at the message field once, and after that while it is read there.
  const opened = useRef(false);
  function onContentSizeChange() {
    if (held?.()) return;
    if (!opened.current || following.current) {
      if (view.current.height && end.current.height && list.length > 0) {
        opened.current = true;
        toFoot();
      }
    }
    arrowsAt();
  }

  const scrollProps = {
    scrollEventThrottle: 100,
    onScroll,
    onContentSizeChange,
    onLayout: (event: LayoutChangeEvent) => {
      view.current.height = event.nativeEvent.layout.height;
      onContentSizeChange();
    },
  };

  const threadProps = {
    onLayout: (event: LayoutChangeEvent) => {
      thread.current = { y: event.nativeEvent.layout.y, height: event.nativeEvent.layout.height };
      sayFoot();
      arrowsAt();
    },
  };

  // The last of what sits under the thread (the buttons under the message field).
  const endProps = {
    onLayout: (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      end.current = { y, height };
      sayFoot();
      onContentSizeChange();
    },
  };

  // Where a message begins in the thread.
  const place = (id: string) => (event: LayoutChangeEvent) => {
    placed.current[id] = event.nativeEvent.layout.y;
  };

  // Scrolls the thread to a message, a little below the top.
  function goTo(id: string) {
    const y = placed.current[id];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, thread.current.y + y - BELOW_TOP), animated: true });
  }

  const toStart = () => scroll.current?.scrollTo({ y: Math.max(0, thread.current.y - space.xl), animated: true });
  const toEnd = () => {
    following.current = true;
    toFoot(true);
  };

  // Over the thread's lower right, above the message field when that is what shows there.
  const arrows = at.below ? null : (
    <ThreadArrows
      start={at.start}
      end={at.end}
      onStart={toStart}
      onEnd={toEnd}
      seen={at.seen}
      onSeen={seenId !== null ? () => goTo(seenId) : undefined}
      bottom={footHeight + space.xl}
    />
  );

  // The scrolling view with the arrows over it.
  const withArrows = (content: ReactElement) => (
    <View style={{ flex: 1 }}>
      {content}
      {arrows}
    </View>
  );

  return { scroll, scrollProps, threadProps, endProps, place, goTo, withArrows };
}
