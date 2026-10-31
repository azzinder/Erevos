// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Platform } from 'react-native';

import { holdLink } from '../lib/open-link';

// Every link Erevos is opened with waits for a space to be open (lib/open-link.ts): Expo Router
// starts on the home screen, and the screen the link names opens once the password is given.
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  if (Platform.OS === 'web') return path;
  holdLink(path);
  return initial ? '/' : null;
}
