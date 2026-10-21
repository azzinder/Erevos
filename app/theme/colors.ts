import { LPHL_PALETTE_ORDER, LPHL_PALETTES, type LphlModeColors, type LphlPaletteName } from './lphl-palettes';

// The app's colours and shapes, ported from LPHL FASOULI (src/theme/colors.ts there): three
// styles, the twelve LPHL palettes or a colour of your own, and the text on coloured areas. What
// differs from FASOULI: Classic is Erevos's own warm dark with its gold (and a light one to
// match), there are no money colours, but there is `success` for notes that something worked,
// and Modernist is set in Inter Tight alone, as chats are written in Greek as well. The glass look
// is in glass.ts. Material You takes the phone's own colours, which Android 12 and later make
// from the wallpaper (materialColors).

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

/**
 * Neon: a night city in LEDs. Cyan light on a violet-black ground, magenta for what stands out,
 * lines that glow instead of fills. Always dark, with its own colours whatever the palette.
 */
const NEON = {
  background: '#07060F',
  surface: '#100E1F',
  surfaceAlt: '#17142B',
  surfacePressed: '#231E40',
  border: '#2E2A55',
  text: '#EAF6FF',
  textMuted: '#A9B4DA',
  textFaint: '#7F89B5',
  primary: '#00E5FF',
  primaryPressed: '#7DF3FF',
  onPrimary: '#05040C',
  primarySoft: '#062F3A',
  hero: '#FF2BD6',
  heroText: '#05040C',
  heroMuted: '#5C0F4E',
  success: '#39FF88',
  warning: '#FFD23F',
  danger: '#FF4D6D',
  overlay: 'rgba(0, 0, 0, 0.7)',
};
const neon: typeof classic = { light: NEON, dark: NEON };

/** Matrix: green phosphor on black, in the platform's monospace, with code raining behind. Always dark. */
const MATRIX = {
  background: '#000000',
  surface: '#020D04',
  surfaceAlt: '#05180A',
  surfacePressed: '#0A2A12',
  border: '#0F5A22',
  text: '#B6FFC6',
  textMuted: '#4CE077',
  textFaint: '#2E9E50',
  primary: '#00FF41',
  primaryPressed: '#7DFF9C',
  onPrimary: '#000000',
  primarySoft: '#003B10',
  hero: '#00FF41',
  heroText: '#000000',
  heroMuted: '#00591A',
  success: '#00FF41',
  warning: '#E5FF00',
  danger: '#FF4545',
  overlay: 'rgba(0, 0, 0, 0.75)',
};
const matrix: typeof classic = { light: MATRIX, dark: MATRIX };

/** Paper: fountain-pen blue on cream, a red margin, in a serif, over ruled lines. Always light. */
const PAPER = {
  background: '#F5EFE3',
  surface: '#FBF7EE',
  surfaceAlt: '#EDE5D4',
  surfacePressed: '#E2D8C3',
  border: '#CDBFA4',
  text: '#221D16',
  textMuted: '#5A5042',
  textFaint: '#7A6F5E',
  primary: '#1F4FA3',
  primaryPressed: '#173D80',
  onPrimary: '#FFFFFF',
  primarySoft: '#DCE5F5',
  hero: '#B3261E',
  heroText: '#FFFFFF',
  heroMuted: '#F3D6D3',
  success: '#2D6A4F',
  warning: '#8F5F00',
  danger: '#B3261E',
  overlay: 'rgba(34, 29, 22, 0.45)',
};
const paper: typeof classic = { light: PAPER, dark: PAPER };

/** Aurora: violet on near-white, soft and round, in Inter, over drifting light of mint, lilac and peach. Always light. */
const AURORA = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEF7',
  surfacePressed: '#DFE2F1',
  border: '#D3D7EA',
  text: '#171A2B',
  textMuted: '#4D5371',
  textFaint: '#767C9C',
  primary: '#6D4AFF',
  primaryPressed: '#5533E8',
  onPrimary: '#FFFFFF',
  primarySoft: '#E7E1FF',
  hero: '#6D4AFF',
  heroText: '#FFFFFF',
  heroMuted: '#E7E1FF',
  success: '#0F7F62',
  warning: '#9A5B00',
  danger: '#C8323F',
  overlay: 'rgba(23, 26, 43, 0.4)',
};
const aurora: typeof classic = { light: AURORA, dark: AURORA };

