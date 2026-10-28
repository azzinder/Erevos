import { useEffect, useRef, useState } from 'react';
import { Vibration, View, type AccessibilityActionEvent, type GestureResponderEvent } from 'react-native';

import { useVoiceRecorder } from '../lib/audio';
import { t } from '../lib/i18n';
import { MAX_VOICE_MS, MIN_VOICE_MS } from '../lib/voice';
import { radius } from '../theme/colors';
import { useColors } from '../theme/context';

import type { VoiceControl } from './composer';
import { MicIcon } from './icons';
import { buttonColors, Text } from './ui';

// Voice messages in a Matrix chat (app/matrix-chat.tsx), recorded as in the message bar of the other
// chats (components/composer.tsx): the microphone records while it is held, and letting go sends
// it; sliding left lets the recording go. A minute is the most.

/** How far left the finger slides, holding the microphone, to let go of the recording, px. */
const CANCEL_SLIDE = 96;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

/** A minute and its seconds: 0:07. */
const clock = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function buzz() {
  try {
    Vibration.vibrate(12);
  } catch {
    // A phone without a vibrator: nothing to feel.
  }
}

/**
 * Records one voice message at a time for MicButton: `send` is given the sound and how long it is
 * once the microphone is let go, `say` what the screen should tell (it was too short, the
 * microphone is not allowed, the recording was let go).
 */
export function useVoiceCapture({ send, say }: { send: (audio: Uint8Array, ms: number) => Promise<void>; say: (text: string) => void }): VoiceControl {
  const recorder = useVoiceRecorder();
  const [recording, setRecording] = useState(false);
  const holding = useRef(false);
  const letGo = useRef(false);
  const started = useRef<Promise<boolean> | null>(null);
  const longest = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The screen's latest, for a recording that ends on its own a minute later.
  const latest = useRef({ send, say });
  latest.current = { send, say };

  // Left in the middle of a recording: it goes unsent.
  useEffect(
    () => () => {
      if (longest.current) clearTimeout(longest.current);
      if (started.current) {
        started.current = null;
        holding.current = false;
        void recorder.stop().catch(() => undefined);
      }
    },
    [],
  );

  function start() {
    holding.current = true;
    letGo.current = false;
    started.current = recorder
      .start()
      .then((ok) => {
        if (!ok) {
          latest.current.say(t('Erevos may not use the microphone. Allow it in the phone settings to send voice messages.'));
          return false;
        }
        if (!holding.current) {
          // Let go while the microphone was getting ready: too short to be meant.
          void recorder.stop().catch(() => undefined);
          if (!letGo.current) latest.current.say(t('Hold to record, and let go to send.'));
          return false;
        }
        setRecording(true);
        longest.current = setTimeout(() => void stop(false), MAX_VOICE_MS);
        return true;
      })
      .catch((error: unknown) => {
        latest.current.say(t('Cannot record. {error}', { error: errorText(error) }));
        return false;
      });
  }

  // Stops recording and sends it, or, `cancel`led (slid away), lets it go. Under a second is taken
  // for a slip of the finger on the microphone, and is let go too.
  async function stop(cancel: boolean) {
    holding.current = false;
    letGo.current = cancel;
    if (longest.current) clearTimeout(longest.current);
    longest.current = null;
    const ready = started.current;
    started.current = null;
    if (!ready || !(await ready)) return;
    setRecording(false);
    try {
      const recorded = await recorder.stop();
      if (cancel) {
        latest.current.say(t('Recording cancelled.'));
        return;
      }
      if (!recorded || recorded.ms < MIN_VOICE_MS) {
        latest.current.say(t('Hold to record, and let go to send.'));
        return;
      }
      await latest.current.send(recorded.audio, recorded.ms);
    } catch (error) {
      latest.current.say(t('Not sent. {reason}', { reason: errorText(error) }));
    }
  }

  return { recording, start, stop: (cancel) => void stop(cancel) };
}

/**
 * The round microphone: pressed and held it records, let go it sends, slid left it lets go of the
 * recording. A screen reader taps once to start and again to send, as holding is hard with one.
 */
export function MicButton({ voice, disabled }: { voice: VoiceControl; disabled?: boolean }) {
  const colors = useColors();
  const button = buttonColors('secondary', colors);
  const [holding, setHolding] = useState(false);
  const held = useRef({ on: false, tapped: false, x: 0 });

  // Stopped by the screen (a minute is the most) while still held: the button is at rest again.
  const wasRecording = useRef(false);
  useEffect(() => {
    if (wasRecording.current && !voice.recording && held.current.on) {
      held.current = { ...held.current, on: false, tapped: false };
      setHolding(false);
    }
    wasRecording.current = voice.recording;
  }, [voice.recording]);

  // Starts recording, held (`tap` false) or for a screen reader, on until tapped again.
  function begin(tap: boolean) {
    held.current = { ...held.current, on: true, tapped: tap };
    setHolding(true);
    buzz();
    voice.start();
  }

  // Lets go: sends what was recorded, or with `cancel` lets it go.
  function end(cancel: boolean) {
    if (!held.current.on) return;
    held.current = { ...held.current, on: false, tapped: false };
    setHolding(false);
    if (cancel) buzz();
    voice.stop(cancel);
  }

  const touch = {
    onStartShouldSetResponder: () => !disabled,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (event: GestureResponderEvent) => {
      held.current.x = event.nativeEvent.pageX;
      if (!held.current.tapped) begin(false);
    },
    onResponderMove: (event: GestureResponderEvent) => {
      if (!held.current.on || held.current.tapped) return;
      if (event.nativeEvent.pageX - held.current.x < -CANCEL_SLIDE) end(true);
    },
    onResponderRelease: () => {
      if (!held.current.tapped) end(false);
    },
    // Taken away by the system (a call, the notification shade): the recording goes. Before the
    // microphone was ready (its permission asked the first time), it was too short, and says to hold.
    onResponderTerminate: () => {
      if (!held.current.tapped) end(voice.recording);
    },
  };

  function onAction(event: AccessibilityActionEvent) {
    const name = event.nativeEvent.actionName;
    if (name === 'activate') {
      if (held.current.on) end(false);
      else begin(true);
    } else if (name === 'cancel') end(true);
  }

  return (
    <View
      {...touch}
      accessible
      accessibilityRole="button"
      accessibilityLabel={holding ? t('Stop and send') : t('Record a voice message')}
      accessibilityHint={holding ? undefined : t('Hold to record, and let go to send.')}
      accessibilityState={{ busy: holding, disabled: !!disabled }}
      accessibilityActions={[{ name: 'activate', label: holding ? t('Stop and send') : t('Start recording') }, ...(holding ? [{ name: 'cancel', label: t('Cancel recording') }] : [])]}
      onAccessibilityAction={onAction}
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.pill > 100 ? 22 : radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: holding ? colors.primary : button.bg,
        borderWidth: button.line ? 1 : 0,
        borderColor: button.line,
        opacity: disabled ? 0.45 : 1,
        transform: [{ scale: holding ? 1.12 : 1 }],
      }}
    >
      <MicIcon color={holding ? colors.onPrimary : button.fg} size={22} />
    </View>
  );
}

/** While the microphone records: the red dot, how long it has, and how to let go of it. */
export function RecordingLine() {
  const colors = useColors();
  const [since] = useState(Date.now);
  const [now, setNow] = useState(since);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLiveRegion="polite">
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger }} />
      <Text variant="bodyStrong" style={{ minWidth: 44, fontVariant: ['tabular-nums'] }}>
        {clock(now - since)}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
        {`‹  ${t('Slide left to cancel')}`}
      </Text>
    </View>
  );
}
