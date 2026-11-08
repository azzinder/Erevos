// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { phoneTones } from '../modules/erevos-look';

import { applyStyle, buildColors, resolveScheme, setSystemTones, type Colors, type SystemTones } from './colors';
import { ensureStyleFonts, styleFonts } from './fonts';
import { withLook } from './glass';
import { changeLook, type Look } from './look';

export interface Theme {
  look: Look;
  colors: Colors;
  scheme: 'light' | 'dark';
  /** Changes the look (theme/look.ts says how), once the fonts of a new style are loaded. */
  setLook: (patch: Partial<Look>) => Promise<void>;
}

const ThemeContext = createContext<Theme | null>(null);

// The phone's own colours (Material You), read again whenever Erevos comes back to the screen, as
// a new wallpaper may have changed them.
function usePhoneTones(): SystemTones | null {
  const [tones, setTones] = useState(phoneTones);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const next = phoneTones();
      setTones((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
    });
    return () => subscription.remove();
  }, []);
  return tones;
}

// Gives every screen the colours and shapes of `look`. `onChange` keeps a changed look (the root
// layout saves it in the open space). The shape tokens and the phone's colours are module-level
// (theme/colors.ts), set here before anything renders, and every component that reads them takes
// the theme too, so it renders again when they change.
export function ThemeProvider({ look, onChange, children }: {
  look: Look;
  onChange: (look: Look) => Promise<void> | void;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const current = useRef(look);
  current.current = look;
  // The last style asked for: one asked for while the fonts of another load wins.
  const asked = useRef(0);
  const tones = usePhoneTones();
  setSystemTones(tones);
  applyStyle(look.style, styleFonts(look.style), look.look, look.font);

  const theme = useMemo<Theme>(() => {
    const scheme = resolveScheme(look.style, look.theme, system, look.customGround);
    return {
      look,
      scheme,
      colors: withLook(buildColors(look.style, scheme, look.palette, look), {
        look: look.look,
        glassKind: look.glassKind,
        style: look.style,
        scheme,
        palette: look.palette,
        customAccent: look.customAccent,
        wallpaper: look.wallpaper,
      }),
      setLook: async (patch) => {
        if (patch.style) {
          const n = ++asked.current;
          await ensureStyleFonts(patch.style);
          if (n !== asked.current) {
            const { style: _style, prevStyle: _prev, ...rest } = patch;
            if (!Object.keys(rest).length) return;
            patch = rest;
          }
        }
        const next = changeLook(current.current, patch);
        current.current = next;
        await onChange(next);
      },
    };
  }, [look, system, onChange, tones]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme outside ThemeProvider');
  return theme;
}

export function useColors(): Colors {
  return useTheme().colors;
}

/**
 * A screen's styles made from the colours (and the shape tokens), made again when they change.
 * `make` is a module-level function returning StyleSheet.create(…), so it never changes.
 */
export function useStyles<T>(make: (colors: Colors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => make(colors), [colors, make]);
}
