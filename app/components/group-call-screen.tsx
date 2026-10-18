import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { callClock } from '../lib/calls';
import type { GroupCall } from '../lib/group-call';
import { CallVideo } from './call-video';
import { ENDED_SHOWN, RING, Round } from './call-screen';
import { KeyFace } from './key-face';
import { Text } from './ui';

// A group's voice call over the whole app, dark as a contact's call is (components/call-screen.tsx):
// the group's name, who started it while it rings, then who is in it with this phone, and its
// buttons. It closes itself a moment after the call ends.

function status(call: GroupCall, now: number, starter: string): string {
  switch (call.state) {
    case 'incoming':
      return `${starter} started a group call`;
    case 'in':
      return call.peers().length === 0 ? `Waiting for others · ${callClock(now - call.joinedAt)}` : callClock(now - call.joinedAt);
    case 'ended':
      return call.ended === 'missed' ? 'Missed group call' : call.ended === 'failed' ? 'Could not open the microphone' : 'Call ended';
  }
}

export function GroupCallScreen({ call, groupName, name, speaker, onSpeaker, onAnswer, onClose }: {
  call: GroupCall;
  groupName: string;
  /** A member's name, from their identity. */
  name: (identity: string) => string;
  speaker: boolean;
  onSpeaker: (on: boolean) => void;
  /** Joins the call that rings here, once the microphone may be used. */
  onAnswer: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const { state } = call;
  const peers = call.peers();

  useEffect(() => {
    if (state !== 'in') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (state !== 'incoming') return;
    Vibration.vibrate(RING, true);
    return () => Vibration.cancel();
  }, [state]);

  useEffect(() => {
    if (state !== 'ended') return;
    const timer = setTimeout(onClose, ENDED_SHOWN);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <View style={styles.screen}>
      {/* Each member's sound plays through these in a browser. */}
      {peers.map((peer) => (peer.remote ? <CallVideo key={peer.identity} stream={peer.remote} style={styles.unseen} /> : null))}
      <View style={[styles.top, { paddingTop: insets.top + 56 }]}>
        <KeyFace identity={call.group} name={groupName} size={96} />
        <Text variant="title" color="#FFFFFF" numberOfLines={1}>
          {groupName}
        </Text>
        <Text variant="body" color="rgba(255,255,255,0.8)">
          {status(call, now, call.startedBy ? name(call.startedBy) : 'You')}
        </Text>
        {state === 'in' ? (
          <Text variant="caption" color="rgba(255,255,255,0.6)">
            Group voice call · end-to-end encrypted
          </Text>
        ) : null}
      </View>
      {state === 'in' && peers.length > 0 ? (
        <ScrollView style={styles.people} contentContainerStyle={styles.peopleList}>
          {peers.map((peer) => (
            <View key={peer.identity} style={styles.person}>
              <KeyFace identity={peer.identity} name={name(peer.identity)} size={40} />
              <Text color="#FFFFFF" style={{ flex: 1 }} numberOfLines={1}>
                {name(peer.identity)}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.6)">
                {peer.state === 'connected' ? 'In the call' : 'Connecting…'}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={[styles.buttons, { paddingBottom: insets.bottom + 28 }]}>
        {state === 'incoming' ? (
          <>
            <Round title="Decline" color="#C62828" onPress={() => call.decline()} />
            <Round title="Join" color="#2E7D32" onPress={onAnswer} />
          </>
        ) : state === 'ended' ? null : (
          <>
            <Round title={call.muted ? 'Unmute' : 'Mute'} on={call.muted} onPress={() => call.setMuted(!call.muted)} />
            <Round title="Speaker" on={speaker} onPress={() => onSpeaker(!speaker)} />
            <Round title="Leave" color="#C62828" onPress={() => call.hangUp()} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0B0B0D', zIndex: 100, elevation: 100 },
  unseen: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  top: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  people: { flex: 1, marginTop: 24, marginBottom: 120 },
  peopleList: { gap: 12, paddingHorizontal: 24 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16 },
});
