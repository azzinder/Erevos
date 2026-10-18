import { useCallback, useEffect, useState } from 'react';

import { checkForUpdate, integrityStatus, watchIntegrity, WEB_APP, type IntegrityStatus } from '../lib/integrity';
import { useTheme } from '../theme/context';

import { Button, Card, Row, SectionTitle, Text } from './ui';

// The Lock screen's part on the web app (pwa/): which signed release runs, with the fingerprint
// of the key that signed it, what waits for the next start, and what the service worker refused.
// Nothing in the phone or desktop app.

const when = (ms: number) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function IntegrityCard() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<IntegrityStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    integrityStatus().then(setStatus, () => setStatus(null));
  }, []);

  useEffect(() => {
    reload();
    return watchIntegrity(reload);
  }, [reload]);

  if (!WEB_APP) return null;

  async function check() {
    setBusy(true);
    try {
      setStatus(await checkForUpdate());
    } finally {
      setBusy(false);
    }
  }

  const current = status?.current;
  return (
    <>
      <SectionTitle title="This web app" />
      <Card>
        {current ? (
          <Text variant="bodyStrong">Release {current.version}, checked</Text>
        ) : (
          <Text variant="bodyStrong" color={colors.danger}>
            Not checked: no service worker runs Erevos here
          </Text>
        )}
        <Text variant="caption" tone="muted" style={hint}>
          Erevos runs only code signed with its release key, kept on this device. The key's fingerprint is{' '}
          <Text variant="caption" style={mono}>
            {status?.key ?? '…'}
          </Text>
          . It must match the one you were given with the address of this server.
        </Text>
        {status?.pending ? (
          <Text variant="caption" color={colors.success} style={hint}>
            Release {status.pending.version} is checked and starts the next time Erevos opens.
          </Text>
        ) : null}
        {status?.checked ? (
          <Text variant="caption" tone="muted" style={hint}>
            Last looked for updates {when(status.checked)}.{status.error ? ` ${status.error}` : ''}
          </Text>
        ) : null}
        {status?.refused.length ? (
          <>
            <Text variant="caption" color={colors.danger} style={hint}>
              Refused:
            </Text>
            {status.refused.map((refusal) => (
              <Text key={refusal.at} variant="caption" color={colors.danger} style={hint}>
                {when(refusal.at)}: {refusal.reason}
              </Text>
            ))}
          </>
        ) : null}
        <Row wrap>
          <Button title={busy ? 'Looking…' : 'Look for an update'} kind="secondary" compact onPress={check} disabled={busy || !current} />
        </Row>
      </Card>
    </>
  );
}

const hint = { fontSize: 14, lineHeight: 20 };
const mono = { fontFamily: 'ui-monospace, Menlo, Consolas, monospace' };
