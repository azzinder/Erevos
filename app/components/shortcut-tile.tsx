// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { withAlpha } from '../theme/colors';
import { gradientStyle } from './glass';

// The home screen's shortcuts (Phone, Contacts, Lock), and the calls at the top of a chat and a
// group: a coloured tile each, in the colours of the launcher icons (Phone green, Contacts violet,
// SMS blue for a video call; a plain call on the mobile network orange, components/dial-tile.tsx),
// with a solid white sign on it.

export type TileTint = 'green' | 'violet' | 'orange' | 'blue';

/** Each tint's top and bottom, as the launcher icons' backgrounds start, and its deep shade. */
const TINTS: Record<TileTint, { top: string; bottom: string; deep: string }> = {
  green: { top: '#5ee08a', bottom: '#19a34f', deep: '#0a6330' },
  violet: { top: '#c99bff', bottom: '#8b3fe6', deep: '#4d1691' },
  orange: { top: '#ffc061', bottom: '#f28a12', deep: '#a85200' },
  blue: { top: '#6aa8ff', bottom: '#2463eb', deep: '#16348f' },
};

const TILE = 36;
const SIGN = 20;
const WHITE = '#ffffff';

/** A small dot on a tile's corner, in `color` with a `ring` of what is behind it, said as `label`. */
export type TileDot = { color: string; ring: string; label: string };

export function ShortcutTile({ label, tint, onPress, dot, children }: { label: string; tint: TileTint; onPress: () => void; dot?: TileDot | null; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={dot ? `${label}. ${dot.label}` : label}
      hitSlop={6}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <Tile tint={tint}>{children}</Tile>
      {dot ? <View style={[styles.dot, { backgroundColor: dot.color, borderColor: dot.ring }]} /> : null}
    </Pressable>
  );
}

/** The coloured tile alone, `size` wide, with its sign: also the ways in on New chat (components/connect-cards.tsx). */
export function Tile({ tint, size = TILE, children }: { tint: TileTint; size?: number; children: ReactNode }) {
  const { top, bottom, deep } = TINTS[tint];
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.32 },
        { backgroundColor: bottom, boxShadow: `0px 3px 8px ${withAlpha(deep, 0.45)}, inset 0px 1px 0px ${withAlpha(WHITE, 0.35)}` },
        gradientStyle(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`),
      ]}
    >
      {children}
    </View>
  );
}

// The handset drawn as the widget's and the phone's notices draw it (the Glyph.kt CALL path), white,
// in the three sizes Android and the web pick from.
const HANDSET = require('../assets/icon/handset.png');

/** A handset, filled. */
export function PhoneSign() {
  return <Image source={HANDSET} style={{ width: SIGN, height: SIGN }} accessibilityIgnoresInvertColors />;
}

/** A camera: a rounded body, and its lens a wedge widening to the right. */
export function VideoSign() {
  const size = SIGN;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.52, borderRadius: size * 0.12, backgroundColor: WHITE }} />
      <View
        style={{
          width: 0,
          height: 0,
          marginLeft: size * 0.04,
          borderTopWidth: size * 0.2,
          borderBottomWidth: size * 0.2,
          borderRightWidth: size * 0.28,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: WHITE,
        }}
      />
    </View>
  );
}

/** A keypad: three rows of three keys and the 0 under them, for a call on the phone's own network. */
export function DialerSign() {
  const key = SIGN * 0.18;
  const gap = SIGN * 0.1;
  const dot = (row: number, column: number) => (
    <View key={`${row}${column}`} style={{ position: 'absolute', left: column * (key + gap), top: row * (key + gap), width: key, height: key, borderRadius: key, backgroundColor: WHITE }} />
  );
  return (
    <View style={{ width: 3 * key + 2 * gap, height: 4 * key + 3 * gap }}>
      {[0, 1, 2].flatMap((row) => [0, 1, 2].map((column) => dot(row, column)))}
      {dot(3, 1)}
    </View>
  );
}

/** A head and shoulders, filled: also Chat with myself's picture (components/myself-face.tsx). */
export function PersonSign({ size = SIGN }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: size * 0.44, height: size * 0.44, borderRadius: size, backgroundColor: WHITE }} />
      <View
        style={{
          width: size * 0.86,
          height: size * 0.42,
          marginTop: size * 0.08,
          borderTopLeftRadius: size * 0.43,
          borderTopRightRadius: size * 0.43,
          borderBottomLeftRadius: size * 0.1,
          borderBottomRightRadius: size * 0.1,
          backgroundColor: WHITE,
        }}
      />
    </View>
  );
}

/** A padlock, filled, with its keyhole in the tile's deep shade. */
export function LockSign({ tint }: { tint: TileTint }) {
  const size = SIGN;
  const line = size * 0.14;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.54,
          height: size * 0.5,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          borderWidth: line,
          borderBottomWidth: 0,
          borderColor: WHITE,
        }}
      />
      <View style={{ width: size * 0.84, height: size * 0.52, marginTop: -1, borderRadius: size * 0.14, backgroundColor: WHITE, alignItems: 'center', paddingTop: size * 0.12 }}>
        <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: size, backgroundColor: TINTS[tint].deep }} />
        <View style={{ width: size * 0.07, height: size * 0.12, marginTop: -1, borderRadius: size * 0.04, backgroundColor: TINTS[tint].deep }} />
      </View>
    </View>
  );
}

/** Two pictures one over the other, with a tiny padlock on the front one: the Collection. */
export function CollectionSign({ tint }: { tint: TileTint }) {
  const size = SIGN;
  const line = Math.max(1.5, size * 0.09);
  const { deep } = TINTS[tint];
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: size * 0.66, height: size * 0.56, borderRadius: size * 0.12, borderWidth: line, borderColor: WHITE }} />
      <View
        style={{
          position: 'absolute',
          left: size * 0.26,
          top: size * 0.3,
          width: size * 0.74,
          height: size * 0.64,
          borderRadius: size * 0.14,
          backgroundColor: WHITE,
          borderWidth: line,
          borderColor: TINTS[tint].bottom,
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', left: size * 0.1, top: size * 0.1, width: size * 0.14, height: size * 0.14, borderRadius: size, backgroundColor: deep, opacity: 0.55 }} />
        <View style={{ position: 'absolute', left: -size * 0.04, bottom: -size * 0.12, width: size * 0.5, height: size * 0.34, borderRadius: size, backgroundColor: deep, opacity: 0.55 }} />
      </View>
      <View style={{ position: 'absolute', right: -size * 0.02, bottom: -size * 0.04, width: size * 0.34, height: size * 0.3, borderRadius: size * 0.08, backgroundColor: deep, borderWidth: 1, borderColor: WHITE }}>
        <View style={{ position: 'absolute', left: size * 0.07, top: -size * 0.16, width: size * 0.14, height: size * 0.16, borderTopLeftRadius: size, borderTopRightRadius: size, borderWidth: line * 0.7, borderBottomWidth: 0, borderColor: WHITE }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.92 }],
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: TILE * 0.32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
