// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { voiceCore } from './core';
import { mark, t } from './i18n';

// A voice message sent with a voice not one's own, in a chat that says so (Contact.voice, Change
// my voice in its details): recorded as always, then, before it goes, its sound made higher or
// deeper, the same length, by the core (crates/erevos-core/src/voice_shift.rs), and recorded again
// in Ogg/Opus. On the phone from a recording Android made (lib/audio.ts, Voice.kt), on a computer
// and in the web app from the browser's (lib/audio.web.ts). The voice as it was never leaves the
// phone: should the change fail, the message is not sent. Only this phone knows the setting; the
// walkie-talkie keeps the voice as it is. Hard to know by ear, not a shield against someone who
// shifts it back with care. Self-contained but for the core, so it runs under plain Node for checks.

export type VoiceKind = 'deeper' | 'higher';
export const VOICE_KINDS: readonly VoiceKind[] = ['deeper', 'higher'];

/** What each is called, in the app's words (t()). */
export const VOICE_NAMES: Record<VoiceKind, string> = { deeper: mark('Deeper'), higher: mark('Higher') };

/** A kind as kept, or undefined. */
export function checkedVoice(value: unknown): VoiceKind | undefined {
  return VOICE_KINDS.includes(value as VoiceKind) ? (value as VoiceKind) : undefined;
}

const NUMBER: Record<VoiceKind, number> = { deeper: 1, higher: 2 };

/** Why a voice message was not sent when its voice could not be changed. */
export const notChanged = () => new Error(t('The voice could not be changed, so the message was not sent.'));

/** Whether the core here changes voices. */
export function coreChangesVoice(): boolean {
  return voiceCore() !== null;
}

/** `pcm` (mono 16-bit little-endian samples at `rate`) with its voice changed as `kind` says. Throws when it cannot be. */
export async function changeSamples(pcm: Uint8Array, rate: number, kind: VoiceKind): Promise<Uint8Array> {
  const change = voiceCore();
  if (!change) throw notChanged();
  const be = new Uint8Array(4);
  new DataView(be.buffer).setUint32(0, rate);
  const out = await change(pcm, be, Uint8Array.of(NUMBER[kind]));
  if (out.length !== pcm.length) throw notChanged();
  return out;
}

/** Float samples (-1 to 1) as 16-bit little-endian. */
export function floatsToPcm(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
  return out;
}

/** 16-bit little-endian samples as floats (-1 to 1). */
export function pcmToFloats(pcm: Uint8Array): Float32Array {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const out = new Float32Array(Math.floor(pcm.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}
