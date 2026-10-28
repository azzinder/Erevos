import { useEffect, useRef, useState } from 'react';
import { AppState, Modal } from 'react-native';

import { callAudio } from '../modules/erevos-call';
import { currentCall, type Call } from '../lib/call';
import { callPermissions } from '../lib/call-permissions';
import { chatNotify } from '../lib/chat-notices';
import { callSignal, closeCall, CONTACT_PREFIX, endCall, onCallChange, shownCall } from '../lib/calls';
import { takeHiddenAnswer } from '../lib/hidden-ring';
import { onMessage, setReceiverPace } from '../lib/receiver';
import { currentGroupCall, type GroupCall } from '../lib/group-call';
import { closeGroupCall, endGroupCall, groupCallSignal, onGroupCallChange, shownGroupCall } from '../lib/group-calls';
import { memberName } from '../lib/groups';
import { learnSpaceNames, spaceCalls } from '../lib/space-calls';
import { onSpaceGroupCall, spaceGroupCalls } from '../lib/space-groups';
import { rtc } from '../lib/webrtc';
import { t } from '../lib/i18n';
import { CallScreen } from './call-screen';
import { GroupCallScreen } from './group-call-screen';

// How often the relay is looked at: often during a call, whose signals should not wait.
const LOOK_EVERY = 3000;
const LOOK_IN_CALL = 700;

// The open space's calls, whatever shows, and while no screen shows (lib/space-running.ts): their
// signals taken, a contact's call that the receiver opens rung, and the relay looked at more
// often during one. On Android a contact's call rings with the phone's ringtone, and while Erevos
// is in the background (lib/background.ts) also with a notice that says only "Incoming call",
// over the lock screen; tapping it brings Erevos up to answer. A group's call (lib/group-calls.ts)
// rings the same way. A chat or group of the space given a ringtone of its own, or none
// (lock/chat-notify.ts), rings with it; hidden chats ring with the phone's, which tells no one's.
// Returns how to stop, which ends the call, as the space closes.
export function watchCalls(): () => void {
  let known: Call | null = null;
  let knownGroup: GroupCall | null = null;
  // The ringtone of `chat`, as it has one of its own, or the phone's.
  const ring = (video: boolean, chat: string) => {
    const tone = chat ? chatNotify(chat)?.ring : undefined;
    if (tone === undefined) callAudio?.ring?.(video, AppState.currentState !== 'active');
    else callAudio?.ring?.(video, AppState.currentState !== 'active', tone);
  };
  setReceiverPace(() => (currentCall() || currentGroupCall() ? LOOK_IN_CALL : LOOK_EVERY));
  const stopGroupChange = onGroupCallChange(() => {
    const call = shownGroupCall()?.call ?? null;
    if (call && call !== knownGroup) {
      knownGroup = call;
      if (call.state === 'in') callAudio?.start(call.video);
      else if (call.state === 'incoming') ring(call.video, shownGroupCall()?.place === spaceGroupCalls ? `group:${call.group}` : '');
    }
    if (call && call.state !== 'incoming' && !currentCall()) callAudio?.stopRinging?.();
    if (call?.state === 'ended' && !currentCall()) {
      callAudio?.stop();
      callAudio?.showOverLock?.(false);
    }
  });
  const stopGroupSignals = onSpaceGroupCall((group, from, signal) => void groupCallSignal(spaceGroupCalls, group, from, signal, rtc).catch(() => undefined));
  const stopChange = onCallChange(() => {
    const call = shownCall()?.call ?? null;
    if (call && call !== known) {
      known = call;
      // Ours starts its sound at once; theirs once answered.
      if (call.outgoing) callAudio?.start(call.video);
      // Theirs rings with the phone's ringtone, and in the background with the call notice too.
      else if (call.state === 'incoming') ring(call.video, shownCall()?.place === spaceCalls ? `chat:${call.peer.slice(CONTACT_PREFIX.length)}` : '');
    }
    if (call?.state !== 'incoming') callAudio?.stopRinging?.();
    if (call?.state === 'ended') {
      callAudio?.stop();
      callAudio?.showOverLock?.(false);
    }
  });
  const stopMessages = onMessage((received) => {
    if (!received.call) return;
    void callSignal(spaceCalls, `${CONTACT_PREFIX}${received.identity}`, received.call, received.request, rtc);
  });
  return () => {
    stopChange();
    stopMessages();
    stopGroupChange();
    stopGroupSignals();
    setReceiverPace(() => LOOK_EVERY);
    endCall();
    endGroupCall();
    callAudio?.stopRinging?.();
    callAudio?.stop();
    callAudio?.showOverLock?.(false);
  };
}

