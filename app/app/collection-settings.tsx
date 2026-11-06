// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Page, Text, Toggle } from '../components/ui';
import { useCollectionPlace } from '../lib/collection-place';
import { tap } from '../lib/haptics';
import { t } from '../lib/i18n';
import { loadCollection, setCollectionBackup } from '../lock/collection-data';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

// The Collection's settings (Settings → Data and devices → Collection, and from the Collection's
// own menu, where a hidden place's own Collection, `hidden`, has them too): whether it goes into
// backups, which is the place's own choice (lock/collection-data.ts), and, to come, whether a
// photo is deleted from the phone's gallery once it is in the Collection, which Android asks the
// owner to confirm and needs a part of Erevos that is not there yet.

export default function CollectionSettingsScreen() {
  const colors = useColors();
  const { hidden } = useLocalSearchParams<{ hidden?: string }>();
  const place = useCollectionPlace(hidden === '1');
  const [backup, setBackup] = useState<boolean | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!place) {
      setBackup(null);
      return;
    }
    let active = true;
    void loadCollection(place)
      .then((c) => active && setBackup(c.backup))
      .catch(() => active && setBackup(null));
    return () => {
      active = false;
    };
  }, [place]);

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
        <View accessibilityRole="switch" accessibilityState={{ checked: false, disabled: true }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: 0.55 }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('Delete the original from the gallery after importing')}</Text>
            <Text variant="caption" tone="muted">
              {t('Coming in a later version.')}
            </Text>
          </View>
          <Toggle on={false} />
        </View>
      </Card>
    </Page>
  );
}
