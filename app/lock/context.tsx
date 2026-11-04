// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { createContext, useContext } from 'react';

import type { OnlyPart } from '../lib/open-link';
import type { Unlocked } from './config';

export interface LockState {
  /** Which space is open (0 is the real one). */
  space: number;
  /** Whether the password lock is on (then the app locks itself in the background). */
  passwordLock: boolean;
  /** Call after turning the password lock on or off. */
  setPasswordLock: (on: boolean) => void;
  /** Locks now: the password screen comes in front of the space, which goes on behind it. */
  lockNow: () => void;
  /** Closes the space, nothing of it kept, and starts as Erevos does (after a backup is restored). */
  closeNow: () => void;
  /** Switches to another space (its password was just given): nothing of the open one stays, and the other opens with the password lock on. */
  openSpace: (space: Unlocked) => void;
  /** What the password opened: only the SMS, or only the Contacts, as it was given for their icon,
   *  the widget's button or an SMS notice (lib/open-link.ts, onlyPartOf); null, all of the space. */
  only: OnlyPart | null;
  /** Asks for the password again, to open all of the space; then the screen of `link` (erevos://…), when given, opens. */
  unlockAll: (link?: string) => void;
}

export const LockContext = createContext<LockState>({
  space: 0,
  passwordLock: false,
  setPasswordLock: () => undefined,
  lockNow: () => undefined,
  closeNow: () => undefined,
  openSpace: () => undefined,
  only: null,
  unlockAll: () => undefined,
});

export function useLock(): LockState {
  return useContext(LockContext);
}
