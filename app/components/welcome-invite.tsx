// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { Platform, Share } from 'react-native';

import { QrCode } from './QrCode';
import { Button, Field, Input, Row, Sheet, Text, TextButton } from './ui';
import { WELCOME_DAYS, type E2E } from '../lib/e2e';
import { t } from '../lib/i18n';
import { laterLabel } from '../lib/later';
import { makeInvite, type Relay } from '../lib/relay';
import { oldToken } from '../lib/relay-signin';
import { welcomeLink } from '../lib/welcome';
import { MAX_NAME } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData } from '../lock/space-data';

// Invite someone (lib/welcome.ts): one QR code or link, for one person, for 7 days. Their phone
// opens it in Erevos and joins: it takes access of its own to this phone's relay (an invite to it,
// when the relay lets this phone invite), and the two are each other's contacts at once. The name
// typed for them stays here: their access on the relay has a name of random letters (E2E.lineFor).
// The invite is made as the sheet opens, so one tap shows its QR code; who it is for and the name
// this phone gives itself may be typed below it, or never (E2E.nameInvite). The relay lets a phone
// make only a few invites a day, so the sheet opened again soon after, for the same one still
// waiting, shows that one again; Invite someone else makes another.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

/** How long the invite last made shows again when the sheet opens, while no one took it. */
const SHOWN_AGAIN_MS = 15 * 60_000;

type Made = { link: string; hi: string; line: string; code: string | null; until: number; access: boolean; at: number };

// The invite last made while Erevos runs, by space and contact link: never kept anywhere else.
let lastMade: { key: string; made: Made; name: string } | null = null;

