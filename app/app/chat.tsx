import { useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onRadioEvent, sendText, startRadio, stopRadio } from '../modules/erevos-radio';
import { KeyboardPaddedView } from '../components/keyboard';
import { PasswordSheet } from '../components/PasswordSheet';
import { QrCode } from '../components/QrCode';
import { Button, Chip, Field, Input, Page, Row, Text, TextButton } from '../components/ui';
import { contactLink, onContactOffered, parseContact, type ContactCode } from '../lib/contact-code';
import { openHidden, setHiddenPassword } from '../lock/hidden';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadHiddenData, updateCurrentSpaceData, updateHiddenData, type Queue, type SpaceData } from '../lock/space-data';
import {
  createQueue,
  decodeEnvelope,
  encodeEnvelope,
  fromHex,
  isQueueNotFound,
  receiveMessage,
  sendMessage,
  toHex,
  type Relay,
} from '../lib/relay';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles } from '../theme/context';

// Chat over the radio link, with a fallback through the relay. A phone is reached over the
// radio link when that link is ready. Otherwise the message goes through the relay, if a relay
// sender id is saved for that phone. Plain text, kept in memory only, so it is gone on reload.
//
// Every space also has hidden chats (lock/hidden.ts), opened with their own password from the
// Hidden chats button, which every space shows whether it has hidden chats or not. They are a
// second chat with their own relay queue and contacts, over the relay only (the radio link is
// the phone's, and its chats are the open space's). The other chats stay open underneath and
// keep receiving. Hidden chats close when the app goes to the background or this screen closes,
// and their messages go with them.

type Message = { id: number; peer: string; text: string; mine: boolean };

const RELAY_PREFIX = 'relay:';

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

function label(peer: string): string {
  return peer.startsWith(RELAY_PREFIX) ? `relay ${peer.slice(RELAY_PREFIX.length, RELAY_PREFIX.length + 8)}` : peer;
}

