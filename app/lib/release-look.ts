// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { loadCurrentSpaceData } from '../lock/space-data';
import { device } from '../modules/erevos-device';
import { FDROID } from './distribution';
import { lookForRelease } from './release-notice';
import { buildNumber } from './updates';

// Looks for a new Erevos while a space is open (lib/release-notice.ts): a minute after it opens,
// then each hour here, and at the server once a day at most; a new one is told in a notice too.
// On Android only, where Updates installs it; not in the F-Droid build, which F-Droid updates, nor
// in a build made on a computer, which has no build number.

/** This app's build number (app.config.js sets it for releases), 0 for a build made on a computer. */
export const CURRENT_BUILD = buildNumber(Constants.expoConfig?.extra?.build, Constants.expoConfig?.version ?? '0.0.0');

const FIRST = 60_000;
const AGAIN = 3600_000;
let timer: ReturnType<typeof setTimeout> | null = null;
// Which watch is on, so a look that ends after the space closed sets no timer again.
let watch = 0;

export function watchReleases(): void {
  stopReleases();
  if (Platform.OS !== 'android' || FDROID || !CURRENT_BUILD) return;
  const mine = watch;
  const look = async () => {
    const told = await lookForRelease(await loadCurrentSpaceData(), CURRENT_BUILD).catch(() => null);
    if (told && mine === watch) device?.tellUpdate?.(told.name);
  };
  const again = () => {
    timer = null;
    void look().finally(() => {
      if (mine === watch) timer = setTimeout(again, AGAIN);
    });
  };
  timer = setTimeout(again, FIRST);
}

/** Stops looking: the space closed. */
export function stopReleases(): void {
  watch++;
  if (timer) clearTimeout(timer);
  timer = null;
}
