// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useMemo, useState } from 'react';
import { Image, Pressable, View, type LayoutChangeEvent } from 'react-native';

import { fileSize } from '../lib/attachments';
import { shownLine } from '../lib/call-lines';
import { toBase64 } from '../lib/crypto';
import { plural, t } from '../lib/i18n';
import type { MatrixFile, MatrixMessage } from '../lib/matrix';
import { pollOver, pollShown } from '../lib/matrix-parts';
import { matrixFile, matrixFileKept } from '../lib/matrix-store';
import { saveBytes } from '../lib/save-file';
import { radius, space, withAlpha } from '../theme/colors';
import { softBubble, textSized } from '../theme/bubbles';
import { useColors, useTheme } from '../theme/context';

import { OpenPhoto } from './attachment';
import { VoiceClip } from './matrix-voice';
import { PlaceCard, PreviewCard, Quote } from './message-parts';
import { PollCard } from './poll';
import { chosenStyle } from './select-bar';
import { STICKER_SIZE } from './stickers';
import { Button, Row, Text } from './ui';

// A message in a Matrix chat (app/matrix-chat.tsx): its bubble with what it answers, its words, photo,
// file or voice message, when it was written and changed, whether its key's sender is not known for
// sure (Not verified, lib/matrix.ts openMegolm), and the reactions to it under it. A photo
// or file is fetched only when asked for, so the homeserver does not learn which were looked at
// merely by scrolling; a voice message is fetched when played. A sticker (m.sticker) is fetched
// so too, and shows as a picture of its own, without a frame. While messages are chosen
// (components/select-bar.tsx), a tap chooses one or takes it out, and one chosen is washed over.

/** A message in one line, for its menu, the strip over the field and the quote of an answer. */
export function lineOf(message: MatrixMessage): string {
  if (message.deleted) return t('Message deleted');
  if (message.locked) return t('Locked message');
  if (message.sticker) return message.file && message.file.name !== 'Sticker' ? t('Sticker: {name}', { name: message.file.name }) : t('Sticker');
  if (message.file) return message.file.voice ? t('Voice message') : message.file.name;
  if (message.poll) return `📊 ${message.poll.q}`;
  if (message.place) return `📍 ${t('Location')}`;
  return shownLine(message.text).trim().split('\n')[0] || t('Message');
}

/** The message an answer is to, as the answer quotes it. */
export type Answered = { name: string; line: string; onPress: () => void };

