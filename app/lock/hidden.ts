import { isSlot, ITER, loadLockConfig, SamePasswordError, sealSlot, trySlot, unusedSlot, type Slot } from './config';
import { newSpaceKey } from './keys';
import { clearSlot, fillSlots, getSlot, setSlot, SLOTS, type SlotStore } from './slots';
import { EMPTY_SPACE, prepareHiddenEntries, saveHiddenData } from './space-data';
import { assertNotLockedOut, prepareTries, recordRightPassword, recordWrongPassword } from './tries';

// Hidden chats: inside every space, chats that open only with their own password, built like the
// second password (config.ts). One password slot per space in the keystore entry
// 'erevos.hidden-lock' (slots.ts: at least SLOTS, the unused ones random), each sealing the key
// of that space's hidden chats. Their relay, queue and contacts are kept like a space's
// (space-data.ts), in their own entry sealed with that key. Every space has both from the first
// start, set or not, and opening checks the space's slot whatever the password, so neither the
// keystore, nor the time it takes, nor the app shows whether a space has hidden chats.
//
// Hidden chats have their own relay queue. While they are closed nothing reads it, and messages to
// them wait on the relay, so they never show among the other chats.

const STORE: SlotStore<Slot> = {
  key: 'erevos.hidden-lock',
  fake: () => unusedSlot(ITER),
  valid: isSlot,
};

/** Every space up to `count` (and SLOTS) has a hidden chats slot and entry, used or not. */
export async function prepareHidden(count = SLOTS): Promise<void> {
  await fillSlots(STORE, count);
  await prepareHiddenEntries(count);
  await prepareTries();
}

/** The key of a space's hidden chats, or null if the password does not open them. Throws LockedOutError while it must wait. */
export async function openHidden(space: number, password: string, now = Date.now()): Promise<Uint8Array | null> {
  await assertNotLockedOut(now);
  const key = await trySlot(await getSlot(STORE, space), password);
  if (key) await recordRightPassword();
  else await recordWrongPassword(now);
  return key;
}

// Sets the password of a space's hidden chats. With `key` (they are open) they stay as they are
// and only the password changes. Without it they start empty, and whatever was hidden before
// cannot be opened any more. The password must not be the one the space itself opens with.
export async function setHiddenPassword(space: number, password: string, key: Uint8Array | null, now = Date.now()): Promise<Uint8Array> {
  await assertNotLockedOut(now);
  const own = (await loadLockConfig()).slots[space];
  if (own && (await trySlot(own, password))) throw new SamePasswordError();
  const hiddenKey = key ?? newSpaceKey();
  await setSlot(STORE, space, await sealSlot(password, hiddenKey, ITER));
  if (!key) await saveHiddenData(space, hiddenKey, EMPTY_SPACE);
  return hiddenKey;
}

/** Makes a space's hidden chats stop opening. They stay on the phone, and nothing opens them. */
export async function removeHiddenPassword(space: number): Promise<void> {
  await clearSlot(STORE, space);
}
