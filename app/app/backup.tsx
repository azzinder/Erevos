import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { PasswordSheet } from '../components/PasswordSheet';
import { Button, Card, Chip, Page, Row, SectionTitle, Text } from '../components/ui';
import { confirm } from '../lib/alert';
import {
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
import { pickFile, TooLargeError } from '../lib/pick-file';
import { backupKey, makeBackup, openBackup, restoreBackup, WrongBackupPasswordError, type Backup } from '../lock/backup';
import { useLock } from '../lock/context';
import { useTheme } from '../theme/context';

// Backups of everything Erevos keeps on the phone or computer (lock/backup.ts): made by hand into a folder the
// owner picks, made by themselves every day or week (lib/backup-folder.ts), and put back. Every
// space shows the same screen and the same settings, and a backup holds every space, so nothing
// here says how many there are.

// What the password sheet is for: a backup made now, automatic backups' password, or a backup to open.
type Asking = { kind: 'make'; folder: string } | { kind: 'auto'; every: number; folder: string } | { kind: 'open'; bytes: Uint8Array; name: string } | null;

// A backup larger than this is not one Erevos made: every space's chats are far smaller.
const MAX_BYTES = 200 * 1024 * 1024;

const CHOICES = [
  { label: 'Off', every: 0 },
  { label: 'Every day', every: 1 },
  { label: 'Every week', every: 7 },
];

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// What Erevos runs on here: the desktop app is the web build.
const DEVICE = Platform.OS === 'web' ? 'computer' : 'phone';
const PLACES =
  Platform.OS === 'web'
    ? 'Choose a folder, on this computer, a USB stick or a folder a cloud app keeps in step, then a password for the backup.'
    : 'Choose a folder, on the phone, a memory card or a cloud app that shows its folders, then a password for the backup.';

export default function Backups() {
  const { lockNow } = useLock();
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

  useEffect(() => {
    loadAutoBackup().then(setAuto);
  }, []);

  if (!CAN_BACK_UP) {
    return (
      <Page>
        <Text variant="title">Backups</Text>
        <Text tone="muted">Backups work on Android and in the desktop app.</Text>
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
      if (!folder) say('No folder chosen.');
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
      say('Automatic backups are off. The ones already made stay in their folder.');
      return;
    }
    if (auto) {
      setAuto(await changeAutoBackup({ every }));
      say('Saved.');
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
      if (next?.error) say(`Not made. ${next.error}`, true);
      else if (next) say(`Made a backup in ${folderLabel(next.folder)}.`);
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
      if (error instanceof TooLargeError) say('That file is not an Erevos backup.', true);
      else say(`Could not read that file. ${errorText(error)}`, true);
    } finally {
      picking.current = false;
    }
  }

  async function submit(password: string): Promise<boolean | void> {
    if (!asking) return;
    if (asking.kind === 'make') {
      const { name, size } = await writeBackup(asking.folder, await makeBackup(await backupKey(password)));
      setAsking(null);
      say(`Saved ${name} (${sizeText(size)}) in ${folderLabel(asking.folder)}. Keep its password: nothing opens the backup without it.`);
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
      if (await confirm('Replace everything', `Every space on this ${DEVICE}, with its contacts, messages and hidden chats, will be replaced by what the backup holds. What is here now and not in the backup is gone for good. Then Erevos opens as it was when the backup was made, with the passwords used then.`)) {
        await restoreBackup(backup);
        lockNow();
      }
    }
  }

  async function changePassword() {
    if (auto) setAsking({ kind: 'auto', every: auto.every, folder: auto.folder });
  }

  const every = auto?.every ?? 0;
  return (
    <Page>
      <Text variant="title">Backups</Text>
      <Text variant="caption" tone="muted" style={hint}>
        A backup is one file holding everything Erevos keeps on this {DEVICE}: every space, with its contacts, messages, voice
        messages, imported chats and hidden chats, each still sealed with its own password. The backup has a password of its
        own too.
      </Text>

      <SectionTitle title="Make a backup" />
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          {PLACES}
        </Text>
        <Row wrap>
          <Button title="Make a backup" compact onPress={make} disabled={busy} />
        </Row>
      </Card>

      <SectionTitle title="Automatic backups" />
      <Row wrap>
        {CHOICES.map((choice) => (
          <Chip key={choice.every} label={choice.label} selected={every === choice.every} onPress={() => void choose(choice.every)} disabled={busy} />
        ))}
      </Row>
      {auto ? (
        <Card>
          <Text variant="bodyStrong">Into {folderLabel(auto.folder)}</Text>
          <Text variant="caption" tone="muted" style={hint}>
            {auto.last ? `Last one ${whenText(auto.last)}.` : 'None made yet.'} Made when Erevos opens and the last one is
            older than that. The folder keeps the {KEEP} newest.
          </Text>
          {auto.error ? (
            <Text variant="caption" color={colors.danger} style={hint}>
              The last one failed: {auto.error} Erevos tries again next time it opens.
            </Text>
          ) : null}
          <Row wrap>
            <Button title={busy ? 'One moment…' : 'Back up now'} kind="secondary" compact onPress={backUpNow} disabled={busy} />
            <Button title="Change folder" kind="secondary" compact onPress={moveAuto} disabled={busy} />
            <Button title="Change password" kind="secondary" compact onPress={changePassword} disabled={busy} />
          </Row>
        </Card>
      ) : (
        <Text variant="caption" tone="muted" style={hint}>
          Erevos can make a backup by itself every day or week, into a folder you choose, with a password you set once.
        </Text>
      )}

      <SectionTitle title="Restore" />
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          Puts a backup in place of everything on this {DEVICE}. Chats that went on after the backup was made may need
          their contact links again. Use a backup on one device at a time.
        </Text>
        <Row wrap>
          <Button title="Restore a backup" kind="secondary" compact onPress={pickBackup} disabled={busy} />
        </Row>
      </Card>

      {note ? (
        <Text variant="label" color={failed ? colors.danger : colors.success}>
          {note}
        </Text>
      ) : null}

      <PasswordSheet
        visible={asking !== null}
        title={sheet?.kind === 'open' ? `Open ${sheet.name}` : sheet?.kind === 'auto' ? 'Password for automatic backups' : 'Password for this backup'}
        repeat={sheet?.kind !== 'open'}
        submitLabel={sheet?.kind === 'open' ? 'Open' : 'Save'}
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
  return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
