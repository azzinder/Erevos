import { View } from 'react-native';

// Small line icons drawn with views, in one colour, so they follow every look without an icon font.

type Props = { color: string; size?: number };

export function PlusIcon({ color, size = 22 }: Props) {
  const bar = Math.max(2, Math.round(size / 10));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size * 0.8, height: bar, borderRadius: bar, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: bar, height: size * 0.8, borderRadius: bar, backgroundColor: color }} />
    </View>
  );
}

export function SearchIcon({ color, size = 18 }: Props) {
  const line = Math.max(1.5, size / 10);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size * 0.7, height: size * 0.7, borderRadius: size, borderWidth: line, borderColor: color }} />
      <View
        style={{
          position: 'absolute',
          width: size * 0.38,
          height: line,
          borderRadius: line,
          backgroundColor: color,
          right: -size * 0.02,
          bottom: size * 0.12,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

export function LockIcon({ color, size = 20 }: Props) {
  const line = Math.max(1.5, size / 10);
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          borderWidth: line,
          borderBottomWidth: 0,
          borderColor: color,
          marginTop: size * 0.04,
        }}
      />
      <View style={{ width: size * 0.78, height: size * 0.5, borderRadius: size * 0.12, backgroundColor: color, marginTop: -1 }} />
    </View>
  );
}

export function MoreIcon({ color, size = 20 }: Props) {
  const dot = Math.max(3, size / 5);
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: dot, height: dot, borderRadius: dot, backgroundColor: color }} />
      ))}
    </View>
  );
}

/** A clock face: for chats whose messages disappear. */
export function TimerIcon({ color, size = 14 }: Props) {
  const line = Math.max(1.2, size / 10);
  return (
    <View style={{ width: size, height: size, borderRadius: size, borderWidth: line, borderColor: color, alignItems: 'center' }}>
      <View style={{ position: 'absolute', width: line, height: size * 0.32, top: size * 0.14, backgroundColor: color }} />
      <View
        style={{
          position: 'absolute',
          width: size * 0.26,
          height: line,
          top: size * 0.44,
          left: size * 0.44,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** A shield: for end-to-end encryption. */
export function ShieldIcon({ color, size = 14 }: Props) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: size * 0.8, height: size * 0.5, backgroundColor: color, borderTopLeftRadius: size * 0.1, borderTopRightRadius: size * 0.1 }} />
      <View
        style={{
          width: size * 0.57,
          height: size * 0.57,
          backgroundColor: color,
          marginTop: -size * 0.3,
          transform: [{ rotate: '45deg' }],
          borderBottomRightRadius: size * 0.12,
        }}
      />
    </View>
  );
}

/** A pushpin, leaning: for a conversation pinned at the top of the list. */
export function PinIcon({ color, size = 14 }: Props) {
  const line = Math.max(1.5, size / 9);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', transform: [{ rotate: '35deg' }] }}>
      <View style={{ width: size * 0.56, height: size * 0.18, borderRadius: line, backgroundColor: color }} />
      <View style={{ width: size * 0.34, height: size * 0.3, backgroundColor: color }} />
      <View style={{ width: size * 0.7, height: size * 0.16, borderRadius: line, backgroundColor: color }} />
      <View style={{ width: line, height: size * 0.36, backgroundColor: color }} />
    </View>
  );
}
