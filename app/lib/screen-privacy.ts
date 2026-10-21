import { device } from '../modules/erevos-device';
import { secureGet, secureSet } from './secure';

// Keeping Erevos's screen out of screenshots, screen recordings and the recent apps preview
// (Android's FLAG_SECURE, modules/erevos-device). Without it, the last screen shown stays as a
// picture among the recent apps until Erevos opens again, so whoever holds the unlocked phone a
// moment sees a hidden chat without its PIN. Hidden chats always keep out of it while they are
// open (app/chat.tsx). A space with a password lock does too, unless the owner turns it off in
// Lock: the setting is the phone's, the same in every space, so it tells nothing of which opened.
// Other platforms have no such switch, and nothing happens there.

const KEY = 'erevos.screen-private';

/** Whether this phone can keep Erevos out of screenshots. */
export const CAN_KEEP_PRIVATE = typeof device?.setSecure === 'function';

const reasons = new Set<string>();

/** Keeps the screen private while any reason asks for it: `why` asks, or no longer. Said again on
 *  every change, so a screen made anew (Erevos swiped away and opened) gets it too. */
export function keepPrivate(why: 'lock' | 'hidden', on: boolean): void {
  if (on) reasons.add(why);
  else reasons.delete(why);
  device?.setSecure?.(reasons.size > 0);
}

/** Whether a space with a password lock keeps the screen private: on unless turned off. */
export async function loadScreenPrivacy(): Promise<boolean> {
  return (await secureGet(KEY)) !== 'off';
}

export async function saveScreenPrivacy(on: boolean): Promise<void> {
  await secureSet(KEY, on ? 'on' : 'off');
}
