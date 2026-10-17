import { useState } from 'react';

import { Button, Card, Field, Input, Page, Row, Text } from '../components/ui';
import { createQueue, decodeEnvelope, encodeEnvelope, fromHex, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { useColors } from '../theme/context';

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
  const colors = useColors();

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
    <Page>
      <Text variant="title">Relay test (Wi-Fi)</Text>
      <Text tone="muted">
        Messages wait on the relay running on the computer. Both phones must be on the same Wi-Fi and use that
        computer's address.
      </Text>
      <Input
        value={url}
        onChangeText={setUrl}
        placeholder="ws://172.22.140.150:7879"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Input
        value={token}
        onChangeText={setToken}
        placeholder="Token, if the relay needs one"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Button title="Create queue" onPress={create} />
      {queue ? (
        <Card>
          <Field label="Sender id (give this to the phone that writes to you)">
            <Text selectable variant="mono">{queue.senderHex}</Text>
          </Field>
          <Field label="Recipient id (keep private, used to receive)">
            <Text selectable variant="mono">{queue.recipientHex}</Text>
          </Field>
        </Card>
      ) : null}
      <Field label="Send to a sender id">
        <Input value={sendTo} onChangeText={setSendTo} placeholder="48 hex characters" autoCapitalize="none" autoCorrect={false} />
      </Field>
      <Input value={draft} onChangeText={setDraft} placeholder="Message" />
      <Row>
        <Button title="Send" onPress={send} style={{ flex: 1 }} />
        <Button title="Receive" kind="secondary" onPress={receive} style={{ flex: 1 }} />
      </Row>
      {log.map((line, index) => (
        <Text key={index} variant="caption" color={colors.accentText}>
          {line}
        </Text>
      ))}
    </Page>
  );
}
