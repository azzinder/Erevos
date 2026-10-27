import { useEffect, useRef, useState } from 'react';

import { FileTooLargeError, fileSize } from '../lib/attachments';
import { canImport } from '../lib/core';
import { plural, t } from '../lib/i18n';
import { exportFiles, ImportStoppedError, keepExportFiles, oneChatOf, openExport, senders, SOURCE_LABELS, toArchived, viberOwner, type OpenedExport } from '../lib/imports';
import { pickSource, TooLargeError, type PickedSource } from '../lib/pick-file';
import type { Archive } from '../lock/archive';
import { Button, Card, Chip, Field, Input, Row, Text } from './ui';

// Bringing in a chat exported from Telegram, WhatsApp or Viber (lib/imports.ts): the file picked and
// read, who the phone's owner was in it, and the chat kept sealed in the space (lock/archive.ts).
// From the Imported chats screen (app/imported.tsx) every chat of an export comes in; from a
// chat's details (app/chat.tsx), one, to go on with that contact (`one`).

// What the phone can hold in memory to read at once: a file that is not a zip is read whole. A zip,
// with its photos and videos, is read a piece at a time, from a copy in the app's cache.
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_ZIP = 8 * 1000 * 1000 * 1000;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Found = { opened: OpenedExport; picked: PickedSource; people: string[] };

/**
 * The steps of bringing in an export into `archive`: `pick` a file, then `keep` what it holds, or
 * `cancel`. `say` hears what to tell; `onKept` the ids of the chats kept. With `one`, only the
 * export's chat chosen (`chosen`) comes in.
 */
export function useImportFlow(archive: Archive | null, say: (text: string) => void, onKept: (ids: string[]) => void | Promise<void>, one = false) {
  const [found, setFound] = useState<Found | null>(null);
  const [chosen, setChosen] = useState(0);
  const [progress, setProgress] = useState('');
  const [me, setMe] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  // Cancel pressed while the files come in: they stop, and none of them is kept.
  const stop = useRef(false);

  // The picked file's copy goes once it is kept, or let go of.
  useEffect(() => () => found?.picked.close(), [found]);

  async function pick() {
    if (!canImport()) {
      say(t('This build cannot read exports yet. Rebuild the app.'));
      return;
    }
    say('');
    setBusy(true);
    let picked: PickedSource | null = null;
    try {
      picked = await pickSource(MAX_ZIP);
      if (!picked) return;
      const opened = await openExport(picked.name, picked.source, MAX_BYTES);
      const read = opened.chats;
      if (read.every((chat) => chat.messages.length === 0)) {
        say(t('There are no messages in that file.'));
        picked.close();
        return;
      }
      const people = senders(read);
      setFound({ opened, picked, people });
      picked = null;
      // In an export of many chats, the one who wrote the most is almost surely its owner; a
      // Viber chat's own messages are the only ones with no name of their own.
      setMe(read.length > 1 ? (people[0] ?? '') : read[0].source === 'viber' ? viberOwner() : '');
      // Of many, the longest is the likeliest to go on here.
      const longest = read.reduce((best, chat, i) => (chat.messages.length > read[best].messages.length ? i : best), 0);
      setChosen(one ? longest : 0);
      setTitle(read[one ? longest : 0].title);
    } catch (error) {
      picked?.close();
      say(
        error instanceof TooLargeError || error instanceof FileTooLargeError
          ? t('That file is too large. A chat with its photos and videos comes in as a .zip.')
          : t('Not imported. {reason}', { reason: errorText(error) }),
      );
    } finally {
      setBusy(false);
    }
  }

  function choose(index: number) {
    if (!found) return;
    setChosen(index);
    setTitle(found.opened.chats[index].title);
  }

  async function keep() {
    if (!archive || !found) return;
    setBusy(true);
    try {
      const opened = one ? oneChatOf(found.opened, chosen) : found.opened;
      const files = exportFiles(opened);
      stop.current = false;
      if (files.count > 0) setProgress(t('Bringing in the files: {done} of {count}, {percent}%', { done: 0, count: files.count, percent: 0 }));
      const withFiles = await keepExportFiles(
        opened,
        (kept) => setProgress(t('Bringing in the files: {done} of {count}, {percent}%', kept)),
        () => stop.current,
      );
      const named = withFiles.length === 1 ? [{ ...withFiles[0], title: title.trim() || withFiles[0].title }] : withFiles;
      const ids = await archive.add(toArchived(named, me));
      await onKept(ids);
      const count = named.reduce((sum, chat) => sum + chat.messages.length, 0);
      say(
        t('Imported {chats} with {messages}.', {
          chats: plural(named.length, 'one chat', '{n} chats'),
          messages: plural(count, '{n} message', '{n} messages'),
        }) +
          (files.count > 0 ? ' ' + plural(files.count, 'One photo or file came with them.', '{n} photos and files came with them.') : '') +
          (files.tooLarge > 0 ? ' ' + plural(files.tooLarge, 'One file larger than 1 GB stayed behind.', '{n} files larger than 1 GB stayed behind.') : '') +
          ' ' +
          t('Delete the export file from the phone yourself: Erevos keeps its own sealed copy.'),
      );
      setFound(null);
    } catch (error) {
      if (error instanceof ImportStoppedError) {
        say(error.message);
        setFound(null);
      } else say(t('Not kept. {reason}', { reason: errorText(error) }));
    } finally {
      setProgress('');
      setBusy(false);
    }
  }

  function cancel() {
    if (busy) stop.current = true;
    else setFound(null);
  }

  return { found, chosen, choose, me, setMe, title, setTitle, busy, progress, pick, keep, cancel, one };
}

