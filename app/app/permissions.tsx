// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, View } from 'react-native';

import { CheckCard } from '../components/check-card';
import { DefaultAppCards } from '../components/default-apps';
import { moduleNames } from '../components/module-texts';
import { Card, Page, SectionTitle, Text } from '../components/ui';
import { backgroundState } from '../lib/background';
import { plural, t } from '../lib/i18n';
import { moduleList, modulesOn } from '../lib/modules';
import { lacking, makerOf, type Check } from '../lib/permission-checks';
import { HAS_CHECKS, readChecks } from '../lib/permissions';
import { space } from '../theme/colors';

// Permissions (Settings → General → Permissions, and by itself after a new version when something calls
// need is missing, lib/permissions.ts): what Android and the phone maker let Erevos do, each with
// why it matters and the button that asks for it. In the web app, what the browser lets it do
// (lib/permissions.web.ts), with the browser's own question, or where its setting is. Only what
// the modules on use (lib/modules.ts); or, with `for`, what the modules just turned on use
// (app/modules.tsx), as the first start's steps asked for it (app/first-steps.tsx). After a
// backup was restored on Android (`after` restore), all of it for the modules on, with which app
// is the phone's for calls and SMS: they stay with each phone, and no backup holds them.

const WEB = Platform.OS === 'web';

export default function PermissionsScreen() {
  const { after, for: turned } = useLocalSearchParams<{ after?: string; for?: string }>();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const maker = makerOf(backgroundState()?.maker);
  const only = useMemo(() => moduleList(turned), [turned]);
  const restored = after === 'restore';
  const roles = only.length ? only : restored ? modulesOn() : [];

  const read = useCallback(() => {
    void (only.length ? readChecks(only) : readChecks())
      .then(setChecks)
      .catch(() => setChecks([]));
  }, [only]);

  useEffect(() => {
    read();
    // Back from Android's question or settings, or the browser's: what it allows now.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => subscription.remove();
  }, [read]);

  const needed = checks?.filter((check) => check.needed) ?? [];
  const others = checks?.filter((check) => !check.needed) ?? [];
  const missing = needed.filter(lacking).length;
  return (
    <Page>
      <Text variant="title">{t('Permissions')}</Text>
      {only.length ? (
        <Card>
          <Text tone="muted" style={hint}>
            {t('You turned on {modules}. This is what it needs to work while Erevos is closed; you can also allow it later, here (Settings → General → Permissions).', { modules: moduleNames(only) })}
          </Text>
        </Card>
      ) : null}
      {restored && !only.length ? (
        <Card>
          <Text tone="muted" style={hint}>
            {t('A backup was just restored. What Android lets Erevos do, and which apps make calls and send SMS, stay with each phone and come with no backup: this is what the modules on need on this phone.')}
          </Text>
        </Card>
      ) : null}
      {roles.length ? <DefaultAppCards modules={roles} /> : null}
      <Card>
        {WEB ? (
          <>
            <Text tone="muted" style={hint}>
              {after === 'update'
                ? t('Erevos was just updated, or is new in this browser, so it looked at what the browser lets it do. Some of it is missing, and without it a call may not be heard, notifications may not come, or the browser may clear Erevos\'s data.')
                : t('What this browser lets Erevos do.')}
            </Text>
            <Text variant="caption" tone="muted" style={hint}>
              {t('A browser lets a web app do only what you allow, and asks for most of it the first time it is used. In a browser Erevos runs only while it is open; while it is closed, a notification can say only that a message came. Each button asks the browser\'s own question. The check itself only reads what the browser says, and sends nothing anywhere. Erevos looks again after each new release, and here any time (Settings → General → Permissions).')}
            </Text>
            <Text variant="caption" tone="muted" style={hint}>
              {t("A browser does not let Erevos see battery saving (an iPhone's Low Power Mode neither), so it is not among these.")}
            </Text>
          </>
        ) : (
          <>
            <Text tone="muted" style={hint}>
              {after === 'update'
                ? t('Erevos is new on this phone, or was just updated, so it looked at what Android lets it do. Some of it is missing, and without it a call may not ring, or messages may not come, while Erevos is closed.')
                : t('What Android, and the phone maker, let Erevos do on this phone.')}
            </Text>
            <Text variant="caption" tone="muted" style={hint}>
              {t('Android lets each app do only what you allow. Erevos has no push service: while it is closed, it keeps running quietly to wait for calls and messages, and some phones stop that unless allowed. Each button opens Android\'s own question or setting; nothing is sent anywhere. Erevos looks again after each new version, and here any time (Settings → General → Permissions).')}
            </Text>
            <Text variant="caption" tone="muted" style={hint}>
              {t('After the phone restarts, open Erevos and your space once: until then it cannot read anything, so it cannot ring.')}
            </Text>
          </>
        )}
      </Card>
      {!HAS_CHECKS ? (
        <Card>
          <Text tone="muted">{t('Only an Android phone and the web app in a browser have these to check. A computer and Sailfish OS ask for what they need when it is first used.')}</Text>
        </Card>
      ) : checks === null ? null : (
        <>
          <SectionTitle
            title={
              WEB
                ? missing
                  ? plural(missing, 'For calls, messages and your data · {n} is missing', 'For calls, messages and your data · {n} are missing')
                  : t('For calls, messages and your data · nothing missing')
                : missing
                  ? plural(missing, 'For calls and messages in the background · {n} is missing', 'For calls and messages in the background · {n} are missing')
                  : t('For calls and messages in the background · all allowed')
            }
          />
          <View style={{ gap: space.md }}>
            {needed.map((check) => (
              <CheckCard key={check.id} check={check} maker={maker} onChanged={read} />
            ))}
          </View>
          {others.length ? <SectionTitle title={t('For other things')} /> : null}
          <View style={{ gap: space.md }}>
            {others.map((check) => (
              <CheckCard key={check.id} check={check} maker={maker} onChanged={read} />
            ))}
          </View>
        </>
      )}
    </Page>
  );
}

// Hints read better a little larger and looser than captions.
const hint = { fontSize: 14, lineHeight: 20 };
