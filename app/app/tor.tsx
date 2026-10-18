import { useEffect, useState } from 'react';

import { Button, Card, Page, Text } from '../components/ui';
import { canTor } from '../lib/core';
import { applyTor, torStatus, type TorStatus } from '../lib/tor';
import { loadCurrentSpaceData, updateCurrentSpaceData } from '../lock/space-data';

// The space's "Through Tor" switch (lib/tor.ts), off unless turned on, and how far Tor is.

const LOOK_EVERY = 2000;

export default function TorScreen() {
  const [on, setOn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<TorStatus | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    loadCurrentSpaceData()
      .then((data) => setOn(data.tor))
      .catch(() => setNote('The settings of this space could not open.'));
  }, []);

  useEffect(() => {
    if (!on) {
      setStatus(null);
      return;
    }
    let stopped = false;
    const look = () =>
      torStatus()
        .then((next) => !stopped && setStatus(next))
        .catch(() => undefined);
    look();
    const timer = setInterval(look, LOOK_EVERY);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [on]);

  if (!canTor()) {
    return (
      <Page>
        <Text variant="title">Tor</Text>
        <Text tone="muted">This build of Erevos has no Tor yet. It comes with the next build of the app.</Text>
      </Page>
    );
  }

  async function toggle() {
    setNote('');
    const next = !on;
    try {
      await updateCurrentSpaceData({ tor: next });
      setOn(next);
      await applyTor(next);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Page>
      <Text variant="title">Tor</Text>
      <Card>
        <Text variant="bodyStrong">{on ? 'Through Tor: on' : 'Through Tor: off'}</Text>
        <Text tone="muted">
          Through Tor, this space reaches its relays through the Tor network. The relay then does not see this
          phone's internet address, and the phone company or the Wi-Fi sees only that Tor is used, not which relay.
          Messages come and go slower, and the first start of Tor takes a while.
        </Text>
        <Text tone="muted">
          While Tor is on, nothing goes to a relay without it: when Tor cannot reach the relay, the message waits.
          Calls do not go through Tor: their sound and picture go straight between the phones, or through the call
          relay. Nearby phones and SMS do not use the internet, so Tor has nothing to do with them.
        </Text>
        <Button title={on ? 'Turn Tor off' : 'Turn Tor on'} kind={on ? 'secondary' : 'primary'} onPress={() => void toggle()} />
      </Card>
      {on && status ? (
        <Card>
          <Text variant="bodyStrong">{status.ready ? 'Tor is ready' : 'Tor is starting'}</Text>
          <Text variant="caption" tone="faint">
            {status.text}
          </Text>
        </Card>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
