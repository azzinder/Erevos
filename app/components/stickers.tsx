import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { t } from '../lib/i18n';
import { STICKERS, stickerOf } from '../lib/stickers';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

import { Text } from './ui';

// The built-in stickers (lib/stickers.ts), drawn here out of plain views on a grid of 100 by 100,
// scaled to the size asked: a moon with its faces, a heart, a sun, a coffee and a tick. They are
// their own colours, the same in every look, as a picture is. One this Erevos does not have shows
// the emoji that came with it.

const MOON = '#F4CF57';
const MOON_EDGE = '#D9A441';
const CRATER = '#E8BC45';
const INK = '#3B2A1A';
const CHEEK = '#F29A8B';
const TEAR = '#6FB1E8';
const RED = '#E5484D';
const WHITE = '#FFFFFF';
const BROWN = '#6B4A33';
const STEAM = '#B9AFA3';
const GREEN = '#2F9E6E';
const SUN = '#F7B733';

type Draw = (k: number) => ReactNode;

/** A disc centred at x, y, `d` across. */
const dot = (k: number, x: number, y: number, d: number, color: string, key: string | number) => (
  <View
    key={key}
    style={{ position: 'absolute', left: (x - d / 2) * k, top: (y - d / 2) * k, width: d * k, height: d * k, borderRadius: (d * k) / 2, backgroundColor: color }}
  />
);

