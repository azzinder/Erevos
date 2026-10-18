import { sealedFile } from '../lock/sealed-file';
import { decryptText, encryptText, fromBase64, randomBytes, toBase64, utf8Encode } from './crypto';
import { readFile, writeFile } from './files';
import type { CarriedStore, KeptCarried } from './nearby';
import { secureGet, secureSet } from './secure';

// Where the packets this phone carries for relays (lib/nearby.ts) stay when Erevos closes, sealed.
// Those it carries for others belong to the phone, not to a space: a file of their own, sealed
// with a key kept in the keystore, and padded to whole blocks. They are strangers' packets sealed
// for their relays, so the file tells only how much this phone carries for others. This phone's
// own belong to the space they came from: a value of its own per space in one file
// (lock/sealed-file.ts), sealed with the space's key, so they come back only when that space opens,
// and nothing says which space has any.

const OTHERS_FILE = 'erevos-carried-others';
const OTHERS_KEY = 'erevos.carried-key';
const OWN_FILE = 'erevos-carried';
const BLOCK = 16 * 1024;

// A packet kept: the relay's address, the sealed packet (base64), how many more phones it may go
// to, and until when.
type Stored = [string, string, number, number];

function stored({ url, sealed, hops, until }: KeptCarried): Stored {
  return [url, toBase64(sealed), hops, until];
}

function checked(value: unknown): { items: Stored[] } {
  const list = (value as { items?: unknown } | null)?.items;
  const items = Array.isArray(list)
    ? list.filter(
        (m): m is Stored =>
          Array.isArray(m) && typeof m[0] === 'string' && typeof m[1] === 'string' && typeof m[2] === 'number' && typeof m[3] === 'number',
      )
    : [];
  return { items };
}

function kept({ items }: { items: Stored[] }): KeptCarried[] {
  const out: KeptCarried[] = [];
  for (const [url, sealed, hops, until] of items) {
    try {
      out.push({ url, sealed: fromBase64(sealed), hops, until });
    } catch {
      // A damaged one is left out.
    }
  }
  return out;
}

const own = sealedFile({ name: OWN_FILE, empty: { items: [] as Stored[] }, checked, block: BLOCK });

/** The open space's own carried packets, sealed with its key. */
export function ownCarried(space: number, key: Uint8Array): CarriedStore {
  return {
    load: async () => kept(await own.load('space', space, key)),
    save: (items) => own.save('space', space, key, { items: items.map(stored) }),
  };
}

// The key the packets carried for others are sealed with: made the first time, then kept.
let othersKey: Promise<Uint8Array> | null = null;

function keyForOthers(): Promise<Uint8Array> {
  othersKey ??= (async () => {
    let saved: string | null;
    try {
      saved = await secureGet(OTHERS_KEY);
    } catch {
      // The keystore did not answer: a key for this run only, and the one kept stays as it is.
      return randomBytes(32);
    }
    if (saved) {
      try {
        const key = fromBase64(saved);
        if (key.length === 32) return key;
      } catch {
        // Made anew.
      }
    }
    const key = randomBytes(32);
    await secureSet(OTHERS_KEY, toBase64(key)).catch(() => undefined);
    return key;
  })();
  return othersKey;
}

/** The packets this phone carries for others, sealed for the phone. */
export function othersCarried(): CarriedStore {
  return {
    async load() {
      const raw = await readFile(OTHERS_FILE);
      if (!raw) return [];
      try {
        return kept(checked(JSON.parse(decryptText(await keyForOthers(), raw))));
      } catch {
        return [];
      }
    },
    async save(items) {
      const json = JSON.stringify({ items: items.map(stored) });
      const bytes = utf8Encode(json).length;
      const size = Math.max(1, Math.ceil(bytes / BLOCK)) * BLOCK;
      await writeFile(OTHERS_FILE, encryptText(await keyForOthers(), json + ' '.repeat(size - bytes)));
    },
  };
}