export function WelcomeInvite({ visible, onClose, e2e, relay, onOwnLine, contactLink, onNote }: {
  visible: boolean;
  onClose: () => void;
  e2e: E2E | null;
  /** This phone's relay, with its token of its own; null when it has none to invite with. */
  relay: Relay | null;
  /** Trades the relay's one token in `relay`, typed in, for one of this phone's own: the relay
   *  with it, or null when the relay does not do so (app/chat.tsx, ownLine). */
  onOwnLine: (relay: Relay) => Promise<Relay | null>;
  /** This phone's contact link (lib/contact-code.ts). */
  contactLink: string | null;
  onNote: (note: string) => void;
}) {
  const [name, setName] = useState('');
  const [as, setAs] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [made, setMade] = useState<Made | null>(null);
  const making = useRef(false);
  const key = `${currentSpace().space}|${contactLink ?? ''}`;

  // Each time it opens: the invite at once, the one still waiting from a moment ago or a new one.
  useEffect(() => {
    if (!visible) return;
    setFailed('');
    const as = e2e?.invitedAs() ?? '';
    setAs(as);
    const again = lastMade;
    if (again && again.key === key && e2e?.inviteWaits(again.made.hi) && Date.now() - again.made.at < SHOWN_AGAIN_MS) {
      setName(again.name);
      setMade({ ...again.made, link: linkFor(again.made, as) });
      return;
    }
    setName('');
    setMade(null);
    void make(as);
  }, [visible, e2e, contactLink]);

  function linkFor(invite: Made, as: string): string {
    return contactLink ? welcomeLink(contactLink, { code: invite.code, hi: invite.hi, name: as.trim() }) : invite.link;
  }

  async function make(as: string) {
    if (!e2e || !contactLink || making.current) return;
    making.current = true;
    setBusy(true);
    setFailed('');
    try {
      // Access of their own to the relay, when it lets this phone invite; good for as long as both last.
      // The relay has a name of random letters for them; who it is for is named here, now or later (lib/e2e.ts lineFor).
      let line = relay?.token ? await e2e.lineFor('') : '';
      let access = relay?.token ? await makeInvite(relay, line) : null;
      // A token typed in, as the relay's one for all, lets no one in: their phone would be a contact
      // the relay refuses. So it is traded for one of this phone's own first, where the relay does
      // so. A token of this phone's own that cannot invite is the relay's choice.
      if (relay?.token && !access && !oldToken(relay.url, relay.token, (await loadCurrentSpaceData()).ownToken)) {
        const own = await onOwnLine(relay);
        if (!own) {
          setFailed(
            t('Your phone cannot let anyone in to your relay yet: it uses a token typed in, not one of its own. On New chat, under For advanced users, sign in to the relay below the Token, or take an invite to it, then make this invite again.'),
          );
          return;
        }
        line = await e2e.lineFor('');
        access = await makeInvite(own, line);
      }
      const hi = await e2e.welcome('', as);
      const until = Math.min(Date.now() + WELCOME_DAYS * 24 * 3600 * 1000, access?.expires ?? Infinity);
      const invite: Made = { link: '', hi, line: access ? line : '', code: access?.code ?? null, until, access: !!access, at: Date.now() };
      invite.link = linkFor(invite, as);
      lastMade = { key, made: invite, name: '' };
      setMade(invite);
    } catch (error) {
      setFailed(t('No invite now. {error}', { error: errorText(error) }));
    } finally {
      making.current = false;
      setBusy(false);
    }
  }

  // Who it is for, as typed: kept here only, for the chat they will be in.
  function keepName() {
    if (!made || !e2e) return;
    const who = name.trim();
    if (lastMade?.made.hi === made.hi) lastMade = { ...lastMade, name: who };
    void e2e.nameInvite(made.hi, who, made.line).catch((error) => onNote(errorText(error)));
  }

  // The name this phone gives itself goes in the link: the QR code shows it at once.
  function keepAs() {
    if (!made || !e2e) return;
    const link = linkFor(made, as);
    setMade({ ...made, link });
    if (lastMade?.made.hi === made.hi) lastMade = { ...lastMade, made: { ...lastMade.made, link } };
    void e2e.inviteAs(as).catch((error) => onNote(errorText(error)));
  }

  function close() {
    keepName();
    onClose();
  }

  function another() {
    keepName();
    lastMade = null;
    setName('');
    setMade(null);
    void make(as);
  }

  async function share(link: string) {
    try {
      // A computer has no share sheet: the link is copied, to paste where it should go.
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(link);
        onNote(t('Invite copied.'));
        return;
      }
      await Share.share({ message: link });
    } catch (error) {
      onNote(errorText(error));
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title={name.trim() ? t('Invite for {name}', { name: name.trim() }) : t('Invite someone')}>
      {made ? (
        <>
          <QrCode text={made.link} size={260} />
          <Text variant="caption" tone="muted">
            {t('For one person, until {when}. With Erevos on their phone, they scan it with the camera, or open the link you send them: their phone joins, and you are each other’s contacts at once. Whoever takes it first has it, so give it to them only.', {
              when: laterLabel(made.until),
            })}
          </Text>
          {made.access ? null : (
            <Text variant="caption" tone="muted">
              {t('Your relay lets this phone invite no one, so their phone uses it only as your contact link lets it: if it needs a token, they need one of their own.')}
            </Text>
          )}
          <Row wrap>
            <Button title={Platform.OS === 'web' ? t('Copy the invite') : t('Share the invite')} compact onPress={() => void share(made.link)} />
            <Button title={t('Done')} kind="secondary" compact onPress={close} />
          </Row>
          <Field label={t('Who is it for?')} hint={t('Their name in your chats. Optional: you can name them once they join, too.')}>
            <Input value={name} onChangeText={setName} onEndEditing={keepName} onSubmitEditing={keepName} placeholder={t('Maria')} maxLength={MAX_NAME} autoCorrect={false} />
          </Field>
          <Field label={t('Your name, for them')} hint={t('Goes in the invite, so their phone names you. Optional.')}>
            <Input value={as} onChangeText={setAs} onEndEditing={keepAs} onSubmitEditing={keepAs} placeholder={t('Your name')} maxLength={MAX_NAME} autoCorrect={false} />
          </Field>
          <TextButton title={t('Invite someone else')} onPress={another} />
        </>
      ) : (
        <>
          <Text tone="muted">
            {t('One QR code or link, for one person: their phone joins Erevos with it, typing nothing, and you are each other’s contacts at once.')}
          </Text>
          {busy ? <Text variant="caption" tone="muted">{t('Making the invite…')}</Text> : null}
          {failed ? <Text variant="caption" tone="muted">{failed}</Text> : null}
          <Row wrap>
            {failed ? <Button title={t('Try again')} compact onPress={() => void make(as)} /> : null}
            <TextButton title={t('Cancel')} onPress={onClose} />
          </Row>
        </>
      )}
    </Sheet>
  );
}
