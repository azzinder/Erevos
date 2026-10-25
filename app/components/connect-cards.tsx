import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Reach } from '../lib/connect-reach';
import { t } from '../lib/i18n';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

import { ChevronIcon } from './icons';
import { Tile, type TileTint } from './shortcut-tile';
import { Text } from './ui';

// The parts of New chat (app/chat.tsx, with no chat open) that say how this phone connects: a card
// with how its contacts reach it now, in plain words, and the ways in for a phone with no relay yet,
// each a card with a coloured tile that opens what it needs under it.

/** How this phone connects now: `title`, then `line` in plain words, `detail` (the relay's address) small under it. */
export function ConnectStatus({ reach, title, line, detail, children }: {
  reach: Reach;
  title: string;
  line: string;
  detail?: string;
  children?: ReactNode;
}) {
  const colors = useColors();
  const tint = reach === 'ready' ? colors.success : reach === 'part' ? colors.warning : colors.textFaint;
  return (
    <View style={[styles.status, { borderRadius: radius.lg, backgroundColor: withAlpha(tint, 0.1), borderColor: withAlpha(tint, 0.4) }]}>
      <Text variant="caption" tone="muted">
        {t('How you connect now')}
      </Text>
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: tint }]} />
        <Text variant="heading" style={styles.grow}>
          {title}
        </Text>
      </View>
      <Text tone="muted">{line}</Text>
      {detail ? (
        <Text variant="caption" tone="muted" numberOfLines={1} style={styles.mono}>
          {detail}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** A way in: its tile and sign, what it is and one line of what it does; tapped, it opens `children` under it. */
export function WayCard({ tint, sign, title, line, open, onPress, children }: {
  tint: TileTint;
  sign: ReactNode;
  title: string;
  line: string;
  open: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.way, { borderRadius: radius.lg, backgroundColor: colors.surface, borderColor: open ? withAlpha(colors.primary, 0.6) : withAlpha(colors.border, 0.6) }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.wayHead, pressed && styles.pressed]}
      >
        <Tile tint={tint} size={44}>
          {sign}
        </Tile>
        <View style={styles.grow}>
          <Text variant="label">{title}</Text>
          <Text variant="caption" tone="muted">
            {line}
          </Text>
        </View>
        <ChevronIcon color={colors.textFaint} down={open} />
      </Pressable>
      {open && children ? <View style={styles.wayBody}>{children}</View> : null}
    </View>
  );
}

const WHITE = '#ffffff';

/** A QR code, white: its three corner squares and a few dots, for the tile of an invite. */
export function QrSign({ size = 20 }: { size?: number }) {
  const k = size / 20;
  const corner = (x: number, y: number) => (
    <View
      key={`${x}-${y}`}
      style={{ position: 'absolute', left: x * k, top: y * k, width: 8 * k, height: 8 * k, borderWidth: 2 * k, borderColor: WHITE, borderRadius: 2 * k, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: 2 * k, height: 2 * k, backgroundColor: WHITE }} />
    </View>
  );
  const dot = (x: number, y: number) => <View key={`${x}:${y}`} style={{ position: 'absolute', left: x * k, top: y * k, width: 3 * k, height: 3 * k, backgroundColor: WHITE }} />;
  return (
    <View style={{ width: size, height: size }}>
      {[corner(0, 0), corner(12, 0), corner(0, 12)]}
      {[dot(12, 12), dot(17, 12), dot(14.5, 14.5), dot(12, 17), dot(17, 17)]}
    </View>
  );
}

// The corners are the look's, so they are given where they are drawn (theme/colors.ts radius).
const styles = StyleSheet.create({
  status: {
    gap: 6,
    padding: space.md,
    borderWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  grow: {
    flex: 1,
  },
  mono: {
    fontFamily: 'monospace',
  },
  way: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  wayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    minHeight: 64,
  },
  wayBody: {
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
