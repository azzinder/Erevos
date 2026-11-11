// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, StyleSheet } from 'react-native';

import { ask } from '../lib/alert';
import { showSmsOnScreen } from '../lib/background';
import { phoneFields } from '../lib/contacts';
import { forwardTo } from '../lib/forward';
import { plural, t } from '../lib/i18n';
import { loadPlace, spacePlace } from '../lib/sealed-contacts';
import { chatSmsNumber, contactSmsNumber, deletingSms, findSmsUnread, latestSms, numberOwned, SMS_PAGE, smsLineId } from '../lib/sms-chat';
import { onSmsOrderChanged, shownMessages, trashOf } from '../lib/sms-folders';
import { smsAddress, smsNumbers } from '../lib/sms-group';
import { sameNumber } from '../lib/sms-invite';
import { onLaterSent } from '../lib/sms-later';
import { chooseSim, simLabel, SmsLink } from '../lib/sms-link';
import { partsOf } from '../lib/sms-parts';
import { cleanName, type Contact } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import type { Trashed } from '../lock/sms-data';
import { phoneContacts } from '../modules/erevos-contacts';
import {
  deleteSmsMessages,
  markSmsRead,
  mmsReady,
  onSmsEvent,
  resendSms,
  sendSms,
  smsMessages,
  smsPictureBytes,
  smsReady,
  smsSims,
  smsStatus,
  smsThreads,
  smsToolsReady,
  type Sim,
  type SmsMessage,
} from '../modules/erevos-sms';
import { useStyles } from '../theme/context';
import { Button, Chip, Input, Row, Sheet, Text } from './ui';
import { offerUndo, UNDO_SHOWS } from './undo-bar';

// One SMS or MMS, held down, in its conversation (app/sms.tsx) or in a contact's Erevos chat among
// its messages (app/chat.tsx, lib/sms-chat.ts): passed on, sent again when it did not go, or deleted
// from the phone with Undo; and the chat's own reading of the SMS with the contact's number.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// What waits to be deleted is deleted at once when Erevos goes to the background (lib/held.ts),
// whichever screen it was deleted on.
AppState.addEventListener('change', (state) => state === 'background' && deletingSms.flush());

/** Whether Erevos may read the phone's SMS: it is the SMS app, or holds the permission. Never on
 *  the web or a computer, nor in a build without SMS. */
export async function smsAccess(): Promise<boolean> {
  if (Platform.OS !== 'android' || !smsReady()) return false;
  if (smsStatus()?.isDefault) return true;
  return PermissionsAndroid.check('android.permission.READ_SMS').catch(() => false);
}

/** Erevos may send SMS: it is the SMS app, or the owner allows it now. */
export async function maySendSms(): Promise<void> {
  if (!smsStatus()?.isDefault && Platform.OS === 'android') {
    const answer = await PermissionsAndroid.request('android.permission.SEND_SMS');
    if (answer !== PermissionsAndroid.RESULTS.GRANTED) throw new Error(t('Erevos may not send SMS. Allow it, or make Erevos the SMS app.'));
  }
}

/** One of ours that did not go, or did not reach their phone, goes again, in its place, on `sim`
 *  (-1: the SIM it was for), once the owner says so. */
export function sendSmsAgain(m: SmsMessage, to: string, sim: number, done: { sent: () => void; note: (note: string) => void }): void {
  ask(t('Send it again?'), m.text || t('Picture'), [
    { text: t('Cancel'), style: 'cancel' },
    {
      text: t('Send again'),
      onPress: () =>
        void (async () => {
          done.note('');
          try {
            await maySendSms();
            if (smsToolsReady()) await resendSms(m, sim);
            else if (m.kind !== 'mms') await sendSms(to, m.text, sim);
            else throw new Error(t('This build of Erevos cannot send an MMS again yet.'));
            done.sent();
          } catch (error) {
            done.note(t('Not sent. {error}', { error: errorText(error) }));
          }
        })(),
    },
  ]);
}

