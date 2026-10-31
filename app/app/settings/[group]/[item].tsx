// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { openLeaf, SettingsCard, SettingsRow, settingsPlace } from '../../../components/settings-list';
import { Page, Text } from '../../../components/ui';
import { t } from '../../../lib/i18n';
import { findGroup, findItem, hasParts, partsHere } from '../../../lib/settings';

/** A setting's parts (lib/settings.ts), each opening on its screen alone. */
export default function SettingsPartsScreen() {
  const { group, item: id } = useLocalSearchParams<{ group: string; item: string }>();
  const [place] = useState(settingsPlace);
  const item = findItem(findGroup(group), id);
  if (!item || !hasParts(item)) return <Page>{null}</Page>;

  return (
    <Page>
      <Text variant="title">{t(item.title)}</Text>
      <SettingsCard>
        {partsHere(item, place).map((part) => (
          <SettingsRow key={part.id} title={t(part.title)} detail={t(part.detail)} onPress={() => openLeaf(part, () => undefined)} />
        ))}
      </SettingsCard>
    </Page>
  );
}
