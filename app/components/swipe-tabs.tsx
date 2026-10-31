// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View, type ViewStyle } from 'react-native';

// Tabs that a swipe to the side changes, as their chips do: to the left for the next one, to the
// right for the one before. The content leans after the finger, and the new tab slides in from the
// side it came from. Past the first or the last tab it only gives a little and comes back: a swipe
// on tabs never goes back a screen (components/swipe-back.tsx), only the back arrow does there.

const START = 18;
const DONE = 72;
const FLICK = 0.6;

export function SwipeTabs<T>({ tabs, current, onChange, grow = true, style, children }: {
  /** The tabs in the order their chips show them; fewer than two and swiping changes nothing. */
  tabs: readonly T[];
  current: T;
  onChange: (tab: T) => void;
  /** Whether it takes the rest of the screen, as a list does, or only as much as its content. */
  grow?: boolean;
  style?: ViewStyle;
  children: ReactNode;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const now = useRef({ tabs, current, onChange });
  now.current = { tabs, current, onChange };
  // The way the last swipe went (-1 to the left, 1 to the right), for the new tab to come in after it.
  const came = useRef(0);

  const neighbour = (dx: number): T | undefined => {
    const { tabs, current } = now.current;
    const at = tabs.indexOf(current);
    if (at < 0) return undefined;
    return tabs[dx < 0 ? at + 1 : at - 1];
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          now.current.tabs.length > 1 && Math.abs(g.dx) > START && Math.abs(g.dx) > Math.abs(g.dy) * 2.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => x.setValue(g.dx * (neighbour(g.dx) !== undefined ? 0.35 : 0.1)),
        onPanResponderRelease: (_, g) => {
          const next = neighbour(g.dx);
          const done = Math.abs(g.dx) > DONE || (Math.abs(g.vx) > FLICK && Math.abs(g.dx) > START * 2);
          if (done && next !== undefined) {
            came.current = Math.sign(g.dx);
            now.current.onChange(next);
          } else {
            Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [x],
  );

  // A tab a swipe brought slides in from the side the swipe came from; one its chip brought just shows.
  useEffect(() => {
    const way = came.current;
    came.current = 0;
    if (!way) return;
    x.setValue(-way * 48);
    Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  }, [current, x]);

  const fade = x.interpolate({ inputRange: [-120, 0, 120], outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
  return (
    <View style={[grow && styles.fill, style]} {...pan.panHandlers}>
      <Animated.View style={[grow && styles.fill, { opacity: fade, transform: [{ translateX: x }] }]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
