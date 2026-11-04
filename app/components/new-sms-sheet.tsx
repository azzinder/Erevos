// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { useState } from 'react';

import { t } from '../lib/i18n';
import { smsAddress, smsNumbers } from '../lib/sms-group';

import { SmsRecipient } from './sms-recipient';
import { Button, Sheet, Text } from './ui';

// A new SMS, to a number typed or chosen from the contacts (components/sms-recipient.tsx): from the
// home screen's New chat while the SMS are the only messages on (lib/modules.ts). Several numbers,
// separated by commas, make a group's conversation (lib/sms-group.ts).
export function NewSmsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [number, setNumber] = useState('');
  const [note, setNote] = useState('');

  function close() {
    onClose();
    setNumber('');
    setNote('');
  }

  function write() {
    const numbers = smsNumbers(number);
    if (numbers.length === 0) {
      setNote(t('Type a phone number.'));
      return;
    }
    close();
    router.push(`/sms?to=${encodeURIComponent(smsAddress(numbers))}`);
  }

  return (
    <Sheet visible={visible} onClose={close} title={t('New SMS')}>
      <SmsRecipient value={number} onChange={setNumber} onSubmit={write} autoFocus />
      <Button title={t('Write')} onPress={write} />
      {note ? <Text tone="muted">{note}</Text> : null}
    </Sheet>
  );
}
