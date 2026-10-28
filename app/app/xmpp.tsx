import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Field, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { canTor, canXmpp } from '../lib/core';
import { t } from '../lib/i18n';
import { onTorReady } from '../lib/relay';
import { isXmppId, nameOf, xmppChatList, type XmppChat, type XmppState } from '../lib/xmpp';
import { xmppThroughTor } from '../lib/xmpp-net';
import { fingerprint } from '../lib/xmpp-omemo';
import { onXmppChange, runXmpp, xmppAddContact, xmppDecline, xmppNow, xmppSignIn, xmppSignOut } from '../lib/xmpp-store';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// The space's XMPP account (lib/xmpp-store.ts, docs/xmpp.md), under Settings → Relay and networks
// → XMPP: signing in, then the people who asked to add the account, a new chat with an address,
// its chats and contacts, the key of this device, and signing out. Each chat opens in
// app/xmpp-chat.tsx. Every view says these chats are not anonymous.

export default function XmppScreen() {
  const router = useRouter();
  const [now, setNow] = useState(xmppNow());
  const [who, setWho] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [newId, setNewId] = useState('');

  useEffect(() => {
    runXmpp();
    setNow(xmppNow());
    const stop = onXmppChange(() => setNow(xmppNow()));
    const stopTor = onTorReady(() => setNow(xmppNow()));
    return () => {
      stop();
      stopTor();
    };
  }, []);

  if (!canXmpp()) {
    return (
      <Page>
        <Text variant="title">XMPP</Text>
        <Text tone="muted">{t('This build of Erevos has no XMPP.')}</Text>
      </Page>
    );
  }

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setNote('');
    try {
      await work();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const about = (
    <Text tone="muted">
      {t('Chat with people on XMPP, who use Conversations, Monal, Gajim, Dino or another XMPP app. Messages are encrypted with OMEMO, but these chats are not anonymous: the XMPP server sees who talks with whom, and when.')}
    </Text>
  );

  // XMPP follows the space's Tor way (lib/xmpp-net.ts): the server sees this phone's address only without it.
  const tor = canTor() ? (
    <Text variant="caption" tone="muted">
      {xmppThroughTor()
        ? t('Through Tor: the XMPP server does not see your address.')
        : t('Not through Tor now: the XMPP server sees your address. Tor is under Settings → Relay and networks → Tor.')}
    </Text>
  ) : null;

  const { loaded, state, problem, online } = now;
  if (!loaded) {
    return (
      <Page>
        <Text variant="title">XMPP</Text>
        {about}
      </Page>
    );
  }

  if (!state) {
    return (
      <Page>
        <Text variant="title">XMPP</Text>
        {about}
        <Card>
          <Field label={t('XMPP address')}>
            <Input value={who} onChangeText={setWho} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name@example.org" accessibilityLabel={t('XMPP address')} />
          </Field>
          <Field label={t('Password')}>
            <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Password')} />
          </Field>
          <Field label={t('Server')} hint={t('Only when the server is not the one in your address, or cannot be found. A name, name:port or a wss:// address.')}>
            <Input value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="xmpp.example.org" accessibilityLabel={t('Server')} />
          </Field>
          <Button
            title={busy ? t('Signing in…') : t('Sign in')}
            loading={busy}
            disabled={busy || !isXmppId(who) || !password}
            onPress={() =>
              void run(async () => {
                await xmppSignIn(who.trim(), password, server);
                setPassword('');
              })
            }
          />
          <Text variant="caption" tone="faint">
            {t('Erevos signs in as a new device of the account, and keeps the sign-in encrypted in this space only.')}
          </Text>
        </Card>
        {tor}
        {note || problem ? <Text tone="muted">{note || problem}</Text> : null}
      </Page>
    );
  }

  const chats = xmppChatList(state).filter((chat) => !state.requests.includes(chat.jid));
  const withChat = new Set(chats.map((chat) => chat.jid));
  const contacts = Object.values(state.roster)
    .filter((c) => c.subscription !== 'remove' && !withChat.has(c.jid))
    .sort((a, b) => nameOf(state, a.jid).localeCompare(nameOf(state, b.jid)));
  const open = (jid: string) => router.push({ pathname: '/xmpp-chat', params: { jid } });
  return (
    <Page>
      <Text variant="title">XMPP</Text>
      <Text tone="muted">{t('Signed in as {id}', { id: state.jid })}</Text>
      <Text variant="caption" tone="muted">
        {online ? t('Connected.') : problem ? problem : t('Connecting…')}
      </Text>
      <Text variant="caption" tone="muted">
        {t('Not anonymous: the XMPP server sees who talks with whom, and when.')}
      </Text>
      {tor}

      {state.requests.length ? <SectionTitle title={t('Asks to add you')} /> : null}
      {state.requests.map((jid) => (
        <Card key={jid}>
          <Text variant="bodyStrong">{nameOf(state, jid)}</Text>
          <Text variant="caption" tone="muted">
            {jid}
          </Text>
          <Row wrap>
            <Button title={t('Accept')} compact disabled={busy} onPress={() => void run(() => xmppAddContact(jid))} />
            <Button title={t('Decline')} kind="secondary" compact disabled={busy} onPress={() => void run(() => xmppDecline(jid))} />
          </Row>
        </Card>
      ))}

      <SectionTitle title={t('New chat')} />
      <Card>
        <Row>
          <Input
            style={{ flex: 1 }}
            value={newId}
            onChangeText={setNewId}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@example.org"
            accessibilityLabel={t('XMPP address')}
          />
          <Button
            title={t('Start')}
            compact
            disabled={busy || !isXmppId(newId)}
            onPress={() =>
              void run(async () => {
                const jid = newId.trim().toLowerCase();
                await xmppAddContact(jid);
                setNewId('');
                open(jid);
              })
            }
          />
        </Row>
        <Text variant="caption" tone="faint">
          {t('They are added to your contacts and asked if you may see when they are online.')}
        </Text>
      </Card>

      <SectionTitle title={t('Chats')} />
      {chats.length === 0 ? <Text tone="muted">{t('No XMPP chats yet.')}</Text> : null}
      {chats.map((chat) => (
        <ChatCard key={chat.jid} state={state} chat={chat} onOpen={() => open(chat.jid)} />
      ))}

      {contacts.length ? <SectionTitle title={t('Contacts')} /> : null}
      {contacts.map((contact) => (
        <Pressable key={contact.jid} onPress={() => open(contact.jid)} accessibilityRole="button" accessibilityLabel={nameOf(state, contact.jid)}>
          <Card>
            <Text variant="bodyStrong" numberOfLines={1}>
              {nameOf(state, contact.jid)}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {contact.jid}
            </Text>
          </Card>
        </Pressable>
      ))}

      <SectionTitle title={t('This device')} />
      <Card>
        <Text tone="muted">{t('The OMEMO key of this device. The people you write to can compare it with what their app shows.')}</Text>
        <Text selectable variant="bodyStrong" style={{ fontFamily: 'monospace' }}>
          {fingerprint(state.omemo.identity.public)}
        </Text>
      </Card>

      {note || problem ? <Text tone="muted">{note || problem}</Text> : null}

      <Button
        title={t('Sign out')}
        kind="secondary"
        disabled={busy}
        onPress={() =>
          ask(t('Sign out of XMPP?'), t('This device is taken off your XMPP account, and Erevos forgets its keys and the chats kept here. Signing in again makes a new device, which cannot read what came before.'), [
            { text: t('Cancel'), style: 'cancel' },
            { text: t('Sign out'), style: 'destructive', onPress: () => void run(xmppSignOut) },
          ])
        }
      />
    </Page>
  );
}

function ChatCard({ state, chat, onOpen }: { state: XmppState; chat: XmppChat; onOpen: () => void }) {
  const colors = useColors();
  const last = chat.messages.at(-1);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={nameOf(state, chat.jid)}>
      <Card>
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {nameOf(state, chat.jid)}
            </Text>
            {last ? (
              <Text tone="muted" numberOfLines={1}>
                {last.locked ? t('Locked message') : last.text}
              </Text>
            ) : null}
          </View>
          {chat.unread > 0 ? (
            <View style={{ minWidth: 24, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' }}>
              <Text variant="caption" color={colors.onPrimary}>
                {String(chat.unread)}
              </Text>
            </View>
          ) : null}
        </Row>
        {chat.plain ? (
          <Text variant="caption" tone="faint" style={{ marginTop: space.xs }}>
            {t('Written without encryption: the XMPP server can read this chat.')}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
