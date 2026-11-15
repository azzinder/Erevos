// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { AudioQuality, createAudioPlayer, IOSOutputFormat, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type RecordingOptions } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { useRef } from 'react';
import { Platform } from 'react-native';

import { device } from '../modules/erevos-device';
import { randomBytes, toHex } from './crypto';
import { AAC_BITS, MAX_VOICE_MS, phoneRecordsOpus, soundOf, TALK_BITS, TALK_RATE } from './voice';
import { changeSamples, coreChangesVoice, notChanged, type VoiceKind } from './voice-change';

// Recording and playing voice messages on the phone. On Android 10 and later the sound is Opus in
// Ogg, mono, at 48 kHz and 32 kbit/s, recorded by Android itself (modules/erevos-device Voice.kt):
// as clear in a voice as AAC at twice that, about 4 KB a second, so a minute is about 240 KB. Older
// phones, and a build without that recorder, record AAC at 48 kHz and 64 kbit/s with expo-audio,
// about 8 KB a second (lib/voice.ts). More would not be heard in a voice, but would be slower to
// send, and more so over Bluetooth. A recording is read into memory and its file deleted at once; to
// play, the sound is written unsealed to a file in the app's cache for as long as it plays, then
// deleted. If Erevos is closed in the middle of either, clearLeftovers deletes what was left the
// next time a chat opens. Every Android Erevos runs on (7 and later) plays Ogg/Opus, AAC and
// WebM/Opus alike: expo-audio's player finds the kind from the sound itself.

const OPTIONS: RecordingOptions = {
  extension: '.m4a',
  // How loud it is as it goes, for a voice message's waveform (lib/voice.ts waveformOf).
  isMeteringEnabled: true,
  sampleRate: 48_000,
  numberOfChannels: 1,
  bitRate: AAC_BITS,
  android: { extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: AAC_BITS },
};

// Walkie-talkie (useVoiceRecorder(true)): at 16 kHz and 24 kbit/s, about 3 KB a second, so ten
// seconds go in a few parts even over Bluetooth, still clear enough for speech. Opus on Android 10
// and later, AAC before.
const TALK: RecordingOptions = {
  ...OPTIONS,
  sampleRate: TALK_RATE,
  bitRate: TALK_BITS,
  web: { mimeType: 'audio/webm', bitsPerSecond: TALK_BITS },
};

/** Whether this phone records Ogg/Opus itself. */
const recordsOpus = () => phoneRecordsOpus(Platform.OS, Platform.Version, !!device?.voiceStart);

/** A recording shorter than this was a tap, not a voice message, milliseconds. */
export const MIN_VOICE_MS = 700;

function deleteQuietly(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Gone already, or the cache is cleared by the system.
  }
}

// Where expo-audio records to, in the cache: Android (and Voice.kt too), then iOS.
const RECORDINGS = ['Audio', 'ExpoAudio'];

/** Deletes sound left unsealed in the cache by a recording or a playing that did not finish. */
export function clearLeftovers() {
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && entry.name.startsWith('erevos-play-')) deleteQuietly(entry);
      if (entry instanceof Directory && RECORDINGS.includes(entry.name)) {
        for (const inner of entry.list()) if (inner instanceof File && inner.name.startsWith('recording-')) deleteQuietly(inner);
      }
    }
  } catch {
    // No cache to look in (the web), or it is being cleared.
  }
}

/** Whether a voice message's voice can be changed here (lib/voice-change.ts): where Android records Ogg/Opus, in a build that changes it. */
export function canChangeVoice(): boolean {
  return recordsOpus() && !!device?.voiceSamples && !!device?.voiceOpus && coreChangesVoice();
}

