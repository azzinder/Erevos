import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onRadioEvent, sendText, startRadio, stopRadio } from '../modules/erevos-radio';
import { QrCode } from '../components/QrCode';
import { contactLink, onContactOffered, parseContact, type ContactCode } from '../lib/contact-code';
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

// Chat over the radio link, with a fallback through the relay. A phone is reached over the
// radio link when that link is ready. Otherwise the message goes through the relay, if a relay
// sender id is saved for that phone. Plain text, kept in memory only, so it is gone on reload.

type Message = { id: number; peer: string; text: string; mine: boolean };
type Queue = { recipientHex: string; senderHex: string };

// What is kept on the phone between launches: the relay, our queue, and the relay routes.
// The recipient id is private, which is why this goes to the secure store.
type Saved = { url: string; token: string; ownQueue: Queue | null; routes: Record<string, string> };

const STORE_KEY = 'erevos.relay';
const RELAY_PREFIX = 'relay:';

type SecureStoreModule = typeof import('expo-secure-store');

// The secure store needs a native build that includes it. Until a phone has one, the chat
// still works and simply forgets its relay settings when it reloads.
function secureStore(): SecureStoreModule | null {
  try {
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

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

export default function Chat() {
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

  useEffect(() => {
    if (Platform.OS !== 'android') return;
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

  // Restores the relay settings, our queue and the contacts saved on this phone.
  useEffect(() => {
    const store = secureStore();
    if (!store) {
      setLoaded(true);
      return;
    }
    store
      .getItemAsync(STORE_KEY)
      .then((saved) => {
        if (!saved) return;
        const data = JSON.parse(saved) as Partial<Saved>;
        const routeMap = data.routes ?? {};
        setRelayUrl(data.url ?? '');
        setRelayToken(data.token ?? '');
        setOwnQueue(data.ownQueue ?? null);
        setRoutes(routeMap);
        setPeers(Object.keys(routeMap).filter((peer) => peer.startsWith(RELAY_PREFIX)));
      })
      .catch(() => {
        // Nothing usable saved. Start empty.
      })
      .finally(() => setLoaded(true));
  }, []);

  // Saves the relay settings, our queue and the contacts whenever they change.
  useEffect(() => {
    const store = secureStore();
    if (!loaded || !store) return;
    const data: Saved = { url: relayUrl, token: relayToken, ownQueue, routes };
    store.setItemAsync(STORE_KEY, JSON.stringify(data)).catch(() => {
      // A failed save only means the next launch starts empty.
    });
  }, [loaded, relayUrl, relayToken, ownQueue, routes]);

  // Takes a contact opened from a scanned code, once the saved contacts are loaded so they
  // cannot overwrite it.
  useEffect(() => {
    if (!loaded) return;
    return onContactOffered(acceptContact);
  }, [loaded, relayUrl, ownQueue]);

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

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Chat runs on Android only for now.</Text>
        <StatusBar style="light" />
      </View>
    );
  }

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
      <Text style={styles.title}>Chat</Text>
      <Text style={styles.body}>
        {peers.length === 0 ? 'Looking for a nearby Erevos phone.' : 'Pick a phone to talk to.'}
      </Text>
      <View style={styles.row}>
        {peers.map((peer) => (
          <Pressable
            key={peer}
            onPress={() => setSelected(peer)}
            style={[styles.chip, peer === selected && styles.chipOn]}
          >
            <Text style={[styles.chipText, peer === selected && styles.chipTextOn]}>{label(peer)}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => setShowRelay((on) => !on)}>
        <Text style={styles.link}>{showRelay ? 'Hide relay' : 'Relay (Wi-Fi or internet)'}</Text>
      </Pressable>
      {showRelay ? (
        <View style={styles.section}>
          <Text style={styles.label}>Relay address</Text>
          <TextInput
            value={relayUrl}
            onChangeText={setRelayUrl}
            placeholder="ws://computer-address:7879"
            placeholderTextColor="#A39A8D"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <Text style={styles.label}>Token (optional)</Text>
          <TextInput
            value={relayToken}
            onChangeText={setRelayToken}
            placeholder="Token, if the relay needs one"
            placeholderTextColor="#A39A8D"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
          />
          <Pressable onPress={createOwnQueue} style={styles.button}>
            <Text style={styles.buttonText}>Create my relay queue</Text>
          </Pressable>
          {ownQueue ? (
            <View style={styles.section}>
              <Text selectable style={styles.id}>
                My relay sender id: {ownQueue.senderHex}
              </Text>
              <Pressable onPress={() => setShowQr((on) => !on)}>
                <Text style={styles.link}>{showQr ? 'Hide my QR code' : 'Show my QR code'}</Text>
              </Pressable>
              {showQr ? (
                <>
                  <QrCode text={contactLink({ senderHex: ownQueue.senderHex, relayUrl: relayUrl.trim() })} />
                  <Text style={styles.label}>
                    Scan it with the other phone's camera and open the link in Erevos. If the camera only
                    shows the text, copy it and paste it below on that phone.
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.body}>Add a contact by the relay sender id or the contact link they gave you:</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={contactDraft}
              onChangeText={setContactDraft}
              placeholder="Sender id or erevos://contact link"
              placeholderTextColor="#A39A8D"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Pressable onPress={addContact} style={styles.button}>
              <Text style={styles.buttonText}>Add</Text>
            </Pressable>
          </View>
          {selectedIsRadio ? (
            <View style={styles.section}>
              <Text style={styles.body}>
                Relay sender id of {label(selected)}: {routes[selected] ?? 'not set'}
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={routeDraft}
                  onChangeText={setRouteDraft}
                  placeholder="48 hex characters"
                  placeholderTextColor="#A39A8D"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <Pressable onPress={saveRoute} style={styles.button}>
                  <Text style={styles.buttonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        ref={thread}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        onContentSizeChange={() => thread.current?.scrollToEnd({ animated: true })}
      >
        {visible.map((message) => (
          <View key={message.id} style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}>
            <Text style={[styles.bubbleText, !message.mine && styles.theirsText]}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          placeholder="Message"
          placeholderTextColor="#A39A8D"
          style={styles.input}
        />
        <Pressable onPress={send} style={styles.button}>
          <Text style={styles.buttonText}>Send</Text>
        </Pressable>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: '#0D0B09',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#F5EFE6',
  },
  body: {
    fontSize: 15,
    color: '#BFB6AA',
  },
  label: {
    fontSize: 13,
    color: '#BFB6AA',
  },
  link: {
    fontSize: 14,
    color: '#D9A441',
  },
  section: {
    gap: 8,
  },
  id: {
    fontSize: 12,
    color: '#F5EFE6',
    fontFamily: 'monospace',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2A2520',
  },
  chipOn: {
    backgroundColor: '#D9A441',
  },
  chipText: {
    fontSize: 13,
    color: '#F5EFE6',
    fontFamily: 'monospace',
  },
  chipTextOn: {
    color: '#0D0B09',
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    gap: 8,
    paddingVertical: 8,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: '#D9A441',
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2520',
  },
  bubbleText: {
    fontSize: 15,
    color: '#0D0B09',
  },
  theirsText: {
    color: '#F5EFE6',
  },
  note: {
    fontSize: 13,
    color: '#D9A441',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4036',
    backgroundColor: '#2A2520',
    color: '#F5EFE6',
    fontSize: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#D9A441',
  },
  buttonText: {
    color: '#0D0B09',
    fontSize: 14,
    fontWeight: '600',
  },
});
