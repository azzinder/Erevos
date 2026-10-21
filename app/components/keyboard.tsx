import type { ViewProps } from 'react-native';
import { KeyboardController, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
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
 * A screen that reaches the bottom of the window, and ends above the keyboard while it is open. It
 * reads only the keyboard's height, as FASOULI's KeyboardStickyView bar does, so the header above
 * the screen changes nothing. The avoiding view works out where it sits instead, and under a header
 * that left the chat's message field behind the keyboard on the Pixel.
 *
 * `bottom` pads a screen whose foot is a field or a bar (a chat) while the keyboard is closed: it
 * clears the navigation bar then, and sits on the keyboard once it opens. `inset` is the room a
 * screen keeps at its foot by itself (a list padded at its end by the navigation bar, a button
 * floating above it): the keyboard covers the navigation bar, so that screen ends `inset` lower,
 * and its list ends, and its buttons float, just above the keyboard. The screen shrinks by its
 * margin rather than its padding, as a padding does not move what is placed absolutely in it.
 */
export function KeyboardPaddedView({ bottom = 0, inset = 0, style, ...props }: ViewProps & { bottom?: number; inset?: number }) {
  const { height } = useReanimatedKeyboardAnimation();
  const margin = useAnimatedStyle(() => ({ marginBottom: Math.max(-height.value - inset - bottom, 0) }), [bottom, inset]);
  return <Reanimated.View style={[style, { paddingBottom: bottom }, margin]} {...props} />;
}

/**
 * Closes the keyboard, and resolves once it is down (at once if it was closed), when what sat on it
 * has moved down too. A keyboard that never says it went (a hardware one, say) is waited for half a
 * second at most.
 */
export function dismissKeyboard(): Promise<void> {
  return Promise.race([KeyboardController.dismiss(), new Promise<void>((done) => setTimeout(done, 500))]);
}
