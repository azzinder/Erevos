import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SmsActions, type SmsTarget } from '../components/sms-actions';
import { Button, Card, Page, Row, Text } from '../components/ui';
import { UndoBar } from '../components/undo-bar';
import { confirm } from '../lib/alert';
import { lang, plural, t } from '../lib/i18n';
import { rowTime, type InboxSms } from '../lib/inbox';
import { emptyTrash, onSmsOrderChanged, smsOrderChanged, sortSms, trashGoesAt } from '../lib/sms-folders';
import { groupName, smsNumbers } from '../lib/sms-group';
import { sameNumber } from '../lib/sms-invite';
import { SmsLink } from '../lib/sms-link';
import { loadE2EData } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { TRASH_DAYS, type Trashed } from '../lock/sms-data';
import { blockedNumbers, contactNames, deleteSmsThread, smsStatus, smsThreads, smsToolsReady } from '../modules/erevos-sms';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// One of the space's SMS folders (lib/sms-folders.ts): the Archive, Spam or the Trash. Archived and
// spam conversations open as they do from the list, and held down show what can be done to them.
// What is in the Trash can be brought back, or deleted from the phone now, all of it with Empty the
// Trash; each part goes from the phone by itself TRASH_DAYS after it was put there, when Erevos
// opens. The folders are this space's own: another space sees the phone's SMS as they are.

