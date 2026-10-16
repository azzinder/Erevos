import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Erevos</Text>
      <Text style={styles.body}>No account, no phone number. Messages are end to end encrypted.</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0D0B09',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#F5EFE6',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    color: '#BFB6AA',
  },
});
