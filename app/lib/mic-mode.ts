// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import { secureGet, secureSet } from './secure';

// What the microphone beside the message field does when held (components/composer.tsx): records a
// voice message ('voice'), or listens and writes the words into the field ('write', lib/dictate.ts).
// Chosen from the menu a tap on it opens, and kept for the device, in every chat and group, until
// chosen again. Voice, unless 'write' was kept.

const KEY = 'erevos.mic';

export type MicMode = 'voice' | 'write';

let now: MicMode = 'voice';
let loaded: Promise<void> | null = null;
const listeners = new Set<(mode: MicMode) => void>();

/** What was kept: anything but 'write' is voice. */
export function readMicMode(raw: string | null): MicMode {
  return raw === 'write' ? 'write' : 'voice';
}

function load(): Promise<void> {
  loaded ??= secureGet(KEY).then(
    (raw) => {
      now = readMicMode(raw);
      for (const listener of listeners) listener(now);
    },
    () => undefined,
  );
  return loaded;
}

/** Keeps what the microphone does, for every bar on this device. */
export function setMicMode(mode: MicMode): void {
  now = mode;
  loaded ??= Promise.resolve();
  for (const listener of listeners) listener(now);
  void secureSet(KEY, mode).catch(() => undefined);
}

/** What the microphone does now, and each change of it. */
export function useMicMode(): MicMode {
  const [mode, setMode] = useState(now);
  useEffect(() => {
    listeners.add(setMode);
    void load();
    setMode(now);
    return () => {
      listeners.delete(setMode);
    };
  }, []);
  return mode;
}
