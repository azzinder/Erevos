// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useRouter } from 'expo-router';
import { useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View, type ViewStyle } from 'react-native';

import { useColors } from '../theme/context';
import { BackIcon } from './icons';

// A swipe to the right goes back, as the back arrow does, from anywhere on the screen, not only
// from its edge (where Android's own back gesture is, on phones that have it). The screen leans
// after the finger and a round back arrow comes out at the left; let go past a third of the way, or
// with a quick flick, and it goes back, else it all comes back. Tabs that swipe to the
// side themselves (components/swipe-tabs.tsx) take the swipe first, being under
// the finger, and up and down still scroll.

// How far, in points, before the swipe counts, and how far the screen leans at most.
const START = 18;
const LEAN = 56;
// A flick this fast (points per millisecond) goes back however short it was.
const FLICK = 0.8;

export function SwipeBack({ onBack, enabled = true, style, children }: {
  /** What going back does here; by default the screen before this one, when there is one. */
  onBack?: () => void;
  enabled?: boolean;
  style?: ViewStyle;
  children: ReactNode;
}) {
  const router = useRouter();
  const colors = useColors();
  const x = useRef(new Animated.Value(0)).current;
  const width = useRef(360);
  const back = useRef<{ run: (() => void) | null }>({ run: null });
  back.current.run = !enabled ? null : onBack ?? (router.canGoBack() ? () => router.back() : null);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !!back.current.run && g.dx > START && g.dx > Math.abs(g.dy) * 2.5,
        onPanResponderMove: (_, g) => x.setValue(Math.max(0, g.dx)),
        onPanResponderRelease: (_, g) => {
          const run = back.current.run;
          const done = g.dx > width.current / 3 || (g.vx > FLICK && g.dx > START * 2);
          Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 24 }).start();
          if (done && run) run();
        },
        onPanResponderTerminate: () => {
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [x],
  );

  const lean = x.interpolate({ inputRange: [0, 400], outputRange: [0, LEAN], extrapolate: 'clamp' });
  // Whole about where letting go goes back (a third of a phone's width).
  const shown = x.interpolate({ inputRange: [0, START, 120], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const arrow = x.interpolate({ inputRange: [0, 120], outputRange: [-48, 16], extrapolate: 'clamp' });
  return (
    <View
      style={[styles.fill, style]}
      onLayout={(e) => (width.current = e.nativeEvent.layout.width || width.current)}
      {...pan.panHandlers}
    >
      <Animated.View style={[styles.fill, { transform: [{ translateX: lean }] }]}>{children}</Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.arrow,
          { backgroundColor: colors.sheet, borderColor: colors.border, opacity: shown, transform: [{ translateX: arrow }, { scale: shown }] },
        ]}
      >
        <BackIcon color={colors.text} size={22} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  arrow: {
    position: 'absolute',
    left: 0,
    top: '45%',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
