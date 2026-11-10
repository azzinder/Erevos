// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { randomBytes, toHex } from '../lib/crypto';
import { t } from '../lib/i18n';
import { isEvery, nextDue, type Every } from '../lib/note-repeat';

import { deleteChunks, isFileRef, type FileRef } from './attachment-files';
import { sealedFile, type Holder } from './sealed-file';
import { deleteClip, isVoiceRef, type VoiceRef } from './voice-clips';
import { checkedLook, type Look } from '../theme/look';

// Chat with myself (app/myself.tsx, lib/myself.ts): notes, photos, files and voice messages that go
// to no one, and reminders, each space's own. Kept in FILE, one sealed value for each space and each
// of its hidden places (sealed-file.ts), so nothing tells whether one holds any, nor how many. A
// photo's or file's chunks, and a voice message's sound, are each in files of their own, sealed
// with a key only the note holds (attachment-files.ts, voice-clips.ts), as a chat's are. The notes
// and their voice messages go with the rest of the phone into a backup (backup.ts), sealed as they
// are, photos and files not, as with chats. A space's notes also go to the account's linked devices
// (lib/devices.ts), through their conversations with the phone and with each other, as nothing else
// of the space does: each change carries a stamp (`v`), and of two the later stays; a note deleted
// leaves its stamp (`gone`), so a change from before does not bring it back. A hidden place's notes
// go nowhere, as no device is linked to one.

/**
 * A note: when it was written, its words, and a photo, a file or a voice message with them. `due`:
 * when it reminds; `told` once that time came while the space was open, or it was read after.
 * `every`: it reminds again, so once seen it moves to its next time instead of being told
 * (lib/note-repeat.ts).
 */
export type Note = {
  id: string;
  at: number;
  text: string;
  file?: FileRef;
  voice?: VoiceRef;
  due?: number;
  every?: Every;
  told?: true;
  /** The folder it is in (Chat with myself's folders), by its name; none: only under All. */
  folder?: string;
  /** When it was last changed, by this device's count (`last`); one from before has none, and counts as written (`at`). */
  v?: number;
  /** It was last changed here, not by another of the account's devices: so it goes to them. */
  o?: true;
};

/** Whose notes: a space's or one of its hidden places', as its key opens it. */
export type NotesPlace = { holder: Holder; space: number; key: Uint8Array };

/** A note deleted, when (`v`, as a note's), and whether here (`o`). */
type Gone = { v: number; o?: true };

/** `last`: the latest stamp known here, kept so each change here is stamped after all of them. */
// `look`: the chat's own look here (theme/look.ts), on this device only; missing while it takes the space's.
// `folders`: the folders made here, in their order, empty ones too; a note's folder that is not
// among them (one that came from another device) shows after them.
type NotesData = { notes: Note[]; gone?: Record<string, Gone>; last?: number; look?: Look; folders?: string[] };

export const FILE = 'erevos-myself';
const BLOCK = 16 * 1024;

/** The most notes a space, or a hidden place, keeps, and the longest a note's words are. */
export const MAX_NOTES = 5000;
export const MAX_NOTE_TEXT = 8000;
/** The most notes remembered as deleted, the latest. */
export const MAX_GONE = 2000;
/** The most folders, and the longest a folder's name is. */
export const MAX_FOLDERS = 50;
export const MAX_FOLDER_NAME = 40;

/** A folder's name as kept: one line, trimmed, at most MAX_FOLDER_NAME characters; '' for none. */
export function folderName(name: unknown): string {
  if (typeof name !== 'string') return '';
  // Control and direction marks out, as in a contact's name.
  const line = name.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ');
  return [...line.replace(/\s+/g, ' ').trim()].slice(0, MAX_FOLDER_NAME).join('').trim();
}

/** The folders of `notes` with those kept (`kept`): the kept in their order, then the others, by name. */
export function foldersOf(notes: readonly Note[], kept: readonly string[] = []): string[] {
  const out = [...new Set(kept.map(folderName).filter(Boolean))];
  const others = [...new Set(notes.map((note) => note.folder ?? '').filter((name) => name && !out.includes(name)))].sort((a, b) => a.localeCompare(b));
  return [...out, ...others].slice(0, MAX_FOLDERS);
}

const ID = /^[0-9a-f]{16}$/;
export const newNoteId = () => toHex(randomBytes(8));

export class TooManyNotesError extends Error {
  constructor() {
    super(t('You have {n} notes, the most there can be. Delete some to make room.', { n: MAX_NOTES }));
  }
}

