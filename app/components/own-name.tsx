// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useState } from 'react';
import { View } from 'react-native';

import { t } from '../lib/i18n';
import { space } from '../theme/colors';
import { Button, Input, Row, Text } from './ui';

// A name of one's own for a chat, from its screen: a Matrix room's (lib/matrix-store.ts
// matrixSetOwnName), an XMPP contact's in the account's contacts (lib/xmpp.ts renameXmppContact) and
// a group MMS's (lib/sms-link.ts setTitle), as a Nostr chat has its own (app/nostr-chat.tsx). A button,
// which opens a field with the name as it is, Save, and what the name does (`hint`). Empty, the
// chat's usual name (`placeholder`) shows again.

export function OwnName({ label, current, placeholder, hint, max = 64, onSave, compact = true, open = false }: {
  label: string;
  current: string;
  placeholder: string;
  hint: string;
  max?: number;
  onSave: (name: string) => Promise<void>;
  compact?: boolean;
  /** The field shows at once, without the button first. */
  open?: boolean;
}) {
  const [naming, setNaming] = useState<string | null>(open ? current : null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  if (naming === null) {
    return (
      <Button
        title={label}
        kind="secondary"
        compact={compact}
        onPress={() => {
          setNote('');
          setNaming(current);
        }}
      />
    );
  }

  async function save() {
    setBusy(true);
    setNote('');
    try {
      await onSave((naming ?? '').trim().slice(0, max));
      setNaming(null);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.xs }}>
      <Row>
        <Input style={{ flex: 1 }} value={naming} onChangeText={setNaming} maxLength={max} placeholder={placeholder} accessibilityLabel={label} autoFocus />
        <Button title={t('Save')} compact disabled={busy} onPress={() => void save()} />
      </Row>
      <Text variant="caption" tone="faint">
        {hint}
      </Text>
      {note ? <Text tone="muted">{note}</Text> : null}
    </View>
  );
}
