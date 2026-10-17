import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, PermissionsAndroid, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onRadioEvent, sendText, startRadio, stopRadio } from '../modules/erevos-radio';
import { KeyboardPaddedView } from '../components/keyboard';
import { PasswordSheet } from '../components/PasswordSheet';
import { QrCode } from '../components/QrCode';
import { Button, Chip, Field, Input, Page, Row, Text, TextButton } from '../components/ui';
import { contactLink, onContactOffered, parseContact, type ContactCode } from '../lib/contact-code';
import { hasCore } from '../lib/core';
import { E2E, toBase64Url, type ContactInfo, type Erase } from '../lib/e2e';
import { mediaText, shownTime, SOURCE_LABELS } from '../lib/imports';
import { Archive } from '../lock/archive';
import { openHidden, setHiddenPassword } from '../lock/hidden';
import { cleanName, MAX_NAME } from '../lock/e2e-data';
import { History, newTag } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadHiddenData, updateCurrentSpaceData, updateHiddenData, type Queue, type SpaceData } from '../lock/space-data';
import { createQueue, fromHex, isQueueNotFound, receiveMessage, sendMessage, toHex, type Relay } from '../lib/relay';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles } from '../theme/context';

// Chat with contacts through the relay, end-to-end encrypted (lib/e2e.ts), and with nearby phones
// over the radio link, not encrypted yet. A contact is added from their contact link, which
// carries their public keys: adding it starts the conversation, and they see the contact appear
// when they next look at the relay. The contacts and their conversations are kept sealed
// (lock/e2e-data.ts), with the names given to them, and so are the messages with them
// (lock/history.ts). One message, or all of a chat's, can be deleted here only or on both phones
// (Erase in lib/e2e.ts). Messages over the radio link are kept in memory only, so they are gone
// when the chat closes.
//
// Every space also has hidden chats (lock/hidden.ts), opened with their own password from the
// Hidden chats button, which every space shows whether it has hidden chats or not. They are a
// second chat with their own relay queue, account and contacts, over the relay only (the radio
// link is the phone's, and its chats are the open space's). The other chats stay open underneath and
// keep receiving. Hidden chats close when the app goes to the background or this screen closes,
// and their messages go with them.
//
// A chat brought in from another messenger (lock/archive.ts) can go on with one of the space's
// contacts: its messages show ahead of theirs, only to read, and a contact without a name takes
// the imported chat's. They are never sent, and stay when this chat's messages are deleted.

// `tag` names a message with a contact on both phones (lock/history.ts). Radio messages have none.
type Message = { id: number; peer: string; text: string; mine: boolean; tag: string };

// Contacts are named by their identity key, after this prefix. Radio peers by their link id.
const CONTACT_PREFIX = 'contact:';

const PERMISSIONS: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [
  'android.permission.NEARBY_WIFI_DEVICES',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.ACCESS_FINE_LOCATION',
];

// Relay addresses that differ only in case or a trailing slash are the same relay.
function sameRelay(a: string, b: string): boolean {
  const plain = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();
  return plain(a) === plain(b);
}

// A contact's name if this chat gave it one, otherwise the start of their key.
function contactName(peer: string, contacts: ContactInfo[]): string | null {
  const identity = peer.slice(CONTACT_PREFIX.length);
  return contacts.find((contact) => contact.identity === identity)?.name || null;
}

