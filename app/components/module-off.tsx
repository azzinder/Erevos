// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../lib/i18n';
import type { Module } from '../lib/modules';
import { space } from '../theme/colors';

import { moduleName } from './module-texts';
import { Button, Card, Page, Row, Text } from './ui';

// In place of a screen of a module that is off (lib/modules.ts screenModule, app/_layout.tsx): a
// link, the widget or a notice may still lead there. Where it is turned on again. `bare`: in place
// of a screen without the header, so without its back arrow (a chat, a group).
export function ModuleOff({ module, bare }: { module: Module; bare?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Page style={bare ? { paddingTop: insets.top + space.xl } : undefined}>
      <Text variant="title">{t('{module} is off', { module: moduleName(module) })}</Text>
      <Card>
        <Text tone="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          {t('This part of Erevos is off on this phone, so this screen does not open. Nothing of it is deleted: it is all there again once you turn it on in Settings → General → Modules.')}
        </Text>
        <Row wrap>
          <Button title={t('Open Modules')} kind="secondary" compact onPress={() => router.replace('/modules' as Href)} />
          {bare ? <Button title={t('Back')} kind="ghost" compact onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
        </Row>
      </Card>
    </Page>
  );
}
