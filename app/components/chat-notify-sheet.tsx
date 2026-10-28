import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { plural, t } from '../lib/i18n';
import { ALWAYS, mutedNow, type ChatNotify } from '../lock/chat-notify';
import { callAudio } from '../modules/erevos-call';
import { Chip, Row, Sheet, Text } from './ui';

// A chat's or a group's own notifications (lock/chat-notify.ts), from its details: muted for 8
// hours, a week or for good, and its messages' sound and its calls' ringtone, the app's, none, or
// one chosen in Android's own picker. In hidden chats only muting: a sound of its own would tell
// which chat it is. Only on Android, the one that tells of messages and rings in the background.

/** Whether chats can have notifications of their own on this phone. */
export const canNotifyChats = Platform.OS === 'android' && !!callAudio?.tellMessages;

// And sounds of their own: a build with the sound picker.
const canPick = canNotifyChats && !!callAudio?.pickSound;

const HOUR = 3600_000;
const MUTES = [8 * HOUR, 7 * 24 * HOUR];

const pad = (n: number) => String(n).padStart(2, '0');

// Until when a chat is muted: the time today, or the date too.
function untilLabel(until: number): string {
  const d = new Date(until);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString() ? time : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
}

const muteLabel = (ms: number) => (ms % (24 * HOUR) === 0 ? plural(ms / (7 * 24 * HOUR), '{n} week', '{n} weeks') : plural(ms / HOUR, '{n} hour', '{n} hours'));

/** What the Notifications row in a chat's details says: muted, and until when, or that it has sounds of its own; empty for neither. */
export function notifyValue(notify: ChatNotify | null | undefined, hidden: boolean, now = Date.now()): string {
  if (mutedNow(notify, now)) return notify!.until! >= ALWAYS ? t('Muted') : t('Muted until {when}', { when: untilLabel(notify!.until!) });
  if (canPick && !hidden && (notify?.sound !== undefined || notify?.ring !== undefined)) return t('Sounds of its own');
  return '';
}

export function ChatNotifySheet({ visible, onClose, title, notify, hidden, onChange }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  notify: ChatNotify | null;
  /** In hidden chats: muting only. */
  hidden: boolean;
  /** Keeps what was chosen; null for the app's own settings again. */
  onChange: (next: ChatNotify | null) => Promise<void>;
}) {
  const [names, setNames] = useState<{ sound: string; ring: string }>({ sound: '', ring: '' });
  const [note, setNote] = useState('');
  // The chat's notifications as they show, and the ones chosen last while they are being kept: the
  // chips show those at once, and a tap made meanwhile, or a sound picked after, builds on them,
  // not on what showed when it was tapped.
  const shown = useRef(notify);
  shown.current = notify;
  const latest = useRef<ChatNotify | null>(null);
  const saving = useRef(0);
  const [chosen, setChosen] = useState<{ notify: ChatNotify | null } | null>(null);
  const current = chosen ? chosen.notify : notify;
  const sounds = canPick && !hidden;
  const sound = current?.sound;
  const ring = current?.ring;

  useEffect(() => {
    if (!visible || !sounds) return;
    let live = true;
    const nameOf = (uri: string | undefined) => (uri ? (callAudio?.soundName?.(uri) ?? Promise.resolve('')).catch(() => '') : Promise.resolve(''));
    void Promise.all([nameOf(sound), nameOf(ring)]).then(([s, r]) => live && setNames({ sound: s, ring: r }));
    return () => {
      live = false;
    };
  }, [visible, sounds, sound, ring]);

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  // `patch`: what changes; a field given as undefined is as the app has it again.
  const change = (patch: ChatNotify) => {
    const next: ChatNotify = { ...(saving.current ? latest.current : shown.current), ...patch };
    const kept: ChatNotify = {
      ...(next.until ? { until: next.until } : {}),
      ...(next.sound !== undefined ? { sound: next.sound } : {}),
      ...(next.ring !== undefined ? { ring: next.ring } : {}),
    };
    const value = Object.keys(kept).length ? kept : null;
    latest.current = value;
    saving.current += 1;
    setChosen({ notify: value });
    onChange(value)
      .catch((error) => setNote(error instanceof Error ? error.message : String(error)))
      .finally(() => {
        saving.current -= 1;
        if (!saving.current) setChosen(null);
      });
  };

  const pick = async (kind: 'message' | 'ring') => {
    const now = kind === 'message' ? sound : ring;
    try {
      const picked = await callAudio!.pickSound!(kind, now ?? null);
      // Gone back: nothing changes.
      if (picked === null) return;
      // The picker's Default is the app's.
      const own = picked === '' ? undefined : picked;
      change(kind === 'message' ? { sound: own } : { ring: own });
    } catch {
      setNote(t("This phone's sound picker did not open."));
    }
  };

  const now = Date.now();
  const until = mutedNow(current, now) ? current!.until! : 0;
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Text variant="overline" tone="muted">
        {t('Muted')}
      </Text>
      <Text variant="caption" tone="muted">
        {t('Its messages make no sound and show no notice; the list still shows them. Calls still ring.')}
      </Text>
      <Row wrap>
        <Chip label={t('Off')} selected={!until} onPress={() => change({ until: undefined })} />
        {MUTES.map((ms) => (
          <Chip key={ms} label={muteLabel(ms)} selected={false} onPress={() => change({ until: Date.now() + ms })} />
        ))}
        <Chip label={t('Always')} selected={until >= ALWAYS} onPress={() => change({ until: ALWAYS })} />
      </Row>
      {until && until < ALWAYS ? (
        <Text variant="caption" tone="muted">
          {t('Muted until {when}', { when: untilLabel(until) })}
        </Text>
      ) : null}
      {sounds ? (
        <>
          <View style={{ height: 4 }} />
          <Text variant="overline" tone="muted">
            {t('Message sound')}
          </Text>
          <Row wrap>
            <Chip label={t('Same as the app')} selected={sound === undefined} onPress={() => change({ sound: undefined })} />
            <Chip label={t('Without sound')} selected={sound === ''} onPress={() => change({ sound: '' })} />
            <Chip label={sound ? names.sound || t('Chosen sound') : t('Choose…')} selected={!!sound} onPress={() => void pick('message')} />
          </Row>
          <View style={{ height: 4 }} />
          <Text variant="overline" tone="muted">
            {t('Ringtone')}
          </Text>
          <Row wrap>
            <Chip label={t("The phone's own")} selected={ring === undefined} onPress={() => change({ ring: undefined })} />
            <Chip label={t('Without sound')} selected={ring === ''} onPress={() => change({ ring: '' })} />
            <Chip label={ring ? names.ring || t('Chosen sound') : t('Choose…')} selected={!!ring} onPress={() => void pick('ring')} />
          </Row>
          <Text variant="caption" tone="muted">
            {t('Kept on this phone only. On silent the phone plays none of them.')}
          </Text>
        </>
      ) : hidden ? (
        <Text variant="caption" tone="muted">
          {t('Hidden chats sound as the app does: a sound of its own would tell which chat it is.')}
        </Text>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Sheet>
  );
}