export type ImportFlow = ReturnType<typeof useImportFlow>;

/** What a picked export holds, who the owner was in it, its name, and Keep. */
export function FoundExport({ flow }: { flow: ImportFlow }) {
  const { found, one, chosen } = flow;
  if (!found) return null;
  const { chats } = found.opened;
  const kept = one ? [chats[chosen]] : chats;
  const count = kept.reduce((sum, chat) => sum + chat.messages.length, 0);
  return (
    <Card>
      <Text variant="bodyStrong">
        {kept.length === 1
          ? `${SOURCE_LABELS[kept[0].source]}: ${plural(count, '{n} message', '{n} messages')}`
          : `${SOURCE_LABELS[kept[0].source]}: ${plural(kept.length, '{n} chat', '{n} chats')}, ${plural(count, '{n} message', '{n} messages')}`}
      </Text>
      {one && chats.length > 1 ? (
        <>
          <Text variant="caption" tone="muted">
            {t('The file has {n} chats. Which one goes on here?', { n: chats.length })}
          </Text>
          <Row wrap>
            {chats.map((chat, i) => (
              <Chip key={i} label={chat.title || SOURCE_LABELS[chat.source]} selected={i === chosen} onPress={() => flow.choose(i)} />
            ))}
          </Row>
        </>
      ) : null}
      <FoundFiles opened={one ? oneChatOf(found.opened, chosen) : found.opened} />
      {kept.length === 1 ? (
        <Field label={t('Name of the chat')}>
          <Input value={flow.title} onChangeText={flow.setTitle} placeholder={t('Name')} maxLength={80} />
        </Field>
      ) : null}
      <Text variant="caption" tone="muted">
        {t('Which one is you? Your messages then show on the right.')}
      </Text>
      <Row wrap>
        {found.people.slice(0, 8).map((person) => (
          <Chip key={person} label={person} selected={flow.me === person} onPress={() => flow.setMe(person)} />
        ))}
        <Chip label={t('None of them')} selected={flow.me === ''} onPress={() => flow.setMe('')} />
      </Row>
      <Row wrap>
        <Button title={t('Keep')} compact loading={flow.busy} onPress={() => void flow.keep()} />
        <Button title={t('Cancel')} kind="secondary" compact onPress={flow.cancel} />
      </Row>
      {flow.progress ? <Text variant="caption">{flow.progress}</Text> : null}
    </Card>
  );
}

// What of the chats' photos and files the picked export holds, and what stays behind.
function FoundFiles({ opened }: { opened: OpenedExport }) {
  const files = exportFiles(opened);
  const named = opened.chats.reduce((sum, chat) => sum + chat.messages.reduce((n, m) => n + m.attachments.length, 0), 0);
  if (named === 0) return null;
  return (
    <Text variant="caption" tone="muted">
      {files.count > 0
        ? plural(files.count, 'With one photo or file, {size}, kept sealed here too.', 'With {n} photos and files, {size} in all, kept sealed here too.', {
            size: fileSize(files.bytes),
          })
        : t('The photos and files are not in this file, so only their kind shows. A .zip exported with media brings them too.')}
      {files.tooLarge > 0 ? ' ' + plural(files.tooLarge, 'One file larger than 1 GB stays behind.', '{n} files larger than 1 GB stay behind.') : ''}
    </Text>
  );
}
