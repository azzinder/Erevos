/**
 * The keyboard helpers, as in LPHL FASOULI (src/components/keyboard.tsx there): the native library
 * on phones, plain views in browsers (keyboard.web.tsx). Android draws apps edge to edge, so the
 * window no longer shrinks for the keyboard, in a sheet least of all: the library moves the
 * fields above it. Both files end in .tsx: Metro tries every platform variant of one extension
 * before the next.
 */
export { KeyboardAvoidingView, KeyboardAwareScrollView, KeyboardProvider } from 'react-native-keyboard-controller';
