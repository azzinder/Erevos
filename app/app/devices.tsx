import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Share } from 'react-native';

import { QrCode } from '../components/QrCode';
import { Button, Card, Chip, Field, Input, Page, Row, SectionTitle, Text, TextButton } from '../components/ui';
import { ask } from '../lib/alert';
import { onLinked, spaceLinks, type DeviceInfo, type HistoryChoice, type Links } from '../lib/devices';
import { mark, t } from '../lib/i18n';
import { checkLinkCode, linkCodeLink } from '../lib/link-code';
import { createQueue, toHex } from '../lib/relay';
import { SHELL } from '../lib/shell';
import { loadCurrentSpaceData, updateCurrentSpaceData } from '../lock/space-data';

// Menu → Linked devices (lib/devices.ts, docs/linked-devices.md). On a computer or in a browser:
// Link to my phone shows a code for the phone to read, then the code both show, to compare. On the
// phone: the code read (the camera opens erevos://link?... here, see app/link.tsx) or pasted, the
// code to compare, what of the history goes, and Link; then the devices linked, each with Unlink.
// Nothing goes anywhere until Link is tapped on the phone, and the chats only once They match is
// tapped on the computer.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];
const DAY = 24 * 3600 * 1000;
type Period = 'all' | 'month' | 'week' | 'none';
const PERIODS: { period: Period; label: string }[] = [
  { period: 'all', label: mark('All of it') },
  { period: 'month', label: mark('The last month') },
  { period: 'week', label: mark('The last week') },
  { period: 'none', label: mark('None') },
];

function sinceOf(period: Period): number | null {
  if (period === 'none') return null;
  if (period === 'all') return 0;
  return Date.now() - (period === 'month' ? 30 : 7) * DAY;
}

// What a device is called unless it is given a name.
function ownName(): string {
  if (SHELL === 'electron') return t('Computer');
  if (Platform.OS === 'web') return t('Web browser');
  return t('Phone');
}