function label(peer: string, contacts: ContactInfo[]): string {
  if (!peer.startsWith(CONTACT_PREFIX)) return peer;
  return contactName(peer, contacts) ?? `contact ${peer.slice(CONTACT_PREFIX.length, CONTACT_PREFIX.length + 8)}`;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const NO_CORE = 'This build cannot encrypt, so chats through the relay are off. Rebuild the app.';

// Imported messages shown at first, and added each time earlier ones are asked for.
const IMPORTED_PAGE = 50;

export default function ChatScreen() {
  const [hiddenKey, setHiddenKey] = useState<Uint8Array | null>(null);
  const [asking, setAsking] = useState<'open' | 'change' | null>(null);
  const insets = useSafeAreaInsets();
  // A contact to open with, from an imported chat that goes on with them.
  const { contact } = useLocalSearchParams<{ contact?: string }>();
  const initial = typeof contact === 'string' && /^[0-9a-f]{64}$/.test(contact) ? `${CONTACT_PREFIX}${contact}` : null;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        setHiddenKey(null);
        setAsking(null);
      }
    });
    return () => subscription.remove();
  }, []);

  if (Platform.OS !== 'android') {
    return (
      <Page>
        <Text tone="muted">Chat runs on Android only for now.</Text>
      </Page>
    );
  }

  // The message field rises with the keyboard, and clears the phone's navigation bar without it.
  return (
    <KeyboardPaddedView bottom={insets.bottom} style={layout.screen}>
      <View style={[layout.screen, hiddenKey && layout.gone]}>
        <Chat hiddenKey={null} initial={initial} shown={!hiddenKey} onHidden={() => setAsking('open')} />
      </View>
      {hiddenKey ? (
        <Chat hiddenKey={hiddenKey} shown onHidden={() => setHiddenKey(null)} onChangePassword={() => setAsking('change')} />
      ) : null}
      <PasswordSheet
        visible={asking === 'open'}
        title="Hidden chats"
        repeat={false}
        submitLabel="Open"
        onClose={() => setAsking(null)}
        onSubmit={async (password) => {
          const key = await openHidden(currentSpace().space, password);
          if (!key) return false;
          setAsking(null);
          setHiddenKey(key);
        }}
      />
      <PasswordSheet
        visible={asking === 'change'}
        title="Change hidden chats password"
        repeat
        submitLabel="Save"
        onClose={() => setAsking(null)}
        onSubmit={async (password) => {
          await setHiddenPassword(currentSpace().space, password, hiddenKey);
          setAsking(null);
        }}
      />
    </KeyboardPaddedView>
  );
}

