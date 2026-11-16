// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';

import { ipGate } from './ip-warning';
import { Button, Input, Row, Sheet, Text } from './ui';
import { nostrChatsThroughTor } from '../lib/nostr-dm-net';
import { canPairCode, nostrKeys } from '../lib/core';
import { t } from '../lib/i18n';
import { newPairCode, PAIR_LASTS, readPairCode, showCode, showPairCode, typeCode, type PairEnd, type Pairing } from '../lib/pair-code';

// Pair with a code (lib/pair-code.ts): one phone shows 8 digits, the other types them, and each
// ends with the other's contact link, which `onLink` adds as a link pasted would be.

/** Whether this build can pair with a code: the core's pairing and Nostr's keys. */
export function canPairWithCode(): boolean {
  return canPairCode() && nostrKeys() !== null;
}

type Mode = 'choose' | 'show' | 'type';

export function PairCodeSheet({ visible, onClose, ownLink, onLink }: { visible: boolean; onClose: () => void; ownLink: string; onLink: (link: string) => void }) {
  const [mode, setMode] = useState<Mode>('choose');
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const pairing = useRef<Pairing | null>(null);

  const stop = () => {
    pairing.current?.stop();
    pairing.current = null;
  };

  // Closed: whatever was under way ends, and it opens again at the start.
  useEffect(() => {
    if (visible) return;
    stop();
    setMode('choose');
    setCode('');
    setTyped('');
    setBusy(false);
    setNote('');
  }, [visible]);
  useEffect(() => stop, []);

  async function run(start: () => Promise<Pairing>) {
    stop();
    setNote('');
    setBusy(true);
    let end: PairEnd;
    try {
      const under = await start();
      pairing.current = under;
      end = await under.done;
      if (pairing.current !== under) return;
      pairing.current = null;
    } catch (error) {
      end = { error: error instanceof Error ? error.message : String(error) };
    }
    setBusy(false);
    if ('link' in end) {
      onLink(end.link);
      onClose();
    } else if (end.error) {
      setNote(end.error);
    }
  }

  // The phones meet on public Nostr relays: straight, unless the space's Tor carries Nostr, they see
  // this phone's internet address, so that is said first (lib/ip-warning.ts, 'pair').
  const mayMeet = async () => nostrChatsThroughTor() || ipGate({ network: 'Nostr', act: 'pair', of: 'pair code' });

  async function show() {
    if (!(await mayMeet())) return;
    const made = newPairCode();
    setMode('show');
    setCode(made);
    void run(() => showCode(made, ownLink));
  }

  async function type() {
    const digits = readPairCode(typed);
    if (!digits) {
      setNote(t('Type the 8 digits the other phone shows.'));
      return;
    }
    if (!(await mayMeet())) return;
    void run(() => typeCode(digits, ownLink));
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('Pair with a code')}>
      {mode === 'choose' ? (
        <>
          <Text variant="caption" tone="muted">
            {t('For someone you are with or on the phone with: one of you shows a code of 8 digits, the other types it, and you are each other’s contacts. The code itself never leaves the phones.')}
          </Text>
          <Row wrap>
            <Button title={t('Show a code')} compact onPress={() => void show()} />
            <Button title={t('Type their code')} kind="secondary" compact onPress={() => setMode('type')} />
          </Row>
        </>
      ) : mode === 'show' ? (
        <>
          <Text variant="title" selectable accessibilityLabel={code.split('').join(' ')}>
            {showPairCode(code)}
          </Text>
          <Text variant="caption" tone="muted">
            {busy
              ? t('Tell them the code, or let them read it. They type it under Pair with a code, Type their code. It lasts {minutes} minutes.', { minutes: PAIR_LASTS / 60_000 })
              : t('This code is closed.')}
          </Text>
          <Row wrap>
            {!busy ? <Button title={t('New code')} compact onPress={() => void show()} /> : null}
            <Button title={t('Cancel')} kind="secondary" compact onPress={onClose} />
          </Row>
        </>
      ) : (
        <>
          <Row>
            <Input
              value={typed}
              onChangeText={setTyped}
              placeholder="1234 5678"
              keyboardType="number-pad"
              maxLength={11}
              autoFocus
              editable={!busy}
              onSubmitEditing={type}
              style={{ flex: 1 }}
            />
            <Button title={t('Pair')} compact loading={busy} disabled={busy} onPress={() => void type()} />
          </Row>
          <Text variant="caption" tone="muted">
            {busy ? t('Waiting for the other phone…') : t('Type the 8 digits the other phone shows.')}
          </Text>
          <Button title={t('Cancel')} kind="secondary" compact onPress={onClose} />
        </>
      )}
      {note ? (
        <Text variant="caption">
          {note}
        </Text>
      ) : null}
    </Sheet>
  );
}