/** Deletes a message from the phone after the seconds Undo shows; until then it only hides
 *  (lib/sms-chat.ts, deletingSms), and `then` hears its id once it went. Only the SMS app can:
 *  otherwise it says why, and nothing goes. */
export function deleteSms(m: SmsMessage, to: string, then: (id: string) => void): string {
  if (!smsStatus()?.isDefault || !smsToolsReady()) {
    return smsToolsReady() ? t('Only the SMS app can delete SMS: make Erevos the SMS app under Settings → Phone and SMS → SMS.') : t('This build of Erevos cannot delete SMS yet.');
  }
  const id = smsLineId(m);
  deletingSms.hold({ id, to }, UNDO_SHOWS * 1000, () => deleteSmsMessages([id]).then(() => then(id)));
  offerUndo({ text: t('Message deleted.'), undo: () => deletingSms.take(id) });
  return '';
}

/** Deletes several messages from the phone, once the owner says so (`confirmed`), after the seconds
 *  Undo shows, as deleteSms does one; `gone` hears each id once it went. Only the SMS app can:
 *  otherwise `note` hears why, and nothing goes. */
export function deleteSmsMany(ms: SmsMessage[], to: string, { gone, confirmed, note }: { gone: (id: string) => void; confirmed: () => void; note: (why: string) => void }): void {
  if (ms.length === 0) return;
  if (!smsStatus()?.isDefault || !smsToolsReady()) {
    note(smsToolsReady() ? t('Only the SMS app can delete SMS: make Erevos the SMS app under Settings → Phone and SMS → SMS.') : t('This build of Erevos cannot delete SMS yet.'));
    return;
  }
  ask(t('Delete messages'), plural(ms.length, '{n} message goes from the phone.', '{n} messages go from the phone.'), [
    { text: t('Cancel'), style: 'cancel' },
    {
      text: t('Delete'),
      style: 'destructive',
      onPress: () => {
        const ids = ms.map(smsLineId);
        confirmed();
        for (const id of ids) deletingSms.hold({ id, to }, UNDO_SHOWS * 1000, () => deleteSmsMessages([id]).then(() => gone(id)));
        offerUndo({ text: plural(ids.length, 'Message deleted.', '{n} messages deleted.'), undo: () => ids.forEach((id) => deletingSms.take(id)) });
      },
    },
  ]);
}

/** Tells `listener` when the phone's SMS may have changed without Erevos writing them, while
 *  another app is the SMS app: as that app writes them while Erevos shows, and as Erevos comes back. */
export function onSmsChangedElsewhere(listener: () => void): () => void {
  const elsewhere = () => !smsStatus()?.isDefault;
  const changed = onSmsEvent('onSmsChanged', () => AppState.currentState === 'active' && elsewhere() && listener());
  const back = AppState.addEventListener('change', (state) => state === 'active' && elsewhere() && listener());
  return () => {
    changed?.remove();
    back.remove();
  };
}

/** A contact a message can be passed on to, with the number linked to them, if any. */
export type ForwardContact = { identity: string; name: string; phone?: string; request?: boolean };

/**
 * Passes a message on: to a number, as an SMS (its picture as an MMS) to write in that
 * conversation; or into an Erevos chat, its words only. A number linked to a contact goes to the
 * contact's chat. `onChat` puts the words in a chat itself (the chat screen, which shows any of its
 * contacts); without it, the chat opens with them in its field.
 */
