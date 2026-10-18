import { AudioQuality, createAudioPlayer, IOSOutputFormat, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type RecordingOptions } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { useRef } from 'react';

import { randomBytes, toHex } from './crypto';
import { MAX_VOICE_MS } from './voice';

// Recording and playing voice messages on the phone (expo-audio). The sound is AAC, mono, at 48 kHz
// and 64 kbit/s: as clear as speech gets, about 8 KB a second, so a minute is about 480 KB. More
// would not be heard in a voice, but would be slower to send, and more so over Bluetooth. A recording is read into memory and
// its file deleted at once; to play, the sound is written unsealed to a file in the app's cache for
// as long as it plays, then deleted. If Erevos is closed in the middle of either, clearLeftovers
// deletes what was left the next time a chat opens.

const OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 48_000,
  numberOfChannels: 1,
  bitRate: 64_000,
  android: { extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64_000 },
};

// Walkie-talkie (useVoiceRecorder(true)): AAC at 16 kHz and 24 kbit/s, about 3 KB a second, so ten
// seconds go in a few parts even over Bluetooth, still clear enough for speech.
const TALK: RecordingOptions = {
  ...OPTIONS,
  sampleRate: 16_000,
  bitRate: 24_000,
  web: { mimeType: 'audio/webm', bitsPerSecond: 24_000 },
};

/** A recording shorter than this was a tap, not a voice message, milliseconds. */
export const MIN_VOICE_MS = 700;

function deleteQuietly(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Gone already, or the cache is cleared by the system.
  }
}

// Where expo-audio records to, in the cache: Android, then iOS.
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

/** Records one voice message at a time: walkie-talkie style, smaller, with `talk`. */
export function useVoiceRecorder(talk = false) {
  const recorder = useAudioRecorder(talk ? TALK : OPTIONS);
  const started = useRef(0);

  /** Starts recording. False when the microphone is not allowed. */
  async function start(): Promise<boolean> {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    started.current = Date.now();
    return true;
  }

  /** Stops, and returns the sound and how long it is, or null if it was too short to keep. */
  async function stop(): Promise<{ audio: Uint8Array; ms: number } | null> {
    const ms = Math.min(Date.now() - started.current, MAX_VOICE_MS);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const uri = recorder.uri;
    if (!uri) return null;
    const file = new File(uri);
    try {
      return ms < MIN_VOICE_MS ? null : { audio: await file.bytes(), ms };
    } finally {
      deleteQuietly(file);
    }
  }

  return { start, stop };
}

let playing: (() => void) | null = null;

/**
 * Plays a voice message's sound, stopping any other first. `onTime` is told how far it has
 * played, milliseconds, a few times a second; `onEnd` is called once it stops, however. Returns a
 * call that stops it.
 */
export function playVoice(audio: Uint8Array, onEnd: () => void, onTime?: (ms: number) => void): () => void {
  playing?.();
  const file = new File(Paths.cache, `erevos-play-${toHex(randomBytes(8))}.m4a`);
  file.write(audio);
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
    if (status.didJustFinish) stop();
    else onTime?.(status.currentTime * 1000);
  });
  playing = stop;
  player.play();
  return stop;
}
