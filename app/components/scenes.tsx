import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { gradientStyle } from './glass';

// The scenes some styles draw behind the screens (components/backdrop.tsx): Neon's grid of light
// running to a horizon under a setting sun, Matrix's code raining down in columns, Paper's ruled
// lines and margin, and Aurora's soft pools of light. All stay faint, so the screens' text reads
// over them, and the rain stands still when the phone asks for less motion.

const NEON_GROUND = '#07060F';
const CYAN = '0, 229, 255';
const MAGENTA = '255, 43, 214';

/** Neon's grid: lines to a horizon at 64% of the height, a sun behind it and a glow along it. */
export function NeonGrid({ width, height }: { width: number; height: number }) {
  const horizon = Math.round(height * 0.64);
  const floor = height - horizon;
  // Lines across, closer together toward the horizon, as on ground seen from above it.
  const across = Array.from({ length: 14 }, (_, i) => {
    const t = (i + 1) / 14;
    return { top: horizon + Math.round(floor * t * t), alpha: 0.1 + 0.3 * t };
  });
  // Lines toward the horizon, from points along the foot (and past its edges) to one point on it.
  const cx = width / 2;
  const toward = Array.from({ length: 17 }, (_, i) => {
    const x = cx + (i - 8) * (width / 5);
    const dx = x - cx;
    return { length: Math.hypot(dx, floor), angle: (-Math.atan2(dx, floor) * 180) / Math.PI };
  });
  const sun = Math.round(Math.min(width * 0.55, 260));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: NEON_GROUND, overflow: 'hidden' }]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          gradientStyle(`radial-gradient(ellipse ${Math.round(width * 0.9)}px ${Math.round(height * 0.32)}px at 50% 64%, rgba(${MAGENTA}, 0.28) 0%, rgba(${MAGENTA}, 0) 100%)`),
        ]}
      />
      <View
        style={[
          {
            position: 'absolute',
            left: cx - sun / 2,
            top: horizon - sun * 0.62,
            width: sun,
            height: sun,
            borderRadius: sun / 2,
            opacity: 0.22,
          },
          gradientStyle('linear-gradient(to bottom, rgba(255, 210, 63, 1) 0%, rgba(255, 43, 214, 1) 70%)'),
        ]}
      />
      {/* The sun sinks behind the floor: the floor is the ground again, below the horizon. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: horizon, bottom: 0, backgroundColor: NEON_GROUND }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: horizon, height: 2, backgroundColor: `rgba(${MAGENTA}, 0.7)`, boxShadow: `0px 0px 18px rgba(${MAGENTA}, 0.9)` }} />
      {across.map(({ top, alpha }) => (
        <View key={top} style={{ position: 'absolute', left: 0, right: 0, top, height: 1, backgroundColor: `rgba(${CYAN}, ${alpha})` }} />
      ))}
      {toward.map(({ length, angle }, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: cx,
            top: horizon,
            width: 1,
            height: length,
            backgroundColor: `rgba(${CYAN}, 0.22)`,
            transformOrigin: 'top',
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      ))}
    </View>
  );
}

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ΣΩΔΨλ';
const STEP = 20;
const LINE = 18;

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => active && setReduce(on))
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}

/** One column of rain: its glyphs falling from above the screen to below it, again and again. */
function Column({ x, height, glyphs, duration, delay, still }: { x: number; height: number; glyphs: string; duration: number; delay: number; still: boolean }) {
  const fall = useRef(new Animated.Value(0)).current;
  const length = glyphs.length * LINE;
  useEffect(() => {
    if (still) {
      fall.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fall, duration, delay, still]);
  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-length, height] });
  const body = glyphs.slice(0, -1).split('').join('\n');
  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: STEP,
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: LINE,
        color: 'rgba(0, 255, 65, 0.3)',
        transform: [{ translateY }],
      }}
    >
      {body}
      {'\n'}
      <Animated.Text style={{ color: 'rgba(200, 255, 215, 0.75)', textShadowColor: 'rgba(0, 255, 65, 0.9)', textShadowRadius: 6 }}>{glyphs.slice(-1)}</Animated.Text>
    </Animated.Text>
  );
}

/** Matrix's rain: a column every few points across, each its own length and speed. */
export function MatrixRain({ width, height }: { width: number; height: number }) {
  const still = useReduceMotion();
  const columns = useMemo(
    () =>
      Array.from({ length: Math.ceil(width / STEP) }, (_, i) => {
        const count = 8 + Math.floor(Math.random() * 18);
        const glyphs = Array.from({ length: count }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('');
        return { x: i * STEP, glyphs, duration: 5000 + Math.random() * 9000, delay: Math.random() * 6000 };
      }),
    [width],
  );
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', overflow: 'hidden' }]}>
      {height > 0 ? columns.map((c) => <Column key={c.x} {...c} height={height} still={still} />) : null}
      {/* A veil, darker at the top where titles are, so text reads over the rain. */}
      <View style={[StyleSheet.absoluteFill, gradientStyle('linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.35) 100%)')]} />
    </View>
  );
}

const PAPER_GROUND = '#F5EFE3';
const RULE = 28;

/** Paper's ruled lines, in the pen's blue, and a red margin down the left. */
export function RuledPaper({ height }: { width: number; height: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: PAPER_GROUND, overflow: 'hidden' }]}>
      {Array.from({ length: Math.ceil(height / RULE) }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * RULE, height: 1, backgroundColor: 'rgba(31, 79, 163, 0.1)' }} />
      ))}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 8, width: 1, backgroundColor: 'rgba(179, 38, 30, 0.35)' }} />
    </View>
  );
}

/** Aurora's light: soft pools of mint, lilac and peach on near-white. */
export function AuroraLight({ width, height }: { width: number; height: number }) {
  const pool = (x: string, y: string, color: string, scale: number) =>
    `radial-gradient(ellipse ${Math.round(width * scale)}px ${Math.round(height * scale * 0.5)}px at ${x} ${y}, ${color} 0%, rgba(246, 247, 251, 0) 100%)`;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#F6F7FB', overflow: 'hidden' }]}>
      <View style={[StyleSheet.absoluteFill, gradientStyle(pool('10%', '8%', 'rgba(120, 230, 200, 0.45)', 0.9))]} />
      <View style={[StyleSheet.absoluteFill, gradientStyle(pool('95%', '35%', 'rgba(170, 140, 255, 0.4)', 0.8))]} />
      <View style={[StyleSheet.absoluteFill, gradientStyle(pool('25%', '92%', 'rgba(255, 170, 150, 0.38)', 0.9))]} />
    </View>
  );
}
