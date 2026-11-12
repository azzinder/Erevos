// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Warnings that this phone's internet address (its IP address) may be seen, said before it may
// be: by whom, what can be done instead, and the guide's section on it (Who sees your internet
// address, {#ip}). Each is said once, by what it is of (ipKey): to go on is to have read it, and
// it is not said again; turning Tor on instead says nothing is kept, so it is said again should
// Tor be turned off. They are the same for every network of the app: Erevos says them before its
// chats, calls and files, and any other network says its own, by its name. What asks is
// components/ip-warning.tsx; what is kept is the space's (SpaceData.ipSeen), each space its own.

import { t } from './i18n';
import { IP_SEEN_MOST, loadCurrentSpaceData, updateCurrentSpaceData } from '../lock/space-data';

/**
 * What is about to happen that may show this phone's internet address: something sent in a chat
 * (`send`), a call (`call`), a file fetched from a server someone else chose (`file`), a web page
 * opened (`link`) or fetched for its preview (`preview`), or a group or room joined through a
 * server (`join`).
 */
export type IpAct = 'send' | 'call' | 'file' | 'link' | 'preview' | 'join';

/** One warning: the network's name as shown (Erevos, Matrix…), what is about to happen, and what of (a chat, an account, a server), so each is said once. */
export type IpWarning = { network: string; act: IpAct; of: string };

/** A way to go on without showing the address, offered with a warning: its button, and what it does. */
export type IpFix = { label: string; run: () => Promise<unknown> | unknown };

/** The guide's section on who sees the internet address, and how not to show it. */
export const IP_GUIDE = '#ip';

/** What a warning is kept by, once said. */
export function ipKey(warning: IpWarning): string {
  return `${warning.network.trim().toLowerCase()}|${warning.act}|${warning.of}`.slice(0, 200);
}

/** A warning's title and words, for the network it names. */
export function ipWarningText(warning: IpWarning): { title: string; message: string } {
  const network = warning.network.trim();
  const title = t('Your internet address can be seen');
  switch (warning.act) {
    case 'send':
      return { title, message: t("On {network}, what you send here can go without Tor. The servers that carry it, yours and your contact's, can then see this phone's internet address (IP address), though not what you wrote.", { network }) };
    case 'call':
      return { title, message: t("Calls never go through Tor. The call relay that carries the sound and picture, yours or your contact's, sees this phone's internet address (IP address), though not what is said.") };
    case 'file':
      return { title, message: t("This file is on a server your contact chose. Fetched without Tor, that server sees this phone's internet address (IP address), though not what the file holds.") };
    case 'link':
      return { title, message: t("The site sees this phone's internet address (IP address), as any web page you open does. To hide it, open links in Tor Browser.") };
    case 'preview':
      return { title, message: t("To show a link's preview, the page is fetched from its site. Without Tor, the site sees this phone's internet address (IP address).") };
    case 'join':
      return { title, message: t("On {network}, joining goes through a server. Without Tor, it sees this phone's internet address (IP address).", { network }) };
  }
}

/** Whether `warning` was said and gone on from already, in the open space. */
export async function ipSaid(warning: IpWarning): Promise<boolean> {
  const data = await loadCurrentSpaceData().catch(() => null);
  return !!data?.ipSeen?.includes(ipKey(warning));
}

/** Keeps that `warning` was said and gone on from, so it is not said again. */
export async function ipGoneOn(warning: IpWarning): Promise<void> {
  const key = ipKey(warning);
  const data = await loadCurrentSpaceData();
  const seen = data.ipSeen ?? [];
  if (seen.includes(key)) return;
  await updateCurrentSpaceData({ ipSeen: [...seen, key].slice(-IP_SEEN_MOST) });
}
