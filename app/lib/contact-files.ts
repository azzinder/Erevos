// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Directory } from 'expo-file-system';

import { pickFolder } from './backup-place';
import { groupTitles, type Card } from './contact-book';
import { phoneSave, plain } from './contacts';
import { fromBase64, utf8Encode } from './crypto';
import { pickFile } from './pick-file';
import { parseVCards, writeVCard, type VCard } from './vcard';
import { loadPhoto } from '../lock/avatar-photos';
import {
  addToPhoneGroup,
  createPhoneGroup,
  phoneContactPhoto,
  phoneGroups,
  savePhoneContact,
  setPhoneContactPhoto,
  type ContactAccount,
} from '../modules/erevos-contacts';

// The phone's contacts in and out of .vcf files (lib/vcard.ts): a file the owner picks, read here
// and its contacts saved in Android's contacts, with their photos and groups; and contacts saved
// as one file in a folder the owner picks, those kept only in Erevos too. A saved file is outside
// Erevos, not sealed.

/** The largest .vcf file read. */
export const MAX_VCF = 20 * 1024 * 1024;
// Saving more contacts than this, their small photos go, not the large.
const LARGE_PHOTOS = 50;

/** The contacts in a .vcf file the owner picks, and its name, or null if they went back. */
export async function pickVCards(): Promise<{ name: string; cards: VCard[] } | null> {
  const picked = await pickFile(MAX_VCF);
  if (!picked) return null;
  return { name: picked.name, cards: parseVCards(picked.bytes) };
}

/** A file's name from a contact's or a list's, without what a folder does not take. */
export function vcfName(name: string): string {
  return `${name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 80) || 'contacts'}.vcf`;
}

/** Saves contacts as one .vcf file in a folder the owner picks. Its name there, or null if they went back. */
export async function saveVCards(cards: Card[], name: string): Promise<string | null> {
  const folder = await pickFolder();
  if (!folder) return null;
  const groups = await phoneGroups().catch(() => []);
  const large = cards.length <= LARGE_PHOTOS;
  const parts: string[] = [];
  for (const card of cards) {
    if (card.sealed) {
      // A sealed photo is one size only, so it goes with few contacts only.
      const sealedPhoto = card.sealed.photo && large ? await loadPhoto(card.sealed.photo).catch(() => null) : null;
      parts.push(writeVCard({ ...card, photo: sealedPhoto, groups: [] }));
      continue;
    }
    const photo = card.phone?.photo ? await phoneContactPhoto(card.phone.id, large).catch(() => null) : null;
    parts.push(writeVCard({ ...card, photo: photo ? fromBase64(photo) : null, groups: groupTitles(card, groups) }));
  }
  const file = new Directory(folder).createFile(name, 'text/x-vcard');
  file.write(utf8Encode(parts.join('')));
  return file.name || name;
}

const sameAccount = (a: ContactAccount, b: ContactAccount | null) => a.type === (b?.type ?? '') && a.name === (b?.name ?? '');

/**
 * Saves a file's contacts in Android's contacts, in `account` (null: on this phone only), one by
 * one, telling how many are done. Their groups are the account's of the same name, made when it
 * has none. A photo Android cannot read is left out.
 */
export async function importVCards(cards: VCard[], account: ContactAccount | null, progress: (done: number) => void): Promise<{ saved: number; failed: number }> {
  const groups = new Map<string, number>();
  for (const g of await phoneGroups().catch(() => [])) if (sameAccount(g.account, account)) groups.set(plain(g.title), g.id);
  let saved = 0;
  let failed = 0;
  for (const card of cards) {
    try {
      const id = await savePhoneContact(phoneSave(card, null, account, false));
      if (card.photo) await setPhoneContactPhoto(id, card.photo).catch(() => undefined);
      for (const title of card.groups) {
        let group = groups.get(plain(title));
        if (group === undefined) {
          group = await createPhoneGroup(title, account ?? { type: '', name: '' });
          groups.set(plain(title), group);
        }
        await addToPhoneGroup(group, id).catch(() => false);
      }
      saved++;
    } catch {
      failed++;
    }
    progress(saved + failed);
  }
  return { saved, failed };
}
