import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { callClock } from '../lib/calls';
import { MAX_VIDEO, type GroupCall } from '../lib/group-call';
import { t } from '../lib/i18n';
import { CallVideo } from './call-video';
import { ENDED_SHOWN, RING, Round } from './call-screen';
import { KeyFace } from './key-face';
import { Text } from './ui';

// A group's call over the whole app, dark as a contact's call is (components/call-screen.tsx): the
// group's name, who started it while it rings, then who is in it with this phone, each in a tile of
// their picture in a video call, and its buttons. It closes itself a moment after the call ends.

function status(call: GroupCall, now: number, starter: string | null): string {
  switch (call.state) {
    case 'incoming':
      if (starter === null) return call.video ? t('You started a group video call') : t('You started a group call');
      return call.video ? t('{name} started a group video call', { name: starter }) : t('{name} started a group call', { name: starter });
    case 'in':
      return call.peers().length === 0 ? t('Waiting for others · {time}', { time: callClock(now - call.joinedAt) }) : callClock(now - call.joinedAt);
    case 'ended':
      return call.ended === 'missed' ? t('Missed group call') : call.ended === 'failed' ? call.problem || t('Could not open the microphone') : t('Call ended');
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
  const pictures = call.video && !call.videoPaused && state === 'in';

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
      {pictures ? (
        <View style={[styles.tiles, { paddingTop: insets.top, paddingBottom: insets.bottom + 200 }]}>
          {[...peers.map((peer) => ({ key: peer.identity, stream: peer.remote, label: name(peer.identity), own: false })), { key: 'own', stream: call.cameraOff ? null : call.local, label: t('You'), own: true }].map(
            (tile, _, all) => (
              <View key={tile.key} style={[styles.tile, { width: all.length > 2 ? '50%' : '100%', height: all.length > 1 ? '50%' : '100%' }]}>
                {tile.stream ? <CallVideo stream={tile.stream} mirror={tile.own} style={StyleSheet.absoluteFill} /> : <KeyFace identity={tile.own ? '' : tile.key} name={tile.label} size={64} />}
                <Text variant="caption" color="#FFFFFF" style={styles.label} numberOfLines={1}>
                  {tile.label}
                </Text>
              </View>
            ),
          )}
          <Text variant="caption" color="rgba(255,255,255,0.8)" style={[styles.clock, { top: insets.top + 8 }]}>
            {groupName} · {status(call, now, null)}
          </Text>
        </View>
      ) : (
        <>
          {/* Each member's sound plays through these in a browser. */}
          {peers.map((peer) => (peer.remote ? <CallVideo key={peer.identity} stream={peer.remote} style={styles.unseen} /> : null))}
          <View style={[styles.top, { paddingTop: insets.top + 56 }]}>
            <KeyFace identity={call.group} name={groupName} size={96} />
            <Text variant="title" color="#FFFFFF" numberOfLines={1}>
              {groupName}
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.8)">
              {status(call, now, call.startedBy ? name(call.startedBy) : null)}
            </Text>
            {state === 'in' ? (
              <Text variant="caption" color="rgba(255,255,255,0.6)">
                {call.videoPaused
                  ? t('Pictures pause with more than {n} in the call', { n: MAX_VIDEO })
                  : call.video
                    ? t('Group video call · end-to-end encrypted')
                    : t('Group voice call · end-to-end encrypted')}
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
                    {peer.state === 'connected' ? t('In the call') : t('Connecting…')}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </>
      )}
      <View style={[styles.buttons, { paddingBottom: insets.bottom + 28 }]}>
        {state === 'incoming' ? (
          <>
            <Round title={t('Decline')} color="#C62828" onPress={() => call.decline()} />
            <Round title={t('Join')} color="#2E7D32" onPress={onAnswer} />
          </>
        ) : state === 'ended' ? null : (
          <>
            <Round title={call.muted ? t('Unmute') : t('Mute')} on={call.muted} onPress={() => call.setMuted(!call.muted)} />
            <Round title={t('Speaker')} on={speaker} onPress={() => onSpeaker(!speaker)} />
            {pictures ? <Round title={call.cameraOff ? t('Camera on') : t('Camera off')} on={call.cameraOff} onPress={() => call.setCameraOff(!call.cameraOff)} /> : null}
            {pictures ? <Round title={t('Flip')} onPress={() => call.switchCamera()} /> : null}
            <Round title={t('Leave')} color="#C62828" onPress={() => call.hangUp()} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0B0B0D', zIndex: 100, elevation: 100 },
  tiles: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#0B0B0D', backgroundColor: '#18181C' },
  label: { position: 'absolute', left: 8, bottom: 6, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  clock: { position: 'absolute', left: 0, right: 0, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  unseen: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  top: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  people: { flex: 1, marginTop: 24, marginBottom: 120 },
  peopleList: { gap: 12, paddingHorizontal: 24 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16 },
});
