// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { parseContact, type ContactCode } from '../lib/contact-code';
import { t } from '../lib/i18n';
import { CAN_TAKE_PHOTOS } from '../lib/pick-photo';
import { readQrPhoto } from '../lib/read-qr';
import { Button, Input, Row } from './ui';

// A contact's Erevos ID (app/contact-card.tsx, app/contact-edit.tsx): the contact link their Erevos
// shows under Copy my contact link, or as their QR code, which adds them to the space's Erevos
// chats (lib/contact-code.ts). Once added, the contact shows the start of their key, as the ID.

/** The Erevos ID a linked contact shows: the start of its key, in groups of four. */
export function erevosIdText(identity: string): string {
  return identity.slice(0, 20).match(/.{1,4}/g)?.join(' ') ?? '';
}

/** The Erevos contact an ID names: a contact link with its keys; null when the text is none. */
export function readErevosId(text: string): ContactCode | null {
  const code = parseContact(text);
  return code && code.key ? code : null;
}

/** Where an Erevos ID is pasted, or read from a photo of its QR code. */
export function ErevosIdInput({ value, onChange, onNote }: { value: string; onChange: (text: string) => void; onNote: (text: string) => void }) {
  async function readQr(from: 'camera' | 'photos') {
    onNote('');
    try {
      const text = await readQrPhoto(from);
      if (text === null) return;
      if (readErevosId(text)) onChange(text);
      else onNote(text ? t('That QR code holds no Erevos ID.') : t('No QR code was found in the photo. Take it again closer, with all of the code in it.'));
    } catch (error) {
      onNote(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <>
      <Input value={value} onChangeText={onChange} placeholder="erevos://contact?…" autoCapitalize="none" autoCorrect={false} />
      <Row wrap>
        {CAN_TAKE_PHOTOS ? <Button title={t('Take a photo of the QR code')} kind="secondary" compact onPress={() => void readQr('camera')} /> : null}
        <Button title={t('Choose a photo of the QR code')} kind="secondary" compact onPress={() => void readQr('photos')} />
      </Row>
    </>
  );
}