const time = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function isNote(value: unknown): value is Note {
  const v = value as Partial<Note> | null;
  return (
    typeof v?.id === 'string' &&
    ID.test(v.id) &&
    time(v.at) &&
    typeof v.text === 'string' &&
    v.text.length <= MAX_NOTE_TEXT &&
    (v.file === undefined || isFileRef(v.file)) &&
    (v.voice === undefined || isVoiceRef(v.voice)) &&
    (v.due === undefined || time(v.due)) &&
    (v.every === undefined || isEvery(v.every)) &&
    (v.told === undefined || v.told === true) &&
    (v.folder === undefined || (typeof v.folder === 'string' && folderName(v.folder) === v.folder && v.folder !== '')) &&
    (v.v === undefined || time(v.v)) &&
    (v.o === undefined || v.o === true)
  );
}

/** Only a note's own fields, those it has. */
function clean({ id, at, text, file, voice, due, every, told, folder, v, o }: Note): Note {
  return {
    id,
    at,
    text,
    ...(file ? { file } : {}),
    ...(voice ? { voice } : {}),
    ...(due !== undefined ? { due } : {}),
    ...(due !== undefined && every ? { every: { u: every.u, n: every.n } } : {}),
    ...(told ? { told } : {}),
    ...(folder ? { folder } : {}),
    ...(v !== undefined ? { v } : {}),
    ...(o ? { o } : {}),
  };
}

function checkedGone(value: unknown): Record<string, Gone> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const gone = Object.entries(value as Record<string, unknown>).flatMap(([id, g]): [string, Gone][] => {
    const v = g as Partial<Gone> | null;
    return ID.test(id) && time(v?.v) ? [[id, { v: v.v, ...(v.o === true ? { o: true as const } : {}) }]] : [];
  });
  return gone.length > 0 ? latestGone(Object.fromEntries(gone)) : undefined;
}

// The latest MAX_GONE of the notes remembered as deleted.
function latestGone(gone: Record<string, Gone>): Record<string, Gone> {
  const all = Object.entries(gone);
  return all.length <= MAX_GONE ? gone : Object.fromEntries(all.sort((a, b) => b[1].v - a[1].v).slice(0, MAX_GONE));
}

function checked(value: unknown): NotesData {
  const v = value as { notes?: unknown; gone?: unknown; last?: unknown; look?: unknown; folders?: unknown } | null;
  const notes = Array.isArray(v?.notes) ? v.notes.filter(isNote) : [];
  const gone = checkedGone(v?.gone);
  const look = v?.look && typeof v.look === 'object' && !Array.isArray(v.look) ? checkedLook(v.look) : null;
  const folders = Array.isArray(v?.folders) ? [...new Set(v.folders.map(folderName).filter(Boolean))].slice(0, MAX_FOLDERS) : [];
  return {
    notes: notes.slice(-MAX_NOTES).map(clean),
    ...(gone ? { gone } : {}),
    ...(time(v?.last) ? { last: v.last } : {}),
    ...(look ? { look } : {}),
    ...(folders.length > 0 ? { folders } : {}),
  };
}

/** When a note was last changed: its stamp, or, one from before stamps, when it was written. */
export const stampOf = (note: Note): number => note.v ?? note.at;

// The stamp of a change made here now: after every one known here, whatever the clock says.
const stampNow = (data: NotesData): number => Math.max(Date.now(), (data.last ?? 0) + 1);

const store = sealedFile({ name: FILE, empty: { notes: [] } as NotesData, checked, block: BLOCK });

/** Whether a note's reminder has come and was not seen yet: Chat with myself was not opened since. */
export const isDue = (note: Note, now = Date.now()): boolean => note.due !== undefined && !note.told && note.due <= now;

/** Whether a note still waits to remind. */
export const isWaiting = (note: Note, now = Date.now()): boolean => note.due !== undefined && !note.told && note.due > now;

/** What the home screen's row shows: the last note, the reminders that came, and when the next comes. */
export function notesSummary(notes: Note[], now = Date.now()): { last: Note | null; due: Note[]; next: number | null } {
  const waiting = notes.filter((note) => isWaiting(note, now)).map((note) => note.due!);
  return { last: notes[notes.length - 1] ?? null, due: notes.filter((note) => isDue(note, now)), next: waiting.length > 0 ? Math.min(...waiting) : null };
}

// Changes to a place's notes run one after another, each on what the one before left.
const changes = new Map<string, Promise<unknown>>();

