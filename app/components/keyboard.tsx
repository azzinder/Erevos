// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect } from 'react';
import { AppState, Keyboard, type ViewProps } from 'react-native';
import { KeyboardController, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Reanimated, { makeMutable, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { device } from '../modules/erevos-device';

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
  useEffect(watchKeyboard, []);
  // The keyboard moves: the screen follows the library's height again, and once that height has
  // been still a while, Android is asked whether a keyboard is there at all.
  useAnimatedReaction(
    () => height.value,
    (now, before) => {
      if (before === null || now === before) return;
      keyboardDown.value = false;
      scheduleOnRN(settle);
    },
  );
  const margin = useAnimatedStyle(
    () => ({ marginBottom: keyboardDown.value ? 0 : Math.max(-height.value - inset - bottom, 0) }),
    [bottom, inset],
  );
  return <Reanimated.View style={[style, { paddingBottom: bottom }, margin]} {...props} />;
}

/**
 * Whether Android itself has said for a while that the keyboard is down. The library can keep the
 * height of a keyboard that went without its animation, as when Erevos comes back from another app
 * that had one open: the home screen's buttons then floated where its top had been, over the chats
 * (on the Pixel, 4.0.0-rc.2). It can also be left with part of a keyboard's height, when its
 * animation was cut off, or be told of a keyboard again when a field takes the focus with none open:
 * the home screen's list then ended a hand above the bottom (on the Pixel, 4.0.0-rc.5). So every
 * time the library's height has been still for a while, and when the keyboard says it went or the
 * app comes back, Android's window is asked whether a keyboard is shown (keyboardShown, in the
 * device module), React Native's word standing in on a phone that cannot say. Not shown: the screen
 * is put down. Android's word comes at once, as the keyboard starts to go, so the screen still
 * follows the library while it moves, and is put down only once it is still.
 */
const keyboardDown = makeMutable(false);
const SETTLE_MS = 600;
let watching = false;
let settling: ReturnType<typeof setTimeout> | undefined;
/** Which look at the keyboard is the latest: an answer to an older one, overtaken by a move, counts for nothing. */
let round = 0;

function settle() {
  clearTimeout(settling);
  const mine = ++round;
  settling = setTimeout(() => void putDown(mine), SETTLE_MS);
}

async function putDown(mine: number) {
  let shown: boolean | null | undefined;
  try {
    shown = await device?.keyboardShown?.();
  } catch {
    shown = null;
  }
  if (mine !== round) return;
  if (!(shown ?? Keyboard.isVisible())) keyboardDown.value = true;
}

function watchKeyboard() {
  if (watching) return;
  watching = true;
  Keyboard.addListener('keyboardDidShow', () => {
    clearTimeout(settling);
    round++;
    keyboardDown.value = false;
  });
  Keyboard.addListener('keyboardDidHide', settle);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') settle();
  });
}

/**
 * Closes the keyboard, and resolves once it is down (at once if it was closed), when what sat on it
 * has moved down too. A keyboard that never says it went (a hardware one, say) is waited for half a
 * second at most.
 */
export function dismissKeyboard(): Promise<void> {
  return Promise.race([KeyboardController.dismiss(), new Promise<void>((done) => setTimeout(done, 500))]);
}
