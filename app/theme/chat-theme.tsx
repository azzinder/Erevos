import { useEffect, useState, type ReactNode } from 'react';

import { applyStyle } from './colors';
import { useTheme, ThemeProvider } from './context';
import { ensureStyleFonts, styleFonts } from './fonts';
import type { Look } from './look';

// A chat's own look: inside it, every screen part takes the look given to that chat (Appearance,
// from its details) instead of the space's. Without one, the chat takes the space's look. The
// shape tokens are module-level (theme/colors.ts): a chat's style sets them while it shows, and
// leaving it sets the space's again for the screens under it.
export function ChatTheme({ look, onChange, children }: {
  look: Look | null;
  onChange: (look: Look) => Promise<void> | void;
  children: ReactNode;
}) {
  const outer = useTheme().look;
  const shown = look ?? outer;
  // A style whose fonts are not loaded yet draws in the phone's own until they are.
  const [, loaded] = useState(0);
  useEffect(() => {
    let active = true;
    void ensureStyleFonts(shown.style).then(() => active && loaded((n) => n + 1));
    return () => {
      active = false;
    };
  }, [shown.style]);
  useEffect(() => () => applyStyle(outer.style, styleFonts(outer.style), outer.look), [outer]);
  return (
    <ThemeProvider look={shown} onChange={onChange}>
      {children}
    </ThemeProvider>
  );
}
