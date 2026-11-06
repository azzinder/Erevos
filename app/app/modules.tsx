// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { openDefaultApps } from '../components/default-apps';
import { moduleAbout, moduleName, moduleOffNote } from '../components/module-texts';
import { Button, Card, Page, Row, Text, Toggle } from '../components/ui';
import { ask, confirm } from '../lib/alert';
import { tap } from '../lib/haptics';
import { t } from '../lib/i18n';
import { modulesHere, setModules, useModules, type Module } from '../lib/modules';
import { HAS_CHECKS } from '../lib/permissions';
import { phoneStatus } from '../modules/erevos-phone';
import { smsStatus } from '../modules/erevos-sms';
import { space } from '../theme/colors';

// Settings → General → Modules: the parts of Erevos this phone uses (lib/modules.ts), any of them,
// at least one. One turned off stops at once and leaves every screen, nothing of it deleted; one
// turned on starts at once, and what Android should allow for it is asked again
// (app/permissions.tsx), Erevos as the phone app or the SMS app among it.

export default function ModulesScreen() {
  const on = useModules();
  const here = modulesHere();
  // The Phone or the SMS turned off while Erevos is still that app: Android goes on giving it the calls or the SMS.
  const [still, setStill] = useState<Module | null>(null);

  async function turn(module: Module) {
    tap();
    if (on.has(module)) {
      if ([...on].filter((m) => m !== 'collection').length === 1 && module !== 'collection') {
        ask(t('At least one part stays on'), t('Turn another one on first, then this one off.'), [{ text: t('OK') }]);
        return;
      }
      if (!(await confirm(t('Turn {module} off?', { module: moduleName(module) }), moduleOffNote(module), t('Turn off')))) return;
      if (!(await setModules(here.filter((m) => m !== module && on.has(m))))) return;
      const role = module === 'phone' ? phoneStatus()?.isDefault : module === 'sms' ? smsStatus()?.isDefault : false;
      setStill(role ? module : null);
      return;
    }
    if (!(await setModules([...here.filter((m) => on.has(m)), module]))) return;
    if (still === module) setStill(null);
    // What Android should allow for it, as at the first start.
    if (HAS_CHECKS) router.push(`/permissions?for=${module}`);
  }

  return (
    <Page>
      <Text variant="title">{t('Modules')}</Text>
      <Card>
        <Text tone="muted" style={hint}>
          {t('The parts of Erevos this phone uses. One that is off does not start, and shows nowhere: Erevos is lighter, opens faster and uses less battery. Nothing of it is deleted: its chats, contacts and settings are there again when you turn it back on. Contacts, the password, the spaces and the backups are always there.')}
        </Text>
      </Card>
      {still ? (
        <Card>
          <Text variant="bodyStrong">{still === 'phone' ? t('Erevos is still the phone app') : t('Erevos is still the SMS app')}</Text>
          <Text variant="caption" tone="muted" style={hint}>
            {still === 'phone'
              ? t('Android goes on giving Erevos the calls, and they still ring on its call screen. To use another phone app, choose it in Default apps.')
              : t('Android goes on giving Erevos the SMS, and they are kept. To use another SMS app, choose it in Default apps.')}
          </Text>
          <Row wrap>
            <Button title={t('Open Default apps')} kind="secondary" compact onPress={() => void openDefaultApps()} />
          </Row>
        </Card>
      ) : null}
      {here.map((module) => (
        <Pressable
          key={module}
          onPress={() => void turn(module)}
          accessibilityRole="switch"
          accessibilityState={{ checked: on.has(module) }}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Card>
            <Row style={{ alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyStrong">{moduleName(module)}</Text>
                <Text variant="caption" tone="muted" style={hint}>
                  {moduleAbout(module)}
                </Text>
              </View>
              <Toggle on={on.has(module)} />
            </Row>
          </Card>
        </Pressable>
      ))}
    </Page>
  );
}

// Hints read better a little larger and looser than captions.
const hint = { fontSize: 14, lineHeight: 20 };