/** A stroke from x1, y1 to x2, y2, `w` thick, with round ends. */
function bar(k: number, x1: number, y1: number, x2: number, y2: number, w: number, color: string, key: string | number) {
  const length = Math.hypot(x2 - x1, y2 - y1) + w;
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <View
      key={key}
      style={{
        position: 'absolute',
        left: ((x1 + x2) / 2 - length / 2) * k,
        top: ((y1 + y2) / 2 - w / 2) * k,
        width: length * k,
        height: w * k,
        borderRadius: (w * k) / 2,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

/** One side of a ring centred at x, y, `d` across: its bottom is a smile, its top a frown or a closed eye. */
const arc = (k: number, x: number, y: number, d: number, w: number, side: 'top' | 'bottom', key: string | number) => (
  <View
    key={key}
    style={{
      position: 'absolute',
      left: (x - d / 2) * k,
      top: (y - d / 2) * k,
      width: d * k,
      height: d * k,
      borderRadius: (d * k) / 2,
      borderWidth: w * k,
      borderColor: 'transparent',
      ...(side === 'top' ? { borderTopColor: INK } : { borderBottomColor: INK }),
    }}
  />
);

/** A heart centred at x, y, about `s` across: a square turned on its corner, with two discs. */
function heart(k: number, x: number, y: number, s: number, color: string, key: string | number) {
  const a = s / 1.5;
  return (
    <View
      key={key}
      style={{ position: 'absolute', left: (x - 0.75 * a) * k, top: (y - 0.65 * a) * k, width: 1.5 * a * k, height: 1.5 * a * k, transform: [{ rotate: '45deg' }] }}
    >
      <View style={{ position: 'absolute', left: 0.5 * a * k, top: 0.5 * a * k, width: a * k, height: a * k, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, top: 0.5 * a * k, width: a * k, height: a * k, borderRadius: (a * k) / 2, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0.5 * a * k, top: 0, width: a * k, height: a * k, borderRadius: (a * k) / 2, backgroundColor: color }} />
    </View>
  );
}

// The moon's face: its disc, its edge and craters, under what makes the face.
const moon = (k: number, face: ReactNode[], color = MOON) => [
  <View
    key="disc"
    style={{ position: 'absolute', left: 6 * k, top: 6 * k, width: 88 * k, height: 88 * k, borderRadius: 44 * k, backgroundColor: color, borderWidth: 3 * k, borderColor: MOON_EDGE }}
  />,
  dot(k, 18, 50, 8, CRATER, 'c1'),
  dot(k, 76, 26, 7, CRATER, 'c2'),
  dot(k, 74, 78, 9, CRATER, 'c3'),
  ...face,
];

const eyes = (k: number, d = 9) => [dot(k, 36, 40, d, INK, 'e1'), dot(k, 64, 40, d, INK, 'e2')];
const cheeks = (k: number) => [dot(k, 26, 58, 10, CHEEK, 'k1'), dot(k, 74, 58, 10, CHEEK, 'k2')];
const smile = (k: number) => arc(k, 50, 50, 36, 5, 'bottom', 'm');

const DRAWN: Record<string, Draw> = {
  'moon-smile': (k) => moon(k, [...eyes(k), ...cheeks(k), smile(k)]),
  'moon-laugh': (k) =>
    moon(k, [
      arc(k, 36, 44, 16, 4, 'top', 'e1'),
      arc(k, 64, 44, 16, 4, 'top', 'e2'),
      ...cheeks(k),
      <View
        key="m"
        style={{ position: 'absolute', left: 32 * k, top: 56 * k, width: 36 * k, height: 20 * k, borderBottomLeftRadius: 18 * k, borderBottomRightRadius: 18 * k, backgroundColor: INK, overflow: 'hidden' }}
      >
        <View style={{ position: 'absolute', left: 10 * k, top: 11 * k, width: 16 * k, height: 12 * k, borderRadius: 6 * k, backgroundColor: RED }} />
      </View>,
    ]),
  'moon-love': (k) => moon(k, [heart(k, 35, 40, 18, RED, 'e1'), heart(k, 65, 40, 18, RED, 'e2'), smile(k)]),
  'moon-wink': (k) => moon(k, [dot(k, 36, 40, 9, INK, 'e1'), bar(k, 58, 41, 70, 41, 4, INK, 'e2'), ...cheeks(k), smile(k)]),
  'moon-wow': (k) =>
    moon(k, [
      dot(k, 36, 40, 13, INK, 'e1'),
      dot(k, 64, 40, 13, INK, 'e2'),
      dot(k, 38, 38, 4, WHITE, 'g1'),
      dot(k, 66, 38, 4, WHITE, 'g2'),
      <View key="m" style={{ position: 'absolute', left: 41 * k, top: 58 * k, width: 18 * k, height: 20 * k, borderRadius: 10 * k, borderWidth: 5 * k, borderColor: INK }} />,
    ]),
  'moon-sad': (k) =>
    moon(k, [
      ...eyes(k),
      arc(k, 50, 80, 34, 5, 'top', 'm'),
      <View
        key="t"
        style={{ position: 'absolute', left: 61 * k, top: 48 * k, width: 9 * k, height: 9 * k, borderRadius: 4.5 * k, borderTopLeftRadius: 0, backgroundColor: TEAR, transform: [{ rotate: '45deg' }] }}
      />,
    ]),
  'moon-angry': (k) =>
    moon(
      k,
      [...eyes(k), bar(k, 26, 28, 42, 34, 5, INK, 'b1'), bar(k, 74, 28, 58, 34, 5, INK, 'b2'), arc(k, 50, 78, 30, 5, 'top', 'm')],
      '#F5B556',
    ),
  'moon-sleep': (k) => [
    ...moon(k, [bar(k, 30, 42, 42, 42, 4, INK, 'e1'), bar(k, 58, 42, 70, 42, 4, INK, 'e2'), ...cheeks(k), dot(k, 50, 64, 8, INK, 'm')]),
    bar(k, 74, 6, 84, 6, 3, INK, 'z1'),
    bar(k, 84, 6, 74, 16, 3, INK, 'z2'),
    bar(k, 74, 16, 84, 16, 3, INK, 'z3'),
    bar(k, 88, 20, 95, 20, 2.5, INK, 'z4'),
    bar(k, 95, 20, 88, 27, 2.5, INK, 'z5'),
    bar(k, 88, 27, 95, 27, 2.5, INK, 'z6'),
  ],
  heart: (k) => [heart(k, 50, 46, 60, RED, 'h'), dot(k, 34, 36, 9, '#F27D80', 'g')],
  sun: (k) => [
    ...[0, 45, 90, 135, 180, 225, 270, 315].map((turn) => (
      <View key={`r${turn}`} style={{ position: 'absolute', left: 0, top: 0, width: 100 * k, height: 100 * k, transform: [{ rotate: `${turn}deg` }] }}>
        {bar(k, 50, 4, 50, 16, 8, SUN, 'r')}
      </View>
    )),
    dot(k, 50, 50, 56, SUN, 'disc'),
    dot(k, 42, 46, 6, INK, 'e1'),
    dot(k, 58, 46, 6, INK, 'e2'),
    arc(k, 50, 52, 22, 3.5, 'bottom', 'm'),
  ],
  coffee: (k) => [
    bar(k, 34, 14, 36, 28, 4, STEAM, 's1'),
    bar(k, 48, 8, 50, 26, 4, STEAM, 's2'),
    bar(k, 62, 14, 64, 28, 4, STEAM, 's3'),
    <View key="handle" style={{ position: 'absolute', left: 62 * k, top: 46 * k, width: 24 * k, height: 24 * k, borderRadius: 12 * k, borderWidth: 6 * k, borderColor: BROWN }} />,
    <View
      key="cup"
      style={{ position: 'absolute', left: 18 * k, top: 36 * k, width: 56 * k, height: 46 * k, borderBottomLeftRadius: 22 * k, borderBottomRightRadius: 22 * k, borderTopLeftRadius: 4 * k, borderTopRightRadius: 4 * k, backgroundColor: WHITE, borderWidth: 4 * k, borderColor: BROWN }}
    />,
    <View key="top" style={{ position: 'absolute', left: 24 * k, top: 41 * k, width: 44 * k, height: 7 * k, borderRadius: 3.5 * k, backgroundColor: BROWN }} />,
    heart(k, 46, 62, 14, RED, 'h'),
    <View key="saucer" style={{ position: 'absolute', left: 8 * k, top: 84 * k, width: 76 * k, height: 8 * k, borderRadius: 4 * k, backgroundColor: BROWN }} />,
  ],
  check: (k) => [dot(k, 50, 50, 86, GREEN, 'disc'), bar(k, 30, 52, 44, 66, 9, WHITE, 'a'), bar(k, 44, 66, 72, 36, 9, WHITE, 'b')],
};

/** A sticker by its name, `size` across; one this Erevos does not have shows `fallback`, the emoji that came with it. */
export function StickerView({ name, size = 128, fallback = '' }: { name: string; size?: number; fallback?: string }) {
  const colors = useColors();
  const sticker = stickerOf(name);
  const draw = DRAWN[name];
  if (!sticker || !draw) {
    return (
      <View
        accessibilityLabel={t('Sticker')}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: size / 6, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
      >
        <Text style={{ fontSize: size / 2.6, lineHeight: size / 2 }}>{fallback || '?'}</Text>
      </View>
    );
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={t(sticker.label)} style={{ width: size, height: size }}>
      {draw(size / 100)}
    </View>
  );
}

/** Every sticker, to pick one: tapped, it is `onPick`ed. */
export function StickerPicker({ onPick }: { onPick: (name: string) => void }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
      {STICKERS.map((sticker) => (
        <Pressable
          key={sticker.name}
          onPress={() => onPick(sticker.name)}
          accessibilityRole="button"
          accessibilityLabel={t(sticker.label)}
          style={({ pressed }) => ({ padding: 6, borderRadius: 16, backgroundColor: pressed ? colors.surfacePressed : 'transparent' })}
        >
          <StickerView name={sticker.name} size={72} />
        </Pressable>
      ))}
    </View>
  );
}
