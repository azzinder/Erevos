import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { MORE_REACTIONS, REACTIONS } from '../lib/chat-parts';
import { t } from '../lib/i18n';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

import { Sheet, Text } from './ui';

// A message's menu, opened by pressing and holding it, in a contact's chat (app/chat.tsx) and in a
// group (components/group-chat.tsx): the message in a line, the reactions at a tap with more behind the last,
// then what can be done with it. The menu closes before what was picked runs, so a question it asks
// shows (on the web, over the sheet, it would not).

export type MenuAction = { title: string; onPress: () => void; danger?: boolean };

export function MessageMenu({ visible, onClose, line, way, reaction, onReact, actions }: {
  visible: boolean;
  onClose: () => void;
  /** The message in one line (lib/message-line.ts). */
  line: string;
  /** How it came or went, when that is worth saying: through Nostr. */
  way?: string;
  /** Our reaction to it now, if any. */
  reaction?: string;
  /** Reacting is offered only when given: a message their phone has. */
  onReact?: (emoji: string) => void;
  actions: MenuAction[];
}) {
  const colors = useColors();
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (visible) setMore(false);
  }, [visible]);
  const after = (run: () => void) => {
    onClose();
    setTimeout(run, Platform.OS === 'web' ? 0 : 300);
  };
  const emoji = (sign: string) => (
    <Pressable
      key={sign}
      onPress={() => after(() => onReact?.(sign))}
      accessibilityRole="button"
      accessibilityState={{ selected: reaction === sign }}
      accessibilityLabel={reaction === sign ? t('Take back {emoji}', { emoji: sign }) : t('React with {emoji}', { emoji: sign })}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: reaction === sign ? withAlpha(colors.primary, 0.25) : pressed ? colors.surfacePressed : colors.surfaceAlt,
        borderWidth: reaction === sign ? 2 : 0,
        borderColor: colors.primary,
      })}
    >
      <Text style={{ fontSize: 22, lineHeight: 28 }}>{sign}</Text>
    </Pressable>
  );
  return (
    <Sheet visible={visible} onClose={onClose}>
      {line ? (
        <Text tone="muted" numberOfLines={2}>
          {line}
        </Text>
      ) : null}
      {way ? (
        <Text variant="caption" tone="muted">
          {way}
        </Text>
      ) : null}
      {onReact ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 2 }}>
          {REACTIONS.map(emoji)}
          {more ? MORE_REACTIONS.map(emoji) : null}
          {more ? null : (
            <Pressable
              onPress={() => setMore(true)}
              accessibilityRole="button"
              accessibilityLabel={t('More reactions')}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.surfacePressed : colors.surfaceAlt,
              })}
            >
              <Text style={{ fontSize: 22, lineHeight: 26, color: colors.textMuted }}>+</Text>
            </Pressable>
          )}
        </View>
      ) : null}
      <View>
        {actions.map((action) => (
          <Pressable
            key={action.title}
            onPress={() => after(action.onPress)}
            accessibilityRole="button"
            style={({ pressed }) => ({ paddingVertical: space.sm + 4, paddingHorizontal: space.sm, borderRadius: radius.md, backgroundColor: pressed ? colors.surfacePressed : 'transparent' })}
          >
            <Text variant="bodyStrong" color={action.danger ? colors.danger : colors.text}>
              {action.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
