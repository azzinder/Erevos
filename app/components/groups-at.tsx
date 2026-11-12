// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { createContext, useContext } from 'react';

import { linkedRole } from '../lib/devices';
import { spaceGroupsAt, type GroupsAt } from '../lib/space-groups';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData } from '../lock/space-data';
import type { StickerPlace } from '../lock/sticker-data';

// Where the group screens (components/group-chat.tsx, components/new-group.tsx and what they use)
// find their groups: the space's, their own screens apart (app/group.tsx), or a hidden place's,
// shown inside its hidden chats (app/chat.tsx), which go from screen to screen there themselves.

/** The groups the group screens show, and how they go from one to another. */
export type GroupsWhere = {
  at: GroupsAt;
  /** Where the stickers made from photos are kept: the space's, or the hidden place's. */
  stickers(): StickerPlace;
  /** Whether links typed get a preview, as their chats' settings say. */
  previews(): Promise<boolean>;
  /** Whether those previews are fetched only through Tor (SpaceData.previewsTor). */
  previewsTor(): Promise<boolean>;
  /** Shows a group's chat, or a contact's. */
  openGroup(id: string): void;
  openContact(identity: string): void;
  /** Whether these chats are a linked device's (lib/devices.ts): the space's, or the hidden place's own. */
  linked(): boolean;
};

/** The open space's groups, each on its own screen. */
export const spaceGroupsWhere: GroupsWhere = {
  at: spaceGroupsAt,
  stickers: () => ({ holder: 'space', ...currentSpace() }),
  previews: async () => (await loadCurrentSpaceData()).previews,
  previewsTor: async () => (await loadCurrentSpaceData()).previewsTor === true,
  openGroup: (id) => router.push(`/group?id=${id}`),
  openContact: (identity) => router.push(`/chat?contact=${identity}`),
  linked: () => linkedRole() === 'linked',
};

const GroupsWhereContext = createContext<GroupsWhere>(spaceGroupsWhere);

/** The groups the screens inside show: the space's, unless said. */
export const GroupsWhereProvider = GroupsWhereContext.Provider;

export function useGroupsWhere(): GroupsWhere {
  return useContext(GroupsWhereContext);
}