// The recording at `uri` (Voice.kt's) with its voice changed: the new one's bytes. Throws when it cannot be.
async function changedAt(uri: string, kind: VoiceKind): Promise<Uint8Array> {
  const read = await device?.voiceSamples?.(uri).catch(() => null);
  if (!read || read.length < 6) throw notChanged();
  const rate = new DataView(read.buffer, read.byteOffset, 4).getUint32(0);
  const changed = await changeSamples(read.subarray(4), rate, kind);
  const made = await device?.voiceOpus?.(changed, rate).catch(() => null);
  if (!made) throw notChanged();
  const file = new File(made);
  try {
    return await file.bytes();
  } finally {
    deleteQuietly(file);
  }
}

/** Records one voice message at a time: walkie-talkie style, smaller, with `talk`. */
export function useVoiceRecorder(talk = false) {
  const recorder = useAudioRecorder(talk ? TALK : OPTIONS);
  const started = useRef(0);
  // Recording with Android's own recorder, in Ogg/Opus, not with expo-audio's.
  const opus = useRef(false);
  // How loud it was, dBFS, ten times a second while it records.
  const levels = useRef<number[]>([]);
  const sampling = useRef<ReturnType<typeof setInterval> | null>(null);
  const sample = () => {
    const level = opus.current ? device?.voiceLevel?.() : recorder.getStatus().metering;
    if (typeof level === 'number') levels.current.push(level);
  };
  const stopSampling = () => {
    if (sampling.current) clearInterval(sampling.current);
    sampling.current = null;
  };

  /** Starts recording. False when the microphone is not allowed. */
  async function start(): Promise<boolean> {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    // Ogg/Opus where Android records it; where it does not start, AAC as before.
    opus.current = recordsOpus() && !!(await device?.voiceStart?.(talk).catch(() => null));
    if (!opus.current) {
      await recorder.prepareToRecordAsync();
      recorder.record();
    }
    started.current = Date.now();
    levels.current = [];
    stopSampling();
    sampling.current = setInterval(sample, 100);
    return true;
  }

  /**
   * Stops, and returns the sound and how long it is, or null if it was too short to keep. With
   * `change`, the voice changed so (lib/voice-change.ts): throws when it cannot be, and nothing of
   * the voice as it was is returned.
   */
  async function stop(change?: VoiceKind): Promise<{ audio: Uint8Array; ms: number; levels: number[] } | null> {
    const ms = Math.min(Date.now() - started.current, MAX_VOICE_MS);
    stopSampling();
    let uri: string | null;
    const wasOpus = opus.current;
    if (opus.current) {
      opus.current = false;
      uri = (await device?.voiceStop?.()) ?? null;
    } else {
      await recorder.stop();
      uri = recorder.uri;
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (!uri) return null;
    const file = new File(uri);
    try {
      if (ms < MIN_VOICE_MS) return null;
      if (change) {
        if (!wasOpus) throw notChanged();
        return { audio: await changedAt(uri, change), ms, levels: levels.current };
      }
      return { audio: await file.bytes(), ms, levels: levels.current };
    } finally {
      deleteQuietly(file);
    }
  }

  return { start, stop };
}

let playing: (() => void) | null = null;

/** The ending the player is told a sound has: its own kind, from how it starts, or `ending` for another (an imported song). */
function endingFor(audio: Uint8Array, ending: string): string {
  const kind = soundOf(audio);
  return kind === 'mp4' ? 'm4a' : kind || ending;
}

/**
 * Plays a voice message's sound, stopping any other first. `onTime` is told how far it has
 * played, milliseconds, a few times a second; `onEnd` is called once it stops, however (the player
 * failing too). Returns a call that stops it.
 */
export function playVoice(audio: Uint8Array, onEnd: () => void, onTime?: (ms: number) => void, ending = 'm4a'): () => void {
  playing?.();
  const file = new File(Paths.cache, `erevos-play-${toHex(randomBytes(8))}.${endingFor(audio, ending)}`);
  file.writeSync(audio);
  const player = createAudioPlayer({ uri: file.uri }, { updateInterval: 250 });
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    if (playing === stop) playing = null;
    subscription.remove();
    player.remove();
    deleteQuietly(file);
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
