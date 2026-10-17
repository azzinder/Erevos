import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { Button, Page, Row, SectionTitle, Text } from '../components/ui';
import { onRadioEvent, radioStatus, sendText, startRadio, stopRadio, type RadioStatus } from '../modules/erevos-radio';

// Test screen for two Android phones. Not part of the product.

const PERMISSIONS: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [
  'android.permission.NEARBY_WIFI_DEVICES',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.ACCESS_FINE_LOCATION',
];

export default function RadioTest() {
  const [status, setStatus] = useState<RadioStatus | null>(null);
  const [peers, setPeers] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const add = (line: string) => setLog((lines) => [line, ...lines].slice(0, 80));

  useEffect(() => {
    setStatus(radioStatus());
    const subscriptions = [
      onRadioEvent('onStatus', ({ text }) => add(text)),
      onRadioEvent('onPeer', ({ id, kind }) => {
        setPeers((list) => (list.includes(id) ? list : [...list, id]));
        add(`peer ${kind}: ${id}`);
      }),
      onRadioEvent('onText', ({ peer, text }) => add(`${peer}: ${text}`)),
    ];
    return () => {
      subscriptions.forEach((subscription) => subscription?.remove());
      stopRadio();
    };
  }, []);

  if (Platform.OS !== 'android') {
    return (
      <Page>
        <Text tone="muted">The radio test runs on Android only.</Text>
      </Page>
    );
  }

  async function askPermissions() {
    const result = await PermissionsAndroid.requestMultiple(PERMISSIONS);
    const granted = Object.values(result).filter((r) => r === PermissionsAndroid.RESULTS.GRANTED).length;
    add(`permissions granted: ${granted} of ${PERMISSIONS.length}`);
  }

  function start() {
    add('starting');
    startRadio();
    setStatus(radioStatus());
  }

  function stop() {
    stopRadio();
    setPeers([]);
    setStatus(radioStatus());
    add('stopped');
  }

  function sendHello() {
    const linkPeers = peers.filter((peer) => peer.startsWith('aware-') || peer.startsWith('ble-link-'));
    if (linkPeers.length === 0) {
      add('no data link yet');
      return;
    }
    const sent = sendText(linkPeers[0], `hello from ${new Date().toLocaleTimeString()}`);
    add(sent ? `sent to ${linkPeers[0]}` : 'send refused');
  }

  return (
    <Page>
      <Text variant="title">Radio test</Text>
      {status ? (
        <Text tone="muted">
          Android {status.sdk} · Wi-Fi Aware {status.wifiAware ? 'yes' : 'no'} · BLE {status.ble ? 'yes' : 'no'} ·{' '}
          {status.running ? 'running' : 'stopped'}
        </Text>
      ) : null}
      <Row wrap>
        <Button title="Permissions" kind="secondary" compact onPress={askPermissions} />
        <Button title="Start" kind="secondary" compact onPress={start} />
        <Button title="Stop" kind="secondary" compact onPress={stop} />
        <Button title="Send hello" kind="secondary" compact onPress={sendHello} />
      </Row>
      <SectionTitle title={`Peers (${peers.length})`} />
      {peers.map((peer) => (
        <Text key={peer} variant="mono" tone="muted" style={{ fontSize: 13 }}>
          {peer}
        </Text>
      ))}
      <SectionTitle title="Log" />
      {log.map((line, index) => (
        <Text key={`${index}-${line}`} variant="mono" tone="muted" style={{ fontSize: 13 }}>
          {line}
        </Text>
      ))}
    </Page>
  );
}
