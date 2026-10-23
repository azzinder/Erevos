import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { MIN_BACKUP_PASSWORD, PasswordSheet } from '../components/PasswordSheet';
import { Button, Card, Chip, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask, choose as chooseOne, confirm } from '../lib/alert';
import { locale, mark, plural, t } from '../lib/i18n';
import {
  CAN_AUTO_BACKUP,
  CAN_BACK_UP,
  changeAutoBackup,
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
// (lib/backup-sms.ts), put back into the phone's SMS when it is restored.

// What the password sheet is for: a backup made now, automatic backups' password, or a backup to open.
type Asking = { kind: 'make'; folder: string } | { kind: 'auto'; every: number; folder: string } | { kind: 'open'; bytes: Uint8Array; name: string } | null;

// A backup larger than this is not one Erevos made: every space's chats are far smaller.
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

  useEffect(() => {
    loadAutoBackup().then(setAuto);
    void backsUpSms().then(setSmsToo);
  }, []);

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
      const next = await runAutoBackup(true);
      setAuto(next);
      if (next?.error) say(t('Not made. {error}', { error: next.error }), true);
      else if (next) say(t('Made a backup in {folder}.', { folder: folderLabel(next.folder) }));
    } finally {
      setBusy(false);
    }
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
          t("This backup also holds the phone's SMS. They go back into the phone's SMS only while Erevos is the SMS app: make it the SMS app under SMS in the menu, then restore again. Or restore the rest now, without them."),
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
                {t('Erevos reads them only while it is the SMS app: make it the SMS app under SMS in the menu.')}
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

      <SectionTitle title={t('Restore')} />
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          {t('Puts a backup in place of everything on {device}. Chats that went on after the backup was made may need their contact links again. Use a backup on one device at a time.', { device: t(THIS_DEVICE) })}
        </Text>
        <Row wrap>
          <Button title={t('Restore a backup')} kind="secondary" compact onPress={pickBackup} disabled={busy} />
        </Row>
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

function whenText(ms: number): string {
  return new Date(ms).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
