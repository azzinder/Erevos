// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useIsFocused } from 'expo-router';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { GuardChange } from '../lib/chat-protect';
import { t } from '../lib/i18n';
import { CAN_KEEP_PRIVATE, keepPrivate } from '../lib/screen-privacy';
import { makeChatPin, opensChat, RELOCK_MS, type ChatPin } from '../lock/chat-pin';
import { ownSpaceKey } from '../lock/config';
import { useLock } from '../lock/context';
import { currentSpace } from '../lock/keys';

import { ChatPinGate } from './chat-pin-gate';
import { PasswordSheet } from './PasswordSheet';
import { Button } from './ui';

// A chat on Matrix, XMPP or Nostr, or an SMS conversation, locked with a PIN of its own and its
// screenshots blocked as a space's own chat is (lib/chat-protect.ts, app/chat.tsx): it shows only
// once its PIN is typed (ChatPinGate), until it closes or Erevos was away more than RELOCK_MS, and
// meanwhile nothing of it is drawn, read or told; opened, it keeps out of screenshots and the
// recent apps preview, as hidden chats do. Where the space has a password, that password takes a
// PIN forgotten off. The screen shows the gate in its place while `gated`, and the buttons beside
// its others (Notifications, Chat look).

// The chats open with their PIN on a screen now, and on how many: another screen of the same chat
// (a thread of a Matrix room) opens without asking again while the first is still up.
const openNow = new Map<string, number>();

/**
 * The lock of the chat `id`, named `name` on its gate. `pin`: the PIN it is locked with, as kept;
 * `shots`: its screenshots blocked. `lockable`: whether a PIN of its own is offered: not in a hidden
 * place's chats, which their own PIN guards, and which keep out of screenshots always, so neither
 * button shows there. `save` keeps a change with the chat; `say` tells what was done; `onBack`
 * leaves the chat from its gate.
 */
export function useChatProtect({ id, name, pin, shots, lockable, save, say, onBack }: {
  id: string;
  name: string;
  pin: ChatPin | null;
  shots: boolean;
  lockable: boolean;
  save: (change: GuardChange) => Promise<void>;
  say: (text: string) => void;
  onBack: () => void;
}): { gated: boolean; gate: ReactElement | null; buttons: ReactNode } {
  const focused = useIsFocused();
  const lock = useLock();
  // The chat opened with its PIN, by its id: another chat on the same screen asks again.
  const [unlocked, setUnlocked] = useState(() => (id && openNow.has(id) ? id : ''));
  useEffect(() => {
    if (!id || unlocked !== id) return;
    openNow.set(id, (openNow.get(id) ?? 0) + 1);
    return () => {
      const left = (openNow.get(id) ?? 1) - 1;
      if (left > 0) openNow.set(id, left);
      else openNow.delete(id);
    };
  }, [id, unlocked]);
  const [active, setActive] = useState(AppState.currentState === 'active');
  // What asks for a PIN: a new one to lock it with, or its own to take it off.
  const [asking, setAsking] = useState<'on' | 'off' | null>(null);
  useEffect(() => {
    let away = 0;
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'background') away = Date.now();
      else if (state === 'active' && away) {
        if (Date.now() - away > RELOCK_MS) setUnlocked('');
        away = 0;
      }
    });
    return () => subscription.remove();
  }, []);
  const locked = lockable && !!pin;
  const gated = locked && unlocked !== id;
  // Opened with its PIN, it keeps out of screenshots and the recent apps preview.
  const pinOpen = focused && locked && !gated;
  useEffect(() => {
    if (!pinOpen) return;
    keepPrivate('chat', true);
    return () => keepPrivate('chat', false);
  }, [pinOpen]);
  // Its screenshots blocked: while it shows, Android only (lib/screen-privacy.ts).
  const shotsOff = focused && shots;
  useEffect(() => {
    if (!shotsOff) return;
    keepPrivate('shots', true);
    return () => keepPrivate('shots', false);
  }, [shotsOff]);

  async function open(typed: string): Promise<boolean> {
    if (pin && !(await opensChat(typed, pin))) return false;
    setUnlocked(id);
    return true;
  }

  // Takes its PIN off with the password that opens the space, its PIN forgotten.
  async function forgot(password: string): Promise<boolean> {
    if (!(await ownSpaceKey(currentSpace().space, password))) return false;
    await save({ pin: null });
    setUnlocked(id);
    say(t('The PIN of {name} is off.', { name }));
    return true;
  }

  // Locks it with a new PIN; it stays open meanwhile.
  async function lockWith(typed: string): Promise<void> {
    await save({ pin: await makeChatPin(typed) });
    setUnlocked(id);
    setAsking(null);
    say(t('{name} is locked with a PIN now: it asks for it each time the chat opens.', { name }));
  }

  async function takeOff(typed: string): Promise<boolean> {
    if (pin && !(await opensChat(typed, pin))) return false;
    await save({ pin: null });
    setAsking(null);
    return true;
  }

  function changeShots(on: boolean) {
    save({ shots: on })
      .then(() => say(on ? t('Screenshots of this chat are now blocked here. The others are not told, and their apps can still take them.') : t('Screenshots of this chat are allowed again.')))
      .catch((error: unknown) => say(error instanceof Error ? error.message : String(error)));
  }

  const gate = gated ? <ChatPinGate name={name} active={focused && active} open={open} forgot={lock.passwordLock ? forgot : undefined} onBack={onBack} /> : null;
  const buttons = lockable ? (
    <>
      <Button title={locked ? t('Take the PIN off') : t('Lock with a PIN')} kind="secondary" compact onPress={() => setAsking(locked ? 'off' : 'on')} />
      {/* Where Erevos cannot keep screenshots out, the switch would do nothing: one turned on still shows, to turn it off. */}
      {CAN_KEEP_PRIVATE || shots ? <Button title={shots ? t('Allow screenshots') : t('Block screenshots')} kind="secondary" compact onPress={() => changeShots(!shots)} /> : null}
      <PasswordSheet
        visible={asking === 'on'}
        title={t('Lock this chat with a PIN')}
        repeat
        hint={t('Asked each time the chat opens. Only this phone knows it.')}
        submitLabel={t('Lock')}
        onClose={() => setAsking(null)}
        onSubmit={lockWith}
      />
      <PasswordSheet visible={asking === 'off'} title={t('Type its PIN to take it off')} repeat={false} submitLabel={t('Take it off')} onClose={() => setAsking(null)} onSubmit={takeOff} />
    </>
  ) : null;
  return { gated, gate, buttons };
}
