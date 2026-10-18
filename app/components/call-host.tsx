import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';

import { callAudio } from '../modules/erevos-call';
import { currentCall, type Call } from '../lib/call';
import { callPermissions } from '../lib/call-permissions';
import { callSignal, closeCall, CONTACT_PREFIX, endCall, onCallChange, shownCall } from '../lib/calls';
import { onMessage, setReceiverPace } from '../lib/receiver';
import { learnSpaceNames, spaceCalls } from '../lib/space-calls';
import { rtc } from '../lib/webrtc';
import { CallScreen } from './call-screen';

// How often the relay is looked at: often during a call, whose signals should not wait.
const LOOK_EVERY = 3000;
const LOOK_IN_CALL = 700;

// The call screen over whatever screen shows, while the space is open (lib/calls.ts). A contact's
// call that the receiver opens rings here; the chat screen hands over the ones it opens itself.
// The call ends when the space closes.
export function CallHost() {
  const [, setShown] = useState(0);
  const [speaker, setSpeaker] = useState(false);
  const known = useRef<Call | null>(null);

  useEffect(() => {
    setReceiverPace(() => (currentCall() ? LOOK_IN_CALL : LOOK_EVERY));
    const stopChange = onCallChange(() => {
      const shown = shownCall();
      const call = shown?.call ?? null;
      if (call && call !== known.current) {
        known.current = call;
        setSpeaker(call.video);
        // Ours starts its sound at once; theirs once answered.
        if (call.outgoing) callAudio?.start(call.video);
        if (shown?.place === spaceCalls) void learnSpaceNames().then(() => setShown((n) => n + 1), () => undefined);
      }
      if (call?.state === 'ended') callAudio?.stop();
      setShown((n) => n + 1);
    });
    const stopMessages = onMessage((received) => {
      if (!received.call) return;
      void callSignal(spaceCalls, `${CONTACT_PREFIX}${received.identity}`, received.call, received.request, rtc);
    });
    return () => {
      stopChange();
      stopMessages();
      setReceiverPace(() => LOOK_EVERY);
      endCall();
      callAudio?.stop();
    };
  }, []);

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
