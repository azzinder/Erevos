import { checkedPreview, type Preview } from './chat-parts';
import { utf8Encode } from './crypto';
import { splitLinks } from './links';

// The preview of a link in a message: the page's title, a line about it and a small picture, as
// the page says them of itself (its og: and twitter: tags, or its <title> and description). Only
// the sender's phone makes one, when it sends, and only when its owner turned previews on
// (lib/make-preview.ts fetches the page); it goes inside the end-to-end encrypted message, and
// the phone that gets it shows it, fetching nothing. Here, what is read from a page, kept pure.

/** How much of a page is read for its preview: its head is near the start. */
export const MAX_PAGE = 512 * 1024;
// What a message's words and its preview may take together, bytes, so the message still fits in
// one encrypted message (16 KB, with what else it carries).
const ROOM = 10_000;

/** The first https link in the words, the one a preview is of, or null. */
export function firstLink(text: string): string | null {
  return splitLinks(text).find((part) => part.url && /^https:\/\//i.test(part.url))?.url ?? null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

// A tag's text as a browser shows it: entities read, spaces made one.
function decoded(text: string): string {
  return text
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
      if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? whole;
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

// The attributes of one tag, by lower-case name.
function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
    found[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? '';
  }
  return found;
}

// Where a picture the page names is, as a full https address, or null.
function pictureAt(src: string, page: string): string | null {
  const origin = /^https:\/\/[^/?#]+/i.exec(page)?.[0];
  if (!origin || !src) return null;
  if (/^https:\/\//i.test(src)) return src;
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return origin + src;
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return null;
  const path = page.slice(origin.length).replace(/[?#].*$/, '');
  return `${origin}${path.slice(0, path.lastIndexOf('/') + 1) || '/'}${src}`;
}

/** What a page says of itself, read from its head; null when it says nothing to show. */
export function pageInfo(html: string, url: string): { title: string; text: string; picture: string | null } | null {
  const head = html.slice(0, MAX_PAGE).split(/<\/head>|<body[\s>]/i)[0];
  const meta: Record<string, string> = {};
  for (const match of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(match[0]);
    const name = (a.property ?? a.name ?? '').toLowerCase();
    if (name && a.content !== undefined && meta[name] === undefined) meta[name] = decoded(a.content);
  }
  const titled = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1];
  const title = meta['og:title'] || meta['twitter:title'] || (titled ? decoded(titled) : '');
  const text = meta['og:description'] || meta['twitter:description'] || meta.description || '';
  if (!title && !text) return null;
  const src = meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || '';
  return { title, text, picture: pictureAt(src, url) };
}

/**
 * The preview as it goes with these words: whole when they fit together in one message, without
 * its picture when only that is too much, or none.
 */
export function fitPreview(words: string, preview: Preview): Preview | null {
  const checked = checkedPreview(preview);
  if (!checked) return null;
  const size = (p: Preview) => utf8Encode(words).length + utf8Encode(JSON.stringify(p)).length;
  if (size(checked) <= ROOM) return checked;
  const plain = { url: checked.url, title: checked.title, text: checked.text };
  return size(plain) <= ROOM ? plain : null;
}
