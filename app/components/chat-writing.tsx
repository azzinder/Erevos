// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';

import { ask } from '../lib/alert';
import { heldChanged } from '../lib/chat-later';
import { draftIn, dropHeld, heldNow, holdText, keepDraft, MOST_HELD, waitsForOwner, type HeldText, type WritingAccount } from '../lib/chat-writing';
import { openHiddenPlace } from '../lib/hidden-contacts';
import { t } from '../lib/i18n';
import { laterLabel } from '../lib/later';
import { moduleOn } from '../lib/modules';
import { myselfPlace, writeNote, type NotesAt } from '../lib/myself';
import type { NetworkWhere } from '../lib/network-place';
import { receivesPocket } from '../lib/place-receiver';
import { MAX_NOTE_TEXT } from '../lock/myself-data';
import { restoredAt } from '../lock/restored';
import { hiddenHolder } from '../lock/sealed-file';
import { space } from '../theme/colors';
import { softBubble, textSized } from '../theme/bubbles';
import { useTheme } from '../theme/context';
import { LaterPicker } from './later-picker';
import { Sheet, Text } from './ui';

// The Matrix, XMPP and Nostr chats' drafts and messages held to go later (lib/chat-writing.ts), as
// their screens show them (app/matrix-chat.tsx, app/xmpp-chat.tsx, app/nostr-chat.tsx); and Remind
// me on a message of theirs, or of an SMS conversation (app/sms.tsx), which writes it into Chat with
// myself with a reminder (lib/myself.ts). Each screen acts on its own account: the space's, or the
// hidden place's it was opened from (lib/network-place.ts), whose reminders go to that place's own
// Chat with myself.

/** What is typed in a chat, kept as its draft as it changes. */
export type KeptDraft = {
  /** The words the field starts with: what was typed here last, or else the draft kept. */
  initial(): string;
  /** The field changed: kept a moment after typing stops. */
  typed(text: string): void;
  /** What was typed went (or is held to go later): the draft is forgotten at once. */
  sent(): void;
};

/**
 * Keeps what is typed in the chat `chat` of `account` as its draft, as the SMS screen does: read
 * once the account is there, and put in the field with `fill` unless something is typed already;
 * kept a moment after typing stops, as Erevos goes to the background, and as the chat closes, also
 * when its account stopped meanwhile (a hidden place closing). No chat, no draft: a Matrix thread
 * keeps none.
 */
export function useKeptDraft(account: WritingAccount | null, chat: string | undefined, fill?: (text: string) => void): KeptDraft {
  const last = useRef<WritingAccount | null>(null);
  if (account) last.current = account;
  const kept = useRef({ chat: chat ?? '', read: false, latest: '', saved: '' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillNow = useRef(fill);
  fillNow.current = fill;

  const read = () => {
    const now = kept.current;
    if (!now.read && now.chat && last.current) {
      now.read = true;
      now.saved = draftIn(last.current.now(), now.chat);
      if (!now.latest.trim()) now.latest = now.saved;
    }
    return now.latest;
  };
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const now = kept.current;
    if (!now.read || !now.chat || now.latest === now.saved) return;
    const { chat: which, latest } = now;
    now.saved = latest;
    void last.current?.change((writing) => keepDraft(writing, which, latest)).catch(() => undefined);
  };
  const flushNow = useRef(flush);
  flushNow.current = flush;

  const ready = !!account;
  useEffect(() => {
    if (kept.current.chat !== (chat ?? '')) kept.current = { chat: chat ?? '', read: false, latest: '', saved: '' };
    if (ready && !kept.current.read) {
      const text = read();
      if (text) fillNow.current?.(text);
    }
    return () => flushNow.current();
  }, [chat, ready]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => state === 'background' && flushNow.current());
    return () => subscription.remove();
  }, []);

  return {
    initial: read,
    typed: (text) => {
      kept.current.latest = text;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flushNow.current(), 1500);
    },
    sent: () => {
      kept.current.latest = '';
      flushNow.current();
    },
  };
}

/** When a backup was last restored here, once read: 0 until then, or when none was. */
function useRestored(): number {
  const [at, setAt] = useState(0);
  useEffect(() => {
    let live = true;
    restoredAt().then((read) => live && setAt(read), () => undefined);
    return () => {
      live = false;
    };
  }, []);
  return at;
}

/**
 * Holds what was typed to go at its time in `account`, and says so with `say`. Says whether it is
 * held: not when the account holds as many as it can.
 */
export async function keepForLater(account: WritingAccount | null, what: Omit<HeldText, 'id' | 'made' | 'problem'>, say: (note: string) => void): Promise<boolean> {
  if (!account) return false;
  const kept: { held?: HeldText } = {};
  try {
    await account.change((writing) => {
      const made = holdText(writing, what);
      if (!made) return writing;
      kept.held = made.held;
      return made.writing;
    });
  } catch (error) {
    say(t('Not kept. {reason}', { reason: error instanceof Error ? error.message : String(error) }));
    return false;
  }
  if (!kept.held) {
    say(t('Not kept. {reason}', { reason: t('{n} messages already wait to go later.', { n: MOST_HELD }) }));
    return false;
  }
  heldChanged();
  say(t('Goes on {when}.', { when: laterLabel(what.at) }));
  return true;
}

