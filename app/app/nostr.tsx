import { useEffect, useState } from 'react';

import { Button, Card, Chip, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { canNostr } from '../lib/core';
import { t } from '../lib/i18n';
import { nostrOf, setNostr } from '../lib/nostr';
import type { TorWay } from '../lib/relay';
import { isNostrRelay, MAX_NOSTR_RELAYS } from '../lock/e2e-data';
import { loadCurrentSpaceData, NOSTR_RELAYS, updateCurrentSpaceData, type NostrSetting } from '../lock/space-data';

// Whether the space's texts go through Nostr (lib/nostr.ts), on unless changed, and the Nostr
// relays it reads on: the first three unless changed, and any of one's own.

export default function NostrScreen() {
  const [setting, setSetting] = useState<NostrSetting | null>(null);
  const [tor, setTor] = useState<TorWay>('messages');
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');

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
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
