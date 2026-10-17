import { LPHL_PALETTE_ORDER, LPHL_PALETTES, type LphlModeColors, type LphlPaletteName } from './lphl-palettes';

// The app's colours and shapes, ported from LPHL FASOULI (src/theme/colors.ts there): three
// styles, the twelve LPHL palettes or a colour of your own, and the text on coloured areas. What
// differs from FASOULI: Classic is Erevos's own warm dark with its gold (and a light one to
// match), there are no money colours, but there is `success` for notes that something worked,
// and Modernist is set in Inter Tight alone, as chats are written in Greek as well. The glass look
// is in glass.ts.

const classic = {
  light: {
    background: '#F7F3EC',
    surface: '#FFFFFF',
    surfaceAlt: '#EFE8DC',
    surfacePressed: '#E5DCCD',
    border: '#DDD3C3',
    text: '#1C1712',
    textMuted: '#6B5F52',
    textFaint: '#8E8274',
    primary: '#D9A441',
    primaryPressed: '#C4902F',
    onPrimary: '#1C1712',
    primarySoft: '#F6E7C6',
    hero: '#D9A441',
    heroText: '#1C1712',
    heroMuted: '#6B5323',
    success: '#2F7D6E',
    warning: '#A86F12',
    danger: '#B8431F',
    overlay: 'rgba(28, 23, 18, 0.45)',
  },
  dark: {
    background: '#0D0B09',
    surface: '#17140F',
    surfaceAlt: '#2A2520',
    surfacePressed: '#352F28',
    border: '#4A4036',
    text: '#F5EFE6',
    textMuted: '#BFB6AA',
    textFaint: '#A39A8D',
    primary: '#D9A441',
    primaryPressed: '#C4902F',
    onPrimary: '#0D0B09',
    primarySoft: '#3A2E17',
    hero: '#D9A441',
    heroText: '#0D0B09',
    heroMuted: '#5A4520',
    success: '#7FB2A8',
    warning: '#D9A441',
    danger: '#E08F6E',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

/** Modernist (from the LPHL FASOULI design system): ink on warm white, one red accent. */
const modernist: typeof classic = {
  light: {
    background: '#F3F2F2',
    surface: '#F3F2F2',
    surfaceAlt: '#EAE9E9',
    surfacePressed: '#D7D3D3',
    border: '#9F9D9D',
    text: '#201E1D',
    textMuted: '#605D5D',
    textFaint: '#9B9797',
    primary: '#EC3013',
    primaryPressed: '#DD2B0F',
    onPrimary: '#F3F2F2',
    primarySoft: '#FFE0D9',
    hero: '#EC3013',
    heroText: '#F3F2F2',
    heroMuted: '#FFE0D9',
    success: '#AE1800',
    warning: '#DD2B0F',
    danger: '#EC3013',
    overlay: 'rgba(32, 30, 29, 0.5)',
  },
  dark: {
    background: '#1C1A19',
    surface: '#1C1A19',
    surfaceAlt: '#2D2B2B',
    surfacePressed: '#444141',
    border: '#676665',
    text: '#F3F2F2',
    textMuted: '#BAB6B6',
    textFaint: '#7D7979',
    primary: '#FF563C',
    primaryPressed: '#FF9783',
    onPrimary: '#1C1A19',
    primarySoft: '#4D170E',
    hero: '#EC3013',
    heroText: '#F3F2F2',
    heroMuted: '#FFC4B8',
    success: '#FF9783',
    warning: '#FF9783',
    danger: '#FF563C',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

/**
 * Nocturne, the LPHL site's night style (nocturne.css): ink on a deep blue-black, one blurple
 * accent, lines instead of fills. Always dark, with its own colours whatever the palette.
 */
const NIGHT = {
  background: '#161826',
  surface: '#232532',
  surfaceAlt: '#1D1F2E',
  surfacePressed: '#282841',
  border: '#383946',
  text: '#E9E9ED',
  textMuted: '#B2B6CB',
  textFaint: '#9094A8',
  primary: '#9184D9',
  primaryPressed: '#D2CAFF',
  onPrimary: '#161826',
  primarySoft: '#302A4E',
  hero: '#262A60',
  heroText: '#E9E9ED',
  heroMuted: '#E6E2FF',
  success: '#4DBF94',
  warning: '#D9A441',
  danger: '#E0697A',
  overlay: 'rgba(0, 0, 0, 0.6)',
};
const nocturne: typeof classic = { light: NIGHT, dark: NIGHT };

/** Nocturne's few colours beyond the tokens (nocturne.css §1), for its lines and kickers. */
export const NOCTURNE = {
  /** The accent's pale end (accent-700): kickers, pressed labels. */
  accentPale: '#D2CAFF',
  /** accent-800: the label of what is chosen. */
  accentPaler: '#E6E2FF',
  /** Accent 17% into the ground: what is pressed or chosen. */
  wash: '#282841',
  /** The line of fields and of outlined boxes. */
  fieldLine: '#424450',
};

export type StyleName = 'classic' | 'modernist' | 'nocturne';
export const STYLES: StyleName[] = ['classic', 'modernist', 'nocturne'];
/** The styles a palette can be shown in (Nocturne has its own colours). */
export type PaletteStyle = Exclude<StyleName, 'nocturne'>;

export const palettes: Record<StyleName, typeof classic> = { classic, modernist, nocturne };

type BaseColors = typeof classic.light;

/**
 * The app's colours, all #RRGGBB but `overlay` and those the glass look (glass.ts) makes
 * see-through: `ground` (what every screen is painted with; the background unless the look draws
 * behind the screens), `sheet` (bars), `popover` (sheets and dialogs) and the surfaces.
 * `accentText` is the accent as small text, deepened where the accent itself would not read.
 */
export type Colors = BaseColors & { ground: string; sheet: string; popover: string; accentText: string };

export type ThemePref = 'system' | 'light' | 'dark';
export const THEMES: ThemePref[] = ['system', 'light', 'dark'];

/** Light or dark: Nocturne is always dark; otherwise the setting, or the system's. */
export function resolveScheme(style: StyleName, theme: ThemePref, system: string | null | undefined): 'light' | 'dark' {
  if (style === 'nocturne') return 'dark';
  return theme === 'system' ? (system === 'light' ? 'light' : 'dark') : theme;
}

/** Colour palette choice: the style's own colours, one of the LPHL palettes, or the user's own colour. */
export type PaletteChoice = 'auto' | LphlPaletteName | 'custom';
export const PALETTE_CHOICES: PaletteChoice[] = ['auto', ...LPHL_PALETTE_ORDER, 'custom'];

/** Text on coloured areas: always white, the palette's own (dark text on the gold and the pastels), or a colour of the user's choice. */
export type FrameText = 'white' | 'palette' | 'custom';
export const FRAME_TEXTS: FrameText[] = ['white', 'palette', 'custom'];

export interface ColorOptions {
  /** Accent of the 'custom' palette. */
  customAccent: string;
  frameText: FrameText;
  /** Text colour on coloured areas when frameText is 'custom' (#rrggbb). */
  frameTextColor?: string;
}
export const DEFAULT_COLOR_OPTIONS: ColorOptions = { customAccent: '#D9A441', frameText: 'palette', frameTextColor: '#FFFFFF' };

/** Colours offered for text on coloured areas: light and dark neutrals, then the accent colours. */
export function frameTextChoices(): string[] {
  return [...new Set(['#FFFFFF', '#F5EFE6', '#FFE0D9', '#201E1D', '#0D0B09', '#000000', ...customAccentChoices()])];
}

/** Colours offered for "My color": Erevos's gold, every LPHL accent, then the swatches. */
export function customAccentChoices(): string[] {
  const lphl = LPHL_PALETTE_ORDER.map((p) => LPHL_PALETTES[p].light.accent.toUpperCase());
  return [...new Set(['#D9A441', ...lphl, ...SWATCHES.map((c) => c.toUpperCase())])];
}

/** A palette built around one accent, on the LPHL House background and text. */
function customPalette(accent: string, scheme: 'light' | 'dark'): LphlModeColors {
  const house = LPHL_PALETTES.house[scheme];
  const up = (t: number) => mixHex(accent, '#FFFFFF', t);
  const down = (t: number) => mixHex(accent, '#000000', t);
  const ramp = [up(0.85), up(0.7), up(0.5), up(0.25), accent.toUpperCase(), down(0.15), down(0.3), down(0.45), down(0.6)];
  const shades = ['100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;
  const ordered = scheme === 'dark' ? [...ramp].reverse() : ramp;
  const accentRamp = Object.fromEntries(shades.map((s, i) => [s, ordered[i]])) as LphlModeColors['accentRamp'];
  const onAccent = contrast(accent, '#FFFFFF') >= contrast(accent, house.text) ? '#FFFFFF' : house.text;
  return { ...house, accent, accentField: accent, onAccent, accentRamp };
}

/** Mixes two #rrggbb colours; `t` is the share of `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Colours for a style and palette, before text on coloured areas is made white. */
function paletteColors(style: PaletteStyle, scheme: 'light' | 'dark', palette: PaletteChoice, customAccent: string): BaseColors {
  const base = palettes[style][scheme];
  if (palette === 'auto') return { ...base };
  const p = palette === 'custom' ? customPalette(customAccent, scheme) : LPHL_PALETTES[palette][scheme];
  const n = p.neutral;
  const a = p.accentRamp;
  const dark = scheme === 'dark';
  const flat = style === 'modernist';
  return {
    ...base,
    background: p.bg,
    surface: flat ? p.bg : dark ? mixHex(p.bg, n['100'], 0.6) : mixHex(p.bg, '#FFFFFF', 0.7),
    surfaceAlt: dark ? n['100'] : n['200'],
    surfacePressed: dark ? n['200'] : n['300'],
    border: flat ? n['500'] : dark ? n['200'] : n['300'],
    text: p.text,
    textMuted: dark ? n['600'] : n['700'],
    textFaint: dark ? n['400'] : n['500'],
    primary: p.accentField,
    primaryPressed: dark ? a['500'] : a['700'],
    onPrimary: p.onAccent,
    primarySoft: a['100'],
    hero: p.accentField,
    heroText: p.onAccent,
    heroMuted: mixHex(p.onAccent, p.accentField, 0.3),
    success: a['700'],
    warning: a['600'],
    danger: p.danger,
  };
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#FFFFFF';
/** Text on a coloured area must reach this contrast (large, bold text). */
const MIN_CONTRAST = 3;
/** Small text (links, notes) must reach this on the background. */
const TEXT_CONTRAST = 4.5;

/** Text on a coloured area is white; a fill too light for white text is deepened, in the same hue, until it reads. */
function whiteOn(fill: string, onFill: string): { fill: string; on: string } {
  const light = contrast(onFill, '#000000') > 14;
  if (light && contrast(fill, onFill) >= MIN_CONTRAST) return { fill, on: onFill };
  let f = fill;
  for (let i = 1; i <= 20 && contrast(f, WHITE) < MIN_CONTRAST; i++) f = mixHex(fill, '#000000', i * 0.04);
  return { fill: f, on: WHITE };
}

/** An ink stepped toward black on a light ground, or white on a dark one, until it reads there as small text. */
export function readableOn(ink: string, ground: string, min = TEXT_CONTRAST): string {
  const toward = contrast(ground, '#000000') > contrast(ground, WHITE) ? '#000000' : WHITE;
  let c = ink.toUpperCase();
  for (let i = 1; i <= 20 && contrast(c, ground) < min; i++) c = mixHex(ink, toward, i * 0.05);
  return c;
}

/** The derived tokens (see Colors). */
const done = (c: BaseColors): Colors => ({
  ...c,
  success: readableOn(c.success, c.background),
  ground: c.background,
  sheet: c.surface,
  popover: c.surface,
  accentText: readableOn(c.primary, c.background),
});

/**
 * The colours the app uses for a style, light or dark scheme and palette. A palette sets the
 * background, text and accent; the style keeps its own shapes. Nocturne has its own colours
 * whatever the palette, scheme or text setting.
 */
export function buildColors(
  style: StyleName,
  scheme: 'light' | 'dark',
  palette: PaletteChoice,
  opts: ColorOptions = DEFAULT_COLOR_OPTIONS,
): Colors {
  if (style === 'nocturne') return done({ ...NIGHT });
  const c = paletteColors(style, scheme, palette, opts.customAccent);
  // "As in the palette" keeps the fills and text exactly as the palette defines them.
  if (opts.frameText === 'palette') return done(c);
  // "My color": the palette's fills with the chosen text colour.
  if (opts.frameText === 'custom') {
    const on = /^#[0-9a-fA-F]{6}$/.test(opts.frameTextColor ?? '') ? opts.frameTextColor!.toUpperCase() : WHITE;
    c.onPrimary = on;
    c.heroText = on;
    c.heroMuted = mixHex(on, c.hero, 0.3);
    return done(c);
  }
  const button = whiteOn(c.primary, c.onPrimary);
  if (button.fill !== c.primary || button.on !== c.onPrimary) {
    c.primary = button.fill;
    c.onPrimary = button.on;
    c.primaryPressed = mixHex(button.fill, '#000000', 0.15);
  }
  const hero = whiteOn(c.hero, c.heroText);
  if (hero.fill !== c.hero || hero.on !== c.heroText) {
    c.hero = hero.fill;
    c.heroText = hero.on;
    c.heroMuted = mixHex(WHITE, hero.fill, 0.22);
  }
  return done(c);
}

/**
 * The accent as the palette defines it for a scheme (not deepened for white text): what the
 * glass's wallpaper is tinted with, and its small text on the smoked side.
 */
export function rawAccent(style: StyleName, scheme: 'light' | 'dark', palette: PaletteChoice, customAccent: string): string {
  if (style === 'nocturne') return NIGHT.primary;
  if (palette === 'auto') return palettes[style][scheme].primary;
  if (palette === 'custom') return /^#[0-9a-fA-F]{6}$/.test(customAccent) ? customAccent.toUpperCase() : DEFAULT_COLOR_OPTIONS.customAccent;
  return LPHL_PALETTES[palette][scheme].accent.toUpperCase();
}

/**
 * The accent as small text on a light ground (the site's accent-700, which it uses on its frosted
 * glass): the palette's 700 step; for a style's own colours, its pressed accent.
 */
export function deepAccent(style: StyleName, palette: PaletteChoice, customAccent: string): string {
  if (style === 'nocturne') return NIGHT.primary;
  if (palette === 'auto') return palettes[style].light.primaryPressed;
  const p = palette === 'custom' ? customPalette(rawAccent(style, 'light', 'custom', customAccent), 'light') : LPHL_PALETTES[palette].light;
  return p.accentRamp['700'].toUpperCase();
}

/** Colours offered beside the LPHL accents for "My color". */
export const SWATCHES = [
  '#0F766E', '#138A57', '#65A30D', '#CA8A04', '#F59E0B', '#F97316', '#EF4444', '#E11D48',
  '#EC4899', '#D946EF', '#8B5CF6', '#6366F1', '#3867D6', '#0EA5E9', '#14B8A6', '#64748B',
  '#A16207', '#7C3AED', '#0D9488', '#94A3B8',
];

export function withAlpha(hex: string, alpha: number): string {
  // A see-through colour (the glass's tokens): its own alpha times this one.
  const rgba = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/.exec(hex);
  if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${Math.round(Number(rgba[4]) * alpha * 1000) / 1000})`;
  if (hex === 'transparent') return hex;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export interface Fonts {
  regular: string;
  semibold: string;
  bold: string;
}

interface Shape {
  radius: { sm: number; md: number; lg: number; xl: number; pill: number; button: number; chip: number };
  shape: {
    cardBorder: number;
    buttonAlign: 'center' | 'flex-start';
    fonts: Fonts | null;
    /** Nocturne's lines instead of fills: outlined buttons, the wash for what is chosen. */
    lines: boolean;
    /** Nocturne's type: medium headings, light kickers, tighter titles. */
    type: 'plain' | 'nocturne';
    /** The glass look: bars and sheets blur what is behind them where the engine can (components/glass.ts). */
    glass: boolean;
  };
}

const SHAPES: Record<StyleName, Shape> = {
  classic: {
    radius: { sm: 10, md: 14, lg: 20, xl: 28, pill: 999, button: 999, chip: 999 },
    shape: { cardBorder: 1, buttonAlign: 'center', fonts: null, lines: false, type: 'plain', glass: false },
  },
  // Flat and architectural: no rounded corners, strong 2px rules, labels flush left even inside buttons.
  modernist: {
    radius: { sm: 0, md: 0, lg: 0, xl: 0, pill: 0, button: 0, chip: 0 },
    shape: { cardBorder: 2, buttonAlign: 'flex-start', fonts: null, lines: false, type: 'plain', glass: false },
  },
  // The site's 8 px corners, 6 px on chips; circles stay circles; cards a shade lighter than the ground, with no outline.
  nocturne: {
    radius: { sm: 6, md: 8, lg: 8, xl: 8, pill: 999, button: 8, chip: 6 },
    shape: { cardBorder: 0, buttonAlign: 'center', fonts: null, lines: true, type: 'nocturne', glass: false },
  },
};

/**
 * Shape tokens of the active style, read at render time. The theme provider sets them before
 * anything renders, and every themed component re-renders when the look changes.
 */
export const radius = { ...SHAPES.classic.radius };
export const shape = { ...SHAPES.classic.shape };

/**
 * Glass's corners (the panel's: fields 10, buttons 12, cards 20, sheets 24, chips round) win over
 * the style's, as on the site; cards are outlined with the glass's edge.
 */
const GLASS_RADIUS: Shape['radius'] = { sm: 8, md: 10, lg: 20, xl: 24, pill: 999, button: 12, chip: 999 };

/** Sets the shape tokens. `fonts` is the style's own, once loaded (theme/fonts.ts); null keeps the system font. */
export function applyStyle(style: StyleName, fonts: Fonts | null = null, look: 'flat' | 'glass' = 'flat'): void {
  Object.assign(radius, SHAPES[style].radius);
  Object.assign(shape, SHAPES[style].shape);
  shape.fonts = style === 'classic' ? null : fonts;
  if (look === 'glass') {
    Object.assign(radius, GLASS_RADIUS);
    shape.cardBorder = 1;
    shape.glass = true;
  }
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
