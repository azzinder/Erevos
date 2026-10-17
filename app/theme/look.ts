import { secureGet, secureSet } from '../lib/secure';

import { FRAME_TEXTS, PALETTE_CHOICES, STYLES, THEMES, type FrameText, type PaletteChoice, type PaletteStyle, type StyleName, type ThemePref } from './colors';

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
}

export const DEFAULT_LOOK: Look = {
  style: 'classic',
  theme: 'dark',
  palette: 'auto',
  customAccent: '#D9A441',
  frameText: 'palette',
  frameTextColor: '#FFFFFF',
  prevStyle: 'classic',
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
 * A change to the look as the Appearance screen asks for it: choosing Nocturne remembers the
 * style it was chosen over, and leaving it for a palette goes back to that style.
 */
export function changeLook(look: Look, patch: Partial<Look>): Look {
  const next = { ...look, ...patch };
  if (patch.style === 'nocturne' && look.style !== 'nocturne' && !patch.prevStyle) next.prevStyle = look.style;
  return next;
}
