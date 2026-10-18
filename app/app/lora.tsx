import { useEffect, useState } from 'react';

import { Button, Card, Chip, Page, Row, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { canLora, findRadios, lora, resumeLora, savedRadio, setRadio, type SavedRadio } from '../lib/radio';
import type { LoraState } from '../lib/lora';

// LoRa through a Meshtastic radio (lib/lora.ts), off unless a radio is set here: finding one,
// what it means for privacy before it is on, and how the radio is.

// Meshtastic's regions by their code (config.proto, RegionCode), named as its app names them.
const REGIONS = [
  '',
  'US', 'EU_433', 'EU_868', 'CN', 'JP', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433',
  'UA_868', 'MY_433', 'MY_919', 'SG_923', 'PH_433', 'PH_868', 'PH_915', 'ANZ_433', 'KZ_433', 'KZ_863',
  'NP_865', 'BR_902', 'ITU1_2M', 'ITU2_2M', 'EU_866', 'EU_874', 'EU_917', 'EU_N_868', 'ITU3_2M', 'ITU1_70CM',
  'ITU2_70CM', 'ITU3_70CM', 'ITU2_125CM',
];

const SHOWN: Record<LoraState['status'], string> = {
  off: 'Off',
  connecting: 'Linking to the radio…',
  starting: 'Linked, reading its settings…',
  up: 'Linked',
  down: 'Not linked',
};

export default function LoraScreen() {
  const [radio, setRadioShown] = useState<SavedRadio | null | undefined>(undefined);
  const [state, setState] = useState<LoraState>(lora.state());
  // The radios found so far while looking, or null when not looking; and which look this is.
  const [found, setFound] = useState<SavedRadio[] | null>(null);
  const [round, setRound] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    savedRadio()
      .then(setRadioShown)
      .catch(() => setRadioShown(null));
    // Set already, as before Erevos last closed: it links now, if Chat did not yet.
    resumeLora();
    return lora.onChange(() => setState(lora.state()));
  }, []);

  // Looks for radios while the list shows, a few seconds each look.
  const looking = found !== null;
  useEffect(() => {
    if (!looking) return;
    return findRadios((radio) => setFound((list) => (list && !list.some((r) => r.address === radio.address) ? [...list, radio] : list)));
  }, [looking, round]);

  if (!canLora()) {
    return (
      <Page>
        <Text variant="title">LoRa radio</Text>
        <Text tone="muted">This build of Erevos has no LoRa yet. It comes with the next build of the app, on Android.</Text>
      </Page>
    );
  }

  function look() {
    ask(
      'Before LoRa is on',
      'A LoRa radio is heard kilometres away, and it can be found by its signal. What Erevos sends stays ' +
        'end-to-end encrypted, but anyone with a radio can tell that yours sends, when and how much.\n\n' +
        'Your radio also says its own name to every radio in reach, and where it is if it has GPS or a ' +
        'fixed position, as Meshtastic does. Turn those off in the Meshtastic app if you do not want that.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Find my radio', onPress: () => setFound([]) },
      ],
    );
  }

  async function use(picked: SavedRadio) {
    setNote('');
    try {
      await setRadio(picked);
      setRadioShown(picked);
      setFound(null);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  async function turnOff() {
    setNote('');
    try {
      await setRadio(null);
      setRadioShown(null);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  const { status, detail, name, region, transmits, waiting } = state;
  return (
    <Page>
      <Text variant="title">LoRa radio</Text>
      <Card>
        <Text variant="bodyStrong">{radio ? `LoRa: on, ${radio.name || radio.address}` : 'LoRa: off'}</Text>
        <Text tone="muted">
          With a Meshtastic LoRa radio linked to this phone by Bluetooth, Erevos reaches Erevos with a radio on the same
          mesh, kilometres away, with no internet, through the Meshtastic radios between too.
        </Text>
        <Text tone="muted">
          It is slow: a message takes seconds on the air, and the law allows a radio only so much air time. So LoRa takes
          a message only when the relay and the phones nearby cannot, and only text and deletes: not voice messages,
          photos, read marks or calls. Hidden chats never go over it.
        </Text>
        <Text tone="muted">
          While Erevos is linked to the radio, the Meshtastic app cannot be: close it, or disconnect it there first.
        </Text>
        {radio === undefined ? null : radio ? (
          <Button title="Turn LoRa off" kind="secondary" onPress={() => void turnOff()} />
        ) : found === null ? (
          <Button title="Find my radio" onPress={look} />
        ) : null}
      </Card>
      {!radio && found !== null ? (
        <Card>
          <Text variant="bodyStrong">{found.length > 0 ? 'Radios found' : 'Looking for Meshtastic radios…'}</Text>
          <Text tone="muted">Turn the radio on and keep it near. A radio not paired yet asks for its PIN: it shows on its screen, or is 123456.</Text>
          <Row wrap>
            {found.map((r) => (
              <Chip key={r.address} label={r.name || r.address} onPress={() => void use(r)} />
            ))}
          </Row>
          <Row wrap>
            <Button title="Look again" kind="secondary" compact onPress={() => setRound((n) => n + 1)} />
            <Button title="Cancel" kind="secondary" compact onPress={() => setFound(null)} />
          </Row>
        </Card>
      ) : null}
      {radio ? (
        <Card>
          <Text variant="bodyStrong">{SHOWN[status]}</Text>
          {name ? <Text tone="muted">{`The radio: ${name}`}</Text> : null}
          {status === 'down' && detail ? <Text tone="muted">{detail}</Text> : null}
          {status === 'down' ? <Text variant="caption" tone="faint">Erevos tries again every half a minute while it is open.</Text> : null}
          {region === 0 ? <Text tone="muted">Its region is not set, so it sends nothing. Set it in the Meshtastic app.</Text> : null}
          {region ? <Text variant="caption" tone="faint">{`Region: ${REGIONS[region] ?? region}`}</Text> : null}
          {!transmits ? <Text tone="muted">It does not send: Transmit enabled is off in its LoRa settings, in the Meshtastic app.</Text> : null}
          {waiting > 0 ? <Text variant="caption" tone="faint">{`${waiting} pieces waiting to go`}</Text> : null}
        </Card>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
