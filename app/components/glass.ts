import { Platform, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/context';
import { CAN_BLUR, GLASS_BLUR, glassLift, glassSide } from '../theme/glass';

// What the glass look (theme/glass.ts) adds to a view, as in LPHL FASOULI (src/components/glass.ts).

/**
 * A CSS gradient as a background: browsers take it as backgroundImage (React Native Web passes it
 * through), phones as experimental_backgroundImage (React Native's own parser: explicit units only).
 */
export function gradientStyle(css: string): ViewStyle {
  return Platform.OS === 'web' ? ({ backgroundImage: css } as unknown as ViewStyle) : { experimental_backgroundImage: css };
}

const BLUR = { backdropFilter: GLASS_BLUR } as unknown as ViewStyle;

/**
 * Under glass, what bars and sheets show through is blurred where the engine can (browsers; not
 * SailfishOS's, nor the phones): elsewhere bars keep their dense glass and sheets turn nearly
 * opaque (colors.popover).
 */
export function useGlassBlur(): ViewStyle | null {
  return useTheme().look.look === 'glass' && CAN_BLUR ? BLUR : null;
}

/** Under glass in panes, a card's lift as on the panel's Home: an inner highlight on its top edge and a soft shadow. */
export function useGlassLift(): ViewStyle | null {
  const { look, scheme } = useTheme();
  return look.look === 'glass' && look.glassKind === 'cards' ? { boxShadow: glassLift(glassSide(scheme)) } : null;
}