function change<T>({ holder, space }: NotesPlace, run: () => Promise<T>): Promise<T> {
  const name = `${holder}/${space}`;
  const next = (changes.get(name) ?? Promise.resolve()).catch(() => undefined).then(run);
  changes.set(name, next);
  return next;
}

/** A place's notes, the oldest first. */
export async function loadNotes({ holder, space, key }: NotesPlace): Promise<Note[]> {
  return (await store.load(holder, space, key)).notes;
}

/** The chat's own look in a place, or null while it takes the space's. */
export async function loadNotesLook({ holder, space, key }: NotesPlace): Promise<Look | null> {
  return (await store.load(holder, space, key)).look ?? null;
}

/** Gives the chat a look of its own in a place; null gives it the space's again. */
export function saveNotesLook(place: NotesPlace, look: Look | null): Promise<void> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const { look: _was, ...data } = await store.load(holder, space, key);
    // Not a change for the account's other devices: each keeps its own.
    await store.save(holder, space, key, look ? { ...data, look: checkedLook(look) } : data);
  });
}

/** Keeps a new note, last. Throws TooManyNotesError when the place has its most. */
export function addNote(place: NotesPlace, note: Note): Promise<Note> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const data = await store.load(holder, space, key);
    const { notes } = data;
    if (notes.length >= MAX_NOTES) throw new TooManyNotesError();
    const v = stampNow(data);
    const kept = clean({ ...note, text: note.text.slice(0, MAX_NOTE_TEXT), folder: folderName(note.folder) || undefined, v, o: true });
    await store.save(holder, space, key, { ...data, notes: [...notes, kept], last: v });
    written(place);
    return kept;
  });
}

/** Changes what a note reminds at (null: no longer), marks it told, or puts it in a folder (null: in
 *  none). The note, or null when it is gone. */
export function changeNote(place: NotesPlace, id: string, { due, told, folder }: { due?: number | null; told?: boolean; folder?: string | null }): Promise<Note | null> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const data = await store.load(holder, space, key);
    const { notes } = data;
    const at = notes.findIndex((note) => note.id === id);
    if (at < 0) return null;
    const v = stampNow(data);
    const note: Note = { ...notes[at], v, o: true };
    if (due === null) {
      delete note.due;
      delete note.every;
    }
    else if (due !== undefined) note.due = due;
    if (due !== undefined) delete note.told;
    if (told === true) note.told = true;
    else if (told === false) delete note.told;
    if (folder !== undefined) {
      const name = folderName(folder);
      if (name) note.folder = name;
      else delete note.folder;
    }
    const next = [...notes];
    next[at] = clean(note);
    await store.save(holder, space, key, { ...data, notes: next, last: v });
    written(place);
    return next[at];
  });
}

/** Marks the notes told, at once; those that come again move to their next time instead, and are returned. */
export function markTold(place: NotesPlace, ids: string[]): Promise<Note[]> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const data = await store.load(holder, space, key);
    const { notes } = data;
    const marked = new Set(ids.filter((id) => notes.some((note) => note.id === id && !note.told)));
    if (marked.size === 0) return [];
    // Each its own stamp, so the devices told stop between two only.
    let v = stampNow(data) - 1;
    const now = Date.now();
    const next = notes.map((note): Note => {
      if (!marked.has(note.id)) return note;
      // One that comes again moves to its next time, waiting again.
      if (note.every && note.due !== undefined) return { ...note, due: nextDue(note.due, note.every, now), v: ++v, o: true };
      return { ...note, told: true, v: ++v, o: true };
    });
    await store.save(holder, space, key, { ...data, notes: next, last: v });
    written(place);
    return next.filter((note) => marked.has(note.id) && !note.told);
  });
}

/** Deletes a note, and its photo, file or voice message. The note, or null when it was gone. */
export function removeNote(place: NotesPlace, id: string): Promise<Note | null> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const data = await store.load(holder, space, key);
    const { notes } = data;
    const gone = notes.find((note) => note.id === id);
    if (!gone) return null;
    const v = stampNow(data);
    await store.save(holder, space, key, { ...data, notes: notes.filter((note) => note.id !== id), gone: latestGone({ ...data.gone, [id]: { v, o: true } }), last: v });
    written(place);
    if (gone.file) await deleteChunks(gone.file.id, gone.file.count).catch(() => undefined);
    if (gone.voice) await deleteClip(gone.voice.id).catch(() => undefined);
    return gone;
  });
}