// The call screen over whatever screen shows, while the space is open (watchCalls). The chat
// screen hands over the calls it opens itself. A call that rang while no screen showed shows as
// soon as the screens are there again.
export function CallHost() {
  const [, setShown] = useState(0);
  const [speaker, setSpeaker] = useState(false);
  const known = useRef<Call | null>(null);
  const knownGroup = useRef<GroupCall | null>(null);
  const [names, setNames] = useState<{ group: string; contacts: { identity: string; name: string }[] }>({ group: '', contacts: [] });

  useEffect(() => {
    const groupChanged = () => {
      const shown = shownGroupCall();
      const call = shown?.call ?? null;
      if (shown && call && call !== knownGroup.current) {
        knownGroup.current = call;
        setSpeaker(call.video);
        // Named as its group is: the space's, or a hidden place's while its chats are open (lib/place-groups.ts).
        void shown.place
          .names?.(call.group)
          .then((named) => setNames({ group: named.group || t('Group'), contacts: named.contacts }))
          .catch(() => undefined);
      }
      setShown((n) => n + 1);
    };
    const changed = () => {
      const shown = shownCall();
      const call = shown?.call ?? null;
      if (call && call !== known.current) {
        known.current = call;
        setSpeaker(call.video);
        if (shown?.place === spaceCalls) void learnSpaceNames().then(() => setShown((n) => n + 1), () => undefined);
        // A hidden call just opened by its PIN on the ring screen (lib/hidden-ring.ts): the owner
        // already chose to answer it, so it is answered at once. Never a call of the space's.
        if (call.state === 'incoming' && shown?.place !== spaceCalls && takeHiddenAnswer()) {
          callAudio?.stopRinging?.();
          void callPermissions(call.video).then((granted) => (granted ? (setSpeaker(call.video), callAudio?.start(call.video), call.answer()) : call.decline()));
        }
      }
      setShown((n) => n + 1);
    };
    groupChanged();
    changed();
    const stopGroupChange = onGroupCallChange(groupChanged);
    const stopChange = onCallChange(changed);
    return () => {
      stopGroupChange();
      stopChange();
    };
  }, []);

  const group = shownGroupCall();
  if (group) {
    const { call } = group;
    const joinCall = () => {
      void callPermissions(call.video).then((granted) => {
        if (!granted) {
          call.decline();
          return;
        }
        callAudio?.stopRinging?.();
        setSpeaker(call.video);
        callAudio?.start(call.video);
        void call.answer();
      });
    };
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
        <GroupCallScreen
          call={call}
          groupName={names.group || t('Group')}
          name={(identity) => memberName(identity, names.contacts)}
          speaker={speaker}
          onSpeaker={(on) => {
            setSpeaker(on);
            callAudio?.setSpeaker(on);
          }}
          onAnswer={joinCall}
          onClose={() => closeGroupCall(call)}
        />
      </Modal>
    );
  }

  const shown = shownCall();
  if (!shown) return null;
  const { call, place } = shown;

  function answer() {
    void callPermissions(call.video).then((granted) => {
      if (!granted) {
        call.decline();
        return;
      }
      setSpeaker(call.video);
      callAudio?.start(call.video);
      void call.answer();
    });
  }

  function changeSpeaker(on: boolean) {
    setSpeaker(on);
    callAudio?.setSpeaker(on);
  }

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <CallScreen
        call={call}
        identity={call.peer.slice(CONTACT_PREFIX.length)}
        name={place.name(call.peer)}
        speaker={speaker}
        onSpeaker={changeSpeaker}
        onAnswer={answer}
        onClose={() => closeCall(call)}
      />
    </Modal>
  );
}
