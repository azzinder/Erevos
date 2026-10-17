import { useState } from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { Button, Card, Chip, Page, Row, SectionTitle, Sheet, Text } from '../components/ui';
import {
  buildColors,
  customAccentChoices,
  FRAME_TEXTS,
  frameTextChoices,
  PALETTE_CHOICES,
  radius,
  resolveScheme,
  space,
  STYLES,
  THEMES,
  type Colors,
  type FrameText,
  type PaletteChoice,
  type StyleName,
  type ThemePref,
} from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';
import { GLASS_KINDS, LOOK_NAMES, type GlassKind, type LookName } from '../theme/glass';

// Appearance, as in LPHL FASOULI's settings: flat or glass (as on lphl.nekten.eu), the style,
// light or dark, the colours (the style's own, one of the twelve LPHL palettes, or a colour of
// your own) and the text on coloured areas.
// Each space keeps its own (theme/look.ts), and every space shows this same screen.

const LOOK_LABELS: Record<LookName, string> = { flat: 'Flat', glass: 'Glass' };
const GLASS_KIND_LABELS: Record<GlassKind, string> = { cards: 'Panes', sheet: 'One pane' };
const STYLE_LABELS: Record<StyleName, string> = { classic: 'Classic', modernist: 'Modernist', nocturne: 'Nocturne' };
const THEME_LABELS: Record<ThemePref, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const FRAME_TEXT_LABELS: Record<FrameText, string> = { white: 'White', palette: 'As in the palette', custom: 'My color' };
const PALETTE_LABELS: Record<PaletteChoice, string> = {
  auto: 'Style default',
  house: 'LPHL House',
  thermaikos: 'Thermaikos',
  vardaris: 'Vardaris',
  kipos: 'Garden',
  keramidi: 'Terracotta',
  lychnari: 'Oil lamp',
  vesperi: 'Vesper',
  modernist: 'Modernist',
  rodakini: 'Peach',
  fistiki: 'Pistachio',
  galazio: 'Sky blue',
  lila: 'Lilac',
  custom: 'My color',
};

