// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A note another app on the phone asks to add to Chat with myself, with a link that opens Erevos:
// erevos://myself?note=<words>&due=<time, in milliseconds since 1970>&every=<1m, 2w, …>. Fasouli sends
// one for a payment that is coming, so its reminder comes from Erevos too, again each time for a
// scheduled one (lib/note-repeat.ts). The link opens only after the
// password, so the note goes to the space the owner opens, and Erevos asks before keeping it
// (app/myself.tsx): any app can send such a link, and nothing tells which one did. Nothing goes
// back to the app that asked.
// Self-contained on purpose, so it can run under plain Node for checks.

import { everyOfText, everyText, type Every } from './note-repeat';

/** The most words a note from another app can have. */
export const MAX_LINK_NOTE = 1000;
/** How far ahead its reminder can be: a year, as for Erevos's own notes (lib/later.ts, LATEST). */
const LATEST = 365 * 24 * 60 * 60_000;
/** A reminder this close, or past, is left out: it would come before the owner says yes. */
const SOONEST = 60_000;

export type LinkNote = { text: string; due?: number; every?: Every };

/** The note a link's details ask for (linkParts in lib/open-link.ts): null when they ask for none,
 *  or for one with no words. Signs that are not words (controls, marks that turn the text round)
 *  go; a reminder that is not a time to come, within a year, is left out and the note kept, and
 *  `every` counts only with a reminder. */
export function linkNote(params: Record<string, string | string[] | undefined>, now = Date.now()): LinkNote | null {
  const raw = params.note;
  if (typeof raw !== 'string') return null;
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_LINK_NOTE)
    .trim();
  if (!text) return null;
  const dueText = typeof params.due === 'string' ? params.due.trim() : '';
  const due = /^\d{1,15}$/.test(dueText) ? Number(dueText) : NaN;
  if (!(Number.isFinite(due) && due >= now + SOONEST && due <= now + LATEST)) return { text };
  const every = everyOfText(params.every);
  return every ? { text, due, every } : { text, due };
}

/** The same request a second time (the link opened again, or the screen drawn again) is asked once. */
export function linkNoteKey(note: LinkNote): string {
  return `${note.due ?? ''}\n${note.every ? everyText(note.every) : ''}\n${note.text}`;
}
