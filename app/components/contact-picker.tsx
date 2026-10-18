import { Pressable, View } from 'react-native';

import { memberName } from '../lib/groups';
import { spaceChats } from '../lib/space-chats';
import { radius, space } from '../theme/colors';
import { useTheme } from '../theme/context';
import { KeyFace } from './key-face';
import { Text } from './ui';

// Choosing contacts for a group (app/new-group.tsx, and adding members in app/group.tsx).

export type Pick = { identity: string; name: string };

/** The space's contacts who can be asked into a group: accepted, and reachable. */
export async function groupableContacts(): Promise<Pick[]> {
  const { e2e } = await spaceChats();
  return e2e
    .contacts()
    .filter((c) => !c.request && c.sender)
    .map((c) => ({ identity: c.identity, name: c.name }));
}

/** Contacts to choose, each with its picture and a tick. */
export function ContactPicker({ contacts, chosen, onToggle }: { contacts: Pick[]; chosen: Set<string>; onToggle: (identity: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      {contacts.map((c) => {
        const on = chosen.has(c.identity);
        return (
          <Pressable
            key={c.identity}
            onPress={() => onToggle(c.identity)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              padding: space.sm,
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surfacePressed : on ? colors.surfaceAlt : 'transparent',
            })}
          >
            <KeyFace identity={c.identity} name={c.name} size={40} />
            <Text style={{ flex: 1 }} numberOfLines={1}>
              {memberName(c.identity, [c])}
            </Text>
            <Text variant="bodyStrong" color={on ? colors.accentText : colors.textFaint}>
              {on ? '✓' : '○'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

