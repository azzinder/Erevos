// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

/**
 * The message field once dictated words come (components/dictate-sheet.tsx): after what was typed,
 * with one space between, and no longer than the field takes.
 */
export function withDictated(typed: string, words: string, maxLength: number): string {
  const before = typed.trimEnd();
  const heard = words.trim();
  if (!heard) return typed;
  return (before ? `${before} ${heard}` : heard).slice(0, maxLength);
}
