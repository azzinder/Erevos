// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';

import { t } from '../lib/i18n';
import { space } from '../theme/colors';

import { Text, Toggle } from './ui';

// Whether an XMPP or Matrix account tells the others that you are writing (app/xmpp.tsx,
// app/matrix.tsx): off unless turned on, as it goes through the server not encrypted, so the
// server learns each time one writes. Erevos's own chats say it end-to-end encrypted, and only
// to a contact who shows online, never from a chat that appears offline (app/chat.tsx).

/** How often, at most, writing is said while it goes on, and how long after the last key it stops. */
const SAY_EVERY = 10_000;
const PAUSE_AFTER = 5_000;

/**
 * Tells `say` that writing started, again every SAY_EVERY while it goes on, and that it stopped
 * PAUSE_AFTER after the last change or as the screen goes. Nothing when `on` is false. Gives
 * what to call with the field's words at each change, and when a message went.
 */
export function useSayTyping(on: boolean, say: (typing: boolean) => void): { typed: (text: string) => void; sent: () => void } {
  const said = useRef(0);
  const pause = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(say);
  latest.current = say;

  const stop = (tell: boolean) => {
    if (pause.current) clearTimeout(pause.current);
    pause.current = null;
    if (said.current && tell) latest.current(false);
    said.current = 0;
  };

  useEffect(() => {
    if (!on) stop(true);
    return () => stop(true);
  }, [on]);

  return {
    typed(text: string) {
      if (!on) return;
      if (!text.trim()) return stop(true);
      if (Date.now() - said.current >= SAY_EVERY) {
        said.current = Date.now();
        latest.current(true);
      }
      if (pause.current) clearTimeout(pause.current);
      pause.current = setTimeout(() => stop(true), PAUSE_AFTER);
    },
    // The message itself tells the others the writing ended.
    sent: () => stop(false),
  };
}

/** The switch, with what it means. */
export function SayTypingSwitch({ on, server, onChange }: { on: boolean; server: string; onChange: (on: boolean) => void }) {
  return (
    <View style={{ gap: space.xs }}>
      <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {t('Say when I am writing')}
        </Text>
        <Toggle on={on} />
      </Pressable>
      <Text variant="caption" tone="muted">
        {on
          ? t('The others see “typing…” while you write. It goes through the {server} server not encrypted, so the server learns each time you write.', { server })
          : t('The others do not see when you write. You still see when they do, if their app says it.')}
      </Text>
    </View>
  );
}
