import { useCallback, useEffect, useState } from 'react';

import { loadCurrentSpaceData } from '../lock/space-data';
import { checkForUpdate, integrityStatus, watchIntegrity, WEB_APP, type IntegrityStatus } from '../lib/integrity';
import { PUSH_AVAILABLE, turnOffPush, turnOnPush } from '../lib/web-push';
import { useTheme } from '../theme/context';
import { t } from '../lib/i18n';

import { Button, Card, Row, SectionTitle, Text } from './ui';

// The Lock screen's part on the web app (pwa/): which signed release runs, with the fingerprint
// of the key that signed it, what waits for the next start, and what the service worker refused.
// Nothing in the phone or desktop app.

const when = (ms: number) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function IntegrityCard() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<IntegrityStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [push, setPush] = useState<boolean | null>(null);
  const [pushNote, setPushNote] = useState('');

  const reload = useCallback(() => {
    integrityStatus().then(setStatus, () => setStatus(null));
  }, []);

  useEffect(() => {
    reload();
    return watchIntegrity(reload);
  }, [reload]);

  useEffect(() => {
    loadCurrentSpaceData().then((data) => setPush(data.push), () => setPush(false));
  }, []);

  if (!WEB_APP) return null;

  async function check() {
    setBusy(true);
    try {
      setStatus(await checkForUpdate());
    } finally {
      setBusy(false);
    }
  }

  // Called straight from the tap: Safari asks for the permission only from one.
  function switchPush() {
    setBusy(true);
    setPushNote('');
    const change = push ? turnOffPush().then(() => null) : turnOnPush();
    change
      .then((problem) => {
        if (problem) setPushNote(problem);
        else setPush(!push);
      })
      .finally(() => setBusy(false));
  }

  const current = status?.current;
  return (
    <>
      <SectionTitle title={t('This web app')} />
      <Card>
        {current ? (
          <Text variant="bodyStrong">{t('Release {version}, checked', { version: current.version })}</Text>
        ) : (
          <Text variant="bodyStrong" color={colors.danger}>
            {t('Not checked: no service worker runs Erevos here')}
          </Text>
        )}
        <Text variant="caption" tone="muted" style={hint}>
          {t("Erevos runs only code signed with its release key, kept on this device. The key's fingerprint is")}{' '}
          <Text variant="caption" style={mono}>
            {status?.key ?? '…'}
          </Text>
          {t('. It must match the one you were given with the address of this server.')}
        </Text>
        {status?.pending ? (
          <Text variant="caption" color={colors.success} style={hint}>
            {t('Release {version} is checked and starts the next time Erevos opens.', { version: status.pending.version })}
          </Text>
        ) : null}
        {status?.checked ? (
          <Text variant="caption" tone="muted" style={hint}>
            {t('Last looked for updates {when}.', { when: when(status.checked) })}
            {status.error ? ` ${status.error}` : ''}
          </Text>
        ) : null}
        {status?.refused.length ? (
          <>
            <Text variant="caption" color={colors.danger} style={hint}>
              {t('Refused:')}
            </Text>
            {status.refused.map((refusal) => (
              <Text key={refusal.at} variant="caption" color={colors.danger} style={hint}>
                {when(refusal.at)}: {refusal.reason}
              </Text>
            ))}
          </>
        ) : null}
        <Row wrap>
          <Button title={busy ? t('Looking…') : t('Look for an update')} kind="secondary" compact onPress={check} disabled={busy || !current} />
        </Row>
      </Card>
      {PUSH_AVAILABLE ? (
        <>
          <SectionTitle title={t('Notifications while closed')} />
          <Card>
            <Text variant="bodyStrong">{push ? t('On in this space') : t('Off in this space')}</Text>
            <Text variant="caption" tone="muted" style={hint}>
              {t(
                'When a message comes while Erevos is closed, your relay sends an empty push through this browser\'s push service (Apple\'s on an iPhone), and Erevos shows "New message", nothing more. The push carries no message and no sender, but the push service sees when something comes for this device, and that it uses Erevos. Hidden chats never get notifications. Turned on in more than one space with the same relay, the relay can tell those spaces are on one device.',
              )}
            </Text>
            {pushNote ? (
              <Text variant="caption" color={colors.danger} style={hint}>
                {pushNote}
              </Text>
            ) : null}
            <Row wrap>
              <Button title={push ? t('Turn off') : t('Turn on')} kind="secondary" compact onPress={switchPush} disabled={busy || push === null} />
            </Row>
          </Card>
        </>
      ) : null}
    </>
  );
}

const hint = { fontSize: 14, lineHeight: 20 };
const mono = { fontFamily: 'ui-monospace, Menlo, Consolas, monospace' };
