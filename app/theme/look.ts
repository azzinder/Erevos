import { secureGet, secureSet } from '../lib/secure';

import { DEFAULT_CUSTOM_GROUND, FRAME_TEXTS, isFixed, PALETTE_CHOICES, STYLES, THEMES, type FrameText, type PaletteChoice, type PaletteStyle, type StyleName, type ThemePref } from './colors';
import { GLASS_KINDS, LOOK_NAMES, type GlassKind, type LookName } from './glass';

// How the app looks: what the Appearance screen sets. Each space keeps its own, sealed with its
// data (lock/space-data.ts), and a second space starts with the look of the space it was set in,
// so the two look alike. The password screen comes before any space is open, so it shows a copy
// of the look last used, kept in the keystore as in LPHL FASOULI (src/lock/look.ts there). The
// copy holds nothing but the look.

export interface Look {
  style: StyleName;
  theme: ThemePref;
  palette: PaletteChoice;
  customAccent: string;
  frameText: FrameText;
  frameTextColor: string;
  /** Under Nocturne: the style it was chosen over, which palettes are shown in and go back to. */
  prevStyle: PaletteStyle;
  /** Flat, or glass as on the LPHL site (glass.ts), in panes or one pane. */
  look: LookName;
  glassKind: GlassKind;
  /** How messages are drawn in a chat: round bubbles, square ones, or a line beside the text. */
  bubbles: BubbleShape;
  /** The Custom style's background; its accent is customAccent. */
  customGround: string;
  /** What lies behind the screens: the style's own, a plain ground, or a pattern (components/wallpapers.tsx). */
  wallpaper: Wallpaper;
}

export type Wallpaper = 'auto' | 'plain' | 'dots' | 'grid' | 'stripes' | 'stars' | 'bokeh' | 'gradient';
export const WALLPAPERS: Wallpaper[] = ['auto', 'plain', 'dots', 'grid', 'stripes', 'stars', 'bokeh', 'gradient'];

export type BubbleShape = 'round' | 'square' | 'line';
export const BUBBLE_SHAPES: BubbleShape[] = ['round', 'square', 'line'];

export const DEFAULT_LOOK: Look = {
  style: 'classic',
  theme: 'dark',
  palette: 'auto',
  customAccent: '#D9A441',
  frameText: 'palette',
  frameTextColor: '#FFFFFF',
  prevStyle: 'classic',
  look: 'flat',
  glassKind: 'cards',
  bubbles: 'round',
  customGround: DEFAULT_CUSTOM_GROUND,
  wallpaper: 'auto',
};

const KEY = 'erevos.look';
const HEX = /^#[0-9a-fA-F]{6}$/;

/** A kept look, checked: anything this version does not know (written by a newer one, or damaged) takes the default. */
export function checkedLook(value: unknown): Look {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_LOOK };
  const o = value as Record<string, unknown>;
  const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => list.find((x) => x === v) ?? fallback;
  const hex = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : fallback);
  return {
    style: pick(STYLES, o.style, DEFAULT_LOOK.style),
    theme: pick(THEMES, o.theme, DEFAULT_LOOK.theme),
    palette: pick(PALETTE_CHOICES, o.palette, DEFAULT_LOOK.palette),
    customAccent: hex(o.customAccent, DEFAULT_LOOK.customAccent),
    frameText: pick(FRAME_TEXTS, o.frameText, DEFAULT_LOOK.frameText),
    frameTextColor: hex(o.frameTextColor, DEFAULT_LOOK.frameTextColor),
    prevStyle: pick(['classic', 'modernist'] as const, o.prevStyle, DEFAULT_LOOK.prevStyle),
    look: pick(LOOK_NAMES, o.look, DEFAULT_LOOK.look),
    glassKind: pick(GLASS_KINDS, o.glassKind, DEFAULT_LOOK.glassKind),
    bubbles: pick(BUBBLE_SHAPES, o.bubbles, DEFAULT_LOOK.bubbles),
    customGround: hex(o.customGround, DEFAULT_LOOK.customGround),
    wallpaper: pick(WALLPAPERS, o.wallpaper, DEFAULT_LOOK.wallpaper),
  };
}

export async function saveLockScreenLook(look: Look): Promise<void> {
  await secureSet(KEY, JSON.stringify(look));
}

export async function loadLockScreenLook(): Promise<Look> {
  try {
    return checkedLook(JSON.parse((await secureGet(KEY)) ?? ''));
  } catch {
    return { ...DEFAULT_LOOK };
  }
}

/**
 * A change to the look as the Appearance screen asks for it: choosing a style with its own colours (Nocturne, Neon, Matrix) remembers the
 * style it was chosen over, and leaving it for a palette goes back to that style.
 */
export function changeLook(look: Look, patch: Partial<Look>): Look {
  const next = { ...look, ...patch };
  if (patch.style && isFixed(patch.style) && !isFixed(look.style) && !patch.prevStyle) next.prevStyle = look.style as PaletteStyle;
  return next;
}
