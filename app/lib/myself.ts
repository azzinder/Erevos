import { device } from '../modules/erevos-device';
import { currentSpace } from '../lock/keys';
import { addNote, changeNote, isDue, isWaiting, loadNotes, markTold, newNoteId, removeNote, type Note, type NotesPlace } from '../lock/myself-data';

// Chat with myself and its reminders (app/myself.tsx, and Remind me on the home screen): the open
// space's notes (lock/myself-data.ts). On Android the phone itself tells a reminder at its time,
// with Erevos closed and the space locked (modules/erevos-device, Reminders.kt), in a notice that
// says only that a reminder came: nothing of the note leaves the space. Tapped, it opens Chat with
// myself after the password. Everywhere, a reminder whose time has come shows in the chat and on its
// row at the top of the chats until the chat is opened, so it is not missed where no notice came: on
// a computer, in the web app, with notices turned off, or in another space than the one opened.

/** The open space's notes. Hidden chats have none of their own yet. */
export const myselfPlace = (): NotesPlace => ({ holder: 'space', ...currentSpace() });

export { isDue, isWaiting, notesSummary } from '../lock/myself-data';
export type { Note };

const listeners = new Set<() => void>();

/** Calls `listener` after the notes change, here or on the Chat with myself screen. */
export function onNotesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function changed(): void {
  for (const listener of [...listeners]) listener();
}

/** Asks the phone to tell the reminders still to come, again: after a backup was put back, or on another phone. Each is kept by its id, so asking twice is the same. */
export function armReminders(notes: Note[], now = Date.now()): void {
  for (const note of notes) if (isWaiting(note, now)) device?.remind?.(note.id, note.due!);
}

export async function myNotes(): Promise<Note[]> {
  return loadNotes(myselfPlace());
}

/** Writes a note, with a photo, file or voice message, reminding at `due` when it is given. */
export async function writeNote(note: Omit<Note, 'id' | 'at'>): Promise<Note> {
  const kept = await addNote(myselfPlace(), { ...note, id: newNoteId(), at: Date.now() });
  if (kept.due !== undefined) device?.remind?.(kept.id, kept.due);
  changed();
  return kept;
}

/** Sets when a note reminds, or with null that it no longer does. */
export async function remindAt(id: string, due: number | null): Promise<Note | null> {
  const note = await changeNote(myselfPlace(), id, { due });
  if (due === null || !note) device?.forgetReminder?.(id);
  else device?.remind?.(id, due);
  changed();
  return note;
}

/** The reminders that came are seen: the chat was opened. */
export async function seenReminders(notes: Note[], now = Date.now()): Promise<void> {
  const due = notes.filter((note) => isDue(note, now)).map((note) => note.id);
  if (due.length === 0) return;
  await markTold(myselfPlace(), due);
  changed();
}

export async function deleteNote(id: string): Promise<void> {
  device?.forgetReminder?.(id);
  await removeNote(myselfPlace(), id);
  changed();
}
