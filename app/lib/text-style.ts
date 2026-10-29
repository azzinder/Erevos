// How a message's words may look (components/linked-text.tsx shows them so): marks typed around
// words, as in WhatsApp and Signal, which other apps and an Erevos from before show as typed.
//   *bold*   _italic_   ~struck through~   `code`   ```a block of code```   ||hidden till tapped||
// A mark opens only before a letter, not after one (so 2*3*4 and snake_case stay as they are),
// and closes only after one, not before one; bold, italic and struck through stay on one line,
// code never takes marks inside it, and web addresses are never read for marks (lib/links.ts).
// What is hidden is hidden in a message's line too (lib/message-line.ts), as plainWords says.
// Read in one pass over the words, each web address found once; words longer than MOST_STYLED
// show as typed, so no message, however made, holds the screen up.

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

/** Words longer than this are shown as typed, with no marks read. */
export const MOST_STYLED = 8000;

const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/u;
// Web addresses (as lib/links.ts finds them): no mark is read inside one. Marks and sentence marks
// at its end are not part of it.
const LINKS = /(?:https?:\/\/|www\.)[^\s<>"]+/gi;
const LINK_END = /[.,;:!?'’”»*_~`|]+$/;
const MARK_CHAR = /[*_~`|]/;

// Each text's parts, as read last, a few hundred at most.
const read = new Map<string, StyledPart[]>();
const MOST_KEPT = 300;

/** The words in runs of one look each, the marks taken away; words with no mark are one run. */
export function styleText(text: string): StyledPart[] {
  if (text.length > MOST_STYLED || !MARK_CHAR.test(text)) return text ? [{ text, look: {} }] : [];
  const kept = read.get(text);
  if (kept) return kept;
  const parts = parse(text);
  if (read.size >= MOST_KEPT) read.delete(read.keys().next().value!);
  read.set(text, parts);
  return parts;
}

function parse(text: string): StyledPart[] {
  // Where each web address starts (its length), and which characters are in one.
  const linkAt = new Map<number, number>();
  const inLink = new Uint8Array(text.length);
  for (const match of text.matchAll(LINKS)) {
    const at = match.index ?? 0;
    if (at > 0 && WORD.test(text[at - 1])) continue;
    const length = match[0].replace(LINK_END, '').length;
    if (length <= 4) continue;
    linkAt.set(at, length);
    inLink.fill(1, at, at + length);
  }

  // Whether a mark may open at `at`, inside [start, end): not after a letter or digit, nor after
  // its own sign, and before something that is not a space (a block of code may start on the next line).
  const opens = (at: number, mark: string, start: number, end: number) => {
    const before = at > start ? text[at - 1] : '';
    const after = at + mark.length < end ? text[at + mark.length] : '';
    if (WORD.test(before) || before === mark[0] || after === '') return false;
    return mark === '```' || (!SPACE.test(after) && after !== mark[0]);
  };
  // Whether a mark may close at `at`: after something that is not a space, and not before a letter
  // or digit, nor its own sign.
  const closes = (at: number, mark: string, start: number, end: number) => {
    const before = at > start ? text[at - 1] : '';
    const after = at + mark.length < end ? text[at + mark.length] : '';
    return before !== '' && !SPACE.test(before) && !WORD.test(after) && after !== mark[0];
  };
  // Where a mark found no closing, by mark and end: from where, up to where (its line's end). A
  // mark opened later in that stretch has fewer places to close, so none either: the words are
  // read once, not again for each mark that never closes.
  const unclosed = new Map<string, { from: number; until: number }>();
  // Where the mark opened at `at` closes, before `end`, or -1.
  const closing = (at: number, mark: Mark, end: number) => {
    const from = at + mark.open.length;
    const key = `${mark.open}:${end}`;
    const known = unclosed.get(key);
    if (known && from >= known.from && from < known.until) return -1;
    const line = mark.line ? text.indexOf('\n', from) : -1;
    const until = line >= 0 && line < end ? line : end;
    for (let next = text.indexOf(mark.open, from); next >= 0 && next + mark.open.length <= end; next = text.indexOf(mark.open, next + 1)) {
      if (line >= 0 && line < next) break;
      if (next === from) continue;
      if (mark.look === 'code') return next;
      if (!inLink[next] && closes(next, mark.open, from, end)) return next;
    }
    unclosed.set(key, { from, until });
    return -1;
  };

  const parts: StyledPart[] = [];
  let spoilers = 0;
  const walk = (start: number, end: number, look: Look, spoiler: number | undefined) => {
    let plain = '';
    const flush = () => {
      if (plain) parts.push({ text: plain, look, ...(spoiler !== undefined ? { spoiler } : {}) });
      plain = '';
    };
    let i = start;
    while (i < end) {
      const link = linkAt.get(i);
      if (link !== undefined && i + link <= end) {
        plain += text.slice(i, i + link);
        i += link;
        continue;
      }
      const mark = MARKS.find((m) => text.startsWith(m.open, i) && !look[m.look] && opens(i, m.open, start, end));
      const close = mark ? closing(i, mark, end) : -1;
      if (!mark || close < 0) {
        plain += text[i];
        i += 1;
        continue;
      }
      flush();
      let from = i + mark.open.length;
      let to = close;
      if (mark.look === 'code') {
        // A block of code drops the line break right after its opening and before its closing marks.
        if (mark.open === '```' && text[from] === '\n') from += 1;
        if (mark.open === '```' && to > from && text[to - 1] === '\n') to -= 1;
        const inner = text.slice(from, to);
        if (inner) parts.push({ text: inner, look: { ...look, code: true }, ...(spoiler !== undefined ? { spoiler } : {}) });
      } else if (mark.look === 'hidden') walk(from, to, { ...look, hidden: true }, spoilers++);
      else walk(from, to, { ...look, [mark.look]: true }, spoiler);
      i = close + mark.open.length;
    }
    flush();
  };
  walk(0, text.length, {}, undefined);
  return parts;
}

/** Whether the words have any mark that changes how they look. */
export function hasStyle(text: string): boolean {
  return styleText(text).some((part) => Object.keys(part.look).length > 0);
}

/** The words with their marks taken away and what is hidden as ▒▒▒, for a line: the home screen, a quote, a search. */
export function plainWords(text: string): string {
  if (!MARK_CHAR.test(text)) return text;
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
