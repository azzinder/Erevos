// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { device } from '../modules/erevos-device';

// An invite or a contact link given by touching two phones (modules/erevos-device NfcShare.kt):
// while a sheet shows one (Invite someone, My QR code) and Erevos is in front, this Android phone
// answers as an NFC tag with its https address; the other phone opens it with no app open, in
// Erevos where it is installed. Only the short links (lib/text-invite.ts), which fit a tag and
// open Erevos's page elsewhere; never while Erevos is in the background.

export type NfcState = 'on' | 'off' | 'none';

/** Answers with `link` by NFC while it is given and Erevos is in front; says whether this phone can. */
export function useNfcShare(link: string | null): NfcState {
  const [state, setState] = useState<NfcState>('none');
  useEffect(() => {
    if (Platform.OS !== 'android' || !link || !device?.nfcShare) {
      setState('none');
      return;
    }
    const give = () => {
      const now = device?.nfcState?.() ?? 'none';
      setState(now);
      if (now === 'on' && AppState.currentState === 'active') device?.nfcShare?.(link);
      else device?.nfcStop?.();
    };
    give();
    // NFC turned on in Android's settings meanwhile counts on coming back; away, nothing is answered.
    const subscription = AppState.addEventListener('change', give);
    return () => {
      subscription.remove();
      device?.nfcStop?.();
    };
  }, [link]);
  return state;
}
