// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { View } from 'react-native';

import { locale, t } from '../lib/i18n';
import { space } from '../theme/colors';

import { Row, Text } from './ui';

// Who one of ours was for, in a group or a room, in a sheet held down from it: who read it and
// when, whose phone it reached and when, and who has neither yet, each in the order they did.

/** A member, by name, and when they did it. */
export type Reader = { key: string; name: string; at: number };

// When a member's phone said it, as the phone's language writes a day and a time.
function when(at: number): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  try {
    return new Date(at).toLocaleString(locale(), options);
  } catch {
    return new Date(at).toLocaleString();
  }
}

/** Who read one of ours (`read`), whose phone it reached (`came`, none where that is not said), and who neither (`waiting`), with `note` under them. */
export function WhoRead({ read, came = [], waiting, note }: { read: Reader[]; came?: Reader[]; waiting: { key: string; name: string }[]; note: string }) {
  const part = (title: string, list: { key: string; name: string; at?: number }[]) =>
    list.length === 0 ? null : (
      <View style={{ gap: space.xs }}>
        <Text variant="label">{title}</Text>
        {list.map((member) => (
          <Row key={member.key} style={{ justifyContent: 'space-between' }}>
            <Text style={{ flexShrink: 1 }} numberOfLines={1}>
              {member.name}
            </Text>
            {member.at !== undefined ? <Text tone="muted">{when(member.at)}</Text> : null}
          </Row>
        ))}
      </View>
    );
  const first = (list: Reader[]) => [...list].sort((a, b) => a.at - b.at);
  return (
    <View style={{ gap: space.md }}>
      {read.length + came.length + waiting.length === 0 ? <Text tone="muted">{t('No one else was there when you sent it.')}</Text> : null}
      {part(t('Read ✓✓✓'), first(read))}
      {part(t('Reached their phone ✓✓'), first(came))}
      {part(t('Not yet'), waiting)}
      <Text variant="caption" tone="muted">
        {note}
      </Text>
    </View>
  );
}
