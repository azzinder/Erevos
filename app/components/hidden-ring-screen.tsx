// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Vibration, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { currentSpace } from '../lock/keys';
import { MIN_PIN, searchHidden } from '../lock/hidden';
import { handOverHidden } from '../lib/hidden-handoff';
import { receivingPlaces } from '../lib/place-receiver';
import { answerHiddenCall, setHiddenRinging, useHiddenRinging, type HiddenRinging } from '../lib/hidden-ring';
import { onCallChange, shownCall } from '../lib/calls';
import { onGroupCallChange, shownGroupCall } from '../lib/group-calls';
import { t } from '../lib/i18n';
import { RING, Round } from './call-screen';
import { LockIcon, PersonIcon } from './icons';
import { Button, Input, Text } from './ui';

// The screen a hidden contact's call brings up while its hidden chats are closed (lib/hidden-ring.ts).
// It says only "Incoming call", names no one, and looks like any call with no caller shown — so
// whoever holds the phone sees a call, nothing of the hidden chats. A small, discreet sign opens a
// PIN field; the right PIN opens the place and answers the call that waits on its message queue
// (app/chat.tsx). Answer takes the call with no PIN where the place receives while closed, with
// no name and the hidden chats left closed; elsewhere it asks for the PIN too. Decline stops the ring. A wrong PIN does nothing and
// says nothing (searchHidden counts it apart, as the home search does), so it stays deniable.
// Over the password screen (`locked`, app/_layout.tsx) the PIN never stands in for the password:
// the sign steps aside, the ringtone going on, for the password; once it opens the space, the ring
// shows again and the sign opens the PIN field.

// The screen at the app's root, over whatever shows, while a hidden call rings and no other call does.
export function HiddenRingHost({ locked = false }: { locked?: boolean }) {
  const ringing = useHiddenRinging();
  const [aside, setAside] = useState<HiddenRinging | null>(null);
  // Drawn again as a call screen comes and goes: a hidden ring shows once none is left.
  const [, setCalls] = useState(0);
  useEffect(() => {
    const changed = () => setCalls((n) => n + 1);
    const stopCall = onCallChange(changed);
    const stopGroupCall = onGroupCallChange(changed);
    return () => {
      stopCall();
      stopGroupCall();
    };
  }, []);
  if (!ringing || shownCall() || shownGroupCall() || aside === ringing) return null;
  return <HiddenRingScreen space={ringing.space} pocket={ringing.pocket} onSign={locked ? () => setAside(ringing) : undefined} />;
}

function HiddenRingScreen({ space, pocket, onSign }: { space: number; pocket: number; onSign?: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // 'ringing' shows the call; 'pin' the field behind the discreet sign and Answer.
  const [mode, setMode] = useState<'ringing' | 'pin'>('ringing');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    if (mode !== 'ringing') return;
    Vibration.vibrate(RING, true);
    return () => Vibration.cancel();
  }, [mode]);

  const decline = () => setHiddenRinging(null);
  // The sign asks for the PIN, or over the password screen steps aside for the password.
  const askPin = () => (onSign ? onSign() : setMode('pin'));
  // Answer, for hidden chats that receive while closed (their key is in memory while the space is
  // open, lib/place-receiver.ts): the call is answered with no PIN, on a call screen with no name
  // and no face, and the hidden chats stay closed (app/chat.tsx `callOnly`), as the maintainer
  // chose. Hidden chats that only ring while closed (lib/hidden-ring.ts) have no key here before
  // the PIN, so Answer asks for it there, as over the password screen it steps aside.
  function answer() {
    if (onSign || closing.current) return askPin();
    const place = receivingPlaces().find((one) => one.space === space && one.pocket === pocket);
    if (!place) return askPin();
    closing.current = true;
    handOverHidden({ key: place.key, pocket });
    answerHiddenCall(space, pocket);
    setHiddenRinging(null);
    router.push('/chat?hidden=call');
  }

  async function connect() {
    if (busy || closing.current) return;
    const typed = pin;
    if (typed.length < MIN_PIN) return;
    setBusy(true);
    try {
      // Tried on every pocket, the same time whatever is typed; a wrong one is counted apart and
      // says nothing, as the home search does.
      const { space } = currentSpace();
      const place = await searchHidden(space, typed).catch(() => null);
      if (place && place.pocket === pocket) {
        closing.current = true;
        handOverHidden(place);
        answerHiddenCall(space, pocket);
        setHiddenRinging(null);
        router.push('/chat?hidden=open');
        return;
      }
      // Wrong PIN, or not this ringing place: clear the field and keep ringing, silently.
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 72 }]}>
        <View style={styles.face}>
          <PersonIcon color="rgba(255,255,255,0.32)" size={48} />
        </View>
        <Text variant="title" color="#FFFFFF" style={styles.shadow}>
          {t('Incoming call')}
        </Text>
        {/* The discreet sign: small and dim, by the status line. Tapping it opens the PIN field, or
            over the password screen steps aside for the password. */}
        {mode === 'ringing' ? (
          <Pressable
            onPress={askPin}
            accessibilityRole="button"
            accessibilityLabel={t('More')}
            hitSlop={16}
            style={({ pressed }) => [styles.sign, pressed && { opacity: 0.5 }]}
          >
            <LockIcon color="rgba(255,255,255,0.28)" size={14} />
          </Pressable>
        ) : null}
      </View>
      {mode === 'pin' ? (
        <View style={[styles.pin, { paddingBottom: insets.bottom + 28 }]}>
          <Input
            value={pin}
            onChangeText={setPin}
            placeholder={t('PIN')}
            autoFocus
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void connect()}
          />
          <Button title={t('Connect')} onPress={() => void connect()} />
          <Button title={t('Cancel')} kind="secondary" onPress={() => { setPin(''); setMode('ringing'); }} />
        </View>
      ) : (
        <View style={[styles.buttons, { paddingBottom: insets.bottom + 28 }]}>
          <Round title={t('Decline')} color="#C62828" onPress={decline} />
          <Round title={t('Answer')} color="#2E7D32" onPress={answer} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0B0B0D', zIndex: 100, elevation: 100 },
  top: { alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  face: { width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  sign: { marginTop: 4, padding: 8 },
  buttons: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16 },
  pin: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 12, paddingHorizontal: 24 },
});
