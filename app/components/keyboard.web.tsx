import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView as PlainKeyboardAvoidingView,
  ScrollView,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
} from 'react-native';

/**
 * In browsers the keyboard library has nothing to do: the browser itself keeps the field being
 * typed in on screen. These stand in for its parts, so the web build does without the library and
 * the animation engine it brings.
 */
export function KeyboardProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function KeyboardAvoidingView(props: KeyboardAvoidingViewProps & { automaticOffset?: boolean }) {
  const rest = { ...props };
  delete rest.automaticOffset;
  return <PlainKeyboardAvoidingView {...rest} />;
}

export function KeyboardAwareScrollView(props: ScrollViewProps & { bottomOffset?: number }) {
  const rest = { ...props };
  delete rest.bottomOffset;
  return <ScrollView {...rest} />;
}