export function MatrixBubble({ message, me, sender, answered, names, onVote, onThread, lit, onReact, onMenu, onLayout, mark, chosen, onChoose }: {
  message: MatrixMessage;
  /** Our Matrix ID, to see which reactions are ours. */
  me: string;
  /** Who wrote it, for a message that is not ours. */
  sender: string;
  /** The message it answers, or null when that is older than what is here. */
  answered?: Answered | null;
  /** A member's name by their Matrix ID, for who voted. */
  names?: (who: string) => string;
  /** An option of its poll was tapped: chooses it, or takes the choice back. Not given once the poll is over. */
  onVote?: (option: number) => void;
  /** Its thread's first message: opens the thread. */
  onThread?: () => void;
  /** Lit a moment, as the pinned bar and an answer's quote go to it. */
  lit?: boolean;
  /** A reaction under it was tapped: reacts the same, or takes ours back. */
  onReact: (emoji: string) => void;
  /** Held down: its menu. Not given for a message that is gone or a call's line. */
  onMenu?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Of ours, how far it went: ✓ taken by the homeserver, ✓✓✓ read by every other member. */
  mark?: string;
  /** It is among the messages chosen. */
  chosen?: boolean;
  /** While messages are chosen: tapped or held, chooses it or takes it out. */
  onChoose?: () => void;
}) {
  const { colors, look } = useTheme();
  const mine = message.sender === me;
  // The words in the chat's text size (theme/look.ts).
  const words = textSized(look.textSize, 16);
  const when = new Date(message.ts).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const status = message.state === 'sending' ? t('Sending…') : message.state === 'failed' ? t('Not sent.') : [when, message.edited ? t('Edited') : '', message.unverified ? t('Not verified') : '', mark ?? ''].filter(Boolean).join('  ·  ');
  const side = mine ? 'flex-end' : 'flex-start';
  const shownPoll = message.poll && !message.deleted ? pollShown(message.poll) : null;
  const ended = message.poll ? pollOver(message.poll) : false;
  // While messages are chosen, holding it chooses it too.
  const hold = onChoose ?? onMenu;
  return (
    // Across the thread, to wash it over when chosen.
    <View onLayout={onLayout} style={chosen ? chosenStyle(colors) : undefined}>
      <View style={{ alignSelf: side, maxWidth: '85%', gap: 4 }}>
        <Pressable
          onPress={onChoose}
          onLongPress={hold}
          disabled={!hold}
          // One with buttons in it (Play, Save) stays apart from them for a screen reader.
          accessible={!message.file}
          accessibilityHint={onMenu && !onChoose ? t('Hold for more') : undefined}
          accessibilityState={onChoose ? { selected: !!chosen } : undefined}
          style={[{ alignSelf: side, padding: space.sm + 2, gap: 2 }, message.sticker && !message.deleted ? null : softBubble(look.bubbles, colors, mine), lit && { backgroundColor: withAlpha(colors.primary, 0.3) }]}
        >
          {!mine ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {sender}
            </Text>
          ) : null}
          {message.replyTo ? answered ? <Quote name={answered.name} line={answered.line} onPress={answered.onPress} /> : <Missing /> : null}
          {message.deleted ? (
            <Text tone="muted" style={{ fontStyle: 'italic' }}>
              {t('Message deleted')}
            </Text>
          ) : message.locked ? (
            <Text tone="muted">{t('Locked: the key for this message has not come to this device.')}</Text>
          ) : message.file ? (
            message.sticker ? (
              <StickerPart file={message.file} />
            ) : message.file.voice ? (
              <VoicePart file={message.file} />
            ) : (
              <FilePart file={message.file} onMenu={hold} />
            )
          ) : message.call ? (
            <Text>{shownLine(message.text)}</Text>
          ) : shownPoll ? (
            <View style={{ gap: space.xs }}>
              <PollCard
                poll={shownPoll.poll}
                voters={shownPoll.votes.map((vote) => ({ name: names ? names(vote.who) : vote.who, chose: vote.chose }))}
                mine={shownPoll.votes.find((vote) => vote.who === me)?.chose ?? []}
                onChoose={ended || message.state ? undefined : onVote}
              />
              {ended ? (
                <Text variant="caption" tone="muted">
                  {t('Poll ended')}
                </Text>
              ) : null}
            </View>
          ) : message.place ? (
            <PlaceCard place={message.place} />
          ) : (
            // Not selectable: holding the words opens the menu, which can copy them.
            <>
              <Text style={words}>{message.text}</Text>
              {message.preview ? <PreviewCard preview={message.preview} /> : null}
            </>
          )}
          {onThread && message.threadCount ? (
            <Pressable onPress={onThread} accessibilityRole="button" hitSlop={6}>
              <Text variant="caption" color={colors.accentText}>
                {plural(message.threadCount, '{n} answer in the thread', '{n} answers in the thread')}
              </Text>
            </Pressable>
          ) : null}
          <Text variant="caption" tone="faint">
            {status}
          </Text>
        </Pressable>
        {message.reactions ? <ReactionChips reactions={message.reactions} me={me} mine={mine} onReact={onReact} /> : null}
      </View>
    </View>
  );
}

/** What an answer shows when the message it answers is not on this phone (in a Matrix chat, older than the ones fetched so far). */
export function Missing() {
  const colors = useColors();
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: space.sm, backgroundColor: withAlpha(colors.text, 0.07) }}>
      <Text variant="caption" tone="muted" style={{ fontStyle: 'italic' }}>
        {t('A message from before')}
      </Text>
    </View>
  );
}

