import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoreIcon } from '../components/icons';
import { KeyboardPaddedView } from '../components/keyboard';
import { LaterPicker } from '../components/later-picker';
import { SmsActions, type SmsTarget } from '../components/sms-actions';
import { Button, Card, Chip, Input, Page, Row, Sheet, Text } from '../components/ui';
import { offerUndo, UNDO_SHOWS, UndoBar } from '../components/undo-bar';
import { ask } from '../lib/alert';
import { isContactNumber, sealedNamer } from '../lib/contact-book';
import { newContactHref } from '../lib/contacts';
import { canRelaySeal } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { toBase64Url } from '../lib/e2e';
import { forwardedTo, forwardTo, type Forwarded } from '../lib/forward';
import { Held } from '../lib/held';
import { locale, plural, t } from '../lib/i18n';
import { laterLabel } from '../lib/later';
import { relayKey } from '../lib/relay';
import { onSmsOrderChanged, shownMessages, smsFolder, trashOf } from '../lib/sms-folders';
import { groupName, sameConversation, smsAddress, smsNumbers } from '../lib/sms-group';
import { sameNumber } from '../lib/sms-invite';
import { pickMmsPhoto } from '../lib/pick-mms-photo';
import { cancelLater as cancelSmsLater, laterChanged, onLaterSent } from '../lib/sms-later';
import { chooseSim, simLabel, SmsLink } from '../lib/sms-link';
import { cleanName, loadE2EData, type Contact } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { LinkedText } from '../components/linked-text';
import { loadCurrentSpaceData } from '../lock/space-data';
import { LATER_TEXT, type LaterSms, type SmsData } from '../lock/sms-data';
import {
  blockedNumbers,
  contactCards,
  deleteSmsMessages,
  markSmsRead,
  mmsReady,
  onSmsEvent,
  resendSms,
  sendMms,
  sendSms,
  sendSmsData,
  smsMessages,
  smsPictureBytes,
  smsSims,
  smsStatus,
  smsToolsReady,
  type Sim,
  type SmsMessage,
} from '../modules/erevos-sms';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// One SMS conversation, with a number. A number linked to an Erevos contact opens that contact's
// chat instead, unless `plain` asks for the SMS. Messages here are plain SMS: the phone company can
// read them. The first one to a number that is no contact also carries a hidden invite
// (lib/sms-invite.ts), when invites are on. A contact can be linked to the number by hand. A photo
// goes as an MMS, as plain as an SMS. With two SIMs, the one to send on is chosen here, and kept
// for the number. The number shows the name and picture the phone's contacts give it, when that is
// turned on. With several numbers (`to` comma-separated) it is a group's conversation: every
// message goes to all of them as one MMS, text alone too, and each that comes says who wrote it.
// Ours are marked ✓ once they went and ✓✓✓ once the network's delivery report says they reached
// the phone. Send held down sends a text SMS later (lib/sms-later.ts), to one number only; it shows
// at the end, marked Scheduled, until it goes.
//
// What is typed and not sent is kept, sealed in the space, as the conversation's draft. A message
// sent waits the seconds chosen under SMS (5 at first), shown at the end, and can be taken back in
// that time; one that did not go is sent again with a tap. Held down, a message can be passed on to
// another number or into an Erevos chat, or deleted from the phone, with Undo for a few seconds.
// ⋮ pins, archives, marks as spam, blocks or deletes the conversation (components/sms-actions.tsx);
// the part of it in the Trash does not show here. A sender that writes with a name instead of a
// number (a bank, say) shows its SMS, and cannot be answered.

type Picture = { bytes: Uint8Array; mime: string };

/** An SMS waiting its seconds before it goes, in the space it was written in. */
type Outgoing = { id: string; to: string; text: string; photo: Picture | null; sim: number; group: boolean; space: number };

// SMS waiting to go and messages waiting to be deleted, whatever screen shows (lib/held.ts); when
// Erevos goes to the background, they are done at once.
const outbox = new Held<Outgoing>();
const deleting = new Held<{ id: string; to: string }>();
AppState.addEventListener('change', (state) => {
  if (state !== 'background') return;
  outbox.flush();
  deleting.flush();
});
// The open conversation hears which went and which could not.
const delivered = new Set<(sms: Outgoing, error: unknown) => void>();

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const messageId = (m: SmsMessage) => `${m.kind ?? 'sms'}:${m.id}`;

