// How a message's words may look (components/linked-text.tsx shows them so): marks typed around
// words, as in WhatsApp and Signal, which other apps and an Erevos from before show as typed.
//   *bold*   _italic_   ~struck through~   `code`   ```a block of code```   ||hidden till tapped||
// A mark opens only before a letter, not after one (so 2*3*4 and snake_case stay as they are),
// and closes only after one, not before one; bold, italic and struck through stay on one line,
// code never takes marks inside it, and web addresses are never read for marks (lib/links.ts).
// What is hidden is hidden in a message's line too (lib/message-line.ts), as plainWords says.

export type Look = { bold?: true; italic?: true; strike?: true; code?: true; hidden?: true };

/** A run of words with one look. `hidden` runs are numbered (`spoiler`) so each can be shown apart. */
export type StyledPart = { text: string; look: Look; spoiler?: number };

type Mark = { open: string; look: keyof Look; line: boolean };

// Longest first, so ``` is not read as `.
const MARKS: Mark[] = [
  { open: '```', look: 'code', line: false },
  { open: '||', look: 'hidden', line: false },
  { open: '`', look: 'code', line: true },
  { open: '*', look: 'bold', line: true },
  { open: '_', look: 'italic', line: true },
  { open: '~', look: 'strike', line: true },
];

const WORD = /[\p{L}\p{N}]/u;
// A web address (as lib/links.ts finds them), taken whole: no mark is read inside it. Marks and
// sentence marks at its end are not part of it.
const LINK_AT = /(?:https?:\/\/|www\.)[^\s<>"]+/iy;
const LINK_END = /[.,;:!?'’”»*_~`|]+$/;

// The web address that starts at `at`, or ''.
function linkAt(text: string, at: number): string {
  if (at > 0 && WORD.test(text[at - 1])) return '';
  LINK_AT.lastIndex = at;
  const match = LINK_AT.exec(text);
  return match ? match[0].replace(LINK_END, '') : '';
}
const SPACE = /\s/u;

// Whether a mark may open at `at`: not after a letter or digit, and before something that is not a space.
function opens(text: string, at: number, mark: string): boolean {
  const before = at > 0 ? text[at - 1] : '';
  const after = text[at + mark.length] ?? '';
  if (WORD.test(before) || before === mark[0] || after === '') return false;
  // A block of code may start on the next line.
  return mark === '```' || (!SPACE.test(after) && after !== mark[0]);
}

// Whether a mark may close at `at`: after something that is not a space, and not before a letter or digit.
function closes(text: string, at: number, mark: string): boolean {
  const before = at > 0 ? text[at - 1] : '';
  const after = text[at + mark.length] ?? '';
  return before !== '' && !SPACE.test(before) && !WORD.test(after) && after !== mark[0];
}

// Whether `at` is inside a web address that starts between `from` and it.
function insideLink(text: string, from: number, at: number): boolean {
  for (let i = from; i < at; i += 1) {
    const link = linkAt(text, i);
    if (link.length > 4) {
      if (i + link.length > at) return true;
      i += link.length - 1;
    }
  }
  return false;
}

/** Where the mark opened at `start` closes, or -1. */
function closing(text: string, start: number, mark: Mark): number {
  const from = start + mark.open.length;
  for (let at = text.indexOf(mark.open, from); at >= 0; at = text.indexOf(mark.open, at + 1)) {
    if (mark.line && text.slice(from, at).includes('\n')) return -1;
    if (mark.look !== 'code' && insideLink(text, from, at)) continue;
    if (at > from && (mark.look === 'code' || closes(text, at, mark.open))) return at;
  }
  return -1;
}

/** The words in runs of one look each, the marks taken away; words with no mark are one run. */
export function styleText(text: string): StyledPart[] {
  const parts: StyledPart[] = [];
  let spoilers = 0;
  const walk = (piece: string, look: Look, spoiler: number | undefined) => {
    let plain = '';
    let i = 0;
    const flush = () => {
      if (plain) parts.push({ text: plain, look, ...(spoiler !== undefined ? { spoiler } : {}) });
      plain = '';
    };
    while (i < piece.length) {
      const link = look.code ? '' : linkAt(piece, i);
      if (link.length > 4) {
        plain += link;
        i += link.length;
        continue;
      }
      const mark = look.code ? undefined : MARKS.find((m) => piece.startsWith(m.open, i) && !look[m.look] && opens(piece, i, m.open));
      const end = mark ? closing(piece, i, mark) : -1;
      if (!mark || end < 0) {
        plain += piece[i];
        i += 1;
        continue;
      }
      flush();
      let inner = piece.slice(i + mark.open.length, end);
      // A block of code drops the line break right after its opening and before its closing marks.
      if (mark.open === '```') inner = inner.replace(/^\n/, '').replace(/\n$/, '');
      if (mark.look === 'hidden') walk(inner, { ...look, hidden: true }, spoilers++);
      else if (mark.look === 'code') parts.push({ text: inner, look: { ...look, code: true }, ...(spoiler !== undefined ? { spoiler } : {}) });
      else walk(inner, { ...look, [mark.look]: true }, spoiler);
      i = end + mark.open.length;
    }
    flush();
  };
  walk(text, {}, undefined);
  return parts;
}

/** Whether the words have any mark that changes how they look. */
export function hasStyle(text: string): boolean {
  return styleText(text).some((part) => Object.keys(part.look).length > 0);
}

/** The words with their marks taken away and what is hidden as ▒▒▒, for a line: the home screen, a quote, a search. */
export function plainWords(text: string): string {
  if (!/[*_~`|]/.test(text)) return text;
  let out = '';
  let last: number | undefined;
  for (const part of styleText(text)) {
    if (part.look.hidden) {
      if (part.spoiler !== last) out += '▒▒▒';
    } else out += part.text;
    last = part.look.hidden ? part.spoiler : undefined;
  }
  return out;
}