/** A palette tile, in the given style and scheme: accent, background and text colour side by side, then the name. */
function PaletteTile({ choice, style, scheme, selected, onPress }: {
  choice: PaletteChoice;
  style: StyleName;
  scheme: 'light' | 'dark';
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, look } = useTheme();
  const c = buildColors(style, scheme, choice, look);
  const label = PALETTE_LABELS[choice];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: '31%',
        flexGrow: 1,
        padding: space.sm,
        gap: space.xs,
        borderRadius: radius.md,
        borderWidth: selected ? 3 : 1,
        borderColor: selected ? colors.text : colors.border,
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
      })}
    >
      <View style={{ flexDirection: 'row', height: 32, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flex: 2, backgroundColor: c.hero }} />
        <View style={{ flex: 1, backgroundColor: c.background }} />
        <View style={{ flex: 1, backgroundColor: c.text }} />
      </View>
      <Text variant={selected ? 'bodyStrong' : 'body'} numberOfLines={1} style={{ fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Appearance() {
  const { look, setLook, scheme, colors } = useTheme();
  const system = useColorScheme();
  const styles = useStyles(makeStyles);
  const [pickColor, setPickColor] = useState(false);
  const [pickTextColor, setPickTextColor] = useState(false);

  // Nocturne has its own colours and is always dark: as on the LPHL site, the theme and the text
  // on coloured areas wait, and a palette leaves it for the style it was chosen over.
  const nocturne = look.style === 'nocturne';
  const paletteStyle = nocturne ? look.prevStyle : look.style;
  const paletteScheme = nocturne ? resolveScheme(look.prevStyle, look.theme, system) : scheme;
  // The coloured areas as the palette fills them, to preview each text colour on.
  const fill = buildColors(look.style, scheme, look.palette, { ...look, frameText: 'palette' }).hero;

  return (
    <Page>
      <Text variant="title">Appearance</Text>

      <SectionTitle title="Look" />
      <Row wrap>
        {LOOK_NAMES.map((lk) => (
          <Chip key={lk} label={LOOK_LABELS[lk]} selected={look.look === lk} onPress={() => setLook({ look: lk })} />
        ))}
      </Row>
      {look.look === 'glass' ? (
        <>
          <SectionTitle title="Kind of glass" />
          <Row wrap>
            {GLASS_KINDS.map((k) => (
              <Chip key={k} label={GLASS_KIND_LABELS[k]} selected={look.glassKind === k} onPress={() => setLook({ glassKind: k })} />
            ))}
          </Row>
          <Text variant="caption" tone="faint">
            Panes: each card is a pane of glass over the wallpaper, as on the LPHL admin panel. One pane: each screen lies on
            one frosted pane, as on lphl.nekten.eu.
          </Text>
        </>
      ) : null}

      <SectionTitle title="Style" />
      <Row wrap>
        {STYLES.map((st) => (
          <Chip key={st} label={STYLE_LABELS[st]} selected={look.style === st} onPress={() => (st !== look.style ? setLook({ style: st }) : undefined)} />
        ))}
      </Row>

      <SectionTitle title="Theme" />
      <Row wrap>
        {THEMES.map((th) => (
          <Chip key={th} label={THEME_LABELS[th]} selected={look.theme === th} disabled={nocturne} onPress={() => setLook({ theme: th })} />
        ))}
      </Row>
      {nocturne ? (
        <Text variant="caption" tone="faint">
          Nocturne is always dark.
        </Text>
      ) : null}

      <SectionTitle title="Colors" />
      <View style={styles.tiles}>
        {PALETTE_CHOICES.map((p) => (
          <PaletteTile
            key={p}
            choice={p}
            style={paletteStyle}
            scheme={paletteScheme}
            selected={!nocturne && look.palette === p}
            onPress={() => {
              // "My color" opens the colour list right away; from Nocturne, the style changes once one is picked.
              if (p === 'custom') setPickColor(true);
              if (!nocturne) setLook({ palette: p });
              else if (p !== 'custom') setLook({ palette: p, style: look.prevStyle });
            }}
          />
        ))}
      </View>

      <SectionTitle title="Text on colored areas" />
      <Row wrap>
        {FRAME_TEXTS.map((f) => (
          <Chip
            key={f}
            label={FRAME_TEXT_LABELS[f]}
            selected={look.frameText === f}
            disabled={nocturne}
            onPress={() => {
              setLook({ frameText: f });
              // "My color" opens the colour list right away.
              if (f === 'custom') setPickTextColor(true);
            }}
          />
        ))}
      </Row>
      {nocturne ? (
        <Text variant="caption" tone="faint">
          Nocturne keeps its own colors here.
        </Text>
      ) : null}

      <SectionTitle title="Preview" />
      <Card>
        <View style={[styles.bubble, styles.theirs]}>
          <Text style={{ fontSize: 15 }}>Καλημέρα! Are we still on for tonight?</Text>
        </View>
        <View style={[styles.bubble, styles.mine]}>
          <Text style={{ fontSize: 15 }} color={colors.onPrimary}>
            Yes, see you at eight.
          </Text>
        </View>
        <Row wrap>
          <Button title="Send" compact onPress={() => undefined} />
          <Button title="Hidden chats" kind="secondary" compact onPress={() => undefined} />
        </Row>
      </Card>

      <Text variant="caption" tone="muted" style={styles.hint}>
        Each space keeps its own look. The password screen shows the look last used.
      </Text>

      <Sheet visible={pickColor} onClose={() => setPickColor(false)} title="My color">
        <View style={styles.dots}>
          {customAccentChoices().map((hex) => {
            const selected = look.customAccent.toUpperCase() === hex;
            return (
              <Pressable
                key={hex}
                onPress={() => {
                  setLook(nocturne ? { palette: 'custom', customAccent: hex, style: look.prevStyle } : { palette: 'custom', customAccent: hex });
                  setPickColor(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={hex}
                accessibilityState={{ selected }}
                style={[styles.dot, { backgroundColor: hex, borderWidth: selected ? 3 : 0, borderColor: colors.text }]}
              />
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={pickTextColor} onClose={() => setPickTextColor(false)} title="Text color on colored areas">
        <View style={styles.dots}>
          {frameTextChoices().map((hex) => {
            const selected = look.frameTextColor.toUpperCase() === hex;
            return (
              <Pressable
                key={hex}
                onPress={() => {
                  setLook({ frameText: 'custom', frameTextColor: hex });
                  setPickTextColor(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={hex}
                accessibilityState={{ selected }}
                style={[styles.dot, { backgroundColor: fill, borderWidth: selected ? 3 : 1, borderColor: selected ? colors.text : colors.border }]}
              >
                <Text color={hex} style={{ fontSize: 16, fontWeight: '800' }}>
                  Aa
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </Page>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    tiles: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.sm,
    },
    bubble: {
      maxWidth: '80%',
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: Math.min(radius.md, 16),
    },
    mine: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
    },
    theirs: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
    },
    hint: {
      fontSize: 14,
      lineHeight: 20,
    },
    dots: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    dot: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
