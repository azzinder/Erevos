// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Web addresses in a message's words (components/linked-text.tsx shows them tappable): ones that
// start with http://, https:// or www., up to the next space; and, as Telegram, Signal and the
// others show them, a bare name that ends in a known ending (t.me/name, example.org/page), opened
// with https://. Not one in an e-mail address, nor a file's name (photo.jpg): its ending is no
// web ending here. Marks that end a sentence are not part of one, nor a closing bracket that has
// no opening one in it.

const ENDINGS = [
  'com', 'org', 'net', 'edu', 'gov', 'info', 'io', 'me', 'app', 'dev', 'eu', 'gr', 'cy', 'de', 'at', 'ch', 'fr', 'it', 'es', 'pt', 'nl', 'be',
  'uk', 'us', 'ca', 'au', 'ru', 'ua', 'pl', 'cz', 'se', 'no', 'dk', 'fi', 'rs', 'hr', 'ba', 'si', 'bg', 'ro', 'tr', 'al', 'mk', 'tv', 'gg', 'ly',
  'co', 'xyz', 'online', 'site', 'news', 'social', 'chat', 'link', 'page', 'blog', 'shop', 'store', 'onion', 'im', 'to', 'cc', 'sh', 'ai',
];
const LINK = new RegExp(`(?:\\b(?:https?:\\/\\/|www\\.)[^\\s<>"]+)|(?<![@\\w.\\/-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${ENDINGS.join('|')})(?![\\w-])(?:[/?#][^\\s<>"]*)?`, 'gi');
const TRAILING = /[.,;:!?'’”»]+$/;

export type TextPart = { text: string; url?: string };

/** The words, in order, each web address apart with where it opens. */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    let link = match[0];
    for (;;) {
      const trimmed = link.replace(TRAILING, '');
      const unopened = /[)\]]$/.test(trimmed) && count(trimmed, trimmed.endsWith(')') ? '(' : '[') < count(trimmed, trimmed.endsWith(')') ? ')' : ']');
      const next = unopened ? trimmed.slice(0, -1) : trimmed;
      if (next === link) break;
      link = next;
    }
    const at = match.index ?? 0;
    if (link.length <= 4) continue;
    if (at > last) parts.push({ text: text.slice(last, at) });
    parts.push({ text: link, url: /^https?:\/\//i.test(link) ? link : `https://${link}` });
    last = at + link.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

function count(text: string, mark: string): number {
  return text.split(mark).length - 1;
}
