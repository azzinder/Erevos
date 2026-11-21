// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Divider } from '../components/guide';
import { ChevronIcon, GlobeIcon, LockIcon, PersonIcon, PhoneIcon, SignalIcon, StackIcon } from '../components/icons';
import { Card, Page, Text } from '../components/ui';
import { t } from '../lib/i18n';
import { nearby } from '../lib/nearby';
import { onNostrStates } from '../lib/nostr';
import { lora } from '../lib/radio';
import { onRelayHeard } from '../lib/relay';
import { waysNow, type Way, type WayId, type WaysInput } from '../lib/ways';
import { HUES, NO_INPUT, readWays } from '../lib/ways-read';
import { space, withAlpha } from '../theme/colors';
import { useColors, useTheme } from '../theme/context';

// Every way the open space's messages go out by, on one screen (lib/ways.ts): a card each, with
// how it is now, and a line under it, full when it works, faint when it is on but reaches no one
// now, dashed when it is off; above them, how many of the space's own messages wait to go, a dot
// for each. Only the space's: its hidden chats never show here, nor whether it has any. A card
// opens that way's settings. Read again every few seconds while the screen shows.

const LOOK_EVERY = 3000;
// The most dots shown for what waits; more say so with a plus.
const MOST_DOTS = 8;

const ICONS: Record<WayId, (props: { color: string; size?: number }) => ReactNode> = {
  relay: StackIcon,
  nostr: GlobeIcon,
  nearby: PersonIcon,
  lora: SignalIcon,
  sms: PhoneIcon,
  tor: LockIcon,
};

export default function WaysScreen() {
  const [read, setRead] = useState<{ input: WaysInput; waiting: number } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    let stopped = false;
    const look = () =>
      readWays()
        .then((next) => {
          if (stopped) return;
          setRead(next);
          setNote('');
        })
        .catch(() => !stopped && setNote(t('The settings of this space could not open.')));
    look();
    const timer = setInterval(look, LOOK_EVERY);
    const stops = [onRelayHeard(look), onNostrStates(look), nearby.onChange(look), lora.onChange(look)];
    return () => {
      stopped = true;
      clearInterval(timer);
      stops.forEach((stop) => stop());
    };
  }, []);

  const shown = waysNow(read?.input ?? NO_INPUT, read?.waiting ?? 0);
  const waiting = read?.waiting ?? 0;
  return (
    <Page>
      <Text variant="title">{t('Ways')}</Text>
      {read ? (
        <View style={{ gap: space.xs }}>
          <Text variant="heading">{shown.lead}</Text>
          <Text tone="muted">{shown.waiting}</Text>
          {waiting > 0 ? <Dots count={waiting} /> : null}
        </View>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
      {read ? (
        <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
          {shown.ways.map((way, i) => (
            <View key={way.id}>
              {i > 0 ? <Divider inset={0} /> : null}
              <WayRow way={way} />
            </View>
          ))}
        </Card>
      ) : null}
      <Text variant="caption" tone="faint">
        {t('A full line: the way works. A faint line: it is on, but reaches no one now. Dashes: it is off. An orange dot: a message of yours that waits to go, by whichever way opens first. Only this space shows here.')}
      </Text>
    </Page>
  );
}

function WayRow({ way }: { way: Way }) {
  const colors = useColors();
  const { scheme } = useTheme();
  const hue = HUES[way.id][scheme === 'dark' ? 1 : 0];
  const tint = way.look === 'off' ? colors.textFaint : hue;
  const Icon = ICONS[way.id];
  return (
    <Pressable
      onPress={() => router.push(way.href)}
      accessibilityRole="button"
      accessibilityLabel={`${way.title}, ${way.figure}. ${way.line}`}
      style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, padding: space.md, paddingRight: space.sm, backgroundColor: pressed ? colors.surfacePressed : 'transparent' })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(tint, 0.14) }}>
        <Icon color={tint} size={20} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {way.title}
          </Text>
          <Text variant="caption" color={tint} numberOfLines={1} style={{ maxWidth: '55%' }}>
            {way.figure}
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          {way.line}
        </Text>
        <WayLine look={way.look} color={hue} faint={colors.textFaint} />
      </View>
      <View style={{ justifyContent: 'center' }}>
        <ChevronIcon color={colors.textFaint} size={16} />
      </View>
    </Pressable>
  );
}

// The line under a way: full, faint, or in dashes, drawn with views so it shows alike everywhere.
function WayLine({ look, color, faint }: { look: Way['look']; color: string; faint: string }) {
  const [width, setWidth] = useState(0);
  if (look !== 'off') return <View style={{ height: 3, borderRadius: 2, marginTop: 6, backgroundColor: look === 'up' ? color : withAlpha(color, 0.3) }} />;
  const dashes = Math.max(0, Math.floor((width + 6) / 14));
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: 2, marginTop: 6, flexDirection: 'row', gap: 6, overflow: 'hidden' }}>
      {Array.from({ length: dashes }, (_, i) => (
        <View key={i} style={{ width: 8, height: 2, borderRadius: 1, backgroundColor: withAlpha(faint, 0.7) }} />
      ))}
    </View>
  );
}

// A dot for each message of the space's own that waits to go, up to MOST_DOTS.
function Dots({ count }: { count: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: Math.min(count, MOST_DOTS) }, (_, i) => (
        <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning }} />
      ))}
      {count > MOST_DOTS ? (
        <Text variant="caption" color={colors.warning}>
          +{count - MOST_DOTS}
        </Text>
      ) : null}
    </View>
  );
}