/** The backgrounds offered for the Custom style: light ones, then dark ones. */
export const CUSTOM_GROUNDS = [
  '#FFFFFF', '#F7F3EC', '#F3F2F2', '#EEF4F8', '#F1F7F0', '#FBF0F3', '#F5F0FF', '#FFF8E5',
  '#000000', '#0D0B09', '#121417', '#0F1A24', '#10180F', '#1E1220', '#161826', '#22201C',
];
export const DEFAULT_CUSTOM_GROUND = '#F7F3EC';

/** Whether a background is dark: white reads better on it than black. */
export const isDarkGround = (ground: string): boolean => contrast(ground, '#FFFFFF') > contrast(ground, '#000000');

/**
 * The Custom style's colours, from a background and an accent of the owner's choosing: the text
 * and the surfaces are made from the background, light or dark as it is, and every ink is stepped
 * until it reads on it.
 */
function customColors(groundIn: string, accentIn: string): BaseColors {
  const hex = (v: string | undefined, fallback: string) => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : fallback);
  const ground = hex(groundIn, DEFAULT_CUSTOM_GROUND);
  const accent = hex(accentIn, DEFAULT_COLOR_OPTIONS.customAccent);
  const dark = isDarkGround(ground);
  const text = readableOn(dark ? '#F4F2EE' : '#1A1714', ground, 7);
  const onPrimary = contrast(accent, '#FFFFFF') >= contrast(accent, '#000000') ? '#FFFFFF' : '#000000';
  return {
    background: ground,
    surface: mixHex(ground, text, 0.05),
    surfaceAlt: mixHex(ground, text, 0.1),
    surfacePressed: mixHex(ground, text, 0.16),
    border: mixHex(ground, text, 0.24),
    text,
    textMuted: readableOn(mixHex(text, ground, 0.3), ground),
    textFaint: readableOn(mixHex(text, ground, 0.5), ground, MIN_CONTRAST),
    primary: accent,
    primaryPressed: mixHex(accent, dark ? '#FFFFFF' : '#000000', 0.2),
    onPrimary,
    primarySoft: mixHex(ground, accent, 0.18),
    hero: accent,
    heroText: onPrimary,
    heroMuted: mixHex(onPrimary, accent, 0.3),
    success: readableOn(dark ? '#5FCFA6' : '#2F7D6E', ground),
    warning: readableOn(dark ? '#E7B95A' : '#A86F12', ground),
    danger: readableOn(dark ? '#F08A7A' : '#B8431F', ground),
    overlay: dark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
  };
}

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

export type StyleName = 'classic' | 'modernist' | 'nocturne' | 'neon' | 'matrix' | 'paper' | 'aurora' | 'material' | 'custom';
export const STYLES: StyleName[] = ['classic', 'modernist', 'nocturne', 'neon', 'matrix', 'paper', 'aurora', 'material', 'custom'];
/** The styles a palette can be shown in (the others have their own colours). */
export type PaletteStyle = 'classic' | 'modernist';

/**
 * Styles with their own colours whatever the palette or text setting: Nocturne, Neon and Matrix
 * always dark, Paper and Aurora always light, Custom light or dark as its background is, Material
 * You as the Theme setting says (followsTheme).
 */
export const FIXED_STYLES: StyleName[] = ['nocturne', 'neon', 'matrix', 'paper', 'aurora', 'material', 'custom'];
export const isFixed = (style: StyleName): boolean => FIXED_STYLES.includes(style);
/** Whether the Theme setting (system, light or dark) decides a style's scheme. */
export const followsTheme = (style: StyleName): boolean => !isFixed(style) || style === 'material';

