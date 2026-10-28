import { onHiddenPlaceChange, openHiddenPlace } from './hidden-contacts';
import { closeMatrixPlace, openMatrixPlace } from './matrix-store';
import { closeNostrDmPlace, openNostrDmPlace } from './nostr-dm-store';
import { closeXmppPlace, openXmppPlace } from './xmpp-store';

// A hidden place's own accounts on Matrix, XMPP and Nostr (docs/matrix.md, docs/xmpp.md,
// docs/nostr-chats.md): each kept in the place's own value of its network's file, sealed with the
// place's key (lock/xmpp-data.ts and the others), apart from the space's, which never sees them. They run while the place's hidden chats
// are open, beside the space's, and stop as they close (lib/hidden-contacts.ts). Their screens are
// the same as the space's, opened from the hidden chats (lib/network-place.ts); their chats are
// rows of the hidden chats' list, and tell nothing outside it.

/** Follows the hidden chats as they open and close, for as long as Erevos runs. Returns how to stop. */
export function watchPlaceNetworks(): () => void {
  let at: string | null = null;
  const follow = () => {
    const open = openHiddenPlace();
    const now = open ? `${open.space}/${open.pocket}` : null;
    if (now === at) return;
    at = now;
    if (open) {
      openMatrixPlace(open.space, open.pocket, open.key);
      openXmppPlace(open.space, open.pocket, open.key);
      openNostrDmPlace(open.space, open.pocket, open.key);
    } else closeAll();
  };
  const closeAll = () => {
    closeMatrixPlace();
    closeXmppPlace();
    closeNostrDmPlace();
  };
  follow();
  const stop = onHiddenPlaceChange(follow);
  return () => {
    stop();
    closeAll();
  };
}