/** A place's folders: those made here, in their order, then those only its notes name. */
export async function loadFolders({ holder, space, key }: NotesPlace): Promise<string[]> {
  const data = await store.load(holder, space, key);
  return foldersOf(data.notes, data.folders);
}

/** Makes a folder, last; its name as kept, or '' when it has none. Throws when there are MAX_FOLDERS. */
export function addFolder(place: NotesPlace, name: string): Promise<string> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const data = await store.load(holder, space, key);
    const kept = folderName(name);
    if (!kept) return '';
    const all = foldersOf(data.notes, data.folders);
    if (all.includes(kept)) return kept;
    if (all.length >= MAX_FOLDERS) throw new Error(t('You have {n} folders, the most there can be.', { n: MAX_FOLDERS }));
    // Not a change for the other devices: a folder goes to them with the first note in it.
    await store.save(holder, space, key, { ...data, folders: [...all, kept] });
    return kept;
  });
}

/**
 * Renames the folder `from` (`to`), or, with `to` null, removes it: its notes stay, in no folder.
 * Each note it held changes, for the account's other devices too. Renamed onto another folder's
 * name, the two are one.
 */
export function changeFolder(place: NotesPlace, from: string, to: string | null): Promise<void> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const data = await store.load(holder, space, key);
    const name = to === null ? '' : folderName(to);
    if (to !== null && (!name || name === from)) return;
    const all = foldersOf(data.notes, data.folders);
    const folders = name ? [...new Set(all.map((f) => (f === from ? name : f)))] : all.filter((f) => f !== from);
    let v = stampNow(data) - 1;
    let moved = false;
    const notes = data.notes.map((note): Note => {
      if (note.folder !== from) return note;
      moved = true;
      const { folder: _folder, ...rest } = note;
      return clean({ ...rest, ...(name ? { folder: name } : {}), v: ++v, o: true });
    });
    await store.save(holder, space, key, { ...data, notes, folders, ...(moved ? { last: v } : {}) });
    if (moved) written(place);
  });
}

// ---- With the account's linked devices (lib/devices.ts) ----

const writers = new Set<(place: NotesPlace) => void>();
const comers = new Set<(place: NotesPlace, changed: Note[], gone: string[]) => void>();

/** Calls `listener` after a change made here to a place's notes, for it to go to the account's other devices. */
export function onNotesWritten(listener: (place: NotesPlace) => void): () => void {
  writers.add(listener);
  return () => void writers.delete(listener);
}

/** Calls `listener` after notes came from another of the account's devices: those that came or changed, and those deleted. */
export function onNotesCame(listener: (place: NotesPlace, changed: Note[], gone: string[]) => void): () => void {
  comers.add(listener);
  return () => void comers.delete(listener);
}

function written(place: NotesPlace): void {
  for (const listener of [...writers]) listener(place);
}

function tellCame(place: NotesPlace, changed: Note[], gone: string[]): void {
  for (const listener of [...comers]) listener(place, changed, gone);
}

/** What changed of a place's notes, for another device: notes as they are, and those deleted, with when. */
export type NotesChanges = { notes: Note[]; gone: { id: string; v: number }[] };

/**
 * What of a place's notes goes to a device told up to the stamp `since`: with `all`, every note and
 * every one deleted (a device not told any yet); else what was changed here after it. The oldest
 * change first.
 */
export async function notesSince({ holder, space, key }: NotesPlace, since: number, all: boolean): Promise<NotesChanges> {
  const data = await store.load(holder, space, key);
  const newer = (v: number, o: boolean | undefined) => v > since && (all || o === true);
  const notes = data.notes.filter((note) => newer(stampOf(note), note.o)).sort((a, b) => stampOf(a) - stampOf(b));
  const gone = Object.entries(data.gone ?? {})
    .filter(([, g]) => newer(g.v, g.o))
    .map(([id, g]) => ({ id, v: g.v }))
    .sort((a, b) => a.v - b.v);
  return { notes, gone };
}

/** A note as another device says it: its fields, stamped (`v`), and how to make its photo, file or voice message here, asked only for one not kept yet. */
export type NoteCame = { note: Omit<Note, 'file' | 'voice' | 'o'> & { v: number }; make: () => Promise<Pick<Note, 'file' | 'voice'>> };

/**
 * Takes what another device said of a place's notes: of each note and each deletion, the later
 * change stays. A note kept here takes its words, reminder and stamp, its photo, file or voice
 * message staying as kept; one not kept is made here, unless deleted here since. Returns what came
 * or changed, and the ids of those deleted here now.
 */
