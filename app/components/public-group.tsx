import { useEffect, useState } from 'react';
import { Platform, Share } from 'react-native';

import { shownLine } from '../lib/call-lines';
import { t } from '../lib/i18n';
import type { PublicGroups, PublicInfo } from '../lib/public-groups';
import { voiceDuration } from '../lib/voice';
import type { GroupMessage } from '../lock/group-data';
import { useGroupsWhere } from './groups-at';

// What the group screen needs of a public group (lib/public-groups.ts), kept apart from it: whether
// the group is one, what this phone may do there, and its members' names, all as they change.

export type PublicGroupView = {
  isPublic: boolean;
  info: PublicInfo | null;
  /** A member's name: the one it chose, with the start of its key. */
  name: (key: string) => string;
  /** What the group's head says under its name, in place of a private group's. */
  caption: string | null;
};

export function usePublicGroup(id: string): PublicGroupView {
  const { at } = useGroupsWhere();
  const [seen, setSeen] = useState<{ groups: PublicGroups | null; info: PublicInfo | null }>({ groups: null, info: null });

  useEffect(() => {
    let stop = () => undefined as void;
    let active = true;
    void at
      .groups()
      .then((groups) => {
        if (!active) return;
        const read = () => setSeen({ groups, info: groups.publicInfo(id) });
        read();
        stop = groups.onChange(read);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      stop();
    };
  }, [id, at]);

  const info = seen.info;
  return {
    isPublic: info !== null,
    info,
    name: (key) => seen.groups?.nameIn(id, key) ?? key.slice(0, 8),
    caption: !info ? null : info.muted ? t('An admin muted you in this group.') : t('Public group · tap for its link and members'),
  };
}

/** Shares a public group's link, or on a computer, which has no share sheet, copies it. Says what it did. */
export async function shareGroupLink(link: string): Promise<string> {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(link);
    return t('The group’s link is copied.');
  }
  await Share.share({ message: link });
  return '';
}

/** A message in a line, for the list of what an admin can delete. */
export function messageLine(m: GroupMessage): string {
  if (m.file && m.ms !== undefined) return t('Voice message, {time}', { time: voiceDuration(m.ms) });
  if (m.file) return m.file.kind === 'photo' ? t('Photo') : t('File: {name}', { name: m.file.name });
  return shownLine(m.text);
}
