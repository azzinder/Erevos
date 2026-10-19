import { Pressable, View, type StyleProp, type TextStyle } from 'react-native';

import { t } from '../lib/i18n';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

import { Text } from './ui';

// What a message shows besides its words, in a contact's chat (app/chat.tsx) and in a group
// (app/group.tsx), drawn the same in both: the message it answers, and the reactions to it.

/**
 * The message an answer is to, inside its bubble or over the message field: who wrote it and its
 * first line. Tapped, the chat goes to it; with `onClose`, it has a ✕ that drops it.
 */
export function Quote({ name, line, ink, onPress, onClose }: {
  name: string;
  /** Its line (lib/message-line.ts), or empty when it is not on this phone. */
  line: string;
  ink?: StyleProp<TextStyle>;
  onPress?: () => void;
  onClose?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? t('Goes to the message it answers') : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        borderRadius: radius.sm,
        paddingVertical: 4,
        paddingHorizontal: space.sm,
        backgroundColor: withAlpha(colors.text, pressed ? 0.14 : 0.07),
      })}
    >
      <View style={{ flex: 1, flexShrink: 1 }}>
        <Text style={[ink, { fontSize: 13, fontWeight: '700' }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[ink, { fontSize: 13, opacity: 0.8 }]} numberOfLines={1}>
          {line || t('The message is not on this phone.')}
        </Text>
      </View>
      {onClose ? (
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Cancel')} hitSlop={10}>
          <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/** The reactions to a message, under its bubble: each emoji once, with how many chose it. Ours stands out. */
export function Reactions({ signs, mine, mineSide, onPress }: { signs: string[]; mine?: string; mineSide: boolean; onPress?: () => void }) {
  const colors = useColors();
  const counted = new Map<string, number>();
  for (const sign of signs) counted.set(sign, (counted.get(sign) ?? 0) + 1);
  if (counted.size === 0) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('Reactions: {list}', { list: [...counted.keys()].join(' ') })}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignSelf: mineSide ? 'flex-end' : 'flex-start', marginTop: -2, marginBottom: 4 }}
    >
      {[...counted].map(([sign, count]) => (
        <View
          key={sign}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 7,
            paddingVertical: 1,
            borderRadius: radius.pill,
            backgroundColor: sign === mine ? withAlpha(colors.primary, 0.22) : colors.surface,
            borderWidth: 1,
            borderColor: sign === mine ? colors.primary : withAlpha(colors.border, 0.8),
          }}
        >
          <Text style={{ fontSize: 15, lineHeight: 20 }}>{sign}</Text>
          {count > 1 ? (
            <Text variant="caption" tone="muted">
              {count}
            </Text>
          ) : null}
        </View>
      ))}
    </Pressable>
  );
}