// The open space's SMS data, while it is still the space the SMS was written in.
async function spaceLink(space: number): Promise<SmsLink | null> {
  let open: { space: number; key: Uint8Array };
  try {
    open = currentSpace();
  } catch {
    return null;
  }
  return open.space === space ? SmsLink.open(open.space, open.key) : null;
}

// Sends an SMS whose seconds are up: as one MMS with a photo or to a group, else as an SMS; then,
// with the first SMS to a number, the hidden invite. One that could not go is kept as the
// conversation's draft, so it is not lost.
async function deliver(sms: Outgoing): Promise<void> {
  try {
    if (sms.photo || sms.group) await sendMms(sms.to, sms.text, sms.photo, sms.sim);
    else await sendSms(sms.to, sms.text, sms.sim);
  } catch (error) {
    const link = await spaceLink(sms.space).catch(() => null);
    if (link && sms.text && !link.draftFor(sms.to)) await link.setDraft(sms.to, sms.text).catch(() => undefined);
    delivered.forEach((listener) => listener(sms, error));
    return;
  }
  delivered.forEach((listener) => listener(sms, null));
  if (!sms.group) await invite(sms.to, sms.space).catch(() => undefined);
}

// With the first SMS to a number that is no contact: a hidden invite, answered through the relay
// if that phone has Erevos. Without a relay queue there is nowhere to answer, so none is sent.
async function invite(to: string, space: number) {
  const sms = await spaceLink(space);
  if (!sms || !sms.wantsInvite(to)) return;
  const data = await loadCurrentSpaceData();
  if (!data.url || !data.ownQueue) return;
  let key = '';
  if (canRelaySeal()) {
    const bytes = await relayKey({ url: data.url, token: data.token || undefined }).catch(() => null);
    if (bytes) key = toBase64Url(bytes);
  }
  try {
    await sms.invite(to, { senderHex: data.ownQueue.senderHex, relay: data.url, relayKey: key }, sendSmsData);
  } catch {
    // The SMS went; the invite goes with a later one.
  }
}

