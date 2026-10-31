// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirm } from '../lib/alert';
import { bytesSource, keepFile, MAX_FILE, type Source } from '../lib/attachments';
import { playVoice, useVoiceRecorder } from '../lib/audio';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { t } from '../lib/i18n';
import { laterLabel } from '../lib/later';
import { armReminders, deleteNote, isDue, isWaiting, myNotes, onNotesChanged, remindAt, seenReminders, writeNote, type Note, type NotesAt } from '../lib/myself';
import { appShown, onAppShown } from '../lib/receiver';
import { CAN_TAKE_PHOTOS, NoCameraError, pickPhoto, type PhotoQuality } from '../lib/pick-photo';
import { pickSource, TooLargeError } from '../lib/pick-file';
import { loadPhotoQuality, savePhotoQuality } from '../lib/photo-quality';
import { saveFile } from '../lib/save-file';
import { MAX_VOICE_MS, MIN_VOICE_MS, voiceDuration } from '../lib/voice';
import { cleanFileName, cleanMime, mimeOf, type FileKind, type FileMeta, type FileRef } from '../lock/attachment-files';
import { MAX_NOTE_TEXT } from '../lock/myself-data';
import { loadClip, saveClip } from '../lock/voice-clips';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { bubbleStyles } from '../theme/bubbles';
import { useStyles, useTheme } from '../theme/context';

import { Attachment, FileViewer, shownOf, useShownPhotos } from './attachment';
import { ComposerPanel, DraftComposer, IconButton, useDraft, type ComposerTile, type SendWay, type VoiceControl } from './composer';
import { useGlassBlur } from './glass';
import { BackIcon, BellIcon } from './icons';
import { KeyboardPaddedView } from './keyboard';
import { LaterPicker } from './later-picker';
import { LinkedText } from './linked-text';
import { MessageMenu, type MenuAction } from './message-menu';
import { MyselfFace } from './myself-face';
import { ThreadArrows, useThreadAway } from './thread-arrows';
import { Sheet, Text } from './ui';