/** Styles that draw their own scene behind the screens (Neon's grid, Matrix's rain, Paper's lines, Aurora's light). */
export const SCENE_STYLES: StyleName[] = ['neon', 'matrix', 'paper', 'aurora'];
export const isScene = (style: StyleName): boolean => SCENE_STYLES.includes(style);

/**
 * Whether a style can be glass: not those with a scene of their own, nor Custom, whose background is
 * its owner's, nor Material You, whose colours are the phone's.
 */
export const takesGlass = (style: StyleName): boolean => !isScene(style) && style !== 'custom' && style !== 'material';

// Custom's and Material You's entries are stand-ins: their colours come from the background and
// accent chosen (customColors), or from the phone (materialColors). Material You shows in Classic's
// where the phone gives none.
export const palettes: Record<StyleName, typeof classic> = { classic, modernist, nocturne, neon, matrix, paper, aurora, material: classic, custom: classic };

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

/**
 * Light or dark: Nocturne, Neon and Matrix are always dark, Paper and Aurora always light, Custom
 * as its background (`ground`) is; otherwise the setting, or the system's.
 */
export function resolveScheme(style: StyleName, theme: ThemePref, system: string | null | undefined, ground = DEFAULT_CUSTOM_GROUND): 'light' | 'dark' {
  if (style === 'custom') return isDarkGround(ground) ? 'dark' : 'light';
  if (style === 'paper' || style === 'aurora') return 'light';
  if (!followsTheme(style)) return 'dark';
  return theme === 'system' ? (system === 'light' ? 'light' : 'dark') : theme;
}

/**
 * The phone's own colours (Android 12 and later, read by modules/erevos-look): five palettes made
 * from the wallpaper, three of accents and two of neutrals, each 13 tones from Android's
 * system_*_0 (white) through _10, _50, _100 … _900 to _1000 (black), as #RRGGBB.
 */
export type ToneName = 'accent1' | 'accent2' | 'accent3' | 'neutral1' | 'neutral2';
export type SystemTones = Record<ToneName, string[]>;
export const TONE_NAMES: ToneName[] = ['accent1', 'accent2', 'accent3', 'neutral1', 'neutral2'];
/** Android's numbers for the 13 tones of each palette, lightest first. */
export const TONE_STEPS = [0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] as const;
type ToneStep = (typeof TONE_STEPS)[number];

/** The phone's colours as they came, checked: null unless every palette has its 13 tones. */
export function checkedTones(value: unknown): SystemTones | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const tones = {} as SystemTones;
  for (const name of TONE_NAMES) {
    const list = v[name];
    if (!Array.isArray(list) || list.length !== TONE_STEPS.length) return null;
    if (!list.every((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))) return null;
    tones[name] = list.map((c: string) => c.toUpperCase());
  }
  return tones;
}

// The phone's colours while a ThemeProvider shows (theme/context.tsx sets them before it renders,
// as it sets the shape tokens below), or null where the phone gives none.
let systemTones: SystemTones | null = null;

export function setSystemTones(tones: SystemTones | null): void {
  systemTones = tones;
}

/**
 * Material You's colours, taken from the five palettes as Android's own apps take them (Material
 * 3's roles): the neutrals for the ground, the cards and the text, the first accent for what is lit,
 * the third for notes that something worked. Two tones 50 steps apart or more read on each other.
 */
