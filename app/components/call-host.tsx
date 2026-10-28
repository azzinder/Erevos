import { useEffect, useRef, useState } from 'react';
import { AppState, Modal } from 'react-native';

import { callAudio } from '../modules/erevos-call';
import { ask } from '../lib/alert';
import { callsOther, currentCall, type Call } from '../lib/call';
import { callPermissions } from '../lib/call-permissions';
import { ringKeeper } from '../lib/call-ringing';
import { chatNotify } from '../lib/chat-notices';
import { callSignal, closeCall, CONTACT_PREFIX, endCall, onCallChange, shownCall } from '../lib/calls';
import { hiddenRinging, setHiddenRinging, takeHiddenAnswer } from '../lib/hidden-ring';
import { onMessage, setReceiverPace } from '../lib/receiver';
import { currentGroupCall, type GroupCall } from '../lib/group-call';
import { closeGroupCall, endGroupCall, groupCallSignal, onGroupCallChange, shownGroupCall } from '../lib/group-calls';
import { memberName } from '../lib/groups';
import { sha256Bytes, toHex, utf8Encode } from '../lib/crypto';
import { learnSpaceNames, spaceCalls } from '../lib/space-calls';
import { onSpaceGroupCall, spaceGroupCalls } from '../lib/space-groups';
import { rtc } from '../lib/webrtc';
import { watchXmppCalls, xmppCalls, XMPP_PREFIX } from '../lib/xmpp-calls';
import { elementCall } from '../lib/element-call-window';
import { answerMatrixCall, declineMatrixCall, inMatrixCall, onMatrixCallChange, shownMatrixCall, watchMatrixCalls, type MatrixCall } from '../lib/matrix-calls';
import { matrixNow } from '../lib/matrix-store';
import { t } from '../lib/i18n';
import { CallScreen } from './call-screen';
import { GroupCallScreen } from './group-call-screen';
import { MatrixRingScreen } from './matrix-ring';

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
  // A ringtone or notice that fails does not stop the call screen, nor the others that hear of the call.
  const audio = (play: () => void) => {
    try {
      play();
    } catch {
      // As said.
    }
  };
  // The ringtone of `chat`, as it has one of its own, or the phone's; with the notice too in the background.
  const ring = (video: boolean, chat: string) => {
    const tone = chat ? chatNotify(chat)?.ring : undefined;
    if (tone === undefined) audio(() => callAudio?.ring?.(video, AppState.currentState !== 'active'));
    else audio(() => callAudio?.ring?.(video, AppState.currentState !== 'active', tone));
  };
  const keeper = ringKeeper(
    {
      ring,
      start: (video) => audio(() => callAudio?.start(video)),
      stopRinging: () => audio(() => callAudio?.stopRinging?.()),
      stop: () => audio(() => callAudio?.stop()),
      showOverLock: (on) => audio(() => callAudio?.showOverLock?.(on)),
    },
    { ringing: () => !!hiddenRinging(), end: () => setHiddenRinging(null) },
  );
  setReceiverPace(() => (currentCall() || currentGroupCall() ? LOOK_IN_CALL : LOOK_EVERY));
  const stopGroupChange = onGroupCallChange(() => {
    const shown = shownGroupCall();
    const call = shown?.call ?? null;
    keeper.group(call, call && shown?.place === spaceGroupCalls ? `group:${call.group}` : '', !!currentCall());
  });
  const stopGroupSignals = onSpaceGroupCall((group, from, signal) => void groupCallSignal(spaceGroupCalls, group, from, signal, rtc).catch(() => undefined));
  const stopChange = onCallChange(() => {
    const shown = shownCall();
    const call = shown?.call ?? null;
    keeper.contact(call, call && shown?.place === spaceCalls ? `chat:${call.peer.slice(CONTACT_PREFIX.length)}` : '');
  });
  const stopMessages = onMessage((received) => {
    if (!received.call) return;
    void callSignal(spaceCalls, `${CONTACT_PREFIX}${received.identity}`, received.call, received.request, rtc);
  });
  // Calls of the space's XMPP account (lib/xmpp-calls.ts), on the same screen.
  const stopXmpp = watchXmppCalls(rtc);
  // Calls of its Matrix account (lib/matrix-calls.ts), in Element Call's own window: they ring here
  // as the others do, and Erevos's own do not ring meanwhile.
  const element = elementCall();
  const stopMatrix = element ? watchMatrixCalls(element.window, element.space) : () => undefined;
  callsOther(inMatrixCall);
  let rangMatrix: MatrixCall | null = null;
  let openMatrix: MatrixCall | null = null;
  const stopMatrixChange = onMatrixCallChange(() => {
    const call = shownMatrixCall();
    if (call?.state === 'incoming' && rangMatrix !== call) {
      rangMatrix = call;
      ring(call.video, '');
    }
    if (rangMatrix && (call !== rangMatrix || call.state !== 'incoming')) {
      rangMatrix = null;
      audio(() => callAudio?.stopRinging?.());
    }
    if (call?.state === 'open' && openMatrix !== call) {
      openMatrix = call;
      audio(() => callAudio?.start(call.video));
    }
    if (openMatrix && (call !== openMatrix || call.state !== 'open')) {
      openMatrix = null;
      audio(() => callAudio?.stop());
    }
  });
  return () => {
    stopMatrixChange();
    stopMatrix();
    element?.stop();
    callsOther(() => false);
    stopChange();
    stopMessages();
    stopGroupChange();
    stopGroupSignals();
    setReceiverPace(() => LOOK_EVERY);
    endCall();
    endGroupCall();
    // After the call's end, which still goes to the other person.
    stopXmpp();
    audio(() => callAudio?.stopRinging?.());
    audio(() => callAudio?.stop());
    audio(() => callAudio?.showOverLock?.(false));
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

  useEffect(() => onMatrixCallChange(() => setShown((n) => n + 1)), []);

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
        // already chose to answer it, so it is answered at once. Never a call of the space's, nor of XMPP.
        if (call.state === 'incoming' && shown?.place !== spaceCalls && shown?.place !== xmppCalls && takeHiddenAnswer()) {
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

  // A Matrix call that rings; answered, it goes on in Element Call's window.
  const matrix = shownMatrixCall();
  if (matrix?.state === 'incoming') {
    const room = matrixNow().state?.rooms[matrix.roomId];
    const answerMatrix = () => {
      void callPermissions(matrix.video).then((granted) => {
        if (!granted) {
          declineMatrixCall(matrix);
          return;
        }
        try {
          answerMatrixCall(matrix);
        } catch (error) {
          declineMatrixCall(matrix);
          ask(t('Matrix'), error instanceof Error ? error.message : String(error), [{ text: t('OK') }]);
        }
      });
    };
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
        <MatrixRingScreen call={matrix} name={room?.name || matrix.from || t('Matrix')} onAnswer={answerMatrix} onDecline={() => declineMatrixCall(matrix)} />
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
        identity={call.peer.startsWith(XMPP_PREFIX) ? toHex(sha256Bytes(utf8Encode(call.peer))) : call.peer.slice(CONTACT_PREFIX.length)}
        name={place.name(call.peer)}
        encryption={call.peer.startsWith(XMPP_PREFIX) ? t('Encrypted, but its key passes through the XMPP servers') : undefined}
        speaker={speaker}
        onSpeaker={changeSpeaker}
        onAnswer={answer}
        onClose={() => closeCall(call)}
      />
    </Modal>
  );
}
