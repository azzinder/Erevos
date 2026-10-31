// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useRef, useState } from 'react';
import { Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { t } from '../lib/i18n';
import { space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';
import { EdgeIcon, SeenIcon } from './icons';

// Round arrows over a thread's lower right corner, as messengers have them: to its start (the
// older), to where it was last seen (the first message that was new when it opened) and to its end
// (the newest). Every chat draws them over its thread: Erevos, groups, SMS, Matrix, XMPP and Nostr.

/** How far from one of its ends a thread counts as away from it: half of what shows of it. */
const AWAY = 0.5;

/** A message that was gone to sits this far under the top of the thread. */
export const BELOW_TOP = 96;

/** Whether a thread is away from its start, and from its end, and whether where it was left is out of sight. */
export type ThreadAway = { start: boolean; end: boolean; seen: boolean };

/**
 * Where a thread is, from its scrolling: give `onScroll` to its ScrollView. `spot` is set by the
 * screen to say where the chat was left, as the first message that was new when it opened sits in
 * the thread's scrolling: undefined when the chat has no such place, null when that message is not
 * drawn (so out of sight).
 */
export function useThreadAway() {
  const [away, setAway] = useState<ThreadAway>({ start: false, end: false, seen: false });
  const last = useRef(away);
  const spot = useRef<() => number | null | undefined>(() => undefined);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const room = layoutMeasurement.height * AWAY;
    const at = spot.current();
    const now = {
      start: contentOffset.y > room,
      end: contentSize.height - contentOffset.y - layoutMeasurement.height > room,
      seen: at !== undefined && (at === null || at < contentOffset.y || at > contentOffset.y + layoutMeasurement.height - BELOW_TOP),
    };
    if (now.start === last.current.start && now.end === last.current.end && now.seen === last.current.seen) return;
    last.current = now;
    setAway(now);
  };
  return { away, onScroll, spot };
}

/**
 * The arrows, while the thread is away from its end (`end`): the one down to the end, and the one up
 * to the start while it is away from that too (`start`). Between them, the one to where the chat was
 * last seen (`seen`, with `onSeen`), for as long as the screen has that place and it is not in
 * sight: the first message that was new when the chat opened. Read to the end, none covers the last
 * message. `bottom` lifts them above what sits under the thread (a message field in the thread's own
 * scrolling).
 */
export function ThreadArrows({
  start,
  end,
  onStart,
  onEnd,
  seen = false,
  onSeen,
  bottom = space.md,
}: {
  start: boolean;
  end: boolean;
  onStart: () => void;
  onEnd: () => void;
  seen?: boolean;
  onSeen?: () => void;
  bottom?: number;
}) {
  const last = seen && !!onSeen;
  if (!end && !last) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: space.md, bottom, gap: space.sm }}>
      {start && end ? <Arrow up label={t('To the start of the chat')} onPress={onStart} /> : null}
      {last ? <Arrow seen label={t('To where you left off')} onPress={onSeen} /> : null}
      {end ? <Arrow label={t('To the end of the chat')} onPress={onEnd} /> : null}
    </View>
  );
}

function Arrow({ up = false, seen = false, label, onPress }: { up?: boolean; seen?: boolean; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        boxShadow: `0px 4px 14px ${withAlpha('#000000', 0.28)}`,
      })}
    >
      {seen ? <SeenIcon color={colors.text} size={22} /> : <EdgeIcon color={colors.text} size={22} up={up} />}
    </Pressable>
  );
}
