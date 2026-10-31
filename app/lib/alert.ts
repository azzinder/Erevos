// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Alert, Platform, type AlertButton } from 'react-native';
import { t } from './i18n';

// Questions with buttons, as Alert.alert asks them on the phone. The web build has no Alert with
// buttons (react-native-web's does nothing), so there the app's own sheet asks them
// (components/alert-host.tsx), on a computer too.

export type Question = { title: string; message: string; buttons: AlertButton[] };

let host: ((question: Question) => void) | null = null;
// Asked while no sheet was shown (between screens): asked once one is.
let waiting: Question | null = null;

/** The sheet that asks on the web, set while it is shown. */
export function setAlertHost(next: ((question: Question) => void) | null): void {
  host = next;
  if (host && waiting) {
    host(waiting);
    waiting = null;
  }
}

export function ask(title: string, message: string, buttons: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  if (host) host({ title, message, buttons });
  else waiting = { title, message, buttons };
}

/** Asks whether to go on with `action`, a destructive one. True if the owner chose it. */
export function confirm(title: string, message: string, action = title): Promise<boolean> {
  return new Promise((resolve) => {
    ask(title, message, [
      { text: t('Cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** Asks which of two to do: true for `yes`, false for `no`. */
export function choose(title: string, message: string, no: string, yes: string): Promise<boolean> {
  return new Promise((resolve) => {
    ask(title, message, [
      { text: no, style: 'cancel', onPress: () => resolve(false) },
      { text: yes, onPress: () => resolve(true) },
    ]);
  });
}