export function materialColors(tones: SystemTones, scheme: 'light' | 'dark'): BaseColors {
  const of = (name: ToneName) => (step: ToneStep) => tones[name][TONE_STEPS.indexOf(step)];
  const [accent, third, neutral, variant] = [of('accent1'), of('accent3'), of('neutral1'), of('neutral2')];
  if (scheme === 'light') {
    const background = neutral(50);
    return {
      background,
      surface: neutral(10),
      surfaceAlt: variant(100),
      surfacePressed: mixHex(variant(100), variant(200), 0.4),
      border: variant(200),
      text: neutral(900),
      textMuted: readableOn(variant(700), background),
      textFaint: readableOn(variant(500), background, MIN_CONTRAST),
      primary: accent(600),
      primaryPressed: accent(700),
      onPrimary: accent(0),
      primarySoft: accent(100),
      hero: accent(600),
      heroText: accent(0),
      heroMuted: accent(100),
      success: third(600),
      warning: readableOn('#A86F12', background),
      danger: readableOn('#B3261E', background),
      overlay: 'rgba(0, 0, 0, 0.4)',
    };
  }
  const background = neutral(900);
  return {
    background,
    surface: mixHex(neutral(900), neutral(800), 0.5),
    surfaceAlt: neutral(800),
    surfacePressed: neutral(700),
    border: variant(700),
    text: neutral(100),
    textMuted: readableOn(variant(200), background),
    textFaint: readableOn(variant(400), background, MIN_CONTRAST),
    primary: accent(200),
    primaryPressed: accent(100),
    onPrimary: accent(800),
    primarySoft: accent(700),
    hero: accent(200),
    heroText: accent(800),
    heroMuted: accent(700),
    success: third(200),
    warning: readableOn('#E7B95A', background),
    danger: readableOn('#F2B8B5', background),
    overlay: 'rgba(0, 0, 0, 0.6)',
  };
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
  /** The Custom style's background (#rrggbb). */
  customGround?: string;
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
  // White or the House's dark ink on it, whichever reads better: in the dark the House text is
  // light too, so a light accent (a sky blue) would otherwise take white, at under 3:1.
  const ink = LPHL_PALETTES.house.light.text;
  const onAccent = contrast(accent, '#FFFFFF') >= contrast(accent, ink) ? '#FFFFFF' : ink;
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
function paletteColors(style: StyleName, scheme: 'light' | 'dark', palette: PaletteChoice, customAccent: string): BaseColors {
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
  if (style === 'custom') return done(customColors(opts.customGround ?? DEFAULT_CUSTOM_GROUND, opts.customAccent));
  if (style === 'material') return done(systemTones ? materialColors(systemTones, scheme) : { ...palettes.classic[scheme] });
  if (isFixed(style)) return done({ ...palettes[style].dark });
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
  if (style === 'custom') return /^#[0-9a-fA-F]{6}$/.test(customAccent) ? customAccent.toUpperCase() : DEFAULT_COLOR_OPTIONS.customAccent;
  if (style === 'material') return buildColors(style, scheme, palette).primary;
  if (isFixed(style)) return palettes[style].dark.primary;
  if (palette === 'auto') return palettes[style][scheme].primary;
  if (palette === 'custom') return /^#[0-9a-fA-F]{6}$/.test(customAccent) ? customAccent.toUpperCase() : DEFAULT_COLOR_OPTIONS.customAccent;
  return LPHL_PALETTES[palette][scheme].accent.toUpperCase();
}

/**
 * The accent as small text on a light ground (the site's accent-700, which it uses on its frosted
 * glass): the palette's 700 step; for a style's own colours, its pressed accent.
 */
export function deepAccent(style: StyleName, palette: PaletteChoice, customAccent: string): string {
  if (style === 'custom') return rawAccent(style, 'light', palette, customAccent);
  if (style === 'material') return buildColors(style, 'light', palette).primaryPressed;
  if (isFixed(style)) return palettes[style].dark.primary;
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
    /** The line styles' own inks: the line of fields and outlined boxes, kickers, the chosen chip's label. Null: the colours'. */
    ink: { fieldLine: string; kicker: string; chosen: string } | null;
    /** Neon's and Matrix's light: what is lit (buttons, the chosen chip, our messages, titles) glows in its colour. */
    glow: boolean;
    /** The platform's own family for everything: Matrix's monospace, Paper's serif. Null: the style's fonts. */
    family: 'mono' | 'serif' | null;
    /** The glass look: bars and sheets blur what is behind them where the engine can (components/glass.ts). */
    glass: boolean;
  };
}

