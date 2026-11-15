// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { AudioQuality, createAudioPlayer, IOSOutputFormat, requestRecordingPermissionsAsync, useAudioRecorder, type RecordingOptions } from 'expo-audio';
import { useRef } from 'react';

import { randomBytes } from './crypto';
import { t } from './i18n';
import { readOgg, readWebm, webmToOgg, writeCaf, writeOgg } from './ogg-opus';
import { AAC_BITS, MAX_VOICE_MS, OPUS_BITS, soundOf, TALK_BITS, TALK_RATE, webVoiceType } from './voice';
import { changeSamples, coreChangesVoice, floatsToPcm, notChanged, pcmToFloats, type VoiceKind } from './voice-change';

// Voice messages on a computer (the desktop app, lib/shell.ts) and in the web app, as lib/audio.ts
// does them on the phone: Opus in Ogg at 32 kbit/s (lib/voice.ts). Firefox records Ogg itself;
// Chrome, Electron and Safari from 18.4 record WebM, which is put in Ogg here (lib/ogg-opus.ts),
// the sound as it is. A browser that cannot play Ogg (Safari on a Mac before macOS 15.4) keeps the
// WebM, which the phones and the other browsers play too. Safari before 18.4 records AAC in MP4
// (expo-audio takes the browser's own kind when Opus is not offered), which every Erevos plays.
// Opus that Safari before iOS 18.4 and macOS 15.4 cannot play in Ogg or WebM is put in CAF for it,
// which it can. Nothing is written to a file: a recording comes as a blob in memory, and a sound
// plays from one, let go when it stops.

// The kind the browser records in; none outside a browser.
const RECORDED = typeof MediaRecorder === 'undefined' ? undefined : webVoiceType((type) => MediaRecorder.isTypeSupported(type));

const OPTIONS: RecordingOptions = {
  // How loud it is as it goes, for a voice message's waveform (lib/voice.ts waveformOf).
  isMeteringEnabled: true,
  extension: '.webm',
  sampleRate: 48_000,
  numberOfChannels: 1,
  bitRate: RECORDED ? OPUS_BITS : AAC_BITS,
  android: { extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.HIGH },
  web: { mimeType: RECORDED, bitsPerSecond: RECORDED ? OPUS_BITS : AAC_BITS },
};

// Walkie-talkie (useVoiceRecorder(true)): 24 kbit/s, quick to send even over Bluetooth.
const TALK: RecordingOptions = {
  ...OPTIONS,
  sampleRate: TALK_RATE,
  bitRate: TALK_BITS,
  web: { mimeType: RECORDED, bitsPerSecond: TALK_BITS },
};

/** A recording shorter than this was a tap, not a voice message, milliseconds. */
export const MIN_VOICE_MS = 700;

/** Nothing is left behind on a computer. */
export function clearLeftovers() {}

// The type a sound is played as, by its kind, and what the browser is asked it plays.
const TYPES = { ogg: 'audio/ogg', webm: 'audio/webm', mp4: 'audio/mp4' } as const;
const CODECS = { ogg: 'audio/ogg; codecs="opus"', webm: 'audio/webm; codecs="opus"', mp4: 'audio/mp4; codecs="mp4a.40.2"' } as const;

let tester: HTMLAudioElement | null = null;

/** Whether this browser says it plays sound of this type. */
function plays(type: string): boolean {
  try {
    tester ??= document.createElement('audio');
    return tester.canPlayType(type) !== '';
  } catch {
    return false;
  }
}

/** A recording in WebM put in Ogg, where this browser plays Ogg to hear it again; as it was otherwise, or when it cannot be read. */
function asOgg(audio: Uint8Array): Uint8Array {
  if (soundOf(audio) !== 'webm' || !plays(CODECS.ogg)) return audio;
  try {
    const [a, b, c, d] = randomBytes(4);
    return webmToOgg(audio, (a | (b << 8) | (c << 16) | (d << 24)) >>> 0) ?? audio;
  } catch {
    return audio;
  }
}

// What a browser needs to change a voice: to read a recording's sound, and to make Opus of it again (WebCodecs).
type Encoder = {
  configure(config: { codec: string; sampleRate: number; numberOfChannels: number; bitrate: number }): void;
  encode(data: unknown): void;
  flush(): Promise<void>;
  close(): void;
};
type EncoderClass = new (init: { output: (chunk: { byteLength: number; copyTo(to: Uint8Array): void }) => void; error: (error: unknown) => void }) => Encoder;
type AudioDataClass = new (init: { format: 'f32'; sampleRate: number; numberOfFrames: number; numberOfChannels: number; timestamp: number; data: Float32Array }) => { close(): void };
const web = globalThis as unknown as { AudioEncoder?: EncoderClass; AudioData?: AudioDataClass; OfflineAudioContext?: typeof OfflineAudioContext };

