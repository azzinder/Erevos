// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { startActivityAsync } from 'expo-intent-launcher';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { t } from '../lib/i18n';
import type { Module } from '../lib/modules';
import { phoneStatus, requestDefaultPhone } from '../modules/erevos-phone';
import { requestDefaultSms, smsMirrored, smsStatus } from '../modules/erevos-sms';
import { useColors } from '../theme/context';

import { Button, Card, Row, Text } from './ui';

// Erevos as the phone app and as the SMS app, for the Phone and the SMS among `modules`
// (lib/modules.ts): what Android asks first, at the first start's setup (components/setup.tsx)
// and when either is turned on again (app/permissions.tsx). Whether it is, read again on coming
// back from Android's question. Their own settings (app/phone-settings.tsx, app/sms-settings.tsx)
// say the rest.

/** Opens Android's Default apps, where another phone or SMS app is chosen. */
export async function openDefaultApps(): Promise<void> {
  await startActivityAsync('android.settings.MANAGE_DEFAULT_APPS_SETTINGS').catch(() => Linking.openSettings());
}

export function DefaultAppCards({ modules }: { modules: readonly Module[] }) {
  const colors = useColors();
  const [roles, setRoles] = useState(() => ({ phone: !!phoneStatus()?.isDefault, sms: !!smsStatus()?.isDefault }));

  useEffect(() => {
    const read = () => setRoles({ phone: !!phoneStatus()?.isDefault, sms: !!smsStatus()?.isDefault });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => subscription.remove();
  }, []);

  if (Platform.OS !== 'android') return null;
  const phone = modules.includes('phone') && phoneStatus() !== null;
  // On a linked device given the phone's SMS, the phone's SMS app is the phone's own.
  const sms = modules.includes('sms') && smsStatus() !== null && !smsMirrored();
  if (!phone && !sms) return null;
  return (
    <>
      {phone ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
              {roles.phone ? t('Erevos is the phone app') : t('Erevos is not the phone app')}
            </Text>
            <Text variant="label" color={roles.phone ? colors.success : colors.danger}>
              {roles.phone ? t('Allowed') : t('Not allowed')}
            </Text>
          </Row>
          <Text variant="caption" tone="muted" style={hint}>
            {t('For the Phone: only the phone app can show the calls on its own screen, and keep the calls and the favourites.')}
          </Text>
          {roles.phone ? null : (
            <Row wrap>
              <Button title={t('Make Erevos the phone app')} kind="secondary" compact onPress={() => requestDefaultPhone()} />
              <Button title={t('Open Default apps')} kind="ghost" compact onPress={() => void openDefaultApps()} />
            </Row>
          )}
        </Card>
      ) : null}
      {sms ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
              {roles.sms ? t('Erevos is the SMS app') : t('Erevos is not the SMS app')}
            </Text>
            <Text variant="label" color={roles.sms ? colors.success : colors.danger}>
              {roles.sms ? t('Allowed') : t('Not allowed')}
            </Text>
          </Row>
          <Text variant="caption" tone="muted" style={hint}>
            {t('For the SMS: only the SMS app can read and send the SMS, and show them beside the chats.')}
          </Text>
          {roles.sms ? null : (
            <Row wrap>
              <Button title={t('Make Erevos the SMS app')} kind="secondary" compact onPress={() => requestDefaultSms()} />
              <Button title={t('Open Default apps')} kind="ghost" compact onPress={() => void openDefaultApps()} />
            </Row>
          )}
        </Card>
      ) : null}
    </>
  );
}

// Hints read better a little larger and looser than captions.
const hint = { fontSize: 14, lineHeight: 20 };
