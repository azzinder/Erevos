import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import type { Card } from '../lib/contact-book';
import { initials } from '../lib/contacts';
import { phoneContactPhoto } from '../modules/erevos-contacts';
import { useTheme } from '../theme/context';
import { useSealedPhoto } from './sealed-photo';
import { Text } from './ui';

// A contact's picture on the contacts screens (app/contacts.tsx): its photo, or its initials on a
// colour drawn from its name. A phone contact's photo comes from Android's contacts, kept for the
// time the app is open by the contact and Android's id of the photo, so a list read again does not
// ask for it again, and a new photo shows at once. A contact kept only in Erevos has its photo
// sealed (components/sealed-photo.ts).

const HUES = [4, 24, 42, 140, 172, 200, 222, 262, 292, 330];
const opened = new Map<string, string>();
// How many times a contact's photo was changed here: Android may keep a new photo under the old id.
const changed = new Map<number, number>();

function hueOf(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return HUES[h % HUES.length];
}

/** After a contact's photo is changed here: it is read anew, the next time it is shown. */
export function forgetPhoneContactPhoto(id: number) {
  changed.set(id, (changed.get(id) ?? 0) + 1);
}

/** A phone contact's photo as an image address, or null while it is read, or if it has none. */
export function usePhoneContactPhoto(id: number | null, photo: number, large = false): string | null {
  const key = id && photo ? `${id}:${photo}:${large ? 1 : 0}:${changed.get(id) ?? 0}` : '';
  const [uri, setUri] = useState(() => (key ? (opened.get(key) ?? null) : null));
  useEffect(() => {
    if (!key || !id) {
      setUri(null);
      return;
    }
    const known = opened.get(key);
    if (known) {
      setUri(known);
      return;
    }
    let active = true;
    phoneContactPhoto(id, large)
      .then((base64) => {
        if (!base64) return;
        const address = `data:image/jpeg;base64,${base64}`;
        opened.set(key, address);
        if (active) setUri(address);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [key]);
  return uri;
}

/** A card's photo, the phone's or the sealed one, as an image address, or null. */
export function useCardPhoto(card: Card | null, large = false): string | null {
  const phone = usePhoneContactPhoto(card?.phone?.id ?? null, card?.phone?.photo ?? 0, large);
  const sealed = useSealedPhoto(card?.sealed?.photo ?? null);
  return card?.sealed ? sealed : phone;
}

/** The picture: `uri` when there is a photo, else the name's initials. */
export function ContactFace({ name, uri, size = 44 }: { name: string; uri: string | null; size?: number }) {
  const { scheme } = useTheme();
  const hue = hueOf(name);
  const ground = `hsl(${hue}, ${scheme === 'dark' ? '32%, 30%' : '45%, 82%'})`;
  const ink = `hsl(${hue}, ${scheme === 'dark' ? '60%, 86%' : '50%, 26%'})`;
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: ground, borderWidth: 1, borderColor: `hsla(${hue}, 50%, 50%, 0.18)` }}>
      <Text variant="label" color={ink} style={{ fontSize: Math.round(size * 0.38) }}>
        {initials(name) || '#'}
      </Text>
    </View>
  );
}
