// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The call module (modules/erevos-call) for checks under Node: only where a call's sound can go,
// kept in memory (`sound`), and its changes told as the phone tells them (`soundChanged`).
import type { CallOutput } from '../modules/erevos-call/index';

export type { CallOutput };

const listeners = new Set<() => void>();

/** Where the sound can go, and the id of the one it goes to; `chosen`: the ids setOutput was given. */
export const sound = { outputs: [] as CallOutput[], current: null as string | null, chosen: [] as string[] };

/** Tells the screens the sound changed, as onOutputs does. */
export function soundChanged(): void {
  listeners.forEach((listener) => listener());
}

export const callAudio = {
  outputs: () => sound.outputs,
  output: () => sound.current,
  setOutput: (id: string) => {
    sound.chosen.push(id);
    sound.current = id;
  },
  addListener: (_name: 'onOutputs', listener: () => void) => {
    listeners.add(listener);
    return { remove: () => void listeners.delete(listener) };
  },
};
