import { useEffect, useState } from 'react';
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
import { loadCurrentSpaceData } from '../lock/space-data';

// Invite someone (lib/welcome.ts): one QR code or link, for one person, for 7 days. Their phone
// opens it in Erevos and joins: it takes access of its own to this phone's relay (an invite to it,
// when the relay lets this phone invite), and the two are each other's contacts at once. The name
// typed for them is the name of their access on the relay too, which its operator sees.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

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
  const [made, setMade] = useState<{ link: string; name: string; until: number; access: boolean } | null>(null);

  // Each time it opens: a new invite, with the name this phone gave itself last time.
  useEffect(() => {
    if (!visible) return;
    setName('');
    setMade(null);
    setFailed('');
    setAs(e2e?.invitedAs() ?? '');
  }, [visible]);

  async function make() {
    const who = name.trim();
    if (!who || !e2e || !contactLink || busy) return;
    setBusy(true);
    setFailed('');
    try {
      // Access of their own to the relay, when it lets this phone invite; good for as long as both last.
      let access = relay?.token ? await makeInvite(relay, who) : null;
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
        access = await makeInvite(own, who);
      }
      const hi = await e2e.welcome(who, as);
      const until = Math.min(Date.now() + WELCOME_DAYS * 24 * 3600 * 1000, access?.expires ?? Infinity);
      setMade({ link: welcomeLink(contactLink, { code: access?.code, hi, name: as }), name: who, until, access: !!access });
    } catch (error) {
      setFailed(t('No invite now. {error}', { error: errorText(error) }));
    } finally {
      setBusy(false);
    }
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
    <Sheet visible={visible} onClose={onClose} title={made ? t('Invite for {name}', { name: made.name }) : t('Invite someone')}>
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
            <Button title={t('Done')} compact onPress={onClose} />
            <Button title={Platform.OS === 'web' ? t('Copy the invite') : t('Share the invite')} kind="secondary" compact onPress={() => void share(made.link)} />
          </Row>
        </>
      ) : (
        <>
          <Text tone="muted">
            {t('One QR code or link, for one person: their phone joins Erevos with it, typing nothing, and you are each other’s contacts at once.')}
          </Text>
          <Field label={t('Who is it for?')} hint={t('Their name in your chats.')}>
            <Input value={name} onChangeText={setName} placeholder={t('Maria')} maxLength={MAX_NAME} autoCorrect={false} onSubmitEditing={() => void make()} />
          </Field>
          <Field label={t('Your name, for them')} hint={t('Goes in the invite, so their phone names you. Optional.')}>
            <Input value={as} onChangeText={setAs} placeholder={t('Your name')} maxLength={MAX_NAME} autoCorrect={false} />
          </Field>
          {failed ? <Text variant="caption" tone="muted">{failed}</Text> : null}
          <Row wrap>
            <Button title={t('Make the invite')} compact loading={busy} disabled={!name.trim() || !e2e || !contactLink} onPress={() => void make()} />
            <TextButton title={t('Cancel')} onPress={onClose} />
          </Row>
        </>
      )}
    </Sheet>
  );
}
