// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { child, children, el, textOf, type XmlElement } from './xmpp-xml';

// What can be done with a message already in an XMPP chat (lib/xmpp.ts), as Conversations, Dino,
// Gajim, Monal and Kaidan do it: react to it (XEP-0444), answer it (XEP-0461, with the quote other
// apps show as it is, XEP-0428), change its words (XEP-0308), or take it back (XEP-0424). In a
// group, a reaction, an answer and a taking back name a message by the id the room gave it
// (XEP-0359 stanza-id, kept as `sid`), a change by the id its writer gave it; one-to-one, both by
// the writer's id. Only its writer can change it or take it back.
//
// XMPP has no pins its apps share: a message is pinned on this device only (Pin for me), kept with
// its chat in the account's sealed value, so a hidden place's pins stay in it.
//
// The words of a change and of an answer go encrypted as the chat is. Which message a reaction,
// an answer, a change or a taking back is about, and a reaction's emoji, go as the other XMPP apps
// send them: not encrypted, so the servers see them (docs/xmpp.md). Whether someone is writing
// (XEP-0085) is shown, never sent: it would tell the server each time one writes.

export const NS_REACTIONS = 'urn:xmpp:reactions:0';
export const NS_REPLY = 'urn:xmpp:reply:0';
export const NS_CORRECT = 'urn:xmpp:message-correct:0';
export const NS_RETRACT = 'urn:xmpp:message-retract:1';
/** The older taking back, inside a fastening, which some apps still send. */
const NS_RETRACT_OLD = 'urn:xmpp:message-retract:0';
const NS_FASTEN = 'urn:xmpp:fasten:0';
export const NS_FALLBACK = 'urn:xmpp:fallback:0';
export const NS_CHATSTATES = 'http://jabber.org/protocol/chatstates';

/** The most different reactions one person keeps on one message, and how long one may be. */
export const MOST_REACTIONS = 20;
const REACTION_LONGEST = 32;

/** What other apps show for a taking back they cannot do (as XEP-0424 has it). */
export const RETRACT_BODY = "This person attempted to retract a previous message, but it's unsupported by your client.";

/** Who wrote something in a chat, to tell whether they may change or take back a message there. */
export type Writer = { mine: boolean; who?: string; nick?: string };

/** A message as this needs it (lib/xmpp.ts XmppMessage). */
export type Acted = {
  id: string;
  mine: boolean;
  text: string;
  sid?: string;
  who?: string;
  by?: string;
  call?: true;
  file?: unknown;
  locked?: boolean;
  deleted?: true;
  edited?: number;
  replyTo?: string;
  reacted?: Record<string, string[]>;
};

/** The message `id` names in a chat: in a group by the room's id first, then by its writer's. */
export function targetOf<M extends Acted>(messages: M[], id: string, group: boolean): M | undefined {
  if (!id) return undefined;
  return (group ? messages.find((m) => m.sid === id) : undefined) ?? messages.find((m) => m.id === id);
}

/** The id other apps name `message` by, for a reaction, an answer or a taking back: in a group, the room's. */
export function nameFor(message: Acted, group: boolean): string | undefined {
  return group ? message.sid : message.id;
}

/** Whether `writer` wrote `message`: so may change it or take it back. */
export function wroteIt(message: Acted, writer: Writer, group: boolean): boolean {
  if (message.call || message.mine !== writer.mine) return false;
  if (!group || writer.mine) return true;
  // In a group, by their address when the room says both, else by their name there.
  if (message.who && writer.who) return message.who === writer.who;
  return !!writer.nick && message.by === writer.nick;
}

/** The reactions a stanza carries, for the message they name: each person's whole choice, which replaces what they chose before. */
export function reactionsOf(stanza: XmlElement): { id: string; emojis: string[] } | null {
  const reactions = child(stanza, 'reactions', NS_REACTIONS);
  const id = reactions?.attrs.id ?? '';
  if (!reactions || !id) return null;
  const emojis: string[] = [];
  for (const one of children(reactions, 'reaction')) {
    const emoji = textOf(one).trim();
    if (emoji && emoji.length <= REACTION_LONGEST && !/[\s<>]/.test(emoji) && !emojis.includes(emoji)) emojis.push(emoji);
  }
  return { id, emojis: emojis.slice(0, MOST_REACTIONS) };
}

/** The message a stanza takes back, by the id it names. */
export function retractOf(stanza: XmlElement): string {
  const now = child(stanza, 'retract', NS_RETRACT)?.attrs.id;
  if (now) return now;
  const fastened = child(stanza, 'apply-to', NS_FASTEN);
  return fastened && child(fastened, 'retract', NS_RETRACT_OLD) ? (fastened.attrs.id ?? '') : '';
}

