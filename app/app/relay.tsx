import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createQueue, decodeEnvelope, encodeEnvelope, fromHex, receiveMessage, sendMessage, toHex } from '../lib/relay';

// Messages through the relay running on a computer, over WebSocket. Phones on the same
// Wi-Fi reach it at ws://<computer-IP>:7879. Nothing is saved, so reloading forgets the queue.

type Queue = { recipientHex: string; senderHex: string };

export default function Relay() {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [queue, setQueue] = useState<Queue | null>(null);
  const [sendTo, setSendTo] = useState('');
  const [draft, setDraft] = useState('');
  const [log, setLog] = useState<string[]>([]);

  function note(line: string) {
    setLog((list) => [line, ...list].slice(0, 30));
  }

  function target() {
    const relay = url.trim();
    if (!relay) {
      note('Type the relay address first.');
      return null;
    }
    return { url: relay, token: token.trim() || undefined };
  }

  async function attempt(action: () => Promise<string>) {
    try {
      note(await action());
    } catch (error) {
      note(error instanceof Error ? error.message : String(error));
    }
  }

  function create() {
    const relay = target();
    if (!relay) return;
    attempt(async () => {
      const ids = await createQueue(relay);
      setQueue({ recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
      return 'Queue created.';
    });
  }

  function send() {
    const relay = target();
    const text = draft.trim();
    if (!relay || !text) return;
    attempt(async () => {
      await sendMessage(relay, fromHex(sendTo), encodeEnvelope('', text));
      setDraft('');
      return `Sent: ${text}`;
    });
  }

  function receive() {
    const relay = target();
    if (!relay) return;
    if (!queue) {
      note('Create a queue first.');
      return;
    }
    attempt(async () => {
      const bytes = await receiveMessage(relay, fromHex(queue.recipientHex));
      const envelope = bytes ? decodeEnvelope(bytes) : null;
      return envelope ? `Received: ${envelope.text}` : 'Nothing waiting.';
    });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Relay test (Wi-Fi)</Text>
      <Text style={styles.body}>
        Messages wait on the relay running on the computer. Both phones must be on the same Wi-Fi and use that
        computer's address.
      </Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="ws://172.22.140.150:7879"
        placeholderTextColor="#7D7468"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.input}
      />
      <TextInput
        value={token}
        onChangeText={setToken}
        placeholder="Token, if the relay needs one"
        placeholderTextColor="#7D7468"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={styles.input}
      />
      <Pressable onPress={create} style={styles.button}>
        <Text style={styles.buttonText}>Create queue</Text>
      </Pressable>
      {queue ? (
        <View style={styles.card}>
          <Text style={styles.label}>Sender id (give this to the phone that writes to you)</Text>
          <Text selectable style={styles.id}>{queue.senderHex}</Text>
          <Text style={styles.label}>Recipient id (keep private, used to receive)</Text>
          <Text selectable style={styles.id}>{queue.recipientHex}</Text>
        </View>
      ) : null}
      <Text style={styles.label}>Send to a sender id</Text>
      <TextInput
        value={sendTo}
        onChangeText={setSendTo}
        placeholder="48 hex characters"
        placeholderTextColor="#7D7468"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Message"
        placeholderTextColor="#7D7468"
        style={styles.input}
      />
      <View style={styles.row}>
        <Pressable onPress={send} style={[styles.button, styles.half]}>
          <Text style={styles.buttonText}>Send</Text>
        </Pressable>
        <Pressable onPress={receive} style={[styles.button, styles.half]}>
          <Text style={styles.buttonText}>Receive</Text>
        </Pressable>
      </View>
      <View style={styles.log}>
        {log.map((line, index) => (
          <Text key={index} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </View>
      <StatusBar style="light" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0B09',
  },
  container: {
    padding: 24,
    gap: 12,
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
  id: {
    fontSize: 12,
    color: '#F5EFE6',
    fontFamily: 'monospace',
  },
  card: {
    gap: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2A2520',
  },
  input: {
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  log: {
    gap: 6,
  },
  logLine: {
    fontSize: 13,
    color: '#D9A441',
  },
});
