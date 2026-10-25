import { randomBytes, toHex } from '../lib/crypto';
import { t } from '../lib/i18n';

import { deleteChunks, isFileRef, type FileRef } from './attachment-files';
import { sealedFile, type Holder } from './sealed-file';
import { deleteClip, isVoiceRef, type VoiceRef } from './voice-clips';

// Chat with myself (app/myself.tsx, lib/myself.ts): notes, photos, files and voice messages that go
// to no one, and reminders, each space's own. Kept in FILE, one sealed value for each space and each
// of its hidden places (sealed-file.ts), so nothing tells whether one holds any, nor how many. A
// photo's or file's chunks, and a voice message's sound, are each in files of their own, sealed
// with a key only the note holds (attachment-files.ts, voice-clips.ts), as a chat's are. The notes
// and their voice messages go with the rest of the phone into a backup (backup.ts), sealed as they
// are, photos and files not, as with chats; none is passed on to the account's other devices.

/**
 * A note: when it was written, its words, and a photo, a file or a voice message with them. `due`:
 * when it reminds; `told` once that time came while the space was open, or it was read after.
 */
export type Note = { id: string; at: number; text: string; file?: FileRef; voice?: VoiceRef; due?: number; told?: true };

/** Whose notes: a space's or one of its hidden places', as its key opens it. */
export type NotesPlace = { holder: Holder; space: number; key: Uint8Array };

type NotesData = { notes: Note[] };

export const FILE = 'erevos-myself';
const BLOCK = 16 * 1024;

/** The most notes a space, or a hidden place, keeps, and the longest a note's words are. */
export const MAX_NOTES = 5000;
export const MAX_NOTE_TEXT = 8000;

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
    (v.told === undefined || v.told === true)
  );
}

/** Only a note's own fields, those it has. */
function clean({ id, at, text, file, voice, due, told }: Note): Note {
  return { id, at, text, ...(file ? { file } : {}), ...(voice ? { voice } : {}), ...(due !== undefined ? { due } : {}), ...(told ? { told } : {}) };
}

function checked(value: unknown): NotesData {
  const v = value as { notes?: unknown } | null;
  const notes = Array.isArray(v?.notes) ? v.notes.filter(isNote) : [];
  return { notes: notes.slice(-MAX_NOTES).map(clean) };
}

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

/** Keeps a new note, last. Throws TooManyNotesError when the place has its most. */
export function addNote(place: NotesPlace, note: Note): Promise<Note> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const { notes } = await store.load(holder, space, key);
    if (notes.length >= MAX_NOTES) throw new TooManyNotesError();
    const kept = clean({ ...note, text: note.text.slice(0, MAX_NOTE_TEXT) });
    await store.save(holder, space, key, { notes: [...notes, kept] });
    return kept;
  });
}

/** Changes what a note reminds at (null: no longer), or marks it told. The note, or null when it is gone. */
export function changeNote(place: NotesPlace, id: string, { due, told }: { due?: number | null; told?: boolean }): Promise<Note | null> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const { notes } = await store.load(holder, space, key);
    const at = notes.findIndex((note) => note.id === id);
    if (at < 0) return null;
    const note = { ...notes[at] };
    if (due === null) delete note.due;
    else if (due !== undefined) note.due = due;
    if (due !== undefined) delete note.told;
    if (told === true) note.told = true;
    else if (told === false) delete note.told;
    const next = [...notes];
    next[at] = clean(note);
    await store.save(holder, space, key, { notes: next });
    return next[at];
  });
}

/** Marks the notes told, at once. */
export function markTold(place: NotesPlace, ids: string[]): Promise<void> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const { notes } = await store.load(holder, space, key);
    const marked = new Set(ids);
    if (!notes.some((note) => marked.has(note.id) && !note.told)) return;
    await store.save(holder, space, key, { notes: notes.map((note) => (marked.has(note.id) ? { ...note, told: true as const } : note)) });
  });
}

/** Deletes a note, and its photo, file or voice message. The note, or null when it was gone. */
export function removeNote(place: NotesPlace, id: string): Promise<Note | null> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const { notes } = await store.load(holder, space, key);
    const gone = notes.find((note) => note.id === id);
    if (!gone) return null;
    await store.save(holder, space, key, { notes: notes.filter((note) => note.id !== id) });
    if (gone.file) await deleteChunks(gone.file.id, gone.file.count).catch(() => undefined);
    if (gone.voice) await deleteClip(gone.voice.id).catch(() => undefined);
    return gone;
  });
}
