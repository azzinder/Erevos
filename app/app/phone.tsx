import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, FlatList, Image, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, fontStyle, Page, Row, Sheet, Text, TextButton } from '../components/ui';
import { offerUndo, UNDO_SHOWS, UndoBar } from '../components/undo-bar';
import { ask } from '../lib/alert';
import { isContactNumber } from '../lib/contact-book';
import { newContactHref } from '../lib/contacts';
import { Held } from '../lib/held';
import { mark, plural, t } from '../lib/i18n';
import { refreshKnownNames } from '../lib/known-names';
import { callLength, dialNumber, KEYS, typeKey } from '../lib/phone';
import { isBlocked, onSmsOrderChanged, smsOrderChanged } from '../lib/sms-folders';
import { sameNumber } from '../lib/sms-invite';
import {
  CALL_FILTERS,
  callClock,
  callKind,
  callMarks,
  callsWith,
  callWho,
  dayLabel,
  filterCalls,
  groupCalls,
  hiddenNumber,
  keepHistory,
  keptHistory,
  KIND_LABELS,
  withDays,
  withoutCalls,
  type CallFilter,
  type CallHistory,
  type CallRow,
} from '../lib/phone-log';
import { blockedUntil, liftGroup, liveGroups, rulesFrom, rulesJson, type PhoneRules } from '../lib/phone-rules';
import { accountLabel, callAccount, PhoneSims } from '../lib/phone-sims';
import { currentSpace } from '../lock/keys';
import {
  blockingRules,
  callHistory,
  deleteCalls,
  deleteCallsOf,
  onPhoneEvent,
  phoneAccounts,
  phoneFavourites,
  phoneGroups,
  phoneReady,
  phoneStatus,
  placeCall,
  seenMissedCalls,
  setBlockingRules,
  showCall,
  type ContactGroup,
  type Favourite,
  type LoggedCall,
  type PhoneAccount,
  type PhoneStatus,
} from '../modules/erevos-phone';
import { blockedNumbers, blockNumber, canBlockNumbers, unblockNumber } from '../modules/erevos-sms';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// The phone, with Erevos as Android's phone app (modules/erevos-phone): the keypad to call a
// number, the calls (Android's call history, with filters) and the favourites (the phone's starred
// contacts); above them, while a contact group's calls are blocked, a reminder with Lift. A call
// itself shows on the native call screen, which works with Erevos locked and over the phone's lock
// screen; this screen is behind Erevos's password like the rest of the app, unless its owner lets
// it open without it (lib/phone-open.ts): then, with Erevos locked, it shows on its own
// (app/_layout.tsx), with the names of the phone's contacts only, and calls can be looked at and
// made, nothing changed. It opens from tel: links and the phone's call button with the number
// typed in (`number`), and from Android's notice of a missed call on the calls (`tab`). With two SIMs, each call goes on the one chosen for its
// number (lib/phone-sims.ts), else on the one chosen now, which is then kept for the number.

type Tab = 'keypad' | 'recents' | 'favourites';

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'keypad', label: mark('Keypad') },
  { tab: 'recents', label: mark('Recents') },
  { tab: 'favourites', label: mark('Favourites') },
];

const tabOf = (tab: unknown): Tab => (tab === 'recents' || tab === 'favourites' ? tab : 'keypad');

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Calls deleted from Recents hide at once, and leave Android's call history once Undo has shown
// (lib/held.ts), whatever screen shows then, or at once when Erevos goes to the background. `calls`
// are the ids that hide; with a `number`, every call with it up to `before` goes, the older ones too.
type Deleting = { id: string; calls: number[]; number: string; before: number };
const deleting = new Held<Deleting>();
AppState.addEventListener('change', (state) => state === 'background' && deleting.flush());
// The ids hidden: waiting to go, or gone and not yet read again without them.
const hiding = new Set<number>();
const hidingChanged = new Set<() => void>();
const tellHiding = () => hidingChanged.forEach((listener) => listener());

// The open space's key, which the call history kept is for (lib/phone-log.ts); null while Erevos is locked.
function spaceKey(): Uint8Array | null {
  try {
    return currentSpace().key;
  } catch {
    return null;
  }
}

