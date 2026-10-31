// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Platform } from 'react-native';

import { device } from '../modules/erevos-device';

// Copy, in a message's menu: its words on the clipboard, for another app to paste. On Android
// through modules/erevos-device, marked sensitive so the phone's notice of a copy does not show
// them; on a computer and in the web app, the browser's clipboard. Once copied, they are outside
// Erevos: any app that reads the clipboard can read them.

/** Whether this build can copy: an Android build from before the module cannot. */
export const CAN_COPY = Platform.OS === 'web' ? typeof navigator !== 'undefined' && !!navigator.clipboard : !!device;

/** Copies the text. False when it could not. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return device?.copyText(text) ?? false;
  } catch {
    return false;
  }
}
