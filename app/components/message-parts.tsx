// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Image, Linking, Platform, Pressable, View, type StyleProp, type TextStyle } from 'react-native';

import { ask } from '../lib/alert';
import { geoLink, placeText, type Place, type Preview } from '../lib/chat-parts';
import { t } from '../lib/i18n';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

import { openLink } from './linked-text';
import { Text } from './ui';

// What a message shows besides its words, in a contact's chat (app/chat.tsx) and in a group
// (components/group-chat.tsx), drawn the same in both: the message it answers, the reactions to it, the
// messages pinned to the top of the chat, a place sent once, and a link's preview.

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

/**
 * The messages pinned to the top of a chat, over its thread: one at a time, the latest first, with
 * its place among them. Tapped, the chat goes to it, and the next one shows.
 */
export function Pinned({ line, index, count, onPress }: { line: string; index: number; count: number; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={t('Goes to the pinned message')}
      style={({ pressed }) => ({
        marginHorizontal: space.lg,
        marginBottom: space.xs,
        paddingVertical: 6,
        paddingHorizontal: space.md,
        borderRadius: radius.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
      })}
    >
      <Text variant="caption" color={colors.accentText}>
        {count > 1 ? t('Pinned, {n} of {count}', { n: index + 1, count }) : t('Pinned')}
      </Text>
      <Text numberOfLines={1}>{line || t('The message is not on this phone.')}</Text>
    </Pressable>
  );
}

/** Asks, then hands the place to the phone's maps app (a geo: link). Erevos itself never draws a map. */
export function openPlace(place: Place): void {
  ask(t('Open in maps?'), t('Your maps app opens at this place. It may load its map from the internet, as it does.'), [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('Open'), onPress: () => void Linking.openURL(geoLink(place)).catch(() => undefined) },
  ]);
}

/** A place sent once, in its bubble: where it is, how near, and Open in maps on a phone. */
export function PlaceCard({ place, ink }: { place: Place; ink?: StyleProp<TextStyle> }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[ink, { fontWeight: '700' }]}>{`📍 ${t('Location')}`}</Text>
      <Text style={[ink, { fontSize: 13 }]} selectable>
        {placeText(place)}
      </Text>
      {place.acc !== undefined ? <Text style={[ink, { fontSize: 12, opacity: 0.8 }]}>{t('Within about {m} m', { m: place.acc })}</Text> : null}
      {Platform.OS === 'android' ? (
        <Pressable onPress={() => openPlace(place)} accessibilityRole="link" hitSlop={6}>
          <Text style={[ink, { textDecorationLine: 'underline' }]}>{t('Open in maps')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * A link's preview under a message's words, as the sender's phone made it (lib/link-preview.ts):
 * its picture, title and line, and the site. Nothing is fetched to show it; tapped, it asks before
 * the link opens, as the link does.
 */
export function PreviewCard({ preview, ink }: { preview: Preview; ink?: StyleProp<TextStyle> }) {
  const colors = useColors();
  const site = /^https?:\/\/([^/?#]+)/i.exec(preview.url)?.[1] ?? '';
  return (
    <Pressable
      onPress={() => openLink(preview.url)}
      accessibilityRole="link"
      accessibilityLabel={preview.title || site}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: space.sm,
        marginTop: space.xs,
        padding: space.sm,
        borderRadius: radius.sm,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        backgroundColor: withAlpha(colors.text, pressed ? 0.14 : 0.07),
      })}
    >
      {preview.image ? <Image source={{ uri: `data:image/jpeg;base64,${preview.image}` }} style={{ width: 56, height: 56, borderRadius: radius.sm }} /> : null}
      <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
        {preview.title ? (
          <Text style={[ink, { fontSize: 14, fontWeight: '700' }]} numberOfLines={2}>
            {preview.title}
          </Text>
        ) : null}
        {preview.text ? (
          <Text style={[ink, { fontSize: 13, opacity: 0.85 }]} numberOfLines={3}>
            {preview.text}
          </Text>
        ) : null}
        <Text style={[ink, { fontSize: 12, opacity: 0.7 }]} numberOfLines={1}>
          {site}
        </Text>
      </View>
    </Pressable>
  );
}
