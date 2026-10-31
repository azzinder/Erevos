// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useState } from 'react';
import { View } from 'react-native';

import { plural, t } from '../lib/i18n';
import type { FoundChannel } from '../lib/xmpp-muc';
import { xmppSearchChannels, xmppServerChannels } from '../lib/xmpp-store';
import { space } from '../theme/colors';

import { Button, Card, Input, Row, SectionTitle, Text } from './ui';

// Groups to join, in the XMPP screen (app/xmpp.tsx): the ones the account's own server lists, and
// a search in the public channels of any server (search.jabber.network, XEP-0433), which learns
// what was looked for, as the screen says before it asks. Joining by hand is the card above.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function XmppFind({ busy, join }: { busy: boolean; join: (jid: string) => void }) {
  const [listed, setListed] = useState<FoundChannel[] | null>(null);
  const [term, setTerm] = useState('');
  const [found, setFound] = useState<FoundChannel[] | null>(null);
  const [asking, setAsking] = useState<'list' | 'search' | null>(null);
  const [note, setNote] = useState('');

  async function ask(what: 'list' | 'search', job: () => Promise<void>) {
    setAsking(what);
    setNote('');
    try {
      await job();
    } catch (error) {
      setNote(errorText(error));
    } finally {
      setAsking(null);
    }
  }

  const row = (channel: FoundChannel) => (
    <View key={channel.jid} style={{ gap: 2, paddingTop: space.xs }}>
      <Text variant="bodyStrong" numberOfLines={1}>
        {channel.name}
      </Text>
      {channel.description ? (
        <Text tone="muted" numberOfLines={2}>
          {channel.description}
        </Text>
      ) : null}
      <Text variant="caption" tone="faint" numberOfLines={1}>
        {[channel.jid, channel.users ? plural(channel.users, '{n} person', '{n} people') : ''].filter(Boolean).join(' · ')}
      </Text>
      <Row>
        <Button title={channel.joined ? t('Open') : t('Join')} kind={channel.joined ? 'secondary' : 'primary'} compact disabled={busy} onPress={() => join(channel.jid)} />
      </Row>
    </View>
  );

  return (
    <>
      <SectionTitle title={t('Find a group')} />
      <Card>
        <Row>
          <Button
            title={asking === 'list' ? t('Looking…') : t('Groups on your server')}
            kind="secondary"
            compact
            disabled={busy || asking !== null}
            onPress={() =>
              void ask('list', async () => {
                const list = await xmppServerChannels();
                setListed(list);
                if (!list.length) setNote(t('Your XMPP server lists no groups.'));
              })
            }
          />
        </Row>
        {listed?.map(row)}
        <Input value={term} onChangeText={setTerm} autoCapitalize="none" autoCorrect={false} placeholder={t('Words in a public group’s name or topic')} accessibilityLabel={t('Words in a public group’s name or topic')} />
        <Row>
          <Button
            title={asking === 'search' ? t('Looking…') : t('Search public groups')}
            compact
            disabled={busy || asking !== null || term.trim().length < 2}
            onPress={() =>
              void ask('search', async () => {
                const list = await xmppSearchChannels(term);
                setFound(list);
                if (!list.length) setNote(t('No groups found.'));
              })
            }
          />
        </Row>
        <Text variant="caption" tone="muted">
          {t('The search asks search.jabber.network, which learns the words you look for, and sees your server’s name. Your own server does not. A public group is not encrypted.')}
        </Text>
        {found?.map(row)}
        {note ? <Text tone="muted">{note}</Text> : null}
      </Card>
    </>
  );
}