/** Whether the open hidden place sends nothing while closed: it does not receive closed. */
function placeQuietWhenClosed(): boolean {
  const open = openHiddenPlace();
  return !!open && !receivesPocket(open.space, open.pocket);
}

/** Choosing when what is typed goes, with what that means. */
export function LaterSheet({ visible, where, onPick, onClose }: { visible: boolean; where: NetworkWhere; onPick: (at: number) => void; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={t('Send later')}>
      {visible ? <LaterPicker onPick={onPick} /> : null}
      <Text variant="caption" tone="muted">
        {t('It goes from this phone at that time while this space is open, on Android with Erevos in the background too; if it is not open then, as soon as it is. Until then it waits here, encrypted. Text only.')}
        {where === 'place' && placeQuietWhenClosed() ? ` ${t('Closed, these hidden chats send nothing: it goes while they are open, unless you turn on Receive while closed at the top.')}` : ''}
      </Text>
    </Sheet>
  );
}

/**
 * The messages a chat holds to go later, after its thread, each as ours with its time. Tapped, one
 * goes now or is deleted; one a backup brought back whose time came before it was restored says so,
 * and waits for that. `account` is the screen's, as it is when tapped.
 */
export function HeldBubbles({ held, account, say }: { held: HeldText[]; account: () => WritingAccount | null; say: (note: string) => void }) {
  const { colors, look } = useTheme();
  const restored = useRestored();
  if (held.length === 0) return null;
  const act = (change: () => Promise<void> | undefined) =>
    void (change() ?? Promise.resolve()).catch((error: unknown) => say(error instanceof Error ? error.message : String(error)));
  const choose = (one: HeldText) => {
    const when = laterLabel(one.at);
    const waits = waitsForOwner(one, restored);
    ask(
      t('Send later'),
      waits
        ? t('This message was to go on {when}, before this backup was restored, and did not go from this phone. The phone the backup came from may have sent it already.', { when })
        : t('Goes on {when}.', { when }),
      [
        { text: t('Keep it'), style: 'cancel' },
        { text: t('Delete'), style: 'destructive', onPress: () => act(() => account()?.change((writing) => dropHeld(writing, one.id)).then(() => heldChanged())) },
        { text: t('Send now'), onPress: () => act(() => account()?.change((writing) => heldNow(writing, one.id)).then(() => heldChanged(one.id))) },
      ],
    );
  };
  return (
    <View style={{ gap: space.md }}>
      {held.map((one) => (
        <Pressable
          key={one.id}
          accessibilityRole="button"
          onPress={() => choose(one)}
          style={[
            { alignSelf: 'flex-end', maxWidth: '85%', padding: space.sm + 2, gap: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
            softBubble(look.bubbles, colors, true),
          ]}
        >
          <Text style={textSized(look.textSize, 16)}>{one.text}</Text>
          {waitsForOwner(one, restored) ? (
            <Text variant="caption" color={colors.danger}>
              {t('Not sent · was to go {when}. Tap to send it or delete it.', { when: laterLabel(one.at) })}
            </Text>
          ) : (
            <Text variant="caption" tone="faint">
              {t('Scheduled · {when}', { when: laterLabel(one.at) })}
            </Text>
          )}
          {one.problem ? (
            <Text variant="caption" tone="faint">
              {one.problem}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

/** Whose Chat with myself a reminder from a chat of `where` goes to: the space's, while Erevos's
 *  own chats are on (Chat with myself is theirs), or the open hidden place's own, which the phone
 *  tells at its time only while the place receives closed. Null when there is none. */
export function remindPlace(where: NetworkWhere): NotesAt | null {
  if (where === 'place') {
    const open = openHiddenPlace();
    return open ? { place: { holder: hiddenHolder(open.pocket), space: open.space, key: open.key }, arm: receivesPocket(open.space, open.pocket) } : null;
  }
  return moduleOn('erevos') ? { place: myselfPlace(), arm: true } : null;
}

/** What a reminder is of: the chat it was in, and the message's words, or what it is. */
export type RemindOf = { from: string; text: string };

/** Choosing when a message reminds: it goes into Chat with myself, with where it was, and reminds then. */
export function RemindSheet({ of, where, onClose, say }: { of: RemindOf | null; where: NetworkWhere; onClose: () => void; say: (note: string) => void }) {
  const keep = async (at: number) => {
    const place = remindPlace(where);
    if (!of || !place) return;
    onClose();
    try {
      await writeNote({ text: `${of.from}\n${of.text}`.slice(0, MAX_NOTE_TEXT), due: at }, place);
      say(t('Reminds you on {when}.', { when: laterLabel(at) }));
    } catch (error) {
      say(t('Not kept. {reason}', { reason: error instanceof Error ? error.message : String(error) }));
    }
  };
  return (
    <Sheet visible={of !== null} onClose={onClose} title={t('Remind me')}>
      {of ? <LaterPicker remind onPick={(at) => void keep(at)} /> : null}
      <Text variant="caption" tone="muted">
        {t('It goes in Chat with myself, and only says “Reminder” on the phone at that time.')}
      </Text>
    </Sheet>
  );
}