type Folder = 'archived' | 'spam' | 'trash';

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function SmsFolderScreen() {
  const params = useLocalSearchParams<{ folder?: string }>();
  const folder: Folder = params.folder === 'spam' ? 'spam' : params.folder === 'trash' ? 'trash' : 'archived';
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<InboxSms[] | null>(null);
  const [trash, setTrash] = useState<Trashed[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<SmsTarget | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    const { space: current, key } = currentSpace();
    void (async () => {
      const [threads, link, blocked, data] = await Promise.all([
        smsThreads(),
        SmsLink.open(current, key),
        blockedNumbers(),
        loadE2EData('space', current, key).catch(() => null),
      ]);
      const found: Record<string, string> = link.names ? await contactNames(threads.flatMap((th) => smsNumbers(th.address))).catch(() => ({})) : {};
      const phones = (data?.contacts ?? []).flatMap((c) => (c.phone ? [c.phone] : []));
      const named = threads.map((th) => ({ ...th, name: smsNumbers(th.address).length === 1 ? found[smsNumbers(th.address)[0]] : undefined }));
      const sorted = sortSms(named, link.state, blocked, (th) => !!th.name || phones.some((p) => sameNumber(p, th.address)));
      setNames(found);
      setRows(folder === 'spam' ? sorted.spam : sorted.archived);
      setTrash([...link.state.trash].sort((a, b) => b.at - a.at));
      setNow(Date.now());
    })().catch((error) => setNote(errorText(error)));
  }, [folder]);

  useFocusEffect(
    useCallback(() => {
      load();
      return onSmsOrderChanged(load);
    }, [load]),
  );

  // A conversation's name: as the phone's contacts name its numbers, when allowed.
  function nameOf(address: string): string {
    const numbers = smsNumbers(address);
    if (numbers.length > 1) return groupName(numbers, names);
    return names[numbers[0] ?? address] || address;
  }

  // Deleting from the phone needs Erevos as its SMS app.
  function mayDelete(): boolean {
    if (smsStatus()?.isDefault && smsToolsReady()) return true;
    setNote(smsToolsReady() ? t('Only the SMS app can delete SMS: make Erevos the SMS app under SMS in the menu.') : t('This build of Erevos cannot delete SMS yet.'));
    return false;
  }

  async function deleteNow(entries: Trashed[]) {
    if (!mayDelete() || entries.length === 0) return;
    const question =
      entries.length === 1
        ? t('Delete the SMS with {name} from the phone now? They cannot be brought back.', { name: nameOf(entries[0].address) })
        : plural(entries.length, 'Delete {n} conversation from the phone now? They cannot be brought back.', 'Delete {n} conversations from the phone now? They cannot be brought back.');
    if (!(await confirm(t('Delete for good'), question, t('Delete')))) return;
    setBusy(true);
    setNote('');
    try {
      const { space: current, key } = currentSpace();
      const link = await SmsLink.open(current, key);
      const gone = await emptyTrash(link, entries, deleteSmsThread);
      if (gone < entries.length) setNote(t('Some could not be deleted. Try again.'));
      smsOrderChanged();
    } catch (error) {
      setNote(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function bringBack(entry: Trashed) {
    const { space: current, key } = currentSpace();
    try {
      await (await SmsLink.open(current, key)).untrash(entry.address);
      smsOrderChanged();
    } catch (error) {
      setNote(errorText(error));
    }
  }

  const day = (at: number) => new Date(at).toLocaleDateString(lang() === 'el' ? 'el-GR' : undefined, { day: 'numeric', month: 'short' });
  const title = folder === 'spam' ? t('Spam') : folder === 'trash' ? t('Trash') : t('Archived conversations');
  return (
    <View style={styles.screen}>
      <Page>
        <Text variant="title">{title}</Text>
        <Text variant="caption" tone="muted">
          {folder === 'spam'
            ? t('SMS from numbers you blocked or marked as spam, and those the spam filter caught. The filter works on this phone alone and sends nothing anywhere. Hold one down to say it is not spam.')
            : folder === 'trash'
              ? t('Conversations you deleted, kept {days} days in case you want them back, then deleted from the phone. Only this space hides them meanwhile: they are still in the phone\'s SMS.', { days: TRASH_DAYS })
              : t('Conversations you archived. One comes back to the list when a new SMS comes from them. Hold one down for more.')}
        </Text>
        {folder === 'spam' ? <Button title={t('Spam filter')} kind="secondary" compact onPress={() => router.push('/sms-settings')} /> : null}

        {folder === 'trash' ? (
          <>
            {trash.length > 0 ? <Button title={t('Empty the Trash')} kind="danger" compact disabled={busy} onPress={() => void deleteNow(trash)} /> : null}
            {trash.map((entry) => (
              <Card key={entry.address}>
                <Text variant="bodyStrong">{nameOf(entry.address)}</Text>
                <Text variant="caption" tone="muted">
                  {t('Deleted on {when}. Goes from the phone on {then}.', { when: day(entry.at), then: day(trashGoesAt(entry)) })}
                </Text>
                <Row wrap>
                  <Button title={t('Bring back')} kind="secondary" compact disabled={busy} onPress={() => void bringBack(entry)} />
                  <Button title={t('Delete now')} kind="ghost" compact disabled={busy} onPress={() => void deleteNow([entry])} />
                </Row>
              </Card>
            ))}
            {trash.length === 0 ? <Text tone="muted">{t('The Trash is empty.')}</Text> : null}
          </>
        ) : (
          <>
            {(rows ?? []).map((row) => (
              <Pressable
                key={row.address}
                accessibilityRole="button"
                onPress={() => router.push(`/sms?to=${encodeURIComponent(row.address)}`)}
                onLongPress={() => setTarget({ address: row.address, name: nameOf(row.address), at: row.at, folder })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.line}>
                  <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
                    {nameOf(row.address)}
                  </Text>
                  <Text variant="caption" color={row.unread ? colors.accentText : colors.textFaint}>
                    {rowTime(row.at, now)}
                  </Text>
                </View>
                <Text variant="caption" tone={row.unread ? undefined : 'muted'} numberOfLines={1}>
                  {row.text}
                </Text>
              </Pressable>
            ))}
            {rows && rows.length === 0 ? <Text tone="muted">{folder === 'spam' ? t('No spam.') : t('Nothing archived.')}</Text> : null}
          </>
        )}
        {note ? <Text tone="muted">{note}</Text> : null}
      </Page>
      <UndoBar bottom={insets.bottom + space.lg} />
      <SmsActions target={target} onClose={() => setTarget(null)} />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    row: { gap: 3, paddingVertical: space.sm + 2, paddingHorizontal: space.sm, marginHorizontal: -space.sm, borderRadius: radius.lg },
    pressed: { backgroundColor: colors.surfacePressed },
    line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
    name: { flex: 1 },
  });
