import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Call } from '../lib/call';
import { callPermissions } from '../lib/call-permissions';
import { callClock } from '../lib/calls';
import type { CallEnd } from '../lib/call-signal';
import { t, mark } from '../lib/i18n';
import { CallVideo } from './call-video';
import { KeyFace } from './key-face';
import { Text } from './ui';

// A call over the whole chat, in every style: dark, as the picture shows best on it. Shows the other
// phone's picture or their face drawn from their key, our own camera in a corner, how the call
// stands, and its buttons. It closes itself a moment after the call ends. Where the call's way can
// (an XMPP call's), video is added to a voice call from here, and their asking to add it is asked
// here: a yes turns the camera on, and the sound to the speaker.

// Long buzz, pause, again, while a call rings here.
export const RING = [0, 900, 1100];
// How long the screen stays after a call ends, milliseconds.
export const ENDED_SHOWN = 2500;

const ENDS: Record<CallEnd, { ours: string; theirs: string }> = {
  hangup: { ours: mark('Call ended'), theirs: mark('They hung up') },
  decline: { ours: mark('Turned down'), theirs: mark('They turned it down') },
  busy: { ours: mark('Call ended'), theirs: mark('They are in another call') },
  missed: { ours: mark('Call ended'), theirs: mark('Not answered') },
  failed: { ours: mark('The call could not connect'), theirs: mark('The call could not connect on their phone') },
};

/** How a call stands, in a few words. */
export function callStatus(call: Call, now: number): string {
  switch (call.state) {
    case 'calling':
      return t('Calling…');
    case 'ringing':
      return t('Ringing…');
    case 'incoming':
      return call.video ? t('Incoming video call') : t('Incoming voice call');
    case 'connecting':
      return t('Connecting…');
    case 'connected':
      return callClock(now - call.connectedAt);
    case 'ended': {
      const ended = call.ended ?? { reason: 'hangup', byUs: true };
      // Answered, or turned down, on another device of the account (lib/devices.ts).
      if (ended.elsewhere) return ended.reason === 'decline' ? t('Turned down') : t('Answered on another device');
      // Theirs, not answered here.
      if (ended.reason === 'missed' && !call.outgoing) return t('Missed call');
      return t(ended.byUs ? ENDS[ended.reason].ours : ENDS[ended.reason].theirs);
    }
  }
}

export function CallScreen({ call, identity, name, encryption, speaker, onSpeaker, onAnswer, onClose }: {
  call: Call;
  /** The contact's identity key, hex, for their face. */
  identity: string;
  name: string;
  /** What the call's encryption is, when not Erevos's own end-to-end one (an XMPP call's). */
  encryption?: string;
  speaker: boolean;
  onSpeaker: (on: boolean) => void;
  /** Answers the call that rings here, once the camera and microphone may be used. */
  onAnswer: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const { state } = call;

  // The time shown while connected.
  useEffect(() => {
    if (state !== 'connected') return;
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

  const theirs = call.video && call.remote && state === 'connected';
  const ours = call.video && call.local && !call.cameraOff && state !== 'ended';
  // Video added to a voice call comes in the same streams: their views are made anew once it has.
  const theirVideos = call.remote?.getVideoTracks().length ?? 0;
  const ourVideos = call.local?.getVideoTracks().length ?? 0;
  const withVideo = (turnOn: () => Promise<void>) =>
    void callPermissions(true).then(async (granted) => {
      if (!granted) {
        if (call.askingVideo) call.declineVideo();
        return;
      }
      await turnOn();
      if (call.video) onSpeaker(true);
    });

  return (
    <View style={styles.screen}>
      {/* Their sound plays through this too in a browser, so it is there in a voice call as well. */}
      {call.remote ? <CallVideo key={`theirs-${theirVideos}`} stream={call.remote} style={theirs ? StyleSheet.absoluteFill : styles.unseen} /> : null}
      {ours ? (
        <CallVideo key={`ours-${ourVideos}`} stream={call.local!} mirror style={[styles.own, { top: insets.top + 16 }, theirs ? null : styles.ownWhole]} />
      ) : null}
      <View style={[styles.top, { paddingTop: insets.top + (theirs ? 16 : 72) }]} pointerEvents="none">
        {theirs ? null : <KeyFace identity={identity} name={name} size={112} />}
        <Text variant="title" color="#FFFFFF" style={styles.shadow} numberOfLines={1}>
          {name}
        </Text>
        <Text variant="body" color="rgba(255,255,255,0.8)" style={styles.shadow}>
          {callStatus(call, now)}
        </Text>
        {state === 'connected' || state === 'connecting' ? (
          <Text variant="caption" color="rgba(255,255,255,0.6)" style={styles.shadow}>
            {encryption ?? t('End-to-end encrypted')}
          </Text>
        ) : null}
      </View>
      <View style={[styles.buttons, { paddingBottom: insets.bottom + 28 }]}>
        {call.askingVideo ? (
          <View style={styles.asking}>
            <Text variant="body" color="#FFFFFF" style={[styles.shadow, { textAlign: 'center' }]}>
              {t('{name} wants to turn on video', { name })}
            </Text>
            <View style={styles.row}>
              <Round title={t('Not now')} onPress={() => call.declineVideo()} />
              <Round title={t('Turn on video')} color="#2E7D32" onPress={() => withVideo(() => call.acceptVideo())} />
            </View>
          </View>
        ) : null}
        {state === 'incoming' ? (
          <>
            <Round title={t('Decline')} color="#C62828" onPress={() => call.decline()} />
            <Round title={t('Answer')} color="#2E7D32" onPress={onAnswer} />
          </>
        ) : state === 'ended' ? null : (
          <>
            <Round title={call.muted ? t('Unmute') : t('Mute')} on={call.muted} onPress={() => call.setMuted(!call.muted)} />
            <Round title={t('Speaker')} on={speaker} onPress={() => onSpeaker(!speaker)} />
            {call.video ? <Round title={call.cameraOff ? t('Camera on') : t('Camera off')} on={call.cameraOff} onPress={() => call.setCameraOff(!call.cameraOff)} /> : null}
            {call.video ? <Round title={t('Flip')} onPress={() => call.switchCamera()} /> : null}
            {call.canAddVideo || call.addingVideo ? (
              <Round title={call.addingVideo ? t('Asking…') : t('Add video')} on={call.addingVideo} onPress={() => withVideo(() => call.addVideo())} />
            ) : null}
            <Round title={t('End')} color="#C62828" onPress={() => call.hangUp()} />
          </>
        )}
      </View>
    </View>
  );
}

export function Round({ title, onPress, on = false, color }: { title: string; onPress: () => void; on?: boolean; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: color ?? (on ? '#FFFFFF' : 'rgba(255,255,255,0.16)'), opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text variant="label" color={!color && on ? '#111111' : '#FFFFFF'} style={{ fontSize: 13, textAlign: 'center' }}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0B0B0D', zIndex: 100, elevation: 100 },
  unseen: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  own: { position: 'absolute', right: 16, width: 108, height: 160, borderRadius: 14, overflow: 'hidden', zIndex: 2 },
  // Before their picture comes, ours fills the screen behind the name.
  ownWhole: { top: 0, right: 0, left: 0, bottom: 0, width: undefined, height: undefined, borderRadius: 0, opacity: 0.55, zIndex: 0 },
  top: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  buttons: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16 },
  asking: { width: '100%', alignItems: 'center', gap: 10, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 14 },
  round: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
