// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Field, Input, Page, Text, Toggle } from '../components/ui';
import { canTor } from '../lib/core';
import { CouponWaitError } from '../lib/coupons';
import { t } from '../lib/i18n';
import { sameRelay } from '../lib/relay';
import { homeRelays, readySpare, setSpareRelays } from '../lib/spare';
import { loadCurrentSpaceData, MORE_SPARES, type SpareRelay } from '../lock/space-data';
import { space } from '../theme/colors';

// The space's home relays (lib/spare.ts): a second relay with a queue of its own, which contacts
// write to while the main relay cannot be reached, and up to MORE_SPARES more, tried in order.

// `tor`: reached only through Tor. `got`: what the line's token is, as kept: one from a coupon, or a
// coupon signed and waiting.
type Line = { url: string; token: string; tor: boolean; got?: 'coupon' | 'pending' };

const EMPTY: Line = { url: '', token: '', tor: false };

// A kept home relay as a line: a token from a coupon is not shown, as Erevos keeps it by itself.
function lineOf(one: SpareRelay): Line {
  const got = one.pending ? 'pending' : one.coupon !== undefined ? 'coupon' : undefined;
  return { url: one.url, token: one.coupon !== undefined ? '' : one.token, tor: one.tor === true, ...(got ? { got } : {}) };
}

export default function HomeRelay() {
  const [lines, setLines] = useState<Line[]>([EMPTY]);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState('');
  const [mainUrl, setMainUrl] = useState('');

  useEffect(() => {
    loadCurrentSpaceData()
      .then((data) => {
        setMainUrl(data.url);
        const kept = homeRelays(data.spare).map(lineOf);
        setLines(kept.length > 0 ? kept : [EMPTY]);
        setReady(!!data.spare.url && !!data.spare.queue);
      })
      .catch(() => setNote(t('The settings of this space could not open.')));
  }, []);

  function change(at: number, patch: Partial<Line>) {
    setLines((now) => now.map((line, i) => (i === at ? { ...line, ...patch } : line)));
  }

  async function save() {
    setNote('');
    const given = lines.map((line) => ({ url: line.url.trim(), token: line.token, tor: line.tor })).filter((line) => line.url);
    for (const { url } of given) {
      if (!/^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(url)) {
        setNote(t('A relay address starts with ws:// or wss://.'));
        return;
      }
      if (sameRelay(url, mainUrl)) {
        setNote(t('That is your relay already. A home relay is another one.'));
        return;
      }
    }
    if (given.some((line, i) => given.findIndex((other) => sameRelay(other.url, line.url)) !== i)) {
      setNote(t('Each home relay is a different one.'));
      return;
    }
    try {
      await setSpareRelays(given);
      setReady(false);
      const kept = homeRelays((await loadCurrentSpaceData()).spare).filter((one) => one.url.trim()).map(lineOf);
      setLines(kept.length > 0 ? kept : [EMPTY]);
      if (given.length === 0) {
        setNote(t('No home relay. Contacts write only to your relay.'));
        return;
      }
      await readySpare();
      setReady(true);
      setNote(t('Your queue on the home relay is ready. Contacts learn it from your next message, or from your contact link.'));
    } catch (error) {
      if (error instanceof CouponWaitError) {
        setLines((now) => now.map((line) => (line.tor && !line.token.trim() ? { ...line, got: 'pending' } : line)));
        setNote(error.message);
        return;
      }
      setNote(
        t('Saved, but the home relay could not be reached: {reason}. It is tried again with each look.', {
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  return (
    <Page>
      <Text variant="title">{t('Home relay')}</Text>
      <Card>
        <Text tone="muted">
          {t(
            'A second relay with a queue of its own, for example one at home on a Raspberry Pi or an old computer. Your contact link and every message say it beside your relay, so contacts write there while your relay cannot be reached, and what you send goes through it when yours is down. Erevos takes what comes there with each look.',
          )}
        </Text>
        <Text tone="muted">
          {t(
            "Whoever runs it sees what your relay sees: this phone's address when it takes messages, and when and how much comes. Hidden chats do not use it: each hidden place can have its own, set while it is open.",
          )}
        </Text>
        {lines.map((line, at) => (
          <View key={at}>
            <Field label={at === 0 ? t('Home relay address') : t('Another home relay ({n})', { n: at + 1 })}>
              <Input
                value={line.url}
                onChangeText={(url) => change(at, { url })}
                placeholder="wss://relay.at-home.example"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </Field>
            <Field label={t('Token (optional)')}>
              <Input
                value={line.token}
                onChangeText={(token) => change(at, { token })}
                placeholder={line.tor ? t('None: a coupon from your relay') : t('Token, if the relay needs one')}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </Field>
            {canTor() ? (
              <Pressable
                onPress={() => change(at, { tor: !line.tor })}
                accessibilityRole="switch"
                accessibilityState={{ checked: line.tor }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{t('Only through Tor')}</Text>
                  <Text variant="caption" tone="muted">
                    {t(
                      "This relay never sees your phone's address, whatever Tor is set to for the rest. With no token typed, it gives one for a coupon your relay signs blind, if it takes them: then neither relay can tell whose it is.",
                    )}
                  </Text>
                </View>
                <Toggle on={line.tor} />
              </Pressable>
            ) : null}
            {line.tor && !line.token.trim() && line.got === 'coupon' ? (
              <Text variant="caption" tone="faint">
                {t('Its token came with a coupon. Erevos takes a new one by itself before it ends.')}
              </Text>
            ) : null}
            {line.tor && !line.token.trim() && line.got === 'pending' ? (
              <Text variant="caption" tone="faint">
                {t('A coupon is signed. The token comes from the backup relay within the hour.')}
              </Text>
            ) : null}
          </View>
        ))}
        {lines.length <= MORE_SPARES && lines[lines.length - 1].url.trim() ? (
          <Button title={t('Add another home relay')} kind="secondary" compact onPress={() => setLines((now) => [...now, EMPTY])} />
        ) : null}
        <Text variant="caption" tone="muted">
          {t(
            'With more than one, contacts try them in this order, and Erevos takes what comes on each. Each one more makes your contact link a little longer, and its QR code a little denser.',
          )}
        </Text>
        <Button title={t('Save')} onPress={() => void save()} />
        {ready ? <Text variant="caption" tone="faint">{t('Your queue there is ready.')}</Text> : null}
      </Card>
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
