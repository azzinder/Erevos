import { Pressable, View } from 'react-native';

import { rowTime } from '../lib/inbox';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

import { Text } from './ui';

/**
 * A message found again, starred (app/starred.tsx) or by the home screen's search: whose chat, its
 * line, and when. A tap opens the chat at it.
 */
export function FoundRow({ name, line, at, now, starred = false, onPress }: { name: string; line: string; at: number; now: number; starred?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        gap: 2,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
      })}
    >
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
          {name}
        </Text>
        <Text variant="caption" tone="muted">
          {rowTime(at, now)}
        </Text>
      </View>
      <Text numberOfLines={3}>{starred ? `★ ${line}` : line}</Text>
    </Pressable>
  );
}
