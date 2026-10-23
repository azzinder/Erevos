import { loadE2EData } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { setKnownNames } from '../modules/erevos-phone';
import { knownNames } from './phone';
import { onSealedChange, placeNames, spacePlace } from './sealed-contacts';
import { spaceGated } from './space-running';

// The names the call screen shows for numbers (setKnownNames in modules/erevos-phone), in the
// memory of Erevos's process only: those the open space gives the numbers linked to its Erevos
// contacts, and those of its contacts kept only in Erevos (lib/sealed-contacts.ts). Given again as
// one of them changes, the latest asked for only, and never once the space has locked, nor while the
// password screen shows in front of it (lib/space-running.ts). The names of
// hidden chats' contacts are never given: the call screen shows over the lock screen, and a hidden
// contact calling while the phone is locked in a pocket would put a name there that only the
// hidden chats know. A call from them shows its number.

let asked = 0;

const stillOpen = (key: Uint8Array) => {
  try {
    return currentSpace().key === key;
  } catch {
    return false;
  }
};

/** Gives the call screen the names of the open space. */
export async function refreshKnownNames(): Promise<void> {
  const mine = ++asked;
  if (spaceGated()) return;
  let open: { space: number; key: Uint8Array };
  try {
    open = currentSpace();
  } catch {
    return;
  }
  const linked = await loadE2EData('space', open.space, open.key)
    .then((e2e) => knownNames(e2e.contacts))
    .catch((): Record<string, string> => ({}));
  const sealed = await placeNames(spacePlace()).catch((): Record<string, string> => ({}));
  if (mine !== asked || !stillOpen(open.key) || spaceGated()) return;
  setKnownNames({ ...linked, ...sealed });
}

/** Keeps the call screen's names as they change, while the space is open. Returns how to stop. */
export function watchKnownNames(): () => void {
  const sealed = onSealedChange(() => void refreshKnownNames());
  void refreshKnownNames();
  return sealed;
}
