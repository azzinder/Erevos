// The glass look, ported from LPHL FASOULI (src/theme/look.ts there), as on the LPHL site
// (lphl.nekten.eu) and its admin panel: flat or glass. Glass changes the material, in one of two
// kinds: panes (the screens lie on a wallpaper under a light haze and their cards are panes of
// glass over it) or one pane (the screens lie on one frosted pane over the wallpaper and their
// cards are lighter wells in it). Fields are wells, bars and sheets denser glass. Every fill stays
// the palette's; an ink that would read under 4.5:1 (3:1 the faint one) somewhere on its ground
// takes a deeper step, a lighter one at dusk (see withLook). Nocturne draws behind the screens
// too: its glow.
//
// Everything here is plain data and CSS gradient strings; components/backdrop.tsx draws them.
// Gradient strings carry explicit units everywhere (0px, not 0) and no min()/clamp()/calc():
// React Native's own parser (Android) draws nothing for those, without an error.
import {
  contrast,
  deepAccent,
  isFixed,
  isScene,
  mixHex,
  NOCTURNE,
  rawAccent,
  type Colors,
  type PaletteChoice,
  type StyleName,
} from './colors';

export type LookName = 'flat' | 'glass';
export const LOOK_NAMES: LookName[] = ['flat', 'glass'];

/** The glass's two sides: frosted at noon (dark ink), smoked at dusk (light ink). */
export type GlassSide = 'noon' | 'dusk';

/**
 * How the glass lies over the wallpaper: a pane for each card (the panel's
 * Home), or one frosted pane under each screen (the site's sheet).
 */
export type GlassKind = 'cards' | 'sheet';
export const GLASS_KINDS: GlassKind[] = ['cards', 'sheet'];

/** glass.css §1, value for value (the panel's are the same). */
const GLASS = {
  noon: {
    /** The cards: the panel's widgets on its Home (--glass). */
    glass: 'rgba(255, 255, 255, 0.66)',
    /** One pane under the screens' text: the site's sheet (--glass-sheet), denser than the panel's widgets. */
    pane: 'rgba(255, 255, 255, 0.82)',
    strong: 'rgba(255, 255, 255, 0.86)',
    well: 'rgba(255, 255, 255, 0.55)',
    wellStrong: 'rgba(255, 255, 255, 0.82)',
    edge: 'rgba(22, 33, 26, 0.12)',
    hi: 'rgba(255, 255, 255, 0.75)',
    shadow: '0px 12px 30px rgba(22, 33, 26, 0.12)',
    /** The bars' glass over the wallpaper's top, where an opaque color is needed (the site's theme-color). */
    bar: '#FBFCFD',
    /** Pop-overs where nothing blurs what lies under them: nearly opaque (the site's --glass-solid). */
    solid: 'rgba(255, 255, 255, 0.97)',
    /**
     * The app's own, for panes: a haze over the whole wallpaper, as the glass that the site and
     * the panel blur would show it, light enough to keep it in view. The screens' text lies on
     * it straight, so withLook steps each ink that would not read on it toward the text.
     */
    haze: 'rgba(255, 255, 255, 0.4)',
  },
  dusk: {
    glass: 'rgba(10, 16, 18, 0.74)',
    pane: 'rgba(10, 16, 18, 0.8)',
    strong: 'rgba(10, 16, 18, 0.84)',
    well: 'rgba(255, 255, 255, 0.07)',
    wellStrong: 'rgba(255, 255, 255, 0.13)',
    edge: 'rgba(255, 255, 255, 0.16)',
    hi: 'rgba(255, 255, 255, 0.1)',
    shadow: '0px 14px 36px rgba(0, 0, 0, 0.3)',
    bar: '#0A1013',
    solid: 'rgba(12, 18, 21, 0.97)',
    haze: 'rgba(10, 16, 18, 0.45)',
  },
} as const;

/** The blur behind bars and sheets, where the platform draws one (browsers). */
export const GLASS_BLUR = 'blur(30px) saturate(160%)';

/**
 * Whether the engine blurs what lies behind (backdrop-filter, as the site's
 * @supports): browsers do; SailfishOS's Gecko 91 and the phones don't.
 */
export const CAN_BLUR =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));

/** What the look depends on. */
export interface LookContext {
  look: LookName;
  style: StyleName;
  scheme: 'light' | 'dark';
  palette: PaletteChoice;
  customAccent: string;
  /** The glass's kind (panes unless given). */
  glassKind?: GlassKind;
  /** Whether the engine blurs behind bars and sheets (CAN_BLUR unless given). */
  blur?: boolean;
}

