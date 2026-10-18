import { useEffect, useState } from 'react';

import { Button, Card, Field, Input, Page, Text } from '../components/ui';
import { sameRelay } from '../lib/relay';
import { readySpare, setSpareRelay } from '../lib/spare';
import { loadCurrentSpaceData } from '../lock/space-data';

// The space's home relay (lib/spare.ts): a second relay with a queue of its own, which contacts
// write to while the main relay cannot be reached.

export default function HomeRelay() {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState('');
  const [mainUrl, setMainUrl] = useState('');

  useEffect(() => {
    loadCurrentSpaceData()
      .then((data) => {
        setMainUrl(data.url);
        setUrl(data.spare.url);
        setToken(data.spare.token);
        setReady(!!data.spare.url && !!data.spare.queue);
      })
      .catch(() => setNote('The settings of this space could not open.'));
  }, []);

  async function save() {
    setNote('');
    const address = url.trim();
    if (address && !/^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(address)) {
      setNote('A relay address starts with ws:// or wss://.');
      return;
    }
    if (address && sameRelay(address, mainUrl)) {
      setNote('That is your relay already. A home relay is another one.');
      return;
    }
    try {
      await setSpareRelay(address, token);
      setReady(false);
      if (!address) {
        setNote('No home relay. Contacts write only to your relay.');
        return;
      }
      await readySpare();
      setReady(true);
      setNote('Your queue on the home relay is ready. Contacts learn it from your next message, or from your contact link.');
    } catch (error) {
      setNote(`Saved, but the home relay could not be reached: ${error instanceof Error ? error.message : String(error)}. It is tried again with each look.`);
    }
  }

  return (
    <Page>
      <Text variant="title">Home relay</Text>
      <Card>
        <Text tone="muted">
          A second relay with a queue of its own, for example one at home on a Raspberry Pi or an old computer. Your
          contact link and every message say it beside your relay, so contacts write there while your relay cannot be
          reached, and what you send goes through it when yours is down. Erevos takes what comes there with each look.
        </Text>
        <Text tone="muted">
          Whoever runs it sees what your relay sees: this phone's address when it takes messages, and when and how much
          comes. Hidden chats do not use it.
        </Text>
        <Field label="Home relay address">
          <Input value={url} onChangeText={setUrl} placeholder="wss://relay.at-home.example" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        </Field>
        <Field label="Token (optional)">
          <Input value={token} onChangeText={setToken} placeholder="Token, if the relay needs one" autoCapitalize="none" autoCorrect={false} secureTextEntry />
        </Field>
        <Button title="Save" onPress={() => void save()} />
        {ready ? <Text variant="caption" tone="faint">Your queue there is ready.</Text> : null}
      </Card>
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
