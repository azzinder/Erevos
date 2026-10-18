import { useState } from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { Button, Card, Chip, Page, Row, SectionTitle, Sheet, Text } from '../components/ui';
import {
  buildColors,
  customAccentChoices,
  FRAME_TEXTS,
  frameTextChoices,
  CUSTOM_GROUNDS,
  isFixed,
  isScene,
  takesGlass,
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
import { bubbleStyles } from '../theme/bubbles';
import { useStyles, useTheme } from '../theme/context';
import { GLASS_KINDS, LOOK_NAMES, type GlassKind, type LookName } from '../theme/glass';
import { BUBBLE_SHAPES, WALLPAPERS, type BubbleShape, type Wallpaper } from '../theme/look';

// Appearance, as in LPHL FASOULI's settings: flat or glass (as on lphl.nekten.eu), the style,
// light or dark, the colours (the style's own, one of the twelve LPHL palettes, or a colour of
// your own) and the text on coloured areas; and how a chat draws its messages. Neon and Matrix
// are styles of their own: always dark, in their own colours, with a scene behind the screens.
// Each space keeps its own (theme/look.ts), and every space shows this same screen.

const LOOK_LABELS: Record<LookName, string> = { flat: 'Flat', glass: 'Glass' };
const GLASS_KIND_LABELS: Record<GlassKind, string> = { cards: 'Panes', sheet: 'One pane' };
const STYLE_LABELS: Record<StyleName, string> = { classic: 'Classic', modernist: 'Modernist', nocturne: 'Nocturne',
  neon: 'Neon',
  matrix: 'Matrix',
  paper: 'Paper',
  aurora: 'Aurora',
  custom: 'Custom',
};
const BUBBLE_LABELS: Record<BubbleShape, string> = { round: 'Round', square: 'Square', line: 'Line' };
const WALLPAPER_LABELS: Record<Wallpaper, string> = {
  auto: 'Style default',
  plain: 'Plain',
  dots: 'Dots',
  grid: 'Grid',
  stripes: 'Stripes',
  stars: 'Stars',
  bokeh: 'Lights',
  gradient: 'Gradient',
};
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

  // Nocturne, Neon, Matrix, Paper, Aurora and Custom have their own colours, light or dark as they
  // are: as on the LPHL site, the theme and the text on coloured areas wait, and a palette leaves
  // them for the style chosen before. Custom's colours are its background and accent, chosen here.
  const nocturne = isFixed(look.style);
  const custom = look.style === 'custom';
  const scene = !takesGlass(look.style);
  const styleName = STYLE_LABELS[look.style];
  const bubbles = bubbleStyles(look.bubbles, colors);
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
          <Chip key={lk} label={LOOK_LABELS[lk]} selected={!scene && look.look === lk} disabled={scene} onPress={() => setLook({ look: lk })} />
        ))}
      </Row>
      {scene ? (
        <Text variant="caption" tone="faint">
          {isScene(look.style)
            ? `${styleName} draws its own scene behind the screens, so it takes no glass.`
            : 'Custom takes no glass: its background is the one you chose.'}
        </Text>
      ) : null}
      {look.look === 'glass' && !scene ? (
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

      {custom ? (
        <>
          <SectionTitle title="Custom: background" />
          <View style={styles.dots}>
            {CUSTOM_GROUNDS.map((hex) => {
              const selected = look.customGround.toUpperCase() === hex;
              return (
                <Pressable
                  key={hex}
                  onPress={() => setLook({ customGround: hex })}
                  accessibilityRole="radio"
                  accessibilityLabel={hex}
                  accessibilityState={{ selected }}
                  style={[styles.dot, { backgroundColor: hex, borderWidth: selected ? 3 : 1, borderColor: selected ? colors.primary : colors.border }]}
                />
              );
            })}
          </View>
          <SectionTitle title="Custom: accent" />
          <View style={styles.dots}>
            {customAccentChoices().map((hex) => {
              const selected = look.customAccent.toUpperCase() === hex;
              return (
                <Pressable
                  key={hex}
                  onPress={() => setLook({ customAccent: hex })}
                  accessibilityRole="radio"
                  accessibilityLabel={hex}
                  accessibilityState={{ selected }}
                  style={[styles.dot, { backgroundColor: hex, borderWidth: selected ? 3 : 0, borderColor: colors.text }]}
                />
              );
            })}
          </View>
          <Text variant="caption" tone="faint">
            The text and the surfaces are made from the background, and every color is checked to read on it.
          </Text>
        </>
      ) : null}

      <SectionTitle title="Theme" />
      <Row wrap>
        {THEMES.map((th) => (
          <Chip key={th} label={THEME_LABELS[th]} selected={look.theme === th} disabled={nocturne} onPress={() => setLook({ theme: th })} />
        ))}
      </Row>
      {nocturne ? (
        <Text variant="caption" tone="faint">
          {custom ? 'Custom is light or dark as its background is.' : `${styleName} is always ${scheme}.`}
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
          {styleName} keeps its own colors here.
        </Text>
      ) : null}

      <SectionTitle title="Wallpaper" />
      <Row wrap>
        {WALLPAPERS.map((w) => (
          <Chip key={w} label={WALLPAPER_LABELS[w]} selected={look.wallpaper === w} onPress={() => setLook({ wallpaper: w })} />
        ))}
      </Row>
      <Text variant="caption" tone="faint">
        Drawn faintly in the accent, behind every screen. Style default keeps {styleName}'s own.
      </Text>

      <SectionTitle title="Messages" />
      <Row wrap>
        {BUBBLE_SHAPES.map((b) => (
          <Chip key={b} label={BUBBLE_LABELS[b]} selected={look.bubbles === b} onPress={() => setLook({ bubbles: b })} />
        ))}
      </Row>

      <SectionTitle title="Preview" />
      <Card>
        <View style={[styles.bubble, bubbles.theirs, bubbles.theirsTail]}>
          <Text style={[{ fontSize: 15 }, bubbles.theirsText]}>Καλημέρα! Are we still on for tonight?</Text>
        </View>
        <View style={[styles.bubble, bubbles.mine, bubbles.mineTail]}>
          <Text style={[{ fontSize: 15 }, bubbles.mineText]}>Yes, see you at eight.</Text>
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
