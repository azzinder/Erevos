// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import { callAudio, type CallOutput } from '../modules/erevos-call';
import { t } from './i18n';

// Where a call's sound goes, on Android (modules/erevos-call, CallOutputs.kt): the earpiece, the
// loudspeaker, a wired headset or a Bluetooth one. With no headset, the call screen's Speaker turns
// the loudspeaker on and off as before; with one, it shows where the sound goes and lets the owner
// choose (components/call-screen.tsx CallSound). Elsewhere (a build before it, the web app, the
// computer) there is only the Speaker.

export type CallSound = { outputs: CallOutput[]; current: CallOutput | null };

const NONE: CallSound = { outputs: [], current: null };

/** Where the sound can go now, and where it goes; none where this phone cannot say. */
export function readCallSound(): CallSound {
  try {
    const outputs = callAudio?.outputs?.() ?? [];
    const id = callAudio?.output?.() ?? null;
    return { outputs, current: outputs.find((output) => output.id === id) ?? null };
  } catch {
    return NONE;
  }
}

/** A headset is connected: the owner chooses where the sound goes, not only the loudspeaker. */
export const headsetIn = (outputs: readonly CallOutput[]) => outputs.some((output) => output.kind === 'wired' || output.kind === 'bluetooth');

/** The sound goes to a headset now: turning the camera on leaves it there, not on the loudspeaker. */
export function soundInHeadset(sound: CallSound = readCallSound()): boolean {
  return sound.current?.kind === 'wired' || sound.current?.kind === 'bluetooth';
}

/** Its name, short, for the call screen's round button. */
export function soundShort(output: CallOutput): string {
  switch (output.kind) {
    case 'earpiece':
      return t('Phone');
    case 'speaker':
      return t('Speaker');
    case 'wired':
      return t('Headphones');
    case 'bluetooth':
      return t('Bluetooth');
  }
}

/** Its name in the list: a Bluetooth headset by its own name. */
export function soundName(output: CallOutput): string {
  return output.kind === 'bluetooth' && output.name ? output.name : soundShort(output);
}

/** Where the sound can go and goes, as it changes; and the owner's choice. */
export function useCallSound(): CallSound & { choose: (id: string) => void } {
  const [sound, setSound] = useState(readCallSound);
  useEffect(() => {
    setSound(readCallSound());
    const changes = callAudio?.addListener?.('onOutputs', () => setSound(readCallSound()));
    return () => changes?.remove();
  }, []);
  const choose = (id: string) => {
    try {
      callAudio?.setOutput?.(id);
    } catch {
      // A phone that would not take it: the sound stays where it was.
    }
    setSound(readCallSound());
  };
  return { ...sound, choose };
}
