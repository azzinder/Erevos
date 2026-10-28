// A call's ring where Erevos runs in a page: the web app, the computer's app and Sailfish OS's,
// where no module of the phone rings (index.ts). The page plays a ring of its own, made by the
// browser (Web Audio): two short rings every 3 seconds, with the phone's vibration where the
// browser has it, until the call is answered or ends. A browser lets a page sound only once it was
// touched, so the sound is readied at each touch or key: a call that comes after one rings. The
// rest of a call's sound is the browser's: it puts it where the phone does.

const CYCLE_MS = 3000;
// Each ring, and the pause between the two, in seconds.
const RING_S = 0.4;
const GAP_S = 0.2;
// Two tones together, as a phone's ring has, softly.
const TONES = [440, 480];
const LOUD = 0.2;

type Sound = AudioContext;

let sound: Sound | null = null;
let ringing: ReturnType<typeof setInterval> | null = null;

function made(): Sound | null {
  if (sound) return sound;
  const Make = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Make) return null;
  try {
    sound = new Make();
  } catch {
    return null;
  }
  return sound;
}

// Readies the sound: a browser lets a page start it only from a touch or a key.
function ready(): void {
  const context = made();
  if (context?.state === 'suspended') void context.resume().catch(() => undefined);
}

if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(type, ready, { capture: true, passive: true });
}

function ringOnce(): void {
  const context = made();
  // Not yet allowed to sound: nothing is put off to play late, at the next touch.
  if (context?.state === 'running') {
    const at = context.currentTime + 0.05;
    for (const start of [at, at + RING_S + GAP_S]) {
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(LOUD, start + 0.02);
      gain.gain.setValueAtTime(LOUD, start + RING_S - 0.02);
      gain.gain.linearRampToValueAtTime(0, start + RING_S);
      gain.connect(context.destination);
      for (const hz of TONES) {
        const tone = context.createOscillator();
        tone.frequency.value = hz;
        tone.connect(gain);
        tone.start(start);
        tone.stop(start + RING_S);
      }
    }
  }
  try {
    navigator.vibrate?.([RING_S * 1000, GAP_S * 1000, RING_S * 1000]);
  } catch {
    // No vibration here.
  }
}

function stopRinging(): void {
  if (ringing === null) return;
  clearInterval(ringing);
  ringing = null;
  try {
    navigator.vibrate?.(0);
  } catch {
    // No vibration here.
  }
}

/** What a page does of the phone's side of a call (modules/erevos-call): only the ring. */
export const pageRing = {
  start(): void {},
  setSpeaker(): void {},
  stop: stopRinging,
  /** Rings until stopped; `tone` '' is a chat whose ring is none. */
  ring(_video: boolean, _notice: boolean, tone?: string | null): void {
    stopRinging();
    if (tone === '') return;
    ready();
    ringOnce();
    ringing = setInterval(ringOnce, CYCLE_MS);
  },
  stopRinging,
};