/** The message whose words a stanza changes, by the id it names. */
export function replaceOf(stanza: XmlElement): string {
  return child(stanza, 'replace', NS_CORRECT)?.attrs.id ?? '';
}

/** The message a stanza answers, by the id it names. */
export function replyOf(stanza: XmlElement): string {
  return child(stanza, 'reply', NS_REPLY)?.attrs.id ?? '';
}

/** Whether a stanza says its writer is writing now (XEP-0085): true, false (stopped), or null when it says neither. */
export function typingOf(stanza: XmlElement): boolean | null {
  if (child(stanza, 'composing', NS_CHATSTATES)) return true;
  for (const name of ['active', 'paused', 'inactive', 'gone']) if (child(stanza, name, NS_CHATSTATES)) return false;
  return null;
}

/**
 * The words of an answer without the quote other apps put before them (XEP-0428): the part the
 * fallback names, counted in characters as XMPP counts them, or the lines that begin with ">" when
 * it names none that fits.
 */
export function withoutQuote(stanza: XmlElement, text: string): string {
  const fallback = children(stanza, 'fallback', NS_FALLBACK).find((f) => f.attrs.for === NS_REPLY);
  if (!fallback) return text;
  const body = child(fallback, 'body');
  const characters = [...text];
  const start = Number(body?.attrs.start);
  const end = Number(body?.attrs.end);
  if (body && start === 0 && Number.isInteger(end) && end > 0 && end <= characters.length) return characters.slice(end).join('').trim() || text;
  const lines = text.split('\n');
  let quoted = 0;
  while (quoted < lines.length && lines[quoted].startsWith('>')) quoted += 1;
  return quoted > 0 && quoted < lines.length ? lines.slice(quoted).join('\n').trim() : text;
}

/** The quote other apps show before an answer's words, of the answered message's `line`, and the elements that say what it answers. */
export function replyParts(to: string, id: string, line: string): { quote: string; elements: XmlElement[] } {
  const quote = `${line
    .split('\n')
    .slice(0, 3)
    .map((l) => `> ${l.slice(0, 200)}`)
    .join('\n')}\n`;
  return {
    quote,
    elements: [el('reply', { xmlns: NS_REPLY, to: to || undefined, id }), el('fallback', { xmlns: NS_FALLBACK, for: NS_REPLY }, el('body', { start: 0, end: [...quote].length }))],
  };
}

/** Puts `by`'s reactions on a message, replacing theirs from before. Says whether anything changed. */
export function react(message: Acted, by: string, emojis: string[]): boolean {
  if (message.deleted || message.call) return false;
  const before = message.reacted?.[by] ?? [];
  if (before.length === emojis.length && before.every((e, i) => e === emojis[i])) return false;
  const reacted = { ...(message.reacted ?? {}) };
  if (emojis.length) reacted[by] = emojis;
  else delete reacted[by];
  if (Object.keys(reacted).length) message.reacted = reacted;
  else delete message.reacted;
  return true;
}

/** Takes a message back: its words, file, reactions and what it answered are gone; it says it was deleted. */
export function retract(message: Acted): boolean {
  if (message.deleted) return false;
  message.deleted = true;
  message.text = '';
  for (const gone of ['file', 'locked', 'reacted', 'replyTo', 'edited'] as const) delete message[gone];
  return true;
}

/** Each emoji on a message, with who chose it, in the order they first came. */
export function reactionsShown(message: Acted): Record<string, string[]> | undefined {
  if (!message.reacted) return undefined;
  const shown: Record<string, string[]> = {};
  for (const [by, emojis] of Object.entries(message.reacted)) for (const emoji of emojis) (shown[emoji] ??= []).push(by);
  return Object.keys(shown).length ? shown : undefined;
}

/** The most messages pinned in one chat. */
export const MOST_PINS = 50;

/** The pins of a chat that still show, the latest last: messages still here, not taken back. */
export function pinsShown(pins: string[] | undefined, messages: Acted[]): string[] {
  if (!pins?.length) return [];
  const here = new Set(messages.filter((m) => !m.deleted && !m.call).map((m) => m.id));
  return pins.filter((id) => here.has(id));
}

/** A chat's pins with `id` pinned last, or unpinned; those of messages no longer here go. */
export function pinned(pins: string[] | undefined, messages: Acted[], id: string, on: boolean): string[] {
  const kept = pinsShown(pins, messages).filter((p) => p !== id);
  if (on && messages.some((m) => m.id === id && !m.deleted && !m.call)) kept.push(id);
  return kept.slice(-MOST_PINS);
}

/** `ours` with `emoji` added, or taken out when it was there. */
export function toggled(ours: string[], emoji: string): string[] {
  return ours.includes(emoji) ? ours.filter((e) => e !== emoji) : [...ours, emoji].slice(-MOST_REACTIONS);
}
