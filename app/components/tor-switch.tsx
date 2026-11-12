// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { canTorHttp } from '../lib/core';
import { t } from '../lib/i18n';
import { throughTor, torOff } from '../lib/relay';
import { Chip, Row, Text } from './ui';

// The Tor switch of something that reaches a server of its own, in its own settings: backups to a
// server, the Collection's server, its radio and TV lists, link previews, updates. Off unless
// turned on, as the Nostr screen's is. On, it goes only through Tor, whatever the space's Tor way,
// and never straight (lib/net-http.ts httpFor); off, it goes as it always did. A build without
// Tor for it (a computer, the web app) shows it only while it is on, so it can be turned off.

/** «Through Tor» with On and Off, and the line that says how it goes now, when given. */
export function TorSwitch({ on, onChange, disabled, said }: { on: boolean; onChange: (on: boolean) => void; disabled?: boolean; said?: string }) {
  if (!canTorHttp() && !on) return null;
  return (
    <>
      <Text variant="bodyStrong">{t('Through Tor')}</Text>
      <Row wrap>
        <Chip label={t('On')} selected={on} disabled={disabled} onPress={() => onChange(true)} />
        <Chip label={t('Off')} selected={!on} disabled={disabled} onPress={() => onChange(false)} />
      </Row>
      {said ? (
        <Text variant="caption" tone="muted">
          {said}
        </Text>
      ) : null}
    </>
  );
}

/**
 * How what follows the space's Tor way with its switch off (backups to a server, the Collection's
 * server, its radio and TV lists) reaches its server now, in plain words.
 */
export function serverTorLine(on: boolean): string {
  if (on) {
    return canTorHttp()
      ? t("Through Tor: the server does not see this phone's internet address. It is slower, and waits while Tor starts.")
      : t('This build of Erevos has no Tor, so with this on nothing goes to the server.');
  }
  if (torOff()) return t("Straight: the server sees this phone's internet address.");
  if (throughTor()) return t("This space sends everything through Tor, so this goes through Tor too: the server does not see this phone's internet address.");
  return t("As this space's Tor setting says: through Tor while Tor is ready, straight while it starts or fails, and then the server sees this phone's internet address.");
}
