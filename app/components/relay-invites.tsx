import { useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { QrCode } from './QrCode';
import { Button, Field, Input, Row, Sheet, Text, TextButton } from './ui';
import { confirm } from '../lib/alert';
import { t } from '../lib/i18n';
import { laterDay, laterLabel } from '../lib/later';
import { listInvites, makeInvite, takeBackInvite, type InviteListed, type Relay } from '../lib/relay';
import { inviteLink } from '../lib/relay-invite';

// Invites to the relay (lib/relay.ts, crates/erevos-relay/src/invites.rs), under the token in Relay
// and new contacts: with a token of its own on a relay that invites, this phone makes an invite for
// one more phone, named as typed, and shows it as a QR code. It shows only when the relay says this
// phone may invite. Nothing of the invites is kept here: the relay lists them each time, and taking
// one back that was used cuts that phone off.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

export function RelayInvites({ relay, onNote }: { relay: Relay | null; onNote: (note: string) => void }) {
  // This phone's invites; null when it cannot invite here.
  const [listed, setListed] = useState<InviteListed[] | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ link: string; name: string; expires: number } | null>(null);

  const url = relay?.url ?? '';
  const token = relay?.token ?? '';
  async function look(active = () => true) {
    if (!relay) {
      setListed(null);
      return;
    }
    try {
      const now = await listInvites(relay);
      if (active()) setListed(now);
    } catch {
      // The relay cannot be reached now: nothing to invite with until it can.
      if (active()) setListed(null);
    }
  }
  useEffect(() => {
    let on = true;
    setNaming(false);
    void look(() => on);
    return () => {
      on = false;
    };
  }, [url, token]);

  if (!relay || !listed) return null;

  async function invite() {
    const typed = name.trim();
    if (!relay || !typed || busy) return;
    setBusy(true);
    try {
      const got = await makeInvite(relay, typed);
      if (!got) {
        onNote(t('This relay does not take invites from this phone.'));
        return;
      }
      setMade({ link: inviteLink({ relayUrl: relay.url, code: got.code }), name: typed, expires: got.expires });
      setNaming(false);
      setName('');
      await look();
    } catch (error) {
      onNote(errorText(error));
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

  async function takeBack(invite: InviteListed) {
    const sure = invite.used
      ? await confirm(
          t("Take back {name}'s access?", { name: invite.name }),
          t('Their phone can no longer use this relay, nor the phones it invited, from now on.'),
          t('Take back'),
        )
      : await confirm(t('Take back this invite?'), t('Its QR code no longer lets a phone in.'), t('Take back'));
    if (!sure || !relay) return;
    try {
      onNote((await takeBackInvite(relay, invite.id)) ? t('Taken back.') : t('That invite was gone already.'));
    } catch (error) {
      onNote(errorText(error));
    }
    await look();
  }

  return (
    <View style={{ gap: 6 }}>
      {naming ? (
        <>
          <Field label={t('Who is it for?')}>
            <Input value={name} onChangeText={setName} placeholder={t('Maria')} autoCorrect={false} onSubmitEditing={() => void invite()} />
          </Field>
          <Row wrap>
            <Button title={t('Make the invite')} compact loading={busy} disabled={!name.trim()} onPress={() => void invite()} />
            <TextButton title={t('Cancel')} onPress={() => setNaming(false)} />
          </Row>
        </>
      ) : (
        <Row wrap>
          <Button title={t('Invite to the relay')} kind="secondary" compact onPress={() => setNaming(true)} />
        </Row>
      )}
      <Text variant="caption" tone="muted">
        {t(
          "An invite lets one more phone use this relay, with a token of its own, for as long as yours may: when your access goes, theirs goes too, and so does that of the phones they invited. The relay's operator sees the name you give and that you invited it.",
        )}
      </Text>
      {listed.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text tone="muted">{t('Your invites')}</Text>
          {listed.map((invite) => (
            <Row key={invite.id} wrap>
              <View style={{ flex: 1, minWidth: 160 }}>
                <Text>{invite.name}</Text>
                <Text variant="caption" tone="muted">
                  {invite.used
                    ? t('Uses the relay since {day}', { day: laterDay(invite.used) })
                    : t('Waiting, until {when}', { when: laterLabel(invite.expires) })}
                </Text>
              </View>
              <TextButton title={t('Take back')} onPress={() => void takeBack(invite)} />
            </Row>
          ))}
        </View>
      ) : null}
      <Sheet visible={!!made} onClose={() => setMade(null)} title={made ? t('Invite for {name}', { name: made.name }) : undefined}>
        {made ? <QrCode text={made.link} size={240} /> : null}
        {made ? (
          <Text variant="caption" tone="muted">
            {t(
              "For one phone, until {when}. Let their phone scan it with its camera and open the link in Erevos: it then uses this relay with a token of its own, typing nothing. Whoever takes it first has it, so show it to them only.",
              { when: laterLabel(made.expires) },
            )}
          </Text>
        ) : null}
        <Row wrap>
          <Button title={t('Done')} compact onPress={() => setMade(null)} />
          {made ? (
            <Button
              title={Platform.OS === 'web' ? t('Copy the invite') : t('Share the invite')}
              kind="secondary"
              compact
              onPress={() => void share(made.link)}
            />
          ) : null}
        </Row>
      </Sheet>
    </View>
  );
}
