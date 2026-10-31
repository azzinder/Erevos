// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect } from 'react';
import { StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sha256Bytes, toHex, utf8Encode } from '../lib/crypto';
import { t } from '../lib/i18n';
import type { MatrixCall } from '../lib/matrix-calls';
import { RING, Round } from './call-screen';
import { KeyFace } from './key-face';
import { Text } from './ui';

// A Matrix call that rings (lib/matrix-calls.ts), over whatever screen shows, as Erevos's own calls
// ring (components/call-screen.tsx): who calls, and Answer or Decline. Answered, the call goes on in
// Element Call's own window.

export function MatrixRingScreen({ call, name, onAnswer, onDecline }: { call: MatrixCall; name: string; onAnswer: () => void; onDecline: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Vibration.vibrate(RING, true);
    return () => Vibration.cancel();
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 72 }]} pointerEvents="none">
        <KeyFace identity={toHex(sha256Bytes(utf8Encode(`matrix:${call.from ?? call.roomId}`)))} name={name} size={112} />
        <Text variant="title" color="#FFFFFF" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="body" color="rgba(255,255,255,0.8)">
          {call.video ? t('Incoming video call') : t('Incoming voice call')}
        </Text>
        <Text variant="caption" color="rgba(255,255,255,0.6)">
          {t('On Matrix, with Element Call')}
        </Text>
      </View>
      <View style={[styles.buttons, { paddingBottom: insets.bottom + 28 }]}>
        <Round title={t('Decline')} color="#C62828" onPress={onDecline} />
        <Round title={t('Answer')} color="#2E7D32" onPress={onAnswer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0B0B0D', zIndex: 100, elevation: 100 },
  top: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  buttons: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', gap: 14, paddingHorizontal: 16 },
});
