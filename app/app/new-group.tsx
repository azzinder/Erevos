// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';

import { NewGroupForm } from '../components/new-group';
import { Page, Text } from '../components/ui';
import { t } from '../lib/i18n';

// A new group of the space (components/new-group.tsx), which then shows.
export default function NewGroup() {
  return (
    <Page>
      <Text variant="title">{t('New group')}</Text>
      <NewGroupForm onMade={(id) => router.replace(`/group?id=${id}`)} />
    </Page>
  );
}
