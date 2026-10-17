import type { TextStyle, ViewStyle } from 'react-native';

import { radius, shape, withAlpha, type Colors } from './colors';
import type { BubbleShape } from './look';

// How a chat draws its messages (the look's `bubbles`): round bubbles, square ones, or no bubble
// at all but a line of the accent beside the text, as a log. Ours are filled with the accent and
// theirs with the surface; under the line styles (Nocturne, Neon, Matrix) theirs are outlined too,
// and under Neon and Matrix ours are outlined in the accent and glow.

export interface Bubbles {
  mine: ViewStyle;
  theirs: ViewStyle;
  /** The last of a run from one side: its corner on that side points to it. */
  mineTail: ViewStyle;
  theirsTail: ViewStyle;
  mineText: TextStyle;
  theirsText: TextStyle;
}

export function bubbleStyles(kind: BubbleShape, colors: Colors): Bubbles {
  const glow: ViewStyle | null = shape.glow ? { boxShadow: `0px 0px 12px ${withAlpha(colors.primary, 0.45)}` } : null;
  const outline: ViewStyle | null = shape.lines ? { borderWidth: 1, borderColor: shape.ink?.fieldLine ?? colors.border } : null;
  if (kind === 'line') {
    return {
      mine: { alignSelf: 'flex-end', borderRightWidth: 3, borderColor: colors.primary, borderRadius: 0, paddingRight: 10 },
      theirs: { alignSelf: 'flex-start', borderLeftWidth: 3, borderColor: shape.ink?.kicker ?? colors.textFaint, borderRadius: 0, paddingLeft: 10 },
      mineTail: {},
      theirsTail: {},
      mineText: { color: colors.text, textAlign: 'right' },
      theirsText: { color: colors.text },
    };
  }
  // Square bubbles keep a little rounding unless the style has none (Modernist, Matrix).
  const corner = kind === 'square' ? (radius.sm === 0 ? 0 : 4) : 20;
  const tail = kind === 'square' ? corner : 6;
  return {
    // Under Neon and Matrix ours are lit glass: the accent as a line and a glow around a tinted fill.
    mine: shape.glow
      ? { alignSelf: 'flex-end', backgroundColor: withAlpha(colors.primary, 0.14), borderWidth: 1, borderColor: colors.primary, borderRadius: corner, ...glow }
      : { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: corner },
    theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, borderRadius: corner, ...outline },
    mineTail: { borderBottomRightRadius: tail },
    theirsTail: { borderBottomLeftRadius: tail },
    mineText: { color: shape.glow ? colors.text : colors.onPrimary },
    theirsText: { color: colors.text },
  };
}