export function SmsForward({ message, contacts, onClose, onNote, onChat }: {
  message: SmsMessage | null;
  contacts: ForwardContact[];
  onClose: () => void;
  onNote: (note: string) => void;
  onChat?: (identity: string, text: string) => void;
}) {
  const styles = useStyles(makeStyles);
  const [number, setNumber] = useState('');
  const chats = contacts.filter((c) => !c.request);

  function intoChat(identity: string, text: string) {
    if (onChat) {
      onChat(identity, text);
      return;
    }
    forwardTo(`contact:${identity}`, { text, photo: null });
    router.push(`/chat?contact=${identity}`);
  }

  async function forward(m: SmsMessage, where: { number: string } | { contact: string }) {
    onClose();
    setNumber('');
    if ('contact' in where) {
      intoChat(where.contact, m.text);
      return;
    }
    const chosen = smsNumbers(where.number);
    if (chosen.length === 0) {
      onNote(t('Type a phone number.'));
      return;
    }
    const address = smsAddress(chosen);
    const linked = chosen.length === 1 ? contacts.find((c) => c.phone && sameNumber(c.phone, address)) : undefined;
    if (linked) {
      intoChat(linked.identity, m.text);
      return;
    }
    // Its picture, voice message or contact card goes along, as the MMS's part.
    const picture = partsOf(m)[0];
    let bytes: { bytes: Uint8Array; mime: string } | null = null;
    if (picture && mmsReady() && smsToolsReady()) {
      bytes = await smsPictureBytes(picture.uri)
        .then((data) => ({ bytes: data, mime: picture.type }))
        .catch(() => null);
    }
    forwardTo(address, { text: m.text, photo: bytes });
    router.push(`/sms?to=${encodeURIComponent(address)}`);
  }

  return (
    <Sheet visible={message !== null} onClose={onClose} title={t('Forward')}>
      {message ? (
        <>
          <Text variant="caption" tone="muted">
            {(message.pictures ?? []).length > 0
              ? t('It opens in the conversation you choose, to read and send there. To a number its picture goes too, as an MMS; into a chat only its words.')
              : t('It opens in the conversation you choose, to read and send there.')}
          </Text>
          <Row>
            <Input value={number} onChangeText={setNumber} keyboardType="phone-pad" placeholder={t('Phone number')} style={styles.input} />
            <Button title={t('Write')} compact onPress={() => void forward(message, { number })} />
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
                    onPress={() => void forward(message, { contact: c.identity })}
                  />
                ))}
              </Row>
            </>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

// The contact cards of Erevos contacts (`theirs`), in the space's contacts: ones kept only in Erevos
// and linked to them, or phone contacts linked to them (whose numbers are read only then).
async function erevosCards(theirs: (identity: string) => boolean) {
  const data = await loadPlace(spacePlace());
  const sealed = data.contacts.filter((c) => !!c.erevos && theirs(c.erevos));
  const lookups = new Set(data.links.filter((l) => theirs(l.identity)).map((l) => l.lookup));
  const phone = lookups.size > 0 ? (await phoneContacts().catch(() => [])).filter((c) => lookups.has(c.lookup)).map(phoneFields) : [];
  return [...sealed, ...phone];
}

// The number on a contact card that is theirs.
const cardNumber = async (identity: string): Promise<string> => contactSmsNumber('', await erevosCards((id) => id === identity));

/** Whether `number` is an Erevos contact's: linked to one of `contacts`, or on a contact card that
 *  is theirs. No hidden invite goes to it (app/sms.tsx). */
export async function erevosNumber(number: string, contacts: Pick<Contact, 'identity' | 'phone'>[]): Promise<boolean> {
  if (numberOwned(number, contacts, [])) return true;
  const identities = new Set(contacts.map((c) => c.identity));
  return numberOwned(number, [], await erevosCards((id) => identities.has(id)));
}

/** The SMS a chat shows (lib/sms-chat.ts): its number's, the latest first, and what it does with them. */
export type ChatSms = {
  /** The number they are with, '' when none show. */
  number: string;
  /** Oldest first: those after the part of the conversation in the Trash, and not being deleted. */
  messages: SmsMessage[];
  /** There may be earlier ones, to ask for with `earlier`. */
  more: boolean;
  earlier: () => void;
  /** After one was sent here: the conversation may have started. */
  reload: () => void;
  /** After one was deleted from the phone (deleteSms): it goes at once, and the conversation may have too. */
  dropped: (id: string) => void;
  /** The SIM to send on, as the SMS screen chooses it for the number; -1 for the phone's default. */
  sim: number;
  /** Its name ("SIM 2") when the phone has two, else ''. */
  simName: string;
};

/**
 * The SMS and MMS a contact's chat shows among its messages, with the number linked to them (`phone`),
 * else a number on a contact card that is theirs: none in hidden chats, nor while Erevos may not
 * read SMS. Read again as SMS come, go or change on the phone (written by another SMS app too), as
 * Erevos comes back, and as the space's order of them does (the Trash); theirs are marked read while
 * the chat is `seen`. The SIM chosen for the number is read again as the chat shows again, from the
 * SMS screen say.
 */
export function useChatSms({ identity, phone, hidden, seen }: { identity: string; phone: string; hidden: boolean; seen: boolean }): ChatSms {
  const [access, setAccess] = useState(false);
  const [card, setCard] = useState({ identity: '', number: '' });
  const [limit, setLimit] = useState(SMS_PAGE);
  const [read, setRead] = useState<{ number: string; messages: SmsMessage[]; more: boolean }>({ number: '', messages: [], more: false });
  const [order, setOrder] = useState<{ number: string; trashed: Trashed | null }>({ number: '', trashed: null });
  const [sims, setSims] = useState<{ found: Sim[]; chosen: number }>({ found: [], chosen: -1 });
  const [going, setGoing] = useState(() => deletingSms.list());
  // The phone's conversations with the number, found as the chat opens, and again after one of them
  // may have gone: reading one asked for by its number would start it.
  const found = useRef<{ number: string; addresses: string[] }>({ number: '', addresses: [] });
  // How many of theirs the phone counts not read in them as they were found, shown or not.
  const [left, setLeft] = useState({ number: '', unread: 0 });
  const turn = useRef(0);

  // Erevos may read SMS, as it is now: looked at again as Erevos comes back, from Android's settings say.
  useEffect(() => {
    if (hidden || !identity) return;
    let active = true;
    const look = () => void smsAccess().then((may) => active && setAccess(may));
    look();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && look());
    return () => {
      active = false;
      subscription.remove();
    };
  }, [hidden, identity]);

  // Without a linked number, one on their contact card.
  useEffect(() => {
    if (hidden || !access || !identity || phone) return;
    let active = true;
    void cardNumber(identity)
      .catch(() => '')
      .then((number) => active && setCard({ identity, number }));
    return () => {
      active = false;
    };
  }, [hidden, access, identity, phone]);

  const number = chatSmsNumber({ hidden, access, phone: phone || (card.identity === identity ? card.number : '') });
  // The number as it is now, for what was read for another, or asked for before it changed.
  const numberNow = useRef(number);
  numberNow.current = number;

  // The chat on the screen: an SMS from the number only sounds (lib/background.ts).
  const focused = useIsFocused();
  useEffect(() => (number && seen && focused ? showSmsOnScreen([number]) : undefined), [number, seen, focused]);

  useEffect(() => {
    setLimit(SMS_PAGE);
  }, [number]);

  const load = useCallback((anew = false) => {
    const now = ++turn.current;
    if (!number) {
      setRead({ number: '', messages: [], more: false });
      return;
    }
    void (async () => {
      const reader = { threads: smsThreads, messages: smsMessages };
      let addresses = found.current.number === number ? found.current.addresses : [];
      if (anew || addresses.length === 0) {
        const conversations = await findSmsUnread(number, reader).catch(() => ({ addresses: [] as string[], unread: 0 }));
        addresses = conversations.addresses;
        if (numberNow.current === number) {
          found.current = { number, addresses };
          setLeft({ number, unread: conversations.unread });
        }
      }
      const latest = await latestSms(addresses, limit, reader);
      if (now === turn.current && numberNow.current === number) setRead({ number, ...latest });
    })().catch(() => undefined);
  }, [number, limit]);
  // What is asked for later (a delete after its Undo, say) reads the number and the count shown then.
  const loadNow = useRef(load);
  loadNow.current = load;

  // The part of the conversation in the Trash, and the SIM chosen for it, as the space keeps them;
  // the SIMs once Erevos may read the phone's state.
  const readOrder = useCallback(() => {
    if (!number) return;
    const { space, key } = currentSpace();
    void SmsLink.open(space, key)
      .then(async (link) => {
        const listed = await smsSims().catch(() => []);
        if (numberNow.current !== number) return;
        setOrder({ number, trashed: trashOf(number, link.state) });
        setSims({ found: listed, chosen: link.simFor(number) });
      })
      .catch(() => undefined);
  }, [number]);
  useFocusEffect(readOrder);

  useEffect(() => {
    if (!number) {
      setRead({ number: '', messages: [], more: false });
      return;
    }
    load();
    const ours = (address: string) => sameNumber(address, number);
    const subscriptions = [onSmsEvent('onSms', ({ address }) => ours(address) && load()), onSmsEvent('onSmsSent', () => load()), onSmsEvent('onSmsDelivered', () => load())];
    const stopLater = onLaterSent(() => load());
    // Another SMS app may have started or deleted the conversation, as one in the Trash may have gone.
    const stopElsewhere = onSmsChangedElsewhere(() => load(true));
    const stopOrder = onSmsOrderChanged(() => {
      load(true);
      readOrder();
    });
    return () => {
      subscriptions.forEach((s) => s?.remove());
      stopLater();
      stopElsewhere();
      stopOrder();
    };
  }, [number, load, readOrder]);

  // Being deleted, on any screen, whatever number shows now.
  useEffect(() => {
    setGoing(deletingSms.list());
    return deletingSms.onChange(() => setGoing(deletingSms.list()));
  }, []);

  // Shown once the Trash's part of the conversation is known, so none of it shows a moment.
  const hiddenIds = new Set(going.map((g) => g.item.id));
  const messages = read.number === number && order.number === number ? shownMessages(read.messages, order.trashed).filter((m) => !hiddenIds.has(smsLineId(m))) : [];

  // Theirs not read yet are read once the chat shows, as the SMS screen marks them: those that show,
  // and those that do not, older or in the Trash, which the home screen counts too.
  const unread = seen && smsStatus()?.isDefault && (messages.some((m) => !m.mine && !m.read) || (left.number === number && left.unread > 0));
  useEffect(() => {
    if (!unread) return;
    void Promise.all(found.current.addresses.map((address) => markSmsRead(address)))
      .then(() => {
        setRead((now) => ({ ...now, messages: now.messages.map((m) => (m.mine || m.read ? m : { ...m, read: true })) }));
        setLeft((now) => ({ ...now, unread: 0 }));
      })
      .catch(() => undefined);
  }, [unread]);

  const sim = chooseSim(sims.found, sims.chosen, [...messages].reverse().find((m) => !m.mine)?.sim ?? -1);
  return {
    number,
    messages,
    // None earlier but in the Trash, when the first read is there already.
    more: messages.length > 0 && read.more && !(order.trashed && (read.messages[0]?.at ?? 0) <= order.trashed.upTo),
    earlier: () => setLimit((count) => count + SMS_PAGE * 4),
    reload: () => loadNow.current(true),
    dropped: (id) => {
      setRead((now) => ({ ...now, messages: now.messages.filter((m) => smsLineId(m) !== id) }));
      loadNow.current(true);
    },
    sim,
    simName: sims.found.length > 1 ? simLabel(sims.found, sim) : '',
  };
}

const makeStyles = () =>
  StyleSheet.create({
    input: { flex: 1, maxHeight: 140 },
  });
