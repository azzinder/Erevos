import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { applyStyle, buildColors, resolveScheme, type Colors } from './colors';
import { ensureStyleFonts, styleFonts } from './fonts';
import { changeLook, type Look } from './look';

export interface Theme {
  look: Look;
  colors: Colors;
  scheme: 'light' | 'dark';
  /** Changes the look (theme/look.ts says how), once the fonts of a new style are loaded. */
  setLook: (patch: Partial<Look>) => Promise<void>;
}

const ThemeContext = createContext<Theme | null>(null);

// Gives every screen the colours and shapes of `look`. `onChange` keeps a changed look (the root
// layout saves it in the open space). The shape tokens are module-level (theme/colors.ts), set
// here before anything renders, and every component that reads them takes the theme too, so it
// renders again when they change.
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
  applyStyle(look.style, styleFonts(look.style));

  const theme = useMemo<Theme>(() => {
    const scheme = resolveScheme(look.style, look.theme, system);
    return {
      look,
      scheme,
      colors: buildColors(look.style, scheme, look.palette, look),
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
  }, [look, system, onChange]);

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
