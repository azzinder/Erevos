import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { font, Text } from '../components/ui';
import { Logo } from '../lock/gate';
import type { Colors } from '../theme/colors';
import { useStyles } from '../theme/context';

export default function Home() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Logo />
      <Text variant="title" style={styles.title}>
        Erevos
      </Text>
      <Text tone="muted" style={styles.body}>
        No account, no phone number. A test version: messages through a relay are end-to-end encrypted, nearby ones not yet, and nothing is audited.
      </Text>
      <Link href="/chat" style={styles.link}>Chat (Android)</Link>
      <Link href="/radio" style={styles.link}>Radio test (Android)</Link>
      <Link href="/relay" style={styles.link}>Relay test (Wi-Fi)</Link>
      <Link href="/security" style={styles.link}>Lock and second password</Link>
      <Link href="/appearance" style={styles.link}>Appearance</Link>
      <Link href="/guide" style={styles.link}>User guide</Link>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.ground,
    },
    title: {
      marginTop: 12,
      marginBottom: 12,
    },
    body: {
      textAlign: 'center',
    },
    link: {
      marginTop: 24,
      fontSize: 15,
      color: colors.accentText,
      ...font('600'),
    },
  });
