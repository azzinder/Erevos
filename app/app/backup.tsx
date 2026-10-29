import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { MIN_BACKUP_PASSWORD, PasswordSheet } from '../components/PasswordSheet';
import { Button, Card, Chip, Field, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask, choose as chooseOne, confirm } from '../lib/alert';
import { locale, mark, plural, t } from '../lib/i18n';
import {
  cloudLabel,
  cloudServer,
  cloudThroughTor,
  CLOUD_RESTORE_MOST,
  fetchFromCloud,
  listCloud,
  loadCloudBackup,
  sendToCloud,
  startCloudBackup,
  stopCloudBackup,
  tooLargeText,
  type CloudBackup,
  type CloudFile,
  type CloudServer,
} from '../lib/backup-cloud';
import { canTor } from '../lib/core';
import { onTorReady } from '../lib/relay';
import {
  CAN_AUTO_BACKUP,
  CAN_BACK_UP,
  CAN_CLOUD_BACKUP,
  CAN_CLOUD_RESTORE,
  changeAutoBackup,
  CLOUD_NEEDS_CORS,
  folderLabel,
  KEEP,
  loadAutoBackup,
  pickFolder,
  runAutoBackup,
  startAutoBackup,
  stopAutoBackup,
  writeBackup,
  type AutoBackup,
} from '../lib/backup-folder';
import { backsUpSms, canBackUpSms, phoneSmsForBackup, setBacksUpSms, smsCounts, SMS_PICTURES_MB } from '../lib/backup-sms';
import { takeHandedServer } from '../lib/backup-pieces';
import { pickFile, TooLargeError } from '../lib/pick-file';
import { SHELL } from '../lib/shell';
import { holdReceiver } from '../lib/receiver';
import { backupKey, backupPhoneSms, makeBackup, openBackup, restoreBackup, WrongBackupPasswordError, type Backup } from '../lock/backup';
import { useLock } from '../lock/context';
import { importPhoneSms, smsStatus } from '../modules/erevos-sms';
import { useTheme } from '../theme/context';

// Backups of everything Erevos keeps on the phone or computer (lock/backup.ts): made by hand into a folder the
// owner picks, made by themselves every day or week (lib/backup-folder.ts), and put back. Every
// space shows the same screen and the same settings, and a backup holds every space, so nothing
// here says how many there are. On Android a backup can hold the phone's SMS and MMS too
// (lib/backup-sms.ts), put back into the phone's SMS when it is restored. On Android, automatic
// backups can go to a server too (lib/backup-cloud.ts), once the owner gives one, and a backup there
// can be restored from the server itself; in the desktop app too, and in the web app, which makes
// no backups by itself, one sent there when the owner asks.

// What the password sheet is for: a backup made now, automatic backups' password, or a backup to open.
type Asking = { kind: 'make'; folder: string } | { kind: 'auto'; every: number; folder: string } | { kind: 'open'; bytes: Uint8Array; name: string } | { kind: 'cloud' } | null;

// A backup file larger than this is not one Erevos made: every space's chats are far smaller. One
// from a server comes up to 100 MB only (CLOUD_RESTORE_MOST), as any download (lib/net-http.ts).
const MAX_BYTES = 200 * 1024 * 1024;

const CHOICES = [
  { label: mark('Off'), every: 0 },
  { label: mark('Every day'), every: 1 },
  { label: mark('Every week'), every: 7 },
];

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// What Erevos runs on here: the desktop app is the web build, and so are the Sailfish OS app and
// the web app in a browser, on an iPhone or a computer.
const DEVICE = Platform.OS !== 'web' || SHELL === 'sailfish' ? 'phone' : SHELL ? 'computer' : 'device';
// The same, as the sentences below name it, translated where it is shown.
const THIS_DEVICE = DEVICE === 'phone' ? mark('this phone') : DEVICE === 'computer' ? mark('this computer') : mark('this device');
const PLACES =
  Platform.OS !== 'web'
    ? mark('Choose a folder, on the phone, a memory card or a cloud app that shows its folders, then a password for the backup.')
    : SHELL === 'sailfish'
      ? mark('Backups go to Documents/Erevos on the phone. Choose a password for the backup; then copy the file from there to a memory card or another device.')
      : SHELL
        ? mark('Choose a folder, on this computer, a USB stick or a folder a cloud app keeps in step, then a password for the backup.')
        : mark('Choose a password for the backup, then where to save the file: on an iPhone in Files, iCloud Drive or another app, on a computer in its downloads.');

