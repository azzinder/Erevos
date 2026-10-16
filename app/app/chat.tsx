import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onRadioEvent, sendText, startRadio, stopRadio } from '../modules/erevos-radio';
import {
  createQueue,
  decodeEnvelope,
  encodeEnvelope,
  fromHex,
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

const RELAY_PREFIX = 'relay:';

const PERMISSIONS: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [
  'android.permission.NEARBY_WIFI_DEVICES',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.ACCESS_FINE_LOCATION',
];

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
  const nextId = useRef(1);
  const thread = useRef<ScrollView>(null);

  function relayTarget(): Relay | null {
    const url = relayUrl.trim();
    return url ? { url, token: relayToken.trim() || undefined } : null;
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
        if (active) setNote(error instanceof Error ? error.message : String(error));
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
    if (!route || !target) {
      setNote('Not sent. The link to this phone is not ready, and no relay route is saved for it.');
      return;
    }
    try {
      await sendMessage(target, fromHex(route), encodeEnvelope(ownQueue?.senderHex ?? '', text));
      keep(selected, text);
      setNote('Sent through the relay.');
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
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
    try {
      const hex = routeDraft.trim().toLowerCase();
      fromHex(hex);
      setRoutes((list) => ({ ...list, [selected]: hex }));
      setRouteDraft('');
      setNote('Relay route saved.');
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  function addContact() {
    try {
      const hex = contactDraft.trim().toLowerCase();
      fromHex(hex);
      const peer = `${RELAY_PREFIX}${hex}`;
      setRoutes((list) => ({ ...list, [peer]: hex }));
      setPeers((list) => (list.includes(peer) ? list : [...list, peer]));
      setSelected(peer);
      setContactDraft('');
      setNote('Contact added. Messages to it go through the relay.');
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
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
            <Text style={styles.chipText}>{label(peer)}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => setShowRelay((on) => !on)}>
        <Text style={styles.link}>{showRelay ? 'Hide relay' : 'Relay (Wi-Fi or internet)'}</Text>
      </Pressable>
      {showRelay ? (
        <View style={styles.section}>
          <TextInput
            value={relayUrl}
            onChangeText={setRelayUrl}
            placeholder="ws://computer-address:7879"
            placeholderTextColor="#7D7468"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <TextInput
            value={relayToken}
            onChangeText={setRelayToken}
            placeholder="Token, if the relay needs one"
            placeholderTextColor="#7D7468"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
          />
          <Pressable onPress={createOwnQueue} style={styles.button}>
            <Text style={styles.buttonText}>Create my relay queue</Text>
          </Pressable>
          {ownQueue ? (
            <Text selectable style={styles.id}>
              My relay sender id: {ownQueue.senderHex}
            </Text>
          ) : null}
          <Text style={styles.body}>Add a contact by the relay sender id they gave you:</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={contactDraft}
              onChangeText={setContactDraft}
              placeholder="48 hex characters"
              placeholderTextColor="#7D7468"
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
                  placeholderTextColor="#7D7468"
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
            <Text style={styles.bubbleText}>{message.text}</Text>
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
          placeholderTextColor="#7D7468"
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#2A2520',
    color: '#F5EFE6',
    fontSize: 15,
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
