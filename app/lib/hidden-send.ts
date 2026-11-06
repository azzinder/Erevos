// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Sending files of a hidden place's Collection (app/collection-send.tsx). Send to… (app/share.tsx)
// never reaches hidden chats, so a hidden place's files go through a picker of their own that
// lists only that hidden place's own contacts and groups, and the space's picker only takes the
// space's Collection. What is picked is told as share-in.ts names it: `contact:` and a contact's
// identity, or `group:` and a group's id.

export type HiddenTarget = { key: string; name: string; kind: 'chat' | 'group'; to: string };

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The chats and groups of one hidden place to pick from, by name, those with `query` in their name. */
export function hiddenTargets(
  people: { identity: string; name: string }[],
  groups: { id: string; name: string }[],
  query = '',
): HiddenTarget[] {
  const q = plain(query.trim());
  const all: HiddenTarget[] = [
    ...people.map((p): HiddenTarget => ({ key: p.identity, name: p.name, kind: 'chat', to: `contact:${p.identity}` })),
    ...groups.map((g): HiddenTarget => ({ key: `group:${g.id}`, name: g.name, kind: 'group', to: `group:${g.id}` })),
  ];
  return all.filter((target) => !q || plain(target.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name));
}

/** The ids of the files a link asks to send: only well-formed ones, each once. */
export function collectionIds(param: string): string[] {
  return [...new Set(param.split(',').filter((id) => /^[0-9a-f]{32}$/.test(id)))];
}
