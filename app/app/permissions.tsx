import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { Button, Card, Page, Row, SectionTitle, Text } from '../components/ui';
import { backgroundState } from '../lib/background';
import { t } from '../lib/i18n';
import { makerOf, NEEDED, type Check, type CheckId, type Maker } from '../lib/permission-checks';
import { fix, HAS_CHECKS, makerDone, readChecks } from '../lib/permissions';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

// Permissions (home menu → Permissions, and by itself after a new version when something calls
// need is missing, lib/permissions.ts): what Android and the phone maker let Erevos do, each with
// why it matters and the button that asks for it.

function title(id: CheckId): string {
  switch (id) {
    case 'notices':
      return t('Notices');
    case 'calls':
      return t('The call notice');
    case 'fullScreen':
      return t('Calls over the lock screen');
    case 'battery':
      return t('Running on battery');
    case 'data':
      return t('Mobile data in the background');
    case 'maker':
      return t("The phone maker's own setting");
    case 'microphone':
      return t('Microphone');
    case 'camera':
      return t('Camera');
    case 'nearby':
      return t('Phones nearby');
    case 'contacts':
      return t('Contacts');
    case 'alarms':
      return t('Exact times');
  }
}

function why(id: CheckId): string {
  switch (id) {
    case 'notices':
      return t('For "Incoming call" to show while Erevos is closed, with its buttons, and for the notice that messages came. Without notices a call may not ring at all on some phones.');
    case 'calls':
      return t('The "Calls" notices are turned off for Erevos: a call rings, but nothing shows to answer it from.');
    case 'fullScreen':
      return t('So a call fills the screen over the lock screen, as a phone call does.');
    case 'battery':
      return t("Android's battery saving stops apps a while after they go to the background. Left out of it, Erevos keeps waiting for calls and messages.");
    case 'data':
      return t('Data Saver cuts mobile data to apps in the background: on mobile data nothing comes while Erevos is closed.');
    case 'maker':
      return t("Some phone makers stop apps in the background with a setting of their own, beyond Android's, and Erevos cannot see it.");
    case 'microphone':
      return t('For calls and voice messages. Without it a call can be answered but you are not heard.');
    case 'camera':
      return t('For video calls, photos and reading QR codes.');
    case 'nearby':
      return t('For chats with phones nearby over Bluetooth and Wi-Fi, without internet.');
    case 'contacts':
      return t("For the names of the phone's contacts in Phone, SMS and Contacts.");
    case 'alarms':
      return t('For SMS sent later to go at the minute they are set for.');
  }
}

/** Where the maker keeps its setting, as its phones of the last years name it. */
function makerSteps(maker: Maker): string {
  switch (maker) {
    case 'huawei':
      return t('On this phone (Huawei or Honor): Settings → Battery → App launch → Erevos. Turn off Manage automatically, and keep Auto-launch, Secondary launch and Run in background on.');
    case 'xiaomi':
      return t('On this phone (Xiaomi): Security → Autostart → Erevos on. Then Settings → Apps → Erevos → Battery saver → No restrictions.');
    case 'oppo':
      return t('On this phone (OPPO, realme or OnePlus): Settings → Apps → Erevos → Battery usage. Allow background activity and auto launch.');
    case 'vivo':
      return t('On this phone (vivo): Settings → Battery → Background power consumption → Erevos: allow. Then i Manager → Autostart → Erevos on.');
    case 'samsung':
      return t('On this phone (Samsung): Settings → Battery → Background usage limits. Erevos must not be in Sleeping apps or Deep sleeping apps; add it to Never sleeping apps.');
    case 'asus':
      return t('On this phone (ASUS): Mobile Manager → Auto-start Manager → Erevos: allow.');
  }
}

function action(id: CheckId): string {
  switch (id) {
    case 'notices':
    case 'microphone':
    case 'camera':
    case 'nearby':
    case 'contacts':
      return t('Allow');
    default:
      return t('Open the setting');
  }
}

function CheckCard({ check, maker, onChanged }: { check: Check; maker: Maker | null; onChanged: () => void }) {
  const colors = useColors();
  const state =
    check.state === 'ok'
      ? { label: check.id === 'maker' ? t('Checked') : t('Allowed'), color: colors.success }
      : check.state === 'yours'
        ? { label: t('Check it yourself'), color: colors.warning }
        : { label: t('Not allowed'), color: colors.danger };
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
          {title(check.id)}
        </Text>
        <Text variant="label" color={state.color}>
          {state.label}
        </Text>
      </Row>
      <Text variant="caption" tone="muted" style={hint}>
        {why(check.id)}
      </Text>
      {check.id === 'maker' && maker ? (
        <Text variant="caption" style={hint}>
          {makerSteps(maker)}
        </Text>
      ) : null}
      {check.state !== 'ok' ? (
        <Row wrap>
          <Button title={action(check.id)} kind="secondary" compact onPress={() => void fix(check.id).then(onChanged)} />
          {check.id === 'maker' ? <Button title={t('I did it')} kind="ghost" compact onPress={() => void makerDone(true).then(onChanged)} /> : null}
        </Row>
      ) : check.id === 'maker' ? (
        <Row wrap>
          <Button title={t('Mark as not done')} kind="ghost" compact onPress={() => void makerDone(false).then(onChanged)} />
        </Row>
      ) : null}
    </Card>
  );
}

export default function PermissionsScreen() {
  const { after } = useLocalSearchParams<{ after?: string }>();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const maker = makerOf(backgroundState()?.maker);

  const read = useCallback(() => {
    void readChecks()
      .then(setChecks)
      .catch(() => setChecks([]));
  }, []);

  useEffect(() => {
    read();
    // Back from Android's question or settings: what it allows now.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => subscription.remove();
  }, [read]);

  const needed = checks?.filter((check) => NEEDED.has(check.id)) ?? [];
  const others = checks?.filter((check) => !NEEDED.has(check.id)) ?? [];
  const missing = needed.filter((check) => check.state !== 'ok').length;
  return (
    <Page>
      <Text variant="title">{t('Permissions')}</Text>
      <Card>
        <Text tone="muted" style={hint}>
          {after === 'update'
            ? t('Erevos is new on this phone, or was just updated, so it looked at what Android lets it do. Some of it is missing, and without it a call may not ring, or messages may not come, while Erevos is closed.')
            : t('What Android, and the phone maker, let Erevos do on this phone.')}
        </Text>
        <Text variant="caption" tone="muted" style={hint}>
          {t('Android lets each app do only what you allow. Erevos has no push service: while it is closed, it keeps running quietly to wait for calls and messages, and some phones stop that unless allowed. Each button opens Android\'s own question or setting; nothing is sent anywhere. Erevos looks again after each new version, and here any time (menu → Permissions).')}
        </Text>
        <Text variant="caption" tone="muted" style={hint}>
          {t('After the phone restarts, open Erevos and your space once: until then it cannot read anything, so it cannot ring.')}
        </Text>
      </Card>
      {!HAS_CHECKS ? (
        <Card>
          <Text tone="muted">{t('Only an Android phone has these to check. A computer, a browser and Sailfish OS ask for what they need when it is first used.')}</Text>
        </Card>
      ) : checks === null ? null : (
        <>
          <SectionTitle title={missing ? t('For calls and messages in the background · {n} missing', { n: missing }) : t('For calls and messages in the background · all allowed')} />
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
