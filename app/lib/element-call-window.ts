// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { callAudio } from '../modules/erevos-call';
import { ELEMENT_CALL_PAGE, webCall } from '../modules/erevos-webcall';
import { t } from './i18n';
import { callWindowClosed, callWindowMessage, type CallWindow, type MatrixCallsSpace } from './matrix-calls';
import { matrixCallAccount } from './matrix-store';

// Element Call's window on Android (modules/erevos-webcall), for Matrix calls (lib/matrix-calls.ts):
// what it says goes to the calls, and the sound goes where Element Call asks, through the earpiece
// or the loudspeaker, as Erevos's own calls' sound does (modules/erevos-call).

/** Where the sound can go, as Element Call's controls take it. */
function devices(): string {
  return JSON.stringify([
    { id: 'earpiece', name: t('Earpiece'), isEarpiece: true },
    { id: 'speaker', name: t('Speaker'), isSpeaker: true },
  ]);
}

/** Element Call's window and the space's account for it, while the space is open; null where
 *  Erevos cannot show it (a build made before it). `stop` stops listening to it. */
export function elementCall(): { window: CallWindow; space: MatrixCallsSpace; stop(): void } | null {
  const native = webCall;
  if (!native) return null;
  const listening = [
    native.addListener('onMessage', ({ message }) => {
      try {
        callWindowMessage(JSON.parse(message));
      } catch {
        // Not JSON: not the Widget API's.
      }
    }),
    native.addListener('onAudioDevice', ({ id }) => callAudio?.setSpeaker(id === 'speaker')),
    native.addListener('onClosed', () => callWindowClosed()),
  ];
  return {
    window: {
      open(url, video) {
        if (!native.open(url, devices(), video ? 'speaker' : 'earpiece')) throw new Error(t('Matrix calls are not ready on this device.'));
      },
      post: (message) => native.post(JSON.stringify(message)),
      close: () => native.close(),
    },
    space: { ...matrixCallAccount, page: ELEMENT_CALL_PAGE, parentUrl: ELEMENT_CALL_PAGE },
    stop: () => listening.forEach((l) => l.remove()),
  };
}

/** Whether Matrix calls can be made here. */
export function canElementCall(): boolean {
  return !!webCall;
}
