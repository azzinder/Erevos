import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { qrRows } from '../lib/qr';

// Dark modules on white with a quiet zone of four modules, as scanners expect, even in the
// app's dark theme.
const QUIET = 4;

export function QrCode({ text, size = 260 }: { text: string; size?: number }) {
  const rows = useMemo(() => qrRows(text), [text]);
  const cell = Math.max(2, Math.floor(size / (rows.length + QUIET * 2)));
  return (
    <View style={[styles.frame, { padding: cell * QUIET }]} accessibilityLabel="QR code">
      {rows.map((runs, row) => (
        <View key={row} style={styles.row}>
          {runs.map((run, index) => (
            <View
              key={index}
              style={{ width: run.length * cell, height: cell, backgroundColor: run.dark ? '#000000' : '#FFFFFF' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
  },
});
