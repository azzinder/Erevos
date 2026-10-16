import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
      <View style={styles.container}>
        <Text style={styles.body}>The radio test runs on Android only.</Text>
        <StatusBar style="light" />
      </View>
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
    const awarePeers = peers.filter((peer) => peer.startsWith('aware-'));
    if (awarePeers.length === 0) {
      add('no Wi-Fi Aware peer yet');
      return;
    }
    const sent = sendText(awarePeers[0], `hello from ${new Date().toLocaleTimeString()}`);
    add(sent ? `sent to ${awarePeers[0]}` : 'send refused');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Radio test</Text>
      {status ? (
        <Text style={styles.body}>
          Android {status.sdk} · Wi-Fi Aware {status.wifiAware ? 'yes' : 'no'} · BLE {status.ble ? 'yes' : 'no'} ·{' '}
          {status.running ? 'running' : 'stopped'}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Button label="Permissions" onPress={askPermissions} />
        <Button label="Start" onPress={start} />
        <Button label="Stop" onPress={stop} />
        <Button label="Send hello" onPress={sendHello} />
      </View>
      <Text style={styles.section}>Peers ({peers.length})</Text>
      {peers.map((peer) => (
        <Text key={peer} style={styles.line}>
          {peer}
        </Text>
      ))}
      <Text style={styles.section}>Log</Text>
      {log.map((line, index) => (
        <Text key={`${index}-${line}`} style={styles.line}>
          {line}
        </Text>
      ))}
      <StatusBar style="light" />
    </ScrollView>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
    backgroundColor: '#0D0B09',
    minHeight: '100%',
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
  section: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EFE6',
  },
  line: {
    fontSize: 13,
    color: '#BFB6AA',
    fontFamily: 'monospace',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#2A2520',
  },
  buttonText: {
    color: '#F5EFE6',
    fontSize: 14,
  },
});
