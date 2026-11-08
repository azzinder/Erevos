// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { LauncherIcons } from '../components/launcher-icons';
import { TouchChoice } from '../components/touch-choice';
import { WidgetOrder } from '../components/widget-order';
import { Button, Card, Chip, Page, Row, SectionTitle, Sheet, Text, TextButton } from '../components/ui';
import {
  buildColors,
  customAccentChoices,
  FRAME_TEXTS,
  frameTextChoices,
  CUSTOM_GROUNDS,
  followsTheme,
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
import { mark, t } from '../lib/i18n';
import { pickWallpaper } from '../lib/pick-avatar';
import { savePhoto } from '../lock/avatar-photos';
import { phoneTones } from '../modules/erevos-look';
import { BUBBLE_SHAPES, FONT_CHOICES, TEXT_SIZES, WALLPAPERS, type BubbleShape, type FontChoice, type TextSize, type Wallpaper } from '../theme/look';

// Appearance, as in LPHL FASOULI's settings: flat or glass (as on lphl.nekten.eu), the style,
// light or dark, the colours (the style's own, one of the twelve LPHL palettes, or a colour of
// your own) and the text on coloured areas; and how a chat draws its messages. Neon and Matrix
// are styles of their own: always dark, in their own colours, with a scene behind the screens.
// Material You takes the phone's own colours, light or dark as the theme says, and is offered only
// where the phone has them (Android 12 and later). Each space keeps its own (theme/look.ts), and
// every space shows this same screen. A chat can have its own too, chosen with the same choices
// from its details (app/chat.tsx).

// Proper names of styles and palettes stay as they are; the rest is translated where it is shown.
const LOOK_LABELS: Record<LookName, string> = { flat: mark('Flat'), glass: 'Glass' };
const GLASS_KIND_LABELS: Record<GlassKind, string> = { cards: mark('Panes'), sheet: mark('One pane') };
const STYLE_LABELS: Record<StyleName, string> = { classic: 'Classic', modernist: 'Modernist', nocturne: 'Nocturne',
  neon: 'Neon',
  matrix: 'Matrix',
  paper: 'Paper',
  aurora: 'Aurora',
  material: 'Material You',
  custom: mark('Custom'),
};
const BUBBLE_LABELS: Record<BubbleShape, string> = { round: mark('Round'), square: mark('Square'), line: mark('Line') };
const FONT_LABELS: Record<FontChoice, string> = { style: mark("The style's own"), sans: mark("The phone's"), serif: mark('Serif'), mono: mark('Monospace') };
const TEXT_SIZE_LABELS: Record<TextSize, string> = { small: mark('Small'), normal: mark('Normal'), large: mark('Large'), larger: mark('Larger') };
const WALLPAPER_LABELS: Record<Wallpaper, string> = {
  auto: mark('Style default'),
  plain: mark('Plain'),
  dots: mark('Dots'),
  grid: mark('Grid'),
  stripes: mark('Stripes'),
  stars: mark('Stars'),
  bokeh: mark('Lights'),
  gradient: mark('Gradient'),
  photo: mark('Photo'),
};
const THEME_LABELS: Record<ThemePref, string> = { system: mark('System'), light: mark('Light'), dark: mark('Dark') };
const FRAME_TEXT_LABELS: Record<FrameText, string> = { white: mark('White'), palette: mark('As in the palette'), custom: mark('My color') };
const PALETTE_LABELS: Record<PaletteChoice, string> = {
  auto: mark('Style default'),
  house: 'LPHL House',
  thermaikos: mark('Thermaikos'),
  vardaris: mark('Vardaris'),
  kipos: mark('Garden'),
  keramidi: mark('Terracotta'),
  lychnari: mark('Oil lamp'),
  vesperi: mark('Vesper'),
  modernist: 'Modernist',
  rodakini: mark('Peach'),
  fistiki: mark('Pistachio'),
  galazio: mark('Sky blue'),
  lila: mark('Lilac'),
  custom: mark('My color'),
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
  const label = t(PALETTE_LABELS[choice]);
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

// The parts of the Appearance screen that open alone from Settings (lib/settings.ts), by their titles.
const PARTS = { style: mark('Style and colours'), wallpaper: mark('Wallpaper'), messages: mark('Messages'), icons: mark('Launcher icons'), widget: mark('Widget'), touch: mark('Vibrate on touch') };
type Part = keyof typeof PARTS;
const partOf = (part: unknown): Part | null => (typeof part === 'string' && part in PARTS ? (part as Part) : null);

export default function Appearance() {
  const { part } = useLocalSearchParams<{ part?: string }>();
  return <AppearanceEditor part={partOf(part)} />;
}

/**
 * The Appearance screen's choices: the space's look, or a chat's own (`title` and `top` then say
 * whose). With `part`, only that part of them.
 */
export function AppearanceEditor({ title, top, part = null }: { title?: string; top?: ReactNode; part?: Part | null }) {
  const { look, setLook, scheme, colors } = useTheme();
  const system = useColorScheme();
  const styles = useStyles(makeStyles);
  const [pickColor, setPickColor] = useState(false);
  const [pickTextColor, setPickTextColor] = useState(false);
  const [photoError, setPhotoError] = useState('');
  // Whether the phone has colours of its own for Material You.
  const [phoneColors] = useState(() => phoneTones() !== null);

  /** A photo of the owner's as the wallpaper, sealed in its own file. */
  async function choosePhoto() {
    setPhotoError('');
    try {
      const bytes = await pickWallpaper();
      if (!bytes) return;
      await setLook({ wallpaper: 'photo', wallpaperPhoto: await savePhoto(bytes) });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : t('The photo could not be read.'));
    }
  }

  // Nocturne, Neon, Matrix, Paper, Aurora and Custom have their own colours, light or dark as they
  // are: as on the LPHL site, the theme and the text on coloured areas wait, and a palette leaves
  // them for the style chosen before. Custom's colours are its background and accent, chosen here.
  // Material You's are the phone's, and only the text on coloured areas waits.
  const nocturne = isFixed(look.style);
  const ownScheme = !followsTheme(look.style);
  const custom = look.style === 'custom';
  const material = look.style === 'material';
  const scene = !takesGlass(look.style);
  const styleName = t(STYLE_LABELS[look.style]);
  const bubbles = bubbleStyles(look.bubbles, colors, look.textSize);
  const paletteStyle = nocturne ? look.prevStyle : look.style;
  const paletteScheme = nocturne ? resolveScheme(look.prevStyle, look.theme, system) : scheme;
  // The coloured areas as the palette fills them, to preview each text colour on.
  const fill = buildColors(look.style, scheme, look.palette, { ...look, frameText: 'palette' }).hero;
  const shows = (one: Part) => !part || part === one;

  return (
    <Page>
      <Text variant="title">{title ?? (part ? t(PARTS[part]) : t('Appearance'))}</Text>
      {top}

      {shows('style') ? (
        <>
          <SectionTitle title={t('Look')} />
          <Row wrap>
            {LOOK_NAMES.map((lk) => (
              <Chip key={lk} label={t(LOOK_LABELS[lk])} selected={!scene && look.look === lk} disabled={scene} onPress={() => setLook({ look: lk })} />
            ))}
          </Row>
          {scene ? (
            <Text variant="caption" tone="faint">
              {isScene(look.style)
                ? t('{style} draws its own scene behind the screens, so it takes no glass.', { style: styleName })
                : material
                  ? t("Material You takes no glass: its colors are the phone's own.")
                  : t('Custom takes no glass: its background is the one you chose.')}
            </Text>
          ) : null}
          {look.look === 'glass' && !scene ? (
            <>
              <SectionTitle title={t('Kind of glass')} />
              <Row wrap>
                {GLASS_KINDS.map((k) => (
                  <Chip key={k} label={t(GLASS_KIND_LABELS[k])} selected={look.glassKind === k} onPress={() => setLook({ glassKind: k })} />
                ))}
              </Row>
              <Text variant="caption" tone="faint">
                {t('Panes: each card is a pane of glass over the wallpaper, as on the LPHL admin panel. One pane: each screen lies on one frosted pane, as on lphl.nekten.eu.')}
              </Text>
        </>
      ) : null}

      <SectionTitle title={t('Style')} />
      <Row wrap>
        {STYLES.filter((st) => st !== 'material' || phoneColors || material).map((st) => (
          <Chip key={st} label={t(STYLE_LABELS[st])} selected={look.style === st} onPress={() => (st !== look.style ? setLook({ style: st }) : undefined)} />
        ))}
      </Row>
      {material ? (
        <Text variant="caption" tone="faint">
          {phoneColors
            ? t("Your phone's own colors, which Android makes from its wallpaper: a new wallpaper changes them here too.")
            : t("Material You takes the phone's own colors, on Android 12 and later. Here it shows in Classic's.")}
        </Text>
      ) : null}

      {custom ? (
        <>
          <SectionTitle title={t('Custom: background')} />
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
          <SectionTitle title={t('Custom: accent')} />
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
            {t('The text and the surfaces are made from the background, and every color is checked to read on it.')}
          </Text>
        </>
      ) : null}

      <SectionTitle title={t('Theme')} />
      <Row wrap>
        {THEMES.map((th) => (
          <Chip key={th} label={t(THEME_LABELS[th])} selected={look.theme === th} disabled={ownScheme} onPress={() => setLook({ theme: th })} />
        ))}
      </Row>
      {ownScheme ? (
        <Text variant="caption" tone="faint">
          {custom
            ? t('Custom is light or dark as its background is.')
            : scheme === 'dark'
              ? t('{style} is always dark.', { style: styleName })
              : t('{style} is always light.', { style: styleName })}
        </Text>
      ) : null}

      <SectionTitle title={t('Colors')} />
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

      <SectionTitle title={t('Text on colored areas')} />
      <Row wrap>
        {FRAME_TEXTS.map((f) => (
          <Chip
            key={f}
            label={t(FRAME_TEXT_LABELS[f])}
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
          {t('{style} keeps its own colors here.', { style: styleName })}
        </Text>
      ) : null}

      <SectionTitle title={t('Letters')} />
      <Row wrap>
        {FONT_CHOICES.map((f) => (
          <Chip key={f} label={t(FONT_LABELS[f])} selected={look.font === f} onPress={() => setLook({ font: f })} />
        ))}
      </Row>
      <Text variant="caption" tone="faint">
        {t("Serif letters have small strokes at their ends, as in books; in monospace every letter is as wide, as on a typewriter.")}
      </Text>
        </>
      ) : null}

      {shows('wallpaper') ? (
        <>
          {part ? null : <SectionTitle title={t('Wallpaper')} />}
          <Row wrap>
            {WALLPAPERS.map((w) => (
              <Chip
                key={w}
                label={t(WALLPAPER_LABELS[w])}
                selected={look.wallpaper === w}
                onPress={() => (w === 'photo' && !look.wallpaperPhoto ? void choosePhoto() : setLook({ wallpaper: w }))}
              />
            ))}
          </Row>
          {look.wallpaper === 'photo' ? (
            <Row wrap>
              <TextButton title={t('Change photo')} onPress={() => void choosePhoto()} />
            </Row>
          ) : null}
          <Text variant="caption" tone="faint">
            {look.wallpaper === 'photo'
              ? t('Your photo, made smaller and drawn anew so nothing it said besides its picture is kept, then sealed. A veil over it keeps the text readable.')
              : t("Drawn faintly in the accent, behind every screen. Style default keeps {style}'s own.", { style: styleName })}
          </Text>
          {photoError ? (
            <Text variant="caption" color={colors.danger}>
              {photoError}
            </Text>
          ) : null}
        </>
      ) : null}

      {shows('messages') ? (
        <>
          {part ? null : <SectionTitle title={t('Messages')} />}
          <Row wrap>
            {BUBBLE_SHAPES.map((b) => (
              <Chip key={b} label={t(BUBBLE_LABELS[b])} selected={look.bubbles === b} onPress={() => setLook({ bubbles: b })} />
            ))}
          </Row>
          <SectionTitle title={t('Text size')} />
          <Row wrap>
            {TEXT_SIZES.map((size) => (
              <Chip key={size} label={t(TEXT_SIZE_LABELS[size])} selected={look.textSize === size} onPress={() => setLook({ textSize: size })} />
            ))}
          </Row>
        </>
      ) : null}

      {/* The preview, under every part that changes how the chats look. */}
      {part !== 'icons' && part !== 'widget' ? (
        <>
          <SectionTitle title={t('Preview')} />
          <Card>
            <View style={[styles.bubble, bubbles.theirs, bubbles.theirsTail]}>
              <Text style={[{ fontSize: 15 }, bubbles.theirsText]}>{t('Καλημέρα! Are we still on for tonight?')}</Text>
            </View>
            <View style={[styles.bubble, bubbles.mine, bubbles.mineTail]}>
              <Text style={[{ fontSize: 15 }, bubbles.mineText]}>{t('Yes, see you at eight.')}</Text>
            </View>
            <Row wrap>
              <Button title={t('Send')} compact onPress={() => undefined} />
              <Button title={t('Hidden chats')} kind="secondary" compact onPress={() => undefined} />
            </Row>
          </Card>
        </>
      ) : null}

      {top || (part && part !== 'style') ? null : (
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('Each space keeps its own look. The password screen shows the look last used.')}
        </Text>
      )}

      {/* The phone's launcher icons and widget: not a chat's look (Android only). */}
      {top || !shows('icons') ? null : <LauncherIcons titled={!part} />}
      {top || !shows('widget') ? null : <WidgetOrder titled={!part} />}
      {/* Whether a touch buzzes (lib/haptics.ts): not a chat's look either. */}
      {top || Platform.OS === 'web' || !shows('touch') ? null : <TouchChoice titled={!part} />}

      <Sheet visible={pickColor} onClose={() => setPickColor(false)} title={t('My color')}>
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

      <Sheet visible={pickTextColor} onClose={() => setPickTextColor(false)} title={t('Text color on colored areas')}>
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