const RATE = 48_000;

/** Whether a voice message's voice can be changed here (lib/voice-change.ts): a browser with WebCodecs' Opus, in a build that changes it. */
export function canChangeVoice(): boolean {
  return !!RECORDED && !!web.AudioEncoder && !!web.AudioData && !!web.OfflineAudioContext && coreChangesVoice();
}

// A recording with its voice changed, in Ogg/Opus. Throws when it cannot be.
async function changed(audio: Uint8Array, kind: VoiceKind): Promise<Uint8Array> {
  const { AudioEncoder, AudioData, OfflineAudioContext: Offline } = web;
  if (!AudioEncoder || !AudioData || !Offline) throw notChanged();
  try {
    const sound = await new Offline(1, 1, RATE).decodeAudioData(audio.slice().buffer);
    const pcm = await changeSamples(floatsToPcm(sound.getChannelData(0)), RATE, kind);
    const packets: Uint8Array[] = [];
    let failed: unknown = null;
    const encoder = new AudioEncoder({
      output: (chunk) => {
        const bytes = new Uint8Array(chunk.byteLength);
        chunk.copyTo(bytes);
        packets.push(bytes);
      },
      error: (error) => (failed = error),
    });
    encoder.configure({ codec: 'opus', sampleRate: RATE, numberOfChannels: 1, bitrate: OPUS_BITS });
    const samples = pcmToFloats(pcm);
    const data = new AudioData({ format: 'f32', sampleRate: RATE, numberOfFrames: samples.length, numberOfChannels: 1, timestamp: 0, data: samples });
    encoder.encode(data);
    await encoder.flush();
    data.close();
    encoder.close();
    if (failed) throw failed;
    // The head: version 1, one channel, Opus's usual pre-skip (312), 48 kHz, gain 0, mapping 0.
    const head = Uint8Array.of(...[...'OpusHead'].map((c) => c.charCodeAt(0)), 1, 1, 312 & 0xff, 312 >> 8, 0x80, 0xbb, 0, 0, 0, 0, 0);
    const [a, b, c, d] = randomBytes(4);
    const ogg = writeOgg({ head, packets }, (a | (b << 8) | (c << 16) | (d << 24)) >>> 0);
    if (!ogg) throw notChanged();
    return ogg;
  } catch {
    throw notChanged();
  }
}

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

  async function stop(change?: VoiceKind): Promise<{ audio: Uint8Array; ms: number; levels: number[] } | null> {
    const ms = Math.min(Date.now() - started.current, MAX_VOICE_MS);
    stopSampling();
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || ms < MIN_VOICE_MS) return null;
    const audio = new Uint8Array(await (await fetch(uri)).arrayBuffer());
    URL.revokeObjectURL(uri);
    if (change) return { audio: await changed(audio, change), ms, levels: levels.current };
    return { audio: asOgg(audio), ms, levels: levels.current };
  }

  return { start, stop };
}

/**
 * What this browser plays a sound as, with its type, as Safari plays a sound from memory only when
 * told its kind: as it is, or Opus in CAF where the browser plays neither Ogg nor WebM (Safari
 * before iOS 18.4 and macOS 15.4). Null when it cannot play it.
 */
function playable(audio: Uint8Array): { bytes: Uint8Array; type: string } | null {
  const kind = soundOf(audio);
  if (!kind || plays(CODECS[kind])) return { bytes: audio, type: kind ? TYPES[kind] : '' };
  if (kind !== 'mp4' && plays('audio/x-caf')) {
    try {
      const track = kind === 'ogg' ? readOgg(audio) : readWebm(audio);
      const caf = track && writeCaf(track);
      if (caf) return { bytes: caf, type: 'audio/x-caf' };
    } catch {
      // Not readable as Opus: not playable here either.
    }
  }
  return null;
}

let playing: (() => void) | null = null;

/**
 * As lib/audio.ts: plays a sound, stopping any other first, and returns a call that stops it.
 * One this browser cannot play throws why, for the screen to say; one that is played as it came,
 * with nothing to show (no `onTime`, no `ending`: the walkie-talkie), only ends at once.
 */
export function playVoice(audio: Uint8Array, onEnd: () => void, onTime?: (ms: number) => void, ending?: string): () => void {
  playing?.();
  const sound = playable(audio);
  if (!sound) {
    if (onTime || ending !== undefined) throw new Error(t('This browser cannot play this kind of sound. Safari can from iOS 18.4 and macOS 15.4.'));
    setTimeout(onEnd, 0);
    return () => undefined;
  }
  const uri = URL.createObjectURL(new Blob([sound.bytes as BlobPart], { type: sound.type }));
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
    if (status.didJustFinish || (status as { error?: string | null }).error) stop();
    else onTime?.(status.currentTime * 1000);
  });
  playing = stop;
  player.play();
  return stop;
}
