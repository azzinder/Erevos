import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { checkContact, offerContact } from '../lib/contact-code';

// Opens from a scanned contact code, erevos://contact?id=...&relay=... (see lib/contact-code.ts).
// Nothing is added until the person confirms, because any link can open this screen.

export default function Contact() {
  const { id, relay } = useLocalSearchParams<{ id?: string; relay?: string }>();
  const code = checkContact(id, relay ?? '');

  if (!code) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Not a contact code</Text>
        <Text style={styles.body}>This link does not hold a relay sender id that Erevos can use.</Text>
        <Pressable onPress={() => router.dismissTo('/')} style={styles.button}>
          <Text style={styles.buttonText}>Close</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a contact</Text>
      <Text style={styles.label}>Relay sender id</Text>
      <Text selectable style={styles.id}>
        {code.senderHex}
      </Text>
      <Text style={styles.label}>Relay</Text>
      <Text selectable style={styles.id}>
        {code.relayUrl || 'Not given. The chat uses the relay this phone already has.'}
      </Text>
      <Text style={styles.body}>Add it only if you scanned it from the other person's phone yourself.</Text>
      <Pressable
        onPress={() => {
          offerContact(code);
          router.dismissTo('/chat');
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Add to chat</Text>
      </Pressable>
      <Pressable onPress={() => router.dismissTo('/')}>
        <Text style={styles.link}>Cancel</Text>
      </Pressable>
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
  id: {
    fontSize: 13,
    color: '#F5EFE6',
    fontFamily: 'monospace',
  },
  link: {
    fontSize: 15,
    color: '#D9A441',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#D9A441',
  },
  buttonText: {
    color: '#0D0B09',
    fontSize: 15,
    fontWeight: '600',
  },
});
