// Web addresses in a message's words (components/linked-text.tsx shows them tappable): ones that
// start with http://, https:// or www., up to the next space. Marks that end a sentence are not
// part of one, nor a closing bracket that has no opening one in it.

const LINK = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;
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
    parts.push({ text: link, url: /^www\./i.test(link) ? `https://${link}` : link });
    last = at + link.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

function count(text: string, mark: string): number {
  return text.split(mark).length - 1;
}
