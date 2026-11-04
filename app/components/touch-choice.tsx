// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import { hapticsOn, setHapticsOn } from '../lib/haptics';
import { t } from '../lib/i18n';

import { Card, Chip, Row, SectionTitle, Text } from './ui';

// Whether a touch buzzes (lib/haptics.ts), on this phone for every space: Settings → Appearance →
// Vibrate on touch.
export function TouchChoice({ titled = true }: { titled?: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    void hapticsOn().then(setOn);
  }, []);

  function choose(next: boolean) {
    setOn(next);
    void setHapticsOn(next);
  }

  if (on === null) return null;
  return (
    <>
      {titled ? <SectionTitle title={t('Vibrate on touch')} /> : null}
      <Row wrap>
        <Chip label={t('Vibrate')} selected={on} onPress={() => choose(true)} />
        <Chip label={t('No vibration')} selected={!on} onPress={() => choose(false)} />
      </Row>
      <Card>
        <Text variant="caption" tone="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          {on
            ? t('A short buzz when you tap a key of the keypad, Send, Enter or a switch, and when a menu opens. Never while you scroll. For every space on this phone.')
            : t('Touches make no buzz.')}
        </Text>
      </Card>
    </>
  );
}
