import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Vibration, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { currentSpace } from '../lock/keys';
import { MIN_PIN, searchHidden } from '../lock/hidden';
import { handOverHidden } from '../lib/hidden-handoff';
import { answerHiddenCall, setHiddenRinging, useHiddenRinging } from '../lib/hidden-ring';
import { shownCall } from '../lib/calls';
import { shownGroupCall } from '../lib/group-calls';
import { t } from '../lib/i18n';
import { RING, Round } from './call-screen';
import { LockIcon, PersonIcon } from './icons';
import { Button, Input, Text } from './ui';

// The screen a hidden contact's call brings up while its hidden chats are closed (lib/hidden-ring.ts).
// It says only "Incoming call", names no one, and looks like any call with no caller shown — so
// whoever holds the phone sees a call, nothing of the hidden chats. A small, discreet sign opens a
// PIN field; the right PIN opens the place and answers the call that waits on its message queue
// (app/chat.tsx). Plain Answer cannot connect — there is no call here without the PIN — so it says
// so and ends, like an ordinary failed call. Decline stops the ring. A wrong PIN does nothing and
// says nothing (searchHidden counts it apart, as the home search does), so it stays deniable.

// The screen at the app's root, over whatever shows, while a hidden call rings and no other call does.
export function HiddenRingHost() {
  const ringing = useHiddenRinging();
  if (!ringing || shownCall() || shownGroupCall()) return null;
  return <HiddenRingScreen space={ringing.space} pocket={ringing.pocket} />;
}

function HiddenRingScreen({ space, pocket }: { space: number; pocket: number }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // 'ringing' shows the call; 'pin' the field behind the discreet sign; 'failed' after plain Answer.
  const [mode, setMode] = useState<'ringing' | 'pin' | 'failed'>('ringing');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    if (mode !== 'ringing') return;
    Vibration.vibrate(RING, true);
    return () => Vibration.cancel();
  }, [mode]);

  // Plain Answer cannot connect: it says so, then ends.
  useEffect(() => {
    if (mode !== 'failed') return;
    const timer = setTimeout(() => setHiddenRinging(null), 2000);
    return () => clearTimeout(timer);
  }, [mode]);

  const decline = () => setHiddenRinging(null);

  async function connect() {
    if (busy || closing.current) return;
    const typed = pin;
    if (typed.length < MIN_PIN) return;
    setBusy(true);
    try {
      // Tried on every pocket, the same time whatever is typed; a wrong one is counted apart and
      // says nothing, as the home search does.
      const place = await searchHidden(currentSpace().space, typed).catch(() => null);
      if (place && place.pocket === pocket) {
        closing.current = true;
        handOverHidden(place);
        answerHiddenCall();
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
          {mode === 'failed' ? t('The call could not connect') : t('Incoming call')}
        </Text>
        {/* The discreet sign: small and dim, by the status line. Tapping it opens the PIN field. */}
        {mode === 'ringing' ? (
          <Pressable
            onPress={() => setMode('pin')}
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
          {mode === 'ringing' ? (
            <>
              <Round title={t('Decline')} color="#C62828" onPress={decline} />
              <Round title={t('Answer')} color="#2E7D32" onPress={() => setMode('failed')} />
            </>
          ) : null}
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