// Chat with myself: notes, photos, files and voice messages that go to no one, kept encrypted in
// the space, or in a hidden place, on this phone only (lib/myself.ts, lock/myself-data.ts), and
// reminders. A note can remind at a time: chosen under "+", or by holding the send arrow, before it
// is written, or from its menu after. Its row is always at the top of the chats (app/index.tsx, and
// a hidden place's in app/chat.tsx), and Remind me beside New chat writes a reminder without opening it.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Above the first note of a day: Today, Yesterday, or its date.
function dayLabel(at: number): string {
  const d = new Date(at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return t('Today');
  if (d.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString()) return t('Yesterday');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A note in one line, for its menu. */
function noteLine(note: Note): string {
  if (note.text) return note.text.split('\n')[0];
  if (note.voice) return t('Voice message');
  return note.file?.name ?? '';
}

/** Back to the screen before, or home when the chat was opened first (from a reminder's notice). */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

type Picked = { name: string; mime: string; source: Source; w?: number; h?: number; close?: () => void };

/**
 * Chat with myself, the open space's (app/myself.tsx), or a hidden place's, `at`, within its chats
 * (app/chat.tsx), which goes back with `onBack` and is already clear of the keyboard.
 */
export function MyselfChat({ at, onBack }: { at?: NotesAt; onBack?: () => void }) {
  const styles = useStyles(makeStyles);
  const where = useRef(at);
  where.current = at;
  const { colors, look } = useTheme();
  const b = useMemo(() => bubbleStyles(look.bubbles, colors), [look.bubbles, colors]);
  const barBlur = useGlassBlur();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const { draft } = useDraft(() => '');
  const [said, setSaid] = useState('');
  const [failed, setFailed] = useState(false);
  const [attaching, setAttaching] = useState(false);
  // Choosing when the next note reminds, under "+", and when it does once chosen.
  const [choosing, setChoosing] = useState(false);
  const [nextDue, setNextDue] = useState<number | null>(null);
  // A kept note whose reminder is being chosen, in a sheet.
  const [remindFor, setRemindFor] = useState<Note | null>(null);
  const [menuFor, setMenuFor] = useState<Note | null>(null);
  const [viewing, setViewing] = useState<FileRef | null>(null);
  const [quality, setQuality] = useState<PhotoQuality>(90);
  const [playing, setPlaying] = useState<string | null>(null);
  const [played, setPlayed] = useState(0);
  const stopPlaying = useRef<(() => void) | null>(null);
  const [now, setNow] = useState(Date.now());
  const scroll = useRef<ScrollView>(null);
  const atEnd = useRef(true);
  const { away, onScroll: awayOnScroll } = useThreadAway();

  const say = (text: string, error = false) => {
    setSaid(text);
    setFailed(error);
  };

  // The notes, read again whenever they change; reminders still to come are asked of the phone
  // again, as after a backup was put back.
  useEffect(() => {
    let live = true;
    const load = () =>
      myNotes(where.current).then(
        (list) => {
          if (!live) return;
          setNotes(list);
          if (where.current?.arm !== false) armReminders(list);
        },
        (error) => live && say(t('Cannot read your notes. {error}', { error: errorText(error) }), true),
      );
    void load();
    const off = onNotesChanged(() => void load());
    return () => {
      live = false;
      off();
    };
  }, []);

  useEffect(() => {
    loadPhotoQuality().then(setQuality, () => undefined);
  }, []);

  // A reminder that comes while the chat shows, with Erevos on the screen, is seen here, its notice
  // with it; the next one's time is waited for. Back on the screen, what came meanwhile is seen.
  const [shown, setShown] = useState(appShown);
  useEffect(() => onAppShown(setShown), []);
  useEffect(() => {
    if (!notes) return;
    if (focused && shown) void seenReminders(notes, now, where.current).catch(() => undefined);
    const next = notes.filter((note) => isWaiting(note, now)).map((note) => note.due!);
    if (next.length === 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.min(...next) - Date.now() + 500, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [notes, now, focused, shown]);

  useEffect(() => () => stopPlaying.current?.(), []);

  async function send() {
    const text = draft.text().trim();
    if (!text) return;
    // Emptied at once, so a second press keeps nothing twice; not kept, the words go back.
    draft.set('');
    try {
      await writeNote({ text: text.slice(0, MAX_NOTE_TEXT), ...(nextDue !== null ? { due: nextDue } : {}) }, where.current);
      setNextDue(null);
      say(nextDue !== null ? t('Reminds you on {when}.', { when: laterLabel(nextDue) }) : '');
    } catch (error) {
      if (!draft.text().trim()) draft.set(text);
      say(t('Not kept. {reason}', { reason: errorText(error) }), true);
    }
  }

  // A photo or file, kept here in chunks sealed with its own key, as a chat keeps what it sent.
  async function keepPicked(kind: FileKind, get: () => Promise<Picked | null>) {
    let picked: Picked | null;
    try {
      picked = await get();
    } catch (error) {
      say(
        error instanceof TooLargeError
          ? t('Not kept. Files can be 100 MB at most.')
          : error instanceof NoCameraError
            ? error.message
            : t('Cannot open it. {error}', { error: errorText(error) }),
        true,
      );
      return;
    }
    if (!picked) return;
    const meta: Omit<FileMeta, 'size'> = { name: picked.name, mime: picked.mime, kind, ...(picked.w && picked.h ? { w: picked.w, h: picked.h } : {}) };
    try {
      if (picked.source.size > MAX_FILE) throw new TooLargeError();
      const file = await keepFile(picked.source, meta, (done, count) => {
        if (count > 1) {
          const percent = Math.floor((done / count) * 100);
          say(kind === 'photo' ? t('Keeping the photo, {percent}%', { percent }) : t('Keeping the file, {percent}%', { percent }));
        }
      });
      const text = draft.text().trim().slice(0, MAX_NOTE_TEXT);
      await writeNote({ text, file, ...(nextDue !== null ? { due: nextDue } : {}) }, where.current);
      draft.set('');
      setNextDue(null);
      say('');
    } catch (error) {
      say(error instanceof TooLargeError ? t('Not kept. Files can be 100 MB at most.') : t('Not kept. {reason}', { reason: errorText(error) }), true);
    } finally {
      picked.close?.();
    }
  }

  // What is picked under "+" opens once the panel has closed.
  function afterPanel(then: () => void) {
    setAttaching(false);
    setChoosing(false);
    then();
  }

  function keepPhoto(from: 'photos' | 'camera') {
    afterPanel(
      () =>
        void keepPicked('photo', async () => {
          const photo = await pickPhoto(from, quality);
          return photo && { name: photo.name, mime: photo.mime, source: bytesSource(photo.bytes), w: photo.w, h: photo.h };
        }),
    );
  }

  function keepFilePicked() {
    afterPanel(
      () =>
        void keepPicked('file', async () => {
          const picked = await pickSource(MAX_FILE);
          if (!picked) return null;
          const name = cleanFileName(picked.name);
          const mime = cleanMime(picked.mime);
          return { name, mime: mime === 'application/octet-stream' ? mimeOf(name) : mime, source: picked.source, close: picked.close };
        }),
    );
  }

  // The microphone: held, it records; let go, the voice message is kept as a note.
  const recorder = useVoiceRecorder();
  const [talking, setTalking] = useState(false);
  const holding = useRef(false);
  const recording = useRef<Promise<boolean> | null>(null);
  const longest = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startTalking() {
    holding.current = true;
    const started = recorder.start().then((ok) => {
      if (!ok) {
        say(t('Erevos may not use the microphone. Allow it in the phone settings to send voice messages.'), true);
        return false;
      }
      if (!holding.current) {
        void recorder.stop().catch(() => undefined);
        say(t('Hold to record, and let go to send.'));
        return false;
      }
      setTalking(true);
      longest.current = setTimeout(() => void stopTalking(), MAX_VOICE_MS);
      return true;
    });
    recording.current = started.catch((error) => {
      say(t('Cannot record. {error}', { error: errorText(error) }), true);
      return false;
    });
  }

  async function stopTalking(cancel = false) {
    holding.current = false;
    if (longest.current) clearTimeout(longest.current);
    longest.current = null;
    const started = recording.current;
    recording.current = null;
    if (!started || !(await started)) return;
    setTalking(false);
    try {
      const recorded = await recorder.stop();
      if (cancel) {
        say(t('Recording cancelled.'));
        return;
      }
      if (!recorded || recorded.ms < MIN_VOICE_MS) {
        say(t('Hold to record, and let go to send.'));
        return;
      }
      const voice = await saveClip(recorded.audio, recorded.ms);
      await writeNote({ text: '', voice, ...(nextDue !== null ? { due: nextDue } : {}) }, where.current);
      setNextDue(null);
      say('');
    } catch (error) {
      say(t('Not kept. {reason}', { reason: errorText(error) }), true);
    }
  }

  const voice: VoiceControl = { recording: talking, start: startTalking, stop: (cancel) => void stopTalking(cancel) };

  // Plays a voice message, or stops it if it is the one playing.
  async function play(note: Note) {
    if (!note.voice) return;
    stopPlaying.current?.();
    if (playing === note.id) return;
    try {
      const audio = await loadClip(note.voice);
      if (!audio) {
        say(t("This voice message's sound is gone."), true);
        return;
      }
      setPlaying(note.id);
      setPlayed(0);
      stopPlaying.current = playVoice(
        audio,
        () => {
          stopPlaying.current = null;
          setPlaying((current) => (current === note.id ? null : current));
        },
        setPlayed,
      );
    } catch (error) {
      say(t('Cannot play it. {error}', { error: errorText(error) }), true);
    }
  }

  async function saveViewed(choose: boolean) {
    if (!viewing) return;
    try {
      const where = await saveFile(viewing, choose);
      if (!where) return;
      setViewing(null);
      say(t('Saved in {where}. There it is outside Erevos, not sealed.', { where }));
    } catch (error) {
      setViewing(null);
      say(t('Not saved. {error}', { error: errorText(error) }), true);
    }
  }

  async function setReminder(note: Note, due: number | null) {
    setRemindFor(null);
    try {
      await remindAt(note.id, due, where.current);
      say(due === null ? t('No reminder.') : t('Reminds you on {when}.', { when: laterLabel(due) }));
    } catch (error) {
      say(t('Not saved. {error}', { error: errorText(error) }), true);
    }
  }

  async function remove(note: Note) {
    if (!(await confirm(t('Delete this note?'), t('It is deleted from this phone, with what it holds, and cannot be brought back.'), t('Delete')))) return;
    try {
      await deleteNote(note.id, where.current);
    } catch (error) {
      say(t('Not deleted. {reason}', { reason: errorText(error) }), true);
    }
  }

  function actionsOf(note: Note): MenuAction[] {
    const actions: MenuAction[] = [];
    if (CAN_COPY && note.text) {
      actions.push({
        title: t('Copy'),
        onPress: () => void copyText(note.text).then((ok) => say(ok ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'), !ok)),
      });
    }
    if (note.file) actions.push({ title: t('Open'), onPress: () => setViewing(note.file!) });
    if (isWaiting(note, now)) {
      actions.push({ title: t('Change the reminder'), onPress: () => setRemindFor(note) });
      actions.push({ title: t('No reminder'), onPress: () => void setReminder(note, null) });
    } else {
      actions.push({ title: t('Remind me'), onPress: () => setRemindFor(note) });
    }
    actions.push({ title: t('Delete'), danger: true, onPress: () => void remove(note) });
    return actions;
  }

  // The photos shown: the latest ones, and the one looked at on its own.
  const photoFiles = shownOf((notes ?? []).flatMap((note) => (note.file ? [note.file] : [])));
  if (viewing?.kind === 'photo' && !photoFiles.some((file) => file.id === viewing.id)) photoFiles.push(viewing);
  const photos = useShownPhotos(photoFiles, (error) => say(t('Cannot show the photo. {error}', { error: errorText(error) }), true));

  const tiles: ComposerTile[] = [{ key: 'photo', title: t('Photo'), icon: 'photo', onPress: () => keepPhoto('photos') }];
  if (CAN_TAKE_PHOTOS) tiles.push({ key: 'camera', title: t('Camera'), icon: 'camera', onPress: () => keepPhoto('camera') });
  tiles.push({ key: 'file', title: t('File'), icon: 'file', onPress: keepFilePicked });
  tiles.push({ key: 'remind', title: t('Remind me'), icon: 'later', onPress: () => setChoosing(true) });
  const panel: ReactNode = (
    <ComposerPanel
      tiles={tiles}
      quality={{
        value: quality,
        onChange: (next) => {
          setQuality(next);
          savePhotoQuality(next).catch(() => undefined);
        },
      }}
      foot={
        at
          ? t('Notes stay on this phone, encrypted in these hidden chats, and go to no one. Photos and files are not in backups.')
          : t('Notes stay on this phone, encrypted in this space, and go to no one. Photos and files are not in backups.')
      }
      page={
        choosing
          ? {
              title: t('Remind me'),
              onBack: () => setChoosing(false),
              children: (
                <LaterPicker
                  remind
                  onPick={(at) => {
                    setNextDue(at);
                    setChoosing(false);
                    setAttaching(false);
                  }}
                />
              ),
            }
          : null
      }
    />
  );
  // Held, the send arrow offers a reminder for what is typed: the time is chosen under "+".
  const sendWays: SendWay[] = [
    {
      key: 'remind',
      title: t('Remind me'),
      icon: 'later',
      onPress: () => {
        setAttaching(true);
        setChoosing(true);
      },
    },
  ];

  const list = notes ?? [];
  return (
    <Screen padded={!onBack} bottom={insets.bottom} style={styles.screen}>
      <View style={[styles.topBar, { marginTop: -insets.top, paddingTop: insets.top + 2 }, barBlur]}>
        <View style={styles.header}>
          <IconButton label={t('Back')} onPress={onBack ?? goBack}>
            <BackIcon color={colors.text} size={24} />
          </IconButton>
          <View style={styles.top}>
            <MyselfFace size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="heading" numberOfLines={1} style={styles.name}>
                {t('Chat with myself')}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {t('Only you · on this phone')}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => atEnd.current && scroll.current?.scrollToEnd({ animated: false })}
          onLayout={() => atEnd.current && scroll.current?.scrollToEnd({ animated: false })}
          onScroll={(event) => {
            const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
            atEnd.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
            awayOnScroll(event);
          }}
          scrollEventThrottle={100}
        >
          {notes !== null && list.length === 0 ? (
            <View style={styles.empty}>
              <MyselfFace size={64} />
              <Text tone="muted" style={styles.emptyText}>
                {t('Write here what you want to keep: notes, links, photos, files, voice messages. Only you see them. Under "+", or holding the send arrow, a note can remind you at a time.')}
              </Text>
            </View>
          ) : null}
          {list.map((note, i) => {
            const newDay = i === 0 || dayLabel(list[i - 1].at) !== dayLabel(note.at);
            const ink = b.mineText;
            const photo = note.file?.kind === 'photo';
            const due = note.due !== undefined && note.due <= now;
            return (
              <View key={note.id}>
                {newDay ? (
                  <Text variant="caption" tone="muted" style={styles.day}>
                    {dayLabel(note.at)}
                  </Text>
                ) : null}
                <Pressable
                  onLongPress={() => setMenuFor(note)}
                  onPress={() => (note.voice ? void play(note) : note.file ? setViewing(note.file) : undefined)}
                  accessibilityHint={t('Hold for more')}
                  style={[styles.bubble, b.mine, photo && styles.photoBubble, isDue(note, now) && styles.lit]}
                >
                  {note.file ? <Attachment file={note.file} uri={photos[note.file.id]} ink={ink} /> : null}
                  {note.voice ? (
                    <Text style={ink}>
                      {playing === note.id
                        ? `■  ${t('Playing, {time}', { time: voiceDuration(played) })}`
                        : `▶  ${t('Voice message')} · ${voiceDuration(note.voice.ms)}`}
                    </Text>
                  ) : null}
                  {note.text ? (
                    <Text style={ink}>
                      <LinkedText text={note.text} />
                    </Text>
                  ) : null}
                  {note.due !== undefined ? (
                    <View style={styles.reminder}>
                      <BellIcon color={(ink.color as string | undefined) ?? colors.text} size={14} />
                      <Text style={[ink, styles.reminderText]}>
                        {due ? t('Reminded you on {when}.', { when: laterLabel(note.due) }) : t('Reminds you on {when}.', { when: laterLabel(note.due) })}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[ink, styles.time]}>{clock(note.at)}</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
        <ThreadArrows
          start={away.start}
          end={away.end}
          onStart={() => scroll.current?.scrollTo({ y: 0, animated: true })}
          onEnd={() => {
            atEnd.current = true;
            scroll.current?.scrollToEnd({ animated: true });
          }}
        />
      </View>
      {said ? (
        <Text variant="caption" color={failed ? colors.danger : undefined} tone={failed ? undefined : 'muted'} style={styles.said}>
          {said}
        </Text>
      ) : null}
      <DraftComposer
        draft={draft}
        placeholder={t('Write a note to yourself')}
        maxLength={MAX_NOTE_TEXT}
        onSend={() => void send()}
        sendWays={sendWays}
        voice={voice}
        later={nextDue !== null ? { line: t('Reminds you on {when}.', { when: laterLabel(nextDue) }), onCancel: () => setNextDue(null) } : null}
        panel={panel}
        panelOpen={attaching}
        onPanel={(open) => {
          setAttaching(open);
          if (!open) setChoosing(false);
        }}
      />
      <MessageMenu visible={menuFor !== null} onClose={() => setMenuFor(null)} line={menuFor ? noteLine(menuFor) : ''} actions={menuFor ? actionsOf(menuFor) : []} />
      <FileViewer file={viewing} uri={viewing ? photos[viewing.id] : undefined} onSave={(choose) => void saveViewed(choose)} onClose={() => setViewing(null)} />
      <RemindSheet note={remindFor} onPick={(note, at) => void setReminder(note, at)} onClose={() => setRemindFor(null)} />
    </Screen>
  );
}

/** Clear of the keyboard on a screen of its own; within the hidden chats, they keep it so. */
function Screen({ padded, bottom, style, children }: { padded: boolean; bottom: number; style: StyleProp<ViewStyle>; children: ReactNode }) {
  return padded ? (
    <KeyboardPaddedView bottom={bottom} style={style}>
      {children}
    </KeyboardPaddedView>
  ) : (
    <View style={style}>{children}</View>
  );
}

/** Choosing when a kept note reminds. */
function RemindSheet({ note, onPick, onClose }: { note: Note | null; onPick: (note: Note, at: number) => void; onClose: () => void }) {
  return (
    <Sheet visible={note !== null} onClose={onClose} title={t('Remind me')}>
      {note ? <LaterPicker remind onPick={(at) => onPick(note, at)} /> : null}
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
    },
    // The bar at the top, across the screen and behind the status bar, on the bars' glass.
    topBar: {
      backgroundColor: colors.sheet,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 60,
    },
    top: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      paddingRight: space.md,
    },
    name: {
      fontSize: 17,
      lineHeight: 22,
    },
    list: {
      gap: 3,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      flexGrow: 1,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.md,
      padding: space.xl,
    },
    emptyText: {
      textAlign: 'center',
      maxWidth: 360,
    },
    day: {
      alignSelf: 'center',
      paddingVertical: space.sm,
    },
    bubble: {
      alignSelf: 'flex-end',
      maxWidth: '82%',
      paddingTop: space.sm,
      paddingBottom: 6,
      paddingHorizontal: space.md,
      gap: 2,
      marginBottom: 3,
    },
    // A photo fills its bubble, with a thin edge.
    photoBubble: {
      paddingTop: 4,
      paddingHorizontal: 4,
    },
    // A reminder that came, until the chat is opened.
    lit: {
      borderWidth: 2,
      borderColor: colors.warning,
    },
    reminder: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
      paddingHorizontal: space.sm,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: withAlpha('#000000', 0.12),
      alignSelf: 'flex-start',
    },
    reminderText: {
      fontSize: 13,
      fontWeight: '600',
    },
    time: {
      fontSize: 11,
      opacity: 0.7,
      alignSelf: 'flex-end',
    },
    said: {
      paddingHorizontal: space.lg,
    },
  });
