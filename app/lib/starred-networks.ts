// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { loadStars, type StarPlace } from '../lock/stars-data';
import { contactCards, smsMessages, smsMirrored, type ContactCard } from '../modules/erevos-sms';
import { lockedChat } from './chat-protect';
import { isGone, type ChatRules } from './chat-rules';
import { sealedNamer } from './contact-book';
import { t } from './i18n';
import { rulesOf as matrixRules } from './matrix-rules';
import { matrixNow } from './matrix-store';
import type { Module } from './modules';
import { nameOf as nostrName, npubOf, shortNpub } from './nostr-dm';
import { rulesOf as nostrRules } from './nostr-rules';
import { nostrDmNow } from './nostr-dm-store';
import { smsLineId } from './sms-chat';
import { groupName, smsNumbers } from './sms-group';
import { SmsLink } from './sms-link';
import { smsRulesOf } from './sms-rules';
import { mirroredNames } from './sms-mirror';
import type { LiveMessage, Star, StarChat } from './stars';
import { nameOf as xmppName } from './xmpp';
import { rulesOf as xmppRules } from './xmpp-rules';
import { xmppNow } from './xmpp-store';

// The messages starred in the open space's chats on Matrix, XMPP and Nostr and in its SMS
// (lib/stars.ts), as the starred messages of every chat list them (app/starred.tsx): each by its
// chat as the device has it now, while its network is on and its account the same. The SMS are
// read for it, each conversation with a star once, and named as the SMS list names them, once
// names are on (lib/sms-rows.ts). A hidden place's stars are never among them: each of its chats
// lists its own.

/** The open space's stars, and what is known of their SMS conversations: their names and messages. */
/** A chat's disappearing and deleted-here messages, by its rules (lib/chat-rules.ts), to take their stars along. */
const goneBy = (rules: ChatRules | undefined): StarChat['goneHere'] => (rules ? (id, at) => isGone(rules, id, at) : undefined);

export type SpaceStars = { stars: Star[]; sms: Map<string, StarChat> };

/** Reads the open space's stars, and the SMS conversations among them while the SMS are on. */
export async function loadSpaceStars(place: StarPlace, modules: ReadonlySet<Module>): Promise<SpaceStars> {
  const stars = await loadStars(place);
  const addresses = modules.has('sms') ? [...new Set(stars.filter((s) => s.service === 'sms').map((s) => s.chat))] : [];
  const sms = new Map<string, StarChat>();
  if (addresses.length === 0) return { stars, sms };
  const names = await smsNames(place, addresses).catch(() => ({}) as Record<string, string>);
  const link = await SmsLink.open(place.space, place.key).catch(() => null);
  for (const address of addresses) {
    const read = await smsMessages(address).catch(() => null);
    // None read (the SMS not Erevos's to read now) tells nothing of what is gone.
    const messages: LiveMessage[] | undefined = read?.length ? read.map((m) => ({ id: smsLineId(m), at: m.at })) : undefined;
    const goneHere = link ? goneBy(smsRulesOf(link.state, address)) : undefined;
    sms.set(address, { name: names[address] || address, messages, ...(lockedChat(link?.own(address)) ? { locked: true } : {}), ...(goneHere ? { goneHere } : {}) });
  }
  return { stars, sms };
}

// The conversations' names, as the SMS list has them: once names are on, as the phone's contacts
// name the numbers, else the space's contacts kept only in Erevos; a group's by all its numbers.
async function smsNames(place: StarPlace, addresses: string[]): Promise<Record<string, string>> {
  const link = await SmsLink.open(place.space, place.key).catch(() => null);
  if (!(smsMirrored() ? mirroredNames() : !!link?.names)) return {};
  const all = addresses.flatMap(smsNumbers);
  const cards: Record<string, ContactCard> = await contactCards(all).catch(() => ({}));
  const sealed = await sealedNamer();
  const named: Record<string, string> = {};
  for (const number of all) {
    const name = cards[number]?.name || sealed(number);
    if (name) named[number] = name;
  }
  return Object.fromEntries(
    addresses.map((address) => {
      const numbers = smsNumbers(address);
      return [address, numbers.length > 1 ? groupName(numbers, named) : named[numbers[0] ?? address] || ''];
    }),
  );
}

/**
 * A star's chat as the device has it now, for lib/stars.ts starredNow: undefined while its network
 * is off, or its account is not the one signed in now (or not read yet).
 */
export function starChatNow(star: Star, modules: ReadonlySet<Module>, sms: Map<string, StarChat>): StarChat | undefined {
  if (!modules.has(star.service)) return undefined;
  switch (star.service) {
    case 'matrix': {
      const { state } = matrixNow('space');
      if (!state || state.userId !== star.account) return undefined;
      const room = state.rooms[star.chat];
      return room ? { name: room.name, messages: room.messages.map((m) => ({ id: m.id, at: m.ts, deleted: m.deleted })), locked: lockedChat(room), goneHere: goneBy(matrixRules(room)) } : { name: '', messages: null };
    }
    case 'xmpp': {
      const { state } = xmppNow('space');
      if (!state || state.jid !== star.account) return undefined;
      const chat = state.chats[star.chat];
      return chat ? { name: xmppName(state, star.chat), messages: chat.messages, locked: lockedChat(chat), goneHere: goneBy(xmppRules(chat)) } : { name: '', messages: null };
    }
    case 'nostr': {
      const { state } = nostrDmNow('space');
      if (!state || state.public !== star.account) return undefined;
      const chat = state.chats[star.chat];
      // What went from this phone (deleted here, or by its time) is remembered in `gone` (lib/nostr-dm.ts removeHere).
      const name = star.chat === state.public ? t('Chat with myself') : nostrName(state, star.chat) || shortNpub(npubOf(star.chat));
      return chat ? { name, messages: chat.messages, locked: lockedChat(chat), goneHere: (id, at) => isGone(nostrRules(chat), id, at) || !!state.gone?.some((g) => g.id === id) } : { name: '', messages: null };
    }
    case 'sms':
      return sms.get(star.chat) ?? { name: star.chat };
  }
}
