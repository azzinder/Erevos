import { useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import { radius, space } from '../theme/colors';
import { Text } from './ui';

// A row of a list that can be swiped aside: to the right for one thing (archive), to the left for
// another (delete), each shown in its colour under the row as it moves. Let go before half the way
// and the row comes back; past it, it goes and the thing is done. Up and down still scroll the list.

export type SwipeAction = { label: string; color: string; ink: string; run: () => void };

// How far, in points, before the row moves at all, and before letting go does the thing.
const START = 12;
const DONE = 96;

export function SwipeRow({ right, left, ground, children }: {
  /** Swiped to the right. */
  right?: SwipeAction;
  /** Swiped to the left. */
  left?: SwipeAction;
  /** The colour under the list, which the row takes while it moves, so the one under it does not
   *  show through. */
  ground: string;
  children: ReactNode;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const width = useRef(360);
  const actions = useRef({ right, left });
  actions.current = { right, left };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => {
          const way = g.dx > 0 ? actions.current.right : actions.current.left;
          return !!way && Math.abs(g.dx) > START && Math.abs(g.dx) > Math.abs(g.dy) * 2;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          const way = g.dx > 0 ? actions.current.right : actions.current.left;
          x.setValue(way ? g.dx : 0);
        },
        onPanResponderRelease: (_, g) => {
          const way = g.dx > 0 ? actions.current.right : actions.current.left;
          if (way && Math.abs(g.dx) > Math.min(DONE, width.current / 3)) {
            Animated.timing(x, { toValue: Math.sign(g.dx) * width.current, duration: 160, useNativeDriver: true }).start(() => {
              way.run();
              x.setValue(0);
            });
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

  // Under the row: what a swipe to the right does on the left side, and the other on the right.
  const rightShown = x.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const leftShown = x.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 0, 0], extrapolate: 'clamp' });
  const moving = x.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 0, 1], extrapolate: 'clamp' });
  return (
    <View onLayout={(e) => (width.current = e.nativeEvent.layout.width || width.current)}>
      {right ? (
        <Animated.View style={[styles.under, styles.start, { backgroundColor: right.color, opacity: rightShown }]}>
          <Text variant="label" color={right.ink}>
            {right.label}
          </Text>
        </Animated.View>
      ) : null}
      {left ? (
        <Animated.View style={[styles.under, styles.end, { backgroundColor: left.color, opacity: leftShown }]}>
          <Text variant="label" color={left.ink}>
            {left.label}
          </Text>
        </Animated.View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        <Animated.View style={[styles.under, { backgroundColor: ground, opacity: moving }]} pointerEvents="none" />
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  under: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg, justifyContent: 'center', paddingHorizontal: space.xl },
  start: { alignItems: 'flex-start' },
  end: { alignItems: 'flex-end' },
});
