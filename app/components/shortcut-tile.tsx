import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { withAlpha } from '../theme/colors';
import { gradientStyle } from './glass';

// The home screen's shortcuts (Phone, Contacts, Lock): a coloured tile each, in the colours of the
// launcher icons (Phone green, Contacts violet), with a solid white sign on it.

export type TileTint = 'green' | 'violet' | 'orange';

/** Each tint's top and bottom, as the launcher icons' backgrounds start, and its deep shade. */
const TINTS: Record<TileTint, { top: string; bottom: string; deep: string }> = {
  green: { top: '#5ee08a', bottom: '#19a34f', deep: '#0a6330' },
  violet: { top: '#c99bff', bottom: '#8b3fe6', deep: '#4d1691' },
  orange: { top: '#ffc061', bottom: '#f28a12', deep: '#a85200' },
};

const TILE = 36;
const SIGN = 20;
const WHITE = '#ffffff';

export function ShortcutTile({ label, tint, onPress, children }: { label: string; tint: TileTint; onPress: () => void; children: ReactNode }) {
  const { top, bottom, deep } = TINTS[tint];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <View
        style={[
          styles.tile,
          { backgroundColor: bottom, boxShadow: `0px 3px 8px ${withAlpha(deep, 0.45)}, inset 0px 1px 0px ${withAlpha(WHITE, 0.35)}` },
          gradientStyle(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`),
        ]}
      >
        {children}
      </View>
    </Pressable>
  );
}

/** A handset: half a thick ring from its top left to its bottom right, a cup at each end. */
export function PhoneSign() {
  const size = SIGN;
  const line = size * 0.22;
  const ring = size * 0.86;
  const at = (size - ring) / 2;
  // The ends of the ring's middle line, up left and down right of its centre.
  const reach = ((ring - line) / 2) * Math.SQRT1_2;
  const cup = { length: size * 0.44, width: line * 1.45 };
  const inward = ((cup.length - cup.width) / 2) * Math.SQRT1_2;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: at,
          top: at,
          width: ring,
          height: ring,
          borderRadius: ring,
          borderWidth: line,
          borderColor: 'transparent',
          borderLeftColor: WHITE,
          borderBottomColor: WHITE,
        }}
      />
      {([-1, 1] as const).map((sign) => {
        const middle = size / 2 + sign * (reach - inward);
        return (
          <View
            key={sign}
            style={{
              position: 'absolute',
              left: middle - cup.length / 2,
              top: middle - cup.width / 2,
              width: cup.length,
              height: cup.width,
              borderRadius: cup.width / 2,
              backgroundColor: WHITE,
              transform: [{ rotate: '45deg' }],
            }}
          />
        );
      })}
    </View>
  );
}

/** A head and shoulders, filled. */
export function PersonSign() {
  const size = SIGN;
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
});
