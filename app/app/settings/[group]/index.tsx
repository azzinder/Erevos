// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { LanguageSheet, languageTitle, openLeaf, SettingsCard, SettingsRow, settingsPlace } from '../../../components/settings-list';
import { Page, Text } from '../../../components/ui';
import { LANG_LABELS, lang, t } from '../../../lib/i18n';
import { findGroup, hasParts, itemsHere, partsHere } from '../../../lib/settings';

/** A group of settings (lib/settings.ts): each opens its screen, or the list of its parts. */
export default function SettingsGroupScreen() {
  const { group: id } = useLocalSearchParams<{ group: string }>();
  const [place] = useState(settingsPlace);
  const [languages, setLanguages] = useState(false);
  const group = findGroup(id);
  if (!group) return <Page>{null}</Page>;

  return (
    <Page>
      <Text variant="title">{t(group.title)}</Text>
      <SettingsCard>
        {itemsHere(group, place).map((item) =>
          hasParts(item) ? (
            <SettingsRow
              key={item.id}
              title={t(item.title)}
              detail={partsHere(item, place)
                .map((part) => t(part.title))
                .join(', ')}
              onPress={() => router.push({ pathname: '/settings/[group]/[item]', params: { group: group.id, item: item.id } })}
            />
          ) : (
            <SettingsRow
              key={item.id}
              title={item.language ? languageTitle() : t(item.title)}
              detail={item.language ? LANG_LABELS[lang()] : t(item.detail)}
              onPress={() => openLeaf(item, () => setLanguages(true))}
            />
          ),
        )}
      </SettingsCard>
      <LanguageSheet visible={languages} onClose={() => setLanguages(false)} />
    </Page>
  );
}
