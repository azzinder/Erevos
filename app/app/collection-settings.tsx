// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Page, Text, Toggle } from '../components/ui';
import { CAN_DELETE_ORIGINALS } from '../lib/collection-import';
import { useCollectionPlace } from '../lib/collection-place';
import { CAN_PLAY, stopOnLockChanged } from '../lib/collection-play';
import { tap } from '../lib/haptics';
import { t } from '../lib/i18n';
import { loadCollection, setCollectionBackup, setCollectionOption, type Collection, type CollectionOption } from '../lock/collection-data';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

// The Collection's settings (Settings → Data and devices → Collection, and from the Collection's
// own menu, where a hidden place's own Collection, `hidden`, has them too), each the place's own
// choice (lock/collection-data.ts): whether it goes into backups; whether a photo or video picked
// from the phone's gallery is deleted there once it is in the Collection, which Android has the
// owner confirm each time (Android 11 and later; before, the switch shows but cannot be turned
// on); and, for its music and videos (lib/collection-play.ts), whether the list playing stops when
// the space locks, and whether Android's notice shows the file's name.

export default function CollectionSettingsScreen() {
  const colors = useColors();
  const { hidden } = useLocalSearchParams<{ hidden?: string }>();
  const place = useCollectionPlace(hidden === '1');
  const [backup, setBackup] = useState<boolean | null>(null);
  const [options, setOptions] = useState<Pick<Collection, CollectionOption> | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!place) {
      setBackup(null);
      setOptions(null);
      return;
    }
    let active = true;
    void loadCollection(place)
      .then((c) => {
        if (!active) return;
        setBackup(c.backup);
        setOptions({ deleteOriginals: c.deleteOriginals === true, stopOnLock: c.stopOnLock === true, showTitle: c.showTitle === true });
      })
      .catch(() => {
        if (!active) return;
        setBackup(null);
        setOptions(null);
      });
    return () => {
      active = false;
    };
  }, [place]);

  async function turn(option: CollectionOption) {
    if (!place || !options) return;
    tap();
    const next = !options[option];
    setOptions({ ...options, [option]: next });
    try {
      await setCollectionOption(place, option, next);
      // A list playing now follows the change at once.
      if (option === 'stopOnLock') stopOnLockChanged(next);
    } catch (error) {
      setOptions({ ...options, [option]: !next });
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  async function turnBackup() {
    if (!place || backup === null) return;
    tap();
    const next = !backup;
    setBackup(next);
    try {
      await setCollectionBackup(place, next);
    } catch (error) {
      setBackup(!next);
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Page>
      <Text variant="title">{t('Collection')}</Text>
      <Text tone="muted">{t('Photos and files, encrypted. This Collection opens only while its space or hidden place is open.')}</Text>
      {hidden === '1' && !place ? <Text tone="muted">{t('The hidden chats are closed.')}</Text> : null}
      <Card>
        <Pressable onPress={() => void turnBackup()} disabled={backup === null} accessibilityRole="switch" accessibilityState={{ checked: backup === true, disabled: backup === null }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('The Collection goes into the backups')}</Text>
            <Text variant="caption" tone="muted">
              {t('Only this one. It counts for backups made while it is open.')}
            </Text>
          </View>
          <Toggle on={backup === true} />
        </Pressable>
        {note ? (
          <Text variant="caption" color={colors.warning}>
            {note}
          </Text>
        ) : null}
      </Card>
      <Card>
        <Switch
          title={t('Delete the original from the gallery after importing')}
          text={CAN_DELETE_ORIGINALS ? t('Only a photo or video picked from the phone’s files. Android asks you to confirm each time. Photos taken with the camera never go to the gallery.') : t('Android 11 or later is needed for this.')}
          on={CAN_DELETE_ORIGINALS && options?.deleteOriginals === true}
          disabled={!CAN_DELETE_ORIGINALS || !options}
          onPress={() => void turn('deleteOriginals')}
        />
      </Card>
      {CAN_PLAY ? (
        <Card>
          <Switch
            title={t('Stop playing when the space locks')}
            text={t('Otherwise music and videos go on after the space locks; on the phone’s lock screen only play, pause, next, previous and stop work.')}
            on={options?.stopOnLock === true}
            disabled={!options}
            onPress={() => void turn('stopOnLock')}
          />
          <Switch
            title={t('Show the title in the notification')}
            text={t('Otherwise the notification and the phone’s lock screen say only “Playing”.')}
            on={options?.showTitle === true}
            disabled={!options}
            onPress={() => void turn('showTitle')}
          />
        </Card>
      ) : null}
    </Page>
  );
}

function Switch({ title, text, on, disabled, onPress }: { title: string; text: string; on: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="switch" accessibilityState={{ checked: on, disabled }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: disabled ? 0.55 : 1 }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="muted">
          {text}
        </Text>
      </View>
      <Toggle on={on} />
    </Pressable>
  );
}
