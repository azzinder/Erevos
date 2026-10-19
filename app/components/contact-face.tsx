import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { initials } from '../lib/contacts';
import { phoneContactPhoto } from '../modules/erevos-contacts';
import { useTheme } from '../theme/context';
import { Text } from './ui';

// A contact's picture on the contacts screens (app/contacts.tsx): its photo, or its initials on a
// colour drawn from its name. A phone contact's photo comes from Android's contacts, kept for the
// time the app is open by the contact and Android's id of the photo, so a list read again does not
// ask for it again, and a new photo shows at once.

const HUES = [4, 24, 42, 140, 172, 200, 222, 262, 292, 330];
const opened = new Map<string, string>();

function hueOf(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return HUES[h % HUES.length];
}

/** A phone contact's photo as an image address, or null while it is read, or if it has none. */
export function usePhoneContactPhoto(id: number | null, photo: number, large = false): string | null {
  const key = id && photo ? `${id}:${photo}:${large ? 1 : 0}` : '';
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
