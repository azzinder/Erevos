import { router } from 'expo-router';
import { Fragment } from 'react';
import { Linking, Platform, Text as RNText, View, type TextStyle } from 'react-native';

import { parseInline, type GuideBlock } from '../lib/guide';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

import { Card, fontStyle, Text } from './ui';

// The guide's blocks on screen, as in LPHL FASOULI (src/components/guide.tsx there).

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' });

/** Opens a link of the guide: another section ("#id") or a web page. */
export function openGuideLink(link: string): void {
  if (link.startsWith('#')) router.push({ pathname: '/guide/[id]', params: { id: link.slice(1) } });
  else void Linking.openURL(link).catch(() => undefined);
}

/** A thin line between rows. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const colors = useColors();
  return <View style={{ height: 1, marginLeft: inset, backgroundColor: colors.border }} />;
}

/** A line of the guide, with its bold, code and links (see lib/guide.ts). */
export function GuideText({ text, variant = 'body', tone }: {
  text: string;
  variant?: 'body' | 'bodyStrong' | 'caption';
  tone?: 'muted';
}) {
  const colors = useColors();
  const bold: TextStyle[] = [{ fontWeight: '700' }, fontStyle('700') ?? {}];
  return (
    <Text variant={variant} tone={tone} style={{ lineHeight: variant === 'caption' ? 19 : 24 }}>
      {parseInline(text).map((span, i) => {
        if (span.link) {
          const link = span.link;
          return (
            <RNText
              key={i}
              accessibilityRole="link"
              onPress={() => openGuideLink(link)}
              style={[{ color: colors.accentText, textDecorationLine: 'underline' }, ...bold]}
            >
              {span.text}
            </RNText>
          );
        }
        if (span.code) {
          return (
            <RNText key={i} style={{ fontFamily: MONO, fontSize: variant === 'caption' ? 12 : 14, backgroundColor: withAlpha(colors.text, 0.07) }}>
              {` ${span.text} `}
            </RNText>
          );
        }
        if (span.bold) {
          return (
            <RNText key={i} style={bold}>
              {span.text}
            </RNText>
          );
        }
        return <Fragment key={i}>{span.text}</Fragment>;
      })}
    </Text>
  );
}

function Bullet({ text, marker, indent = 0 }: { text: string; marker: string; indent?: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, paddingLeft: indent }}>
      <Text color={colors.accentText} style={{ lineHeight: 24, width: 12 }}>
        {marker}
      </Text>
      <View style={{ flex: 1 }}>
        <GuideText text={text} />
      </View>
    </View>
  );
}

/** One block of a section of the guide. */
export function GuideBlockView({ block }: { block: GuideBlock }) {
  const colors = useColors();
  switch (block.kind) {
    case 'heading':
      return (
        <Text variant="heading" style={{ marginTop: space.sm }}>
          {block.text}
        </Text>
      );
    case 'paragraph':
      return <GuideText text={block.text} />;
    case 'bullets':
      return (
        <View style={{ gap: space.sm }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ gap: space.xs }}>
              <Bullet text={item.text} marker="•" />
              {item.sub.map((sub, j) => (
                <Bullet key={j} text={sub} marker="◦" indent={20} />
              ))}
            </View>
          ))}
        </View>
      );
    case 'steps':
      return (
        <View style={{ gap: space.md }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: withAlpha(colors.primary, 0.14),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="label" color={colors.accentText}>
                  {String(i + 1)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <GuideText text={item} />
              </View>
            </View>
          ))}
        </View>
      );
    case 'table':
      // On a phone a table reads best as a list: each row's first cell, then the others, under
      // their column's name when there are more than two.
      return (
        <Card style={{ padding: 0, gap: 0 }}>
          {block.rows.map((row, i) => (
            <View key={i}>
              {i > 0 ? <Divider /> : null}
              <View style={{ padding: space.md, gap: space.xs }}>
                <GuideText text={row[0] ?? ''} variant="bodyStrong" />
                {row.slice(1).map((cell, j) =>
                  cell ? (
                    <View key={j} style={{ gap: 2 }}>
                      {block.head.length > 2 ? (
                        <Text variant="overline" tone="muted">
                          {block.head[j + 1]}
                        </Text>
                      ) : null}
                      <GuideText text={cell} />
                    </View>
                  ) : null,
                )}
              </View>
            </View>
          ))}
        </Card>
      );
    case 'note':
      return (
        <View
          style={{
            padding: space.md,
            borderRadius: radius.md,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
            backgroundColor: withAlpha(colors.primary, 0.08),
          }}
        >
          <GuideText text={block.text} />
        </View>
      );
  }
}
