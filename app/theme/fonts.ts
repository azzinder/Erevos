import { InterTight_400Regular } from '@expo-google-fonts/inter-tight/400Regular';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { loadAsync, type FontSource } from 'expo-font';

import type { Fonts, StyleName } from './colors';

// The styles' own fonts, as in LPHL FASOULI (src/lib/style-fonts.ts there). Modernist is set in
// Inter Tight, which has Greek letters (FASOULI uses Archivo for English, which has none, and
// chats mix both). Nocturne is set in Inter, as on the LPHL site: medium (500) for what other
// styles set bold. Each loads only when its style is in use, and the app waits for it before
// switching (theme/context.tsx), so no screen shows in a style without its font. Classic keeps
// the system font, and Matrix the platform's monospace (shape.mono), so neither loads anything.

const TIGHT = {
  fonts: { regular: 'InterTight_400Regular', semibold: 'InterTight_600SemiBold', bold: 'InterTight_800ExtraBold' },
  sources: { InterTight_400Regular, InterTight_600SemiBold, InterTight_800ExtraBold },
};

const FACES: Record<Exclude<StyleName, 'classic' | 'matrix'>, { fonts: Fonts; sources: Record<string, FontSource> }> = {
  modernist: TIGHT,
  // Neon's narrow letters, as on a sign.
  neon: TIGHT,
  nocturne: {
    fonts: { regular: 'Inter_400Regular', semibold: 'Inter_600SemiBold', bold: 'Inter_500Medium' },
    sources: { Inter_400Regular, Inter_500Medium, Inter_600SemiBold },
  },
};

const ready = new Set<StyleName>();
const loading = new Map<StyleName, Promise<void>>();

/** Loads the fonts a style needs (once); never rejects. If they fail, the style shows in the system font. */
export function ensureStyleFonts(style: StyleName): Promise<void> {
  if (style === 'classic' || style === 'matrix') return Promise.resolve();
  let p = loading.get(style);
  if (!p) {
    p = loadAsync(FACES[style].sources).then(
      () => {
        ready.add(style);
      },
      () => undefined,
    );
    loading.set(style, p);
  }
  return p;
}

/** A style's fonts for the shape tokens (applyStyle): null until they are loaded, as an unknown name would show every text in the regular weight. */
export function styleFonts(style: StyleName): Fonts | null {
  return style !== 'classic' && style !== 'matrix' && ready.has(style) ? FACES[style].fonts : null;
}
