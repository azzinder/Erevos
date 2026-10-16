import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onRadioEvent, sendText, startRadio, stopRadio } from '../modules/erevos-radio';

// Chat over the radio link. Plain text for now, kept in memory only, so it is gone on reload.

type Message = { id: number; peer: string; text: string; mine: boolean };

const PERMISSIONS: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [
  'android.permission.NEARBY_WIFI_DEVICES',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.ACCESS_FINE_LOCATION',
];

export default function Chat() {
  const [peers, setPeers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const nextId = useRef(1);
  const thread = useRef<ScrollView>(null);

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

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Chat runs on Android only for now.</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  function send() {
    const text = draft.trim();
    if (!text || !selected) return;
    if (!sendText(selected, text)) {
      setNote('Not sent. The link to this phone is not ready.');
      return;
    }
    setMessages((list) => [...list, { id: nextId.current++, peer: selected, text, mine: true }]);
    setDraft('');
    setNote('');
  }

  const visible = messages.filter((message) => message.peer === selected);

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
            <Text style={styles.chipText}>{peer}</Text>
          </Pressable>
        ))}
      </View>
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
        <Pressable onPress={send} style={styles.send}>
          <Text style={styles.sendText}>Send</Text>
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
  send: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#D9A441',
  },
  sendText: {
    color: '#0D0B09',
    fontSize: 14,
    fontWeight: '600',
  },
});