/** The glass's side: by the ink (the site's data-lphl-ink), which is light exactly when the scheme is dark. */
export function glassSide(scheme: 'light' | 'dark'): GlassSide {
  return scheme === 'dark' ? 'dusk' : 'noon';
}

/** A see-through #rrggbb color mixed into another see-through one, as CSS color-mix in sRGB does. */
function mixOver(ink: string, share: number, rgba: string): string {
  const m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(rgba);
  if (!m) return rgba;
  const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const n = parseInt(ink.slice(1, 7), 16);
  const ic = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const alpha = share + (1 - share) * a;
  const ch = (i: number, c: number) => Math.round((share * ic[i] + (1 - share) * a * c) / alpha);
  return `rgba(${ch(0, r)}, ${ch(1, g)}, ${ch(2, b)}, ${Math.round(alpha * 1000) / 1000})`;
}

type RGB = [number, number, number];
const rgbOf = (hex: string): RGB => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbaCss = ([r, g, b]: RGB, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

const over = (top: RGB, alpha: number, under: RGB): RGB => [0, 1, 2].map((i) => alpha * top[i] + (1 - alpha) * under[i]) as RGB;
const rgbaParts = (color: string): { rgb: RGB; alpha: number } => {
  const m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(color)!;
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: Number(m[4]) };
};
const hexOf = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** A tint an ink is also drawn on: a color (the ink's own unless given) at an alpha over the ground. */
interface Tint {
  color?: string;
  alpha: number;
}

/**
 * A color mixed toward another, 2% at a time, until it reads at `ratio` on
 * `ground` (#rrggbb), and on its tint over the ground when it has one.
 */
function legible(color: string, toward: string, ground: string, ratio: number, tint?: Tint): string {
  const reads = (c: string) =>
    contrast(c, ground) >= ratio && (!tint || contrast(c, hexOf(over(rgbOf(tint.color ?? c), tint.alpha, rgbOf(ground)))) >= ratio);
  let c = color;
  for (let i = 1; i <= 50 && !reads(c); i++) c = mixHex(color, toward, i * 0.02);
  return c;
}

/**
 * What each kind of glass makes of the cards, the fields (and tracks) and a
 * pressed card, `ink` (the text, or black or white bounding it) tinting them
 * where a well alone would not show.
 */
function material(kind: GlassKind, side: GlassSide, ink: string): { card: string; field: string; pressed: string } {
  const g = GLASS[side];
  const noon = side === 'noon';
  if (kind === 'sheet') {
    // Cards are wells in the pane. Fields: at noon a brighter well would vanish on the white pane,
    // so the ink tints the well instead (5%); at dusk the brighter well shows. Pressed: the panel's
    // hover, the ink into the cards' well: 9% at noon, to stand out from the tinted fields; 4% at
    // dusk, between a card and a field (a field darkens a little when pressed, a card brightens),
    // since every white layer more pales the inks that must read on it.
    return { card: g.well, field: noon ? mixOver(ink, 0.05, g.well) : g.wellStrong, pressed: mixOver(ink, noon ? 0.09 : 0.04, g.well) };
  }
  // Cards are panes of glass. Fields: at noon a brighter well would vanish on the white glass and
  // the pale sky, so the ink tints it instead (8%); at dusk the well shows, as the panel's fields.
  // Pressed: the panel's hover, the ink into the cards' glass: 12% at noon, to stand out from the
  // tinted fields; 10% at dusk, a shade brighter than a card that stays smoked.
  return { card: g.glass, field: noon ? mixOver(ink, 0.08, g.well) : g.well, pressed: mixOver(ink, noon ? 0.12 : 0.1, g.glass) };
}

/**
 * The colors with the look applied. Flat changes nothing (Nocturne only lets
 * its glow show through the screens). Glass makes the screens' ground clear,
 * the cards panes of glass (panes) or wells in the one pane (one pane),
 * fields and tracks wells, bars and sheets denser glass, and gives small
 * accent text the step the site uses on its glass (deeper on the frosted
 * side, the palette's own bright accent on the smoked one). The screens' text
 * lies on the hazed wallpaper or on the pane straight (titles, a list's
 * labels, a form's fields), so each ink that would read under 4.5:1 on its
 * hardest point (inkGround: in a field for the inks fields hold, the text and
 * the muted and faint ones; 3:1 for the faint one, hints and placeholders;
 * on its tint too for a danger button's label and the chosen chip's) moves
 * toward the text, 2% at a time, until it reads: the muted and the colored
 * inks get deeper at noon, lighter at dusk.
 */
export function withLook(c: Colors, ctx: LookContext): Colors {
  // Nocturne's glow, and the scenes of Neon and Matrix (which take no glass), show through the screens.
  if (ctx.look !== 'glass' || isScene(ctx.style)) return isFixed(ctx.style) ? { ...c, ground: 'transparent' } : c;
  const side = glassSide(ctx.scheme);
  const g = GLASS[side];
  const kind = ctx.glassKind ?? 'cards';
  const accent = rawAccent(ctx.style, ctx.scheme, ctx.palette, ctx.customAccent);
  const [wallGround, fieldGround] = [inkGround(side, accent, false, kind), inkGround(side, accent, true, kind)];
  const text = legible(c.text, side === 'noon' ? '#000000' : '#FFFFFF', fieldGround, 4.5);
  const ink = (color: string, ratio = 4.5, ground = wallGround, tint?: Tint) => legible(color, text, ground, ratio, tint);
  const m = material(kind, side, text);
  return {
    ...c,
    ground: 'transparent',
    background: g.bar,
    surface: m.card,
    surfaceAlt: m.field,
    surfacePressed: m.pressed,
    border: g.edge,
    sheet: g.strong,
    // Sheets and dialogs lie over the screen's text: where nothing blurs it, as the site's menus.
    popover: (ctx.blur ?? CAN_BLUR) ? g.strong : g.solid,
    text,
    textMuted: ink(c.textMuted, 4.5, fieldGround),
    textFaint: ink(c.textFaint, 3, fieldGround),
    success: ink(c.success),
    warning: ink(c.warning),
    // Errors, and a danger button's label on its own tint (0.12 at rest).
    danger: ink(c.danger, 4.5, wallGround, { alpha: 0.12 }),
    // Also the chosen chip's label, on the accent's 14% tint.
    accentText: ink(
      side === 'noon' ? deepAccent(ctx.style, ctx.palette, ctx.customAccent) : rawAccent(ctx.style, 'dark', ctx.palette, ctx.customAccent),
      4.5,
      wallGround,
      { color: c.primary, alpha: 0.14 },
    ),
  };
}

/** The haze over the wallpaper under panes, and a card's lift there: the panel's inner highlight and soft shadow. */
export function glassHaze(side: GlassSide): string {
  return GLASS[side].haze;
}
export function glassLift(side: GlassSide): string {
  return `inset 0px 1px 0px ${GLASS[side].hi}, ${GLASS[side].shadow}`;
}

/** The glass's tokens for the one pane the screens lie on. */
export function glassPane(side: GlassSide): { fill: string; edge: string; hi: string; shadow: string } {
  const g = GLASS[side];
  return { fill: g.pane, edge: g.edge, hi: g.hi, shadow: g.shadow };
}

/** Where the one pane lies: inset 8 px on a phone, a centred column on a wide window (the site's sheet). */
export const PANE_WIDE_FROM = 840;
export const PANE_WIDTH = 792;
export function paneFrame(width: number): { left: number; width: number; radius: number } {
  if (width < PANE_WIDE_FROM) return { left: 8, width: width - 16, radius: 22 };
  return { left: Math.round((width - PANE_WIDTH) / 2), width: PANE_WIDTH, radius: 28 };
}

/** A glow of the wallpaper: an ellipse rx% by ry% of the screen at (x%, y%), from `alpha` to clear at `fade`% of the way out. */
interface Glow {
  rx: number;
  ry: number;
  x: number;
  y: number;
  rgb: RGB;
  alpha: number;
  fade: number;
}

/** The wallpaper as data (glass.css --wall): the sky's stops top to bottom, its glows, the water lines. */
interface Wall {
  sky: [string, number][];
  glows: Glow[];
  lines: { rgb: RGB; alpha: number };
}

/** The site's backdrop filter on its glass, blur(30px) saturate(160%): its saturation. */
const FROST_SATURATE = 1.6;

/** CSS saturate() (the Filter Effects matrix, in sRGB), clamped. */
function saturate([r, g, b]: RGB, s: number): RGB {
  const ch = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  return [
    ch((0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b),
    ch((0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b),
    ch((0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b),
  ];
}

/** The wallpaper, plain or frosted as the one pane shows it (see frostedWall). */
function wall(side: GlassSide, accent: string, frost = false): Wall {
  const f = (c: RGB): RGB => (frost ? saturate(c, FROST_SATURATE) : c);
  const hex = (color: string) => (frost ? hexOf(f(rgbOf(color))) : color);
  if (side === 'noon') {
    // Frosted, the blur spreads the horizon's edge over about 9% of a screen's height.
    const [shore, sea] = frost ? [56, 65] : [59, 62];
    return {
      sky: [
        [hex('#DFE8EE'), 0],
        [hex('#E9EEF0'), 40],
        [hex(mixHex('#EEF0EA', accent, 0.18)), shore],
        [hex('#B9CFD6'), sea],
        [hex('#A7C0C8'), 82],
        [hex('#96B2BB'), 100],
      ],
      glows: [
        { rx: 34, ry: 28, x: 16, y: 12, rgb: f([255, 255, 255]), alpha: 0.75, fade: 70 },
        { rx: 60, ry: 18, x: 50, y: 61, rgb: f(rgbOf(accent)), alpha: 0.28, fade: 72 },
      ],
      lines: { rgb: [22, 60, 80], alpha: 0.06 },
    };
  }
  const [shore, sea] = frost ? [55, 65] : [58, 62];
  return {
    sky: [
      [hex('#0A0E18'), 0],
      [hex('#151B2B'), 34],
      [hex(mixHex('#1D2130', accent, 0.18)), shore],
      [hex('#0E1B20'), sea],
      [hex('#081114'), 80],
      [hex('#050A0C'), 100],
    ],
    glows: [
      { rx: 30, ry: 26, x: 84, y: 14, rgb: f([120, 150, 210]), alpha: 0.22, fade: 70 },
      { rx: 62, ry: 16, x: 50, y: 61, rgb: f(rgbOf(accent)), alpha: 0.45, fade: 72 },
    ],
    lines: { rgb: [255, 255, 255], alpha: 0.045 },
  };
}

/** The water lines cover the lowest 38% of the wallpaper. */
const WATER_FROM = 62;

/** A wallpaper's layers back to front: the sky, then its glows. */
function layersOf(w: Wall): string[] {
  return [
    `linear-gradient(to bottom, ${w.sky.map(([color, at]) => `${color} ${at}%`).join(', ')})`,
    ...w.glows.map(
      (o) => `radial-gradient(ellipse ${o.rx}% ${o.ry}% at ${o.x}% ${o.y}%, ${rgbaCss(o.rgb, o.alpha)} 0%, ${rgbaCss(o.rgb, 0)} ${o.fade}%)`,
    ),
  ];
}

/**
 * The glass's wallpaper (glass.css --wall), back to front: the sky, its pale
 * glow (white at noon, blue at dusk) and the accent's glow on the horizon,
 * then the water lines in the lowest 38%. The accent is the palette's own
 * (rawAccent), as the site's --color-accent; color-mix(in srgb) is mixHex.
 */
export function wallLayers(side: GlassSide, accent: string): { base: string; layers: string[]; lines: string } {
  const w = wall(side, accent);
  return { base: w.sky[0][0], layers: layersOf(w), lines: rgbaCss(w.lines.rgb, w.lines.alpha) };
}

/**
 * The wallpaper as the one pane shows it, under its glass: the site blurs and
 * saturates what lies behind its sheet (blur(30px) saturate(160%)), which
 * phones and SailfishOS cannot, so it is drawn ahead, the same everywhere:
 * every color 1.6 times as vivid (the filter is linear, so each layer may
 * take it alone), the horizon softened and the water lines blurred away.
 */
export function frostedWall(side: GlassSide, accent: string): { base: string; layers: string[] } {
  const w = wall(side, accent, true);
  return { base: w.sky[0][0], layers: layersOf(w) };
}

/** The sky's color at y% (its stops are opaque: a plain mix between the two around it). */
function skyAt(sky: [string, number][], y: number): RGB {
  for (let i = 1; i < sky.length; i++) {
    const [top, from] = sky[i - 1];
    const [bottom, to] = sky[i];
    if (y <= to) {
      const t = to === from ? 1 : Math.min(1, Math.max(0, (y - from) / (to - from)));
      const [a, b] = [rgbOf(top), rgbOf(bottom)];
      return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t) as RGB;
    }
  }
  return rgbOf(sky[sky.length - 1][0]);
}

const grounds = new Map<string, string>();

/**
 * Where small text is hardest to read under glass, as #rrggbb: the darkest
 * point at noon (dark ink), the brightest at dusk (light ink), among what may
 * lie under it: the screen's ground (the wallpaper under its haze, for panes;
 * the one pane over the frosted wallpaper), a card on it, a pressed row on
 * either, and the chosen segment, a card in a field ('text'); those and a
 * field, on the ground or on a card ('field'); or a card at rest ('card').
 * Black or white stands in for the ink that tints fields and pressed rows
 * (the text's own lies between). Sampled every half percent down the columns
 * through the glows' centres and the edges, water lines included where they
 * show.
 */
function hardest(side: GlassSide, accent: string, kind: GlassKind, on: 'text' | 'field' | 'card'): string {
  const key = `${side}${accent}${kind}${on}`;
  const known = grounds.get(key);
  if (known) return known;
  const sheet = kind === 'sheet';
  const w = wall(side, accent, sheet);
  const veil = rgbaParts(sheet ? GLASS[side].pane : GLASS[side].haze);
  const m = material(kind, side, side === 'noon' ? '#000000' : '#FFFFFF');
  const [card, field, pressed] = [m.card, m.field, m.pressed].map(rgbaParts);
  const lay = (top: { rgb: RGB; alpha: number }, under: RGB) => over(top.rgb, top.alpha, under);
  let pick = '';
  let best = side === 'noon' ? Infinity : -Infinity;
  for (const x of [0, 16, 50, 84, 100]) {
    for (let y = 0; y <= 100; y += 0.5) {
      let c = skyAt(w.sky, y);
      for (const o of w.glows) {
        const t = Math.hypot((x - o.x) / o.rx, (y - o.y) / o.ry) / (o.fade / 100);
        if (t < 1) c = over(o.rgb, o.alpha * (1 - t), c);
      }
      if (!sheet && y >= WATER_FROM) c = over(w.lines.rgb, w.lines.alpha, c);
      const ground = lay(veil, c);
      const onCard = lay(card, ground);
      const candidates =
        on === 'card'
          ? [onCard]
          : [
              ground,
              onCard,
              // Pressed: a row on the ground, or in a card.
              lay(pressed, ground),
              lay(pressed, onCard),
              // The chosen segment: a card in a field (Segmented), whose label takes the colored inks.
              lay(card, lay(field, ground)),
              ...(on === 'field' ? [lay(field, ground), lay(field, onCard)] : []),
            ];
      for (const candidate of candidates) {
        const hex = hexOf(candidate);
        const lum = contrast(hex, '#000000');
        if (side === 'noon' ? lum < best : lum > best) [best, pick] = [lum, hex];
      }
    }
  }
  grounds.set(key, pick);
  return pick;
}

/** Where an ink is hardest to read under glass (see hardest), in a field when `inField`. */
export function inkGround(side: GlassSide, accent: string, inField = false, kind: GlassKind = 'cards'): string {
  return hardest(side, accent, kind, inField ? 'field' : 'text');
}

/** A card at rest under glass where small text on it is hardest to read (see hardest). */
export function cardGround(side: GlassSide, accent: string, kind: GlassKind = 'cards'): string {
  return hardest(side, accent, kind, 'card');
}

/**
 * Nocturne's glow from the top-left corner (nocturne.css §1): an ellipse of
 * min(840px, 66vw) by clamp(230px, 28vw, 360px), from the wash to the ground.
 * Opaque stops: the wash fading to the ground over the ground is exactly that.
 */
export function glowLayer(width: number): string {
  const rx = Math.round(Math.min(840, 0.66 * width));
  const ry = Math.round(Math.min(360, Math.max(230, 0.28 * width)));
  return `radial-gradient(ellipse ${rx}px ${ry}px at 0px 0px, ${NOCTURNE.wash} 0%, #161826 100%)`;
}

/**
 * What is drawn behind every screen: nothing, Nocturne's glow, Neon's grid, Matrix's rain, or the
 * glass's wallpaper (with its haze or its pane).
 */
export type BackdropKind = 'glow' | 'wall' | 'grid' | 'rain' | null;
export function backdropKind(style: StyleName, look: LookName): BackdropKind {
  if (style === 'neon') return 'grid';
  if (style === 'matrix') return 'rain';
  if (look === 'glass') return 'wall';
  return style === 'nocturne' ? 'glow' : null;
}

/** The bars' opaque color for a side (headers on the web's address bar, theme-color). */
export function barColor(side: GlassSide): string {
  return GLASS[side].bar;
}
