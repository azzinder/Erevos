import type { ReactNode } from 'react';
import { KeyboardAvoidingView as PlainKeyboardAvoidingView, ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';

/**
 * In browsers the keyboard library has nothing to do: the browser itself keeps the field being
 * typed in on screen. These stand in for its parts, so the web build does without the library and
 * the animation engine it brings.
 */
export function KeyboardProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export const KeyboardAvoidingView = PlainKeyboardAvoidingView;

export function KeyboardAwareScrollView(props: ScrollViewProps & { bottomOffset?: number }) {
  const rest = { ...props };
  delete rest.bottomOffset;
  return <ScrollView {...rest} />;
}

export function KeyboardPaddedView({ bottom = 0, style, ...props }: ViewProps & { bottom?: number }) {
  return <View style={[style, { paddingBottom: bottom }]} {...props} />;
}
