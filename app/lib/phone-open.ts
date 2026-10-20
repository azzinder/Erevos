import { secureGet, secureSet } from './secure';

// Whether the Phone (app/phone.tsx) opens without Erevos's password: its keypad, calls and
// favourites, which Android keeps for every phone app, with the names of the phone's contacts
// only. Kept on the device, outside every space, as it is read with Erevos locked
// (app/_layout.tsx), and changed only with a space open (app/phone-settings.tsx). Off unless
// turned on.

const KEY = 'erevos.phone-open';

/** Whether the Phone opens without the password. */
export async function phoneOpensLocked(): Promise<boolean> {
  try {
    return (await secureGet(KEY)) === 'yes';
  } catch {
    return false;
  }
}

/** Lets the Phone open without the password, or keeps it behind it again. */
export async function setPhoneOpensLocked(on: boolean): Promise<void> {
  await secureSet(KEY, on ? 'yes' : 'no');
}
