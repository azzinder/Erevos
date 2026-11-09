// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { canGroup } from './core';
import type { GroupsAt } from './space-groups';

// The name a space, or one of its hidden places, goes by (Settings, My name; lock/e2e-data.ts
// E2EData.myName). It travels only encrypted: to each contact the chats accepted, in a message of
// its own with the next look at the relay (lib/e2e.ts keysDue, `nm`), and in the private groups, in
// what this phone says about itself there (lock/group-data.ts About.name), which reaches their
// members as its keys there are made new (Groups.renewAgain). Public groups keep the name chosen for
// each (lib/public-groups.ts). Each space and each hidden place has its own, none at first: a name
// the same in two of them tells whoever sees both that they are one person's.

/** The name the chats of `at` go by, or ''. */
export async function myNameAt(at: Pick<GroupsAt, 'chats'>): Promise<string> {
  return (await at.chats()).e2e.myName();
}

/** Sets the name the chats of `at` go by ('' for none), and has their private groups say it. */
export async function setMyNameAt(at: Pick<GroupsAt, 'chats' | 'groups'>, name: string): Promise<void> {
  const { e2e } = await at.chats();
  const before = e2e.myName();
  await e2e.setMyName(name);
  if (e2e.myName() === before || !canGroup()) return;
  await (await at.groups()).renewAgain('group').catch(() => undefined);
}
