// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import { Button, Card, Chip, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { canNostr } from '../lib/core';
import { t } from '../lib/i18n';
import { nostrOf, nostrStates, onNostrStates, setNostr, type NostrRelayState } from '../lib/nostr';
import type { TorWay } from '../lib/relay';
import { isNostrRelay, MAX_NOSTR_RELAYS } from '../lock/e2e-data';
import { loadCurrentSpaceData, NOSTR_RELAYS, updateCurrentSpaceData, type NostrSetting } from '../lock/space-data';

// Whether the space's texts go through Nostr (lib/nostr.ts), on unless changed, and the Nostr
// relays it reads on: the first three unless changed, and any of one's own; and what each relay
// did last since Erevos started, so a test shows where a text went and why.

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// What a relay did last, in a line or two.
function stateLines(state: NostrRelayState | undefined, ours: boolean): string[] {
  const { sent, read } = state ?? {};
  const lines = [
    sent
      ? sent.took
        ? t('Took the last text {seconds} s after it was sent, at {time}.', { seconds: (sent.ms / 1000).toFixed(1), time: clock(sent.at) })
        : t('Did not take the last text, at {time}. {why}', { time: clock(sent.at), why: sent.why ?? '' })
      : t('No text given to it since Erevos started.'),
  ];
  if (read) lines.push(read.reading ? t('Read on since {time}.', { time: clock(read.at) }) : t('Could not be read on, at {time}. {why}', { time: clock(read.at), why: read.why ?? '' }));
  else if (ours) lines.push(t('Not read on yet.'));
  return lines;
}

export default function NostrScreen() {
  const [setting, setSetting] = useState<NostrSetting | null>(null);
  const [tor, setTor] = useState<TorWay>('messages');
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [states, setStates] = useState(nostrStates);

  useEffect(() => onNostrStates(() => setStates(nostrStates())), []);

  useEffect(() => {
    loadCurrentSpaceData()
      .then((data) => {
        setSetting(data.nostr);
        setTor(data.tor);
      })
      .catch(() => setNote(t('The settings of this space could not open.')));
  }, []);

  if (!canNostr()) {
    return (
      <Page>
        <Text variant="title">Nostr</Text>
        <Text tone="muted">{t('This build of Erevos has no Nostr yet. It comes with the next build of the app.')}</Text>
      </Page>
    );
  }

  async function keep(next: NostrSetting, said = '') {
    setNote('');
    try {
      await updateCurrentSpaceData({ nostr: next });
      setSetting(next);
      setNostr(nostrOf(tor, next));
      setNote(said || t('Saved.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  function add() {
    if (!setting) return;
    const address = draft.trim().replace(/\/+$/, '');
    if (!isNostrRelay(address)) {
      setNote(t('A Nostr relay address starts with wss://.'));
      return;
    }
    if (setting.relays.includes(address)) {
      setNote(t('That relay is on the list already.'));
      return;
    }
    if (setting.relays.length >= MAX_NOSTR_RELAYS) {
      setNote(t('Five relays at most: remove one first.'));
      return;
    }
    setDraft('');
    void keep({ ...setting, relays: [...setting.relays, address] });
  }

  const relays = setting?.relays ?? [];
  const firsts = relays.join(' ') === NOSTR_RELAYS.join(' ');
  const shown = [...relays, ...[...states.keys()].filter((url) => !relays.includes(url))];

  return (
    <Page>
      <Text variant="title">Nostr</Text>
      <Card>
        <Text variant="bodyStrong">{t('Texts through Nostr')}</Text>
        <Text tone="muted">
          {t(
            'What you write to a contact whose Erevos reads on Nostr too goes through public Nostr relays, through Tor, instead of through your relay. It is end-to-end encrypted as always, and sealed once more for a key your contact gave this chat alone, by a key made for that message alone: the Nostr relays see neither who wrote it nor to whom, and your relay does not see it at all.',
          )}
        </Text>
        <Row wrap>
          <Chip label={t('On')} selected={setting?.on === true} onPress={() => setting && void keep({ ...setting, on: true })} />
          <Chip label={t('Off')} selected={setting?.on === false} onPress={() => setting && void keep({ ...setting, on: false })} />
        </Row>
        {tor === 'off' ? <Text tone="muted">{t('Tor is off for this space, so texts go through your relay. Nostr is used only through Tor.')}</Text> : null}
        <Text tone="muted">
          {t(
            "Should your contact's phone not say within five minutes that it came, it goes through your relay as well, and they see it once. While Tor starts, or when no Nostr relay takes it, it goes through your relay at once.",
          )}
        </Text>
        <Text tone="muted">
          {t(
            'Pictures, files, voice messages, calls, reactions, and the marks that a message came or was read go through your relay, as before. So does what you write to contacts on an iPhone or a computer, which do not read on Nostr.',
          )}
        </Text>
        <Text tone="muted">
          {t(
            'Hidden chats read on Nostr too, while they are open. Closed, they still show "New message": with each text through Nostr, your contact also sends your relay a bell that says nothing.',
          )}
        </Text>
      </Card>

      <SectionTitle title={t('Nostr relays')} />
      <Card>
        <Text variant="caption" tone="muted">
          {t('Your contacts are told the relays you read on, and write to you there. One that takes it is enough.')}
        </Text>
        {relays.map((relay) => (
          <Row key={relay}>
            <Text style={{ flex: 1 }}>{relay}</Text>
            <Button
              title={t('Remove')}
              kind="secondary"
              compact
              disabled={relays.length <= 1}
              onPress={() => setting && void keep({ ...setting, relays: relays.filter((r) => r !== relay) })}
            />
          </Row>
        ))}
        <Input
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel={t('Nostr relay address')}
          placeholder="wss://relay.example.org"
        />
        <Row wrap>
          <Button title={t('Add')} kind="secondary" compact disabled={!draft.trim()} onPress={add} />
          {!firsts ? (
            <Button title={t('The first relays again')} kind="secondary" compact onPress={() => setting && void keep({ ...setting, relays: NOSTR_RELAYS })} />
          ) : null}
        </Row>
      </Card>

      <SectionTitle title={t('What the relays did last')} />
      <Card>
        <Text variant="caption" tone="muted">
          {t("Since Erevos started, kept on this phone only, and only for as long as it runs: whether each relay took the last text it was given, and whether it is read on. Your contacts' relays show here too once a text went to them.")}
        </Text>
        {shown.map((url) => (
          <Text key={url} variant="caption">
            {[url, ...stateLines(states.get(url), relays.includes(url))].join('\n')}
          </Text>
        ))}
      </Card>
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
