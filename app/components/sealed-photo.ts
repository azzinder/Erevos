import { useEffect, useState } from 'react';

import { toBase64 } from '../lib/crypto';
import { loadPhoto, type PhotoRef } from '../lock/avatar-photos';

// A photo kept sealed (lock/avatar-photos.ts), opened to show: a contact's picture, a wallpaper.
// Photos opened this time the app is open are kept by file id, so a list of chats, or each screen
// over a wallpaper, does not open the same file again.
const opened = new Map<string, string>();

/** The photo as an image address, or null until it is open, or if its file is gone. */
export function useSealedPhoto(ref: PhotoRef | null): string | null {
  const [uri, setUri] = useState(() => (ref ? (opened.get(ref.id) ?? null) : null));
  const id = ref?.id ?? '';
  const key = ref?.key ?? '';
  useEffect(() => {
    if (!id) {
      setUri(null);
      return;
    }
    const known = opened.get(id);
    if (known) {
      setUri(known);
      return;
    }
    let active = true;
    loadPhoto({ id, key })
      .then((bytes) => {
        if (!bytes) return;
        const address = `data:image/jpeg;base64,${toBase64(bytes)}`;
        opened.set(id, address);
        if (active) setUri(address);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, key]);
  return uri;
}