export default function Backups() {
  const { closeNow } = useLock();
  const { colors } = useTheme();
  const [auto, setAuto] = useState<AutoBackup | null>(null);
  const [asking, setAsking] = useState<Asking>(null);
  // What the sheet asked last, so its title stays while it closes.
  const asked = useRef<Asking>(null);
  if (asking) asked.current = asking;
  const sheet = asking ?? asked.current;
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // A folder or file picker is open: a second tap opens no second one.
  const picking = useRef(false);
  // Whether backups hold the phone's SMS and MMS.
  const [smsToo, setSmsToo] = useState(false);
  // The server automatic backups go to as well, and what is typed to add one or to restore from one.
  const [cloud, setCloud] = useState<CloudBackup | null>(null);
  const [form, setForm] = useState<'add' | 'restore' | null>(null);
  const adding = form === 'add';
  // The backups on a server to restore from, newest first, once listed.
  const [listed, setListed] = useState<{ server: CloudServer; files: CloudFile[] } | null>(null);
  const [address, setAddress] = useState('');
  const [user, setUser] = useState('');
  const [secret, setSecret] = useState('');

  useEffect(() => {
    loadAutoBackup().then(setAuto);
    void loadCloudBackup().then(setCloud);
    void backsUpSms().then(setSmsToo);
    // The server backup pieces gave back (app/backup-pieces.tsx): its backups listed at once.
    const handed = takeHandedServer();
    if (handed) void listServer(handed);
  }, []);
  // Whether backups to the server go through Tor changes as Tor becomes ready.
  const [, setTorTick] = useState(0);
  useEffect(() => onTorReady(() => setTorTick((n) => n + 1)), []);

  if (!CAN_BACK_UP) {
    return (
      <Page>
        <Text variant="title">{t('Backups')}</Text>
        <Text tone="muted">{t('Backups work on Android and in the desktop app.')}</Text>
      </Page>
    );
  }

  function say(text: string, bad = false) {
    setNote(text);
    setFailed(bad);
  }

  async function chooseFolder(): Promise<string | null> {
    if (picking.current) return null;
    picking.current = true;
    try {
      const folder = await pickFolder();
      if (!folder) say(t('No folder chosen.'));
      return folder;
    } finally {
      picking.current = false;
    }
  }

  async function make() {
    say('');
    const folder = await chooseFolder();
    if (folder) setAsking({ kind: 'make', folder });
  }

  async function choose(every: number) {
    say('');
    if (every === (auto?.every ?? 0)) return;
    if (!every) {
      await stopAutoBackup();
      setAuto(null);
      setCloud(null);
      say(t('Automatic backups are off. The ones already made stay in their folder.'));
      return;
    }
    if (auto) {
      setAuto(await changeAutoBackup({ every }));
      say(t('Saved.'));
      return;
    }
    const folder = await chooseFolder();
    if (folder) setAsking({ kind: 'auto', every, folder });
  }

  async function moveAuto() {
    if (!auto) return;
    say('');
    const folder = await chooseFolder();
    if (!folder) return;
    await changeAutoBackup({ folder });
    await backUpNow();
  }

  async function backUpNow() {
    setBusy(true);
    try {
      const { auto: next, cloud: sent } = await runAutoBackup(true);
      setAuto(next);
      setCloud(sent);
      if (next?.error) say(t('Not made. {error}', { error: next.error }), true);
      else if (next && sent?.error) say(t('Made a backup in {folder}, but it did not go to the server. {error}', { folder: folderLabel(next.folder), error: sent.error }), true);
      else if (next && sent) say(t('Made a backup in {folder} and sent it to {server}.', { folder: folderLabel(next.folder), server: cloudLabel(sent) }));
      else if (next) say(t('Made a backup in {folder}.', { folder: folderLabel(next.folder) }));
    } finally {
      setBusy(false);
    }
  }

  async function addServer() {
    say('');
    setBusy(true);
    try {
      setCloud(await startCloudBackup(address, user.trim(), secret));
      setForm(null);
      setSecret('');
    } catch (error) {
      say(errorText(error), true);
      return;
    } finally {
      setBusy(false);
    }
    if (CAN_AUTO_BACKUP) await backUpNow();
    else setAsking({ kind: 'cloud' });
  }

  async function stopServer() {
    const told = CAN_AUTO_BACKUP
      ? t('Automatic backups will go only to the folder from now on. Those already on the server stay there until you delete them.')
      : t('Erevos forgets the server and its password here. The backups already on it stay there until you delete them.');
    if (!(await confirm(t('Stop sending to the server'), told))) return;
    await stopCloudBackup();
    setCloud(null);
    say(t('Backups no longer go to the server.'));
  }

  async function pickBackup() {
    if (picking.current) return;
    say('');
    picking.current = true;
    try {
      const picked = await pickFile(MAX_BYTES);
      if (picked) setAsking({ kind: 'open', ...picked });
    } catch (error) {
      if (error instanceof TooLargeError) say(t('That file is not an Erevos backup.'), true);
      else say(t('Could not read that file. {error}', { error: errorText(error) }), true);
    } finally {
      picking.current = false;
    }
  }

  // Lists the backups on the server automatic backups go to, or on the one typed in.
  async function listServer(server: CloudServer | null) {
    say('');
    setBusy(true);
    try {
      const chosen = server ?? cloudServer(address, user, secret);
      const files = await listCloud(chosen);
      setForm(null);
      setSecret('');
      if (!files.length) {
        setListed(null);
        say(t('There is no Erevos backup in that folder.'), true);
      } else setListed({ server: chosen, files });
    } catch (error) {
      say(errorText(error), true);
    } finally {
      setBusy(false);
    }
  }

  function restoreFromServer() {
    if (cloud) void listServer(cloud);
    else setForm('restore');
  }

  async function openFromServer(file: CloudFile) {
    if (!listed) return;
    // The server said how large it is: one too large is not downloaded only to be stopped.
    if (file.size > CLOUD_RESTORE_MOST) {
      say(tooLargeText(CLOUD_RESTORE_MOST), true);
      return;
    }
    say('');
    setBusy(true);
    try {
      const bytes = await fetchFromCloud(listed.server, file.name, CLOUD_RESTORE_MOST);
      setListed(null);
      setAsking({ kind: 'open', bytes, name: fileText(file) });
    } catch (error) {
      say(errorText(error), true);
    } finally {
      setBusy(false);
    }
  }

  // The fields of a server: its folder's address, user name and password.
  const serverFields = (
    <>
      <Field label={t('Folder address (WebDAV)')} hint={t('In Nextcloud: Files → Files settings → WebDAV gives the start; add a folder you made for backups, like …/remote.php/dav/files/NAME/Backups')}>
        <Input value={address} onChangeText={setAddress} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://" accessibilityLabel={t('Folder address (WebDAV)')} />
      </Field>
      <Field label={t('User name')}>
        <Input value={user} onChangeText={setUser} autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('User name')} />
      </Field>
      <Field label={t('Password')} hint={t("Best an app password made for Erevos alone, in the server's security settings: you can take it back there without changing your own.")}>
        <Input value={secret} onChangeText={setSecret} secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Password')} />
      </Field>
    </>
  );
  const serverReady = !!address.trim() && !!user.trim() && !!secret;

  async function toggleSms() {
    await setBacksUpSms(!smsToo);
    setSmsToo(!smsToo);
  }

  // What a backup holds of the phone's SMS, said after it is made.
  function smsText(sms: Uint8Array | null): string {
    const counts = sms ? smsCounts(sms) : null;
    if (!counts) return '';
    const held = ` ${t("It holds {sms} SMS and {mms} MMS of the phone's.", { sms: counts.sms, mms: counts.mms })}`;
    return counts.left > 0 ? `${held} ${plural(counts.left, '{n} picture did not fit and stayed out.', '{n} pictures did not fit and stayed out.')}` : held;
  }

  async function submit(password: string): Promise<boolean | void> {
    if (!asking) return;
    if (asking.kind === 'make') {
      const key = await backupKey(password);
      setAsking(null);
      try {
        const sms = await phoneSmsForBackup();
        const backup = await makeBackup(key, sms);
        const { name, size, where } = await writeBackup(asking.folder, backup);
        say(t('Saved {name} ({size}) in {folder}. Keep its password: nothing opens the backup without it.', { name, size: sizeText(size), folder: where ?? folderLabel(asking.folder) }) + smsText(sms));
      } catch (error) {
        say(errorText(error), true);
      }
    } else if (asking.kind === 'cloud') {
      // The web app's backup sent now, with a password of its own: it keeps none for backups.
      const key = await backupKey(password);
      setAsking(null);
      if (!cloud) return;
      setBusy(true);
      try {
        const sent = await sendToCloud(cloud, await makeBackup(key, null, true), KEEP);
        setCloud(sent);
        if (sent.error) say(t('Not sent. {error}', { error: sent.error }), true);
        else say(t('Sent a backup to {server}. Keep its password: nothing opens the backup without it.', { server: cloudLabel(sent) }));
      } catch (error) {
        say(errorText(error), true);
      } finally {
        setBusy(false);
      }
    } else if (asking.kind === 'auto') {
      await startAutoBackup(asking.every, asking.folder, await backupKey(password));
      setAsking(null);
      await backUpNow();
    } else {
      let backup: Backup;
      try {
        backup = await openBackup(asking.bytes, password);
      } catch (error) {
        if (error instanceof WrongBackupPasswordError) return false;
        throw error;
      }
      setAsking(null);
      // The phone's SMS in it go back into the phone's SMS only while Erevos is the SMS app.
      const sms = backupPhoneSms(backup);
      const putSms = !!sms && canBackUpSms() && !!smsStatus()?.isDefault;
      if (sms && !putSms) {
        const without = await chooseOne(
          t('SMS in this backup'),
          t("This backup also holds the phone's SMS. They go back into the phone's SMS only while Erevos is the SMS app: make it the SMS app under Settings → Phone and SMS → SMS, then restore again. Or restore the rest now, without them."),
          t('Cancel'),
          t('Without the SMS'),
        );
        if (!without) return;
      }
      // One a newer Erevos made may hold what this one does not know yet: that stays out.
      const newer = backup.unknown > 0 ? ` ${t('A newer Erevos made this backup: what this one does not know yet stays out. Update Erevos first to restore all of it.')}` : '';
      if (await confirm(t('Replace everything'), t('Every space on {device}, with its contacts, messages and hidden chats, will be replaced by what the backup holds. What is here now and not in the backup is gone for good. Then Erevos opens as it was when the backup was made, with the passwords used then.', { device: t(THIS_DEVICE) }) + newer)) {
        // Nothing may keep what was here over what the backup brings: the receiver stops first,
        // and starts again with the space as restored.
        const release = await holdReceiver();
        let told = '';
        try {
          await restoreBackup(backup);
          if (sms && putSms) {
            setBusy(true);
            say(t('Putting the SMS back into the phone…'));
            told = await importPhoneSms(sms).then(
              (put) => t("{sms} SMS and {mms} MMS went back into the phone's SMS. Those it had already stayed as they were.", { sms: put.sms, mms: put.mms }),
              (error) => t("The SMS could not go back into the phone's SMS: {error}", { error: errorText(error) }),
            );
          }
          closeNow();
        } finally {
          release();
        }
        if (told) ask(t('SMS'), told, [{ text: t('OK') }]);
      }
    }
  }

  async function changePassword() {
    if (auto) setAsking({ kind: 'auto', every: auto.every, folder: auto.folder });
  }

  const every = auto?.every ?? 0;
  return (
    <Page>
      <Text variant="title">{t('Backups')}</Text>
      <Text variant="caption" tone="muted" style={hint}>
        {t('A backup is one file holding everything Erevos keeps on {device}: every space, with its contacts, messages, voice messages, imported chats and hidden chats, each still sealed with its own password. The backup has a password of its own too.', { device: t(THIS_DEVICE) })}
      </Text>

      <SectionTitle title={t('Make a backup')} />
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          {t(PLACES)}
        </Text>
        <Row wrap>
          <Button title={t('Make a backup')} compact onPress={make} disabled={busy} />
        </Row>
      </Card>

      {canBackUpSms() ? (
        <>
          <SectionTitle title={t("The phone's SMS")} />
          <Card>
            <Text variant="caption" tone="muted" style={hint}>
              {t("Backups can hold the phone's SMS and MMS too, with up to {mb} MB of their pictures, sealed with the backup's password. Restoring the backup puts back into the phone's SMS each one it does not have, and deletes none.", { mb: SMS_PICTURES_MB })}
            </Text>
            {smsToo && !smsStatus()?.isDefault ? (
              <Text variant="caption" color={colors.danger} style={hint}>
                {t('Erevos reads them only while it is the SMS app: make it the SMS app under Settings → Phone and SMS → SMS.')}
              </Text>
            ) : null}
            <Row wrap>
              <Button title={smsToo ? t('Leave the SMS out') : t('Put the SMS in backups')} kind="secondary" compact onPress={toggleSms} disabled={busy} />
            </Row>
          </Card>
        </>
      ) : null}

      {CAN_AUTO_BACKUP ? null : (
        <Text variant="caption" tone="muted" style={hint}>
          {t('A browser saves a file only when you tap, so here Erevos makes no backups by itself. Make one now and then.')}
        </Text>
      )}

      {CAN_AUTO_BACKUP ? (
        <>
          <SectionTitle title={t('Automatic backups')} />
          <Row wrap>
            {CHOICES.map((choice) => (
              <Chip key={choice.every} label={t(choice.label)} selected={every === choice.every} onPress={() => void choose(choice.every)} disabled={busy} />
            ))}
          </Row>
          {auto ? (
            <Card>
              <Text variant="bodyStrong">{t('Into {folder}', { folder: folderLabel(auto.folder) })}</Text>
              <Text variant="caption" tone="muted" style={hint}>
                {auto.last ? t('Last one {when}.', { when: whenText(auto.last) }) : t('None made yet.')}{' '}
                {t('Made when Erevos opens and the last one is older than that. The folder keeps the {n} newest.', { n: KEEP })}
              </Text>
              {auto.error ? (
                <Text variant="caption" color={colors.danger} style={hint}>
                  {t('The last one failed: {error} Erevos tries again next time it opens.', { error: auto.error })}
                </Text>
              ) : null}
              <Row wrap>
                <Button title={busy ? t('One moment…') : t('Back up now')} kind="secondary" compact onPress={backUpNow} disabled={busy} />
                {SHELL === 'sailfish' ? null : <Button title={t('Change folder')} kind="secondary" compact onPress={moveAuto} disabled={busy} />}
                <Button title={t('Change password')} kind="secondary" compact onPress={changePassword} disabled={busy} />
              </Row>
            </Card>
          ) : (
            <Text variant="caption" tone="muted" style={hint}>
              {t('Erevos can make a backup by itself every day or week, into a folder you choose, with a password you set once.')}
            </Text>
          )}
        </>
      ) : null}

      {CAN_CLOUD_BACKUP && (auto || !CAN_AUTO_BACKUP) ? (
        <>
          <SectionTitle title={t('To a server too')} />
          <Card>
            {cloud ? (
              <>
                <Text variant="bodyStrong">{t('To {server}', { server: cloudLabel(cloud) })}</Text>
                <Text variant="caption" tone="muted" style={hint}>
                  {cloud.last ? t('Last one sent {when}.', { when: whenText(cloud.last) }) : t('None sent yet.')}{' '}
                  {CAN_AUTO_BACKUP
                    ? t('Each automatic backup goes there too, and the server keeps the {n} newest.', { n: KEEP })
                    : t('Send a backup there now and then; the server keeps the {n} newest.', { n: KEEP })}
                </Text>
                {canTor() ? (
                  <Text variant="caption" tone="muted" style={hint}>
                    {cloudThroughTor()
                      ? t('Through Tor: the server does not see your address.')
                      : t('Not through Tor now: the server sees your address. Tor is under Settings → Relay and networks → Tor.')}
                  </Text>
                ) : null}
                {cloud.error ? (
                  <Text variant="caption" color={colors.danger} style={hint}>
                    {CAN_AUTO_BACKUP ? t('The last one did not go: {error} Erevos tries again next time it opens.', { error: cloud.error }) : t('The last one did not go: {error}', { error: cloud.error })}
                  </Text>
                ) : null}
                <Row wrap>
                  {CAN_AUTO_BACKUP ? null : (
                    <Button title={busy ? t('One moment…') : t('Send a backup now')} kind="secondary" compact onPress={() => setAsking({ kind: 'cloud' })} disabled={busy} />
                  )}
                  <Button title={t('Stop sending')} kind="secondary" compact onPress={() => void stopServer()} disabled={busy} />
                </Row>
              </>
            ) : adding ? (
              <>
                {serverFields}
                <Row wrap>
                  <Button title={busy ? t('One moment…') : t('Connect')} compact loading={busy} onPress={() => void addServer()} disabled={busy || !serverReady} />
                  <Button title={t('Cancel')} kind="secondary" compact onPress={() => setForm(null)} disabled={busy} />
                </Row>
              </>
            ) : (
              <>
                <Text variant="caption" tone="muted" style={hint}>
                  {!CAN_AUTO_BACKUP
                    ? t(
                        "A backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV, each time you send one. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.",
                      )
                    : canTor()
                      ? t(
                          "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, when one comes and roughly how big it is, and your address unless the backup goes through Tor, as the space's Tor setting says. Nothing goes until you add one.",
                        )
                      : t(
                          "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.",
                        )}
                </Text>
                {CLOUD_NEEDS_CORS ? (
                  <Text variant="caption" tone="muted" style={hint}>
                    {t('In a browser this works only with a server set to let the web app in (CORS), which Nextcloud is not as it comes. The desktop app and Android need nothing of it.')}
                  </Text>
                ) : null}
                <Row wrap>
                  <Button title={t('Add a server')} kind="secondary" compact onPress={() => setForm('add')} disabled={busy} />
                </Row>
              </>
            )}
          </Card>
        </>
      ) : null}

      <SectionTitle title={t('Restore')} />
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          {t('Puts a backup in place of everything on {device}. Chats that went on after the backup was made may need their contact links again. Use a backup on one device at a time.', { device: t(THIS_DEVICE) })}
        </Text>
        <Row wrap>
          <Button title={t('Restore a backup')} kind="secondary" compact onPress={pickBackup} disabled={busy} />
          {CAN_CLOUD_RESTORE ? <Button title={t('Restore from a server')} kind="secondary" compact onPress={restoreFromServer} disabled={busy || form === 'restore'} /> : null}
        </Row>
        {form === 'restore' ? (
          <>
            <Text variant="caption" tone="muted" style={hint}>
              {t('The folder on your server that automatic backups went to. The password is used for this restore only and not kept.')}
            </Text>
            {serverFields}
            <Row wrap>
              <Button title={busy ? t('One moment…') : t('Look there')} compact loading={busy} onPress={() => void listServer(null)} disabled={busy || !serverReady} />
              <Button title={t('Cancel')} kind="secondary" compact onPress={() => setForm(null)} disabled={busy} />
            </Row>
          </>
        ) : null}
        {listed ? (
          <>
            <Text variant="caption" tone="muted" style={hint}>
              {t('Backups on {server}, newest first. Choose one, then type its password.', { server: cloudLabel(listed.server) })}
            </Text>
            <Row wrap>
              {listed.files.slice(0, SHOWN).map((file) => (
                <Button key={file.name} title={fileText(file)} kind="secondary" compact onPress={() => void openFromServer(file)} disabled={busy} />
              ))}
              <Button title={t('Cancel')} kind="secondary" compact onPress={() => setListed(null)} disabled={busy} />
            </Row>
          </>
        ) : null}
      </Card>

      {note ? (
        <Text variant="label" color={failed ? colors.danger : colors.success}>
          {note}
        </Text>
      ) : null}

      <PasswordSheet
        visible={asking !== null}
        title={sheet?.kind === 'open' ? t('Open {name}', { name: sheet.name }) : sheet?.kind === 'auto' ? t('Password for automatic backups') : t('Password for this backup')}
        repeat={sheet?.kind !== 'open'}
        least={MIN_BACKUP_PASSWORD}
        hint={t('A backup holds every space and all its chats, and once the file is elsewhere its password is all that guards it: use at least {n} characters, or four words.', { n: MIN_BACKUP_PASSWORD })}
        submitLabel={sheet?.kind === 'open' ? t('Open') : t('Save')}
        onClose={() => setAsking(null)}
        onSubmit={submit}
      />
    </Page>
  );
}

const hint = { fontSize: 14, lineHeight: 20 };

function sizeText(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// How many of the backups on a server are offered to restore: it keeps the newest few anyway.
const SHOWN = 10;

// A backup on a server, as the list shows it: when it came and how big it is.
function fileText(file: CloudFile): string {
  const when = file.when ? new Date(file.when).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('No date');
  return `${when} · ${sizeText(file.size)}`;
}

function whenText(ms: number): string {
  return new Date(ms).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
