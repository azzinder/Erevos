import { randomBytes, sha256Bytes, toHex, utf8Encode } from './crypto';
import { t } from './i18n';

// A voice message travels in parts, each inside its own end-to-end encrypted message (lib/e2e.ts),
// since one holds at most 16 KB. The parts share an id; the phone that gets them puts them back
// together, and only shows the message once all have come.

/** The longest voice message, milliseconds. */
export const MAX_VOICE_MS = 60_000;
/** A recording shorter than this is taken for a slip of the finger on the microphone, and not sent. */
export const MIN_VOICE_MS = 1000;
/** Bytes of sound in one part, small enough for its encrypted message with what else it carries. */
export const PART_SIZE = 10_000;
/** The most parts one voice message has: a minute of sound fits with room to spare. */
export const MAX_PARTS = 64;
// Parts of a message that stop coming are dropped after this long, milliseconds.
const STALE = 10 * 60_000;

/** How long a voice message lasts, as minutes:seconds. */
export function voiceDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** One part, as it travels. `talk`: said walkie-talkie style, to play as it comes. */
export type VoicePart = { id: string; part: number; parts: number; ms: number; data: Uint8Array; talk?: boolean };

const ID = /^[0-9a-f]{16}$/;

export function isVoicePart(v: Partial<VoicePart> | null | undefined): v is VoicePart {
  return (
    typeof v?.id === 'string' &&
    ID.test(v.id) &&
    Number.isInteger(v.parts) &&
    v.parts! >= 1 &&
    v.parts! <= MAX_PARTS &&
    Number.isInteger(v.part) &&
    v.part! >= 0 &&
    v.part! < v.parts! &&
    typeof v.ms === 'number' &&
    v.ms >= 0 &&
    v.ms <= MAX_VOICE_MS + 5000 &&
    v.data instanceof Uint8Array &&
    v.data.length <= PART_SIZE
  );
}

/**
 * The id the parts of the voice message with `tag` share: the same each time it is sealed again
 * with its tag, as one that waited (lib/waiting.ts), so the parts a try before took and the rest
 * are put together as one.
 */
export function voiceIdOf(tag: string): string {
  return toHex(sha256Bytes(utf8Encode(`erevos voice ${tag}`)).slice(0, 8));
}

/** The sound cut into parts, which share `id`. Throws when it is longer than a voice message can be. */
export function splitVoice(audio: Uint8Array, ms: number, talk = false, id = toHex(randomBytes(8))): VoicePart[] {
  const parts = Math.max(1, Math.ceil(audio.length / PART_SIZE));
  if (parts > MAX_PARTS) throw new Error(t('That voice message is too long.'));
  return Array.from({ length: parts }, (_, part) => ({
    id,
    part,
    parts,
    ms: Math.round(ms),
    data: audio.slice(part * PART_SIZE, (part + 1) * PART_SIZE),
    ...(talk ? { talk } : {}),
  }));
}

type Gathering = { parts: (Uint8Array | null)[]; ms: number; at: number; talk: boolean };

/** Puts the parts of voice messages back together, for each contact. */
export class VoiceAssembler {
  private gathering = new Map<string, Gathering>();

  /** Takes a part. Returns the whole sound, its length and whether it was said walkie-talkie
   *  style once the last part has come. */
  add(peer: string, part: VoicePart, now = Date.now()): { audio: Uint8Array; ms: number; talk: boolean } | null {
    for (const [key, g] of this.gathering) if (now - g.at > STALE) this.gathering.delete(key);
    const key = `${peer} ${part.id}`;
    const g = this.gathering.get(key) ?? { parts: new Array<Uint8Array | null>(part.parts).fill(null), ms: part.ms, at: now, talk: part.talk === true };
    if (g.parts.length !== part.parts) return null;
    g.parts[part.part] = part.data;
    g.at = now;
    this.gathering.set(key, g);
    if (g.parts.some((p) => p === null)) return null;
    this.gathering.delete(key);
    const size = g.parts.reduce((sum, p) => sum + p!.length, 0);
    const audio = new Uint8Array(size);
    let at = 0;
    for (const p of g.parts) {
      audio.set(p!, at);
      at += p!.length;
    }
    return { audio, ms: g.ms, talk: g.talk };
  }

  /** Whether this part already came, as when a voice message that went in part goes again whole. Changes nothing. */
  has(peer: string, part: VoicePart, now = Date.now()): boolean {
    const g = this.gathering.get(`${peer} ${part.id}`);
    return !!g && now - g.at <= STALE && g.parts.length === part.parts && g.parts[part.part] != null;
  }
}
