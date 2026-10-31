// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { ContactPicker } from '../components/contact-picker';
import { MIN_BACKUP_PASSWORD, PasswordSheet } from '../components/PasswordSheet';
import { QrCode } from '../components/QrCode';
import { Button, Card, Chip, Field, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { confirm } from '../lib/alert';
import { cloudLabel, loadCloudBackup, type CloudBackup } from '../lib/backup-cloud';
import { isAutoBackupPassword, loadAutoBackup } from '../lib/backup-folder';
import { handServer, piecesIn, putTogether, SPLITS, type PiecesSecret } from '../lib/backup-pieces';
import { CAN_COPY, copyText } from '../lib/clipboard';
import type { ContactInfo } from '../lib/e2e';
import { locale, plural, t } from '../lib/i18n';
import { dropHeldPiece, dropPiecesBack, givePieceBack, givePieces, givenPieces, heldPieces, piecesBack, type GivenPieces, type HeldPiece } from '../lib/pieces-kept';
import { readQrPhoto } from '../lib/read-qr';
import { lookSoon } from '../lib/receiver';
import { spaceChats } from '../lib/space-chats';
import { useTheme } from '../theme/context';

// Backup pieces (Settings → Data and devices → Backup pieces): the backup's password, and the
// server automatic backups go to, in pieces with friends (lib/backup-pieces.ts, lib/pieces-kept.ts):
// given to contacts chosen, any k of n giving it back; put together again from pieces friends give
// back, as codes scanned or pasted, or with messages; and the pieces this phone keeps for friends,
// shown as a code, given back, or deleted. Only the space's own chats: hidden chats give none.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function whenText(ms: number): string {
  return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BackupPieces() {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [held, setHeld] = useState<HeldPiece[]>([]);
  const [given, setGiven] = useState<GivenPieces[]>([]);
  const [back, setBack] = useState<string[]>([]);
  const [cloud, setCloud] = useState<CloudBackup | null>(null);
  const [split, setSplit] = useState(SPLITS[0]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [withServer, setWithServer] = useState(true);
  const [asking, setAsking] = useState(false);
  // Whether automatic backups are on: then the password typed is checked against theirs.
  const [hasAuto, setHasAuto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  // Pieces gathered to put together: pasted or scanned here; those given back with messages are added.
  const [gathered, setGathered] = useState<string[]>([]);
  const [pasted, setPasted] = useState('');
  const [found, setFound] = useState<PiecesSecret | null>(null);
  // The piece kept for a friend whose code shows.
  const [showing, setShowing] = useState<string | null>(null);

  async function reload() {
    const { e2e } = await spaceChats();
    setContacts(e2e.contacts().filter((c) => !c.request));
    setHeld(heldPieces(e2e));
    setGiven(givenPieces(e2e));
    setBack(piecesBack(e2e));
  }

  useEffect(() => {
    void reload().catch(() => undefined);
    void loadCloudBackup().then(setCloud);
    void loadAutoBackup().then((auto) => setHasAuto(!!auto));
  }, []);

  const say = (text: string, bad = false) => setNote(text ? { text, bad } : null);
  const nameOf = (identity: string) => {
    const contact = contacts.find((c) => c.identity === identity);
    return contact?.name || (contact ? t('A contact with no name') : t('No longer a contact'));
  };

  function toggle(identity: string) {
    setChosen((now) => {
      const next = new Set(now);
      if (next.has(identity)) next.delete(identity);
      else if (next.size < split.n) next.add(identity);
      return next;
    });
  }

  // The password typed: automatic backups' own when they are on, which is checked.
  async function give(password: string): Promise<boolean | void> {
    const auto = await isAutoBackupPassword(password);
    if (auto === false) return false;
    setAsking(false);
    setBusy(true);
    try {
      const chats = await spaceChats();
      const server = withServer && cloud ? { url: cloud.url, user: cloud.user, password: cloud.password } : null;
      await givePieces(chats, { password, server }, split.k, [...chosen]);
      setChosen(new Set());
      lookSoon();
      await reload();
      say(t('The pieces wait in your chats with them and go as soon as they can. Each friend needs an Erevos from this version on to keep theirs.'));
    } catch (error) {
      say(errorText(error), true);
    } finally {
      setBusy(false);
    }
  }

  function add(text: string) {
    const pieces = piecesIn(text);
    if (!pieces.length) {
      say(t('That is not a whole backup piece. Copy all of it, or scan it again.'), true);
      return;
    }
    setGathered((now) => [...new Set([...now, ...pieces])]);
    setPasted('');
    say('');
  }

  async function scan() {
    try {
      const text = await readQrPhoto('camera');
      if (text !== null) add(text);
    } catch (error) {
      say(errorText(error), true);
    }
  }

  async function putThemTogether() {
    try {
      setFound(putTogether([...new Set([...gathered, ...back])]));
      say('');
    } catch (error) {
      setFound(null);
      say(errorText(error), true);
    }
  }

  async function forgetFound() {
    setFound(null);
    setGathered([]);
    const { e2e } = await spaceChats();
    await dropPiecesBack(e2e);
    setBack([]);
  }

  function restoreFromServer() {
    if (!found?.server) return;
    handServer(found.server);
    router.push('/backup');
  }

  async function giveBack(piece: HeldPiece) {
    try {
      await givePieceBack(await spaceChats(), piece);
      lookSoon();
      say(t('Your chat with {name} gives the piece back as soon as it can.', { name: nameOf(piece.from) }));
    } catch (error) {
      say(errorText(error), true);
    }
  }

  async function drop(piece: HeldPiece) {
    if (!(await confirm(t('Delete this piece'), t('Without it, {name} may not be able to open their backup. Delete it only if they asked you to.', { name: nameOf(piece.from) })))) return;
    const { e2e } = await spaceChats();
    await dropHeldPiece(e2e, piece);
    await reload();
  }

  const all = new Set([...gathered, ...back]).size;

  return (
    <Page>
      <Text variant="title">{t('Backup pieces')}</Text>
      <Text variant="caption" tone="muted" style={hint}>
        {t("Your backup's password can be split into pieces for friends you trust: any 2 or 3 of them give it back, one alone shows nothing. If you lose your phone or forget the password, ask them for their pieces. Each goes inside the encryption of your chat with them, and only Erevos on their phone keeps it.")}
      </Text>

      <SectionTitle title={t('Give pieces to friends')} />
      <Card>
        <Row wrap>
          {SPLITS.map((s) => (
            <Chip
              key={`${s.k}-${s.n}`}
              label={t('{k} of {n}', { k: s.k, n: s.n })}
              selected={s === split}
              onPress={() => {
                setSplit(s);
                setChosen((now) => new Set([...now].slice(0, s.n)));
              }}
              disabled={busy}
            />
          ))}
        </Row>
        <Text variant="caption" tone="muted" style={hint}>
          {t('Choose {n} contacts. Any {k} of them can give the password back together; fewer learn nothing of it. Choose people who do not all know each other, and check their safety numbers first.', { n: split.n, k: split.k })}
        </Text>
        {contacts.length ? (
          <ContactPicker contacts={contacts.map((c) => ({ identity: c.identity, name: c.name || t('A contact with no name') }))} chosen={chosen} onToggle={toggle} />
        ) : (
          <Text tone="muted">{t('No contacts yet.')}</Text>
        )}
        {cloud ? (
          <Row wrap>
            <Chip label={t('With the server {server}', { server: cloudLabel(cloud) })} selected={withServer} onPress={() => setWithServer(!withServer)} disabled={busy} />
          </Row>
        ) : null}
        {cloud && withServer ? (
          <Text variant="caption" tone="muted" style={hint}>
            {t("The pieces hold the server's address, user name and password too, so the backups there can be found and opened with them.")}
          </Text>
        ) : null}
        <Row wrap>
          <Button title={t('Give the pieces')} compact onPress={() => setAsking(true)} disabled={busy || chosen.size !== split.n} />
        </Row>
        {given.map((g) => (
          <Text key={g.set} variant="caption" tone="muted" style={hint}>
            {t('{when}: {k} of {n}, to {names}.', { when: whenText(g.at), k: g.k, n: g.n, names: g.to.map(nameOf).join(', ') })}
          </Text>
        ))}
        {given.length ? (
          <Text variant="caption" tone="muted" style={hint}>
            {t('A new password for backups makes pieces given before of no use: give new ones.')}
          </Text>
        ) : null}
      </Card>

      <SectionTitle title={t('Put your pieces together')} />
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          {t("Ask friends for their pieces. Each finds theirs here, under Pieces you keep for friends: scan the code on their phone, paste what they copied for you, or let them give it back in your chat, if this is still your account.")}
        </Text>
        <Field label={t('A piece')}>
          <Input value={pasted} onChangeText={setPasted} autoCapitalize="none" autoCorrect={false} multiline placeholder="erevos-piece:…" accessibilityLabel={t('A piece')} />
        </Field>
        <Row wrap>
          <Button title={t('Add')} kind="secondary" compact onPress={() => add(pasted)} disabled={!pasted.trim()} />
          {Platform.OS !== 'web' ? <Button title={t('Scan a code')} kind="secondary" compact onPress={() => void scan()} /> : null}
          <Button title={t('Put together')} compact onPress={() => void putThemTogether()} disabled={all < 2} />
        </Row>
        <Text variant="caption" tone="muted" style={hint}>
          {plural(all, '{n} piece here.', '{n} pieces here.')}
        </Text>
        {found ? (
          <>
            <Text variant="bodyStrong">{t('The password for your backups')}</Text>
            <Text variant="mono" selectable>
              {found.password}
            </Text>
            {found.server ? (
              <Text variant="caption" tone="muted" style={hint}>
                {t('Your backups are on {server}, as user {user}.', { server: cloudLabel(found.server), user: found.server.user })}
              </Text>
            ) : null}
            <Row wrap>
              {CAN_COPY ? <Button title={t('Copy the password')} kind="secondary" compact onPress={() => void copyText(found.password)} /> : null}
              {found.server ? <Button title={t('Restore from that server')} compact onPress={restoreFromServer} /> : null}
              <Button title={t('Forget them')} kind="secondary" compact onPress={() => void forgetFound()} />
            </Row>
          </>
        ) : null}
      </Card>

      <SectionTitle title={t('Pieces you keep for friends')} />
      <Card>
        {held.length ? null : <Text tone="muted">{t('None. When a contact gives you a piece of theirs, it shows here.')}</Text>}
        {held.map((piece) => (
          <Card key={`${piece.from}-${piece.p}`}>
            <Text variant="bodyStrong">{nameOf(piece.from)}</Text>
            <Text variant="caption" tone="muted">
              {t('Kept since {when}.', { when: whenText(piece.at) })}
            </Text>
            {showing === piece.p ? (
              <>
                <QrCode text={piece.p} size={260} />
                <Text variant="caption" tone="muted" style={hint}>
                  {t('Show this code only to {name}, in person, or to whoever they told you face to face. Someone else asking for it may be pretending.', { name: nameOf(piece.from) })}
                </Text>
              </>
            ) : null}
            <Row wrap>
              <Button title={showing === piece.p ? t('Hide the code') : t('Show the code')} kind="secondary" compact onPress={() => setShowing(showing === piece.p ? null : piece.p)} />
              {CAN_COPY ? <Button title={t('Copy')} kind="secondary" compact onPress={() => void copyText(piece.p)} /> : null}
              {contacts.some((c) => c.identity === piece.from) ? <Button title={t('Give it back in your chat')} kind="secondary" compact onPress={() => void giveBack(piece)} /> : null}
              <Button title={t('Delete')} kind="secondary" compact onPress={() => void drop(piece)} />
            </Row>
          </Card>
        ))}
      </Card>

      {note ? (
        <Text variant="label" color={note.bad ? colors.danger : colors.success}>
          {note.text}
        </Text>
      ) : null}

      <PasswordSheet
        visible={asking}
        title={t('Password of your backups')}
        repeat={!hasAuto}
        least={hasAuto ? 1 : MIN_BACKUP_PASSWORD}
        hint={hasAuto ? t('The password automatic backups are made with: Erevos checks it is theirs.') : t('The password you made your backups with. Erevos cannot check it, as automatic backups are off: type it carefully.')}
        submitLabel={t('Give the pieces')}
        onClose={() => setAsking(false)}
        onSubmit={give}
      />
    </Page>
  );
}

const hint = { fontSize: 14, lineHeight: 20 };
