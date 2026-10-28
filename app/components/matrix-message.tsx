import { useState } from 'react';
import { Image, Pressable, View, type LayoutChangeEvent } from 'react-native';

import { fileSize } from '../lib/attachments';
import { shownLine } from '../lib/call-lines';
import { toBase64 } from '../lib/crypto';
import { t } from '../lib/i18n';
import type { MatrixFile, MatrixMessage } from '../lib/matrix';
import { matrixFile } from '../lib/matrix-store';
import { saveBytes } from '../lib/save-file';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

import { VoiceClip } from './matrix-voice';
import { Quote } from './message-parts';
import { Button, Row, Text } from './ui';

// A message in a Matrix chat (app/matrix-chat.tsx): its bubble with what it answers, its words, photo,
// file or voice message, when it was written and changed, and the reactions to it under it. A photo
// or file is fetched only when asked for, so the homeserver does not learn which were looked at
// merely by scrolling; a voice message is fetched when played.

/** A message in one line, for its menu, the strip over the field and the quote of an answer. */
export function lineOf(message: MatrixMessage): string {
  if (message.deleted) return t('Message deleted');
  if (message.locked) return t('Locked message');
  if (message.file) return message.file.voice ? t('Voice message') : message.file.name;
  return shownLine(message.text).trim().split('\n')[0] || t('Message');
}

/** The message an answer is to, as the answer quotes it. */
export type Answered = { name: string; line: string; onPress: () => void };

export function MatrixBubble({ message, me, sender, answered, onReact, onMenu, onLayout }: {
  message: MatrixMessage;
  /** Our Matrix ID, to see which reactions are ours. */
  me: string;
  /** Who wrote it, for a message that is not ours. */
  sender: string;
  /** The message it answers, or null when that is older than what is here. */
  answered?: Answered | null;
  /** A reaction under it was tapped: reacts the same, or takes ours back. */
  onReact: (emoji: string) => void;
  /** Held down: its menu. Not given for a message that is gone or a call's line. */
  onMenu?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const colors = useColors();
  const mine = message.sender === me;
  const when = new Date(message.ts).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const status = message.state === 'sending' ? t('Sending…') : message.state === 'failed' ? t('Not sent.') : [when, message.edited ? t('Edited') : ''].filter(Boolean).join('  ·  ');
  const side = mine ? 'flex-end' : 'flex-start';
  return (
    <View onLayout={onLayout} style={{ alignSelf: side, maxWidth: '85%', gap: 4 }}>
      <Pressable
        onLongPress={onMenu}
        disabled={!onMenu}
        // One with buttons in it (Play, Save) stays apart from them for a screen reader.
        accessible={!message.file}
        accessibilityHint={onMenu ? t('Hold for more') : undefined}
        style={{ alignSelf: side, padding: space.sm + 2, borderRadius: radius.md, backgroundColor: mine ? colors.primarySoft : colors.surfaceAlt, gap: 2 }}
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
          message.file.voice ? (
            <VoicePart file={message.file} />
          ) : (
            <FilePart file={message.file} />
          )
        ) : message.call ? (
          <Text>{shownLine(message.text)}</Text>
        ) : (
          // Not selectable: holding the words opens the menu, which can copy them.
          <Text>{message.text}</Text>
        )}
        <Text variant="caption" tone="faint">
          {status}
        </Text>
      </Pressable>
      {message.reactions ? <ReactionChips reactions={message.reactions} me={me} mine={mine} onReact={onReact} /> : null}
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
function ReactionChips({ reactions, me, mine, onReact }: { reactions: Record<string, string[]>; me: string; mine: boolean; onReact: (emoji: string) => void }) {
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

// A photo or file in a message: fetched only when asked for, a photo then shown, any file saved.
function FilePart({ file }: { file: MatrixFile }) {
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

  async function save() {
    const got = await get();
    if (!got) return;
    try {
      if (await saveBytes(file.name, file.mime, got)) setNote(t('Saved.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  const photo = file.kind === 'image' && bytes;
  const ratio = file.w && file.h ? file.w / file.h : 4 / 3;
  return (
    <View style={{ gap: space.xs }}>
      {photo ? (
        <Image
          source={{ uri: `data:${file.mime.startsWith('image/') ? file.mime : 'image/jpeg'};base64,${toBase64(bytes)}` }}
          style={{ width: 240, height: 240 / ratio, borderRadius: radius.sm }}
          resizeMode="contain"
          accessibilityLabel={file.name}
        />
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

// A voice message: played by components/matrix-voice.tsx, its sound fetched when played.
function VoicePart({ file }: { file: MatrixFile }) {
  return <VoiceClip type={file.mime} duration={file.duration} fetch={() => matrixFile(file)} />;
}
