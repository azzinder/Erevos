import { sealedFile, sealedSize, type Holder } from './sealed-file';

// The messages each chat keeps on the phone: a space's own chat, and its hidden chats, each in one
// sealed value of FILE (sealed-file.ts). Every value is exactly SIZE bytes, used or not, so the
// file tells neither which chats are used nor how much anyone writes. When a chat's messages no
// longer fit, the oldest go: about a thousand short messages fit.
//
// Only chats with contacts are kept. Messages over the radio link are not: a link's id lasts as
// long as the link, and nothing is encrypted there yet.

/** One message: when (milliseconds), whether this phone sent it, and its text. */
export type Kept = [at: number, mine: 0 | 1, text: string];

/** Each chat's messages, oldest first. */
export type HistoryData = { chats: Record<string, Kept[]> };

export type Message = { peer: string; text: string; mine: boolean; at: number };

export const FILE = 'erevos-history';
export const SIZE = 64 * 1024;

const EMPTY: HistoryData = { chats: {} };

const isKept = (m: unknown): m is Kept =>
  Array.isArray(m) && m.length === 3 && typeof m[0] === 'number' && (m[1] === 0 || m[1] === 1) && typeof m[2] === 'string';

function checked(value: unknown): HistoryData {
  const chats: Record<string, Kept[]> = {};
  const stored = (value as { chats?: unknown } | null)?.chats;
  if (stored && typeof stored === 'object') {
    for (const [peer, list] of Object.entries(stored)) {
      const kept = Array.isArray(list) ? list.filter(isKept) : [];
      if (kept.length > 0) chats[peer] = kept;
    }
  }
  return { chats };
}

const store = sealedFile({ name: FILE, empty: EMPTY, checked, block: SIZE, fixed: true });

/** The data with its oldest messages left out until it fits in SIZE. */
export function fitted(data: HistoryData): HistoryData {
  const chats: Record<string, Kept[]> = {};
  for (const [peer, list] of Object.entries(data.chats)) if (list.length > 0) chats[peer] = [...list];
  while (sealedSize({ chats }) > SIZE) {
    let oldest: string | null = null;
    for (const peer of Object.keys(chats)) if (oldest === null || chats[peer][0][0] < chats[oldest][0][0]) oldest = peer;
    if (oldest === null) break;
    chats[oldest].shift();
    if (chats[oldest].length === 0) delete chats[oldest];
  }
  return { chats };
}

/** One chat's history, kept as messages come and go. */
export class History {
  private data: HistoryData;
  private readonly store: (data: HistoryData) => Promise<void>;

  private constructor(data: HistoryData, store: (data: HistoryData) => Promise<void>) {
    this.data = data;
    this.store = store;
  }

  /** The space's own chat, or its hidden chats (`holder`), sealed with `key`. */
  static async open(holder: Holder, space: number, key: Uint8Array): Promise<History> {
    return new History(await store.load(holder, space, key), (data) => store.save(holder, space, key, data));
  }

  /** Every message, oldest first. */
  messages(): Message[] {
    return Object.entries(this.data.chats)
      .flatMap(([peer, list]) => list.map(([at, mine, text]) => ({ peer, text, mine: mine === 1, at })))
      .sort((a, b) => a.at - b.at);
  }

  // Each change is made on what is in memory and saved in turn (sealed-file.ts writes one after
  // another), so changes made close together all land, in order.
  private save(data: HistoryData): Promise<void> {
    this.data = data;
    return this.store(data);
  }

  add({ peer, text, mine, at }: Message): Promise<void> {
    const list = [...(this.data.chats[peer] ?? []), [at, mine ? 1 : 0, text] as Kept];
    return this.save(fitted({ chats: { ...this.data.chats, [peer]: list } }));
  }

  /** Deletes one chat's messages from the phone. */
  clear(peer: string): Promise<void> {
    const { [peer]: _gone, ...chats } = this.data.chats;
    return this.save({ chats });
  }
}