export default function Sms() {
  const params = useLocalSearchParams<{ to?: string; text?: string; plain?: string }>();
  const raw = typeof params.to === 'string' ? params.to : '';
  const numbers = smsNumbers(raw);
  // A sender that writes with a name instead of a number: its SMS show, but cannot be answered.
  const sender = numbers.length === 0 && /^[\p{L}\p{N}][\p{L}\p{N} .&_-]{0,19}$/u.test(raw.trim()) ? raw.trim() : '';
  const to = smsAddress(numbers) || sender;
  const group = numbers.length > 1;
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  // A message passed on to this conversation from another (lib/forward.ts).
  const [forwarded] = useState<Forwarded | null>(() => forwardedTo(to, sameConversation));
  const [draft, setDraft] = useState(forwarded?.text ?? (typeof params.text === 'string' ? params.text : ''));
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<Picture | null>(forwarded?.photo ?? null);
  const [sims, setSims] = useState<Sim[]>([]);
  const [sim, setSim] = useState(-1);
  const [names, setNames] = useState<Record<string, string>>({});
  const [face, setFace] = useState('');
  // Whether the number is one of the contacts, the phone's or those kept only in Erevos; null
  // while Erevos may not read them.
  const [inContacts, setInContacts] = useState<boolean | null>(null);
  const [later, setLater] = useState<LaterSms[]>([]);
  const [laterMenu, setLaterMenu] = useState(false);
  // The space's order of its SMS (lib/sms-folders.ts), and the numbers Android blocks.
  const [order, setOrder] = useState<SmsData | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  // What waits to go, and what waits to be deleted, of this conversation.
  const [pending, setPending] = useState(() => outbox.list());
  const [going, setGoing] = useState(() => deleting.list());
  const [now, setNow] = useState(Date.now());
  // The message held down, the one being passed on, and the conversation's own actions (⋮).
  const [chosen, setChosen] = useState<SmsMessage | null>(null);
  const [forwarding, setForwarding] = useState<SmsMessage | null>(null);
  const [forwardNumber, setForwardNumber] = useState('');
  const [menu, setMenu] = useState<SmsTarget | null>(null);
  const link = useRef<SmsLink | null>(null);
  // Whether the draft kept for the conversation was read: until then nothing is saved over it.
  const draftRead = useRef(false);
  const draftNow = useRef(draft);
  draftNow.current = draft;
  const twoSims = (smsStatus()?.slots ?? 0) >= 2;
  const thread = useRef<ScrollView>(null);

  const load = useCallback(() => {
    smsMessages(to)
      .then((loaded) => {
        setMessages(loaded);
        return loaded;
      })
      .catch(() => setNote(t('The SMS on this phone could not be read. Make Erevos the SMS app under SMS in the menu.')));
    markSmsRead(to).catch(() => undefined);
    // What waits to go later, and the space's order, as the phone has them now.
    const sms = link.current;
    if (sms) {
      sms
        .refresh()
        .then(() => {
          setLater(sms.later.filter((l) => sameNumber(l.to, to)));
          setOrder(sms.state);
        })
        .catch(() => undefined);
    }
  }, [to]);

  // A number that is no contact can be added as one, even with the names not shown; looked at
  // again on coming back, as from adding it.
  useFocusEffect(
    useCallback(() => {
      if (group || numbers.length !== 1) return;
      let active = true;
      void isContactNumber(numbers[0]).then((known) => active && setInContacts(known));
      return () => {
        active = false;
      };
    }, [to]),
  );

  useEffect(() => {
    const { space, key } = currentSpace();
    load();
    loadE2EData('space', space, key)
      .then((data) => {
        const linked = group || sender ? undefined : data.contacts.find((c) => c.phone && sameNumber(c.phone, to));
        if (linked && params.plain !== '1') {
          // What was passed on to the number goes into the contact's chat instead.
          if (forwarded) forwardTo(`contact:${linked.identity}`, { text: forwarded.text, photo: null });
          router.replace(`/chat?contact=${linked.identity}`);
        } else setContacts(data.contacts);
      })
      .catch(() => undefined);
    SmsLink.open(space, key)
      .then(async (opened) => {
        link.current = opened;
        setOrder(opened.state);
        if (!draftRead.current) {
          draftRead.current = true;
          const kept = opened.draftFor(to);
          if (kept) setDraft((typed) => (typed.trim() ? typed : kept));
        }
        if (!group) setLater(opened.later.filter((l) => sameNumber(l.to, to)));
        // Once names are on: the phone's contacts', else those of the contacts kept only in Erevos.
        if (opened.names) {
          const cards = await contactCards(numbers).catch(() => ({}) as Record<string, { name: string; photo: string }>);
          const sealed = await sealedNamer();
          setNames(Object.fromEntries(numbers.flatMap((n) => (cards[n]?.name || sealed(n) ? [[n, cards[n]?.name || sealed(n)]] : []))));
          setFace(group ? '' : (cards[to]?.photo ?? ''));
        }
        if (!twoSims) return;
        const [found, loaded] = await Promise.all([smsSims(), smsMessages(to, 50).catch(() => [] as SmsMessage[])]);
        const lastCame = [...loaded].reverse().find((m) => !m.mine)?.sim ?? -1;
        setSims(found);
        setSim(chooseSim(found, opened.simFor(to), lastCame));
      })
      .catch(() => undefined);
    void blockedNumbers().then(setBlocked);
    const ours = (address: string) => (numbers.length > 0 ? numbers.some((n) => sameNumber(address, n)) : sameConversation(address, to));
    const subscriptions = [onSmsEvent('onSms', ({ address }) => ours(address) && load()), onSmsEvent('onSmsSent', () => load()), onSmsEvent('onSmsDelivered', () => load())];
    const stopLater = onLaterSent(load);
    const stopOrder = onSmsOrderChanged(() => {
      load();
      void blockedNumbers().then(setBlocked);
    });
    const stopOutbox = outbox.onChange(() => setPending(outbox.list()));
    const stopDeleting = deleting.onChange(() => setGoing(deleting.list()));
    // One that went shows as the phone has it; one that could not go comes back into the field.
    const heard = (sms: Outgoing, error: unknown) => {
      if (!sameConversation(sms.to, to)) return;
      load();
      if (!error) return;
      setNote(t('Not sent. {error}', { error: errorText(error) }));
      setDraft((typed) => (typed.trim() ? typed : sms.text));
      if (sms.photo) setPhoto((shown) => shown ?? sms.photo);
    };
    delivered.add(heard);
    return () => {
      subscriptions.forEach((s) => s?.remove());
      stopLater();
      stopOrder();
      stopOutbox();
      stopDeleting();
      delivered.delete(heard);
    };
  }, [to, load, params.plain]);

  // The draft is kept a moment after typing stops, when Erevos goes to the background, and when
  // the conversation closes.
  useEffect(() => {
    if (!draftRead.current) return;
    const timer = setTimeout(() => void link.current?.setDraft(to, draft).catch(() => undefined), 1500);
    return () => clearTimeout(timer);
  }, [draft, to]);
  useEffect(() => {
    const save = () => draftRead.current && void link.current?.setDraft(to, draftNow.current).catch(() => undefined);
    const subscription = AppState.addEventListener('change', (state) => state === 'background' && save());
    return () => {
      subscription.remove();
      save();
    };
  }, [to]);

  // The seconds left of what waits to go, counted down.
  const waiting = pending.filter((p) => sameConversation(p.item.to, to));
  useEffect(() => {
    if (waiting.length === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [waiting.length]);

  if (!to) {
    return (
      <Page>
        <Text tone="muted">{t('No phone number.')}</Text>
      </Page>
    );
  }

  const trashed = order ? trashOf(to, order) : null;
  const hidden = new Set(going.filter((g) => sameConversation(g.item.to, to)).map((g) => g.item.id));
  const shown = shownMessages(messages, trashed).filter((m) => !hidden.has(messageId(m)));
  const title = group ? groupName(numbers, names) : names[to] || to;
  // Where the conversation is, by its latest message: in the list, archived, in Spam, or in the
  // Trash with nothing after.
  const last = messages[messages.length - 1] ?? null;
  const known = !!names[to] || contacts.some((c) => c.phone && sameNumber(c.phone, to));
  const folder = order && last ? smsFolder({ address: to, text: last.text, at: last.at, mine: last.mine, unread: 0, replied: messages.some((m) => m.mine) }, order, blocked, known) : 'list';

  // The SIMs show once Erevos may read the phone's state; it asks only when the owner taps.
  async function askSims() {
    const answer = await PermissionsAndroid.request('android.permission.READ_PHONE_STATE').catch(() => null);
    if (answer !== PermissionsAndroid.RESULTS.GRANTED) {
      setNote(t("Without that, SMS go on the phone's default SIM."));
      return;
    }
    const found = await smsSims();
    setSims(found);
    const lastCame = [...messages].reverse().find((m) => !m.mine)?.sim ?? -1;
    setSim(chooseSim(found, link.current?.simFor(to) ?? -1, lastCame));
  }

  // Who wrote a message in a group's conversation: the group's number as the contacts name it.
  function whose(from: string): string {
    const number = numbers.find((n) => sameNumber(n, from)) ?? from;
    return names[number] || number;
  }

  function pickSim(id: number) {
    setSim(id);
    link.current?.setSim(to, id).catch(() => undefined);
  }

  async function addPhoto() {
    setNote('');
    try {
      const picked = await pickMmsPhoto();
      if (picked) setPhoto(picked);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  // Erevos may send SMS: it is the SMS app, or the owner allows it now.
  async function maySend() {
    if (!smsStatus()?.isDefault && Platform.OS === 'android') {
      const answer = await PermissionsAndroid.request('android.permission.SEND_SMS');
      if (answer !== PermissionsAndroid.RESULTS.GRANTED) throw new Error(t('Erevos may not send SMS. Allow it, or make Erevos the SMS app.'));
    }
  }

  // Sends what is typed, after the seconds chosen to take it back (none: at once).
  async function send() {
    const text = draft.trim();
    if ((!text && !photo) || sending) return;
    setSending(true);
    setNote('');
    try {
      await maySend();
      if (group && !mmsReady()) throw new Error(t('This build of Erevos cannot send to several numbers yet.'));
      // A group's message goes to everyone as one MMS, even without a photo.
      const sms: Outgoing = { id: toBase64Url(randomBytes(9)), to, text, photo, sim, group, space: currentSpace().space };
      setDraft('');
      setPhoto(null);
      const seconds = link.current?.undo ?? 0;
      if (seconds > 0) outbox.hold(sms, seconds * 1000, deliver);
      else await deliver(sms);
    } catch (error) {
      setNote(t('Not sent. {error}', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSending(false);
    }
  }

  // Takes back an SMS before it goes: its words, and its photo, come back into the field.
  function takeBack(id: string) {
    const sms = outbox.take(id);
    if (!sms) return;
    setDraft((typed) => (typed.trim() ? `${sms.text}\n${typed}` : sms.text));
    if (sms.photo) setPhoto(sms.photo);
  }

  // Keeps the SMS typed to go at `at`: sealed in the space, and held by Android until then, which
  // sends it then with Erevos closed too (lib/sms-later.ts). Asked now whether Erevos may send, as
  // it cannot ask then.
  async function sendLater(at: number) {
    const text = draft.trim();
    const sms = link.current;
    setLaterMenu(false);
    if (!text || !sms || group || photo || at <= Date.now()) return;
    setNote('');
    try {
      if (text.length > LATER_TEXT) throw new Error(t('It is too long to send later.'));
      await maySend();
      if (!(await sms.addLater({ to, text, at, sim }))) throw new Error(t('{n} SMS already wait to go later.', { n: sms.later.length }));
      setDraft('');
      setLater(sms.later.filter((l) => sameNumber(l.to, to)));
      laterChanged();
      setNote(t('It goes on {when}, with Erevos closed too; if the phone is off then, as soon as it is on again. Tap it to cancel it.', { when: laterLabel(at) }));
    } catch (error) {
      setNote(t('Not kept. {reason}', { reason: error instanceof Error ? error.message : String(error) }));
    }
  }

  function cancelLater(sms: LaterSms) {
    ask(t('SMS later'), t('Cancel this SMS? It has not gone, and will not.'), [
      { text: t('Keep it'), style: 'cancel' },
      {
        text: t('Cancel it'),
        style: 'destructive',
        onPress: () => {
          const kept = link.current;
          if (!kept) return;
          void cancelSmsLater(kept, sms.id)
            .then((cancelled) => {
              setLater(kept.later.filter((l) => sameNumber(l.to, to)));
              laterChanged();
              if (!cancelled) {
                setNote(t('It had gone already.'));
                load();
              }
            })
            .catch((error) => setNote(t('Not cancelled. {reason}', { reason: error instanceof Error ? error.message : String(error) })));
        },
      },
    ]);
  }

  // One of ours that did not go, or did not reach their phone, goes again, in its place.
  function sendAgain(m: SmsMessage) {
    setChosen(null);
    ask(t('Send it again?'), m.text || t('Picture'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Send again'),
        onPress: () =>
          void (async () => {
            setNote('');
            try {
              await maySend();
              if (smsToolsReady()) await resendSms(m, sim);
              else if (m.kind !== 'mms') await sendSms(to, m.text, sim);
              else throw new Error(t('This build of Erevos cannot send an MMS again yet.'));
              load();
            } catch (error) {
              setNote(t('Not sent. {error}', { error: errorText(error) }));
            }
          })(),
      },
    ]);
  }

  // Deletes a message from the phone after the seconds Undo shows; until then it only hides.
  function deleteOne(m: SmsMessage) {
    setChosen(null);
    if (!smsStatus()?.isDefault || !smsToolsReady()) {
      setNote(smsToolsReady() ? t('Only the SMS app can delete SMS: make Erevos the SMS app under SMS in the menu.') : t('This build of Erevos cannot delete SMS yet.'));
      return;
    }
    const id = messageId(m);
    deleting.hold({ id, to }, UNDO_SHOWS * 1000, () => deleteSmsMessages([id]).then(load));
    offerUndo({ text: t('Message deleted.'), undo: () => deleting.take(id) });
  }

  // Passes a message on: to a number, as an SMS (its picture as an MMS) to write in that
  // conversation; or into an Erevos chat, its words only. A number linked to a contact goes to
  // the contact's chat.
  async function forward(m: SmsMessage, where: { number: string } | { contact: string }) {
    setForwarding(null);
    setForwardNumber('');
    if ('contact' in where) {
      forwardTo(`contact:${where.contact}`, { text: m.text, photo: null });
      router.push(`/chat?contact=${where.contact}`);
      return;
    }
    const chosenNumbers = smsNumbers(where.number);
    if (chosenNumbers.length === 0) {
      setNote(t('Type a phone number.'));
      return;
    }
    const address = smsAddress(chosenNumbers);
    const linked = chosenNumbers.length === 1 ? contacts.find((c) => c.phone && sameNumber(c.phone, address)) : undefined;
    if (linked) {
      forwardTo(`contact:${linked.identity}`, { text: m.text, photo: null });
      router.push(`/chat?contact=${linked.identity}`);
      return;
    }
    const picture = m.pictures?.[0];
    let bytes: Picture | null = null;
    if (picture && mmsReady() && smsToolsReady()) {
      bytes = await smsPictureBytes(picture.uri)
        .then((data) => ({ bytes: data, mime: picture.type }))
        .catch(() => null);
    }
    forwardTo(address, { text: m.text, photo: bytes });
    router.push(`/sms?to=${encodeURIComponent(address)}`);
  }

  const mayAnswer = numbers.length > 0;
  const ourFailed = (m: SmsMessage) => m.mine && (m.state === 'failed' || m.state === 'undelivered');
  const chats = contacts.filter((c) => !c.request);
  return (
    <KeyboardPaddedView bottom={insets.bottom} style={styles.screen}>
      <ScrollView ref={thread} contentContainerStyle={styles.thread} onContentSizeChange={() => thread.current?.scrollToEnd({ animated: false })}>
        <View style={styles.head}>
          {face ? <Image source={{ uri: face }} style={styles.face} onError={() => setFace('')} accessibilityIgnoresInvertColors /> : null}
          <View style={styles.headText}>
            <Text variant="title">{title}</Text>
            {group ? <Text tone="muted">{plural(numbers.length, 'Group MMS · {n} number', 'Group MMS · {n} numbers')}</Text> : names[to] ? <Text tone="muted">{to}</Text> : null}
            {inContacts === false ? (
              <View style={styles.addContact}>
                <Button title={t('Add to contacts')} kind="secondary" compact onPress={() => router.push(newContactHref(numbers[0]))} />
              </View>
            ) : null}
            {folder !== 'list' ? (
              <Text variant="caption" color={colors.warning}>
                {folder === 'spam' ? t('In Spam') : folder === 'archived' ? t('Archived') : t('In the Trash')}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('More')}
            hitSlop={8}
            onPress={() => setMenu({ address: to, name: title, at: last?.at ?? Date.now(), folder })}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          >
            <MoreIcon color={colors.text} />
          </Pressable>
        </View>
        <Card>
          <Text variant="caption" color={colors.warning}>
            {t('Plain SMS: not encrypted. The phone company can read these messages.')}
          </Text>
          {contacts.length > 0 && !group && mayAnswer ? (
            choosing ? (
              <>
                <Text tone="muted">{t('Which contact is {number}? Messages to this number will go through Erevos.', { number: to })}</Text>
                <Row wrap>
                  {contacts.map((c) => (
                    <Chip
                      key={c.identity}
                      label={c.name ? cleanName(c.name) : t('contact {id}', { id: c.identity.slice(0, 8) })}
                      onPress={() => router.replace(`/chat?contact=${c.identity}&phone=${encodeURIComponent(to)}`)}
                    />
                  ))}
                </Row>
              </>
            ) : (
              <Button title={t('This number has Erevos: link it to a contact')} kind="ghost" compact onPress={() => setChoosing(true)} />
            )
          ) : null}
        </Card>
        {trashed && messages.length > shown.length && hidden.size === 0 ? (
          <Text variant="caption" tone="faint">
            {t('The messages before are in the Trash.')}
          </Text>
        ) : null}
        {shown.map((m) => (
          <Pressable
            key={messageId(m)}
            onPress={ourFailed(m) ? () => sendAgain(m) : undefined}
            onLongPress={() => setChosen(m)}
            accessibilityRole={ourFailed(m) ? 'button' : undefined}
            style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}
          >
            {(m.pictures ?? []).map((p) => (
              <Image key={p.uri} source={{ uri: p.uri }} style={styles.picture} resizeMode="cover" accessibilityLabel={t('Picture')} />
            ))}
            {group && !m.mine && m.from ? (
              <Text variant="caption" tone="muted">
                {whose(m.from)}
              </Text>
            ) : null}
            {m.text ? (
              // Not selectable here, so holding the message down shows what it can do; its words
              // can be selected and copied there.
              <Text>
                <LinkedText text={m.text} />
              </Text>
            ) : null}
            <Text variant="caption" tone="faint">
              {new Date(m.at).toLocaleString(locale())}
              {sims.length > 1 && simLabel(sims, m.sim) ? ` · ${simLabel(sims, m.sim)}` : ''}
              {m.mine ? smsMark(m.state) : ''}
            </Text>
            {ourFailed(m) ? (
              <Text variant="caption" color={colors.danger}>
                {t('Tap to send it again.')}
              </Text>
            ) : null}
          </Pressable>
        ))}
        {later.map((l) => (
          <Pressable key={l.id} onPress={() => cancelLater(l)} accessibilityRole="button" style={[styles.bubble, styles.mine, styles.later]}>
            <Text>{l.text}</Text>
            <Text variant="caption" tone="faint">
              {t('Scheduled · {when}', { when: laterLabel(l.at) })}
              {sims.length > 1 && simLabel(sims, l.sim) ? ` · ${simLabel(sims, l.sim)}` : ''}
            </Text>
          </Pressable>
        ))}
        {waiting.map(({ item, at }) => (
          <Pressable key={item.id} onPress={() => takeBack(item.id)} accessibilityRole="button" style={[styles.bubble, styles.mine, styles.later]}>
            {item.photo ? <Text variant="caption">{t('Picture')}</Text> : null}
            {item.text ? <Text>{item.text}</Text> : null}
            <Text variant="caption" color={colors.accentText}>
              {t('Goes in {n} s · tap to take it back', { n: Math.max(1, Math.ceil((at - now) / 1000)) })}
            </Text>
          </Pressable>
        ))}
        {note ? <Text tone="muted">{note}</Text> : null}
      </ScrollView>
      {mayAnswer && (sims.length > 1 || (twoSims && sims.length === 0) || photo) ? (
        <Row wrap style={styles.options}>
          {sims.length > 1 ? (
            sims.map((s) => <Chip key={s.id} label={`SIM ${s.slot + 1}${s.name ? ` · ${s.name}` : ''}`} selected={sim === s.id} onPress={() => pickSim(s.id)} />)
          ) : twoSims && sims.length === 0 ? (
            <Chip label={t('Choose the SIM')} onPress={() => void askSims()} />
          ) : null}
          {photo ? <Chip label={t('Picture · {size} KB · remove', { size: Math.ceil(photo.bytes.length / 1024) })} selected onPress={() => setPhoto(null)} /> : null}
        </Row>
      ) : null}
      {mayAnswer ? (
        <View style={styles.composer}>
          {mmsReady() ? <Button title={t('Photo')} kind="ghost" compact onPress={() => void addPhoto()} /> : null}
          <Input value={draft} onChangeText={setDraft} placeholder={photo || group ? t('MMS (not encrypted)') : t('SMS (not encrypted)')} multiline style={styles.input} />
          <Button
            title={t('Send')}
            compact
            loading={sending}
            disabled={!draft.trim() && !photo}
            onPress={() => void send()}
            onLongPress={!group && !photo && draft.trim() ? () => setLaterMenu(true) : undefined}
          />
        </View>
      ) : (
        <View style={styles.composer}>
          <Text variant="caption" tone="muted" style={styles.input}>
            {t('It writes with a name, not a number, so it cannot be answered.')}
          </Text>
        </View>
      )}
      <UndoBar bottom={84} />
      <Sheet visible={laterMenu} onClose={() => setLaterMenu(false)} title={t('SMS later')}>
        {laterMenu ? <LaterPicker onPick={(at) => void sendLater(at)} /> : null}
        <Text variant="caption" tone="muted">
          {t('It goes at that time, with Erevos closed and locked too; if the phone is off then, as soon as it is on again. Until then it is not in the phone\'s SMS: it waits locked with a key of this phone. Text only, to one number.')}
        </Text>
      </Sheet>
      <Sheet visible={chosen !== null} onClose={() => setChosen(null)}>
        {chosen ? (
          <>
            {chosen.text ? (
              <>
                <ScrollView style={styles.chosenText}>
                  <Text selectable>{chosen.text}</Text>
                </ScrollView>
                <Text variant="caption" tone="muted">
                  {t('Hold the words down to copy them.')}
                </Text>
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setForwarding(chosen);
                setChosen(null);
              }}
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
            >
              <Text variant="bodyStrong">{t('Forward')}</Text>
            </Pressable>
            {ourFailed(chosen) ? (
              <Pressable accessibilityRole="button" onPress={() => sendAgain(chosen)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <Text variant="bodyStrong">{t('Send again')}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => deleteOne(chosen)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
              <Text variant="bodyStrong" color={colors.danger}>
                {t('Delete')}
              </Text>
            </Pressable>
          </>
        ) : null}
      </Sheet>
      <Sheet visible={forwarding !== null} onClose={() => setForwarding(null)} title={t('Forward')}>
        {forwarding ? (
          <>
            <Text variant="caption" tone="muted">
              {(forwarding.pictures ?? []).length > 0
                ? t('It opens in the conversation you choose, to read and send there. To a number its picture goes too, as an MMS; into a chat only its words.')
                : t('It opens in the conversation you choose, to read and send there.')}
            </Text>
            <Row>
              <Input value={forwardNumber} onChangeText={setForwardNumber} keyboardType="phone-pad" placeholder={t('Phone number')} style={styles.input} />
              <Button title={t('Write')} compact onPress={() => void forward(forwarding, { number: forwardNumber })} />
            </Row>
            {chats.length > 0 ? (
              <>
                <Text variant="label" tone="muted">
                  {t('Into an Erevos chat')}
                </Text>
                <Row wrap>
                  {chats.map((c) => (
                    <Chip
                      key={c.identity}
                      label={c.name ? cleanName(c.name) : t('contact {id}', { id: c.identity.slice(0, 8) })}
                      onPress={() => void forward(forwarding, { contact: c.identity })}
                    />
                  ))}
                </Row>
              </>
            ) : null}
          </>
        ) : null}
      </Sheet>
      <SmsActions target={menu} onClose={() => setMenu(null)} onTrashed={() => router.canGoBack() && router.back()} />
    </KeyboardPaddedView>
  );
}

// Where one of ours is: on its way, went (✓), reached their phone (✓✓✓), or not.
function smsMark(state: SmsMessage['state']): string {
  if (state === 'failed') return ` · ${t('not sent')}`;
  if (state === 'sending') return ` · ${t('sending')}`;
  if (state === 'undelivered') return ` · ${t('not delivered')}`;
  if (state === 'delivered') return ' · ✓✓✓';
  return state === 'sent' ? ' · ✓' : '';
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    thread: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: space.lg, gap: space.sm },
    head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    headText: { flex: 1, gap: 2 },
    addContact: { flexDirection: 'row', marginTop: space.xs },
    face: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt },
    more: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    pressed: { backgroundColor: colors.surfacePressed },
    bubble: { maxWidth: '85%', padding: space.md, borderRadius: radius.lg, gap: 2 },
    mine: { alignSelf: 'flex-end', backgroundColor: colors.surfaceAlt },
    theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: colors.border },
    input: { flex: 1, maxHeight: 140 },
    options: { paddingHorizontal: space.md, paddingTop: space.sm },
    picture: { width: 220, height: 220, borderRadius: radius.md, backgroundColor: colors.border },
    later: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
    menuRow: { paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.md },
    chosenText: { flexGrow: 0, maxHeight: 220, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  });
