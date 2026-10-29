// Naming a member in a group's message with @ and their name (components/group-chat.tsx offers
// the names as one types @): the message then carries who was named, by identity (lib/group-parts.ts,
// `named`), and a member named there is told of it even in a group they muted (lib/background.ts).
// An Erevos from before shows the words alone and tells as it would. Only names typed whole count,
// longest first, so "@Anna Maria" is not "@Anna" too; a message names 32 members at most.

/** The most members one message names. */
export const MOST_NAMED = 32;

export type Nameable = { identity: string; name: string };

const LETTER = /[\p{L}\p{N}_]/u;

/** The @word being typed at the end of `text` (what follows the @, maybe empty), or null when none is. */
export function typingMention(text: string): string | null {
  const match = /(?:^|\s)@([^\s@]{0,40})$/u.exec(text);
  return match ? match[1] : null;
}

/** The members whose names start as `typed` does, ignoring case, at most `most`. */
export function namesFor(typed: string, members: Nameable[], most = 6): Nameable[] {
  const lower = typed.toLocaleLowerCase();
  return members.filter((m) => m.name && m.name.toLocaleLowerCase().startsWith(lower)).slice(0, most);
}

/** `text` with the @word typed at its end made `@name ` in full. */
export function withMention(text: string, name: string): string {
  return text.replace(/@[^\s@]*$/u, `@${name} `);
}

/** The identities of the members named in `text` with @ and their whole name, at most MOST_NAMED. */
export function mentionsIn(text: string, members: Nameable[]): string[] {
  if (!text.includes('@')) return [];
  const named: string[] = [];
  let rest = text;
  for (const member of [...members].filter((m) => m.name).sort((a, b) => b.name.length - a.name.length)) {
    const mark = `@${member.name}`;
    let at = rest.indexOf(mark);
    let found = false;
    while (at >= 0) {
      const after = rest[at + mark.length] ?? '';
      const before = at > 0 ? rest[at - 1] : '';
      if (!LETTER.test(after) && !LETTER.test(before)) {
        found = true;
        // Taken out, so a shorter name inside it is not found there too.
        rest = rest.slice(0, at) + ' '.repeat(mark.length) + rest.slice(at + mark.length);
      }
      at = rest.indexOf(mark, at + 1);
    }
    if (found && !named.includes(member.identity)) named.push(member.identity);
  }
  return named.slice(0, MOST_NAMED);
}

/** Whether `value`, as it came in a message, is a list of identities named, as mentionsIn makes. */
export function isMentions(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MOST_NAMED && value.every((v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v));
}
