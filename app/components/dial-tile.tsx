// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { Linking, Platform } from 'react-native';

import { t } from '../lib/i18n';
import { dialNumber } from '../lib/phone';
import { SHELL } from '../lib/shell';
import { phoneReady, phoneStatus } from '../modules/erevos-phone';
import { DialerSign, ShortcutTile } from './shortcut-tile';

// A plain call to a chat's number, on the phone's own network, from the top of a contact's chat and
// of an SMS conversation: orange, as plain SMS are, for neither is encrypted. It opens a keypad with
// the number typed, Erevos's Phone when Erevos is the phone app, else the phone's own, so a slip
// calls no one. Not on a computer, which has no network of its own to call on.

/** Whether this device can call `number`: a phone, or a browser on one, and a number with digits
 *  to call, not a sender's name as a bank's SMS have. */
export function canDial(number: string): boolean {
  if (dialNumber(number).replace(/\D/g, '').length < 3) return false;
  if (Platform.OS !== 'web') return true;
  if (SHELL === 'electron' || typeof window === 'undefined') return false;
  return SHELL === 'sailfish' || window.matchMedia?.('(pointer: coarse)').matches === true;
}

/** Opens a keypad with `number` typed; false when the phone has no app for it. */
export async function dial(number: string): Promise<boolean> {
  const plain = dialNumber(number);
  if (!plain) return false;
  if (Platform.OS === 'android' && phoneReady() && phoneStatus()?.isDefault) {
    router.push(`/phone?number=${encodeURIComponent(plain)}`);
    return true;
  }
  return Linking.openURL(`tel:${plain}`).then(
    () => true,
    () => false,
  );
}

export function DialTile({ number, onFailed }: { number: string; onFailed: (why: string) => void }) {
  return (
    <ShortcutTile
      label={t('Mobile call, not encrypted')}
      tint="orange"
      onPress={() => void dial(number).then((done) => done || onFailed(t('This phone has no app to call {number}.', { number })))}
    >
      <DialerSign />
    </ShortcutTile>
  );
}