const SHAPES: Record<StyleName, Shape> = {
  classic: {
    radius: { sm: 10, md: 14, lg: 20, xl: 28, pill: 999, button: 999, chip: 999 },
    shape: { cardBorder: 1, buttonAlign: 'center', fonts: null, lines: false, type: 'plain', glass: false, ink: null, glow: false, family: null },
  },
  // Flat and architectural: no rounded corners, strong 2px rules, labels flush left even inside buttons.
  modernist: {
    radius: { sm: 0, md: 0, lg: 0, xl: 0, pill: 0, button: 0, chip: 0 },
    shape: { cardBorder: 2, buttonAlign: 'flex-start', fonts: null, lines: false, type: 'plain', glass: false, ink: null, glow: false, family: null },
  },
  // The site's 8 px corners, 6 px on chips; circles stay circles; cards a shade lighter than the ground, with no outline.
  nocturne: {
    radius: { sm: 6, md: 8, lg: 8, xl: 8, pill: 999, button: 8, chip: 6 },
    shape: {
      cardBorder: 0,
      buttonAlign: 'center',
      fonts: null,
      lines: true,
      type: 'nocturne',
      glass: false,
      ink: { fieldLine: NOCTURNE.fieldLine, kicker: NOCTURNE.accentPale, chosen: NOCTURNE.accentPaler },
      glow: false,
      family: null,
    },
  },
  // Cut corners rather than round ones, glowing lines, set in Inter Tight.
  neon: {
    radius: { sm: 4, md: 6, lg: 10, xl: 14, pill: 999, button: 6, chip: 6 },
    shape: {
      cardBorder: 1,
      buttonAlign: 'center',
      fonts: null,
      lines: true,
      type: 'plain',
      glass: false,
      ink: { fieldLine: '#3B3670', kicker: '#FF7BE6', chosen: '#B8F8FF' },
      glow: true,
      family: null,
    },
  },
  // A terminal: square everything, outlined in green, monospace.
  matrix: {
    radius: { sm: 0, md: 0, lg: 0, xl: 0, pill: 0, button: 0, chip: 0 },
    shape: {
      cardBorder: 1,
      buttonAlign: 'flex-start',
      fonts: null,
      lines: true,
      type: 'plain',
      glass: false,
      ink: { fieldLine: '#13702B', kicker: '#4CE077', chosen: '#B6FFC6' },
      glow: true,
      family: 'mono',
    },
  },
  // Ink on paper: slight corners, outlined buttons in the pen's blue, kickers in the margin's red, a serif.
  paper: {
    radius: { sm: 2, md: 4, lg: 6, xl: 10, pill: 999, button: 4, chip: 4 },
    shape: {
      cardBorder: 1,
      buttonAlign: 'center',
      fonts: null,
      lines: true,
      type: 'plain',
      glass: false,
      ink: { fieldLine: '#B9AA8C', kicker: '#B3261E', chosen: '#173D80' },
      glow: false,
      family: 'serif',
    },
  },
  // Soft and round, cards without outlines, in Inter.
  aurora: {
    radius: { sm: 12, md: 16, lg: 24, xl: 32, pill: 999, button: 999, chip: 999 },
    shape: { cardBorder: 0, buttonAlign: 'center', fonts: null, lines: false, type: 'plain', glass: false, ink: null, glow: false, family: null },
  },
  // Material 3's shapes, as in Android's own apps: round buttons, softly rounded cards with no
  // outline, chips a little round, in the phone's own font.
  material: {
    radius: { sm: 8, md: 12, lg: 16, xl: 28, pill: 999, button: 999, chip: 8 },
    shape: { cardBorder: 0, buttonAlign: 'center', fonts: null, lines: false, type: 'plain', glass: false, ink: null, glow: false, family: null },
  },
  // As Classic: the colours are the owner's.
  custom: {
    radius: { sm: 10, md: 14, lg: 20, xl: 28, pill: 999, button: 999, chip: 999 },
    shape: { cardBorder: 1, buttonAlign: 'center', fonts: null, lines: false, type: 'plain', glass: false, ink: null, glow: false, family: null },
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
  if (look === 'glass' && takesGlass(style)) {
    Object.assign(radius, GLASS_RADIUS);
    shape.cardBorder = 1;
    shape.glass = true;
  }
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
