// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { directNow, onDirect, setDirect } from '../lib/direct';
import { tap } from '../lib/haptics';
import { t } from '../lib/i18n';
import { nostrOwnTor } from '../lib/nostr';
import { torOff } from '../lib/relay';
import { updateCurrentSpaceData } from '../lock/space-data';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';
import { Card, Text, TextButton, Toggle } from './ui';

// Direct connections (lib/direct.ts): the open space's switch, as Settings shows it at its top and
// its own screen (app/direct.tsx) does, and what a screen reads to know how it stands now.

const through = () => !torOff() || nostrOwnTor();

/** How Direct connections stand now, read again when the switch or a Tor setting changes: `on`, and `tor` while something of the space goes through Tor, which keeps them off. */
export function useDirect(): { on: boolean; tor: boolean } {
  const [now, setNow] = useState(() => ({ on: directNow(), tor: through() }));
  useEffect(() => {
    const read = () => setNow({ on: directNow(), tor: through() });
    read();
    return onDirect(read);
  }, []);
  return now;
}

/** Whether Direct connections are on now, read again when they change. */
export function useDirectNow(): boolean {
  return useDirect().on;
}

/** What the switch does as it stands, in a line: who sees this phone's internet address is said plainly, on and off. */
export function directLine(on: boolean, tor: boolean): string {
  if (on) {
    return t(
      "On: Erevos does not ask before what shows this phone's internet address (IP address), and calls work with no server too. The servers you reach see that address, and so does a contact you call with no server.",
    );
  }
  if (tor) return t('Off, as Tor is on in this space: nothing connects directly, and it stays off until you turn it on here again.');
  return t("Off: before each thing that shows this phone's internet address (IP address), Erevos says who would see it, and calls go only through a call server or on the same Wi-Fi.");
}

/**
 * The switch in its card: its name, what it does as it stands, and, when `more` is given (Settings),
 * the way to its screen. Turned off it is kept off; turned on while Tor is on, it says why it
 * cannot be, and stays off.
 */
export function DirectSwitch({ more }: { more?: () => void }) {
  const colors = useColors();
  const { on, tor } = useDirect();
  const [note, setNote] = useState('');

  async function turn() {
    tap();
    setNote('');
    if (!on && tor) {
      setNote(t('Tor is on in this space, so Direct connections stay off. To turn them on, first turn off Tor, and Nostr through Tor, under Settings, Server and networks.'));
      return;
    }
    try {
      await updateCurrentSpaceData({ direct: !on });
      setDirect(!on);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Card>
      <Pressable onPress={() => void turn()} accessibilityRole="switch" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{t('Direct connections')}</Text>
          <Text variant="caption" tone="muted">
            {directLine(on, tor)}
          </Text>
        </View>
        <Toggle on={on} />
      </Pressable>
      {note ? (
        <Text variant="caption" color={colors.warning}>
          {note}
        </Text>
      ) : null}
      {more ? <TextButton title={t('What it changes')} onPress={more} /> : null}
    </Card>
  );
}