/**
 * The folders made here (`kept`) once another device's changes moved notes out of some (`left`: each
 * with the folders they went to, '' for none): one emptied so goes, renamed on that device or deleted
 * there; when all its notes went to one folder not made here, that one takes its place.
 */
export function leftFolders(kept: readonly string[], notes: readonly Note[], left: ReadonlyMap<string, ReadonlySet<string>>): string[] {
  const out: string[] = [];
  for (const name of kept) {
    const went = left.get(name);
    if (!went || notes.some((note) => note.folder === name)) out.push(name);
    else if (went.size === 1) {
      const [to] = went;
      if (to && !kept.includes(to)) out.push(to);
    }
  }
  return [...new Set(out)];
}

export function mergeNotes(place: NotesPlace, came: NoteCame[], deleted: { id: string; v: number }[]): Promise<{ changed: Note[]; gone: string[] }> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const data = await store.load(holder, space, key);
    let notes = [...data.notes];
    const gone = { ...data.gone };
    let last = data.last ?? 0;
    const changed: Note[] = [];
    const removed: Note[] = [];
    // The folders notes left, by another device's change, and where they went.
    const left = new Map<string, Set<string>>();
    for (const { id, v } of deleted) {
      last = Math.max(last, v);
      if ((gone[id]?.v ?? -1) >= v) continue;
      gone[id] = { v };
      const kept = notes.find((note) => note.id === id);
      if (kept && stampOf(kept) < v) {
        notes = notes.filter((note) => note !== kept);
        removed.push(kept);
      }
    }
    for (const { note, make } of came) {
      last = Math.max(last, note.v);
      if ((gone[note.id]?.v ?? -1) >= note.v) continue;
      const at = notes.findIndex((n) => n.id === note.id);
      const kept = at >= 0 ? notes[at] : null;
      if (kept && stampOf(kept) >= note.v) continue;
      const words = { text: note.text.slice(0, MAX_NOTE_TEXT), due: note.due, every: note.every, told: note.told, folder: folderName(note.folder) || undefined, v: note.v };
      if (kept) {
        if (kept.folder && kept.folder !== words.folder) left.set(kept.folder, (left.get(kept.folder) ?? new Set()).add(words.folder ?? ''));
        const { o: _o, ...rest } = kept;
        const next = clean({ ...rest, ...words });
        notes[at] = next;
        changed.push(next);
        continue;
      }
      if (notes.length >= MAX_NOTES) continue;
      const made = clean({ id: note.id, at: note.at, ...words, ...(await make()) } as Note);
      // In its place by when it was written.
      const after = notes.findIndex((n) => n.at > made.at);
      notes = after < 0 ? [...notes, made] : [...notes.slice(0, after), made, ...notes.slice(after)];
      changed.push(made);
    }
    if (changed.length === 0 && removed.length === 0 && last === (data.last ?? 0) && JSON.stringify(gone) === JSON.stringify(data.gone ?? {})) return { changed, gone: [] };
    const kept = latestGone(gone);
    const folders = leftFolders(data.folders ?? [], notes, left);
    await store.save(holder, space, key, {
      notes,
      ...(Object.keys(kept).length > 0 ? { gone: kept } : {}),
      last,
      ...(data.look ? { look: data.look } : {}),
      ...(folders.length > 0 ? { folders } : {}),
    });
    for (const note of removed) {
      if (note.file && !note.file.from) await deleteChunks(note.file.id, note.file.count).catch(() => undefined);
      if (note.voice) await deleteClip(note.voice.id).catch(() => undefined);
    }
    const ids = removed.map((note) => note.id);
    if (changed.length > 0 || ids.length > 0) tellCame(place, changed, ids);
    return { changed, gone: ids };
  });
}

/** A note's photo or file, taken from the relay (`taken`) where it waited (`ids`): kept as the note's, unless it changed meanwhile. Whether it was. */
export function setNoteFile(place: NotesPlace, id: string, ids: string, taken: FileRef): Promise<boolean> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const data = await store.load(holder, space, key);
    const at = data.notes.findIndex((note) => note.id === id && note.file?.from?.ids === ids);
    if (at < 0) return false;
    const notes = [...data.notes];
    notes[at] = clean({ ...notes[at], file: taken });
    await store.save(holder, space, key, { ...data, notes });
    tellCame(place, [notes[at]], []);
    return true;
  });
}
