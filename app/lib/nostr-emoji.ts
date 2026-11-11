// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The custom emoji of other Nostr apps (NIP-30): a post or a reaction names a :shortcode: in its
// words, and says where its picture is in an emoji tag, ["emoji", shortcode, address]. Here, what
// is read of them from an event, kept pure. In the public feed a picture is fetched only as the
// posts' photos are (lib/public-fetch.ts, as the space's Photos setting and Tor way say); in a
// private chat never: a reaction there shows as its :shortcode:, so that whoever sent it cannot
// learn from the server of its picture when the chat was opened, or from where.

/** The most custom emoji of one event that are read. */
export const EMOJI_MOST = 30;
const CODE = /^[A-Za-z0-9_-]{1,64}$/;
const URL_MOST = 2048;

/** Whether a reaction is a custom emoji: its :shortcode:. */
export const isEmojiCode = (sign: string): boolean => /^:[A-Za-z0-9_-]{1,64}:$/.test(sign);

/** The custom emoji an event's tags name: where each one's picture is, by shortcode, https only, each once. */
export function emojiOf(tags: readonly (readonly string[])[]): Map<string, string> {
  const found = new Map<string, string>();
  for (const tag of tags) {
    if (found.size >= EMOJI_MOST) break;
    const [name, code, url] = tag;
    if (name !== 'emoji' || typeof code !== 'string' || typeof url !== 'string') continue;
    if (!CODE.test(code) || found.has(code) || url.length > URL_MOST || !/^https:\/\/\S+$/i.test(url)) continue;
    found.set(code, url);
  }
  return found;
}

/** Where the picture of a reaction that is a custom emoji is, as its tags say; undefined for any other. */
export function emojiUrlOf(sign: string, tags: readonly (readonly string[])[]): string | undefined {
  return isEmojiCode(sign) ? emojiOf(tags).get(sign.slice(1, -1)) : undefined;
}

/** The tag that goes with a reaction that is a custom emoji, so that other apps show its picture. */
export function emojiTag(sign: string, url: string | undefined): string[][] {
  return url && isEmojiCode(sign) && /^https:\/\/\S+$/i.test(url) && url.length <= URL_MOST ? [['emoji', sign.slice(1, -1), url]] : [];
}

/** A part of a post's words: words, or a custom emoji it names. */
export type EmojiPart = { text: string } | { code: string; url: string };

/** Words split where they name a custom emoji their event has a picture for; any other :word: stays words. */
export function withEmoji(text: string, emoji: ReadonlyMap<string, string>): EmojiPart[] {
  if (!emoji.size || !text.includes(':')) return text ? [{ text }] : [];
  const parts: EmojiPart[] = [];
  const pattern = /:([A-Za-z0-9_-]{1,64}):/g;
  let at = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const url = emoji.get(match[1]);
    if (!url) {
      // Its second colon may begin one that is.
      pattern.lastIndex = match.index + 1;
      continue;
    }
    if (match.index > at) parts.push({ text: text.slice(at, match.index) });
    parts.push({ code: match[1], url });
    at = match.index + match[0].length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}