// Reads the call history, and keeps it for the next time the calls show.
async function readHistory(): Promise<CallHistory> {
  const space = spaceKey();
  const history = await callHistory().catch((): CallHistory => ({ allowed: false, calls: [] }));
  keepHistory(space, history);
  return history;
}

async function deleteNow(item: Deleting) {
  try {
    await (item.number ? deleteCallsOf(item.number, item.before) : deleteCalls(item.calls));
  } catch (error) {
    // They show again, and the owner hears why.
    item.calls.forEach((id) => hiding.delete(id));
    tellHiding();
    ask(t('Not done'), t('The calls were not deleted. {error}', { error: errorText(error) }), [{ text: t('OK') }]);
  }
}

export default function Phone() {
  const params = useLocalSearchParams<{ number?: string; tab?: string }>();
  return <PhoneView params={params} />;
}

/** The Phone shown with Erevos locked (app/_layout.tsx): `onOpen` shows the password screen, and
 *  `onCalled` is told just before a call is made, which takes Erevos to the background. */
export type LockedPhone = { onOpen: () => void; onCalled: () => void };

/** The Phone, with a link's details (`params`); `locked` with Erevos locked. */
export function PhoneView({ params, locked }: { params: { number?: string; tab?: string }; locked?: LockedPhone }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<PhoneStatus | null>(phoneStatus());
  const [tab, setTab] = useState<Tab>(typeof params.number === 'string' ? 'keypad' : tabOf(params.tab));
  const [number, setNumber] = useState(dialNumber(typeof params.number === 'string' ? params.number : ''));
  const [note, setNote] = useState('');
  const [accounts, setAccounts] = useState<PhoneAccount[]>([]);
  const [sims, setSims] = useState<PhoneSims | null>(null);
  // The SIM chosen on the keypad, '' until one is.
  const [chosen, setChosen] = useState('');
  // The number to call once its SIM is chosen.
  const [choosing, setChoosing] = useState<string | null>(null);

  useEffect(() => {
    if (typeof params.number !== 'string') return;
    setNumber(dialNumber(params.number));
    setTab('keypad');
  }, [params.number]);

  useEffect(() => {
    if (typeof params.tab === 'string') setTab(tabOf(params.tab));
  }, [params.tab]);

  useEffect(() => {
    // Android answers in its own screens, and calls come and go: look again then.
    const look = () => {
      setStatus(phoneStatus());
      phoneAccounts().then(setAccounts, () => setAccounts([]));
    };
    look();
    // The calls are read at once, so that they show as soon as they are opened.
    void readHistory();
    // With Erevos locked, no space is open: no SIM is kept for a number, and no name of its own shows.
    if (!locked) {
      const { space: open, key } = currentSpace();
      PhoneSims.open(open, key).then(setSims, () => setSims(null));
      // A contact linked to a number since the space opened: its calls show its name too.
      void refreshKnownNames();
    }
    const app = AppState.addEventListener('change', (state) => state === 'active' && look());
    const calls = onPhoneEvent('onCalls', () => setStatus(phoneStatus()));
    return () => {
      app.remove();
      calls?.remove();
    };
  }, []);

  // A number with a SIM kept for it shows that SIM chosen.
  useEffect(() => {
    const kept = sims?.accountFor(number) ?? '';
    if (kept && accounts.some((a) => a.id === kept)) setChosen(kept);
  }, [number, sims, accounts]);

  if (Platform.OS !== 'android' || !phoneReady()) {
    return (
      <Page>
        <Text variant="title">{t('Phone')}</Text>
        <Text tone="muted">
          {Platform.OS === 'android'
            ? t('This build of Erevos has no phone part yet. It comes with the next build of the app.')
            : t('Only Android lets another app be the phone app.')}
        </Text>
      </Page>
    );
  }

  // Calls `to` on `account`; without one, on the SIM kept for the number, or asks which. With two
  // SIMs, the one it goes on is kept for the number.
  async function call(to: string, account?: string) {
    const plain = dialNumber(to);
    if (!plain) {
      setNote(t('Type a phone number.'));
      return;
    }
    setNote('');
    const on = account ?? callAccount(accounts, sims?.accountFor(plain) ?? '');
    if (on === null) {
      setChoosing(plain);
      return;
    }
    try {
      // The phone app may call; otherwise Android asks first.
      if (!phoneStatus()?.isDefault) {
        const answer = await PermissionsAndroid.request('android.permission.CALL_PHONE');
        if (answer !== PermissionsAndroid.RESULTS.GRANTED) throw new Error(t('Erevos may not make calls. Make it the phone app under Settings.'));
      }
      locked?.onCalled();
      await placeCall(plain, on);
      if (on && accounts.length >= 2) sims?.remember(plain, on).catch(() => undefined);
    } catch (error) {
      setNote(t('Not called. {error}', { error: error instanceof Error ? error.message : String(error) }));
    }
  }

  // The SIMs show once Erevos may read the phone's state; the phone app may, else it asks.
  async function askSims() {
    const answer = await PermissionsAndroid.request('android.permission.READ_PHONE_STATE').catch(() => null);
    if (answer !== PermissionsAndroid.RESULTS.GRANTED) {
      setNote(t("Without that, calls go on the phone's default SIM."));
      return;
    }
    setAccounts(await phoneAccounts().catch(() => []));
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.top}>
        <Row style={styles.titleRow}>
          <Text variant="title" style={styles.title}>
            {t('Phone')}
          </Text>
          {locked ? (
            <Button title={t('Open Erevos')} kind="secondary" compact onPress={locked.onOpen} />
          ) : (
            <>
              <Button title={t('Contacts')} kind="secondary" compact onPress={() => router.push('/contacts')} />
              <Button title={t('Settings')} kind="secondary" compact onPress={() => router.push('/phone-settings')} />
            </>
          )}
        </Row>
        {status && status.calls > 0 ? <Button title={t('Back to the call')} onPress={showCall} /> : null}
        {status && !status.isDefault ? (
          <Card>
            <Text variant="bodyStrong">{t('Erevos is not the phone app')}</Text>
            <Text tone="muted">{t("Calls made here show on Android's own call screen until you make Erevos the phone app, under Settings.")}</Text>
          </Card>
        ) : null}
        {locked ? null : <GroupBlocks />}
        <Row style={styles.tabs}>
          {TABS.map((each) => (
            <Chip key={each.tab} label={t(each.label)} selected={tab === each.tab} onPress={() => setTab(each.tab)} />
          ))}
        </Row>
        {note && tab !== 'keypad' ? <Text tone="muted">{note}</Text> : null}
      </View>

      {tab === 'recents' ? (
        <Recents
          accounts={accounts}
          locked={!!locked}
          onCall={(to, account) => void call(to, account)}
          onEdit={(to) => {
            setNumber(dialNumber(to));
            setTab('keypad');
          }}
        />
      ) : tab === 'favourites' ? (
        <Favourites onCall={(to) => void call(to)} />
      ) : (
        <View style={styles.keypad}>
          <View style={styles.numberLine}>
            <TextInput
              value={number}
              onChangeText={(text) => setNumber(dialNumber(text))}
              // The keys below type; held down, the field still pastes a number.
              showSoftInputOnFocus={false}
              style={[styles.number, { color: colors.text }, fontStyle('400')]}
              placeholder={t('Number')}
              placeholderTextColor={colors.textFaint}
              textAlign="center"
            />
            <Pressable
              onPress={() => setNumber((n) => n.slice(0, -1))}
              onLongPress={() => setNumber('')}
              disabled={!number}
              accessibilityRole="button"
              accessibilityLabel={t('Delete')}
              hitSlop={10}
              style={({ pressed }) => [styles.erase, { opacity: !number ? 0.3 : pressed ? 0.6 : 1 }]}
            >
              <Text variant="heading" tone="muted">
                ⌫
              </Text>
            </Pressable>
          </View>
          {KEYS.map((keys) => (
            <View key={keys.join('')} style={styles.keys}>
              {keys.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setNumber((n) => typeKey(n, key))}
                  onLongPress={key === '0' ? () => setNumber((n) => typeKey(n, '+')) : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={key}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                >
                  <Text style={styles.keyText}>{key}</Text>
                  {key === '0' ? (
                    <Text variant="caption" tone="faint" style={styles.keyPlus}>
                      +
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ))}
          {accounts.length >= 2 ? (
            <Row wrap style={styles.sims}>
              {accounts.map((a) => (
                <Chip key={a.id} label={accountLabel(a)} selected={chosen === a.id} onPress={() => setChosen(a.id)} />
              ))}
            </Row>
          ) : (status?.slots ?? 0) >= 2 ? (
            <Row wrap style={styles.sims}>
              <Chip label={t('Choose the SIM')} onPress={() => void askSims()} />
            </Row>
          ) : null}
          <View style={styles.keys}>
            <Pressable
              onPress={() => void call(number, accounts.some((a) => a.id === chosen) ? chosen : undefined)}
              accessibilityRole="button"
              accessibilityLabel={t('Call')}
              style={({ pressed }) => [styles.callButton, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Text variant="label" color="#FFFFFF" style={styles.callText}>
                {t('Call')}
              </Text>
            </Pressable>
          </View>
          {note ? (
            <Text tone="muted" style={styles.note}>
              {note}
            </Text>
          ) : null}
        </View>
      )}

      <Sheet visible={choosing !== null} onClose={() => setChoosing(null)} title={t('Call on')}>
        {accounts.map((a) => (
          <Button
            key={a.id}
            title={accountLabel(a)}
            kind="secondary"
            onPress={() => {
              const to = choosing;
              setChoosing(null);
              if (to) void call(to, a.id);
            }}
          />
        ))}
        {locked ? null : (
          <Text variant="caption" tone="faint">
            {t('Erevos keeps this SIM for the number, sealed in this space, and calls it on the same SIM next time.')}
          </Text>
        )}
      </Sheet>

      <UndoBar bottom={insets.bottom + space.md} />
    </View>
  );
}

// A reminder while a contact group's calls are blocked (under Settings, lib/phone-rules.ts), each
// with Lift; read again whenever the screen shows, and each minute, so a block that is over goes.
function GroupBlocks() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [rules, setRules] = useState<PhoneRules>(() => rulesFrom(blockingRules()));
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [now, setNow] = useState(Date.now());
  const live = liveGroups(rules, now);

  useFocusEffect(
    useCallback(() => {
      const look = () => {
        setRules(rulesFrom(blockingRules()));
        setNow(Date.now());
      };
      look();
      phoneGroups().then(
        (found) => setGroups(found.groups),
        () => setGroups([]),
      );
      const minute = setInterval(() => setNow(Date.now()), 60_000);
      const app = AppState.addEventListener('change', (state) => state === 'active' && look());
      return () => {
        clearInterval(minute);
        app.remove();
      };
    }, []),
  );

  function lift(id: string) {
    const at = Date.now();
    // As the settings keep them: without the blocks that are over.
    const lifted = liftGroup(rulesFrom(blockingRules()), id);
    const kept = { ...lifted, groups: liveGroups(lifted, at) };
    setBlockingRules(rulesJson(kept, at));
    setRules(kept);
    setNow(at);
  }

  if (live.length === 0) return null;
  return (
    <Card>
      {live.map((block) => {
        const title = groups.find((g) => g.id === block.id)?.title;
        return (
          <Row key={block.id} style={styles.groupBlock}>
            <View style={styles.rowBody}>
              <Text variant="bodyStrong">
                {title ? t('Calls from the group {group} are blocked', { group: title }) : t('Calls from a contact group are blocked')}
              </Text>
              <Text variant="caption" color={colors.danger}>
                {blockedUntil(block.until, now)}
              </Text>
            </View>
            <Button title={t('Lift')} kind="secondary" compact onPress={() => lift(block.id)} />
          </Row>
        );
      })}
    </Card>
  );
}

// Android's call history, read again whenever it changes, with filters; a row opens its calls,
// which can be deleted from there, with Undo for a few seconds, and its number added to the
// contacts when it is none. With Erevos locked, calls are only looked at and made.
function Recents({ accounts, locked, onCall, onEdit }: {
  accounts: PhoneAccount[];
  locked: boolean;
  onCall: (number: string, account?: string) => void;
  onEdit: (number: string) => void;
}) {
  const styles = useStyles(makeStyles);
  // The calls last read show at once, while they are read again.
  const [history, setHistory] = useState<CallHistory | null>(() => keptHistory(spaceKey()));
  const [filter, setFilter] = useState<CallFilter>('all');
  const [account, setAccount] = useState('');
  // The ids of the calls of the row that is open.
  const [open, setOpen] = useState<number[] | null>(null);
  const [note, setNote] = useState('');
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set(hiding));
  // Android's list of blocked numbers, the SMS screens' too; null while Erevos may not read it.
  const [blocked, setBlocked] = useState<string[] | null>(null);

  useEffect(() => {
    const load = () => readHistory().then(setHistory);
    const lookBlocked = () => void canBlockNumbers().then((can) => (can ? blockedNumbers().then(setBlocked) : setBlocked(null)));
    load();
    lookBlocked();
    // Seen here, the missed calls leave Android's notice.
    seenMissedCalls();
    const changed = onPhoneEvent('onHistory', () => void load());
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void load();
      lookBlocked();
      seenMissedCalls();
    });
    const hide = () => setHidden(new Set(hiding));
    hidingChanged.add(hide);
    // A number blocked or unblocked here, in the phone settings or under SMS.
    const stopBlocked = onSmsOrderChanged(lookBlocked);
    return () => {
      changed?.remove();
      app.remove();
      hidingChanged.delete(hide);
      stopBlocked();
    };
  }, []);

  const calls = useMemo(() => withoutCalls(history?.calls ?? [], hidden), [history, hidden]);
  const items = useMemo(() => withDays(groupCalls(filterCalls(calls, filter, account)), Date.now()), [calls, filter, account]);
  const twoSims = accounts.length >= 2;
  // The open row as it is now: without the calls deleted since, gone once they all are.
  const row = useMemo<CallRow | null>(() => {
    const shown = open ? calls.filter((c) => open.includes(c.id)) : [];
    return shown.length ? { key: String(shown[0].id), kind: callKind(shown[0].type), calls: shown } : null;
  }, [open, calls]);
  const first = row?.calls[0] ?? null;
  const ofNumber = first ? callsWith(calls, first) : [];
  // Whether the open row's number is one of the contacts; one that is not can be added.
  const [known, setKnown] = useState<boolean | null>(null);
  const openNumber = !locked && first && !hiddenNumber(first) && !first.name ? first.number : '';
  useEffect(() => {
    setKnown(null);
    if (!openNumber) return;
    let active = true;
    void isContactNumber(openNumber).then((found) => active && setKnown(found));
    return () => {
      active = false;
    };
  }, [openNumber]);

  async function allow() {
    const answer = await PermissionsAndroid.request('android.permission.READ_CALL_LOG').catch(() => null);
    if (answer === PermissionsAndroid.RESULTS.GRANTED) setHistory(await readHistory());
    else setNote(t('Android did not allow it. Under Settings, Allow calls and contacts says how to.'));
  }

  // The phone app may change the call history; otherwise Android asks first.
  async function mayChange(): Promise<boolean> {
    const permission = 'android.permission.WRITE_CALL_LOG';
    if (await PermissionsAndroid.check(permission).catch(() => false)) return true;
    const answer = await PermissionsAndroid.request(permission).catch(() => null);
    if (answer === PermissionsAndroid.RESULTS.GRANTED) return true;
    setNote(t('Android did not allow it. Under Settings, Allow calls and contacts says how to.'));
    return false;
  }

  // Deletes calls from the history after the seconds Undo shows; until then they only hide. With a
  // `number`, every call with it goes, the older ones the list does not show too.
  async function remove(ids: number[], number = '', who = '') {
    if (ids.length === 0 || !(await mayChange())) return;
    setNote('');
    const id = `calls:${ids[0]}:${Date.now()}`;
    ids.forEach((c) => hiding.add(c));
    tellHiding();
    deleting.hold({ id, calls: ids, number, before: Date.now() }, UNDO_SHOWS * 1000, deleteNow);
    offerUndo({
      text: number ? t('The calls with {who} were deleted.', { who }) : plural(ids.length, 'Call deleted.', '{n} calls deleted.'),
      undo: () => {
        if (!deleting.take(id)) return;
        ids.forEach((c) => hiding.delete(c));
        tellHiding();
      },
    });
  }

  // Puts the number in Android's list of blocked numbers, or takes it out as it was written there,
  // with Undo.
  async function setNumberBlocked(number: string, block: boolean, who: string, undoable = true) {
    setNote('');
    try {
      if (block) await blockNumber(number);
      else await unblockNumber(blocked?.find((b) => sameNumber(b, number)) ?? number);
      smsOrderChanged();
      if (undoable) {
        offerUndo({
          text: block ? t('Blocked {who}.', { who }) : t('Unblocked {who}.', { who }),
          undo: () => setNumberBlocked(number, !block, who, false),
        });
      }
    } catch (error) {
      setNote(errorText(error));
    }
  }

  if (history && !history.allowed) {
    return (
      <View style={styles.tabBody}>
        <Card>
          <Text tone="muted">{t('Android does not let Erevos read the call history yet.')}</Text>
          <Button title={t('Allow the call history')} onPress={() => void allow()} />
          {note ? <Text tone="muted">{note}</Text> : null}
        </Card>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={items}
        // Android's clipping of rows off the screen closed Erevos on Fabric (a row added twice).
        removeClippedSubviews={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {CALL_FILTERS.filter((f) => f.filter !== 'blocked' || calls.some((c) => callKind(c.type) === 'blocked')).map((f) => (
                <Chip key={f.filter} label={t(f.label)} selected={filter === f.filter} onPress={() => setFilter(f.filter)} />
              ))}
              {twoSims
                ? accounts.map((a) => <Chip key={a.id} label={a.name} selected={account === a.id} onPress={() => setAccount(account === a.id ? '' : a.id)} />)
                : null}
            </ScrollView>
            {note ? <Text tone="muted">{note}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          history ? (
            <Text tone="muted" style={styles.empty}>
              {calls.length ? t('No calls of this kind.') : t('No calls yet.')}
            </Text>
          ) : null
        }
        renderItem={({ item }) =>
          item.kind === 'day' ? (
            <Text variant="caption" tone="faint" style={styles.day}>
              {item.label}
            </Text>
          ) : (
            <CallLine
              row={item.row}
              accounts={twoSims ? accounts : []}
              onOpen={() => setOpen(item.row.calls.map((c) => c.id))}
              onCall={() => onCall(item.row.calls[0].number)}
            />
          )
        }
      />

      <Sheet visible={row !== null} onClose={() => setOpen(null)} title={first ? callWho(first) : ''}>
        {row ? (
          <CallDetails
            row={row}
            accounts={twoSims ? accounts : []}
            // One of several; the sheet closes so that Undo shows.
            onDelete={
              !locked && row.calls.length > 1
                ? (call) => {
                    setOpen(null);
                    void remove([call.id]);
                  }
                : undefined
            }
          />
        ) : null}
        {row && first && !hiddenNumber(first) ? (
          <>
            {twoSims ? (
              accounts.map((a) => (
                <Button
                  key={a.id}
                  title={t('Call on {sim}', { sim: accountLabel(a) })}
                  onPress={() => {
                    setOpen(null);
                    onCall(first.number, a.id);
                  }}
                />
              ))
            ) : (
              <Button
                title={t('Call')}
                onPress={() => {
                  setOpen(null);
                  onCall(first.number);
                }}
              />
            )}
            {locked ? null : (
              <Button
                title={t('Send an SMS')}
                kind="secondary"
                onPress={() => {
                  setOpen(null);
                  router.push(`/sms?to=${encodeURIComponent(first.number)}`);
                }}
              />
            )}
            {known === false ? (
              <Button
                title={t('Add to contacts')}
                kind="secondary"
                onPress={() => {
                  setOpen(null);
                  router.push(newContactHref(first.number));
                }}
              />
            ) : null}
            <Button
              title={t('Change the number before calling')}
              kind="secondary"
              onPress={() => {
                setOpen(null);
                onEdit(first.number);
              }}
            />
            {blocked && !locked ? (
              <Button
                title={isBlocked(first.number, blocked) ? t('Unblock this number') : t('Block this number')}
                kind="secondary"
                onPress={() => {
                  setOpen(null);
                  void setNumberBlocked(first.number, !isBlocked(first.number, blocked), callWho(first));
                }}
              />
            ) : null}
          </>
        ) : null}
        {row && first && !locked ? (
          <>
            <Button
              title={plural(row.calls.length, 'Delete this call', 'Delete these {n} calls')}
              kind="danger"
              onPress={() => {
                setOpen(null);
                void remove(row.calls.map((c) => c.id));
              }}
            />
            {ofNumber.length > row.calls.length ? (
              <Button
                title={t('Delete every call with this number')}
                kind="danger"
                onPress={() => {
                  setOpen(null);
                  void remove(
                    ofNumber.map((c) => c.id),
                    first.number,
                    callWho(first),
                  );
                }}
              />
            ) : null}
          </>
        ) : null}
      </Sheet>
    </>
  );
}

// What a call was, on which SIM, and how: Wi-Fi calling, HD voice.
function callDetail(call: LoggedCall, accounts: PhoneAccount[]): string {
  const marks = callMarks(call.features);
  const sim = accounts.find((a) => a.id === call.account);
  return [t(KIND_LABELS[callKind(call.type)]), sim ? sim.name : '', marks.wifi ? t('Wi-Fi calling') : '', marks.hd ? t('HD voice') : '']
    .filter(Boolean)
    .join(' · ');
}

function CallLine({ row, accounts, onOpen, onCall }: { row: CallRow; accounts: PhoneAccount[]; onOpen: () => void; onCall: () => void }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const first = row.calls[0];
  const who = callWho(first);
  const detail = callDetail(first, accounts);
  const missed = row.kind === 'missed';
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${who}, ${detail}, ${callClock(first.at)}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Face name={first.name} photo={first.photo} size={44} />
      <View style={styles.rowBody}>
        <Text variant={first.isNew ? 'bodyStrong' : 'body'} numberOfLines={1} color={missed ? colors.danger : undefined}>
          {row.calls.length > 1 ? `${who} (${row.calls.length})` : who}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text variant="caption" tone="faint">
        {callClock(first.at)}
      </Text>
      {hiddenNumber(first) ? null : (
        <Pressable
          onPress={onCall}
          accessibilityRole="button"
          accessibilityLabel={t('Call {name}', { name: who })}
          hitSlop={6}
          style={({ pressed }) => [styles.callBack, pressed && styles.pressed]}
        >
          <Text variant="heading" color={colors.success}>
            ☏
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// The calls of a row, one line each, under the number and the day; with `onDelete`, each can be
// deleted on its own.
function CallDetails({ row, accounts, onDelete }: { row: CallRow; accounts: PhoneAccount[]; onDelete?: (call: LoggedCall) => void }) {
  const first = row.calls[0];
  return (
    <View style={{ gap: space.xs }}>
      <Text tone="muted">{[first.name ? first.shown || first.number : '', dayLabel(first.at, Date.now())].filter(Boolean).join(' · ')}</Text>
      {row.calls.map((call) => (
        <Row key={call.id} style={{ gap: space.sm }}>
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            {[callClock(call.at), callDetail(call, accounts), call.duration > 0 ? callLength(call.duration) : ''].filter(Boolean).join(' · ')}
          </Text>
          {onDelete ? <TextButton title={t('Delete')} onPress={() => onDelete(call)} /> : null}
        </Row>
      ))}
    </View>
  );
}

// The phone's starred contacts, to call at a tap; one with several numbers and no default asks which.
function Favourites({ onCall }: { onCall: (number: string) => void }) {
  const styles = useStyles(makeStyles);
  const [found, setFound] = useState<{ allowed: boolean; favourites: Favourite[] } | null>(null);
  const [open, setOpen] = useState<Favourite | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const load = () => phoneFavourites().then(setFound, () => setFound({ allowed: false, favourites: [] }));
    load();
    const changed = onPhoneEvent('onHistory', () => void load());
    const app = AppState.addEventListener('change', (state) => state === 'active' && void load());
    return () => {
      changed?.remove();
      app.remove();
    };
  }, []);

  async function allow() {
    const answer = await PermissionsAndroid.request('android.permission.READ_CONTACTS').catch(() => null);
    if (answer === PermissionsAndroid.RESULTS.GRANTED) setFound(await phoneFavourites().catch(() => ({ allowed: false, favourites: [] })));
    else setNote(t('Android did not allow it. Under Settings, Allow calls and contacts says how to.'));
  }

  function tap(favourite: Favourite) {
    const only = favourite.primary || (favourite.numbers.length === 1 ? favourite.numbers[0].number : '');
    if (only) onCall(only);
    else setOpen(favourite);
  }

  if (found && !found.allowed) {
    return (
      <View style={styles.tabBody}>
        <Card>
          <Text tone="muted">{t("Android does not let Erevos read the phone's contacts yet.")}</Text>
          <Button title={t('Allow the contacts')} onPress={() => void allow()} />
          {note ? <Text tone="muted">{note}</Text> : null}
        </Card>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.list}>
        {found && found.favourites.length === 0 ? (
          <Text tone="muted" style={styles.empty}>
            {t('No favourites yet. The contacts you star show here, to call at a tap.')}
          </Text>
        ) : null}
        <View style={styles.favourites}>
          {(found?.favourites ?? []).map((f) => (
            <Pressable
              key={f.id}
              onPress={() => tap(f)}
              onLongPress={() => setOpen(f)}
              accessibilityRole="button"
              accessibilityLabel={t('Call {name}', { name: f.name })}
              style={({ pressed }) => [styles.favourite, pressed && styles.pressed]}
            >
              <Face name={f.name} photo={f.photo} size={64} />
              <Text variant="caption" numberOfLines={1} style={styles.favouriteName}>
                {f.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Sheet visible={open !== null} onClose={() => setOpen(null)} title={open?.name}>
        {(open?.numbers ?? []).map((n) => (
          <Button
            key={n.number}
            title={[n.label, n.shown || n.number].filter(Boolean).join(' · ')}
            kind={n.number === open?.primary ? 'primary' : 'secondary'}
            onPress={() => {
              setOpen(null);
              onCall(n.number);
            }}
          />
        ))}
      </Sheet>
    </>
  );
}

// A contact's photo, or the first letter of the name, or the phone's sign for a bare number.
function Face({ name, photo, size }: { name: string; photo: string; size: number }) {
  const styles = useStyles(makeStyles);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (photo) return <Image source={{ uri: photo }} style={round} accessibilityIgnoresInvertColors />;
  const letter = [...name.trim()][0]?.toUpperCase() ?? '';
  return (
    <View style={[styles.face, round]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text variant={letter ? 'bodyStrong' : 'body'} tone="muted" style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}>
        {letter || '☏'}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      backgroundColor: colors.ground,
    },
    top: {
      gap: space.md,
      paddingHorizontal: space.xl - 4,
      paddingTop: space.md,
    },
    titleRow: {
      gap: space.sm,
    },
    title: {
      flex: 1,
    },
    tabs: {
      gap: space.sm,
    },
    tabBody: {
      paddingHorizontal: space.xl - 4,
      paddingTop: space.md,
    },
    list: {
      paddingHorizontal: space.lg,
      paddingBottom: space.lg,
    },
    filters: {
      gap: space.sm,
      paddingVertical: space.md,
    },
    empty: {
      paddingVertical: space.lg,
    },
    day: {
      paddingTop: space.md,
      paddingBottom: space.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.sm,
      paddingHorizontal: space.sm,
      marginHorizontal: -space.sm,
      borderRadius: radius.lg,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    groupBlock: {
      gap: space.sm,
    },
    callBack: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    favourites: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingTop: space.md,
    },
    favourite: {
      width: '33.33%',
      alignItems: 'center',
      gap: space.xs,
      paddingVertical: space.md,
      paddingHorizontal: space.xs,
      borderRadius: radius.lg,
    },
    favouriteName: {
      textAlign: 'center',
    },
    face: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.6),
    },
    keypad: {
      flex: 1,
      justifyContent: 'flex-end',
      gap: space.sm,
      paddingHorizontal: space.xl,
    },
    numberLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingLeft: 44,
    },
    number: {
      flex: 1,
      fontSize: 32,
      minHeight: 56,
    },
    erase: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keys: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
    },
    key: {
      width: 76,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    keyPressed: {
      backgroundColor: colors.surfacePressed,
    },
    keyText: {
      fontSize: 28,
      lineHeight: 34,
    },
    keyPlus: {
      position: 'absolute',
      bottom: 4,
    },
    sims: {
      justifyContent: 'center',
    },
    callButton: {
      width: 76,
      height: 76,
      borderRadius: 38,
      marginTop: space.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2E7D32',
    },
    callText: {
      fontSize: 14,
    },
    note: {
      textAlign: 'center',
    },
  });