export default function ChatScreen() {
  const [hiddenKey, setHiddenKey] = useState<Uint8Array | null>(null);
  const [asking, setAsking] = useState<'open' | 'change' | null>(null);
  const insets = useSafeAreaInsets();

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
        <Chat hiddenKey={null} shown={!hiddenKey} onHidden={() => setAsking('open')} />
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
function Chat({ hiddenKey, shown, onHidden, onChangePassword }: {
  hiddenKey: Uint8Array | null;
  shown: boolean;
  onHidden: () => void;
  onChangePassword?: () => void;
}) {
  const [peers, setPeers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  // Peer id to the relay sender id that reaches it. Typed in for radio peers, and
  // learned from the sender for relay peers.
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [showRelay, setShowRelay] = useState(false);
  const [relayUrl, setRelayUrl] = useState('');
  const [relayToken, setRelayToken] = useState('');
  const [ownQueue, setOwnQueue] = useState<Queue | null>(null);
  const [routeDraft, setRouteDraft] = useState('');
  const [contactDraft, setContactDraft] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const nextId = useRef(1);
  const thread = useRef<ScrollView>(null);
  const styles = useStyles(makeStyles);

  function relayTarget(): Relay | null {
    const url = relayUrl.trim();
    return url ? { url, token: relayToken.trim() || undefined } : null;
  }

  // Adds a contact from a code: typed or pasted here, or scanned and opened on the contact screen.
  function acceptContact(code: ContactCode) {
    if (code.senderHex === ownQueue?.senderHex) {
      setNote("Not added. That is this phone's own code.");
      return;
    }
    const ours = relayUrl.trim();
    if (code.relayUrl && ours && !sameRelay(code.relayUrl, ours)) {
      setNote(
        `Not added. That contact uses the relay at ${code.relayUrl}, and this phone uses ${ours}. Both phones need the same relay for now.`,
      );
      return;
    }
    if (code.relayUrl && !ours) setRelayUrl(code.relayUrl);
    const peer = `${RELAY_PREFIX}${code.senderHex}`;
    setRoutes((list) => ({ ...list, [peer]: code.senderHex }));
    setPeers((list) => (list.includes(peer) ? list : [...list, peer]));
    setSelected(peer);
    setNote('Contact added. Messages to it go through the relay.');
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
        setMessages((list) => [...list, { id: nextId.current++, peer, text, mine: false }]);
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

  // Restores the relay settings, our queue and the contacts this space keeps on the phone,
  // sealed with its key (lock/space-data.ts). Another space finds only its own.
  useEffect(() => {
    (hiddenKey ? loadHiddenData(currentSpace().space, hiddenKey) : loadCurrentSpaceData())
      .then((data) => {
        setRelayUrl(data.url);
        setRelayToken(data.token);
        setOwnQueue(data.ownQueue);
        setRoutes(data.routes);
        setPeers(Object.keys(data.routes).filter((peer) => peer.startsWith(RELAY_PREFIX)));
      })
      .catch(() => {
        // Nothing usable saved. Start empty.
      })
      .finally(() => setLoaded(true));
  }, []);

  // Saves the relay settings, our queue and the contacts whenever they change.
  useEffect(() => {
    if (!loaded) return;
    // Only what the chat keeps: the look kept beside it stays as it is.
    const data: Partial<SpaceData> = { url: relayUrl, token: relayToken, ownQueue, routes };
    (hiddenKey ? updateHiddenData(currentSpace().space, hiddenKey, data) : updateCurrentSpaceData(data)).catch(() => {
      // A failed save only means the next launch starts empty.
    });
  }, [loaded, relayUrl, relayToken, ownQueue, routes]);

  // Takes a contact opened from a scanned code, once the saved contacts are loaded so they
  // cannot overwrite it.
  useEffect(() => {
    if (!loaded || !shown) return;
    return onContactOffered(acceptContact);
  }, [loaded, shown, relayUrl, ownQueue]);

  // Looks at our own relay queue every few seconds. A message names the sender's relay
  // sender id, so we can answer through the relay and list that sender as a chat.
  useEffect(() => {
    const url = relayUrl.trim();
    if (!url || !ownQueue) return;
    const target: Relay = { url, token: relayToken.trim() || undefined };
    const recipient = fromHex(ownQueue.recipientHex);
    let active = true;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        const bytes = await receiveMessage(target, recipient);
        const envelope = bytes ? decodeEnvelope(bytes) : null;
        if (!active || !envelope) return;
        const peer = `${RELAY_PREFIX}${envelope.from || 'anonymous'}`;
        if (envelope.from) setRoutes((list) => ({ ...list, [peer]: envelope.from }));
        setPeers((list) => (list.includes(peer) ? list : [...list, peer]));
        setSelected((current) => current ?? peer);
        setMessages((list) => [...list, { id: nextId.current++, peer, text: envelope.text, mine: false }]);
      } catch (error) {
        if (!active) return;
        if (!isQueueNotFound(error)) {
          setNote(error instanceof Error ? error.message : String(error));
          return;
        }
        // The relay no longer has our queue (deleted, or a relay that keeps queues in memory
        // was restarted). Make a new one so messages can reach us again.
        try {
          const ids = await createQueue(target);
          if (!active) return;
          setOwnQueue({ recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
          setNote(
            'The relay had lost your queue, so a new one was made. Give your contacts your new relay sender id.',
          );
        } catch (retry) {
          if (active) setNote(retry instanceof Error ? retry.message : String(retry));
        }
      } finally {
        busy = false;
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [relayUrl, relayToken, ownQueue]);

  function keep(peer: string, text: string) {
    setMessages((list) => [...list, { id: nextId.current++, peer, text, mine: true }]);
    setDraft('');
  }

  async function send() {
    const text = draft.trim();
    if (!text || !selected) return;
    if (!selected.startsWith(RELAY_PREFIX) && sendText(selected, text)) {
      keep(selected, text);
      setNote('');
      return;
    }
    const route = routes[selected];
    const target = relayTarget();
    if (!target) {
      setNote('Not sent. Type the relay address in Relay first.');
      return;
    }
    if (!route) {
      setNote('Not sent. The link to this phone is not ready, and no relay route is saved for it.');
      return;
    }
    try {
      await sendMessage(target, fromHex(route), encodeEnvelope(ownQueue?.senderHex ?? '', text));
      keep(selected, text);
      setNote('Sent through the relay.');
    } catch (error) {
      setNote(
        isQueueNotFound(error)
          ? "Not sent. The relay does not have this contact's queue any more. Ask them for their new relay sender id."
          : error instanceof Error
            ? error.message
            : String(error),
      );
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
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  function saveRoute() {
    if (!selected || selected.startsWith(RELAY_PREFIX)) return;
    const code = parseContact(routeDraft);
    if (!code) {
      setNote('That is not a relay sender id (48 hex characters) or an Erevos contact link.');
      return;
    }
    setRoutes((list) => ({ ...list, [selected]: code.senderHex }));
    setRouteDraft('');
    setNote('Relay route saved.');
  }

  function addContact() {
    const code = parseContact(contactDraft);
    if (!code) {
      setNote('That is not a relay sender id (48 hex characters) or an Erevos contact link.');
      return;
    }
    setContactDraft('');
    acceptContact(code);
  }

  const visible = messages.filter((message) => message.peer === selected);
  const selectedIsRadio = selected !== null && !selected.startsWith(RELAY_PREFIX);

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
          {peers.length > 0
            ? 'Pick a chat.'
            : hiddenKey
              ? 'No hidden chats yet. Add a contact through the relay below.'
              : 'Looking for a nearby Erevos phone.'}
        </Text>
        <Row wrap>
          {peers.map((peer) => (
            <Chip key={peer} label={label(peer)} mono selected={peer === selected} onPress={() => setSelected(peer)} />
          ))}
        </Row>
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
            {ownQueue ? (
              <View style={styles.section}>
                <Text selectable variant="mono">
                  My relay sender id: {ownQueue.senderHex}
                </Text>
                <TextButton title={showQr ? 'Hide my QR code' : 'Show my QR code'} onPress={() => setShowQr((on) => !on)} />
                {showQr ? (
                  <>
                    <QrCode text={contactLink({ senderHex: ownQueue.senderHex, relayUrl: relayUrl.trim() })} />
                    <Text variant="caption" tone="muted">
                      Scan it with the other phone's camera and open the link in Erevos. If the camera only
                      shows the text, copy it and paste it below on that phone.
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}
            <Text tone="muted">Add a contact by the relay sender id or the contact link they gave you:</Text>
            <Row>
              <Input
                value={contactDraft}
                onChangeText={setContactDraft}
                placeholder="Sender id or erevos://contact link"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.grow}
              />
              <Button title="Add" compact onPress={addContact} />
            </Row>
            {selectedIsRadio ? (
              <View style={styles.section}>
                <Text tone="muted">
                  Relay sender id of {label(selected)}: {routes[selected] ?? 'not set'}
                </Text>
                <Row>
                  <Input
                    value={routeDraft}
                    onChangeText={setRouteDraft}
                    placeholder="48 hex characters"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.grow}
                  />
                  <Button title="Save" compact onPress={saveRoute} />
                </Row>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <ScrollView
        ref={thread}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        onContentSizeChange={() => thread.current?.scrollToEnd({ animated: true })}
      >
        {visible.map((message) => (
          <View key={message.id} style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}>
            <Text style={message.mine ? styles.mineText : styles.theirsText}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      {note ? <Text variant="caption" style={styles.note}>{note}</Text> : null}
      <Row>
        <Input value={draft} onChangeText={setDraft} onSubmitEditing={send} placeholder="Message" style={styles.grow} />
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
  });
