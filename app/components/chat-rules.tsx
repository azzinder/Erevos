// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { QrCode } from './QrCode';
import { Button, Chip, Row, Sheet, Text, TextButton, Toggle } from './ui';
import { ask } from '../lib/alert';
import { TIMERS, timerLabel } from '../lib/chat-screen';
import { plural, t } from '../lib/i18n';
import { CAN_TAKE_PHOTOS } from '../lib/pick-photo';
import { readQrPhoto } from '../lib/read-qr';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// The rules of a chat with another service, as its screen shows them (lib/chat-rules.ts): its timer
// for disappearing messages, one message to disappear, deleting here or for everyone, a switch, the
// people blocked, and checking a contact in person by the codes of both phones. What each does on
// its service is said by the screen that uses it (app/matrix-chat.tsx, app/xmpp-chat.tsx,
// app/nostr-chat.tsx, app/sms.tsx).

/** The chat's timer, as a button that opens its choices, with what it does on this service (`note`). */
export function ChatTimer({ seconds, note, onChoose, onChosen }: { seconds: number; note: string; onChoose: (seconds: number) => void; /** Called once chosen: a sheet it shows in closes too. */ onChosen?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        title={seconds ? `${t('Disappearing messages')} · ${timerLabel(seconds)}` : t('Disappearing messages')}
        kind="secondary"
        compact
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('Disappearing messages')}>
        <View style={{ gap: space.md }}>
          <Text variant="caption" tone="muted">
            {note}
          </Text>
          <Row wrap>
            {TIMERS.map((timer) => (
              <Chip
                key={timer}
                label={timerLabel(timer)}
                selected={timer === seconds}
                onPress={() => {
                  setOpen(false);
                  onChosen?.();
                  if (timer !== seconds) onChoose(timer);
                }}
              />
            ))}
          </Row>
        </View>
      </Sheet>
    </>
  );
}

/** Over the field while the next message is to disappear: after how long, and what it does (`note`). */
export function VanishStrip({ seconds, note, onChoose, onClose }: { seconds: number; note: string; onChoose: (seconds: number) => void; onClose: () => void }) {
  const colors = useColors();
  return (
    <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="label" style={{ flex: 1 }}>
          {t('Disappears {time} after it is sent', { time: timerLabel(seconds) })}
        </Text>
        <TextButton title={t('Turn off disappearing')} onPress={onClose} />
      </Row>
      <Row wrap>
        {TIMERS.slice(1).map((timer) => (
          <Chip key={timer} label={timerLabel(timer)} selected={timer === seconds} onPress={() => onChoose(timer)} />
        ))}
      </Row>
      <Text variant="caption" tone="muted">
        {note}
      </Text>
    </View>
  );
}

/** The one message to disappear, as the screen keeps it: whether it is on, and after how long. */
export function useVanishOnce(): { on: boolean; seconds: number; toggle: () => void; choose: (seconds: number) => void; off: () => void; lasts: () => number } {
  const [on, setOn] = useState(false);
  const [seconds, setSeconds] = useState(3600);
  return {
    on,
    seconds,
    toggle: () => setOn((was) => !was),
    choose: setSeconds,
    off: () => setOn(false),
    // What the message sent now lasts, and the strip goes with it.
    lasts: () => {
      if (!on) return 0;
      setOn(false);
      return seconds;
    },
  };
}

/** Shows the chat anew when its next message goes (`at`, ms; 0 for none). */
export function useGoneAt(at: number): void {
  const [, shown] = useState(0);
  useEffect(() => {
    if (!at) return;
    const timer = setTimeout(() => shown((n) => n + 1), Math.min(Math.max(0, at - Date.now()) + 100, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [at]);
}

/** Asks whether to delete `count` messages from this phone, or for everyone (`everyone`, when it can; `said`, what that does). */
export function askDelete(count: number, here: () => void, everyone?: () => void, said?: string): void {
  const asked = plural(count, 'Delete this message? It cannot be brought back.', 'Delete these {n} messages? They cannot be brought back.');
  ask(count === 1 ? t('Delete message') : t('Delete messages'), said && everyone ? `${asked}\n\n${said}` : asked, [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('This phone'), onPress: here },
    ...(everyone ? [{ text: t('Everyone'), style: 'destructive' as const, onPress: everyone }] : []),
  ]);
}

/** A switch with what it does under it. */
export function SwitchLine({ title, on, note, onPress }: { title: string; on: boolean; note: string; onPress: () => void }) {
  return (
    <View style={{ gap: space.xs }}>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {title}
        </Text>
        <Toggle on={on} />
      </Pressable>
      <Text variant="caption" tone="muted">
        {note}
      </Text>
    </View>
  );
}

/** Those blocked, each with Unblock; nothing when there are none. */
export function BlockedList({ people, onUnblock }: { people: { key: string; name: string }[]; onUnblock: (key: string) => void }) {
  if (!people.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      {people.map((person) => (
        <Row key={person.key}>
          <Text style={{ flex: 1 }} numberOfLines={1}>
            {person.name}
          </Text>
          <TextButton title={t('Unblock')} onPress={() => onUnblock(person.key)} />
        </Row>
      ))}
    </View>
  );
}

/**
 * Checking a contact in person: whether they are, a button that opens this phone's code (`code`)
 * with what it holds (`about`), and the photo of theirs taken or chosen there, which `check` reads
 * and answers with what it found.
 */
export function CheckInPerson({ checked, code, about, check, onUncheck }: {
  checked: boolean;
  code: string;
  about: string;
  check: (text: string) => Promise<string> | string;
  onUncheck: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  async function read(from: 'camera' | 'photos') {
    try {
      const text = await readQrPhoto(from);
      if (text === null) return;
      setNote(text ? await check(text) : t('No QR code was found in the photo. Take it again closer, with all of the code in it.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <Row wrap>
        <Text variant="caption" tone={checked ? undefined : 'muted'} style={{ flex: 1 }}>
          {checked ? `✓ ${t('Checked in person')}` : t('Not checked in person yet.')}
        </Text>
        <Button
          title={t('Check in person')}
          kind="secondary"
          compact
          onPress={() => {
            setNote('');
            setOpen(true);
          }}
        />
      </Row>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('Check in person')}>
        <View style={{ gap: space.md }}>
          <Text variant="caption" tone="muted">
            {about}
          </Text>
          <View style={{ alignSelf: 'center' }}>
            <QrCode text={code} size={200} />
          </View>
          <Row wrap>
            {CAN_TAKE_PHOTOS ? <Button title={t('Take a photo of their code')} kind="secondary" compact onPress={() => void read('camera')} /> : null}
            <Button title={t('Choose a photo of their code')} kind="secondary" compact onPress={() => void read('photos')} />
            {checked ? <TextButton title={t('Take the mark off')} onPress={onUncheck} /> : null}
          </Row>
          {note ? (
            <Text variant="caption" tone="muted">
              {note}
            </Text>
          ) : null}
        </View>
      </Sheet>
    </>
  );
}
