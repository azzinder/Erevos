import { useRef, useState } from 'react';
import { Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { t } from '../lib/i18n';
import { space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';
import { EdgeIcon } from './icons';

// Two round arrows over a thread's lower right corner, as messengers have them: to its start and to
// its end. The chat, a group and an SMS conversation each draw them over their thread.

/** How far from one of its ends a thread counts as away from it: half of what shows of it. */
const AWAY = 0.5;

/** Whether a thread is away from its start, and from its end. */
export type ThreadAway = { start: boolean; end: boolean };

/** Where a thread is, from its scrolling: give `onScroll` to its ScrollView. */
export function useThreadAway() {
  const [away, setAway] = useState<ThreadAway>({ start: false, end: false });
  const last = useRef(away);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const room = layoutMeasurement.height * AWAY;
    const now = { start: contentOffset.y > room, end: contentSize.height - contentOffset.y - layoutMeasurement.height > room };
    if (now.start === last.current.start && now.end === last.current.end) return;
    last.current = now;
    setAway(now);
  };
  return { away, onScroll };
}

/**
 * The arrows, while the thread is away from its end (`end`): the one down to the end, and the one up
 * to the start while it is away from that too (`start`). Read to the end, neither covers the last
 * message.
 */
export function ThreadArrows({ start, end, onStart, onEnd }: { start: boolean; end: boolean; onStart: () => void; onEnd: () => void }) {
  if (!end) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: space.md, bottom: space.md, gap: space.sm }}>
      {start ? <Arrow up label={t('To the start of the chat')} onPress={onStart} /> : null}
      <Arrow label={t('To the end of the chat')} onPress={onEnd} />
    </View>
  );
}

function Arrow({ up = false, label, onPress }: { up?: boolean; label: string; onPress: () => void }) {
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
      <EdgeIcon color={colors.text} size={22} up={up} />
    </Pressable>
  );
}
