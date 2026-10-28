import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { QrCode } from '../components/QrCode';
import { Button, Card, Chip, Field, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { canNostrChat, canTor } from '../lib/core';
import { t } from '../lib/i18n';
import { INBOX_MOST, nameOf, npubOf, nsecOf, shortNpub, type NostrDmChat, type NostrDmState } from '../lib/nostr-dm';
import { nostrChatsThroughTor } from '../lib/nostr-dm-net';
import {
  nostrDmBring,
  nostrDmForget,
  nostrDmMake,
  nostrDmNewGroup,
  nostrDmNow,
  nostrDmSetFileServers,
  nostrDmSetInbox,
  nostrDmSetName,
  nostrDmStart,
  onNostrDmChange,
  runNostrDm,
} from '../lib/nostr-dm-store';
import { FILE_SERVERS } from '../lib/nostr-files';
import { onTorReady } from '../lib/relay';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// The space's chats with other Nostr apps (lib/nostr-dm-store.ts, docs/nostr-chats.md), under
// Settings → Relay and networks → Nostr chats: a key made here or brought from another app, then
// the key to give others (as text and as a QR code), a new chat with an npub or a name@domain, a new
// group of people it chats with, the chats, the name others see, the relays where messages come
// (NIP-17's inbox), the file servers photos and files go to, the secret key to take elsewhere, and
// forgetting it all. Each chat opens in app/nostr-chat.tsx. Every view says
// these chats are not anonymous.

export default function NostrChatsScreen() {
  const router = useRouter();
  const [now, setNow] = useState(nostrDmNow());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [nsec, setNsec] = useState('');
  const [someone, setSomeone] = useState('');
  const [qr, setQr] = useState(false);

  useEffect(() => {
    runNostrDm();
    setNow(nostrDmNow());
    const stop = onNostrDmChange(() => setNow(nostrDmNow()));
    const stopTor = onTorReady(() => setNow(nostrDmNow()));
    return () => {
      stop();
      stopTor();
    };
  }, []);

  if (!canNostrChat()) {
    return (
      <Page>
        <Text variant="title">{t('Nostr chats')}</Text>
        <Text tone="muted">{t('This build of Erevos has no Nostr chats.')}</Text>
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
      {t('Chat with people on other Nostr apps, such as Damus, Amethyst, Primal or 0xchat, one to one or in groups. Messages are encrypted as NIP-17 asks: relays see whom a message is for, but not who wrote it nor what it says. These chats are not anonymous: your Nostr key is the same to everyone you write to.')}
    </Text>
  );

  // The relays see this phone's address only without Tor (lib/nostr-dm-net.ts).
  const tor = canTor() ? (
    <Text variant="caption" tone="muted">
      {nostrChatsThroughTor()
        ? t('Through Tor: the Nostr relays do not see your address.')
        : t('Not through Tor now: the Nostr relays see your address. Tor is under Settings → Relay and networks → Tor.')}
    </Text>
  ) : null;

  const { loaded, state, problem, reading } = now;
  if (!loaded) {
    return (
      <Page>
        <Text variant="title">{t('Nostr chats')}</Text>
        {about}
      </Page>
    );
  }

  if (!state) {
    return (
      <Page>
        <Text variant="title">{t('Nostr chats')}</Text>
        {about}
        <Card>
          <Text tone="muted">{t('Erevos makes this space a Nostr key of its own. People write to it with its npub, which you give them.')}</Text>
          <Button title={t('Make a Nostr key')} loading={busy} disabled={busy} onPress={() => void run(nostrDmMake)} />
        </Card>
        <SectionTitle title={t('Or bring a key from another Nostr app')} />
        <Card>
          <Field label={t('Secret key (nsec)')}>
            <Input value={nsec} onChangeText={setNsec} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="nsec1…" accessibilityLabel={t('Secret key (nsec)')} />
          </Field>
          <Button
            title={t('Bring this key')}
            kind="secondary"
            disabled={busy || !nsec.trim()}
            onPress={() =>
              void run(async () => {
                await nostrDmBring(nsec.trim());
                setNsec('');
              })
            }
          />
          <Text variant="caption" tone="faint">
            {t('It is kept encrypted in this space only. Erevos then reads the messages its relays still keep. The other app keeps working with it too.')}
          </Text>
        </Card>
        {tor}
        {note || problem ? <Text tone="muted">{note || problem}</Text> : null}
      </Page>
    );
  }

  const npub = npubOf(state.public);
  const chats = Object.values(state.chats).sort((a, b) => b.lastAt - a.lastAt);
  const open = (key: string) => router.push({ pathname: '/nostr-chat', params: { key } });
  return (
    <Page>
      <Text variant="title">{t('Nostr chats')}</Text>
      <Text variant="caption" tone="muted">
        {reading > 0
          ? t('Reading {n} of the {all} relays where your messages arrive.', { n: reading, all: state.inbox.length })
          : problem || t('Connecting…')}
      </Text>
      <Text variant="caption" tone="muted">
        {t('Not anonymous: your key is the same to everyone you write to, and the relays where your messages arrive see when you read them.')}
      </Text>
      {tor}

      <SectionTitle title={t('Your Nostr key')} />
      <Card>
        <Text tone="muted">{t('Give this npub to the people who should write to you, or let them scan it.')}</Text>
        <Text selectable variant="bodyStrong" style={{ fontFamily: 'monospace' }}>
          {npub}
        </Text>
        <Row wrap>
          {CAN_COPY ? <Button title={t('Copy')} compact onPress={() => void copyText(npub).then((done) => setNote(done ? t('Copied.') : ''))} /> : null}
          <Button title={qr ? t('Hide QR code') : t('Show QR code')} kind="secondary" compact onPress={() => setQr(!qr)} />
        </Row>
        {qr ? (
          <View style={{ alignItems: 'center' }}>
            <QrCode text={`nostr:${npub}`} size={240} />
          </View>
        ) : null}
      </Card>

      <SectionTitle title={t('New chat')} />
      <Card>
        <Row>
          <Input
            style={{ flex: 1 }}
            value={someone}
            onChangeText={setSomeone}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('npub1… or name@example.org')}
            accessibilityLabel={t('Their npub, or a name such as name@example.org')}
          />
          <Button
            title={t('Start')}
            compact
            disabled={busy || !someone.trim()}
            onPress={() =>
              void run(async () => {
                const key = await nostrDmStart(someone);
                setSomeone('');
                open(key);
              })
            }
          />
        </Row>
        <Text variant="caption" tone="faint">
          {t('Their npub (or nprofile) is in their Nostr app, under their profile. A name such as name@example.org works when they have one (NIP-05).')}
        </Text>
      </Card>

      <GroupCard state={state} busy={busy} run={run} open={open} />

      <SectionTitle title={t('Chats')} />
      {chats.length === 0 ? <Text tone="muted">{t('No Nostr chats yet.')}</Text> : null}
      {chats.map((chat) => (
        <ChatCard key={chat.key} state={state} chat={chat} onOpen={() => open(chat.key)} />
      ))}

      <NameCard state={state} busy={busy} run={run} />
      <InboxCard state={state} busy={busy} run={run} />
      <FilesCard state={state} busy={busy} run={run} />
      <SecretCard state={state} />

      {note ? <Text tone="muted">{note}</Text> : null}

      <Button
        title={t('Forget this Nostr key')}
        kind="secondary"
        disabled={busy}
        onPress={() =>
          ask(
            t('Forget this Nostr key?'),
            state.madeHere
              ? t('Erevos forgets the key and its chats in this space. It was made here: unless its nsec is written down, nobody can use it again, and people who write to it reach no one.')
              : t('Erevos forgets the key and its chats in this space. The Nostr app it came from keeps it.'),
            [
              { text: t('Cancel'), style: 'cancel' },
              { text: t('Forget'), style: 'destructive', onPress: () => void run(nostrDmForget) },
            ],
          )
        }
      />
    </Page>
  );
}

type Run = (work: () => Promise<unknown>) => Promise<void>;

// The name others see (kind 0): it goes out with the key, so anyone can read it.
function NameCard({ state, busy, run }: { state: NostrDmState; busy: boolean; run: Run }) {
  const [name, setName] = useState(state.name ?? '');
  const changed = name.trim() !== (state.name ?? '');
  return (
    <>
      <SectionTitle title={t('Your name')} />
      <Card>
        <Row>
          <Input style={{ flex: 1 }} value={name} onChangeText={setName} maxLength={64} placeholder={t('No name')} accessibilityLabel={t('Your name')} />
          <Button title={t('Save')} compact disabled={busy || !changed} onPress={() => void run(() => nostrDmSetName(name))} />
        </Row>
        <Text variant="caption" tone="faint">
          {t('Other Nostr apps show it in place of your npub. It is public: anyone can read it.')}
        </Text>
      </Card>
    </>
  );
}

// Where messages come (NIP-17's kind 10050): one to three relays, told to other apps once changed.
function InboxCard({ state, busy, run }: { state: NostrDmState; busy: boolean; run: Run }) {
  const [adding, setAdding] = useState('');
  const set = (relays: string[]) => run(() => nostrDmSetInbox(relays));
  return (
    <>
      <SectionTitle title={t('Where your messages arrive')} />
      <Card>
        <Text tone="muted">{t('Other Nostr apps send your messages to these relays, and Erevos reads them there. Up to three.')}</Text>
        {state.inbox.map((relay) => (
          <Row key={relay}>
            <Text style={{ flex: 1, fontFamily: 'monospace' }} numberOfLines={1}>
              {relay}
            </Text>
            {state.inbox.length > 1 ? (
              <Button title={t('Remove')} kind="secondary" compact disabled={busy} onPress={() => void set(state.inbox.filter((r) => r !== relay))} />
            ) : null}
          </Row>
        ))}
        {state.inbox.length < INBOX_MOST ? (
          <Row>
            <Input style={{ flex: 1 }} value={adding} onChangeText={setAdding} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="wss://relay.example.org" accessibilityLabel={t('A relay to add')} />
            <Button
              title={t('Add')}
              compact
              disabled={busy || !adding.trim()}
              onPress={() =>
                void set([...state.inbox, adding]).then(() => {
                  if (nostrDmNow().state?.inbox.includes(adding.trim().replace(/\/+$/, ''))) setAdding('');
                })
              }
            />
          </Row>
        ) : null}
      </Card>
    </>
  );
}

// A group of people the space chats with (NIP-17: everyone a message names): two at least.
function GroupCard({ state, busy, run, open }: { state: NostrDmState; busy: boolean; run: Run; open: (key: string) => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const people = Object.values(state.chats)
    .filter((chat) => !chat.members && chat.key !== state.public)
    .map((chat) => chat.key);
  if (people.length < 2) return null;
  const toggle = (key: string) => setChosen((now) => (now.includes(key) ? now.filter((k) => k !== key) : [...now, key]));
  return (
    <>
      <SectionTitle title={t('New group')} />
      <Card>
        <Text tone="muted">{t('Choose two or more of the people you chat with. Each message goes to each of them, encrypted for each.')}</Text>
        <Row wrap>
          {people.map((key) => (
            <Chip key={key} label={nameOf(state, key) || shortNpub(npubOf(key))} selected={chosen.includes(key)} onPress={() => toggle(key)} />
          ))}
        </Row>
        <Input value={subject} onChangeText={setSubject} maxLength={100} placeholder={t('Group name (optional)')} accessibilityLabel={t('Group name (optional)')} />
        <Button
          title={t('Make the group')}
          compact
          disabled={busy || chosen.length < 2}
          onPress={() =>
            void run(async () => {
              const key = await nostrDmNewGroup(chosen, subject);
              setChosen([]);
              setSubject('');
              open(key);
            })
          }
        />
        <Text variant="caption" tone="faint">
          {t('Nostr groups have no admins: nobody can be added or taken out later. A group with other people is a new group.')}
        </Text>
      </Card>
    </>
  );
}

// Where photos and files go, encrypted (lib/nostr-files.ts): Blossom servers, the first that takes one.
function FilesCard({ state, busy, run }: { state: NostrDmState; busy: boolean; run: Run }) {
  const [adding, setAdding] = useState('');
  const own = state.files?.length ? state.files : null;
  const list = own ?? FILE_SERVERS;
  const set = (servers: string[]) => run(() => nostrDmSetFileServers(servers));
  return (
    <>
      <SectionTitle title={t('File servers')} />
      <Card>
        <Text tone="muted">
          {t('Photos and files go to the first of these Blossom servers that takes them, encrypted on this phone: the server keeps only what it cannot read, and does not learn whose they are.')}
        </Text>
        {list.map((server) => (
          <Row key={server}>
            <Text style={{ flex: 1, fontFamily: 'monospace' }} numberOfLines={1}>
              {server}
            </Text>
            {list.length > 1 ? (
              <Button title={t('Remove')} kind="secondary" compact disabled={busy} onPress={() => void set(list.filter((s) => s !== server))} />
            ) : null}
          </Row>
        ))}
        {list.length < 5 ? (
          <Row>
            <Input style={{ flex: 1 }} value={adding} onChangeText={setAdding} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://blossom.example.org" accessibilityLabel={t('A file server to add')} />
            <Button
              title={t('Add')}
              compact
              disabled={busy || !adding.trim()}
              onPress={() =>
                void set([...list, adding]).then(() => {
                  if (nostrDmNow().state?.files?.includes(adding.trim().replace(/\/+$/, ''))) setAdding('');
                })
              }
            />
          </Row>
        ) : null}
        {own ? <Button title={t("Erevos's own list again")} kind="secondary" compact disabled={busy} onPress={() => void set([])} /> : null}
      </Card>
    </>
  );
}

// The secret key, shown only when asked: whoever has it is this key on Nostr.
function SecretCard({ state }: { state: NostrDmState }) {
  const [nsec, setNsec] = useState('');
  useEffect(() => setNsec(''), [state.public]);
  return (
    <>
      <SectionTitle title={t('Secret key')} />
      <Card>
        {state.madeHere ? (
          <Text tone="muted">{t('This key was made here, so it is only in this space. Write its nsec down somewhere safe to keep it if this phone is lost, or to use it in another Nostr app.')}</Text>
        ) : (
          <Text tone="muted">{t('This key came from another Nostr app, which has it too.')}</Text>
        )}
        {nsec ? (
          <>
            <Text selectable variant="bodyStrong" style={{ fontFamily: 'monospace' }}>
              {nsec}
            </Text>
            <Row wrap>
              {CAN_COPY ? <Button title={t('Copy')} compact onPress={() => void copyText(nsec)} /> : null}
              <Button title={t('Hide')} kind="secondary" compact onPress={() => setNsec('')} />
            </Row>
          </>
        ) : (
          <Button
            title={t('Show the secret key (nsec)')}
            kind="secondary"
            compact
            onPress={() =>
              ask(t('Show the secret key?'), t('Whoever sees or has it can read your Nostr chats and write as you. Never give it to anyone, and show it only where nobody watches.'), [
                { text: t('Cancel'), style: 'cancel' },
                { text: t('Show'), onPress: () => void nsecOf(state).then(setNsec) },
              ])
            }
          />
        )}
      </Card>
    </>
  );
}

function ChatCard({ state, chat, onOpen }: { state: NostrDmState; chat: NostrDmChat; onOpen: () => void }) {
  const colors = useColors();
  const last = chat.messages.at(-1);
  const name = nameOf(state, chat.key) || shortNpub(npubOf(chat.key));
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={name}>
      <Card>
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {chat.key === state.public ? t('Chat with myself') : name}
            </Text>
            {last ? (
              <Text tone="muted" numberOfLines={1}>
                {typeof last.file === 'object' ? (last.file.type.startsWith('image/') ? t('Photo') : t('File: {name}', { name: last.file.name ?? last.file.type })) : last.file ? t('A file') : last.text}
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
        {chat.messages.length === 0 ? (
          <Text variant="caption" tone="faint" style={{ marginTop: space.xs }}>
            {t('No messages yet')}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
