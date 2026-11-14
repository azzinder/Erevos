// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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

/**
 * The two big ways to meet someone at the top of New chat: take a photo of their QR code, or show
 * yours for them to take. One of the two is enough, so the rest of New chat waits under them.
 * `onShow` is left out when this phone has no contact link to show.
 */
export function MeetWays({ scanTitle, scanLine, onScan, onShow }: {
  scanTitle: string;
  scanLine: string;
  onScan: () => void;
  onShow?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.meet}>
      <View style={styles.meetRow}>
        <Pressable
          onPress={onScan}
          accessibilityRole="button"
          accessibilityLabel={scanTitle}
          style={({ pressed }) => [styles.meetTile, { borderRadius: radius.lg, backgroundColor: colors.primary, borderColor: colors.primary }, pressed && styles.pressed]}
        >
          <ScanSign color={colors.onPrimary} />
          <Text variant="label" style={[styles.center, { color: colors.onPrimary }]}>
            {scanTitle}
          </Text>
          <Text variant="caption" style={[styles.center, { color: colors.onPrimary }]}>
            {scanLine}
          </Text>
        </Pressable>
        {onShow ? (
          <Pressable
            onPress={onShow}
            accessibilityRole="button"
            accessibilityLabel={t('Show your QR code')}
            style={({ pressed }) => [styles.meetTile, { borderRadius: radius.lg, backgroundColor: colors.surface, borderColor: colors.primary }, pressed && styles.pressed]}
          >
            <QrSign size={40} color={colors.primary} />
            <Text variant="label" style={styles.center}>
              {t('Show your QR code')}
            </Text>
            <Text variant="caption" tone="muted" style={styles.center}>
              {t('for them to scan')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {onShow ? (
        <Text variant="caption" tone="muted" style={styles.center}>
          {t('One of you scanning the other is enough.')}
        </Text>
      ) : null}
    </View>
  );
}

/** A camera's frame with a line across it, for scanning a QR code. */
function ScanSign({ color, size = 40 }: { color: string; size?: number }) {
  const w = Math.max(2, Math.round(size / 14));
  const arm = size * 0.3;
  const corner = (top: boolean, left: boolean) => (
    <View
      key={`${top}-${left}`}
      style={{
        position: 'absolute',
        width: arm,
        height: arm,
        [top ? 'top' : 'bottom']: 0,
        [left ? 'left' : 'right']: 0,
        borderColor: color,
        borderTopWidth: top ? w : 0,
        borderBottomWidth: top ? 0 : w,
        borderLeftWidth: left ? w : 0,
        borderRightWidth: left ? 0 : w,
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      {[corner(true, true), corner(true, false), corner(false, true), corner(false, false)]}
      <View style={{ position: 'absolute', left: size * 0.12, right: size * 0.12, top: (size - w) / 2, height: w, backgroundColor: color }} />
    </View>
  );
}

/** A QR code, white unless `color` is given: its three corner squares and a few dots, for the tile of an invite. */
export function QrSign({ size = 20, color = WHITE }: { size?: number; color?: string }) {
  const k = size / 20;
  const corner = (x: number, y: number) => (
    <View
      key={`${x}-${y}`}
      style={{ position: 'absolute', left: x * k, top: y * k, width: 8 * k, height: 8 * k, borderWidth: 2 * k, borderColor: color, borderRadius: 2 * k, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: 2 * k, height: 2 * k, backgroundColor: color }} />
    </View>
  );
  const dot = (x: number, y: number) => <View key={`${x}:${y}`} style={{ position: 'absolute', left: x * k, top: y * k, width: 3 * k, height: 3 * k, backgroundColor: color }} />;
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
  meet: {
    gap: space.sm,
  },
  meetRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  meetTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
    borderWidth: 2,
    minHeight: 150,
  },
  center: {
    textAlign: 'center',
  },
});
