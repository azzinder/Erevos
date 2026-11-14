// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { secureGet, secureSet } from '../lib/secure';
import { isPhotoRef, type PhotoRef } from '../lock/avatar-photos';

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
  /** What lies behind the screens: the style's own, a plain ground, a pattern (components/wallpapers.tsx) or a photo. */
  wallpaper: Wallpaper;
  /** The photo of the 'photo' wallpaper, sealed in its own file (lock/avatar-photos.ts). */
  wallpaperPhoto: PhotoRef | null;
  /** The letters of every text: the style's own, or the phone's, a serif or a monospace instead (theme/colors.ts applyStyle). */
  font: FontChoice;
  /** How large the text of the messages is in a chat (TEXT_SCALE). */
  textSize: TextSize;
}

export type Wallpaper = 'auto' | 'plain' | 'dots' | 'grid' | 'stripes' | 'stars' | 'bokeh' | 'gradient' | 'photo';
export const WALLPAPERS: Wallpaper[] = ['auto', 'plain', 'dots', 'grid', 'stripes', 'stars', 'bokeh', 'gradient', 'photo'];

export type BubbleShape = 'round' | 'square' | 'line';
export const BUBBLE_SHAPES: BubbleShape[] = ['round', 'square', 'line'];

export type FontChoice = 'style' | 'sans' | 'serif' | 'mono';
export const FONT_CHOICES: FontChoice[] = ['style', 'sans', 'serif', 'mono'];

export type TextSize = 'small' | 'normal' | 'large' | 'larger';
export const TEXT_SIZES: TextSize[] = ['small', 'normal', 'large', 'larger'];

/** How much larger than the usual each text size draws the messages' text. */
export const TEXT_SCALE: Record<TextSize, number> = { small: 0.87, normal: 1, large: 1.15, larger: 1.3 };

export const DEFAULT_LOOK: Look = {
  style: 'modernist',
  theme: 'system',
  palette: 'custom',
  customAccent: '#0EA5E9',
  frameText: 'palette',
  frameTextColor: '#FFFFFF',
  prevStyle: 'modernist',
  look: 'glass',
  glassKind: 'cards',
  bubbles: 'square',
  customGround: DEFAULT_CUSTOM_GROUND,
  wallpaper: 'auto',
  wallpaperPhoto: null,
  font: 'sans',
  textSize: 'normal',
};

/** What a field missing from a kept look meant when it was kept: the defaults before 7.0.1, so a
 *  look kept by an older version looks as it did. DEFAULT_LOOK is only for a new one. */
export const KEPT_LOOK: Look = {
  ...DEFAULT_LOOK,
  style: 'classic',
  theme: 'dark',
  palette: 'auto',
  customAccent: '#D9A441',
  prevStyle: 'classic',
  look: 'flat',
  bubbles: 'round',
  font: 'style',
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
    style: pick(STYLES, o.style, KEPT_LOOK.style),
    theme: pick(THEMES, o.theme, KEPT_LOOK.theme),
    palette: pick(PALETTE_CHOICES, o.palette, KEPT_LOOK.palette),
    customAccent: hex(o.customAccent, KEPT_LOOK.customAccent),
    frameText: pick(FRAME_TEXTS, o.frameText, KEPT_LOOK.frameText),
    frameTextColor: hex(o.frameTextColor, KEPT_LOOK.frameTextColor),
    prevStyle: pick(['classic', 'modernist'] as const, o.prevStyle, KEPT_LOOK.prevStyle),
    look: pick(LOOK_NAMES, o.look, KEPT_LOOK.look),
    glassKind: pick(GLASS_KINDS, o.glassKind, KEPT_LOOK.glassKind),
    bubbles: pick(BUBBLE_SHAPES, o.bubbles, KEPT_LOOK.bubbles),
    customGround: hex(o.customGround, KEPT_LOOK.customGround),
    // A photo wallpaper without its photo (as on the password screen's copy) is the style's own.
    wallpaper: o.wallpaper === 'photo' && !isPhotoRef(o.wallpaperPhoto) ? 'auto' : pick(WALLPAPERS, o.wallpaper, KEPT_LOOK.wallpaper),
    wallpaperPhoto: isPhotoRef(o.wallpaperPhoto) ? { id: o.wallpaperPhoto.id, key: o.wallpaperPhoto.key } : null,
    font: pick(FONT_CHOICES, o.font, KEPT_LOOK.font),
    textSize: pick(TEXT_SIZES, o.textSize, KEPT_LOOK.textSize),
  };
}

export async function saveLockScreenLook(look: Look): Promise<void> {
  // The copy is not sealed: a photo wallpaper's key stays in the space, and the password screen
  // shows the style's own.
  const shown = look.wallpaper === 'photo' ? { ...look, wallpaper: 'auto' as const } : look;
  await secureSet(KEY, JSON.stringify({ ...shown, wallpaperPhoto: null }));
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
