// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { View, type AccessibilityActionEvent, type GestureResponderEvent } from 'react-native';

import { playVoice, useVoiceRecorder } from '../lib/audio';
import { tap } from '../lib/haptics';
import { t } from '../lib/i18n';
import { MAX_VOICE_MS, MIN_VOICE_MS, voiceDuration, waveformBars, waveformOf } from '../lib/voice';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

import type { VoiceControl } from './composer';
import { MicIcon } from './icons';
import { Button, buttonColors, Row, Text } from './ui';

// Voice messages in a Matrix chat and a Nostr chat (app/matrix-chat.tsx, app/nostr-chat.tsx),
// recorded as in the message bar of the other chats (components/composer.tsx): the microphone
// records while it is held, and letting go sends it; sliding left lets the recording go. A minute is
// the most. One that came is played with Play (VoiceClip).

/** How far left the finger slides, holding the microphone, to let go of the recording, px. */
const CANCEL_SLIDE = 96;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

/** A minute and its seconds: 0:07. */
const clock = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const buzz = tap;

/**
 * Records one voice message at a time for MicButton: `send` is given the sound, how long it is and
 * its waveform (lib/voice.ts waveformOf, empty when the phone told nothing of how loud it was) once
 * the microphone is let go, `say` what the screen should tell (it was too short, the
 * microphone is not allowed, the recording was let go).
 */
export function useVoiceCapture({ send, say }: { send: (audio: Uint8Array, ms: number, waveform: number[]) => Promise<void>; say: (text: string) => void }): VoiceControl {
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
      await latest.current.send(recorded.audio, recorded.ms, waveformOf(recorded.levels));
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

/** The ending a sound's type is written with, for the phone's player (as components/network-file.tsx has it). */
function endingOf(mime: string): string {
  const sub = mime.split('/')[1]?.split(';')[0] ?? '';
  if (sub === 'mp4' || sub === 'x-m4a' || sub === 'm4a') return 'm4a';
  if (sub === 'mpeg') return 'mp3';
  return /^[a-z0-9]{2,5}$/.test(sub) ? sub : 'm4a';
}

/** How many bars a voice message's waveform is drawn with. */
const DRAWN_BARS = 40;

/**
 * A voice message that came: Play fetches its sound the first time and plays it, with how long it
 * is (`duration`, milliseconds), or how much is left while it plays; Stop ends it. Leaving the chat
 * stops it too. A Matrix one may have its `waveform` (0 to 1024 a bar, MSC3246), drawn under it,
 * the bars played so far in the theme's colour.
 */
export function VoiceClip({ type, duration, waveform, fetch }: { type: string; duration?: number; waveform?: number[]; fetch: () => Promise<Uint8Array> }) {
  const colors = useColors();
  const bars = waveformBars(waveform, DRAWN_BARS);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [note, setNote] = useState('');
  const stop = useRef<(() => void) | null>(null);
  const here = useRef(true);
  useEffect(
    () => () => {
      here.current = false;
      stop.current?.();
    },
    [],
  );

  async function play() {
    if (stop.current) {
      stop.current();
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const audio = await fetch();
      // Left the chat while it was fetched: nothing plays on.
      if (!here.current) return;
      setPlayed(0);
      setPlaying(true);
      stop.current = playVoice(
        audio,
        () => {
          stop.current = null;
          setPlaying(false);
        },
        setPlayed,
        endingOf(type),
      );
    } catch (error) {
      setPlaying(false);
      if (here.current) setNote(error instanceof Error ? error.message : t('The file could not be fetched.'));
    } finally {
      if (here.current) setBusy(false);
    }
  }

  const left = duration ? Math.max(0, duration - played) : played;
  const line = playing ? t('Playing, {time}', { time: voiceDuration(left) }) : duration ? t('Voice message, {time}', { time: voiceDuration(duration) }) : t('Voice message');
  // How much of it has played, 0 to 1, for the bars' colour.
  const done = playing && duration ? Math.min(1, played / duration) : 0;
  return (
    <View style={{ gap: space.xs }}>
      <Row>
        <Button title={playing ? t('Stop') : t('Play')} compact disabled={busy} onPress={() => void play()} />
        <Text style={{ flexShrink: 1 }}>{line}</Text>
      </Row>
      {bars ? (
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', height: 28, gap: 2, maxWidth: 240 }}>
          {bars.map((height, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: Math.max(3, Math.round(height * 28)),
                borderRadius: 1.5,
                backgroundColor: (i + 0.5) / bars.length <= done ? colors.primary : colors.textFaint,
              }}
            />
          ))}
        </View>
      ) : null}
      {busy ? <Text variant="caption" tone="muted">{t('Fetching…')}</Text> : null}
      {note ? <Text variant="caption" tone="muted">{note}</Text> : null}
    </View>
  );
}
