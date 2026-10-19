import { useEffect, useState } from 'react';

import { Button, Card, Chip, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { BRIDGE_CHOICES, NO_BRIDGES, readBridgeLines, type BridgeChoice, type Bridges } from '../lib/bridges';
import { canTor } from '../lib/core';
import { mark, plural, t } from '../lib/i18n';
import { applyTor, NoBridgesError, torStatus, type TorStatus } from '../lib/tor';
import { loadCurrentSpaceData, updateCurrentSpaceData } from '../lock/space-data';

// The space's "Through Tor" switch (lib/tor.ts), off unless turned on, how far Tor is, and the
// bridges it goes through where it is blocked (lib/bridges.ts), none unless chosen.

const LOOK_EVERY = 2000;

const BRIDGE_LABELS: Record<BridgeChoice, string> = {
  none: mark('No bridges'),
  obfs4: 'obfs4',
  snowflake: 'Snowflake',
  own: mark('My own'),
};

export default function TorScreen() {
  const [on, setOn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<TorStatus | null>(null);
  const [note, setNote] = useState('');
  const [bridges, setBridges] = useState<Bridges>(NO_BRIDGES);
  // The choice shown: one's own lines are used only once saved.
  const [picked, setPicked] = useState<BridgeChoice>('none');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    loadCurrentSpaceData()
      .then((data) => {
        setOn(data.tor);
        setBridges(data.bridges);
        setPicked(data.bridges.use);
        setDraft(data.bridges.own);
      })
      .catch(() => setNote(t('The settings of this space could not open.')));
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
        <Text tone="muted">{t('This build of Erevos has no Tor yet. It comes with the next build of the app.')}</Text>
      </Page>
    );
  }

  function shown(error: unknown): string {
    if (error instanceof NoBridgesError) return t('None of these is a bridge Erevos can use, so Tor stays off and messages wait.');
    return error instanceof Error ? error.message : String(error);
  }

  async function toggle() {
    setNote('');
    const next = !on;
    try {
      await updateCurrentSpaceData({ tor: next });
      setOn(next);
      await applyTor(next, bridges);
    } catch (error) {
      setNote(shown(error));
    }
  }

  async function useBridges(next: Bridges) {
    setNote('');
    try {
      await updateCurrentSpaceData({ bridges: next });
      setBridges(next);
      if (on) await applyTor(true, next);
      setNote(t('Saved.'));
    } catch (error) {
      setNote(shown(error));
    }
  }

  function pick(choice: BridgeChoice) {
    setPicked(choice);
    if (choice !== 'own') void useBridges({ use: choice, own: bridges.own });
  }

  const own = readBridgeLines(draft);

  return (
    <Page>
      <Text variant="title">Tor</Text>
      <Card>
        <Text variant="bodyStrong">{on ? t('Through Tor: on') : t('Through Tor: off')}</Text>
        <Text tone="muted">
          {t(
            "Through Tor, this space reaches its relays through the Tor network. The relay then does not see this phone's internet address, and the phone company or the Wi-Fi sees only that Tor is used, not which relay. Messages come and go slower, and the first start of Tor takes a while.",
          )}
        </Text>
        <Text tone="muted">
          {t(
            'While Tor is on, nothing goes to a relay without it: when Tor cannot reach the relay, the message waits. Calls do not go through Tor: their sound and picture go straight between the phones, or through the call relay. Nearby phones and SMS do not use the internet, so Tor has nothing to do with them.',
          )}
        </Text>
        <Button title={on ? t('Turn Tor off') : t('Turn Tor on')} kind={on ? 'secondary' : 'primary'} onPress={() => void toggle()} />
      </Card>
      {on && status ? (
        <Card>
          <Text variant="bodyStrong">{status.ready ? t('Tor is ready') : t('Tor is starting')}</Text>
          <Text variant="caption" tone="faint">
            {status.text}
          </Text>
        </Card>
      ) : null}

      <SectionTitle title={t('Bridges')} />
      <Row wrap>
        {BRIDGE_CHOICES.map((choice) => (
          <Chip key={choice} label={t(BRIDGE_LABELS[choice])} selected={picked === choice} onPress={() => pick(choice)} />
        ))}
      </Row>
      <Card>
        <Text variant="caption" tone="muted">
          {picked === 'none'
            ? t('Tor goes straight to its relays. Where Tor is blocked, choose bridges: Tor then reaches its network only through them.')
            : picked === 'obfs4'
              ? t('The obfs4 bridges Tor Browser comes with: to whoever watches the network, Tor looks like random bytes. Where a censor blocks these too, choose Snowflake or bridges of your own.')
              : picked === 'snowflake'
                ? t("Snowflake goes through volunteers' browsers, over WebRTC, the way a video call does. To find one, Erevos asks Snowflake's broker through a CDN, behind another site's name, and STUN servers tell the phone its own address: they see that address, never your messages. Slower, and hard to block.")
                : t('Bridge lines from bridges.torproject.org, from bridges@torproject.org by email, or from @GetBridgesBot on Telegram, one per line. obfs4, Snowflake, WebTunnel, meek and plain bridges work.')}
        </Text>
        {picked === 'own' ? (
          <>
            <Input
              value={draft}
              onChangeText={setDraft}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t('Bridge lines')}
              placeholder="obfs4 192.0.2.1:443 0123456789ABCDEF… cert=… iat-mode=0"
              style={{ minHeight: 120, fontSize: 13, textAlignVertical: 'top' }}
            />
            {own.wrong.length > 0 ? (
              <Text variant="caption" tone="muted">
                {t('Not a bridge line Erevos can use: {line}', { line: own.wrong[0] })}
              </Text>
            ) : own.lines.length > 0 ? (
              <Text variant="caption" tone="faint">
                {plural(own.lines.length, '{n} bridge', '{n} bridges')}
              </Text>
            ) : null}
            <Row wrap>
              <Button
                title={t('Use these bridges')}
                kind="secondary"
                compact
                disabled={own.lines.length === 0 || own.wrong.length > 0}
                onPress={() => void useBridges({ use: 'own', own: own.lines.join('\n') })}
              />
            </Row>
            {bridges.use !== 'own' ? (
              <Text variant="caption" tone="faint">
                {t('Not in use until you tap Use these bridges.')}
              </Text>
            ) : null}
          </>
        ) : null}
        <Text variant="caption" tone="muted">
          {t('With bridges, Tor never goes straight to its relays: when no bridge answers, messages wait. Bridges count only while Tor is on.')}
        </Text>
      </Card>
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
