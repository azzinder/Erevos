import type { ViewProps } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';

/**
 * The keyboard helpers, as in LPHL FASOULI (src/components/keyboard.tsx there): the native library
 * on phones, plain views in browsers (keyboard.web.tsx). Android draws apps edge to edge, so the
 * window no longer shrinks for the keyboard, in a sheet least of all: the library moves the
 * fields above it. Both files end in .tsx: Metro tries every platform variant of one extension
 * before the next.
 */
export { KeyboardAvoidingView, KeyboardAwareScrollView, KeyboardProvider } from 'react-native-keyboard-controller';

/**
 * A screen that reaches the bottom of the window, padded at the bottom by the keyboard's height
 * while the keyboard is open and by `bottom` while it is closed. It reads only the keyboard's
 * height, as FASOULI's KeyboardStickyView bar does, so the header above the screen changes nothing.
 * The avoiding view works out where it sits instead, and under a header that left the chat's
 * message field behind the keyboard on the Pixel.
 */
export function KeyboardPaddedView({ bottom = 0, style, ...props }: ViewProps & { bottom?: number }) {
  const { height } = useReanimatedKeyboardAnimation();
  const padding = useAnimatedStyle(() => ({ paddingBottom: Math.max(-height.value, bottom) }), [bottom]);
  return <Reanimated.View style={[style, padding]} {...props} />;
}