function whenText(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Devices() {
  const params = useLocalSearchParams<{ key?: string; id?: string; relay?: string; rk?: string; s?: string; name?: string }>();
  const [links, setLinks] = useState<Links | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [role, setRole] = useState<ReturnType<Links['role']>>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // On a computer: its relay, when the space has none yet, and the code it shows.
  const [relayUrl, setRelayUrl] = useState('');
  const [relayToken, setRelayToken] = useState('');
  const [hasQueue, setHasQueue] = useState(false);
  const [name, setName] = useState(ownName);
  const [offer, setOffer] = useState<string | null>(null);
  // On the phone: the code read or pasted, what it asks, and what of the history goes.
  const [pasted, setPasted] = useState('');
  const [asked, setAsked] = useState<{ name: string; code: string } | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [files, setFiles] = useState(true);
  const [again, setAgain] = useState<string | null>(null);

  const refresh = (l: Links) => {
    setDevices(l.devices());
    setRole(l.role());
    setAnswer(l.answerCode());
  };

  useEffect(() => {
    let active = true;
    let stop: () => void = () => undefined;
    spaceLinks()
      .then(async (l) => {
        if (!active) return;
        setLinks(l);
        refresh(l);
        stop = onLinked(() => active && refresh(l));
        const data = await loadCurrentSpaceData();
        if (!active) return;
        setRelayUrl(data.url);
        setRelayToken(data.token);
        setHasQueue(!!data.ownQueue);
        const shown = await l.shownOffer().catch(() => null);
        if (active) setOffer(shown);
      })
      .catch((error) => active && setNote(errorText(error)));
    return () => {
      active = false;
      stop();
    };
  }, []);

  // A code the camera opened Erevos with: read at once, but nothing goes until Link is tapped.
  const opened = checkLinkCode(params.key, params.id, params.relay, params.rk ?? '', params.s, params.name ?? '');
  useEffect(() => {
    if (!links || !opened) return;
    void read(linkCodeLink(opened));
  }, [links, params.key]);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setNote('');
    try {
      await work();
    } catch (error) {
      setNote(errorText(error));
    } finally {
      setBusy(false);
      if (links) refresh(links);
    }
  }

  // ---- On a computer ----

  const showCode = () =>
    run(async () => {
      if (!links) return;
      const url = relayUrl.trim();
      if (!/^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(url)) throw new Error(t('A relay address starts with ws:// or wss://.'));
      // The phone answers on this space's queue, so there has to be one.
      if (!hasQueue) {
        const ids = await createQueue({ url, token: relayToken.trim() || undefined });
        await updateCurrentSpaceData({ url, token: relayToken.trim(), ownQueue: { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } });
        setHasQueue(true);
      }
      setOffer(await links.makeOffer(name));
    });

  async function copy(text: string) {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
        setNote(t('Code copied. Paste it on the phone in Menu → Linked devices.'));
        return;
      }
      await Share.share({ message: text });
    } catch (error) {
      setNote(errorText(error));
    }
  }

  const confirm = () =>
    run(async () => {
      if (!links || !answer) return;
      await links.confirm(answer);
      setOffer(null);
      setNote(t('Linked. The chats come from the phone, and with them the messages it chose to bring over.'));
    });

  const differ = () =>
    run(async () => {
      if (!links) return;
      await links.refuse();
      setOffer(null);
      setNote(t('Not linked. Someone else may have read the code. Make a new one, and link again.'));
    });

  // ---- On the phone ----

  async function read(text: string) {
    await run(async () => {
      if (!links) return;
      setAsked(await links.prepare(text));
    });
  }

  const link = () =>
    run(async () => {
      if (!links || !asked) return;
      await links.link({ since: sinceOf(period), files }, t('Phone'));
      setAsked(null);
      setPasted('');
      setNote(t('Now the computer shows a code too. If it is {code}, tap They match there.', { code: asked.code }));
    });

  function unlink(device: DeviceInfo) {
    const own = role === 'linked';
    ask(
      own ? t('Unlink this device') : t('Unlink {name}', { name: device.name }),
      own
        ? t("The account's chats leave this device, messages and all. The phone keeps them.")
        : t('Nothing more goes to it, and nothing it sends is taken. What it has stays on it, behind its own lock.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Unlink'),
          style: 'destructive',
          onPress: () =>
            void run(async () => {
              if (!links) return;
              const told = await links.unlink(device.id);
              setNote(told ? t('Unlinked.') : own ? t('Unlinked here. The phone was not told: unlink this device there too.') : t('Unlinked. The device was not told, and gets nothing more.'));
            }),
        },
      ],
    );
  }

  const bringAgain = (id: string) =>
    run(async () => {
      if (!links) return;
      const choice: HistoryChoice = { since: sinceOf(period), files };
      await links.bringAgain(id, choice);
      setAgain(null);
      setNote(t('The messages go to it now. What it has already is not kept twice.'));
    });

  const choosing = (
    <>
      <Field label={t('Messages to bring over')}>
        <Row wrap>
          {PERIODS.filter((p) => p.period !== 'none' || !again).map((p) => (
            <Chip key={p.period} label={t(p.label)} selected={period === p.period} onPress={() => setPeriod(p.period)} />
          ))}
        </Row>
      </Field>
      <Row wrap>
        <Chip label={t('Photos and files too')} selected={files} onPress={() => setFiles(!files)} />
      </Row>
    </>
  );

  if (role === 'linked') {
    const phone = devices[0];
    return (
      <Page>
        <Text variant="title">{t('Linked devices')}</Text>
        <Card>
          <Text variant="heading">{t('Linked to {name}', { name: phone?.name || t('Phone') })}</Text>
          {phone ? <Text tone="muted">{t('Since {when}. Last heard from {last}.', { when: whenText(phone.since), last: whenText(phone.heard) })}</Text> : null}
          <Text tone="muted">
            {t(
              "This device has the chats of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls and groups stay on the phone for now.",
            )}
          </Text>
          {phone ? <Button title={t('Unlink this device')} kind="danger" disabled={busy} onPress={() => unlink(phone)} /> : null}
        </Card>
        {note ? <Text tone="muted">{note}</Text> : null}
      </Page>
    );
  }

  return (
    <Page>
      <Text variant="title">{t('Linked devices')}</Text>
      <Text tone="muted">
        {t(
          'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go.',
        )}
      </Text>

      {asked ? (
        <Card>
          <Text variant="heading">{t('Link {name}', { name: asked.name || t('Computer') })}</Text>
          <Text tone="muted">{t('Once you tap Link, the computer shows this code. Link only if it shows the same:')}</Text>
          <Text variant="mono" selectable style={{ fontSize: 20 }}>
            {asked.code}
          </Text>
          {choosing}
          <Button title={t('Link')} disabled={busy} onPress={() => void link()} />
          <TextButton title={t('Cancel')} onPress={() => setAsked(null)} />
        </Card>
      ) : null}

      {devices.length > 0 ? (
        <>
          <SectionTitle title={t('Devices')} />
          {devices.map((device) => (
            <Card key={device.id}>
              <Text variant="heading">{device.name}</Text>
              <Text tone="muted">
                {device.linked
                  ? device.heard
                    ? t('Linked {when}. Last heard from {last}.', { when: whenText(device.since), last: whenText(device.heard) })
                    : t('Linked {when}.', { when: whenText(device.since) })
                  : t('Waiting for They match to be tapped on it.')}
              </Text>
              {device.history ? <Text variant="caption" tone="faint">{t('Bringing over messages: {n} so far.', { n: device.history.done })}</Text> : null}
              {again === device.id ? (
                <>
                  {choosing}
                  <Button title={t('Bring over')} disabled={busy} onPress={() => void bringAgain(device.id)} />
                  <TextButton title={t('Cancel')} onPress={() => setAgain(null)} />
                </>
              ) : (
                <Row wrap>
                  {device.linked ? <Button title={t('Bring over messages again')} kind="secondary" compact disabled={busy} onPress={() => setAgain(device.id)} /> : null}
                  <Button title={t('Unlink')} kind="danger" compact disabled={busy} onPress={() => unlink(device)} />
                </Row>
              )}
            </Card>
          ))}
        </>
      ) : null}

      {!asked ? (
        <Card>
          <Text variant="heading">{t('Link a computer to this phone')}</Text>
          <Text tone="muted">
            {t('On the computer, open Menu → Linked devices → Link to my phone. Then scan its code with this phone\'s camera, or copy it there and paste it here.')}
          </Text>
          <Field label={t('Code from the computer')}>
            <Input value={pasted} onChangeText={setPasted} placeholder="erevos://link?…" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Button title={t('Next')} kind="secondary" disabled={busy || !pasted.trim()} onPress={() => void read(pasted)} />
        </Card>
      ) : null}

      {role === null && !asked ? (
        <Card>
          <Text variant="heading">{t('Link to my phone')}</Text>
          {answer ? (
            <>
              <Text tone="muted">{t('The phone read the code. Does it show this one too?')}</Text>
              <Text variant="mono" selectable style={{ fontSize: 20 }}>
                {answer}
              </Text>
              <Button title={t('They match')} disabled={busy} onPress={() => void confirm()} />
              <Button title={t('They differ')} kind="secondary" disabled={busy} onPress={() => void differ()} />
            </>
          ) : offer ? (
            <>
              <Text tone="muted">
                {t('On the phone that holds the account, scan this code with the camera, or paste it in Menu → Linked devices. This space must have no chats of its own.')}
              </Text>
              <QrCode text={offer} size={240} />
              <Button title={Platform.OS === 'web' ? t('Copy the code') : t('Share the code')} kind="secondary" onPress={() => void copy(offer)} />
              <Text variant="caption" tone="faint">
                {t('Waiting for the phone. The code works for half an hour.')}
              </Text>
            </>
          ) : (
            <>
              <Text tone="muted">
                {t('Use this when this device is the computer: its chats become those of the phone that holds the account.')}
              </Text>
              {!hasQueue ? (
                <>
                  <Field label={t('Relay address')}>
                    <Input value={relayUrl} onChangeText={setRelayUrl} placeholder="wss://relay.example" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
                  </Field>
                  <Field label={t('Token (optional)')}>
                    <Input value={relayToken} onChangeText={setRelayToken} placeholder={t('Token, if the relay needs one')} autoCapitalize="none" autoCorrect={false} secureTextEntry />
                  </Field>
                </>
              ) : null}
              <Field label={t('Name of this device')}>
                <Input value={name} onChangeText={setName} maxLength={40} />
              </Field>
              <Button title={t('Link to my phone')} disabled={busy} onPress={() => void showCode()} />
            </>
          )}
        </Card>
      ) : null}

      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
