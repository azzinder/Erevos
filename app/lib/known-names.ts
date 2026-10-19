import { loadE2EData } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { setKnownNames } from '../modules/erevos-phone';
import { onHiddenPlaceChange, openHiddenPlace } from './hidden-contacts';
import { knownNames } from './phone';
import { onSealedChange, placeNames, placeOf, spacePlace } from './sealed-contacts';

// The names the call screen shows for numbers (setKnownNames in modules/erevos-phone), in the
// memory of Erevos's process only: those the open space gives the numbers linked to its Erevos
// contacts, and those of its contacts kept only in Erevos (lib/sealed-contacts.ts); then, while
// hidden chats are open, theirs too (lib/hidden-contacts.ts). Given again as one of them changes,
// the latest asked for only, and never once the space has locked. As hidden chats close, the
// space's own are given back at once, before anything is read again.

let asked = 0;
// The space's own names as last given, without any hidden chats', and the key they are for.
let spaceNames: { key: Uint8Array; names: Record<string, string> } | null = null;

const stillOpen = (key: Uint8Array) => {
  try {
    return currentSpace().key === key;
  } catch {
    return false;
  }
};

/** Gives the call screen the names of the open space, and of the open hidden chats. */
export async function refreshKnownNames(): Promise<void> {
  const mine = ++asked;
  let open: { space: number; key: Uint8Array };
  try {
    open = currentSpace();
  } catch {
    return;
  }
  const hidden = openHiddenPlace();
  const linked = await loadE2EData('space', open.space, open.key)
    .then((e2e) => knownNames(e2e.contacts))
    .catch((): Record<string, string> => ({}));
  const sealed = await placeNames(spacePlace()).catch((): Record<string, string> => ({}));
  const theirs = hidden
    ? { ...knownNames(hidden.erevos().map((p) => ({ ...p, request: false }))), ...(await placeNames(placeOf(hidden)).catch(() => ({}))) }
    : {};
  if (mine !== asked || !stillOpen(open.key) || openHiddenPlace() !== hidden) return;
  const names = { ...linked, ...sealed };
  spaceNames = { key: open.key, names };
  setKnownNames({ ...names, ...theirs });
}

/** Keeps the call screen's names as they change, while the space is open. Returns how to stop. */
export function watchKnownNames(): () => void {
  const sealed = onSealedChange(() => void refreshKnownNames());
  const hidden = onHiddenPlaceChange(() => {
    // Closed: none of theirs stays, even before the space's are read again.
    if (!openHiddenPlace() && spaceNames && stillOpen(spaceNames.key)) setKnownNames(spaceNames.names);
    void refreshKnownNames();
  });
  void refreshKnownNames();
  return () => {
    sealed();
    hidden();
    spaceNames = null;
  };
}
