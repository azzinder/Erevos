import { startActivityAsync } from 'expo-intent-launcher';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking } from 'react-native';

import { placeText, type Place } from '../lib/chat-parts';
import { plural, t } from '../lib/i18n';
import { findPlace, PlaceError, stopPlace, type Found } from '../lib/place';
import { useColors } from '../theme/context';
import { openPlace } from './message-parts';
import { Button, Row, Sheet, Text, TextButton } from './ui';

// "Send where you are?" (lib/place.ts), of a chat and of a group: it opens at once and says it is
// looking, then shows the place before it goes, or why none was found, with the phone's screen
// that changes that and Try again. Closing it stops the look.

export function PlaceSheet({ visible, onClose, onSend, said }: {
  visible: boolean;
  onClose: () => void;
  onSend: (place: Place) => void;
  /** Who gets the place, said under it. */
  said: string;
}) {
  const colors = useColors();
  const [found, setFound] = useState<Found | null>(null);
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setFound(null);
    setTrouble(null);
    findPlace().then(
      (place) => live && place && setFound(place),
      (error) => live && setTrouble(troubleOf(error)),
    );
    return () => {
      live = false;
      stopPlace();
    };
  }, [visible, round]);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('Send where you are?')}>
      {found ? (
        <>
          <Text selectable>{placeText(found.place)}</Text>
          {found.place.acc !== undefined ? (
            <Text variant="caption" tone="muted">
              {t('Within about {m} m', { m: found.place.acc })}
            </Text>
          ) : null}
          {found.age >= 60 ? (
            <Text variant="caption" tone="muted">
              {plural(Math.round(found.age / 60), 'The phone found this {n} minute ago; nothing newer came in time.', 'The phone found this {n} minutes ago; nothing newer came in time.')}
            </Text>
          ) : null}
          <Text variant="caption" tone="muted">
            {said}
          </Text>
          <Row wrap>
            <Button title={t('Send')} compact onPress={() => onSend(found.place)} />
            <TextButton title={t('Open in maps')} onPress={() => openPlace(found.place)} />
            <TextButton title={t('Cancel')} onPress={onClose} />
          </Row>
        </>
      ) : trouble ? (
        <>
          <Text>{trouble.text}</Text>
          <Row wrap>
            <Button title={t('Try again')} compact onPress={() => setRound((n) => n + 1)} />
            {trouble.open ? <TextButton title={trouble.open.title} onPress={trouble.open.go} /> : null}
            <TextButton title={t('Cancel')} onPress={onClose} />
          </Row>
        </>
      ) : (
        <>
          <Row>
            <ActivityIndicator color={colors.textMuted} />
            <Text tone="muted">{t('Finding where you are…')}</Text>
          </Row>
          <Text variant="caption" tone="muted">
            {t('Indoors this can take up to a minute.')}
          </Text>
          <Row wrap>
            <TextButton title={t('Cancel')} onPress={onClose} />
          </Row>
        </>
      )}
    </Sheet>
  );
}

type Trouble = { text: string; open?: { title: string; go: () => void } };

// What went wrong, said, and the phone's screen that changes it: Erevos's App info for its
// permission, the location settings when the location is off.
function troubleOf(error: unknown): Trouble {
  const text = (error instanceof Error ? error.message : String(error)).split('\n')[0];
  if (!(error instanceof PlaceError)) return { text };
  if (error.trouble === 'permission' || error.trouble === 'approximate') {
    return { text, open: { title: t("Open Erevos's App info"), go: () => void Linking.openSettings().catch(() => undefined) } };
  }
  if (error.trouble === 'off') {
    const go = () => void startActivityAsync('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => Linking.openSettings().catch(() => undefined));
    return { text, open: { title: t('Open location settings'), go } };
  }
  return { text };
}
