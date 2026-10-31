// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { AudioQuality, createAudioPlayer, IOSOutputFormat, requestRecordingPermissionsAsync, useAudioRecorder, type RecordingOptions } from 'expo-audio';
import { useRef } from 'react';

import { MAX_VOICE_MS } from './voice';

// Voice messages on a computer (the desktop app, lib/shell.ts) and in the web app, as lib/audio.ts
// does them on the phone. The browser engine records Opus in WebM at 64 kbit/s, which the phones
// play too, and plays the phones' AAC. Safari on an iPhone records AAC in MP4 instead (expo-audio
// takes the browser's own kind when Opus is not offered), which every Erevos plays. Nothing is written to a file: a recording comes as a blob in memory, and a sound
// plays from one, let go when it stops.

const OPTIONS: RecordingOptions = {
  // How loud it is as it goes, for a voice message's waveform (lib/voice.ts waveformOf).
  isMeteringEnabled: true,
  extension: '.webm',
  sampleRate: 48_000,
  numberOfChannels: 1,
  bitRate: 64_000,
  android: { extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.HIGH },
  web: { mimeType: 'audio/webm;codecs=opus', bitsPerSecond: 64_000 },
};

// Walkie-talkie (useVoiceRecorder(true)): Opus at 24 kbit/s, quick to send even over Bluetooth.
const TALK: RecordingOptions = {
  ...OPTIONS,
  sampleRate: 16_000,
  bitRate: 24_000,
  web: { mimeType: 'audio/webm;codecs=opus', bitsPerSecond: 24_000 },
};

/** A recording shorter than this was a tap, not a voice message, milliseconds. */
export const MIN_VOICE_MS = 700;

/** Nothing is left behind on a computer. */
export function clearLeftovers() {}

/** Records one voice message at a time: walkie-talkie style, smaller, with `talk`. */
export function useVoiceRecorder(talk = false) {
  const recorder = useAudioRecorder(talk ? TALK : OPTIONS);
  const started = useRef(0);
  // How loud it was, dBFS, ten times a second while it records.
  const levels = useRef<number[]>([]);
  const sampling = useRef<ReturnType<typeof setInterval> | null>(null);
  const sample = () => {
    const level = recorder.getStatus().metering;
    if (typeof level === 'number') levels.current.push(level);
  };
  const stopSampling = () => {
    if (sampling.current) clearInterval(sampling.current);
    sampling.current = null;
  };

  async function start(): Promise<boolean> {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return false;
    await recorder.prepareToRecordAsync();
    recorder.record();
    started.current = Date.now();
    levels.current = [];
    stopSampling();
    sampling.current = setInterval(sample, 100);
    return true;
  }

  async function stop(): Promise<{ audio: Uint8Array; ms: number; levels: number[] } | null> {
    const ms = Math.min(Date.now() - started.current, MAX_VOICE_MS);
    stopSampling();
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || ms < MIN_VOICE_MS) return null;
    const audio = new Uint8Array(await (await fetch(uri)).arrayBuffer());
    URL.revokeObjectURL(uri);
    return { audio, ms, levels: levels.current };
  }

  return { start, stop };
}

// Safari plays a sound from memory only when told its kind.
function soundType(audio: Uint8Array): string {
  const text = (from: number, to: number) => String.fromCharCode(...audio.subarray(from, to));
  if (text(4, 8) === 'ftyp') return 'audio/mp4';
  if (text(0, 4) === 'OggS') return 'audio/ogg';
  if (audio[0] === 0x1a && audio[1] === 0x45 && audio[2] === 0xdf && audio[3] === 0xa3) return 'audio/webm';
  return '';
}

let playing: (() => void) | null = null;

/** As lib/audio.ts: plays a sound, stopping any other first, and returns a call that stops it. */
export function playVoice(audio: Uint8Array, onEnd: () => void, onTime?: (ms: number) => void, _ending?: string): () => void {
  playing?.();
  const uri = URL.createObjectURL(new Blob([audio as BlobPart], { type: soundType(audio) }));
  const player = createAudioPlayer({ uri }, { updateInterval: 250 });
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    if (playing === stop) playing = null;
    subscription.remove();
    player.remove();
    URL.revokeObjectURL(uri);
    onEnd();
  };
  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) stop();
    else onTime?.(status.currentTime * 1000);
  });
  playing = stop;
  player.play();
  return stop;
}
