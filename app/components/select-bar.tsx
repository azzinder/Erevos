// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useCallback, useMemo, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { tap } from '../lib/haptics';
import { t } from '../lib/i18n';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors } from '../theme/context';

import { CloseIcon } from './icons';
import type { MenuAction } from './message-menu';
import { Text } from './ui';

// Choosing several messages of a chat at once, the same in every chat (Erevos's own, a group, SMS,
// Matrix, XMPP, Nostr): "Select" in a message's menu starts it with that message; each tap then
// adds or takes one out, and the bar over the thread copies, forwards or deletes them together.
// Back, ✕ or the last one taken out ends it. Each chat says which of the three it can do.

/** The messages chosen in a chat, by their keys, and whether choosing is on. */
export type Selection<K> = {
  chosen: ReadonlySet<K>;
  /** Choosing is on: a tap on a message adds it or takes it out, instead of what it does. */
  on: boolean;
  /** Starts choosing, with `key` chosen. */
  start: (key: K) => void;
  /** Adds `key`, or takes it out; the last one out ends the choosing. */
  toggle: (key: K) => void;
  /** Ends the choosing, none chosen. */
  clear: () => void;
  /** Chooses these instead (All). */
  set: (keys: Iterable<K>) => void;
};

export function useSelection<K>(): Selection<K> {
  const [chosen, setChosen] = useState<ReadonlySet<K>>(() => new Set());
  const start = useCallback((key: K) => {
    tap();
    setChosen(new Set([key]));
  }, []);
  const toggle = useCallback((key: K) => {
    tap();
    setChosen((was) => {
      const next = new Set(was);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const clear = useCallback(() => setChosen(new Set()), []);
  const set = useCallback((keys: Iterable<K>) => setChosen(new Set(keys)), []);
  return useMemo(() => ({ chosen, on: chosen.size > 0, start, toggle, clear, set }), [chosen, start, toggle, clear, set]);
}

/** "Select", in a message's menu (components/message-menu.tsx): starts choosing with it. */
export function selectAction(onPress: () => void): MenuAction {
  return { title: t('Select'), onPress };
}

/** How a chosen message shows, over its row: a wash of the accent, across the thread. */
export function chosenStyle(colors: Colors): ViewStyle {
  return { backgroundColor: withAlpha(colors.primary, 0.16), borderRadius: radius.md };
}

/**
 * The bar shown while messages are chosen, in place of the chat's header or over its thread: ✕,
 * how many, and what can be done to them all. An action left out is not offered there.
 */
export function SelectBar({ count, onCancel, onAll, onCopy, onForward, onDelete }: {
  count: number;
  onCancel: () => void;
  /** Chooses every message shown. */
  onAll?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        minHeight: 56,
        paddingHorizontal: space.sm,
        backgroundColor: colors.sheet,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('Cancel')} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <CloseIcon color={colors.text} size={22} />
      </Pressable>
      <Text variant="heading" style={{ flex: 1 }} numberOfLines={1} accessibilityLiveRegion="polite">
        {t('{n} selected', { n: count })}
      </Text>
      {onAll ? <BarAction title={t('All')} onPress={onAll} color={colors.text} /> : null}
      {onCopy ? <BarAction title={t('Copy')} onPress={onCopy} color={colors.primary} /> : null}
      {onForward ? <BarAction title={t('Forward')} onPress={onForward} color={colors.primary} /> : null}
      {onDelete ? <BarAction title={t('Delete')} onPress={onDelete} color={colors.danger} /> : null}
    </View>
  );
}

function BarAction({ title, onPress, color }: { title: string; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={6} style={({ pressed }) => ({ paddingHorizontal: space.sm, paddingVertical: space.sm, opacity: pressed ? 0.6 : 1 })}>
      <Text variant="label" color={color}>
        {title}
      </Text>
    </Pressable>
  );
}