// The reactions to a message, each emoji once with how many chose it; ours stands out, and
// tapping one reacts the same, or takes ours back.
export function ReactionChips({ reactions, me, mine, onReact }: { reactions: Record<string, string[]>; me: string; mine: boolean; onReact: (emoji: string) => void }) {
  const colors = useColors();
  const chosen = Object.entries(reactions).filter(([, who]) => who.length > 0);
  if (chosen.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      {chosen.map(([emoji, who]) => {
        const ours = who.includes(me);
        return (
          <Pressable
            key={emoji}
            onPress={() => onReact(emoji)}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityLabel={`${emoji} ${who.length}`}
            accessibilityHint={ours ? t('Take back {emoji}', { emoji }) : t('React with {emoji}', { emoji })}
            accessibilityState={{ selected: ours }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radius.pill,
              backgroundColor: ours ? withAlpha(colors.primary, 0.22) : colors.surface,
              borderWidth: 1,
              borderColor: ours ? colors.primary : withAlpha(colors.border, 0.8),
            }}
          >
            <Text style={{ fontSize: 15, lineHeight: 20 }}>{emoji}</Text>
            <Text variant="caption" tone="muted">
              {who.length}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// A photo or file in a message: fetched only when asked for, a photo then shown (a tap opens it on the
// whole screen), any file saved.
function FilePart({ file, onMenu }: { file: MatrixFile; onMenu?: () => void }) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const fetchable = !!(file.encrypted || file.url);

  async function get(): Promise<Uint8Array | null> {
    if (bytes) return bytes;
    setBusy(true);
    setNote('');
    try {
      const got = await matrixFile(file);
      setBytes(got);
      return got;
    } catch (error) {
      setNote(error instanceof Error ? error.message : t('The file could not be fetched.'));
      return null;
    } finally {
      setBusy(false);
    }
  }

  // True once it is done, saved or not; false if the owner went back (a photo shown on the whole screen then stays).
  async function save(choose = false): Promise<boolean> {
    const got = await get();
    if (!got) return false;
    try {
      if (!(await saveBytes(file.name, file.mime, got, choose))) return false;
      setNote(t('Saved.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    return true;
  }

  const uri = useMemo(() => (file.kind === 'image' && bytes ? `data:${file.mime.startsWith('image/') ? file.mime : 'image/jpeg'};base64,${toBase64(bytes)}` : null), [file.kind, file.mime, bytes]);
  const ratio = file.w && file.h ? file.w / file.h : 4 / 3;
  return (
    <View style={{ gap: space.xs }}>
      {uri && bytes ? (
        <OpenPhoto uri={uri} name={file.name} size={bytes.length} w={file.w} h={file.h} style={{ width: 240, height: 240 / ratio, borderRadius: radius.sm }} onSave={save} onMenu={onMenu} />
      ) : (
        <Text numberOfLines={2}>
          {file.name}
          {file.size ? ` · ${fileSize(file.size)}` : ''}
        </Text>
      )}
      {fetchable ? (
        <Row>
          {file.kind === 'image' && !bytes ? <Button title={t('Show photo')} compact disabled={busy} onPress={() => void get()} /> : null}
          <Button title={t('Save')} kind="secondary" compact disabled={busy} onPress={() => void save()} />
        </Row>
      ) : null}
      {busy ? <Text variant="caption" tone="muted">{t('Fetching…')}</Text> : null}
      {note ? <Text variant="caption" tone="muted">{note}</Text> : null}
    </View>
  );
}

// A sticker: its picture fetched when asked for, as a photo's, or at once when it was before (one
// we sent, or looked at); then shown at a sticker's size, as wide and high as it says.
function StickerPart({ file }: { file: MatrixFile }) {
  const [bytes, setBytes] = useState<Uint8Array | null>(() => matrixFileKept(file));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const uri = useMemo(() => (bytes ? `data:${file.mime.startsWith('image/') ? file.mime : 'image/png'};base64,${toBase64(bytes)}` : null), [file.mime, bytes]);

  async function show() {
    setBusy(true);
    setNote('');
    try {
      setBytes(await matrixFile(file));
    } catch (error) {
      setNote(error instanceof Error ? error.message : t('The file could not be fetched.'));
    } finally {
      setBusy(false);
    }
  }

  const ratio = file.w && file.h ? file.w / file.h : 1;
  const named = file.name !== 'Sticker' ? file.name : '';
  if (uri) {
    return (
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={{ width: ratio >= 1 ? STICKER_SIZE : STICKER_SIZE * ratio, height: ratio >= 1 ? STICKER_SIZE / ratio : STICKER_SIZE }}
        accessibilityLabel={named || t('Sticker')}
      />
    );
  }
  return (
    <View style={{ gap: space.xs }}>
      <Text numberOfLines={2}>{named ? t('Sticker: {name}', { name: named }) : t('Sticker')}</Text>
      {file.encrypted || file.url ? (
        <Row>
          <Button title={t('Show sticker')} compact disabled={busy} onPress={() => void show()} />
        </Row>
      ) : null}
      {busy ? <Text variant="caption" tone="muted">{t('Fetching…')}</Text> : null}
      {note ? <Text variant="caption" tone="muted">{note}</Text> : null}
    </View>
  );
}

// A voice message: played by components/matrix-voice.tsx, its sound fetched when played.
function VoicePart({ file }: { file: MatrixFile }) {
  return <VoiceClip type={file.mime} duration={file.duration} waveform={file.waveform} fetch={() => matrixFile(file)} />;
}
