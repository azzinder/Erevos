import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { withAlpha } from '../theme/colors';
import type { Wallpaper } from '../theme/look';

import { gradientStyle } from './glass';

// The wallpapers chosen in Appearance, drawn behind the screens of any style (components/backdrop.tsx):
// dots, a grid, slanted stripes, stars, soft circles of light, or a gradient. Each lies on the
// style's own ground and is drawn in its accent, faintly, so the screens' text reads over it as it
// does on the plain ground. They are drawn with views, not repeating gradients, which phones lack;
// the stars and circles are placed by a fixed seed, so they stay where they are from one screen to
// the next.

export type Pattern = Exclude<Wallpaper, 'auto' | 'plain'>;

interface Props {
  pattern: Pattern;
  width: number;
  height: number;
  ground: string;
  accent: string;
  dark: boolean;
}

/** Numbers from a seed, the same every time (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DOT = 28;
const CELL = 32;
const STRIPE = 22;

function Dots({ width, height, ink }: { width: number; height: number; ink: string }) {
  const cols = Math.ceil(width / DOT);
  const rows = Math.ceil(height / DOT);
  return (
    <>
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        // Every other row moves half a step, as on dotted paper.
        const left = (i % cols) * DOT + (r % 2 ? DOT / 2 : 0) + DOT / 4;
        return <View key={i} style={{ position: 'absolute', left, top: r * DOT + DOT / 2, width: 3, height: 3, borderRadius: 1.5, backgroundColor: ink }} />;
      })}
    </>
  );
}

function Grid({ width, height, ink }: { width: number; height: number; ink: string }) {
  return (
    <>
      {Array.from({ length: Math.ceil(height / CELL) }, (_, i) => (
        <View key={`r${i}`} style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * CELL, height: 1, backgroundColor: ink }} />
      ))}
      {Array.from({ length: Math.ceil(width / CELL) }, (_, i) => (
        <View key={`c${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: (i + 1) * CELL, width: 1, backgroundColor: ink }} />
      ))}
    </>
  );
}

function Stripes({ width, height, ink }: { width: number; height: number; ink: string }) {
  // Level lines on a square wide enough to cover the screen once turned.
  const side = Math.ceil(Math.hypot(width, height));
  return (
    <View
      style={{
        position: 'absolute',
        left: (width - side) / 2,
        top: (height - side) / 2,
        width: side,
        height: side,
        transform: [{ rotate: '-35deg' }],
      }}
    >
      {Array.from({ length: Math.ceil(side / STRIPE) }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * STRIPE, height: 6, backgroundColor: ink }} />
      ))}
    </View>
  );
}

function Stars({ width, height, accent, dark }: { width: number; height: number; accent: string; dark: boolean }) {
  const stars = useMemo(() => {
    const next = seeded(7);
    return Array.from({ length: Math.round((width * height) / 3600) }, () => ({
      x: next() * width,
      y: next() * height,
      size: 1 + next() * next() * 2.5,
      alpha: 0.25 + next() * 0.5,
      tinted: next() < 0.3,
    }));
  }, [width, height]);
  const white = dark ? '#FFFFFF' : '#000000';
  return (
    <>
      {stars.map((s, i) => {
        const color = withAlpha(s.tinted ? accent : white, s.alpha * (dark ? 1 : 0.6));
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: color,
              boxShadow: s.size > 2.4 && dark ? `0px 0px 6px ${color}` : undefined,
            }}
          />
        );
      })}
    </>
  );
}

function Bokeh({ width, height, accent, dark }: { width: number; height: number; accent: string; dark: boolean }) {
  const circles = useMemo(() => {
    const next = seeded(11);
    return Array.from({ length: 9 }, () => ({
      x: next() * width,
      y: next() * height,
      size: 70 + next() * Math.min(width, 260),
      alpha: (dark ? 0.1 : 0.12) + next() * 0.12,
    }));
  }, [width, height, dark]);
  return (
    <>
      {circles.map((c, i) => (
        <View
          key={i}
          style={[
            { position: 'absolute', left: c.x - c.size / 2, top: c.y - c.size / 2, width: c.size, height: c.size, borderRadius: c.size / 2 },
            gradientStyle(`radial-gradient(circle at 50% 50%, ${withAlpha(accent, c.alpha)} 0%, ${withAlpha(accent, c.alpha * 0.6)} 60%, ${withAlpha(accent, 0)} 100%)`),
          ]}
        />
      ))}
    </>
  );
}

/** A wallpaper over the style's ground, filling its box. */
export function WallpaperView({ pattern, width, height, ground, accent, dark }: Props) {
  const ink = withAlpha(accent, pattern === 'grid' ? (dark ? 0.14 : 0.12) : pattern === 'stripes' ? (dark ? 0.07 : 0.06) : dark ? 0.32 : 0.28);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: ground, overflow: 'hidden' }]}>
      {pattern === 'dots' ? <Dots width={width} height={height} ink={ink} /> : null}
      {pattern === 'grid' ? <Grid width={width} height={height} ink={ink} /> : null}
      {pattern === 'stripes' ? <Stripes width={width} height={height} ink={ink} /> : null}
      {pattern === 'stars' ? <Stars width={width} height={height} accent={accent} dark={dark} /> : null}
      {pattern === 'bokeh' ? <Bokeh width={width} height={height} accent={accent} dark={dark} /> : null}
      {pattern === 'gradient' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            gradientStyle(`linear-gradient(160deg, ${withAlpha(accent, dark ? 0.34 : 0.26)} 0%, ${withAlpha(accent, 0.06)} 55%, ${withAlpha(accent, dark ? 0.2 : 0.16)} 100%)`),
          ]}
        />
      ) : null}
    </View>
  );
}
