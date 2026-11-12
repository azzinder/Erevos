// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { IP_GUIDE, ipGoneOn, ipSaid, ipWarningText, type IpFix, type IpWarning } from '../lib/ip-warning';

import { openGuideLink } from './guide';
import { Button, Card, Row, Text } from './ui';

// Saying that this phone's internet address may be seen (lib/ip-warning.ts), before it may be:
// asked once (ipGate), or shown in a screen as it stands (IpNotice).

/**
 * Says `warning` before what it is of happens, unless it was said and gone on from already: true
 * to go on, false to stop. A phone's question has three buttons at most: `fix`, when given (a way
 * to go on without showing the address, such as Tor for the chat), which is done and then goes on,
 * else Cancel; Guide, which opens the guide's section on it and stops; and Go on, which goes on
 * and keeps that it was said.
 */
export async function ipGate(warning: IpWarning, fix?: IpFix): Promise<boolean> {
  if (await ipSaid(warning)) return true;
  const { title, message } = ipWarningText(warning);
  const choice = await new Promise<'fix' | 'guide' | 'go' | 'stop'>((resolve) => {
    ask(title, message, [
      fix ? { text: fix.label, onPress: () => resolve('fix') } : { text: t('Cancel'), style: 'cancel', onPress: () => resolve('stop') },
      { text: t('Guide'), onPress: () => resolve('guide') },
      { text: t('Go on'), onPress: () => resolve('go') },
    ]);
  });
  if (choice === 'guide') openGuideLink(IP_GUIDE);
  if (choice === 'fix' && fix) {
    try {
      await fix.run();
      return true;
    } catch {
      return false;
    }
  }
  if (choice !== 'go') return false;
  await ipGoneOn(warning).catch(() => undefined);
  return true;
}

/** The warning `warning` as it stands, in a screen: its words, `fix` when given, and the guide. */
export function IpNotice({ warning, fix }: { warning: IpWarning; fix?: IpFix }) {
  const { title, message } = ipWarningText(warning);
  return (
    <Card>
      <Text variant="bodyStrong">{title}</Text>
      <Text tone="muted">{message}</Text>
      <Row wrap>
        {fix ? <Button title={fix.label} compact onPress={() => void fix.run()} /> : null}
        <Button title={t('Guide')} kind="secondary" compact onPress={() => openGuideLink(IP_GUIDE)} />
      </Row>
    </Card>
  );
}
