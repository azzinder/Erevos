import { View } from 'react-native';

import { shape } from '../theme/colors';
import { useTheme } from '../theme/context';

import { Text } from './ui';

// A contact's picture, drawn from their identity key: two colours and a moon of the second over the
// first, placed by the key's bytes, with the first letter of their name. The same key always gives
// the same picture, on every phone and in every look, so a contact is known at a glance without a
// photo leaving anyone's phone. It is not a check of the key: the safety number is. Under Matrix
// the colours are greens, told apart by their depth instead of their hue.

/** The numbers a picture is drawn from: the key's first bytes, from its hex. */
export function faceOf(identity: string): { hue: number; turn: number; x: number; y: number; size: number } {
  const byte = (i: number) => parseInt(identity.slice(i * 2, i * 2 + 2), 16) || 0;
  return {
    hue: Math.round(((byte(0) << 8) | byte(1)) / 65535 * 360),
    // The second colour is turned at least a little round the wheel, so the two always differ.
    turn: 40 + Math.round(byte(2) / 255 * 140),
    x: byte(3) / 255,
    y: byte(4) / 255,
    size: 0.55 + byte(5) / 255 * 0.35,
  };
}

const hsl = (hue: number, s: number, l: number) => `hsl(${Math.round(hue % 360)}, ${s}%, ${l}%)`;

export function KeyFace({ identity, name, size = 48 }: { identity: string; name?: string; size?: number }) {
  useTheme(); // drawn again when the look changes
  const face = faceOf(identity);
  const moon = size * face.size;
  const green = shape.family === 'mono';
  const ground = green ? hsl(135, 80, 12 + (face.hue / 360) * 18) : hsl(face.hue, 62, 46);
  const disc = green ? hsl(135, 100, 32 + (face.turn / 180) * 22) : hsl(face.hue + face.turn, 70, 62);
  const letter = [...(name ?? '').trim()][0]?.toUpperCase() ?? '';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: ground,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: moon,
          height: moon,
          borderRadius: moon / 2,
          left: (face.x - 0.1) * size,
          top: (face.y - 0.25) * size,
          backgroundColor: disc,
          opacity: 0.9,
        }}
      />
      {letter ? (
        <Text
          color="#FFFFFF"
          style={{
            fontSize: size * 0.42,
            fontWeight: '700',
            textShadowColor: 'rgba(0, 0, 0, 0.35)',
            textShadowRadius: 4,
            textShadowOffset: { width: 0, height: 1 },
          }}
        >
          {letter}
        </Text>
      ) : null}
    </View>
  );
}