// One chat: the space's own (`hiddenKey` null), or its hidden chats, sealed with that key.
function Chat({ hiddenKey, initial = null, shown, onHidden, onChangePassword }: {
  hiddenKey: Uint8Array | null;
  initial?: string | null;
  shown: boolean;
  onHidden: () => void;
  onChangePassword?: () => void;
}) {
  // Nearby phones on the radio link.
  const [peers, setPeers] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(initial);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [showRelay, setShowRelay] = useState(false);
  const [relayUrl, setRelayUrl] = useState('');
  const [relayToken, setRelayToken] = useState('');
  const [ownQueue, setOwnQueue] = useState<Queue | null>(null);
  const [contactDraft, setContactDraft] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [safety, setSafety] = useState<{ peer: string; number: string } | null>(null);
  // The contact being named, and the name typed so far.
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [e2e, setE2E] = useState<E2E | null>(null);
  // Chats imported into this space. Hidden chats have none.
  const [archive, setArchive] = useState<Archive | null>(null);
  const [importedShown, setImportedShown] = useState(IMPORTED_PAGE);
  // Set when earlier imported messages are shown, so the thread does not jump to its end.
  const holdScroll = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const nextId = useRef(1);
  const history = useRef<History | null>(null);
  const thread = useRef<ScrollView>(null);
  const styles = useStyles(makeStyles);

  function relayTarget(url = relayUrl): Relay | null {
    const address = url.trim();
    return address ? { url: address, token: relayToken.trim() || undefined } : null;
  }

  // Hands the relay the first packets of conversations started here that it has not taken yet:
  // until it does, the contact cannot read anything else from this chat.
  async function sendPending(chats: E2E, target: Relay) {
    for (const { identity, sender, first } of chats.pending()) {
      try {
        await sendMessage(target, fromHex(sender), first);
        await chats.firstSent(identity);
      } catch {
        // Tried again with the next message, or the next look at the relay.
      }
    }
  }

  // Adds a contact from a code: typed or pasted here, or scanned and opened on the contact screen.
  async function acceptContact(code: ContactCode) {
    if (!e2e) {
      setNote(NO_CORE);
      return;
    }
    if (code.senderHex === ownQueue?.senderHex) {
      setNote("Not added. That is this chat's own code.");
      return;
    }
    const ours = relayUrl.trim();
    if (code.relayUrl && ours && !sameRelay(code.relayUrl, ours)) {
      setNote(
        `Not added. That contact uses the relay at ${code.relayUrl}, and this phone uses ${ours}. Both phones need the same relay for now.`,
      );
      return;
    }
    const url = ours || code.relayUrl;
    if (code.relayUrl && !ours) setRelayUrl(code.relayUrl);
    const target = relayTarget(url);
    if (!target) {
      setNote('Not added. Type the relay address in Relay first.');
      return;
    }
    try {
      // The contact answers through our own queue, so there has to be one.
      let queue = ownQueue;
      if (!queue) {
        const ids = await createQueue(target);
        queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
        setOwnQueue(queue);
      }
      const { identity, added } = await e2e.addContact(code, queue.senderHex);
      setContacts(e2e.contacts());
      setSelected(`${CONTACT_PREFIX}${identity}`);
      await sendPending(e2e, target);
      setNote(
        added
          ? 'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs.'
          : 'Already a contact. Where to reach them is updated.',
      );
    } catch (error) {
      setNote(`Not added. ${errorText(error)}`);
    }
  }

  // The radio link belongs to the phone, not to a space: until messages are sealed for each
  // space's own keys, a nearby phone's message shows in whichever space is open.
  useEffect(() => {
    if (Platform.OS !== 'android' || hiddenKey) return;
    let active = true;
    const subscriptions = [
      onRadioEvent('onPeer', ({ id, kind }) => {
        if (kind === 'ble') return; // presence only, not a data link
        setPeers((list) => (list.includes(id) ? list : [...list, id]));
        setSelected((current) => current ?? id);
      }),
      onRadioEvent('onText', ({ peer, text }) => {
        addMessage(peer, text, false);
      }),
    ];
    PermissionsAndroid.requestMultiple(PERMISSIONS).finally(() => {
      if (active) startRadio();
    });
    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription?.remove());
      stopRadio();
    };
  }, []);

  // Restores the relay settings and our queue this space keeps on the phone, sealed with its key
  // (lock/space-data.ts), and its account and contacts (lock/e2e-data.ts). Another space finds
  // only its own.
  useEffect(() => {
    let active = true;
    const { space, key } = currentSpace();
    (hiddenKey ? loadHiddenData(space, hiddenKey) : loadCurrentSpaceData())
      .then((data) => {
        if (!active) return;
        setRelayUrl(data.url);
        setRelayToken(data.token);
        setOwnQueue(data.ownQueue);
      })
      .catch(() => {
        // Nothing usable saved. Start empty.
      })
      .then(async () => {
        if (!hasCore()) {
          setNote(NO_CORE);
          return;
        }
        const holder = hiddenKey ? 'hidden' : 'space';
        const kept = await History.open(holder, space, hiddenKey ?? key);
        if (!active) return;
        history.current = kept;
        // Ahead of anything the radio brought while it loaded.
        setMessages((list) => [...kept.messages().map((m) => ({ ...m, id: nextId.current++ })), ...list]);
        const chats = await E2E.open(holder, space, hiddenKey ?? key);
        if (!active) return;
        setE2E(chats);
        setContacts(chats.contacts());
        if (!hiddenKey) {
          Archive.open('space', space, key)
            .then((imported) => active && setArchive(imported))
            .catch(() => {
              // The chats show without what was imported.
            });
        }
      })
      .catch((error) => {
        if (active) setNote(`Chats through the relay could not open. ${errorText(error)}`);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Another chat starts with its latest imported messages.
  useEffect(() => setImportedShown(IMPORTED_PAGE), [selected]);

  // Saves the relay settings and our queue whenever they change.
  useEffect(() => {
    if (!loaded) return;
    // Only what the chat keeps: the look kept beside it stays as it is. Contacts from before
    // messages were encrypted (routes) cannot be written to any more, so they go.
    const data: Partial<SpaceData> = { url: relayUrl, token: relayToken, ownQueue, routes: {} };
    (hiddenKey ? updateHiddenData(currentSpace().space, hiddenKey, data) : updateCurrentSpaceData(data)).catch(() => {
      // A failed save only means the next launch starts empty.
    });
  }, [loaded, relayUrl, relayToken, ownQueue]);

  // Takes a contact opened from a scanned code, once the saved contacts are loaded so they
  // cannot overwrite it.
  useEffect(() => {
    if (!loaded || !shown) return;
    return onContactOffered((code) => void acceptContact(code));
  }, [loaded, shown, relayUrl, relayToken, ownQueue, e2e]);

  // Looks at our own relay queue every few seconds and opens what came. Without the core nothing
  // could open it, so the queue is left alone, and its messages wait on the relay.
  useEffect(() => {
    const url = relayUrl.trim();
    if (!url || !ownQueue || !e2e) return;
    const target: Relay = { url, token: relayToken.trim() || undefined };
    const recipient = fromHex(ownQueue.recipientHex);
    let active = true;
    let busy = false;
    // The note shown while the relay could not be reached, taken back once it answers again.
    let failed: string | null = null;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        await sendPending(e2e, target);
        const bytes = await receiveMessage(target, recipient);
        if (!active) return;
        if (failed !== null) {
          const shown = failed;
          setNote((current) => (current === shown ? 'The relay answers again.' : current));
          failed = null;
        }
        if (!bytes) return;
        const received = await e2e.receive(bytes);
        if (!active) return;
        if (received.kind === 'refused') {
          if (received.reason === 'plain') setNote('A message that was not end-to-end encrypted came, and was not shown.');
          return;
        }
        const peer = `${CONTACT_PREFIX}${received.identity}`;
        setContacts(e2e.contacts());
        setSelected((current) => current ?? peer);
        if (received.text) addMessage(peer, received.text, false, received.tag);
        const name = label(peer, e2e.contacts());
        if (received.erase && 'all' in received.erase) {
          forgetChat(peer);
          setNote(`${name} deleted the messages of this chat on both phones.`);
        } else if (received.erase) {
          forgetMessage({ id: -1, peer, text: '', mine: false, tag: received.erase.tag });
          setNote(`${name} deleted a message on both phones.`);
        }
        if (received.added) {
          setNote(`New chat with ${name}: they added your contact link. Compare the safety number with theirs.`);
        }
      } catch (error) {
        if (!active) return;
        if (!isQueueNotFound(error)) {
          failed = errorText(error);
          setNote(failed);
          return;
        }
        // The relay no longer has our queue (deleted, or a relay that keeps queues in memory
        // was restarted). Make a new one so messages can reach us again.
        try {
          const ids = await createQueue(target);
          if (!active) return;
          setOwnQueue({ recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
          setNote(
            'The relay had lost your queue, so a new one was made. Your contacts learn it from your next message to them.',
          );
        } catch (retry) {
          if (active) setNote(errorText(retry));
        }
      } finally {
        busy = false;
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [relayUrl, relayToken, ownQueue, e2e]);

  // Shows a message, and keeps it on the phone when it is with a contact. A contact's message
  // from an Erevos before tags gets one known to this phone only.
  function addMessage(peer: string, text: string, mine: boolean, tag = '') {
    const contact = peer.startsWith(CONTACT_PREFIX);
    const kept = contact ? tag || newTag() : '';
    setMessages((list) => [...list, { id: nextId.current++, peer, text, mine, tag: kept }]);
    if (contact) {
      history.current?.add({ peer, text, mine, at: Date.now(), tag: kept }).catch(() => {
        // Shown, but gone when the chat next opens.
      });
    }
  }

  function forgetChat(peer: string) {
    setMessages((list) => list.filter((message) => message.peer !== peer));
    history.current?.clear(peer).catch((error) => setNote(errorText(error)));
  }

  function forgetMessage(message: Message) {
    setMessages((list) => list.filter((m) => m.id !== message.id && !(message.tag && m.peer === message.peer && m.tag === message.tag)));
    if (message.tag) history.current?.remove(message.peer, message.tag).catch((error) => setNote(errorText(error)));
  }

  // Asks the contact's phone to delete messages too, and deletes them here once the relay has
  // taken that. If it cannot, nothing is deleted.
  async function eraseOnBoth(peer: string, erase: Erase, here: () => void) {
    const target = relayTarget();
    if (!target) {
      setNote('Not deleted. Type the relay address in Relay first.');
      return;
    }
    try {
      await sendToContact(target, peer.slice(CONTACT_PREFIX.length), '', erase);
      here();
      setNote(`Deleted here. ${label(peer, shownContacts)}'s phone deletes them too when it next looks at the relay.`);
    } catch (error) {
      setNote(notSent(error).replace('Not sent.', 'Not deleted.'));
    }
  }

  function deleteMessages(peer: string) {
    const name = label(peer, shownContacts);
    const kept = archive && archive.linked(peer.slice(CONTACT_PREFIX.length)).length > 0 ? ' Imported messages stay: delete them in Imported chats.' : '';
    Alert.alert('Delete messages', `Delete the messages with ${name}? They cannot be brought back.${kept}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'This phone', onPress: () => forgetChat(peer) },
      { text: 'Both phones', style: 'destructive', onPress: () => void eraseOnBoth(peer, { all: true }, () => forgetChat(peer)) },
    ]);
  }

  function deleteMessage(message: Message) {
    const both = message.peer.startsWith(CONTACT_PREFIX) && message.tag;
    Alert.alert('Delete message', 'Delete this message? It cannot be brought back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'This phone', onPress: () => forgetMessage(message) },
      ...(both
        ? [{ text: 'Both phones', style: 'destructive' as const, onPress: () => void eraseOnBoth(message.peer, { tag: message.tag }, () => forgetMessage(message)) }]
        : []),
    ]);
  }

  function keep(peer: string, text: string, tag = '') {
    addMessage(peer, text, true, tag);
    setDraft('');
  }

  // Seals a message for a contact and hands it to the relay, after the first packet of the
  // conversation if the relay has not taken that yet. Returns the message's tag.
  async function sendToContact(target: Relay, identity: string, text: string, erase: Erase | null = null): Promise<string> {
    if (!e2e) throw new Error(NO_CORE);
    const sealed = await e2e.seal(identity, text, ownQueue?.senderHex ?? '', erase);
    if (sealed.first) {
      await sendMessage(target, fromHex(sealed.sender), sealed.first);
      await e2e.firstSent(identity);
    }
    await sendMessage(target, fromHex(sealed.sender), sealed.packet);
    return sealed.tag;
  }

  function notSent(error: unknown): string {
    return isQueueNotFound(error)
      ? "Not sent. The relay does not have this contact's queue any more. Ask them to write to you, or for their new contact link."
      : `Not sent. ${errorText(error)}`;
  }

  async function send() {
    const text = draft.trim();
    if (!text || !selected) return;
    if (!selected.startsWith(CONTACT_PREFIX)) {
      if (sendText(selected, text)) {
        keep(selected, text);
        setNote('Sent over the radio link, not encrypted.');
      } else {
        setNote('Not sent. The link to this phone is not ready.');
      }
      return;
    }
    const target = relayTarget();
    if (!target) {
      setNote('Not sent. Type the relay address in Relay first.');
      return;
    }
    if (!e2e) {
      setNote(NO_CORE);
      return;
    }
    try {
      const tag = await sendToContact(target, selected.slice(CONTACT_PREFIX.length), text);
      keep(selected, text, tag);
      setNote('Sent through the relay, end-to-end encrypted.');
    } catch (error) {
      setNote(notSent(error));
    }
  }

  async function shareLink(link: string) {
    try {
      await Share.share({ message: link });
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function toggleSafety(peer: string) {
    if (safety?.peer === peer || !e2e) {
      setSafety(null);
      return;
    }
    try {
      setSafety({ peer, number: await e2e.safetyNumber(peer.slice(CONTACT_PREFIX.length)) });
    } catch (error) {
      setNote(errorText(error));
    }
  }

  function startRenaming(peer: string) {
    if (renaming === peer) {
      setRenaming(null);
      return;
    }
    setNameDraft(contactName(peer, contacts) ?? '');
    setRenaming(peer);
  }

  async function rename(peer: string) {
    if (!e2e) return;
    try {
      await e2e.rename(peer.slice(CONTACT_PREFIX.length), nameDraft);
      setContacts(e2e.contacts());
      setRenaming(null);
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function createOwnQueue() {
    const target = relayTarget();
    if (!target) {
      setNote('Type the relay address first.');
      return;
    }
    try {
      const ids = await createQueue(target);
      setOwnQueue({ recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
      setNote('Relay queue created.');
    } catch (error) {
      setNote(errorText(error));
    }
  }

  function addContact() {
    const code = parseContact(contactDraft);
    if (!code) {
      setNote('That is not an Erevos contact link.');
      return;
    }
    setContactDraft('');
    void acceptContact(code);
  }

  const visible = messages.filter((message) => message.peer === selected);
  const selectedIdentity = selected?.startsWith(CONTACT_PREFIX) ? selected.slice(CONTACT_PREFIX.length) : '';
  const imported = useMemo(() => (archive && selectedIdentity ? archive.linked(selectedIdentity) : []), [archive, selectedIdentity]);
  const importedFrom = [...new Set(imported.map((m) => SOURCE_LABELS[m.source]))].join(' and ');
  // In an imported group, each message says who wrote it.
  const importedGroup = useMemo(() => new Set(imported.filter((m) => !m.mine && m.sender).map((m) => m.sender)).size > 1, [imported]);
  // A contact without a name shows as the imported chat that goes on with them.
  const shownContacts = useMemo(
    () => contacts.map((c) => (c.name || !archive ? c : { ...c, name: cleanName(archive.linkedChats(c.identity)[0]?.title ?? '') })),
    [contacts, archive],
  );
  const chips = [...peers, ...contacts.map((contact) => `${CONTACT_PREFIX}${contact.identity}`)];
  const selectedContact = selected?.startsWith(CONTACT_PREFIX) ? selected : null;
  const firstImported = Math.max(0, imported.length - importedShown);
  const ownLink =
    ownQueue && e2e ? contactLink({ senderHex: ownQueue.senderHex, relayUrl: relayUrl.trim(), key: toBase64Url(e2e.bundle) }) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="title">{hiddenKey ? 'Hidden chats' : 'Chat'}</Text>
        {hiddenKey ? (
          <Row>
            {onChangePassword ? <TextButton title="Change password" onPress={onChangePassword} /> : null}
            <TextButton title="Close" onPress={onHidden} />
          </Row>
        ) : (
          <TextButton title="Hidden chats" onPress={onHidden} />
        )}
      </View>
      <ScrollView style={styles.top} contentContainerStyle={styles.topContent} keyboardShouldPersistTaps="handled">
        <Text tone="muted">
          {chips.length > 0
            ? 'Pick a chat.'
            : hiddenKey
              ? 'No hidden chats yet. Add a contact through the relay below.'
              : 'Looking for a nearby Erevos phone. Contacts through the relay are under Relay.'}
        </Text>
        <Row wrap>
          {chips.map((peer) => (
            <Chip
              key={peer}
              label={label(peer, shownContacts)}
              mono={!contactName(peer, shownContacts)}
              selected={peer === selected}
              onPress={() => setSelected(peer)}
            />
          ))}
        </Row>
        {selectedContact ? (
          <View style={styles.section}>
            <Text variant="caption" tone="muted">
              End-to-end encrypted. Compare the safety number with theirs, in person or on a call: if both phones show
              the same, no one is in between.
            </Text>
            <Row wrap>
              <TextButton
                title={safety?.peer === selectedContact ? 'Hide safety number' : 'Show safety number'}
                onPress={() => void toggleSafety(selectedContact)}
              />
              <TextButton title="Rename" onPress={() => startRenaming(selectedContact)} />
              <TextButton title="Delete messages" onPress={() => deleteMessages(selectedContact)} />
            </Row>
            {renaming === selectedContact ? (
              <Row>
                <Input
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onSubmitEditing={() => void rename(selectedContact)}
                  placeholder="Name, only on this phone"
                  maxLength={MAX_NAME}
                  autoFocus
                  style={styles.grow}
                />
                <Button title="Save" compact onPress={() => void rename(selectedContact)} />
              </Row>
            ) : null}
            {safety?.peer === selectedContact ? (
              <Text selectable variant="mono" style={styles.safety}>
                {safety.number.split(' ').reduce((lines, group, i) => lines + (i === 0 ? '' : i % 4 === 0 ? '\n' : '  ') + group, '')}
              </Text>
            ) : null}
          </View>
        ) : selected ? (
          <Text variant="caption" tone="muted">
            Nearby radio link: not end-to-end encrypted yet. Anyone nearby with the right tools could read it.
          </Text>
        ) : null}
        <TextButton title={showRelay ? 'Hide relay' : 'Relay (Wi-Fi or internet)'} onPress={() => setShowRelay((on) => !on)} />
        {showRelay ? (
          <View style={styles.section}>
            <Field label="Relay address">
              <Input
                value={relayUrl}
                onChangeText={setRelayUrl}
                placeholder="ws://computer-address:7879"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </Field>
            <Field label="Token (optional)">
              <Input
                value={relayToken}
                onChangeText={setRelayToken}
                placeholder="Token, if the relay needs one"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </Field>
            <Button title="Create my relay queue" compact onPress={createOwnQueue} />
            {ownLink ? (
              <View style={styles.section}>
                <Text tone="muted">Your relay queue is ready. Give your contact link to whoever may write to you.</Text>
                <Row wrap>
                  <TextButton title={showQr ? 'Hide my QR code' : 'Show my QR code'} onPress={() => setShowQr((on) => !on)} />
                  <TextButton title="Share my contact link" onPress={() => void shareLink(ownLink)} />
                </Row>
                {showQr ? (
                  <>
                    <QrCode text={ownLink} />
                    <Text variant="caption" tone="muted">
                      Scan it with the other phone's camera and open the link in Erevos. If the camera only
                      shows the text, copy it and paste it below on that phone.
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}
            <Text tone="muted">Add a contact by the contact link they gave you:</Text>
            <Row>
              <Input
                value={contactDraft}
                onChangeText={setContactDraft}
                placeholder="erevos://contact link"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.grow}
              />
              <Button title="Add" compact onPress={addContact} />
            </Row>
          </View>
        ) : null}
      </ScrollView>
      <ScrollView
        ref={thread}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        onContentSizeChange={() => {
          if (holdScroll.current) holdScroll.current = false;
          else thread.current?.scrollToEnd({ animated: true });
        }}
      >
        {firstImported > 0 ? (
          <TextButton
            title={`Show earlier imported messages (${firstImported} more)`}
            onPress={() => {
              holdScroll.current = true;
              setImportedShown((count) => count + IMPORTED_PAGE * 4);
            }}
          />
        ) : null}
        {imported.length > 0 ? (
          <Text variant="caption" tone="muted" style={styles.divider}>
            Imported from {importedFrom}: only on this phone, only to read.
          </Text>
        ) : null}
        {imported.slice(firstImported).map((message, i) => {
          const files = mediaText(message.media);
          const ink = message.mine ? styles.mineText : styles.theirsText;
          return (
            <View key={`imported-${firstImported + i}`} style={[styles.bubble, message.mine ? styles.mine : styles.theirs, styles.imported]}>
              {importedGroup && !message.mine && message.sender ? <Text style={[ink, styles.sender]}>{message.sender}</Text> : null}
              {message.text ? <Text style={ink}>{message.text}</Text> : null}
              {files ? <Text style={[ink, styles.files]}>{`${files}, not imported`}</Text> : null}
              {message.at ? <Text style={[ink, styles.time]}>{shownTime(message.at)}</Text> : null}
            </View>
          );
        })}
        {imported.length > 0 ? (
          <Text variant="caption" tone="muted" style={styles.divider}>
            Continued in Erevos
          </Text>
        ) : null}
        {visible.map((message) => (
          <Pressable
            key={message.id}
            onLongPress={() => deleteMessage(message)}
            accessibilityHint="Long press to delete"
            style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}
          >
            <Text style={message.mine ? styles.mineText : styles.theirsText}>{message.text}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {note ? <Text variant="caption" style={styles.note}>{note}</Text> : null}
      <Row>
        <Input value={draft} onChangeText={setDraft} onSubmitEditing={send} placeholder="Message" maxLength={4000} style={styles.grow} />
        <Button title="Send" compact onPress={send} />
      </Row>
    </View>
  );
}

const layout = StyleSheet.create({
  screen: {
    flex: 1,
  },
  gone: {
    display: 'none',
  },
});

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: space.xl - 4,
      gap: space.md,
      backgroundColor: colors.ground,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.md,
    },
    section: {
      gap: space.sm,
    },
    grow: {
      flex: 1,
    },
    // Everything between the title and the messages: it gives way, and scrolls, when the keyboard
    // leaves too little room, so the message field stays in view.
    top: {
      flexGrow: 0,
      flexShrink: 1,
    },
    topContent: {
      gap: space.md,
    },
    thread: {
      flex: 1,
    },
    threadContent: {
      gap: space.sm,
      paddingVertical: space.sm,
    },
    bubble: {
      maxWidth: '80%',
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: Math.min(radius.md, 16),
    },
    mine: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
    },
    theirs: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
    },
    // Imported messages: a little fainter, with their time.
    imported: {
      opacity: 0.8,
      gap: 2,
    },
    divider: {
      alignSelf: 'center',
      textAlign: 'center',
    },
    sender: {
      fontSize: 13,
      fontWeight: '700',
    },
    files: {
      fontSize: 13,
      fontStyle: 'italic',
    },
    time: {
      fontSize: 11,
      opacity: 0.7,
    },
    mineText: {
      fontSize: 15,
      color: colors.onPrimary,
    },
    theirsText: {
      fontSize: 15,
      color: colors.text,
    },
    note: {
      color: colors.accentText,
    },
    safety: {
      fontSize: 15,
      lineHeight: 24,
    },
  });
