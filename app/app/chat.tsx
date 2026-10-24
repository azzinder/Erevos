import { memo, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AppState, Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { takeCall } from '../lib/call-handoff';
import { keepPrivate } from '../lib/screen-privacy';
import { CAN_DIRECT, canLora, HAS_LINKS, HAS_RADIO, lora } from '../lib/radio';
import { nearbySettings, setCarryingKept, setDirectKept, setLanKept } from '../lib/nearby-links';
import { nearby, TooLargeForLoraError, type Delivery } from '../lib/nearby';
import { canWait, dropHeld, handOverHidden, heldAfter, heldFor, holdAgain, holdLater, Owed, OwedError, sendWaiting, takeBack, type SendPlace, type Went } from '../lib/waiting';
import { currentCall, soon } from '../lib/call';
import { currentGroupCall } from '../lib/group-call';
import { callPermissions } from '../lib/call-permissions';
import { CALL_LINE, callLineMessage, callSignal, endCallsOf, startCall as beginCall, type CallPlace } from '../lib/calls';
import { shownLine } from '../lib/call-lines';
import { onSpaceCallLine, spaceCalls } from '../lib/space-calls';
import { rtc } from '../lib/webrtc';
import { clearLeftovers, playVoice, useVoiceRecorder } from '../lib/audio';
import { MAX_VOICE_MS, MIN_VOICE_MS, VoiceAssembler, voiceDuration } from '../lib/voice';
import { deleteClip, loadClip, saveClip, type VoiceRef } from '../lock/voice-clips';
import { AUTO_TAKE, FileGoneError, keepFile, MAX_FILE, offerRef, sendFile, takeFile, bytesSource, refSource, type FileOffer, type Source } from '../lib/attachments';
import { canRingInBackground, messageCameAt, screenOfChat, screenOfHidden, showOnScreen } from '../lib/background';
import { cleanFileName, cleanMime, deleteChunks, mimeOf, type FileKind, type FileMeta, type FileRef } from '../lock/attachment-files';
import { CAN_TAKE_PHOTOS, NoCameraError, pickPhoto, type PhotoQuality } from '../lib/pick-photo';
import { readQrPhoto } from '../lib/read-qr';
import { pickSource, TooLargeError } from '../lib/pick-file';
import { loadPhotoQuality, savePhotoQuality } from '../lib/photo-quality';
import { saveFile, saveText } from '../lib/save-file';
import { chatText, exportName } from '../lib/chat-export';
import { Attachment, comingText, FileViewer, shownOf, useShownPhotos } from '../components/attachment';
import { ComposerPanel, DraftComposer, IconButton, useDraft, type ComposerTile, type ComposerWay, type SendWay } from '../components/composer';
import { ConnectPicker, useCanConnect } from '../components/connect-picker';
import { KeyboardAwareScrollView, KeyboardPaddedView } from '../components/keyboard';
import { PasswordSheet } from '../components/PasswordSheet';
import { QrCode } from '../components/QrCode';
import { RelayInvites } from '../components/relay-invites';
import { RelaySignIn } from '../components/relay-signin';
import { WelcomeInvite } from '../components/welcome-invite';
import { BackIcon, MoreIcon, PhoneIcon, ShieldIcon, TimerIcon, VideoIcon } from '../components/icons';
import { AVATAR_COLORS, AVATAR_SIGNS, KeyFace } from '../components/key-face';
import { Button, Chip, Field, Input, Page, Row, Sheet, Text, TextButton, Toggle } from '../components/ui';
import { useGlassBlur } from '../components/glass';
import { LaterPicker } from '../components/later-picker';
import { LinkedText } from '../components/linked-text';
import { MessageMenu, type MenuAction } from '../components/message-menu';
import { deleteSms, maySendSms, sendSmsAgain, SmsForward, useChatSms } from '../components/sms-message';
import { UndoBar } from '../components/undo-bar';
import { SwipeBack } from '../components/swipe-back';
import { openPlace, PlaceCard, Pinned, PreviewCard, Quote, Reactions } from '../components/message-parts';
import { PhotoSticker, PLAYS_LAST, StickerPicker, StickerView } from '../components/stickers';
import { PollCard, PollSheet } from '../components/poll';
import { acts, checkedChoices, choose as chooseOption, contentOf, placeText, placeWords, pollWords, withoutPreview, type Carried, type Content, type Place, type Poll } from '../lib/chat-parts';
import { firstLink, fitPreview } from '../lib/link-preview';
import { CAN_PREVIEW, makePreview } from '../lib/make-preview';
import { CAN_PLACE, findPlace } from '../lib/place';
import { keepAsSticker, stickerMeta } from '../lib/own-stickers';
import { stickerOf } from '../lib/stickers';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { searchMessages } from '../lib/message-search';
import { chatLines, isSmsLine, plainSmsHref, smsFailed, smsFindables, smsLineId, smsMark } from '../lib/sms-chat';
import { canForward, forwardedTo, forwardToGroup, takeForward, voiceCopy, type Forwardable } from '../lib/forward';
import { isSharedPhoto, readShared, takeShared } from '../lib/share-in';
import { messageLine } from '../lib/message-line';
import { canPick, laterLabel, showsAt } from '../lib/later';
import { ask, choose } from '../lib/alert';
import { contactLink, offerFor, onContactOffered, parseContact, type ContactCode, type Offer } from '../lib/contact-code';
import { onInviteOffered, parseInvite, type Invite } from '../lib/relay-invite';
import { onWelcomeOffered, parseWelcome, START_RELAY, type Welcome } from '../lib/welcome';
import { ownToken } from '../lib/relay-signin';
import { canGroup, canRelaySeal, hasCore } from '../lib/core';
import { accountLink, changedHere, linkedRole, onLinked } from '../lib/devices';
import type { ChatChange } from '../lib/link-wire';
import { BlockedContactError, E2E, fromBase64Url, ONLINE, toBase64Url, type ContactInfo, type Where, type Erase, type Extra } from '../lib/e2e';
import { sendCopies } from '../lib/fanout';
import { mediaText, shownTime, SOURCE_LABELS } from '../lib/imports';
import { Archive } from '../lock/archive';
import { MIN_PIN, openHidden, setHiddenPassword, type HiddenPlace } from '../lock/hidden';
import { isWatchedQueue, loadWatched, unwatchPocket, watchPocket } from '../lock/hidden-watch';
import { isRingedQueue, loadRinged, moveRingPocket, ringPocket, unringPocket } from '../lock/hidden-ring';
import { hiddenHolder, POCKETS } from '../lock/sealed-file';
import { openOwnSticker, type OwnSticker, type StickerPlace } from '../lock/sticker-data';
import { moveChat } from '../lock/move-chat';
import { SamePasswordError } from '../lock/config';
import { LockedOutError, lockedOutMessage } from '../lock/tries';
import { cleanName, MAX_NAME, type Avatar, type Blocked, type Spare } from '../lock/e2e-data';
import { placeQueues, type QueueKind } from '../lock/queues-data';
import { QueueMove, linkOf, spaceMover, tookOf, type MoveWhy, type Took } from '../lib/queue-move';
import { FAKE_RINGS_WITHIN, fakeRings, linkSpare } from '../lib/moves';
import { HIDDEN_OFFER_MS, hiddenAnswerAt, lapseHiddenAnswer } from '../lib/hidden-ring';
import { savePhoto } from '../lock/avatar-photos';
import { pickAvatar } from '../lib/pick-avatar';
import { takeHidden } from '../lib/hidden-handoff';
import { setOpenHiddenPlace, useOpenHiddenPlace } from '../lib/hidden-contacts';
import { giveLinkedName } from '../lib/linked-name';
import { linkCard, type Place as SealedPlace } from '../lib/sealed-contacts';
import type { Among, Card as ContactCard } from '../lib/contact-book';
import { History, isTag, newTag, WAITING, type Mark, type Message as Kept, type Parts } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadHiddenData, NO_LENDING, updateCurrentSpaceData, updateHiddenData, type Queue, type SpaceData } from '../lock/space-data';
import { isGroupPacket, type GroupInfo } from '../lib/groups';
import { spaceGroups, takeGroupPacket, takeGroupSignal } from '../lib/space-groups';
import {
  borrowPlace,
  callRelay,
  carryTo,
  createQueue,
  deleteQueue,
  fromHex,
  isLentToken,
  isQueueNotFound,
  lendTicket,
  receiveMessage,
  redeemInvite,
  relayKey,
  sameRelay,
  sendMessage,
  throughTor,
  ticketExpires,
  toHex,
  type CallRelay,
  type HeldAt,
  type Mark as RelayMark,
  type Relay,
} from '../lib/relay';
import { answersAsk, appShown, awayPace, awayQueues, holdReceiver, isNews, openNearby, takeNearby, takeNostr, waitWhileAway, type Waited } from '../lib/receiver';
import { readNostr } from '../lib/nostr';
import { answerInvites, linkInviter, refreshSmsLink, takeInviteAnswer } from '../lib/sms-relay';
import { carriedFor, contactTarget, markOf, relayFor, ringOffer, sendSealed, sentMark, spaceChats } from '../lib/space-chats';
import { nostrReaderOf, orNostr, sendNostrBackups, type ForNostr } from '../lib/nostr-chats';
import { forgetSpare, hiddenSpare, lookAtSpare, readySpare, setSpareRelay, spaceSpare, spareBackup, spareCode } from '../lib/spare';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { bubbleStyles } from '../theme/bubbles';
import { useColors, useStyles, useTheme } from '../theme/context';
import { ChatTheme } from '../theme/chat-theme';
import { sendSms, type SmsMessage } from '../modules/erevos-sms';
import type { Look } from '../theme/look';
import { ScreenBackdrop } from '../components/backdrop';
import { AppearanceEditor } from './appearance';
import { t, plural, mark, locale, useLang } from '../lib/i18n';

// Chat with contacts, end-to-end encrypted (lib/e2e.ts), through the relay and, while their phone
// is near, over the radio link too (lib/nearby.ts), where phones nearby may also carry a message
// to the contact's relay when ours cannot be reached. A contact is added from their contact link, which
// carries their public keys: adding it starts the conversation, and they see the contact appear
// when they next look at the relay. The contacts and their conversations are kept sealed
// (lock/e2e-data.ts), with the names given to them, and so are the messages with them
// (lock/history.ts). One message, or all of a chat's, can be deleted here only or on both phones
// (Erase in lib/e2e.ts). Our messages to a contact are marked ✓ once the relay took them, ✓✓ once
// their phone says they came, and ✓✓✓ once it says they were read; theirs are read here while
// their chat shows on the screen. A chat's new messages, or a single one, can disappear on both
// phones a time after they are read (the timer in lib/e2e.ts). Voice messages are recorded while
// the message bar's microphone is held (lib/audio.ts, components/composer.tsx), travel in parts
// (lib/voice.ts), and each one's sound is kept in a sealed file of its own (lock/voice-clips.ts). Photos and files go through the relay's file store
// (lib/attachments.ts): ours are kept here as they went, theirs are taken from the relay at once
// up to AUTO_TAKE, larger ones when tapped. A photo shows from memory only, never written out
// unsealed; Save puts a copy outside Erevos. Voice and video calls to a contact (lib/call.ts) are
// set up with messages through the relay and then go between the phones, through the call relay
// beside our relay when it has one; each call leaves a line in the chat.
//
// Every space also has hidden chats (lock/hidden.ts), opened with their own PIN typed in the home
// screen's search, which every space takes whether it has hidden chats or not, and a chat can move
// into them from its details (lock/move-chat.ts). They are a
// second chat with their own relay queue, account and contacts, over the relay only (the radio
// link is the phone's, and only the space's own chats use it). The other chats stay open underneath and
// keep receiving. Hidden chats close when the app goes to the background or this screen closes,
// and their messages go with them.
//
// A chat brought in from another messenger (lock/archive.ts) can go on with one of the space's
// contacts: its messages show ahead of theirs, only to read, and a contact without a name takes
// the imported chat's. They are never sent, and stay when this chat's messages are deleted.
//
// While Erevos may read the phone's SMS, the SMS and MMS with a contact's number (linked to them,
// or on a contact card of theirs) show among their messages by time, each marked as a plain SMS
// (lib/sms-chat.ts, components/sms-message.tsx). They stay in the phone's SMS, never in the chat's
// history, and never show in hidden chats. The details open the plain SMS conversation, to write
// one there, and Attach sends what is typed as an SMS.

// `tag` names a message with a contact on both phones (lock/history.ts).
// `until`: when it disappears, milliseconds, or 0. `lasts`: seconds it lasts once read, while it
// waits for that. `mark`: as lock/history.ts keeps it.
// `at`: when it was sent or came, milliseconds. `voice`: where a voice message's sound is.
// `file`: where a photo or file is, or where to take it from. `held`: ours sent for later, the
// relay that holds it till `at`. `quiet`: ours that waits, to go without sound. Its Parts: what
// else it is or carries (lock/history.ts), such as the message it answers and the reactions to it.
type Message = {
  id: number;
  peer: string;
  text: string;
  mine: boolean;
  tag: string;
  until: number;
  lasts: number;
  mark: Mark;
  at: number;
  voice?: VoiceRef;
  file?: FileRef;
  held?: HeldAt;
  heldFor?: string;
  quiet?: boolean;
} & Parts;

const MARKS = ['✓', '✓✓', '✓✓✓'];

// What a phone still has to tell a contact's: which of their messages came, and were read.
type Receipts = Record<string, { got: string[]; read: string[] }>;

// A call's line in the chat is this phone's own note, so it has no marks.
const isCallLine = (text: string) => text.startsWith(CALL_LINE);

// How often the chat looks at the relay, milliseconds: more often during a call, so it sets up quickly.
const LOOK_EVERY = 3000;
const LOOK_IN_CALL = 700;

// How long a note under the messages stays, milliseconds.
const NOTE_SHOWN = 8000;

// How often an open chat asks a contact whether their phone is open, milliseconds.
const ASK_EVERY = 60 * 1000;

// How often, at most, typing is said to a contact, and how long it shows after the last word of it.
const TYPING_EVERY = 4000;
const TYPING_SHOWS = 6000;

// Messages opened from the relay in one look at it, at most: a minute's voice message comes in one.
const RECEIVE_BATCH = 50;
// A ticket kept for our link is used while it has more than this left (milliseconds).
const TICKET_KEPT = 7 * 24 * 3600 * 1000;

// How the LoRa radio is, in a word (lib/lora.ts).
const LORA_SHOWN = { off: mark('Off'), connecting: mark('Linking'), starting: mark('Linking'), up: mark('Linked'), down: mark('Not linked') } as const;

// Contacts are named by their identity key, after this prefix.
const CONTACT_PREFIX = 'contact:';

function contactName(peer: string, contacts: ContactInfo[]): string | null {
  const identity = peer.slice(CONTACT_PREFIX.length);
  return contacts.find((contact) => contact.identity === identity)?.name || null;
}

function label(peer: string, contacts: ContactInfo[]): string {
  if (!peer.startsWith(CONTACT_PREFIX)) return peer;
  return contactName(peer, contacts) ?? t('contact {id}', { id: peer.slice(CONTACT_PREFIX.length, CONTACT_PREFIX.length + 8) });
}

// The first line only: Android's errors carry their whole stack after it.
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

const NO_CORE = mark('This build cannot encrypt, so chats through the relay are off. Rebuild the app.');

// The times a chat's messages can disappear after, seconds. 0 keeps them.
const TIMERS = [0, 5 * 60, 3600, 24 * 3600, 7 * 24 * 3600];

const pad = (n: number) => String(n).padStart(2, '0');

// When a disappearing message goes: the time today, or the date too.
function disappearsAt(until: number): string {
  const d = new Date(until);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString()
    ? t('at {time}', { time })
    : t('on {date} {time}', { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time });
}

// A message of ours sent for later, whose time has not come: it waits with that time, here or, held
// by a relay, there.
const scheduled = (message: Message) => message.mine && (message.mark === WAITING || !!message.held) && message.at > Date.now();

// How long a voice message is: 0:07.
// Under a message to or from a contact: its mark if it is ours, and when it disappears.
function caption(message: Message): string {
  const parts: string[] = message.starred ? ['★'] : [];
  if (scheduled(message)) parts.push(t('Scheduled · {when}', { when: laterLabel(message.at) }));
  else if (message.mine && message.tag && !isCallLine(message.text)) parts.push(message.mark === WAITING ? t('Waiting') : MARKS[message.mark]);
  if (message.until) parts.push(t('Disappears {when}', { when: disappearsAt(message.until) }));
  else if (message.lasts) parts.push(t('Disappears {time} after it is read', { time: timerLabel(message.lasts) }));
  return parts.join('  ·  ');
}

function timerLabel(seconds: number): string {
  const units: [number, (count: number) => string][] = [
    [7 * 24 * 3600, (count) => plural(count, '{n} week', '{n} weeks')],
    [24 * 3600, (count) => plural(count, '{n} day', '{n} days')],
    [3600, (count) => plural(count, '{n} hour', '{n} hours')],
    [60, (count) => plural(count, '{n} minute', '{n} minutes')],
    [1, (count) => plural(count, '{n} second', '{n} seconds')],
  ];
  if (seconds <= 0) return t('Off');
  const [size, unit] = units.find(([size]) => seconds % size === 0) ?? units[units.length - 1];
  return unit(seconds / size);
}

// Imported messages shown at first, and added each time earlier ones are asked for.
const IMPORTED_PAGE = 50;
// The latest lines of a chat's thread drawn at first, and how many more each time earlier ones are
// asked for or gone to: a long thread opens without drawing all of it.
const THREAD_PAGE = 100;
// How long typing in a relay field pauses before the chat takes what was typed and asks that relay.
const TYPING_PAUSE = 1200;

/**
 * A relay field: what it shows at once, and what the chat takes once typing pauses or the field is
 * left, so a relay is not asked at every letter of its address. A value set elsewhere shows as it is.
 */
function useTyped(value: string, take: (typed: string) => void): { shown: string; type: (text: string) => void; done: () => void } {
  const [shown, setShown] = useState(value);
  const typing = useRef(false);
  useEffect(() => {
    if (!typing.current) setShown(value);
  }, [value]);
  const done = () => {
    if (!typing.current) return;
    typing.current = false;
    take(shown);
  };
  useEffect(() => {
    if (!typing.current) return;
    const timer = setTimeout(done, TYPING_PAUSE);
    return () => clearTimeout(timer);
  }, [shown]);
  return {
    shown,
    type: (text) => {
      typing.current = true;
      setShown(text);
    },
    done,
  };
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // A contact to open with (from the home screen, or an imported chat that goes on with them),
  // hidden chats opened from the home screen's search (their key handed over in memory), or the
  // relay settings to show at once. `at`: the tag of a message to go to, starred or found. A call
  // to start with the contact comes only from a tap in Erevos (lib/call-handoff.ts), never from the
  // address, which any app or web page can open.
  const { contact, hidden, setup, phone, at } = useLocalSearchParams<{
    contact?: string;
    hidden?: string;
    setup?: string;
    phone?: string;
    at?: string;
  }>();
  const fromSearch = hidden === 'open';
  const [hiddenPlace, setHiddenPlace] = useState<HiddenPlace | null>(() => (fromSearch ? takeHidden() : null));
  const hiddenKey = hiddenPlace?.key ?? null;
  // Hidden chats always keep out of screenshots and the recent apps preview while open.
  useEffect(() => {
    if (!hiddenKey) return;
    keepPrivate('hidden', true);
    return () => keepPrivate('hidden', false);
  }, [hiddenKey]);
  // Hidden chats opened from the search close back to the home screen, with their contacts
  // screens over them (app/contacts.tsx).
  const closeHidden = () => {
    setHiddenPlace(null);
    if (fromSearch) router.dismissTo('/');
  };
  const [asking, setAsking] = useState(false);
  const initial = typeof contact === 'string' && /^[0-9a-f]{64}$/.test(contact) ? `${CONTACT_PREFIX}${contact}` : null;
  // A number linked by hand from its SMS conversation (app/sms.tsx).
  const linkNumber = initial && typeof phone === 'string' && /^\+?\d{3,20}$/.test(phone) ? phone : '';
  const [initialCall] = useState(() => (initial ? takeCall(contact!) : null));
  // The look of the chat in view (its own, or the space's), as the chat showing says.
  const [chatLook, setChatLook] = useState<ChatLook | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        closeHidden();
        setAsking(false);
      }
    });
    return () => subscription.remove();
  }, []);

  if (Platform.OS === 'ios') {
    return (
      <ScreenBackdrop>
        <Page>
          <BackButton />
          <Text tone="muted">{t('Chat runs on Android and on a computer for now.')}</Text>
        </Page>
      </ScreenBackdrop>
    );
  }

  // The message field rises with the keyboard, and clears the phone's navigation bar without it.
  // The chat has no header of its own: its top row has the back arrow, and it draws its backdrop
  // in its own look from the status bar down.
  return (
    <ChatTheme look={chatLook?.look ?? null} onChange={(look) => chatLook?.save(look)}>
      <ScreenBackdrop>
        <ChatStatusBar />
        <KeyboardPaddedView bottom={insets.bottom} style={layout.screen}>
          <View style={[layout.screen, hiddenKey && layout.gone]}>
            <Chat
              hiddenKey={null}
              initial={initial}
              at={initial && typeof at === 'string' && isTag(at) ? at : null}
              initialCall={initialCall}
              linkNumber={linkNumber}
              setup={setup === '1'}
              shown={!hiddenKey}
              onLook={setChatLook}
            />
          </View>
          {hiddenKey ? (
            <Chat hiddenKey={hiddenKey} pocket={hiddenPlace?.pocket ?? 0} shown onHidden={closeHidden} onChangePassword={() => setAsking(true)} onLook={setChatLook} />
          ) : null}
          <PasswordSheet
            visible={asking}
            title={t('Change hidden chats PIN')}
            repeat
            submitLabel={t('Save')}
            onClose={() => setAsking(false)}
            onSubmit={async (password) => {
              await setHiddenPassword(currentSpace().space, hiddenPlace?.pocket ?? 0, password, hiddenKey);
              setAsking(false);
            }}
          />
        </KeyboardPaddedView>
      </ScreenBackdrop>
    </ChatTheme>
  );
}

/** A chat's look, and how to keep a new one (null: the space's again). */
interface ChatLook {
  look: Look | null;
  save: (look: Look | null) => Promise<void>;
}

/** The status bar's icons, light or dark as the chat's look is. */
function ChatStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

/** Back to the screen before, or home when the chat was opened first; or `onPress`. */
function BackButton({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      accessibilityRole="button"
      accessibilityLabel={t('Back')}
      hitSlop={8}
      style={({ pressed }) => [layout.back, pressed && { opacity: 0.6 }]}
    >
      <BackIcon color={colors.text} size={24} />
    </Pressable>
  );
}

// One chat: the space's own (`hiddenKey` null), or hidden chats, sealed with that key, in the
// space's `pocket` of them.
function Chat({ hiddenKey, pocket = 0, initial = null, at = null, initialCall = null, linkNumber = '', setup = false, shown, onHidden, onChangePassword, onLook }: {
  hiddenKey: Uint8Array | null;
  pocket?: number;
  initial?: string | null;
  /** The tag of a message of the `initial` chat to go to once it shows. */
  at?: string | null;
  /** A call to start with the `initial` contact once the chat is loaded. */
  initialCall?: 'voice' | 'video' | null;
  /** A phone number to link to the `initial` contact. */
  linkNumber?: string;
  /** Opens with the relay settings and adding a contact in view. */
  setup?: boolean;
  shown: boolean;
  /** Closes the hidden chats. */
  onHidden?: () => void;
  onChangePassword?: () => void;
  /** Told the look of the chat in view while this one shows: its contact's own, or none. */
  onLook: (look: ChatLook | null) => void;
}) {
  // Bumped when a phone nearby links or goes, or a contact is heard nearby (lib/nearby.ts).
  const [, setNearbyChanged] = useState(0);
  // Whether this phone carries messages from phones nearby to their relays (lib/nearby.ts), and
  // whether it looks for Erevos on the same Wi-Fi (lib/radio.ts).
  const [carrying, setCarrying] = useState(false);
  const [lanOn, setLanOn] = useState(true);
  // Whether this phone makes the preview of a link it sends, in the space's chats (SpaceData.previews).
  const [previews, setPreviews] = useState(false);
  // Whether these hidden chats say a message came while they are closed (lock/hidden-watch.ts).
  const [watched, setWatched] = useState(false);
  const [watchNote, setWatchNote] = useState('');
  // Whether these hidden chats ring their contacts' calls while closed (lock/hidden-ring.ts), and
  // their ring queue, kept with the place (its own relay). Only set for hidden chats.
  const [ringing, setRinging] = useState(false);
  const [ringQueue, setRingQueue] = useState<Queue | null>(null);
  const [ringNote, setRingNote] = useState('');
  // Set while a preview is being made, so the words do not go twice.
  const previewing = useRef(false);
  const [directOn, setDirectOn] = useState(true);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(initial);
  const [messages, setMessages] = useState<Message[]>([]);
  // A message passed on from an SMS conversation (lib/forward.ts) starts in the field.
  const { draft, empty: nothingTyped } = useDraft(() => (initial ? (forwardedTo(initial)?.text ?? '') : ''));
  const [note, setNote] = useState('');
  const [showRelay, setShowRelay] = useState(setup);
  // The relay's own settings, under Relay and new contacts: closed until asked for.
  const [relayShown, setRelayShown] = useState(false);
  // The chat's details, over the chat: its picture, name, timer, look, safety number, moving it.
  const [details, setDetails] = useState(false);
  // The chat's own look being chosen, over the chat.
  const [styling, setStyling] = useState(false);
  const insets = useSafeAreaInsets();
  // A narrow phone (360 wide): the top bar's picture is smaller, and "Encrypted" goes without its
  // shield, so the word fits beside the three buttons.
  const narrow = useWindowDimensions().width < 400;
  const [relayUrl, setRelayUrl] = useState('');
  const [relayToken, setRelayToken] = useState('');
  // Our relay's key for sealed sends, put in our link so contacts on other relays can reach us.
  const [ownRelayKey, setOwnRelayKey] = useState('');
  // A ticket for a place on our relay, put in our link for whoever adds us with no relay of their own,
  // only once chosen for the link shown now: each time the chat opens, the link goes without one.
  const [sharePlace, setSharePlace] = useState(false);
  const [ownTicket, setOwnTicket] = useState('');
  const [placeNote, setPlaceNote] = useState('');
  // The second relay for two-hop sending (lib/relay.ts), empty when not used.
  const [viaUrl, setViaUrl] = useState('');
  const [viaToken, setViaToken] = useState('');
  // A lent token works on the relay that lent it only: with another relay typed in, it goes.
  const typedRelay = useTyped(relayUrl, (url) => {
    if (isLentToken(relayToken) && !sameRelay(url, relayUrl)) setRelayToken('');
    setRelayUrl(url);
  });
  const typedToken = useTyped(relayToken, setRelayToken);
  const typedVia = useTyped(viaUrl, setViaUrl);
  const typedViaToken = useTyped(viaToken, setViaToken);
  const [ownQueue, setOwnQueue] = useState<Queue | null>(null);
  // The queue the contact link names, while it is not the own queue (lib/queue-move.ts), and who is
  // blocked here. The moves of this chat's own queue: the space's, or these hidden chats' own.
  const [linkQueue, setLinkQueue] = useState<Queue | null>(null);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const mover = useRef<QueueMove | null>(null);
  const [contactDraft, setContactDraft] = useState('');
  // Whose contacts these chats' are (lib/sealed-contacts.ts): the space's, or these hidden chats' only.
  const contactsPlace = useMemo<SealedPlace>(() => {
    const { space, key } = currentSpace();
    return { holder: hiddenKey ? hiddenHolder(pocket) : 'space', space, key: hiddenKey ?? key };
  }, [hiddenKey, pocket]);
  // A contact just added here, under Relay and new contacts, that has no name: offered to connect
  // to one of my contacts (components/connect-picker.tsx), whose name it then takes. Its chat shows
  // the offer until another chat shows, it gets a name, or Not now.
  const [connecting, setConnecting] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickNote, setPickNote] = useState('');
  // The hidden chats lent to the contacts screens, which are these when hidden (null until they are).
  const hiddenLent = useOpenHiddenPlace();
  const among: Among = hiddenKey ? hiddenLent : 'space';
  const canConnect = useCanConnect(among);
  const [showQr, setShowQr] = useState(false);
  // The sheet that makes an invite for someone new (components/welcome-invite.tsx).
  const [welcoming, setWelcoming] = useState(false);
  // An invite's link pasted on a phone with no relay yet.
  const [inviteDraft, setInviteDraft] = useState('');
  // With when their account's linked devices last changed (`devices`, ms), or 0 while it has none this chat knows of.
  const [safety, setSafety] = useState<{ peer: string; number: string; devices: number } | null>(null);
  // The contact being named, and the name typed so far.
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  // The part of the details opened under its row: the picture, the timer, or moving the chat.
  const [opened, setOpened] = useState<'picture' | 'timer' | 'move' | 'back' | 'starred' | null>(null);
  // Moving the chat into the hidden chats: the PIN typed, whether new hidden chats are being
  // started with it (asked a second time), what went wrong, and while it moves.
  const [pinDraft, setPinDraft] = useState('');
  const [startingNew, setStartingNew] = useState(false);
  // The place, of the space's POCKETS, new hidden chats are started in: the owner remembers which
  // they used, as nothing on the phone can tell.
  const [newPocket, setNewPocket] = useState<number | null>(null);
  const [moveNote, setMoveNote] = useState('');
  const [moving, setMoving] = useState(false);
  const router = useRouter();
  const [e2e, setE2E] = useState<E2E | null>(null);
  // Chats imported into this space. Hidden chats have none.
  const [archive, setArchive] = useState<Archive | null>(null);
  const [importedShown, setImportedShown] = useState(IMPORTED_PAGE);
  const [threadShown, setThreadShown] = useState(THREAD_PAGE);
  // How many lines the thread had when earlier SMS were asked for, to draw those that come.
  const smsAsked = useRef<number | null>(null);
  // Set when earlier imported messages are shown, so the thread does not jump to its end.
  const holdScroll = useRef(false);
  // The next message disappears, this long (seconds) after it is read: the stopwatch in the bar.
  const [vanishing, setVanishing] = useState(false);
  const [vanishFor, setVanishFor] = useState(3600);
  // The message whose menu is open (held down), the one the next is an answer to, and the one just
  // gone to, lit a moment.
  const [menuFor, setMenuFor] = useState<Message | null>(null);
  const [replying, setReplying] = useState<Message | null>(null);
  // One of the SMS among the messages held down, and the one being passed on (lib/sms-chat.ts).
  const [smsMenuFor, setSmsMenuFor] = useState<SmsMessage | null>(null);
  const [smsForwarding, setSmsForwarding] = useState<SmsMessage | null>(null);
  const [lit, setLit] = useState<number | string | null>(null);
  // Which of the pinned messages shows over the thread, counted from the latest.
  const [pinShown, setPinShown] = useState(0);
  // What is looked for in the chat (null: no search), and which of what it found is gone to, from the latest.
  const [searching, setSearching] = useState<string | null>(null);
  const [searchAt, setSearchAt] = useState(0);
  // Where each message is in the thread, by id, to go to it, and the one to go to once it shows.
  const placed = useRef(new Map<number, number>());
  const smsPlaced = useRef(new Map<string, number>());
  const rowDo = useRef<RowActs | null>(null);
  const rowActs = useMemo(() => steadyActs(rowDo), []);
  // How far above the chat's bottom its thread ends, where Undo shows (components/undo-bar.tsx).
  const edges = useRef({ height: 0, end: 0 });
  const [undoAt, setUndoAt] = useState(0);
  const goal = useRef(at);
  const receipts = useRef<Receipts>({});
  // Contacts who asked whether this phone is open, to answer with the next look at the relay.
  const answers = useRef(new Set<string>());
  // Now, a few seconds behind at most: until when a contact shows open is checked against it.
  const [now, setNow] = useState(Date.now());
  const voiceParts = useRef(new VoiceAssembler());
  // In hidden chats: what a contact's phone could not take yet, though it went to their linked
  // devices, tried again for it while they stay open (lib/waiting.ts Owed).
  const owed = useRef(new Owed());
  const recorder = useVoiceRecorder();
  // Walkie-talkie (Talkie): smaller recordings that play as they come where the chat is open.
  const talkRecorder = useVoiceRecorder(true);
  const [talkies, setTalkies] = useState<Set<string>>(new Set());
  // Whether what is recording now is walkie-talkie.
  const recordingTalk = useRef(false);
  // The chat open and seen now, whose walkie-talkie messages play as they come.
  const listening = useRef<string | null>(null);
  // While the microphone is held, and the recording it started.
  const [talking, setTalking] = useState(false);
  const holding = useRef(false);
  const recording = useRef<Promise<boolean> | null>(null);
  const longest = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Let go of on purpose (slid away), so nothing is said of it.
  const letGo = useRef(false);
  // The voice message playing, and how to stop it.
  const [playingId, setPlayingId] = useState<number | null>(null);
  // How far the voice message playing has played, milliseconds.
  const [played, setPlayed] = useState(0);
  const stopPlaying = useRef<(() => void) | null>(null);
  // Where this chat's calls belong (lib/calls.ts): the space's, or these hidden chats', which
  // seal with this chat's own keys and keep their lines here. Its functions use this render's state.
  const latest = useRef({ send: async (_identity: string, _extra: Extra) => undefined as unknown, line: (_message: Kept) => undefined as void, name: (peer: string) => peer, relay: () => Promise.resolve(null as CallRelay | null) });
  const hiddenCalls = useRef<CallPlace>({
    send: async (identity, signal) => {
      await latest.current.send(identity, { call: signal });
    },
    callRelay: () => latest.current.relay(),
    line: (peer, mine, text) => latest.current.line(callLineMessage(peer, mine, text, 0)),
    name: (peer) => latest.current.name(peer),
  });
  const callPlace = hiddenKey ? hiddenCalls.current : spaceCalls;
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [loaded, setLoaded] = useState(false);
  const nextId = useRef(1);
  const history = useRef<History | null>(null);
  // The panel under the message bar ("+"): what to send and how it goes, and choosing when it goes.
  const [attaching, setAttaching] = useState(false);
  const [choosingLater, setChoosingLater] = useState(false);
  const [stickering, setStickering] = useState(false);
  // A message to forward, while its chat is picked, and the space's groups it can go to.
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const [forwardGroups, setForwardGroups] = useState<GroupInfo[]>([]);
  // Where the phone was found, to send once it is looked at.
  const [placeFound, setPlaceFound] = useState<Place | null>(null);
  const [polling, setPolling] = useState(false);
  // Until when each contact shows typing, and when this phone last said it is typing to each.
  const [typing, setTyping] = useState<Record<string, number>>({});
  const typingSaid = useRef(new Map<string, number>());
  // The time picked under "+" for the next photo, file or voice message, when nothing was typed.
  const [laterFor, setLaterFor] = useState<number | null>(null);
  const [quality, setQuality] = useState<PhotoQuality>('original');
  // How far each file being taken from the relay is, by `${peer}|${tag}`; 'failed' or 'gone' if it did not come.
  const [taking, setTaking] = useState<Record<string, string>>({});
  // Files already tried, so one that failed is taken again only when tapped.
  const tried = useRef(new Set<string>());
  // The photo or file shown on its own, to look at or save; one of an imported message's apart.
  const [viewing, setViewing] = useState<Message | null>(null);
  const [viewingImported, setViewingImported] = useState<FileRef | null>(null);
  const thread = useRef<ScrollView>(null);
  // Whether the thread shows its end, so it keeps to it as it grows shorter.
  const atEnd = useRef(true);
  const styles = useStyles(makeStyles);
  const { colors, look } = useTheme();
  const barBlur = useGlassBlur();
  // How messages are drawn: the look's bubbles (theme/bubbles.ts).
  const b = useMemo(() => bubbleStyles(look.bubbles, colors), [look.bubbles, colors]);
  // Where this chat's home relay is kept (lib/spare.ts): the space's, or this hidden place's own.
  const spareStore = useMemo(() => (hiddenKey ? hiddenSpare(currentSpace().space, pocket, hiddenKey) : spaceSpare()), [hiddenKey, pocket]);
  const [homeUrl, setHomeUrl] = useState('');
  const [homeToken, setHomeToken] = useState('');
  const [homeNote, setHomeNote] = useState('');
  // A hidden place's home relay is let go of when it closes.
  useEffect(() => () => (hiddenKey ? forgetSpare(spareStore) : undefined), [spareStore]);

  // Where contacts reach this chat: our relay and its key, told to them in our link and messages.
  function here(url = relayUrl): Where {
    return { relay: url.trim(), relayKey: url.trim() === relayUrl.trim() ? ownRelayKey : '' };
  }

  // The space's chat sends through its backup relay (lib/spare.ts) when its own cannot be reached.
  function relayTarget(url = relayUrl): Relay | null {
    return relayFor(url, relayToken, viaUrl, viaToken, spareBackup(spareStore));
  }

  // Tells contacts' phones which of their messages came and were read here, and, while the app
  // shows, that this phone is open, as those who asked wait to hear. What the relay cannot take
  // now is told with the next look at it.
  async function sendReceipts(target: Relay | null) {
    for (const peer of new Set([...Object.keys(receipts.current), ...answers.current])) {
      const { got, read } = receipts.current[peer] ?? { got: [], read: [] };
      delete receipts.current[peer];
      answers.current.delete(peer);
      try {
        await sendToContact(target, peer.slice(CONTACT_PREFIX.length), '', { got, read, on: appShown() ? ONLINE : 0 }, true);
      } catch {
        if (got.length + read.length === 0) continue;
        const now = receipts.current[peer] ?? { got: [], read: [] };
        receipts.current[peer] = { got: [...got, ...now.got], read: [...read, ...now.read] };
      }
    }
  }

  // Gives this chat's newest prekeys to the contacts who have not had them (lib/e2e.ts keysDue),
  // each in a message of its own. What cannot go now goes with the next look at the relay.
  async function sendKeys(target: Relay | null) {
    if (!e2e) return;
    for (const identity of e2e.keysDue()) {
      try {
        await sendToContact(target, identity, '', { keys: true }, true);
        await e2e.keysGiven(identity);
      } catch {
        // Tried again with the next look.
      }
    }
  }

  function receipt(peer: string, kind: 'got' | 'read', tags: string[]) {
    if (tags.length === 0) return;
    const contact = e2e?.contacts().find((c) => `${CONTACT_PREFIX}${c.identity}` === peer);
    // A message request hears nothing back, not even that its message came, until accepted.
    if (contact?.request) return;
    // A chat that appears offline holds it until it next writes to them.
    if (contact?.hide) {
      e2e!.hold(contact.identity, kind, tags).catch(() => {
        // Not kept: their phone is never told.
      });
      return;
    }
    const now = receipts.current[peer] ?? { got: [], read: [] };
    // A message read needs no word that it came.
    const got = kind === 'got' ? [...now.got, ...tags] : now.got.filter((tag) => !tags.includes(tag));
    receipts.current[peer] = { got, read: kind === 'read' ? [...now.read, ...tags] : now.read };
  }

  // Hands the relay the first packets of conversations started here that it has not taken yet:
  // until it does, the contact cannot read anything else from this chat.
  async function sendPending(chats: E2E, target: Relay) {
    for (const { identity, sender, relay, relayKey: key, first } of chats.pending()) {
      try {
        await sendMessage(contactTarget(target, { relay, relayKey: key }), fromHex(sender), first, 'quiet');
        await chats.firstSent(identity);
      } catch {
        // Tried again with the next message, or the next look at the relay.
      }
    }
  }

  // Carries messages from phones nearby to their relays, or no longer (lib/nearby-links.ts).
  function changeCarrying(on: boolean) {
    setCarrying(on);
    setCarryingKept(on).catch(() => setNote(t('Changed until Erevos closes: the phone could not keep it.')));
  }

  // Looks for Erevos on the same Wi-Fi or hotspot too, or no longer (lib/nearby-links.ts).
  // Makes link previews, or no longer, in the space's chats (lib/make-preview.ts).
  function changePreviews(on: boolean) {
    setPreviews(on);
    updateCurrentSpaceData({ previews: on }).catch((error) => setNote(errorText(error)));
  }

  function changeLan(on: boolean) {
    setLanOn(on);
    setLanKept(on).catch(() => setNote(t('Changed until Erevos closes: the phone could not keep it.')));
  }

  // Makes a Wi-Fi with Erevos phones nearby that share none (Wi-Fi Direct), or no longer.
  function changeDirect(on: boolean) {
    setDirectOn(on);
    setDirectKept(on).catch(() => setNote(t('Changed until Erevos closes: the phone could not keep it.')));
  }

  // Adds a contact from a code: typed or pasted here, or read from a photo of it (`asked`: offering
  // then to connect it to one of my contacts), or handed over (lib/contact-code.ts) with a contact
  // to link it to and the name it takes, which only these chats' own may give (offerFor).
  // Adds the contact of a link. `mine`: the relay, token and queue this phone has just taken for
  // itself, not in this render's state yet (takeWelcome). `hi`: the secret of their invite, said
  // back so they take this phone as a contact at once (lib/welcome.ts). Returns who was added, or null.
  async function acceptContact(code: ContactCode, offered?: Offer, asked = false, mine?: { url: string; token: string; queue: Queue }, hi = ''): Promise<string | null> {
    if (!e2e) {
      setNote(t(NO_CORE));
      return null;
    }
    if (code.senderHex === ownQueue?.senderHex || (!!linkQueue && code.senderHex === linkQueue.senderHex)) {
      setNote(t("Not added. That is this chat's own code."));
      return null;
    }
    // Someone blocked here, before a queue or a place on their relay is made for them.
    try {
      await e2e.refuseBlocked(code);
    } catch (error) {
      if (error instanceof BlockedContactError) askToUnblock(error, code, offered, asked);
      else setNote(t('Not added. {error}', { error: errorText(error) }));
      return null;
    }
    const ours = (mine?.url ?? relayUrl).trim();
    if (code.relayUrl && ours && !sameRelay(code.relayUrl, ours) && !code.relayKey) {
      setNote(
        t('Not added. That contact uses the relay at {url}, and its link has no key for that relay. Ask them for a new link from an updated Erevos.', { url: code.relayUrl }),
      );
      return null;
    }
    let url = ours;
    let token = mine?.token ?? relayToken;
    let queue = mine?.queue ?? ownQueue;
    let lent = false;
    let noPlace: unknown = null;
    if (!ours && code.relayUrl) {
      // With no relay of our own, theirs: a place lent there when their link brings a ticket for
      // one (lib/relay.ts), or else the relay as it is, which works when it needs no token (or
      // the one typed here).
      try {
        if (code.lend && !queue) {
          const place = await borrowPlace(code.relayUrl, code.lend);
          token = place.token;
          queue = { recipientHex: toHex(place.queue.recipientId), senderHex: toHex(place.queue.senderId) };
          lent = true;
        } else if (!queue) {
          const ids = await createQueue({ url: code.relayUrl, token: relayToken.trim() || undefined });
          queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
        }
        url = code.relayUrl;
        setRelayUrl(url);
        setRelayToken(token);
        setOwnQueue(queue);
      } catch (error) {
        // Neither: they reach this phone nearby only, as one with no relay.
        noPlace = error;
        queue = ownQueue;
      }
    }
    const target = relayFor(url, token, viaUrl, viaToken, spareBackup(spareStore));
    if (!target && !code.key) {
      setNote(t('Not added. Type the relay address in Relay first.'));
      return null;
    }
    try {
      // The contact answers through our own queue, so there has to be one when there is a relay.
      // Without one, they reach this phone nearby only, until it has a queue and tells them.
      if (!queue && target) {
        const ids = await createQueue(target);
        queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
        setOwnQueue(queue);
      }
      const { identity, added } = await e2e.addContact(code, queue?.senderHex ?? '', target ? here(url) : here(''), hi);
      const offer = offerFor(offered, contactsPlace);
      // The name of the contact it is linked to, while it has none of its own (lib/linked-name.ts).
      if (offer?.name) await giveLinkedName(e2e, identity, { name: offer.name }).catch(() => '');
      setContacts(e2e.contacts());
      // A contact of the phone's, or one kept only in Erevos, whose Erevos ID this was is linked to it.
      offer?.added?.(identity);
      setSelected(`${CONTACT_PREFIX}${identity}`);
      if (asked && added && canConnect && !e2e.contacts().find((c) => c.identity === identity)?.name) setConnecting(identity);
      if (target) await sendPending(e2e, target);
      const nearbyOnly = !target || !code.senderHex;
      // Connected as it was added, from the screen a scanned link opens: said after the note.
      const linked = offer?.name && offer.added ? ` ${t('Connected to {name}.', { name: cleanName(offer.name) })}` : '';
      setNote(
        (added
          ? nearbyOnly
            ? noPlace
              ? t('Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. Their relay gave no place: {error}. Until you have a relay, you reach each other nearby only.', {
                  error: errorText(noPlace),
                })
              : t('Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. Until you both have a relay, you reach each other nearby only.')
            : lent
              ? t("Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay of your own, you now have a place on theirs, lent through their link.")
              : t('Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs.')
          : t('Already a contact. Where to reach them is updated.')) + linked,
      );
      return identity;
    } catch (error) {
      if (error instanceof BlockedContactError) {
        askToUnblock(error, code, offered, asked);
        return null;
      }
      setNote(t('Not added. {error}', { error: errorText(error) }));
      return null;
    }
  }

  // Someone blocked here is added only once unblocked, as the owner says: then added as asked.
  function askToUnblock(blocked: BlockedContactError, code: ContactCode, offered?: Offer, asked = false) {
    ask(t('Blocked contacts'), blocked.message, [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Unblock'),
        onPress: () =>
          void e2e
            ?.unblock(blocked.identity)
            .then(() => {
              setBlocked(e2e.blocked());
              return acceptContact(code, offered, asked);
            })
            .catch((again) => setNote(errorText(again))),
      },
    ]);
  }

  // Takes an invite to a relay (lib/relay-invite.ts) for a token of this phone's own there. A relay
  // already set, or a token of its own, is replaced only once the owner says so.
  async function joinRelay(invite: Invite) {
    const ours = relayUrl.trim();
    const same = !!ours && sameRelay(ours, invite.relayUrl);
    if (ours && (!same || (relayToken.trim() && !isLentToken(relayToken)))) {
      const go = await choose(
        t('Use the relay in the invite?'),
        same
          ? t('This phone has a token for this relay already. The invite gives it one of its own instead.')
          : t('This phone uses the relay at {url}. With the invite it uses the one at {other} instead, and contacts learn your new queue from your next message.', {
              url: ours,
              other: invite.relayUrl,
            }),
        t('Cancel'),
        t('Use it'),
      );
      if (!go) return;
    }
    let token: string;
    let name: string;
    try {
      ({ token, name } = await redeemInvite(invite.relayUrl, invite.code));
    } catch (error) {
      setNote(t('The invite was not taken. {error}', { error: errorText(error) }));
      return;
    }
    await tookToken(invite.relayUrl, token, name);
  }

  // Takes an invite for someone new, opened from a scanned link (app/welcome.tsx, lib/welcome.ts).
  // With no relay of its own yet, or only a place lent on one, this phone takes access of its own to
  // the inviting phone's relay, and a queue there, typing nothing; a phone with a relay of its own
  // keeps it. Then the inviting phone is a contact, which takes this one as a contact at once.
  async function takeWelcome(welcome: Welcome) {
    if (!e2e) {
      setNote(t(NO_CORE));
      return;
    }
    const ours = relayUrl.trim();
    const lent = isLentToken(relayToken);
    let mine: { url: string; token: string; queue: Queue } | undefined;
    if (welcome.invite && (!ours || lent || (sameRelay(ours, welcome.invite.relayUrl) && !relayToken.trim()))) {
      const url = welcome.invite.relayUrl;
      try {
        const { token } = await redeemInvite(url, welcome.invite.code);
        // A queue on another relay, or a lent one, is no use with this access: contacts learn the new one from the next message.
        const keep = !!ours && !lent && sameRelay(ours, url) && ownQueue;
        const ids = keep ? null : await createQueue({ url, token });
        const queue = ids ? { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } : ownQueue!;
        setRelayUrl(url);
        setRelayToken(token);
        setOwnQueue(queue);
        updateCurrentSpaceData({ ownToken: ownToken(url, token) }).catch(() => {
          // Not kept: signing in there later gives this phone one more line instead of its own again.
        });
        mine = { url, token, queue };
      } catch (error) {
        // With no relay at all, nothing reaches them: they make a new invite.
        if (!ours) {
          setNote(t('The invite was not taken. {error}', { error: errorText(error) }));
          return;
        }
      }
    }
    const identity = await acceptContact(welcome.contact, { place: contactsPlace, ...(welcome.name ? { name: welcome.name } : {}) }, false, mine, welcome.hi);
    if (identity && mine) {
      const name = e2e.contacts().find((c) => c.identity === identity)?.name;
      setNote(
        name
          ? t('Welcome to Erevos. {name} is your contact now: what you write to each other is end-to-end encrypted.', { name })
          : t('Welcome to Erevos. Whoever invited you is your contact now: what you write to each other is end-to-end encrypted.'),
      );
    }
  }

  // A token of this phone's own on the relay at `url`, from an invite or a sign-in, named `name`
  // there: it goes where the relay's token goes and is kept sealed with the space's relay settings,
  // with a queue there when this phone has none on that relay. Which token it is, and from which
  // relay, is kept too, so signing in there again names only this one as the phone's before.
  // `first`: signed in from the start, with no relay yet: the note says so in plain words, and the
  // relay's settings stay closed.
  async function tookToken(url: string, token: string, name: string, first = false) {
    const same = !!relayUrl.trim() && sameRelay(relayUrl.trim(), url);
    setRelayUrl(url);
    setRelayToken(token);
    const own = { ownToken: ownToken(url, token) };
    (hiddenKey ? updateHiddenData(currentSpace().space, pocket, hiddenKey, own) : updateCurrentSpaceData(own)).catch(() => {
      // Not kept: signing in again there gives this phone one more line instead of its own again.
    });
    if (!first) setShowRelay(true);
    const joined = first
      ? t('You are in, as {name}. Now add your contacts: by their invite, or by the contact link or QR code they give you.', { name })
      : t('This phone now uses the relay at {url}, with a token of its own, named {name} there.', { url, name });
    if (same && ownQueue) {
      setNote(joined);
      return;
    }
    // A queue on another relay is no use on this one: contacts learn the new one from the next message.
    try {
      const ids = await createQueue({ url, token });
      setOwnQueue({ recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
      setNote(joined);
    } catch (error) {
      setOwnQueue(null);
      setNote(`${joined} ${t('Its queue could not be made yet: {error}. Tap Create my relay queue.', { error: errorText(error) })}`);
    }
  }

  // The links nearby are up while the space is open, whatever screen shows (lib/nearby-links.ts).
  // What comes on them, this screen opens itself while it is open, as it shows it at once; the
  // receiver beside the screens does meanwhile (lib/receiver.ts). Hidden chats use the relay only.
  useEffect(() => {
    if (!HAS_LINKS || hiddenKey) return;
    let active = true;
    nearbySettings().then((settings) => {
      if (!active) return;
      setCarrying(settings.carrying);
      setLanOn(settings.lan);
      setDirectOn(settings.direct);
    });
    // A contact heard nearby, or a LoRa radio linked: what waits for them may go now.
    const stopWatching = nearby.onChange(() => {
      setNearbyChanged((n) => n + 1);
      void sendWaitingNow.current(false);
    });
    const stopWatchingLora = lora.onChange(() => setNearbyChanged((n) => n + 1));
    const release = takeNearby((link, packet) => nearbyCame.current(link, packet));
    return () => {
      active = false;
      stopWatching();
      stopWatchingLora();
      release();
    };
  }, []);

  // Opens a packet that came from a phone nearby (`link`), or was kept for this space (no link).
  // One for none of this space's chats is kept for the others.
  const nearbyCame = useRef(async (_link: string | null, _packet: Uint8Array) => undefined as void);
  nearbyCame.current = async (link, packet) => {
    if (!e2e) {
      if (link) nearby.hold(packet);
      return;
    }
    // A group's message (lib/groups.ts), as on the same Wi-Fi with no internet.
    if (isGroupPacket(packet)) {
      const ours = await takeGroupPacket(packet).catch(() => false);
      if (!ours && link) nearby.hold(packet);
      else if (!link) nearby.dropHeld(packet);
      return;
    }
    let received: Awaited<ReturnType<E2E['receive']>>;
    try {
      received = await e2e.receive(packet);
    } catch {
      if (!link) nearby.dropHeld(packet);
      return;
    }
    if (received.kind === 'refused' && received.reason === 'unknown') {
      if (link) nearby.hold(packet);
      return;
    }
    if (!link) nearby.dropHeld(packet);
    if (received.kind === 'message' && link) nearby.heardOn(received.identity, link);
    handle(received);
    await sendReceipts(relayTarget());
  };

  // What comes on Nostr (lib/nostr.ts): the space's from the receiver, which reads for them while
  // the space is open; a hidden place's read here, while its chats are open.
  useEffect(() => {
    if (!e2e) return;
    const take = (packet: Uint8Array) => nearbyCame.current(null, packet);
    if (!hiddenKey) return takeNostr(take);
    return readNostr(nostrReaderOf(() => e2e, take));
  }, [e2e]);

  // What came nearby for this space while another was open, once its chats are.
  useEffect(() => {
    if (!e2e || hiddenKey) return;
    void (async () => {
      for (const packet of nearby.heldPackets()) await openNearby(null, packet);
    })();
  }, [e2e]);

  // Restores the relay settings and our queue this space keeps on the phone, sealed with its key
  // (lock/space-data.ts), and its account and contacts (lock/e2e-data.ts). Another space finds
  // only its own. The space's own chat takes its messages itself while it is open, so the
  // receiver beside the other screens (lib/receiver.ts) waits meanwhile, and shares its chats.
  useEffect(() => {
    let active = true;
    const { space, key } = currentSpace();
    const held = hiddenKey ? null : holdReceiver();
    (hiddenKey ? loadHiddenData(space, pocket, hiddenKey) : loadCurrentSpaceData())
      .then((data) => {
        if (!active) return;
        setRelayUrl(data.url);
        setRelayToken(data.token);
        setViaUrl(data.via);
        setViaToken(data.viaToken);
        setPreviews(data.previews);
        setHomeUrl(data.spare.url);
        setHomeToken(data.spare.token);
        setOwnQueue(data.ownQueue);
        if (hiddenKey) {
          setRingQueue(data.ringQueue);
          void loadWatched(space, key)
            .then((list) => active && setWatched(isWatchedQueue(list, pocket, data.ownQueue?.recipientHex)))
            .catch(() => undefined);
          void loadRinged(space, key)
            .then((list) => active && setRinging(isRingedQueue(list, pocket, data.ringQueue?.recipientHex)))
            .catch(() => undefined);
          // A ring that woke the phone waits on the ring queue: drop it, so it does not ring again.
          const ringQ = data.ringQueue;
          if (ringQ && data.url.trim()) {
            void (async () => {
              const relay: Relay = { url: data.url.trim(), token: data.token.trim() || undefined };
              const recipient = fromHex(ringQ.recipientHex);
              for (let i = 0; i < 10 && active; i++) if (!(await receiveMessage(relay, recipient).catch(() => null))) break;
            })();
          }
        }
      })
      .catch(() => {
        // Nothing usable saved. Start empty.
      })
      .then(async () => {
        if (!hasCore()) {
          setNote(t(NO_CORE));
          return;
        }
        const toShown = (m: Kept): Message => ({ ...m, until: m.until ?? 0, lasts: m.lasts ?? 0, mark: m.mark ?? 0, id: nextId.current++ });
        // The space's messages and contacts show at once, only to read, while a look at the relay
        // under way ends (held); what it brought is in them after.
        let early: { kept: Kept[]; ids: Set<number> } | null = null;
        if (held) {
          const open = await spaceChats().catch(() => null);
          if (!active) return;
          if (open) {
            const kept = open.history.messages();
            const firsts = kept.filter((m) => !m.until || m.until > Date.now()).map(toShown);
            early = { kept, ids: new Set(firsts.map((m) => m.id)) };
            setMessages((list) => [...firsts, ...list]);
            setContacts(open.e2e.contacts());
          }
        }
        await held;
        if (!active) return;
        const shared = hiddenKey ? null : await spaceChats();
        const kept = shared?.history ?? (await History.open(hiddenHolder(pocket), space, hiddenKey!));
        if (!active) return;
        if (shared) voiceParts.current = shared.voiceParts;
        history.current = kept;
        // What disappeared while the chat was closed goes first.
        await kept.expire(Date.now());
        if (!active) return;
        // Ahead of anything the radio brought while it loaded; in place of what showed at once, if
        // the history changed meanwhile.
        if (early?.kept !== kept.messages()) {
          const was = early?.ids;
          setMessages((list) => [...kept.messages().map(toShown), ...(was ? list.filter((m) => !was.has(m.id)) : list)]);
        }
        const chats = shared?.e2e ?? (await E2E.open(hiddenHolder(pocket), space, hiddenKey!));
        if (!active) return;
        // Where its contact link and its old queues are (lib/queue-move.ts), and when its own queue was made, before anything is sealed.
        if (hiddenKey) {
          const queues = placeQueues(space, pocket, hiddenKey);
          const kept = await queues.load();
          if (kept.moved > 0) chats.setQueueAge(kept.moved, kept.now?.queue.senderHex);
          if (kept.now) chats.setLinkOwn(!kept.link);
          mover.current = new QueueMove({ e2e: chats, queues, data: spareStore, moved: (queue, old, why) => hiddenMoved.current(queue, old, why), ring: () => moveRing.current() });
        } else mover.current = spaceMover({ e2e: chats });
        const queues = await mover.current.queues().catch(() => null);
        if (!active) return;
        setLinkQueue(queues?.link?.queue ?? null);
        setBlocked(chats.blocked());
        // What the receiver beside the other screens had to say of a move meanwhile.
        const said = mover.current.said();
        if (said.length > 0) setNote(said.join(' '));
        if (linkNumber && initial?.startsWith(CONTACT_PREFIX)) {
          await chats.linkPhone(initial.slice(CONTACT_PREFIX.length), linkNumber);
          setNote(t('Messages to {number} now go through Erevos, end-to-end encrypted.', { number: linkNumber }));
        }
        setE2E(chats);
        setContacts(chats.contacts());
        if (!hiddenKey) {
          Archive.open('space', space, key)
            .then((imported) => active && setArchive(imported))
            .catch(() => {
              // The chats show without what was imported.
            });
        }
      })
      .catch((error) => {
        if (active) setNote(t('Chats through the relay could not open. {error}', { error: errorText(error) }));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      void held?.then((release) => release());
    };
  }, []);

  // Hidden chats lend themselves to their contacts screens while open (lib/hidden-contacts.ts):
  // their contacts and messages, a way to open a chat, or call, from a contact card, and to give a
  // contact the name of the one linked to it.
  const pendingCall = useRef<{ peer: string; video: boolean } | null>(initial && initialCall ? { peer: initial, video: initialCall === 'video' } : null);
  useEffect(() => {
    if (!hiddenKey || !loaded || !e2e) return;
    let lending = true;
    setOpenHiddenPlace({
      space: currentSpace().space,
      pocket,
      key: hiddenKey,
      erevos: () => {
        const phones = e2e.phones();
        return e2e
          .contacts()
          .filter((c) => !c.request)
          .map((c) => ({ identity: c.identity, name: c.name, phone: phones.find((p) => p.identity === c.identity)?.phone ?? '' }));
      },
      messages: (identity) => (history.current?.messages() ?? []).filter((m) => m.peer === `${CONTACT_PREFIX}${identity}`),
      open: (identity, call) => {
        const peer = `${CONTACT_PREFIX}${identity}`;
        pendingCall.current = call ? { peer, video: call === 'video' } : null;
        setDetails(false);
        setSelected(peer);
      },
      // Once they have closed, nothing: their chats would save from a copy no screen uses any more.
      takeName: async (identity, name) => {
        if (!lending) return '';
        const given = await giveLinkedName(e2e, identity, { name });
        if (given) setContacts(e2e.contacts());
        return given;
      },
    });
    return () => {
      lending = false;
      setOpenHiddenPlace(null);
    };
  }, [hiddenKey, loaded, e2e]);
  // The call asked for starts once its chat is open.
  useEffect(() => {
    const wanted = pendingCall.current;
    if (!wanted || !loaded || !e2e || selected !== wanted.peer) return;
    pendingCall.current = null;
    void startCall(wanted.video);
  }, [loaded, e2e, selected]);

  // Another chat starts with its latest imported messages and pinned message, and answers nothing yet.
  // The offer to connect a contact just added stays with its own chat only.
  useEffect(() => {
    setConnecting((c) => (c && selected === `${CONTACT_PREFIX}${c}` ? c : null));
    setImportedShown(IMPORTED_PAGE);
    setThreadShown(THREAD_PAGE);
    smsAsked.current = null;
    setReplying(null);
    setPinShown(0);
    setSearching(null);
    setAttaching(false);
    setChoosingLater(false);
    setVanishing(false);
  }, [selected]);

  // Typing shows only a few seconds after the last word that it does.
  useEffect(() => {
    const until = Math.max(0, ...Object.values(typing));
    if (until <= Date.now()) return;
    const timer = setTimeout(() => setTyping((now) => Object.fromEntries(Object.entries(now).filter(([, at]) => at > Date.now()))), until - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [typing]);

  // A message gone to is lit a moment.
  useEffect(() => {
    if (lit === null) return;
    const timer = setTimeout(() => setLit(null), 1600);
    return () => clearTimeout(timer);
  }, [lit]);

  // Disappearing messages go from the screen and the phone once their time has come.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNow(now);
      setMessages((list) => (list.some((m) => m.until && m.until <= now) ? list.filter((m) => !(m.until && m.until <= now)) : list));
      history.current?.expire(now).catch(() => {
        // Tried again on the next round.
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // A note goes after a while. One that is still true, like a relay that cannot be reached, comes
  // back with the next try.
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote((current) => (current === note ? '' : current)), NOTE_SHOWN);
    return () => clearTimeout(timer);
  }, [note]);

  // Saves the relay settings and our queue whenever they change.
  useEffect(() => {
    if (!loaded) return;
    // Only what the chat keeps: the look kept beside it stays as it is. Contacts from before
    // messages were encrypted (routes) cannot be written to any more, so they go.
    const data: Partial<SpaceData> = { url: relayUrl, token: relayToken, via: viaUrl, viaToken, ownQueue, routes: {} };
    (hiddenKey ? updateHiddenData(currentSpace().space, pocket, hiddenKey, data) : updateCurrentSpaceData(data)).catch(() => {
      // A failed save only means the next launch starts empty.
    });
  }, [loaded, relayUrl, relayToken, viaUrl, viaToken, ownQueue]);

  // Takes a contact opened from a scanned code, once the saved contacts are loaded so they
  // cannot overwrite it.
  useEffect(() => {
    if (!loaded || !shown) return;
    return onContactOffered((code, offer) => void acceptContact(code, offer));
  }, [loaded, shown, relayUrl, relayToken, ownQueue, e2e]);

  // Takes an invite to a relay opened from a scanned link (app/relay-invite.tsx), once the saved
  // relay settings are loaded so they cannot overwrite it. Hidden chats take none.
  useEffect(() => {
    if (!loaded || !shown || hiddenKey) return;
    return onInviteOffered(currentSpace().space, (invite) => void joinRelay(invite));
  }, [loaded, shown, relayUrl, relayToken, ownQueue]);

  // Takes an invite for someone new opened from a scanned link (app/welcome.tsx), as the above.
  useEffect(() => {
    if (!loaded || !shown || hiddenKey || !e2e) return;
    return onWelcomeOffered(currentSpace().space, (welcome) => void takeWelcome(welcome));
  }, [loaded, shown, relayUrl, relayToken, ownQueue, e2e]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  // A call in hidden chats ends when they close, as they do when Erevos goes to the background.
  // The space's calls go on over the other screens.
  useEffect(() => () => endCallsOf(hiddenCalls.current), []);

  // The lines of the space's calls, kept by lib/space-calls.ts, show here as they come.
  useEffect(() => {
    if (hiddenKey) return;
    return onSpaceCallLine((message) => showCallLine(message));
  }, [hiddenKey]);

  // A contact's messages are read once their chat shows on the screen: their phone is told with
  // the next look at the relay, and the disappearing ones start their time.
  useEffect(() => {
    if (!shown || !appActive || !selected?.startsWith(CONTACT_PREFIX)) return;
    if (!messages.some((m) => m.peer === selected && !m.mine && m.mark < 2)) return;
    const peer = selected;
    markMessages(peer, false, 2)
      .then((tags) => receipt(peer, 'read', tags))
      .catch(() => {
        // Read here, but their phone is not told.
      });
  }, [shown, appActive, selected, messages]);

  // While a contact's chat shows, it asks now and then whether their phone is open, saying this
  // one is. A chat that appears offline asks nothing, so it does not learn it either. It asks
  // again when a phone links nearby: the answer says whether it is theirs (lib/nearby.ts).
  const selectedHidden = contacts.some((c) => `${CONTACT_PREFIX}${c.identity}` === selected && c.hide);
  const selectedAccepted = contacts.some((c) => `${CONTACT_PREFIX}${c.identity}` === selected && !c.request);
  const linked = hiddenKey ? 0 : nearby.count();
  useEffect(() => {
    if (!shown || !appActive || !e2e || !selected?.startsWith(CONTACT_PREFIX) || selectedHidden || !selectedAccepted) return;
    const identity = selected.slice(CONTACT_PREFIX.length);
    const ask = () => {
      const target = relayTarget();
      // Said a moment ago already: they know, and answer that.
      if ((!target && linked === 0) || Date.now() - e2e.toldAt(identity) < (ONLINE * 1000) / 3) return;
      sendToContact(target, identity, '', { ask: true, on: ONLINE }).catch(() => {
        // Asked again in a while.
      });
    };
    ask();
    const timer = setInterval(ask, ASK_EVERY);
    return () => clearInterval(timer);
  }, [shown, appActive, e2e, selected, selectedHidden, selectedAccepted, relayUrl, relayToken, viaUrl, viaToken, ownQueue, linked]);

  // Asks our relay for its key once its address is known. A relay without one, or an app whose core
  // cannot seal, leaves the key out of our link: then only contacts on our relay can reach us.
  useEffect(() => {
    const url = relayUrl.trim();
    setOwnRelayKey('');
    if (!url || !canRelaySeal()) return;
    let active = true;
    relayKey({ url, token: relayToken.trim() || undefined })
      .then((key) => active && key && setOwnRelayKey(toBase64Url(key)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [relayUrl, relayToken]);

  // Once a place is chosen for the link, asks our relay for a ticket for one, so whoever adds us
  // with no relay of their own takes one (lib/relay.ts, lendTicket). A link is passed on, so the
  // ticket is a key to the relay for whoever sees it: never put in by itself. It is kept with the
  // space's data while it has more than a week left, so the link stays the same; then a new one is
  // asked for. A place lent to us lends none on, and hidden chats lend none.
  const canSharePlace = loaded && !hiddenKey && !!relayUrl.trim() && !isLentToken(relayToken);
  useEffect(() => {
    const url = relayUrl.trim();
    setOwnTicket('');
    setPlaceNote('');
    if (!sharePlace || !canSharePlace) return;
    let active = true;
    void (async () => {
      const kept = (await loadCurrentSpaceData()).lend;
      const left = kept.ticket && sameRelay(kept.relay, url) ? ticketExpires(kept.ticket) - Date.now() : 0;
      if (left > TICKET_KEPT) {
        if (active) setOwnTicket(kept.ticket);
        return;
      }
      try {
        const ticket = await lendTicket({ url, token: relayToken.trim() || undefined });
        if (!active) return;
        setOwnTicket(ticket ?? '');
        if (!ticket) setPlaceNote(t('Your relay lends no places: its operator has not turned lending on.'));
        await updateCurrentSpaceData({ lend: ticket ? { relay: url, ticket } : NO_LENDING });
      } catch {
        // The relay cannot be reached: the one kept, while it lasts, and asked again next time.
        if (!active) return;
        if (left > 0) setOwnTicket(kept.ticket);
        else setPlaceNote(t('Your relay cannot be reached, so the link has no place in it.'));
      }
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [sharePlace, canSharePlace, relayUrl, relayToken]);

  // Looks at our own relay queue every few seconds and opens what came. Without the core nothing
  // could open it, so the queue is left alone, and its messages wait on the relay.
  useEffect(() => {
    const url = relayUrl.trim();
    if (!url || !ownQueue || !e2e) return;
    // Taking messages goes straight to our relay; sending goes through the second relay if set.
    const own: Relay = { url, token: relayToken.trim() || undefined };
    let sends = relayFor(url, relayToken, viaUrl, viaToken) ?? own;
    const recipient = fromHex(ownQueue.recipientHex);
    const ownSender = ownQueue.senderHex;
    let active = true;
    let busy = false;
    // The note shown while the relay could not be reached, taken back once it answers again.
    let failed: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // In the background: whether the last look waited at the relay, and how many failed in a row (lib/receiver.ts).
    let waited: Waited = false;
    let failures = 0;
    async function look() {
      if (busy || !e2e) return;
      busy = true;
      waited = false;
      // Once the backup relay is ready, sends go through it when ours cannot be reached.
      const backup = spareBackup(spareStore);
      if (backup && !sends.backup) sends = { ...sends, backup: { ...backup, via: sends.via } };
      // One message from our queue (`own`), from one of the others (`old`, lib/queue-move.ts), or
      // from the backup queue: what it was to the junk meter.
      const take = async (bytes: Uint8Array, kind?: QueueKind | 'old'): Promise<Took> => {
        if (!e2e) return { junk: false };
        // A group's message (lib/groups.ts), to the space's queues only.
        if (isGroupPacket(bytes)) return { junk: hiddenKey ? true : !(await takeGroupPacket(bytes).catch(() => true)) };
        // An answer to an SMS invite sent from here: their contact link.
        const invited = hiddenKey ? null : await takeInviteAnswer(e2e, bytes, ownSender, here()).catch(() => null);
        if (invited) {
          if (active) setContacts(e2e.contacts());
          if (active) setNote(t('{number} has Erevos. Messages to that number now go through Erevos, end-to-end encrypted.', { number: invited.number }));
          return { junk: false };
        }
        // Taken from the relay, so kept even if the chat closed meanwhile.
        let received = await e2e.receive(bytes, kind === 'own' ? { onOwn: ownSender } : { old: kind !== undefined });
        // Someone whose SMS invite was answered here: a contact at once, not a message request.
        const number = !hiddenKey && received.kind === 'message' && received.added ? await linkInviter(e2e, received.identity).catch(() => null) : null;
        if (number && received.kind === 'message') received = { ...received, request: false };
        handle(received);
        if (number && active) setNote(t('{number} has Erevos and is now a contact. Messages to that number go through Erevos.', { number }));
        return tookOf(received);
      };
      // Tells a kept contact where this chat reads now, in a quiet message with nothing in it: from
      // the queue and the ring queue kept now, which a move just changed (lib/queue-move.ts).
      const tellNow = async (identity: string) => {
        const { space, key } = currentSpace();
        const data = await (hiddenKey ? loadHiddenData(space, pocket, hiddenKey) : loadCurrentSpaceData());
        const rf = hiddenKey ? (ringing && data.ringQueue ? data.ringQueue.senderHex : '') : undefined;
        const sealed = await e2e.seal(identity, '', data.ownQueue?.senderHex ?? ownSender, { at: here(), rf });
        await handOver(e2e, sends, identity, sealed, [sealed.packet], 'quiet');
      };
      // What came to the backup queue, whether or not our relay answers.
      const spare = () => lookAtSpare(e2e, (bytes) => take(bytes).then(() => undefined), () => !active, spareStore).catch(() => undefined);
      const found = { taken: 0, junk: 0 };
      try {
        await sendPending(e2e, sends);
        await sendCopies(e2e, sends).catch(() => 0);
        // What this phone carries for its relays, from phones nearby or its own (lib/nearby.ts).
        if (!hiddenKey) void nearby.uploadCarried((url, sealed, mark) => carryTo(sends, url, sealed, mark)).catch(() => undefined);
        // An SMS invite sent from the SMS screen since: its answer may be on its way.
        if (!hiddenKey) await refreshSmsLink().catch(() => undefined);
        // In the background, out of a call: waits at the relay until something comes, to the other queues there too.
        const others = awayQueues((await mover.current?.queues().catch(() => null)) ?? null, url);
        const answers = () => {
          if (failed === null || !active) return;
          const shown = failed;
          setNote((current) => (current === shown ? t('The relay answers again.') : current));
          failed = null;
        };
        if (!hiddenKey && !currentCall() && !currentGroupCall()) waited = await waitWhileAway(own, recipient, others.map(fromHex));
        // Nothing came to the queue while the wait lasted: it is not asked again.
        if (waited === 'empty') answers();
        for (let i = 0; i < RECEIVE_BATCH && waited !== 'empty' && active; i++) {
          const bytes = await receiveMessage(own, recipient);
          answers();
          if (!bytes) break;
          found.taken++;
          if ((await take(bytes, 'own')).junk) found.junk++;
        }
        await spare();
        // A move due, kept contacts told, the other queues read (lib/queue-move.ts). Moved, the look
        // starts again on the new queue.
        const moved = active && mover.current ? await mover.current.look({ own, found, take, tell: tellNow, shows: appShown(), stop: () => !active, empty: waited === 'empty' ? others : [] }).catch(() => null) : null;
        if (moved && active) {
          if (moved.notes.length > 0) setNote(moved.notes.join(' '));
          const after = await mover.current!.queues().catch(() => null);
          if (active && after) setLinkQueue(after.link?.queue ?? null);
          if (moved.queue) {
            setOwnQueue(moved.queue);
            return;
          }
        }
        // With the queue the link names as the look left it, never the own queue a move just made.
        const after = await mover.current?.queues().catch(() => null);
        if (!hiddenKey) await answerInvites(e2e, after ? linkOf(after, after.now?.queue ?? ownQueue!).senderHex : ownSender, here(), sends).catch(() => undefined);
        // What waited to go, now that the relay answers.
        void sendWaitingNow.current(true);
        await sendReceipts(sends);
        await sendKeys(sends);
        // Texts that went through Nostr, not said to have come in time, through the relay as well.
        await sendNostrBackups(e2e, sends);
        await sendCopies(e2e, sends).catch(() => 0);
        failures = 0;
      } catch (error) {
        failures++;
        await spare();
        if (!active) return;
        if (!isQueueNotFound(error)) {
          failed = errorText(error);
          setNote(failed);
          return;
        }
        // The relay no longer has our queue (deleted, or a relay that keeps queues in memory
        // was restarted). Make a new one so messages can reach us again: contacts are told.
        try {
          const queue = await mover.current?.lost(own);
          if (!active || !queue) return;
          setOwnQueue(queue);
          setNote(t('The relay had lost your queue, so you have a new one. Your contacts are told quietly.'));
        } catch (retry) {
          if (active) setNote(errorText(retry));
        }
      } finally {
        busy = false;
      }
    }
    function next() {
      const inCall = currentCall() || currentGroupCall();
      timer = setTimeout(
        async () => {
          timer = null;
          await look();
          if (active) next();
        },
        inCall ? LOOK_IN_CALL : appShown() ? LOOK_EVERY : awayPace(waited, failures),
      );
    }
    next();
    // The copies for contacts' endpoints of what was just sealed go at once (lib/fanout.ts).
    const stopCopies = e2e.onCopies(() => void sendCopies(e2e, sends).catch(() => 0));
    // Shown again: looks at once, not after a wait meant for the background.
    const shown = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !timer) return;
      clearTimeout(timer);
      timer = null;
      void look().finally(() => active && !timer && next());
    });

    return () => {
      active = false;
      shown.remove();
      stopCopies();
      if (timer) clearTimeout(timer);
    };
  }, [relayUrl, relayToken, viaUrl, viaToken, ownQueue, e2e]);

  // What one message from the relay, or from a phone nearby, brings.
  function handle(received: Awaited<ReturnType<E2E['receive']>>) {
    if (!e2e) return;
    if (received.kind === 'refused') {
      if (received.reason === 'plain') setNote(t('A message that was not end-to-end encrypted came, and was not shown.'));
      return;
    }
    const peer = `${CONTACT_PREFIX}${received.identity}`;
    // Erevos in the background: the notice says one more came (lib/background.ts), at its time
    // for one sent for later that a relay sent too soon (lib/later.ts), and so it shows.
    const shows = showsAt(received.due);
    // One that came already, from their account and again from one of their endpoints, or through
    // the phone and again directly, is shown once (docs/multi-device.md).
    const twice = received.twice || (!!received.tag && !!history.current?.has(peer, received.tag));
    if (!hiddenKey && !twice && isNews(received)) messageCameAt(shows, received.quiet, screenOfChat(received.identity));
    setContacts(e2e.contacts());
    setSelected((current) => current ?? peer);
    if (received.call) {
      void callSignal(callPlace, peer, received.call, received.request, rtc).then((said) => {
        if (said) setNote(said);
      });
    }
    if (received.group && !hiddenKey) void takeGroupSignal(received.identity, received.group, received.request).catch(() => undefined);
    if (received.online) setNow(Date.now());
    const hidden = e2e.contacts().some((c) => c.identity === received.identity && c.hide);
    if (received.ask && !received.request && !hidden && answersAsk(e2e.toldAt(received.identity))) answers.current.add(peer);
    // What else it is: an answer to one of the chat's messages, a sticker.
    const parts: Parts = { ...(received.re ? { re: received.re } : {}), ...contentOf(received.more) };
    // Put together while the history does not hold it, from what came before too, and kept once
    // whole, as the receiver does (lib/receiver.ts).
    if (received.voice && !(received.tag && history.current?.has(peer, received.tag))) {
      const whole = voiceParts.current.add(peer, received.voice);
      const { tag, timer } = received;
      if (whole && !twice) {
        if (whole.talk && listening.current === peer) {
          stopPlaying.current?.();
          stopPlaying.current = playVoice(whole.audio, () => undefined);
        }
        saveClip(whole.audio, whole.ms)
          .then((voice) => {
            // Its other copy, whole meanwhile.
            if (tag && history.current?.has(peer, tag)) return deleteClip(voice.id);
            addMessage(peer, '', false, tag, timer, voice, undefined, 0, shows, parts);
            if (tag) receipt(peer, 'got', [tag]);
          })
          .catch((error) => setNote(t('A voice message came but could not be kept. {error}', { error: errorText(error) })));
      }
    }
    if (received.file && !twice) {
      // Taken from the relay by the effect that watches for files waiting.
      const tag = addMessage(peer, '', false, received.tag, received.timer, undefined, offerRef(received.file), 0, shows, parts);
      receipt(peer, 'got', [tag]);
    }
    if (received.text && !twice) {
      addMessage(peer, received.text, false, received.tag, received.timer, undefined, undefined, 0, shows, parts);
      if (received.tag) receipt(peer, 'got', [received.tag]);
    }
    // Marked on the screen at once. A mark the history could not keep is the old one when the chat next opens.
    if (received.got.length > 0) markMessages(peer, true, 1, received.got).catch(() => undefined);
    if (received.read.length > 0) markMessages(peer, true, 2, received.read).catch(() => undefined);
    // Their reaction to one of the chat's messages, or none any more.
    if (received.react) {
      const { tag, emoji } = received.react;
      setMessages((list) => list.map((m) => (m.peer === peer && m.tag === tag ? { ...m, theirReaction: emoji || undefined } : m)));
      history.current?.react(peer, tag, false, emoji).catch(() => undefined);
    }
    // They type to us now, or wrote: then they no longer do.
    if (received.more.typing) setTyping((now) => ({ ...now, [peer]: Date.now() + TYPING_SHOWS }));
    else if (received.text || received.voice || received.file) setTyping(({ [peer]: _done, ...others }) => others);
    // One of the chat's messages pinned to its top on their phone, or taken down; their vote on a poll.
    const { pin, vote } = received.more;
    if (pin) pinHere(peer, pin.tag, pin.on);
    if (vote) {
      setMessages((list) =>
        list.map((m) => {
          if (m.peer !== peer || m.tag !== vote.tag || !m.poll) return m;
          const chose = checkedChoices(vote.chose, m.poll.o.length, !!m.poll.m);
          return chose ? { ...m, theirVote: chose } : m;
        }),
      );
      history.current?.vote(peer, vote.tag, false, vote.chose).catch(() => undefined);
    }
    const name = label(peer, e2e.contacts());
    if (received.timerChanged) {
      setNote(
        received.timer
          ? t('{name} set new messages in this chat to disappear {time} after they are read.', { name, time: timerLabel(received.timer) })
          : t('{name} turned disappearing messages off in this chat.', { name }),
      );
    }
    if (received.erase && 'all' in received.erase) {
      forgetChat(peer);
      setNote(t('{name} deleted the messages of this chat on both phones.', { name }));
    } else if (received.erase) {
      forgetMessage({ id: -1, peer, text: '', mine: false, tag: received.erase.tag, until: 0, lasts: 0, mark: 0, at: 0 });
      setNote(t('{name} deleted a message on both phones.', { name }));
    }
    if (received.added && received.request) {
      setNote(t('Message request from {name}: they have your contact link. Accept it to answer, or refuse it.', { name }));
    } else if (received.added) {
      setNote(t('New chat with {name}: they added your contact link. Compare the safety number with theirs.', { name }));
    }
  }

  // Shows a message, and keeps it on the phone when it is with a contact, for `timer` seconds once
  // read if it disappears. A contact's message from an Erevos before tags gets one known to this
  // phone only. Returns its tag.
  // A message of ours that waits to go is marked so (`mark`, lib/waiting.ts); one sent for later
  // has the time it should go (`at`), and shows after the others until then, as does theirs sent
  // for later that came before its time, which shows only then. `more`: of ours, the relay that
  // holds it for later, or that it waits to go without sound; of either, its Parts.
  function addMessage(
    peer: string,
    text: string,
    mine: boolean,
    tag = '',
    timer = 0,
    voice?: VoiceRef,
    file?: FileRef,
    mark: Mark = 0,
    at = Date.now(),
    more: { held?: HeldAt; heldFor?: string; quiet?: boolean } & Parts = {},
  ): string {
    const contact = peer.startsWith(CONTACT_PREFIX);
    const kept = contact ? tag || newTag() : '';
    const lasts = contact ? timer : 0;
    const message = { id: nextId.current++, peer, text, mine, tag: kept, until: 0, lasts, mark, at, voice, file, ...more };
    setMessages((list) => {
      const later = list.findIndex((m) => m.at > at);
      return later < 0 ? [...list, message] : [...list.slice(0, later), message, ...list.slice(later)];
    });
    if (contact) {
      history.current?.add({ peer, text, mine, at, tag: kept, lasts, mark, voice, file, ...more }).catch(() => {
        // Shown, but gone when the chat next opens.
      });
    }
    return kept;
  }

  // Raises the mark of a chat's messages, ours or theirs: all of them, or those with `tags`. A
  // disappearing one marked read starts its time. Returns, through the history, the tags raised.
  function markMessages(peer: string, mine: boolean, mark: Mark, tags: string[] | null = null): Promise<string[]> {
    const now = Date.now();
    setMessages((list) =>
      list.map((m) => {
        if (m.peer !== peer || m.mine !== mine || m.mark >= mark || (tags && !tags.includes(m.tag)) || (!mine && m.at > now)) return m;
        return { ...m, mark, ...(mark === 2 && !m.until && m.lasts ? { until: now + m.lasts * 1000, lasts: 0 } : {}) };
      }),
    );
    return history.current?.mark(peer, mine, mark, now, tags) ?? Promise.resolve([]);
  }

  // Deleted here, what hidden chats still owe the contact's phone of it never goes.
  function forgetChat(peer: string) {
    setMessages((list) => list.filter((message) => message.peer !== peer));
    history.current?.clear(peer).catch((error) => setNote(errorText(error)));
    owed.current.forget(peer.slice(CONTACT_PREFIX.length));
  }

  function forgetMessage(message: Message) {
    setMessages((list) => list.filter((m) => m.id !== message.id && !(message.tag && m.peer === message.peer && m.tag === message.tag)));
    if (message.tag) history.current?.remove(message.peer, message.tag).catch((error) => setNote(errorText(error)));
    if (message.tag) owed.current.forget(message.peer.slice(CONTACT_PREFIX.length), message.tag);
  }

  // What is done on this phone only, which the contact is not told of, the account's linked devices
  // do too (lib/devices.ts): never what is done in hidden chats.
  function toDevices(peer: string, change: Omit<ChatChange, 'c'>) {
    if (!hiddenKey && peer.startsWith(CONTACT_PREFIX)) changedHere({ c: peer.slice(CONTACT_PREFIX.length), ...change });
  }

  function forgetChatHere(peer: string) {
    forgetChat(peer);
    toDevices(peer, { gone: true });
  }

  function forgetHere(message: Message) {
    forgetMessage(message);
    if (message.tag) toDevices(message.peer, { tag: message.tag, gone: true });
  }

  // Asks the contact's phone to delete messages too, and deletes them here once the relay has
  // taken that. If it cannot, nothing is deleted.
  async function eraseOnBoth(peer: string, erase: Erase, here: () => void) {
    const target = relayTarget();
    if (!target) {
      setNote(t('Not deleted. Type the relay address in Relay first.'));
      return;
    }
    try {
      await sendToContact(target, peer.slice(CONTACT_PREFIX.length), '', { erase });
      here();
      setNote(t("Deleted here. {name}'s phone deletes them too when it next looks at the relay.", { name: label(peer, shownContacts) }));
    } catch (error) {
      setNote(t('Not deleted. {reason}', { reason: notSentReason(error) }));
    }
  }

  function deleteMessages(peer: string) {
    const name = label(peer, shownContacts);
    const kept = !!archive && archive.linked(peer.slice(CONTACT_PREFIX.length)).length > 0;
    const question = kept
      ? t('Delete the messages with {name}? They cannot be brought back. Imported messages stay: delete them in Imported chats.', { name })
      : t('Delete the messages with {name}? They cannot be brought back.', { name });
    ask(t('Delete messages'), question, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('This phone'), onPress: () => forgetChatHere(peer) },
      { text: t('Both phones'), style: 'destructive', onPress: () => void eraseOnBoth(peer, { all: true }, () => forgetChat(peer)) },
    ]);
  }

  function deleteMessage(message: Message) {
    // One a relay holds for later is taken back from it, if it did not go yet: where it is held as
    // kept, should it have been held anew since the chat showed it.
    if (message.held && message.at > Date.now()) {
      const held = history.current?.messages().find((m) => m.peer === message.peer && m.tag === message.tag)?.held ?? message.held;
      ask(t('Delete message'), t('Delete this message before it goes? The relay that keeps it drops it.'), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () =>
            void takeBack(relayTarget(), held)
              .then((dropped) => {
                if (dropped) {
                  forgetHere(message);
                  setNote(t('Deleted. It will not go.'));
                } else {
                  setNote(t('It went already. Delete it again to delete it on both phones.'));
                  setMessages((list) => list.map((m) => (m.id === message.id ? { ...m, at: Math.min(m.at, Date.now()) } : m)));
                }
              })
              .catch((error) => setNote(t('Not deleted: the relay could not be asked. {reason}', { reason: errorText(error) }))),
        },
      ]);
      return;
    }
    // One that waits never reached their phone.
    const both = message.peer.startsWith(CONTACT_PREFIX) && message.tag && message.mark !== WAITING;
    ask(t('Delete message'), t('Delete this message? It cannot be brought back.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('This phone'), onPress: () => forgetHere(message) },
      ...(both
        ? [{ text: t('Both phones'), style: 'destructive' as const, onPress: () => void eraseOnBoth(message.peer, { tag: message.tag }, () => forgetMessage(message)) }]
        : []),
    ]);
  }

  // Whether their phone has the message, so it can be answered there or reacted to: theirs, or ours
  // that went. A call's line is this phone's own.
  const theyHave = (m: Message) => m.peer.startsWith(CONTACT_PREFIX) && !!m.tag && !isCallLine(m.text) && (!m.mine || (m.mark !== WAITING && !scheduled(m)));

  // Reacts to a message with an emoji, or takes the reaction back (the same one again), on both
  // phones. It shows once their phone, or the relay, was handed it; if neither can be, nothing changes.
  async function react(message: Message, emoji: string) {
    const next = message.myReaction === emoji ? '' : emoji;
    try {
      await sendToContact(relayTarget(), message.peer.slice(CONTACT_PREFIX.length), '', { react: { tag: message.tag, emoji: next } });
    } catch (error) {
      setNote(notSent(error));
      return;
    }
    setMessages((list) => list.map((m) => (m.peer === message.peer && m.tag === message.tag ? { ...m, myReaction: next || undefined } : m)));
    history.current?.react(message.peer, message.tag, true, next).catch(() => {
      // Shown, but gone when the chat next opens.
    });
  }

  // Pins a message to the top of the chat on both phones, or takes it down, as a reaction goes.
  async function pin(message: Message) {
    const on = !message.pinned;
    try {
      await sendToContact(relayTarget(), message.peer.slice(CONTACT_PREFIX.length), '', { more: { pin: { tag: message.tag, on } } });
    } catch (error) {
      setNote(notSent(error));
      return;
    }
    pinHere(message.peer, message.tag, on);
    if (on) setPinShown(0);
  }

  function pinHere(peer: string, tag: string, on: boolean) {
    const at = on ? Date.now() : 0;
    setMessages((list) => list.map((m) => (m.peer === peer && m.tag === tag ? { ...m, pinned: at || undefined } : m)));
    history.current?.pin(peer, tag, at).catch(() => {
      // Shown, but gone when the chat next opens.
    });
  }

  // Stars a message, or takes the star off, on this phone only.
  function star(message: Message) {
    const on = !message.starred;
    setMessages((list) => list.map((m) => (m.peer === message.peer && m.tag === message.tag ? { ...m, starred: on || undefined } : m)));
    history.current?.star(message.peer, message.tag, on).catch(() => {
      // Shown, but gone when the chat next opens.
    });
    toDevices(message.peer, { tag: message.tag, starred: on });
  }

  // Goes to one of the chat's messages, by its tag, or to one of the SMS among them, by its id,
  // and lights it a moment.
  function goTo(peer: string, tag: string) {
    const target = isSmsLine(tag) ? tag : visible.find((m) => m.peer === peer && m.tag === tag)?.id;
    // Earlier than the lines drawn: drawn with them first, then gone to.
    const index = target === undefined ? -1 : lines.findIndex((line) => (line.kind === 'sms' ? smsLineId(line.sms) === target : line.message.id === target));
    if (index >= 0 && index < firstLine) {
      holdScroll.current = true;
      setThreadShown(lines.length - index + THREAD_PAGE / 2);
      if (typeof target === 'number') goal.current = tag;
      else setTimeout(() => rowDo.current?.goTo(peer, tag), 600);
      return;
    }
    const y = target === undefined ? undefined : typeof target === 'string' ? smsPlaced.current.get(target) : placed.current.get(target);
    if (target === undefined || y === undefined) {
      setNote(t('That message is not on this phone.'));
      return;
    }
    thread.current?.scrollTo({ y: Math.max(0, y - 96), animated: true });
    setLit(target);
  }

  async function copy(text: string) {
    setNote((await copyText(text)) ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'));
  }

  // What can be done with a message, in its menu (held down).
  function menuActions(message: Message): MenuAction[] {
    const actions: MenuAction[] = [];
    if (theyHave(message) || (message.mine && message.mark === WAITING)) actions.push({ title: t('Reply'), onPress: () => setReplying(message) });
    if (forwardable(message)) actions.push({ title: t('Forward'), onPress: () => startForward(message) });
    if (message.peer.startsWith(CONTACT_PREFIX) && message.tag) actions.push({ title: message.starred ? t('Unstar') : t('Star'), onPress: () => star(message) });
    if (theyHave(message)) actions.push({ title: message.pinned ? t('Unpin') : t('Pin'), onPress: () => void pin(message) });
    if (CAN_COPY && message.text && !message.sticker && !message.place && !message.poll && !isCallLine(message.text)) actions.push({ title: t('Copy'), onPress: () => void copy(shownLine(message.text)) });
    if (message.file?.sticker && !message.file.from) actions.push({ title: t('Add to my stickers'), onPress: () => void addToStickers(message.file!) });
    actions.push({ title: t('Delete'), danger: true, onPress: () => deleteMessage(message) });
    return actions;
  }

  // What can be done with one of the SMS among the messages, held down, as on the SMS screen: it is
  // the phone's, so it goes on only as a copy, and is deleted from the phone with Undo.
  function smsActions(m: SmsMessage): MenuAction[] {
    const actions: MenuAction[] = [];
    if (CAN_COPY && m.text) actions.push({ title: t('Copy'), onPress: () => void copy(m.text) });
    actions.push({ title: t('Forward'), onPress: () => setSmsForwarding(m) });
    if (smsFailed(m)) actions.push({ title: t('Send again'), onPress: () => sendSmsLineAgain(m) });
    actions.push({
      title: t('Delete'),
      danger: true,
      onPress: () => {
        const why = deleteSms(m, chatSms.number, chatSms.dropped);
        if (why) setNote(why);
      },
    });
    return actions;
  }

  // One of ours that did not go, or did not reach their phone, goes again, on the SIM it was for.
  function sendSmsLineAgain(m: SmsMessage) {
    sendSmsAgain(m, chatSms.number, -1, { sent: chatSms.reload, note: setNote });
  }

  // Sends what is typed as a plain SMS to their number, once the owner says so: not encrypted, so
  // the phone company can read it. It shows among the messages as an SMS, as the phone keeps it.
  // With two SIMs it says which it goes on. An SMS cannot disappear, nor answer a message: with the
  // stopwatch on, or a message being answered, it says so first, and once it went both are off, as
  // after any message sent.
  async function sendAsSms() {
    const text = draft.text().trim();
    const to = chatSms.number;
    if (!text || !to) return;
    const said = [
      chatSms.simName
        ? t('It goes to {number} on {sim} as a plain SMS, not encrypted: the phone company can read it.', { number: to, sim: chatSms.simName })
        : t('It goes to {number} as a plain SMS, not encrypted: the phone company can read it.', { number: to }),
    ];
    if (vanishing) said.push(t('An SMS cannot disappear: it stays on both phones.'));
    if (replying && replying.peer === selected) said.push(t('It goes without the message it answers.'));
    if (!(await choose(t('Send as SMS?'), said.join(' '), t('Cancel'), t('Send')))) return;
    try {
      await maySendSms();
      await sendSms(to, text, chatSms.sim);
      draft.set((typed) => (typed.trim() === text ? '' : typed));
      setVanishing(false);
      setReplying(null);
      chatSms.reload();
    } catch (error) {
      setNote(t('Not sent. {error}', { error: errorText(error) }));
    }
  }

  // Shows what went, and empties the field when it was what is typed (`typed`).
  function keep(peer: string, text: string, tag = '', timer = 0, parts: Parts = {}, typed = true) {
    addMessage(peer, text, true, tag, timer, undefined, undefined, 0, Date.now(), parts);
    if (typed) draft.set('');
    setReplying(null);
  }

  // Keeps what is typed, and tells a contact who shows online that this phone is typing to them,
  // every few seconds at most. Never from a chat that appears offline, nor to a message request.
  function typed(text: string) {
    if (!text.trim() || !selected?.startsWith(CONTACT_PREFIX) || !selectedOnline || !selectedAccepted || !appActive) return;
    const said = typingSaid.current.get(selected) ?? 0;
    if (Date.now() - said < TYPING_EVERY) return;
    typingSaid.current.set(selected, Date.now());
    sendToContact(relayTarget(), selected.slice(CONTACT_PREFIX.length), '', { more: { typing: true } }).catch(() => {
      // Said again with what is typed next.
    });
  }

  // A message that can go to another chat as a copy: one that stays (one that disappears is not
  // copied on), and is here whole. A call's line is the chat's own.
  const forwardable = (message: Message) =>
    message.peer.startsWith(CONTACT_PREFIX) && !!message.tag && !message.lasts && !message.until && !isCallLine(message.text) && canForward(message);

  // Asks where a message goes: to a contact of this place, or, outside hidden chats, to a group.
  function startForward(message: Message) {
    setForwarding(message);
    setForwardGroups([]);
    if (hiddenKey) return;
    spaceGroups().then(
      (groups) => setForwardGroups(groups.list().filter((group) => group.status === 'in')),
      () => setForwardGroups([]),
    );
  }

  // Forwards a message to a contact's chat, and shows that chat: its words, sticker, place or a new
  // poll go anew, and a voice message's sound or a photo's or file's bytes are sent again. One from
  // a group comes as `Forwardable`, its voice message a file that lasts `ms`.
  async function forwardTo(message: Forwardable, peer: string) {
    setForwarding(null);
    setSelected(peer);
    if (message.voice || (message.file && message.ms)) {
      const copy = await voiceCopy(message);
      if (!copy) setNote(t('This voice message\'s sound is gone.'));
      else await sendVoice(copy.audio, copy.ms, false, peer, true);
      return;
    }
    const file = message.file;
    if (file) {
      await sendAttachment(file.kind, async () => ({ name: file.name, mime: file.mime, source: refSource(file), w: file.w, h: file.h, sticker: file.sticker }), peer, true);
      return;
    }
    await send(0, false, { ...contentOf(message), forwarded: true, text: message.text }, peer);
  }

  // A group's message handed over to forward here (lib/forward.ts), or a photo or file shared from
  // another app (lib/share-in.ts), once the chat can send.
  useEffect(() => {
    if (!e2e || !initial) return;
    const message = takeForward(initial);
    if (message) void forwardTo(message, initial);
    const shared = takeShared(initial);
    if (shared) void sendAttachment(isSharedPhoto(shared) ? 'photo' : 'file', () => readShared(shared), initial);
  }, [e2e]);

  // Forwards a message to a group, then shows the group once it went.
  async function forwardToGroupChat(message: Message, id: string) {
    setForwarding(null);
    setNote(t('Forwarding…'));
    try {
      await forwardToGroup(id, message);
    } catch (error) {
      setNote(notSent(error));
      return;
    }
    setNote('');
    setAttaching(false);
    router.push(`/group?id=${id}`);
  }

  // Finds where the phone is, to show before it goes.
  async function locate() {
    setNote(t('Finding where you are…'));
    try {
      const place = await findPlace();
      setNote('');
      setPlaceFound(place);
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // Sends a poll, with its question and options as its words for an Erevos from before.
  function sendPoll(poll: Poll) {
    setPolling(false);
    void send(undefined, false, { text: pollWords(poll), poll });
  }

  // Chooses an option of a poll, or takes the choice back, on both phones, as a reaction goes.
  async function vote(message: Message, option: number) {
    if (!message.poll) return;
    const chose = chooseOption(message.myVote ?? [], option, !!message.poll.m);
    try {
      await sendToContact(relayTarget(), message.peer.slice(CONTACT_PREFIX.length), '', { more: { vote: { tag: message.tag, chose } } });
    } catch (error) {
      setNote(notSent(error));
      return;
    }
    setMessages((list) => list.map((m) => (m.peer === message.peer && m.tag === message.tag ? { ...m, myVote: chose } : m)));
    history.current?.vote(message.peer, message.tag, true, chose).catch(() => {
      // Shown, but gone when the chat next opens.
    });
  }

  // Sends the place found, with where it is as its words for an Erevos from before.
  function sendPlace(place: Place) {
    setPlaceFound(null);
    void send(undefined, false, { text: placeWords(place), place });
  }

  // Sends a sticker: its name, with its emoji as its words for an Erevos from before.
  function sendSticker(name: string) {
    setStickering(false);
    const sticker = stickerOf(name);
    if (sticker) void send(undefined, false, { text: sticker.emoji, sticker: name });
  }

  // Whose stickers made from photos these are: the space's, or these hidden chats' only.
  const stickerPlace = useMemo<StickerPlace>(() => {
    const { space, key } = currentSpace();
    return { holder: hiddenKey ? hiddenHolder(pocket) : 'space', space, key: hiddenKey ?? key };
  }, [hiddenKey, pocket]);

  // Sends a sticker made from a photo: as a photo goes, marked as a sticker (lib/own-stickers.ts).
  function sendOwnSticker(sticker: OwnSticker) {
    setStickering(false);
    void sendAttachment('photo', async () => {
      const picture = await openOwnSticker(sticker);
      if (!picture) throw new Error(t('This sticker\'s picture is gone.'));
      const { name, mime, w, h } = stickerMeta(picture);
      return { name, mime, source: bytesSource(picture), w, h, sticker: true };
    });
  }

  // Keeps a sticker that came as one of this place's own.
  async function addToStickers(file: FileRef) {
    try {
      await keepAsSticker(stickerPlace, file);
      setNote(t('Added to your stickers.'));
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // The preview of the first link in words typed, when this phone makes them: never in hidden
  // chats, nor while the space goes through Tor (lib/make-preview.ts). None if it takes too long.
  async function previewOf(text: string): Promise<Carried> {
    const link = previews && CAN_PREVIEW && !hiddenKey && !throughTor() ? firstLink(text) : null;
    if (!link) return {};
    previewing.current = true;
    setNote(t('Making the link’s preview…'));
    try {
      const made = await makePreview(link);
      const preview = made && fitPreview(text, made);
      return preview ? { preview } : {};
    } finally {
      previewing.current = false;
      setNote('');
    }
  }

  // What the next message in `peer`'s chat answers, if it answers one.
  function answering(peer: string): Parts {
    return replying && replying.peer === peer && replying.tag ? { re: replying.tag } : {};
  }

  // Seals a message for a contact and hands it to their phone (handOver). Returns the message's
  // tag, how long it lasts, and how it went. `waits`: should it fail, it is tried again as it is.
  async function sendToContact(target: Relay | null, identity: string, text: string, extra: Extra = {}, waits = false): Promise<{ tag: string; timer: number; way: Delivery }> {
    if (!e2e) throw new Error(t(NO_CORE));
    // A hidden place that rings says its ring queue (lock/hidden-ring.ts); '' tells contacts it no
    // longer rings. The space's own chats never ring, so they say nothing of one.
    const rf = hiddenKey ? (ringing && ringQueue ? ringQueue.senderHex : '') : undefined;
    const sealed = await e2e.seal(identity, text, ownQueue?.senderHex ?? '', { ...extra, at: here(), rf });
    // What is only a mark, or asks whether their phone is open, is not worth carrying for days.
    const way = await handOver(e2e, target, identity, sealed, [sealed.packet], markOf(text, extra.call), !!text || !!extra.erase, waits);
    // A call to a hidden contact that rings: wake it too, so it rings while its hidden chats are closed.
    if (target && extra.call) void ringOffer(e2e, target, identity, extra.call, sealed.packet.length).catch(() => undefined);
    // Writing, reacting or pinning in a message request accepts it.
    if (text || extra.react || acts(extra.more ?? {})) setContacts(e2e.contacts());
    return { tag: sealed.tag, timer: sealed.timer, way };
  }

  // Hands a contact's packets to their phone, after the first packet of the conversation if the
  // relay has not taken that yet: nearby when they are, and through the relay (lib/nearby.ts),
  // the last packet saying what they carry (`mark`, lib/relay.ts), or, sealed on a linked device for
  // the account's phone, where all goes, quiet (sentMark). When neither, and they went to the phones
  // nearby, those phones may carry them to the contact's relay too (`carried`). Hidden chats go
  // through the relay only (lib/waiting.ts handOverHidden). Once they went, the copies for the
  // endpoints of the contact's account go too (lib/e2e.ts copiesAfter), and, with `waits`, also once
  // the relay could take them only later, as what is tried again as it is goes to those endpoints
  // once: in hidden chats it then throws OwedError, owed to the contact's phone.
  function handOver(
    chats: E2E,
    target: Relay | null,
    identity: string,
    sealed: { sender: string; relay: string; relayKey: string; spare?: Spare | null; first: Uint8Array | null; copies: number; through: boolean } & ForNostr,
    packets: Uint8Array[],
    mark: RelayMark,
    carried = false,
    waits = false,
  ): Promise<Delivery> {
    if (hiddenKey) return handOverHidden(chats, target, identity, { sealed: { ...sealed, spare: sealed.spare ?? null }, packets }, mark, waits);
    // Words go through Nostr when they read there (lib/nostr-chats.ts), the relay their backup.
    const relay = target && sealed.sender ? orNostr(chats, target, identity, sealed, packets, () => sendSealed(target, sealed, packets, sentMark(sealed, mark), () => chats.firstSent(identity))) : null;
    const all = sealed.first ? [sealed.first, ...packets] : packets;
    const carry = carried ? () => carriedFor(sealed, all, { url: relayUrl, key: ownRelayKey }, sentMark(sealed, mark)) : null;
    // What is worth carrying is worth LoRa's air time too, when it is small (lib/lora.ts).
    return chats.copiesAfter(sealed.copies, nearby.deliver(identity, all, relay, carry, carried), waits);
  }

  // A call's line in the chat, kept with its messages. It needs no read mark, and it disappears
  // with the chat's timer from now.
  // A call's line, kept already, shown in the thread.
  function showCallLine({ peer, text, mine, at, tag, until = 0 }: Kept) {
    setMessages((list) => [...list, { id: nextId.current++, peer, text, mine, tag, until, lasts: 0, mark: 2, at }]);
  }

  latest.current = {
    send: async (identity, extra) => {
      const target = relayTarget();
      if (!target) throw new Error(t('No relay.'));
      await sendToContact(target, identity, '', extra);
    },
    line: (message) => {
      const timer = e2e?.contacts().find((c) => `${CONTACT_PREFIX}${c.identity}` === message.peer)?.timer ?? 0;
      const kept = { ...message, until: timer ? message.at + timer * 1000 : 0 };
      showCallLine(kept);
      history.current?.add(kept).catch(() => {
        // Shown, but gone when the chat next opens.
      });
    },
    name: (peer) => label(peer, e2e?.contacts() ?? []),
    relay: () => ownCallRelay(),
  };

  // The call relay beside our relay, null if it has none.
  function ownCallRelay(): Promise<CallRelay | null> {
    return callRelay({ url: relayUrl.trim(), token: relayToken.trim() || undefined });
  }

  // Without a call relay, asks before a call that shows each phone's address to the other.
  function callDirectly(): Promise<boolean> {
    return new Promise((resolve) =>
      ask(
        t('Call without a call relay?'),
        t("Your relay has no call relay beside it, so the call would go straight between the phones. That only works on the same Wi-Fi, and each phone sees the other's address on it. With a call relay, neither does."),
        [
          { text: t('Cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('Call'), onPress: () => resolve(true) },
        ],
      ),
    );
  }

  async function startCall(video: boolean) {
    if (!selectedContact) {
      setNote(video ? t('Video calls go to contacts through the relay. Pick one first.') : t('Calls go to contacts through the relay. Pick one first.'));
      return;
    }
    const peer = selectedContact;
    const identity = peer.slice(CONTACT_PREFIX.length);
    if (contacts.find((c) => c.identity === identity)?.request) {
      setNote(t('Accept the message request first. Then you can call.'));
      return;
    }
    if (currentCall() || currentGroupCall()) {
      setNote(t('There is a call already.'));
      return;
    }
    // On the same Wi-Fi or a hotspot, with no internet, a call is set up over the link nearby and
    // goes straight between the two: to the contact's link when heard on one, else to every link.
    const near = nearby.isNear(identity) || nearby.count() > 0;
    if (!e2e || ((!ownQueue || !relayUrl.trim()) && !near)) {
      setNote(e2e ? t('Calls are set up through the relay, or with a contact on the same Wi-Fi. Type the relay address in Relay first.') : t(NO_CORE));
      return;
    }
    if (!(await callPermissions(video))) {
      setNote(video ? t('A video call needs the camera and the microphone.') : t('A call needs the microphone.'));
      return;
    }
    let relay: CallRelay | null = null;
    if (ownQueue && relayUrl.trim()) {
      try {
        relay = near ? await soon(ownCallRelay(), 4000, null) : await ownCallRelay();
      } catch (error) {
        if (!near) {
          setNote(t('Could not call. {error}', { error: errorText(error) }));
          return;
        }
      }
    }
    if (!relay && !(await callDirectly())) return;
    try {
      beginCall(callPlace, peer, video, relay, rtc);
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // What the note under the messages says once something went (`what`: Sent, Voice message sent…).
  function sentNote(way: Delivery, what: string, name: string): string {
    if (way === 'nearby') return t('{what} nearby, end-to-end encrypted.', { what });
    if (way === 'relay') return t('{what} through the relay, end-to-end encrypted.', { what });
    if (way === 'lora') {
      return t("{what} over LoRa, end-to-end encrypted, as the relay could not be reached. It comes if {name}'s Erevos has a radio on the same mesh, within reach.", { what, name });
    }
    if (way === 'carried') {
      return t(
        "{what} to the Erevos phones nearby, end-to-end encrypted, as the relay could not be reached. If {name}'s is not one of them, they hand it to {name}'s relay once they reach the internet, and so does this phone.",
        { what, name },
      );
    }
    return t("{what} to the Erevos phones nearby, end-to-end encrypted, as the relay could not be reached. It comes only if {name}'s is one of them.", { what, name });
  }

  // Why something could not go, without the words that say so.
  function notSentReason(error: unknown): string {
    return isQueueNotFound(error)
      ? t("The relay does not have this contact's queue any more. Ask them to write to you, or for their new contact link.")
      : errorText(error);
  }

  function notSent(error: unknown): string {
    return t('Not sent. {reason}', { reason: notSentReason(error) });
  }

  // In hidden chats: what went to the contact's linked devices, if they have any, but not yet to
  // their phone, which is owed it while hidden chats stay open.
  function owedNote(peer: string, error: OwedError): string {
    return t("Sent to {name}'s linked devices, if they have any, end-to-end encrypted, not yet to their phone ({reason}). While hidden chats stay open, it is tried again for their phone.", {
      name: label(peer, contacts),
      reason: notSentReason(error.reason),
    });
  }

  // Sends the message typed. With `lasts` (seconds), only this one disappears, that long after it
  // is read: unless given, as the stopwatch in the bar says. `quiet`, it comes without sound, also
  // when it has to wait. Given `content`, it sends
  // that instead, a sticker, a place or a poll with its words (its emoji, where it is, or what it
  // asks), or words forwarded, and what is typed stays; with `to`, to that chat, not the one shown.
  // When only LoRa can take it, and it is too much for LoRa with its link's preview, the words go
  // without the preview rather than wait.
  async function send(lasts = vanishing ? vanishFor : 0, quiet = false, content?: Content & { text: string }, to = selected) {
    const text = content ? content.text : draft.text().trim();
    if (!text || !to?.startsWith(CONTACT_PREFIX) || previewing.current) return;
    setVanishing(false);
    if (!e2e) {
      setNote(t(NO_CORE));
      return;
    }
    // A copy answers nothing.
    const answer = content?.forwarded ? {} : answering(to);
    const carried = content ? contentOf(content) : await previewOf(text);
    const parts = { ...answer, ...carried };
    const identity = to.slice(CONTACT_PREFIX.length);
    // Kept with the message should it wait, or be owed to their phone, so what of it went meanwhile is the same message.
    const sealedAs = newTag();
    const extra = { lasts, quiet, ...answer, more: carried, tag: sealedAs };
    try {
      let bare = false;
      const { tag, timer, way } = await sendToContact(relayTarget(), identity, text, extra, true).catch((error: unknown) => {
        if (!(error instanceof TooLargeForLoraError) || !carried.preview) throw error;
        // Sealed anew without it, for LoRa only: the relay just failed.
        bare = true;
        return sendToContact(null, identity, text, { ...extra, more: withoutPreview(carried) }, true);
      });
      keep(to, text, tag, timer, bare ? { ...answer, ...withoutPreview(carried) } : parts, !content);
      const sent = sentNote(way, quiet ? t('Sent without sound') : t('Sent'), label(to, contacts));
      const said = timer ? t('{sent} It disappears from both phones {time} after it is read.', { sent, time: timerLabel(timer) }) : sent;
      setNote(bare ? `${said} ${t('It went without the link’s preview, which is too much for LoRa.')}` : said);
    } catch (error) {
      if (error instanceof OwedError && e2e) {
        const chats = e2e;
        keep(to, text, sealedAs, lasts || timerOf(to), parts, !content);
        owed.current.add(identity, sealedAs, async () => {
          const sealed = await chats.seal(identity, text, ownQueue?.senderHex ?? '', { ...extra, at: here() });
          return { sealed, packets: [sealed.packet] };
        });
        setNote(owedNote(to, error));
        return;
      }
      if (!canWait(error) || hiddenKey) {
        setNote(notSent(error));
        return;
      }
      // Nothing could take it now: it waits, and goes by itself (lib/waiting.ts).
      addMessage(to, text, true, sealedAs, lasts || timerOf(to), undefined, undefined, WAITING, Date.now(), { quiet, ...parts });
      if (!content) draft.set('');
      setReplying(null);
      setNote(t('Waiting. {reason} It goes by itself once the relay or their phone nearby can take it.', { reason: waitingReason(error, to, t('It is too long for LoRa.')) }));
    }
  }

  // Keeps the message typed to go at `at`, or, with nothing typed, the next photo, file or voice
  // message (laterFor).
  async function sendLater(at: number) {
    const text = draft.text().trim();
    setChoosingLater(false);
    setAttaching(false);
    if (!selected?.startsWith(CONTACT_PREFIX) || !canPick(at)) return;
    if (!text) {
      setLaterFor(at);
      setNote(t('Now pick a photo or file under +, or hold the microphone: it goes on {when}.', { when: laterLabel(at) }));
      return;
    }
    const lasts = takeVanish();
    if (await schedule(selected, at, { text, lasts })) draft.set('');
  }

  // Keeps a message to go at `at`: sealed and handed to the relay at once, to hold till then
  // (lib/waiting.ts, holdLater), so it goes though this phone is off by then. In the space's chats,
  // while no relay can take it, it waits here, and goes to the relay with the first look that
  // reaches one. Hidden chats keep nothing waiting: there it goes to the relay now, or is not kept,
  // and a voice message's sound or a file's chunks kept for it go. Says whether it is kept.
  async function schedule(peer: string, at: number, what: { text?: string; voice?: VoiceRef; file?: FileRef; lasts?: number }): Promise<boolean> {
    if (!e2e) {
      setNote(t(NO_CORE));
      return false;
    }
    // How long it lasts once read: the stopwatch's time for it (`lasts`), or else the chat's.
    const { text = '', voice, file, lasts: once = 0 } = what;
    const tag = newTag();
    const lasts = once || timerOf(peer);
    const when = laterLabel(at);
    const parts = answering(peer);
    const heldNote = t('Scheduled for {when}. The relay sends it then, even if this phone is off. Until then you can delete it here.', { when });
    if (hiddenKey) {
      try {
        const message: Kept = { peer, text, mine: true, at, tag, lasts, mark: WAITING, voice, file, ...parts };
        const { held, heldFor: heldAt, lasts: kept } = await holdLater(e2e, waitingPlace(true), peer.slice(CONTACT_PREFIX.length), message);
        addMessage(peer, text, true, tag, kept, voice, file, 0, at, { held, heldFor: heldAt, ...parts });
        setReplying(null);
        setNote(heldNote);
        return true;
      } catch (error) {
        if (voice) await deleteClip(voice.id).catch(() => undefined);
        if (file) await deleteChunks(file.id, file.count).catch(() => undefined);
        setNote(t('Not scheduled. {reason}', { reason: notSentReason(error) }));
        return false;
      }
    }
    addMessage(peer, text, true, tag, lasts, voice, file, WAITING, at, parts);
    setReplying(null);
    const went = await sendWaitingNow.current(true);
    setNote(
      went.some((w) => w.peer === peer && w.tag === tag && w.held)
        ? heldNote
        : t('Scheduled for {when}. It goes to the relay once one can be reached, and from there at that time, even if this phone is off then. Until then you can delete it here.', { when }),
    );
    return true;
  }

  // The time picked for the next photo, file or voice message, taken once: null when none was, or
  // when it has gone by meanwhile (then said).
  function takeLaterFor(): number | null {
    const at = laterFor;
    if (at === null) return null;
    setLaterFor(null);
    if (canPick(at)) return at;
    setNote(t('That time has gone by. Choose one ahead.'));
    return null;
  }

  // The chat's timer, seconds.
  function timerOf(peer: string): number {
    return e2e?.contacts().find((c) => `${CONTACT_PREFIX}${c.identity}` === peer)?.timer ?? 0;
  }

  // Why a message could not go now: `lora`, what LoRa says of it, when LoRa was the only way.
  function waitingReason(error: unknown, peer: string, lora: string): string {
    if (error instanceof TooLargeForLoraError) return `${lora} ${relayTarget() ? t('The relay cannot be reached.') : t('There is no relay.')}`;
    const name = label(peer, contacts);
    return relayTarget()
      ? t("The relay cannot be reached, and {name}'s phone is not near.", { name })
      : t("There is no relay, and {name}'s phone is not near.", { name });
  }

  // Asks whether a voice message, photo or file that nothing could take now waits to go by itself.
  function askToWait(what: 'voice' | 'photo' | 'file', reason: string): Promise<boolean> {
    return choose(
      t('Not sent yet'),
      what === 'voice'
        ? t('{reason} The voice message can wait here, marked Waiting, and go by itself once the relay or their phone nearby can take it.', { reason })
        : what === 'photo'
          ? t('{reason} The photo can wait here, marked Waiting, and go by itself once the relay or their phone nearby can take it.', { reason })
          : t('{reason} The file can wait here, marked Waiting, and go by itself once the relay or their phone nearby can take it.', { reason }),
      t('Delete it'),
      t('Keep it waiting'),
    );
  }

  // Where what waits goes from (lib/waiting.ts). `relayUp`: the relay just answered.
  function waitingPlace(relayUp: boolean): SendPlace {
    return { sends: relayTarget(), own: ownRelay(), senderHex: ownQueue?.senderHex ?? '', here: here(), ownKey: ownRelayKey, relayUp };
  }

  // Sends what waits that can go now (lib/waiting.ts), and shows it as gone, or as held by the
  // relay till its time. Says what went. Hidden chats keep nothing waiting: what they owe a
  // contact's phone is tried again instead (Owed), and shows as sent already. In both, what a relay
  // holds for later for a contact whose queue moved is held anew, and what it holds for one deleted
  // or blocked is dropped.
  const sendWaitingNow = useRef((_relayUp: boolean) => Promise.resolve([] as Went[]));
  sendWaitingNow.current = async (relayUp) => {
    const kept = history.current;
    if (!e2e || !kept) return [];
    let went: Went[] = [];
    if (hiddenKey) {
      if (!relayUp) return [];
      await owed.current.retry(e2e, relayTarget()).catch(() => undefined);
      went = await holdAgain({ e2e, history: kept }, waitingPlace(true)).catch(() => [] as Went[]);
      await dropHeld(e2e, relayTarget());
    } else went = await sendWaiting({ e2e, history: kept }, waitingPlace(relayUp)).catch(() => [] as Went[]);
    if (went.length > 0) {
      setMessages((list) =>
        list.map((m) => {
          const sent = went.find((w) => w.peer === m.peer && w.tag === m.tag);
          if (!sent) return m;
          const gone: Message = { ...m, mark: 0, lasts: sent.lasts, held: sent.held, heldFor: sent.heldFor, quiet: false };
          if (sent.bare) delete gone.preview;
          return gone;
        }),
      );
    }
    return hiddenKey ? [] : went;
  };

  async function shareLink(link: string) {
    try {
      // A computer has no share sheet: the link is copied, to paste where it should go.
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(link);
        setNote(t('Contact link copied.'));
        return;
      }
      await Share.share({ message: link });
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function toggleSafety(peer: string) {
    if (safety?.peer === peer || !e2e) {
      setSafety(null);
      return;
    }
    try {
      const identity = peer.slice(CONTACT_PREFIX.length);
      setSafety({ peer, number: await e2e.safetyNumber(identity), devices: e2e.devicesChanged(identity) });
    } catch (error) {
      setNote(errorText(error));
    }
  }

  function startRenaming(peer: string) {
    if (renaming === peer) {
      setRenaming(null);
      return;
    }
    setNameDraft(contactName(peer, contacts) ?? '');
    setRenaming(peer);
  }

  async function acceptRequest(peer: string) {
    if (!e2e) return;
    try {
      await e2e.acceptRequest(peer.slice(CONTACT_PREFIX.length));
      setContacts(e2e.contacts());
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // Deleting a contact forgets them and their chat here, and gives this chat a new relay queue, which
  // the other contacts are told quietly (lib/queue-move.ts), so they can no longer write to it.
  // Blocking also drops what they send later, a request too. Their phone is not told. Said with it:
  // the groups they share with this phone, where they can still write.
  function deleteContact(peer: string, block: boolean) {
    const name = label(peer, shownContacts);
    ask(
      block ? t('Block contact') : t('Delete contact'),
      block
        ? t('Block {name}? As with deleting, and what they send later is dropped, a request too. You can unblock them under Blocked contacts.', { name })
        : t('Delete {name}? Your chat with them goes from this phone. Erevos gives you a new relay queue and tells your other contacts quietly, so {name} can no longer write to you. With your contact link they can still ask to talk again.', { name }),
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: block ? t('Block') : t('Delete'), style: 'destructive', onPress: () => void deleted(peer, name, block) },
      ],
    );
  }

  async function deleted(peer: string, name: string, block: boolean) {
    if (!e2e) return;
    const identity = peer.slice(CONTACT_PREFIX.length);
    const shared = hiddenKey ? 0 : await sharedGroups(identity).catch(() => 0);
    const request = e2e.contacts().some((c) => c.identity === identity && c.request);
    // What a relay holds for later to them goes no more: kept with their removal, and dropped now
    // or with a later look.
    const kept = history.current;
    const held = kept ? heldFor(kept, identity) : [];
    try {
      await e2e.deleteContact(identity, { block, held });
    } catch (error) {
      setNote(errorText(error));
      return;
    }
    // And what a look under way held anew for them meanwhile, before their chat is cleared.
    const more = kept ? await heldAfter({ e2e, history: kept }, identity, held).catch(() => []) : [];
    if (held.length + more.length > 0) void dropHeld(e2e, relayTarget());
    forgetChat(peer);
    setContacts(e2e.contacts());
    setBlocked(e2e.blocked());
    setDetails(false);
    setSelected(null);
    // A message request knows only the queue the contact link names: nothing moves for it, but for
    // one blocked while that is the own queue, before the first move (lib/e2e.ts deleteContact). On
    // a linked computer the phone moves.
    const moves = e2e.moveDue() > 0 || (!request && !!accountLink());
    let said = !moves
      ? block
        ? t('Blocked.')
        : ''
      : block
        ? t('{name} is blocked. Your other contacts learn your new queue as soon as the relay answers.', { name })
        : t('{name} is deleted. Your other contacts learn your new queue as soon as the relay answers.', { name });
    const url = relayUrl.trim();
    if (moves && url && ownQueue && mover.current) {
      try {
        // The link and its QR code name the queue the link names from now on, never the new own one.
        const moved = await mover.current.moveNow({ url, token: relayToken.trim() || undefined });
        if (moved) {
          setLinkQueue(moved.link);
          setOwnQueue(moved.queue);
        }
      } catch {
        said = t('The relay could not be reached, so your queue changes as soon as it can. Until then {name} can still write to it, but nothing they send shows.', { name });
      }
    }
    if (shared > 0) {
      said += `${said ? ' ' : ''}${plural(
        shared,
        '{name} is still in one of your groups, and can write to you there. Leave it, or ask its admin to take them out.',
        '{name} is still in {n} of your groups, and can write to you there. Leave them, or ask their admins to take {name} out.',
        { name, n: shared },
      )}`;
    }
    if (said) setNote(said);
  }

  // The space's groups the contact `identity` is in with this phone, by who each member is.
  async function sharedGroups(identity: string): Promise<number> {
    if (!canGroup()) return 0;
    const groups = await spaceGroups();
    let shared = 0;
    for (const group of groups.list()) {
      if (group.status !== 'in') continue;
      if ((await groups.members(group.id).catch(() => [])).some((m) => !m.me && m.about?.id === identity)) shared++;
    }
    return shared;
  }

  async function unblock(identity: string) {
    if (!e2e) return;
    await e2e.unblock(identity).catch((error) => setNote(errorText(error)));
    setBlocked(e2e.blocked());
  }

  // A new contact link: the links and QR codes given before work for the relay's 14 days, then no more.
  function newContactLink() {
    const url = relayUrl.trim();
    if (!url || !ownQueue || !mover.current) {
      setNote(t('Create your relay queue first, under Relay and new contacts.'));
      return;
    }
    const date = new Date(Date.now() + 14 * 24 * 3600_000).toLocaleDateString(locale());
    ask(t('New contact link'), t('Make a new contact link? The links and QR codes you gave before work until {date}, then no more. Your contacts are not affected.', { date }), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('New contact link'),
        onPress: async () => {
          try {
            const made = await mover.current!.newLink({ url, token: relayToken.trim() || undefined });
            if (made.queue) setOwnQueue(made.queue);
            setLinkQueue((await mover.current!.queues()).link?.queue ?? null);
            setNote(t('You have a new contact link. The links and QR codes you gave before work until {date}.', { date: new Date(made.until).toLocaleDateString(locale()) }));
          } catch (error) {
            setNote(errorText(error));
          }
        },
      },
    ]);
  }

  // Refusing forgets them and their messages here. Their phone is not told.
  function refuseRequest(peer: string) {
    ask(t('Refuse request'), t('Refuse {name}? Their messages go, and anything they send later is not shown.', { name: label(peer, contacts) }), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Refuse'),
        style: 'destructive',
        onPress: async () => {
          if (!e2e) return;
          try {
            await e2e.removeContact(peer.slice(CONTACT_PREFIX.length));
            forgetChat(peer);
            setContacts(e2e.contacts());
            setSelected(null);
          } catch (error) {
            setNote(errorText(error));
          }
        },
      },
    ]);
  }

  async function rename(peer: string) {
    if (!e2e) return;
    try {
      await e2e.rename(peer.slice(CONTACT_PREFIX.length), nameDraft);
      setContacts(e2e.contacts());
      setRenaming(null);
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // Starts recording while the microphone is held. Letting go sends it; a minute sends it anyway.
  function startTalking() {
    if (!selectedContact) {
      setNote(t('Voice messages go to contacts through the relay. Pick one first.'));
      return;
    }
    holding.current = true;
    letGo.current = false;
    const talk = talkies.has(selectedContact);
    recordingTalk.current = talk;
    const started = (talk ? talkRecorder : recorder).start().then((ok) => {
      if (!ok) {
        setNote(t('Erevos may not use the microphone. Allow it in the phone settings to send voice messages.'));
        return false;
      }
      if (!holding.current) {
        // Let go while the microphone was getting ready: too short to be meant.
        void (talk ? talkRecorder : recorder).stop().catch(() => undefined);
        if (!letGo.current) setNote(t('Hold to record, and let go to send.'));
        return false;
      }
      setTalking(true);
      longest.current = setTimeout(() => void stopTalking(), MAX_VOICE_MS);
      return true;
    });
    recording.current = started.catch((error) => {
      setNote(t('Cannot record. {error}', { error: errorText(error) }));
      return false;
    });
  }

  // Stops recording and sends it, or, `cancel`led (slid away), lets it go. Under a second is
  // taken for a slip, and is let go too.
  async function stopTalking(cancel = false) {
    holding.current = false;
    letGo.current = cancel;
    if (longest.current) clearTimeout(longest.current);
    longest.current = null;
    const started = recording.current;
    recording.current = null;
    if (!started || !(await started)) return;
    setTalking(false);
    try {
      const talk = recordingTalk.current;
      const recorded = await (talk ? talkRecorder : recorder).stop();
      if (cancel) {
        setNote(t('Recording cancelled.'));
        return;
      }
      if (!recorded || recorded.ms < MIN_VOICE_MS) {
        setNote(t('Hold to record, and let go to send.'));
        return;
      }
      await sendVoice(recorded.audio, recorded.ms, talk, selectedContact, false, takeVanish());
    } catch (error) {
      setNote(t('Not sent. {reason}', { reason: errorText(error) }));
    }
  }

  // How long the next message lasts once read, as the stopwatch says, taken once: it is off again.
  function takeVanish(): number {
    if (!vanishing) return 0;
    setVanishing(false);
    return vanishFor;
  }

  // Walkie-talkie for a chat, on or off: what Voice records then plays on their phone as it comes,
  // when the chat with this phone is open there.
  function toggleTalkie(peer: string) {
    const next = new Set(talkies);
    if (next.has(peer)) next.delete(peer);
    else next.add(peer);
    setTalkies(next);
    setNote(next.has(peer) ? t('Walkie-talkie: hold to talk. It plays on their phone as it comes, if this chat is open there.') : '');
  }

  // Seals a voice message for the contact picked, or for `to` when it is `forwarded` there, hands
  // its parts to their phone in turn (nearby, or through the relay), and keeps its sound sealed. If
  // nothing took all of it, it is not kept.
  async function sendVoice(audio: Uint8Array, ms: number, talk: boolean, to = selectedContact, forwarded = false, lasts = 0) {
    const peer = to;
    if (!peer) return;
    if (!e2e) {
      setNote(t(NO_CORE));
      return;
    }
    // Picked to go later (laterFor): kept, and handed to the relay for then.
    if (!talk && !forwarded && laterFor !== null) {
      const at = takeLaterFor();
      if (at !== null) await schedule(peer, at, { voice: await saveClip(audio, ms), lasts });
      return;
    }
    const identity = peer.slice(CONTACT_PREFIX.length);
    const parts: Parts = forwarded ? { forwarded } : answering(peer);
    const sealedAs = newTag();
    try {
      const sealed = await e2e.sealVoice(identity, audio, ms, ownQueue?.senderHex ?? '', { lasts, at: here(), talk, re: parts.re, forwarded, tag: sealedAs });
      // In hidden chats, owed to their phone should it take it only later; a walkie-talkie message is for now only.
      const way = await handOver(e2e, relayTarget(), identity, sealed, sealed.packets, 'message', true, !!hiddenKey && !talk);
      addMessage(peer, '', true, sealed.tag, sealed.timer, await saveClip(audio, ms), undefined, 0, Date.now(), parts);
      setReplying(null);
      // Writing to a message request accepts it.
      setContacts(e2e.contacts());
      setNote(sentNote(way, talk ? t('Walkie-talkie message sent') : t('Voice message sent'), label(peer, contacts)));
    } catch (error) {
      if (error instanceof OwedError) {
        const chats = e2e;
        addMessage(peer, '', true, sealedAs, lasts || timerOf(peer), await saveClip(audio, ms), undefined, 0, Date.now(), parts);
        setReplying(null);
        owed.current.add(identity, sealedAs, async () => {
          const sealed = await chats.sealVoice(identity, audio, ms, ownQueue?.senderHex ?? '', { lasts, at: here(), re: parts.re, forwarded, tag: sealedAs });
          return { sealed, packets: sealed.packets };
        });
        setNote(owedNote(peer, error));
        return;
      }
      // A walkie-talkie message is for now only.
      if (!canWait(error) || talk || hiddenKey) {
        setNote(notSent(error));
        return;
      }
      if (!(await askToWait('voice', waitingReason(error, peer, t('LoRa takes only text.'))))) {
        setNote(t('Not sent.'));
        return;
      }
      try {
        addMessage(peer, '', true, sealedAs, lasts || timerOf(peer), await saveClip(audio, ms), undefined, WAITING, Date.now(), parts);
        setReplying(null);
        setNote(t('The voice message waits, and goes by itself once the relay or their phone nearby can take it.'));
      } catch (failed) {
        setNote(t('Not sent, and it could not wait. {error}', { error: errorText(failed) }));
      }
    }
  }

  // Plays a voice message, or stops it if it is the one playing.
  async function play(message: Message) {
    stopPlaying.current?.();
    if (playingId === message.id || !message.voice) return;
    try {
      const audio = await loadClip(message.voice);
      if (!audio) {
        setNote(t("This voice message's sound is gone."));
        return;
      }
      setPlayingId(message.id);
      setPlayed(0);
      stopPlaying.current = playVoice(
        audio,
        () => {
          stopPlaying.current = null;
          setPlayingId((current) => (current === message.id ? null : current));
        },
        // In whole seconds, as it shows: the chat draws again once a second, not four times.
        (ms) => setPlayed(Math.floor(ms / 1000) * 1000),
      );
    } catch (error) {
      setNote(t('Cannot play it. {error}', { error: errorText(error) }));
    }
  }

  // Our relay, straight: files go to it and come through it, never through the second relay.
  function ownRelay(): Relay | null {
    const url = relayUrl.trim();
    return url ? { url, token: relayToken.trim() || undefined } : null;
  }

  const takingNow = useRef(new Set<string>());

  // Takes a photo or file that came, from the relay it is on through ours, and keeps it here.
  async function take(own: Relay, peer: string, tag: string, ref: FileRef) {
    const key = `${peer}|${tag}`;
    if (takingNow.current.has(key) || !ref.from) return;
    takingNow.current.add(key);
    tried.current.add(key);
    setTaking((now) => ({ ...now, [key]: '0%' }));
    try {
      // Hidden chats are never linked: what they take goes from the relay at once, and no other device hears of it.
      const taken = await takeFile(own, ref, (done, count) => setTaking((now) => ({ ...now, [key]: `${Math.floor((done / count) * 100)}%` })), hiddenKey ? false : undefined);
      setMessages((list) => list.map((m) => (m.peer === peer && m.tag === tag ? { ...m, file: taken } : m)));
      // Deleted while it came: its chunks go too.
      if (history.current && !(await history.current.setFile(peer, tag, taken))) await deleteChunks(taken.id, taken.count);
      setTaking(({ [key]: _done, ...rest }) => rest);
    } catch (error) {
      setTaking((now) => ({ ...now, [key]: error instanceof FileGoneError ? 'gone' : 'failed' }));
      setNote(ref.kind === 'photo' ? t('A photo did not come. {error}', { error: errorText(error) }) : t('A file did not come. {error}', { error: errorText(error) }));
    } finally {
      takingNow.current.delete(key);
    }
  }

  // Photos and files up to AUTO_TAKE still on the relay are taken as soon as they come, or when the
  // chat opens: theirs, and on a linked device the copies of what the phone sent (lib/devices.ts).
  useEffect(() => {
    const own = ownRelay();
    if (!loaded || !own) return;
    for (const m of messages) {
      if (!m.file?.from || m.file.size > AUTO_TAKE || tried.current.has(`${m.peer}|${m.tag}`)) continue;
      void take(own, m.peer, m.tag, m.file);
    }
  }, [loaded, relayUrl, relayToken, messages]);

  // What the account's other devices changed in the history while the chat is open (lib/devices.ts):
  // messages brought over or written on another of them, marks raised there, messages deleted there.
  useEffect(() => {
    if (hiddenKey) return;
    return onLinked(({ gone }) => {
      const kept = history.current;
      if (!kept) return;
      const now = kept.messages();
      const byTag = new Map(now.filter((m) => m.tag).map((m) => [`${m.peer}|${m.tag}`, m]));
      setMessages((list) => {
        const left = list.filter((m) => !gone.some((g) => g.peer === m.peer && (!g.tag || g.tag === m.tag)));
        const shown = new Set(left.map((m) => `${m.peer}|${m.tag}`));
        const marked = left.map((m) => {
          const there = m.tag ? byTag.get(`${m.peer}|${m.tag}`) : undefined;
          if (!there) return m;
          // What was done to it on another device, or through one: reactions, a pin, votes, a star.
          const done = { myReaction: there.myReaction, theirReaction: there.theirReaction, pinned: there.pinned, starred: there.starred, myVote: there.myVote, theirVote: there.theirVote };
          const changed = (Object.keys(done) as (keyof typeof done)[]).some((key) => JSON.stringify(m[key]) !== JSON.stringify(done[key]));
          const next = changed ? { ...m, ...done } : m;
          if ((there.mark ?? 0) <= next.mark) return next;
          return { ...next, mark: there.mark ?? 0, until: next.until || (there.until ?? 0), lasts: next.until ? next.lasts : (there.lasts ?? 0) };
        });
        const added = now
          .filter((m) => m.peer.startsWith(CONTACT_PREFIX) && m.tag && !shown.has(`${m.peer}|${m.tag}`))
          .map((m) => ({ ...m, until: m.until ?? 0, lasts: m.lasts ?? 0, mark: m.mark ?? 0, id: nextId.current++ }));
        return added.length > 0 ? [...marked, ...added].sort((a, b) => a.at - b.at) : marked;
      });
    });
  }, [hiddenKey]);

  useEffect(() => {
    loadPhotoQuality().then(setQuality, () => undefined);
  }, []);

  function chooseQuality(next: PhotoQuality) {
    setQuality(next);
    savePhotoQuality(next).catch((error) => setNote(errorText(error)));
  }

  type Picked = { name: string; mime: string; source: Source; w?: number; h?: number; sticker?: true; close?: () => void };

  // Sends a photo or file to the contact picked, or to `to` when it is `forwarded` there: its chunks
  // to our relay, then, end-to-end encrypted, where they are and their key. Kept here as it went.
  // If any of it cannot go, nothing is kept. A sticker made from a photo goes as a photo, marked.
  async function sendAttachment(kind: FileKind, get: () => Promise<Picked | null>, to = selectedContact, forwarded = false) {
    const peer = to;
    const target = relayTarget();
    const own = ownRelay();
    if (!peer || !target || !own) {
      setNote(t('Photos and files go to contacts through the relay. Type its address in Relay, and pick a contact.'));
      return;
    }
    if (!e2e) {
      setNote(t(NO_CORE));
      return;
    }
    let picked: Picked | null;
    try {
      picked = await get();
    } catch (error) {
      setNote(
        error instanceof TooLargeError
          ? t('Not sent. Files can be 100 MB at most.')
          : error instanceof NoCameraError
            ? error.message
            : t('Cannot open it. {error}', { error: errorText(error) }),
      );
      return;
    }
    if (!picked) return;
    const what = kind === 'photo' ? 'photo' : 'file';
    const meta: Omit<FileMeta, 'size'> = {
      name: picked.name,
      mime: picked.mime,
      kind,
      ...(picked.w && picked.h ? { w: picked.w, h: picked.h } : {}),
      ...(picked.sticker ? { sticker: true as const } : {}),
    };
    // Picked to go later (laterFor): kept here, and handed to the relay for then.
    const later = forwarded ? null : takeLaterFor();
    if (!forwarded && laterFor !== null && later === null) {
      picked.close?.();
      return;
    }
    // The stopwatch's time goes with it, now or later, and the stopwatch is off again.
    const lasts = forwarded ? 0 : takeVanish();
    if (later !== null) {
      try {
        if (picked.source.size > MAX_FILE) throw new TooLargeError();
        const ref = await keepFile(picked.source, meta, (done, count) => {
          if (count > 1) {
            const percent = Math.floor((done / count) * 100);
            setNote(what === 'photo' ? t('Keeping the photo, {percent}%', { percent }) : t('Keeping the file, {percent}%', { percent }));
          }
        });
        await schedule(peer, later, { file: ref, lasts });
      } catch (error) {
        setNote(error instanceof TooLargeError ? t('Not sent. Files can be 100 MB at most.') : t('Not scheduled. {reason}', { reason: errorText(error) }));
      } finally {
        picked.close?.();
      }
      return;
    }
    let kept: FileRef | null = null;
    let offer: FileOffer | null = null;
    const parts: Parts = forwarded ? { forwarded } : answering(peer);
    const identity = peer.slice(CONTACT_PREFIX.length);
    const sealedAs = newTag();
    try {
      if (picked.source.size > MAX_FILE) throw new TooLargeError();
      setNote(picked.sticker ? t('Sending the sticker…') : what === 'photo' ? t('Sending the photo…') : t('Sending the file…'));
      const sent = await sendFile(own, picked.source, meta, (done, count) => {
        if (count > 1) {
          const percent = Math.floor((done / count) * 100);
          setNote(what === 'photo' ? t('Sending the photo, {percent}%', { percent }) : t('Sending the file, {percent}%', { percent }));
        }
      });
      kept = sent.ref;
      offer = sent.offer;
      const sealed = await e2e.sealFile(identity, sent.offer, ownQueue?.senderHex ?? '', { lasts, at: here(), re: parts.re, forwarded, tag: sealedAs });
      // In hidden chats, owed to their phone should it take it only later.
      await handOver(e2e, target, identity, sealed, [sealed.packet], 'message', false, !!hiddenKey);
      addMessage(peer, '', true, sealed.tag, sealed.timer, undefined, sent.ref, 0, Date.now(), parts);
      setReplying(null);
      kept = null;
      // Writing to a message request accepts it.
      setContacts(e2e.contacts());
      setNote(
        picked.sticker
          ? t('Sticker sent through the relay, end-to-end encrypted.')
          : kind === 'photo'
            ? t('Photo sent through the relay, end-to-end encrypted.')
            : t('File sent through the relay, end-to-end encrypted.'),
      );
    } catch (error) {
      if (error instanceof OwedError && kept && offer) {
        const [chats, given] = [e2e, offer];
        addMessage(peer, '', true, sealedAs, lasts || timerOf(peer), undefined, kept, 0, Date.now(), parts);
        setReplying(null);
        owed.current.add(identity, sealedAs, async () => {
          const sealed = await chats.sealFile(identity, given, ownQueue?.senderHex ?? '', { lasts, at: here(), re: parts.re, forwarded, tag: sealedAs });
          return { sealed, packets: [sealed.packet] };
        });
        setNote(owedNote(peer, error));
        return;
      }
      if (kept) await deleteChunks(kept.id, kept.count).catch(() => undefined);
      if (!canWait(error) || hiddenKey) {
        setNote(error instanceof TooLargeError ? t('Not sent. Files can be 100 MB at most.') : notSent(error));
        return;
      }
      // It waits, kept here only, and goes to the relay later (lib/waiting.ts).
      const reason = nearby.hasSlow()
        ? t('Photos and files go through the relay, which cannot be reached, and LoRa takes only text.')
        : t('Photos and files go through the relay, which cannot be reached.');
      if (!(await askToWait(what, reason))) {
        setNote(t('Not sent.'));
        return;
      }
      try {
        const ref = await keepFile(picked.source, meta, (done, count) => {
          if (count > 1) {
            const percent = Math.floor((done / count) * 100);
            setNote(what === 'photo' ? t('Keeping the photo, {percent}%', { percent }) : t('Keeping the file, {percent}%', { percent }));
          }
        });
        addMessage(peer, '', true, newTag(), lasts || timerOf(peer), undefined, ref, WAITING, Date.now(), parts);
        setReplying(null);
        setNote(what === 'photo' ? t('The photo waits, and goes by itself once the relay can take it.') : t('The file waits, and goes by itself once the relay can take it.'));
      } catch (failed) {
        setNote(t('Not sent, and it could not wait. {error}', { error: errorText(failed) }));
      }
    } finally {
      picked.close?.();
    }
  }

  // What is picked under "+" opens once the panel has closed.
  function afterSheet(then: () => void) {
    setAttaching(false);
    setChoosingLater(false);
    then();
  }

  function sendPhoto(from: 'photos' | 'camera') {
    afterSheet(() =>
      void sendAttachment('photo', async () => {
        const photo = await pickPhoto(from, quality);
        return photo && { name: photo.name, mime: photo.mime, source: bytesSource(photo.bytes), w: photo.w, h: photo.h };
      }),
    );
  }

  function sendPickedFile() {
    afterSheet(() =>
      void sendAttachment('file', async () => {
        const picked = await pickSource(MAX_FILE);
        if (!picked) return null;
        const name = cleanFileName(picked.name);
        const said = cleanMime(picked.mime);
        return { name, mime: said === 'application/octet-stream' ? mimeOf(name) : said, source: picked.source, close: picked.close };
      }),
    );
  }

  // A photo or file tapped: taken from the relay if it is not here yet, otherwise shown on its own.
  function openFile(message: Message) {
    const file = message.file;
    if (!file) return;
    if (file.from) {
      const own = ownRelay();
      if (own) void take(own, message.peer, message.tag, file);
      else setNote(t('Type the relay address in Relay first.'));
      return;
    }
    setViewing(message);
  }

  // Writes the chat out as text where the owner picks (lib/chat-export.ts), once they say so.
  // Hidden chats are not written out: a file outside Erevos would show they are there.
  async function exportChat() {
    if (!selectedContact || hiddenKey) return;
    setDetails(false);
    const them = selectedName;
    const asked = t('Its messages are written to a text file, with their times and who wrote them, saved where you choose. The file is not encrypted: anyone who has it, or any app that reads where it is, can read the chat. Photos, files and voice messages are only named, and messages that disappear are left out.');
    if (!(await choose(t('Export this chat?'), asked, t('Cancel'), t('Export')))) return;
    const now = Date.now();
    try {
      const where = await saveText(exportName(them, now), chatText(messages.filter((m) => m.peer === selectedContact), them, now));
      if (where) setNote(t('Saved in {where}. There it is outside Erevos, not sealed.', { where }));
    } catch (error) {
      setNote(t('Not saved. {error}', { error: errorText(error) }));
    }
  }

  async function saveImported(file: FileRef, choose: boolean) {
    try {
      const where = await saveFile(file, choose);
      if (!where) return;
      setViewingImported(null);
      setNote(t('Saved in {where}. There it is outside Erevos, not sealed.', { where }));
    } catch (error) {
      setViewingImported(null);
      setNote(t('Not saved. {error}', { error: errorText(error) }));
    }
  }

  async function saveAttachment(message: Message, choose: boolean) {
    if (!message.file) return;
    try {
      const where = await saveFile(message.file, choose);
      if (!where) return;
      setViewing(null);
      setNote(t('Saved in {where}. There it is outside Erevos, not sealed.', { where }));
    } catch (error) {
      setViewing(null);
      setNote(t('Not saved. {error}', { error: errorText(error) }));
    }
  }

  // Nothing plays, or records, once the chat closes. Sound a closed Erevos left unsealed goes
  // when it opens.
  useEffect(() => {
    clearLeftovers();
    return () => {
      stopPlaying.current?.();
      holding.current = false;
      if (longest.current) clearTimeout(longest.current);
    };
  }, []);

  // Sets how long new messages with a contact last, and tells their phone at once. If the relay
  // cannot take that now, their phone learns it with the next message.
  // Makes this chat appear offline to them, or not. Shown again, what was held goes to them now.
  async function changeHidden(peer: string, hide: boolean) {
    if (!e2e) return;
    const identity = peer.slice(CONTACT_PREFIX.length);
    try {
      await e2e.setHidden(identity, hide);
      setContacts(e2e.contacts());
    } catch (error) {
      setNote(errorText(error));
      return;
    }
    if (hide) {
      setNote(t('You appear offline to {name}. They see that messages came and were read once you write to them.', { name: label(peer, shownContacts) }));
      return;
    }
    const target = relayTarget();
    try {
      if (!target) throw new Error(t('Type the relay address in Relay first.'));
      await sendToContact(target, identity, '', { on: appShown() ? ONLINE : 0 });
      setNote(t('{name} sees again when you are online, and which messages you read.', { name: label(peer, shownContacts) }));
    } catch {
      setNote(t('{name} sees again when you are online. What you read is told with your next message.', { name: label(peer, shownContacts) }));
    }
  }

  async function changeAvatar(peer: string, avatar: Avatar | null) {
    if (!e2e) return;
    try {
      await e2e.setAvatar(peer.slice(CONTACT_PREFIX.length), avatar);
      setContacts(e2e.contacts());
    } catch (error) {
      setNote(errorText(error));
    }
  }

  /** Gives a contact a photo as their picture, from the phone's photos or its camera. */
  async function choosePhoto(peer: string, from: 'photos' | 'camera') {
    try {
      const bytes = await pickAvatar(from);
      if (!bytes) return;
      const ref = await savePhoto(bytes);
      await changeAvatar(peer, { kind: 'photo', ...ref });
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // Moves a contact's chat into the space's hidden chats, which open with `pin` (or start with it,
  // new, when `fresh`): the contact, its messages and its look go there, sealed with their key, and
  // nothing of it stays here (lock/move-chat.ts). Their phone is told at once to write to the
  // hidden chats' relay queue from now on; what it sends before it hears that may not come.
  async function moveToHidden(peer: string, pin: string, fresh: number | null) {
    if (!e2e || !history.current || moving) return;
    if (!hiddenKey && linkedRole() === 'linked') {
      setMoveNote(t("This chat is the phone's: move it into hidden chats there."));
      return;
    }
    const identity = peer.slice(CONTACT_PREFIX.length);
    if (pin.length < MIN_PIN) {
      setMoveNote(t('The PIN needs {n} characters at least.', { n: MIN_PIN }));
      return;
    }
    setMoving(true);
    setMoveNote('');
    try {
      const { space } = currentSpace();
      const place = fresh !== null ? { key: await setHiddenPassword(space, fresh, pin, null), pocket: fresh } : await openHidden(space, pin);
      if (!place) {
        setMoveNote(t('Wrong PIN.'));
        return;
      }
      const { key, pocket } = place;
      // Hidden chats reach the relay as the space does until they are given their own settings.
      const data = await loadHiddenData(space, pocket, key);
      const settings = data.url.trim()
        ? { url: data.url, token: data.token, via: data.via, viaToken: data.viaToken }
        : { url: relayUrl, token: relayToken, via: viaUrl, viaToken };
      const target = relayFor(settings.url, settings.token, settings.via, settings.viaToken);
      if (!target) throw new Error(t('Type the relay address in Relay first.'));
      let queue = data.ownQueue;
      if (!queue) {
        const ids = await createQueue(target);
        queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
      }
      await updateHiddenData(space, pocket, key, { ...settings, ownQueue: queue });
      const hiddenChats = await E2E.open(hiddenHolder(pocket), space, key);
      // When their queue was made, as the hidden chats say it, before the tell below says it.
      const placeKept = await placeQueues(space, pocket, key).load();
      if (placeKept.moved > 0) hiddenChats.setQueueAge(placeKept.moved, placeKept.now?.queue.senderHex);
      const hiddenHistory = await History.open(hiddenHolder(pocket), space, key);
      // A contact who knows about devices is told first, by the space's chat, as the hidden chats
      // will say it to one who knows them by the space's identity: nothing of devices. Their devices
      // then stop writing to this account's, and to this account themselves, though their phone is
      // off (docs/multi-device.md).
      const sends = relayTarget();
      if (sends && e2e.record(identity)?.dv !== undefined) {
        await sendToContact(sends, identity, '', { leaving: true })
          .then(() => sendCopies(e2e, sends))
          .catch(() => undefined);
      }
      await moveChat(identity, { e2e, history: history.current, archive }, { e2e: hiddenChats, history: hiddenHistory });
      setMessages((list) => list.filter((m) => m.peer !== peer));
      setContacts(e2e.contacts());
      setPinDraft('');
      setStartingNew(false);
      setNewPocket(null);
      setOpened(null);
      setDetails(false);
      setSelected(null);
      // Where to write from now on, said from the hidden chats.
      try {
        const where = { relay: settings.url.trim(), relayKey: settings.url.trim() === relayUrl.trim() ? ownRelayKey : '' };
        const sealed = await hiddenChats.seal(identity, '', queue.senderHex, { at: where });
        await sendSealed(target, sealed, [sealed.packet], 'quiet', () => hiddenChats.firstSent(identity));
        setNote(t('Moved to the hidden chats. Type their PIN in the search on the home screen to open them.'));
      } catch {
        setNote(t('Moved to the hidden chats. Their phone learns where to write when you next write to them from there.'));
      }
      if (initial) router.canGoBack() ? router.back() : router.replace('/');
    } catch (error) {
      setMoveNote(
        error instanceof SamePasswordError
          ? t('Use another PIN: this one opens Erevos, or other hidden chats.')
          : error instanceof LockedOutError
            ? lockedOutMessage(error.until)
            : t('Not moved. {error}', { error: errorText(error) }),
      );
    } finally {
      setMoving(false);
    }
  }

  // Moves a chat of these hidden chats back among the space's chats: the move into them, the other way.
  async function moveToSpace(peer: string) {
    if (!e2e || !history.current || !hiddenKey || moving) return;
    const identity = peer.slice(CONTACT_PREFIX.length);
    setMoving(true);
    setMoveNote('');
    try {
      const data = await loadCurrentSpaceData();
      const target = relayFor(data.url, data.token, data.via, data.viaToken);
      if (!target || !data.ownQueue) throw new Error(t("The space's chats have no relay queue yet: create it under Relay there first."));
      const space = await spaceChats();
      // A contact who knows about devices is told first, as the move into hidden chats tells them:
      // nothing of devices, as the space's chat will say it to one who knows it by this identity.
      const sends = relayTarget();
      if (sends && e2e.record(identity)?.dv !== undefined) {
        await sendToContact(sends, identity, '', { leaving: true })
          .then(() => sendCopies(e2e, sends))
          .catch(() => undefined);
      }
      await moveChat(identity, { e2e, history: history.current, archive: null }, { e2e: space.e2e, history: space.history });
      setMessages((list) => list.filter((m) => m.peer !== peer));
      setContacts(e2e.contacts());
      setOpened(null);
      setDetails(false);
      setSelected(null);
      // Where to write from now on, said from the space's chats.
      try {
        const key = await relayKey(target).catch(() => null);
        const sealed = await space.e2e.seal(identity, '', data.ownQueue.senderHex, { at: { relay: data.url.trim(), relayKey: key ? toBase64Url(key) : '' } });
        await sendSealed(target, sealed, [sealed.packet], 'quiet', () => space.e2e.firstSent(identity));
        setNote(t('Moved back to your chats.'));
      } catch {
        setNote(t('Moved back to your chats. Their phone learns where to write when you next write to them from there.'));
      }
    } catch (error) {
      setMoveNote(t('Not moved. {error}', { error: errorText(error) }));
    } finally {
      setMoving(false);
    }
  }

  async function changeTimer(peer: string, timer: number) {
    if (!e2e) return;
    const identity = peer.slice(CONTACT_PREFIX.length);
    try {
      await e2e.setTimer(identity, timer);
      setContacts(e2e.contacts());
      setOpened(null);
    } catch (error) {
      setNote(errorText(error));
      return;
    }
    const set = timer
      ? t('New messages in this chat now disappear from both phones {time} after they are read.', { time: timerLabel(timer) })
      : t('New messages in this chat no longer disappear.');
    const target = relayTarget();
    try {
      if (!target) throw new Error(t('Type the relay address in Relay first.'));
      await sendToContact(target, identity, '');
      setNote(set);
    } catch (error) {
      setNote(t("{set} {name}'s phone learns it with your next message. {reason}", { set, name: label(peer, shownContacts), reason: notSentReason(error) }));
    }
  }

  // Saves this hidden place's home relay and makes its queue there, if it can be reached now.
  async function saveHome() {
    setHomeNote('');
    const address = homeUrl.trim();
    if (address && !/^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(address)) {
      setHomeNote(t('A relay address starts with ws:// or wss://.'));
      return;
    }
    const space = await loadCurrentSpaceData().catch(() => null);
    if (address && (sameRelay(address, relayUrl) || (space?.spare.url && sameRelay(address, space.spare.url)))) {
      setHomeNote(t('Use another relay than this relay, and than the space’s home relay: one relay seeing both would tie them together.'));
      return;
    }
    try {
      await setSpareRelay(address, homeToken, spareStore);
      if (!address) {
        setHomeNote(t('No home relay for these hidden chats.'));
        return;
      }
      await readySpare(spareStore);
      setHomeNote(t('The queue on the home relay is ready. Contacts learn it from your next message, or from your contact link.'));
    } catch (error) {
      setHomeNote(t('Saved, but the home relay could not be reached: {error}. It is tried again with each look.', { error: errorText(error) }));
    }
  }

  // A new ring queue for these hidden chats, if they ring, made at once with the one before deleted,
  // so whoever rang it can no longer ring this phone (MoveAt.ring: the move's own steps tell kept
  // contacts the new one, and forget the rings that brought no call). Says whether it moved; throws
  // when the relay cannot be reached, so it is tried again with each look.
  const moveRing = useRef(async () => false);
  moveRing.current = async () => {
    if (!hiddenKey || !ringing) return false;
    const { space, key } = currentSpace();
    const url = relayUrl.trim();
    const token = relayToken.trim();
    const before = (await loadHiddenData(space, pocket, hiddenKey)).ringQueue;
    if (!url || !before) return false;
    const made = await moveRingPocket(space, key, pocket, { url, token: token || undefined }, before.recipientHex);
    const ring = { recipientHex: made.recipientHex, senderHex: made.senderHex };
    await updateHiddenData(space, pocket, hiddenKey, { ringQueue: ring });
    setRingQueue(ring);
    return true;
  };

  // What moves with these hidden chats' own queue (lib/queue-move.ts): the watch slot says the new
  // one. The ring queue moves too, with the move's own steps (MoveAt.ring).
  const hiddenMoved = useRef(async (_queue: Queue, _old: Queue | null, _why: MoveWhy) => undefined as void);
  hiddenMoved.current = async (queue) => {
    if (!hiddenKey) return;
    const { space, key } = currentSpace();
    const url = relayUrl.trim();
    if (!url) return;
    if (watched) await watchPocket(space, key, pocket, { url, token: relayToken.trim(), recipientHex: queue.recipientHex }).catch(() => setWatched(false));
  };

  // A ring of this place answered with the PIN that brought no call within HIDDEN_OFFER_MS
  // (lib/hidden-ring.ts), or before these chats closed again, counts against the ring queue: three
  // within a day and it moves (lib/moves.ts fakeRings), so whoever rings it for nothing can no
  // longer. It moves only while they are open.
  useEffect(() => {
    if (!hiddenKey || !loaded) return;
    const { space } = currentSpace();
    const queues = placeQueues(space, pocket, hiddenKey);
    let open = true;
    const moveIfFake = async (rings: number[]) => {
      if (open && fakeRings(rings)) await mover.current?.ringMove();
    };
    void queues
      .load()
      .then((d) => moveIfFake(d.rings))
      .catch(() => undefined);
    const at = hiddenAnswerAt(space, pocket);
    const count = (closing = false) => {
      if (at === null || !lapseHiddenAnswer(at, Date.now(), closing)) return;
      void queues
        .update((d) => {
          const now = Date.now();
          return { ...d, rings: [...d.rings.filter((ring) => now - ring < FAKE_RINGS_WITHIN), now] };
        })
        .then((d) => moveIfFake(d.rings))
        .catch(() => undefined);
    };
    const timer = at === null ? null : setTimeout(() => count(), Math.max(0, at + HIDDEN_OFFER_MS - Date.now()));
    return () => {
      open = false;
      if (timer) clearTimeout(timer);
      count(true);
    };
  }, [hiddenKey, loaded]);

  async function createOwnQueue() {
    // What was just typed counts, even before typing paused.
    for (const field of [typedRelay, typedToken, typedVia, typedViaToken]) field.done();
    const target = relayFor(typedRelay.shown, typedToken.shown, typedVia.shown, typedViaToken.shown, spareBackup(spareStore));
    if (!target) {
      setNote(t('Type the relay address first.'));
      return;
    }
    try {
      const ids = await createQueue(target);
      setOwnQueue({ recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
      setNote(t('Relay queue created.'));
      // The new queue is the one to say a message came from.
      if (hiddenKey && watched) {
        const { space, key } = currentSpace();
        await watchPocket(space, key, pocket, { url: target.url, token: target.token ?? '', recipientHex: toHex(ids.recipientId) }).catch(() => setWatched(false));
      }
      // The ring queue lives on this relay too: a new relay needs a new ring queue.
      if (hiddenKey && ringing) {
        const { space, key } = currentSpace();
        try {
          const ring = await createQueue(target);
          const queue = { recipientHex: toHex(ring.recipientId), senderHex: toHex(ring.senderId) };
          await ringPocket(space, key, pocket, { url: target.url, token: target.token ?? '', recipientHex: queue.recipientHex, senderHex: queue.senderHex });
          await updateHiddenData(space, pocket, hiddenKey, { ringQueue: queue });
          setRingQueue(queue);
        } catch {
          setRinging(false);
        }
      }
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // Has these hidden chats say a message came while they are closed, or no longer.
  async function changeWatched(on: boolean) {
    const { space, key } = currentSpace();
    const url = typedRelay.shown.trim();
    const token = typedToken.shown.trim();
    setWatchNote('');
    try {
      if (on) {
        if (!url || !ownQueue) {
          setWatchNote(t('Create the relay queue of these hidden chats first, under Relay and new contacts.'));
          return;
        }
        await watchPocket(space, key, pocket, { url, token, recipientHex: ownQueue.recipientHex });
      } else {
        await unwatchPocket(space, key, pocket, url ? { url, token: token || undefined } : null);
      }
      setWatched(on);
    } catch (error) {
      setWatchNote(errorText(error));
    }
  }

  // Has these hidden chats ring their contacts' calls while closed, or no longer. On makes a ring
  // queue on this place's relay (lock/hidden-ring.ts) and says it to contacts; off puts a queue
  // made for nothing in its place and tells contacts it no longer rings.
  async function changeRinging(on: boolean) {
    const { space, key } = currentSpace();
    const url = typedRelay.shown.trim();
    const token = typedToken.shown.trim();
    setRingNote('');
    try {
      if (on) {
        if (!url || !ownQueue) {
          setRingNote(t('Create the relay queue of these hidden chats first, under Relay and new contacts.'));
          return;
        }
        let queue = ringQueue;
        if (!queue) {
          const ids = await createQueue({ url, token: token || undefined });
          queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
        }
        await ringPocket(space, key, pocket, { url, token, recipientHex: queue.recipientHex, senderHex: queue.senderHex });
        await updateHiddenData(space, pocket, hiddenKey!, { ringQueue: queue });
        setRingQueue(queue);
      } else {
        await unringPocket(space, key, pocket, url ? { url, token: token || undefined } : null);
        await updateHiddenData(space, pocket, hiddenKey!, { ringQueue: null });
        setRingQueue(null);
      }
      setRinging(on);
    } catch (error) {
      setRingNote(errorText(error));
    }
  }

  // Whether the text was a link Erevos takes.
  function addContact(text = contactDraft): boolean {
    const welcome = parseWelcome(text);
    if (welcome) {
      setContactDraft('');
      if (hiddenKey) void acceptContact(welcome.contact, undefined, true);
      else void takeWelcome(welcome);
      return true;
    }
    const invite = parseInvite(text);
    if (invite) {
      setContactDraft('');
      if (hiddenKey) setNote(t('An invite to a relay is taken in the chats of the space, not in hidden chats.'));
      else void joinRelay(invite);
      return true;
    }
    const code = parseContact(text);
    if (!code) {
      setNote(t('That is not an Erevos contact link.'));
      return false;
    }
    setContactDraft('');
    void acceptContact(code, undefined, true);
    return true;
  }

  // The contact just added here, connected to one of my contacts: linked to it, and named after it
  // while it has no name of its own. Hidden chats link only their own (lib/sealed-contacts.ts, linkCard).
  async function connectTo(card: ContactCard) {
    const identity = connecting;
    if (!e2e || !identity) return;
    setPickNote('');
    try {
      // Named only once linked: a phone contact is never linked, nor named after, in hidden chats.
      if (!(await linkCard(contactsPlace, card, identity))) return;
      await giveLinkedName(e2e, identity, card);
      setContacts(e2e.contacts());
      setPicking(false);
      setConnecting(null);
      // After the note that they were added, which may say what their relay gave, not in its place.
      const connected = t('Connected to {name}.', { name: card.name });
      setNote((current) => (current ? `${current} ${connected}` : connected));
    } catch (error) {
      setPickNote(errorText(error));
    }
  }

  // Their QR code, photographed or chosen from the photos, adds them at once (lib/read-qr.ts).
  async function addFromQr(from: 'camera' | 'photos') {
    setNote('');
    try {
      const text = await readQrPhoto(from);
      if (text === null) return;
      if (text && (parseContact(text) || parseInvite(text) || parseWelcome(text))) addContact(text);
      else setNote(text ? t('That QR code holds no Erevos ID.') : t('No QR code was found in the photo. Take it again closer, with all of the code in it.'));
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // Theirs that came before the time it was sent for shows then (lib/later.ts, showsAt).
  // Worked out again only when the messages, the chat or the time (every few seconds) change.
  const visible = useMemo(() => {
    const shownBy = Date.now();
    return messages.filter((message) => message.peer === selected && (message.mine || message.at <= shownBy));
  }, [messages, selected, now]);
  // The message each tag names, for the one a message answers.
  const byTag = useMemo(() => {
    const named = new Map<string, Message>();
    for (const m of visible) if (m.tag && !named.has(m.tag)) named.set(m.tag, m);
    return named;
  }, [visible]);
  // What the thread's lines do (MessageLine, SmsLine), with this render's state: the lines keep
  // one object, so one line draws again only when what it shows changes.
  rowDo.current = {
    play: (message) => void play(message),
    open: openFile,
    // Only to read while the chat opens (shown at once, before its history is in hand).
    menu: (message) => history.current && setMenuFor(message),
    goTo,
    vote: (message, option) => history.current && void vote(message, option),
    placed: (message, y) => {
      placed.current.set(message.id, y);
      // Opened at this message (a starred one, or one found): gone to once the thread has settled.
      if (goal.current === message.tag) {
        goal.current = null;
        holdScroll.current = true;
        setTimeout(() => goTo(message.peer, message.tag), 400);
      }
    },
    smsAgain: sendSmsLineAgain,
    smsMenu: setSmsMenuFor,
    smsEarlier: () => {
      holdScroll.current = true;
      smsAsked.current = lines.length;
      chatSms.earlier();
    },
    smsPlaced: (id, y) => smsPlaced.current.set(id, y),
  };
  // The SMS with their number, among the messages by time (lib/sms-chat.ts): never in hidden chats.
  const smsWith = selected?.startsWith(CONTACT_PREFIX) ? selected.slice(CONTACT_PREFIX.length) : '';
  const chatSms = useChatSms({
    identity: smsWith,
    phone: (smsWith && e2e?.phones().find((p) => p.identity === smsWith)?.phone) || '',
    hidden: !!hiddenKey,
    seen: shown && appActive,
  });
  const lines = useMemo(() => chatLines(visible, chatSms.messages, chatSms.more), [visible, chatSms.messages, chatSms.more]);
  // The first line drawn: the latest THREAD_PAGE at first, more once asked for or gone to.
  const firstLine = Math.max(0, lines.length - threadShown);
  useEffect(() => {
    // Earlier SMS that came, as asked, are drawn too.
    const asked = smsAsked.current;
    if (asked !== null && lines.length > asked) {
      smsAsked.current = null;
      setThreadShown((count) => count + lines.length - asked);
    }
    // The chat opened at a message (a starred one, or one found) earlier than the lines drawn.
    const wanted = goal.current;
    const index = wanted ? lines.findIndex((line) => line.kind === 'chat' && line.message.tag === wanted) : -1;
    if (index >= 0 && index < firstLine) setThreadShown(lines.length - index + THREAD_PAGE / 2);
  }, [lines, firstLine]);
  // The messages pinned to the top, the latest first, and the one that shows.
  const pins = visible.filter((m) => m.pinned).sort((a, b) => b.pinned! - a.pinned!);
  const pinnedNow = pins.length > 0 ? pins[pinShown % pins.length] : null;
  const starredHere = visible.filter((m) => m.starred).reverse();
  const hits = searching ? searchMessages([...visible, ...smsFindables(selected ?? '', chatSms.messages)], searching) : [];
  // Goes to what the search found, the `n`th from the latest.
  const goToHit = (n: number) => {
    const hit = hits[n];
    if (!hit) return;
    setSearchAt(n);
    holdScroll.current = true;
    goTo(hit.peer, hit.tag);
  };
  // The photos shown: the latest photos and stickers in the thread, and the one looked at on its own.
  const shownPhotos = shownOf(visible.flatMap((m) => (m.file ? [m.file] : [])));
  if (viewing?.file?.kind === 'photo' && !viewing.file.from) shownPhotos.push(viewing.file);
  if (viewingImported?.kind === 'photo') shownPhotos.push(viewingImported);
  // Each read into memory to show it (components/attachment.tsx).
  const photos = useShownPhotos(shownPhotos, (error) => setNote(t('Cannot show the photo. {error}', { error: errorText(error) })));
  const selectedIdentity = selected?.startsWith(CONTACT_PREFIX) ? selected.slice(CONTACT_PREFIX.length) : '';
  const imported = useMemo(() => (archive && selectedIdentity ? archive.linked(selectedIdentity) : []), [archive, selectedIdentity]);
  // The chat on the screen, or the hidden place open: what comes there only sounds (lib/background.ts).
  const focused = useIsFocused();
  const onScreen = !shown || !focused ? null : hiddenKey ? screenOfHidden(pocket) : selectedIdentity ? screenOfChat(selectedIdentity) : null;
  useEffect(() => (onScreen ? showOnScreen(onScreen) : undefined), [onScreen]);
  const importedFrom = [...new Set(imported.map((m) => SOURCE_LABELS[m.source]))].join(` ${t('and')} `);
  // In an imported group, each message says who wrote it.
  const importedGroup = useMemo(() => new Set(imported.filter((m) => !m.mine && m.sender).map((m) => m.sender)).size > 1, [imported]);
  // A contact without a name shows as the imported chat that goes on with them.
  const shownContacts = useMemo(
    () => contacts.map((c) => (c.name || !archive ? c : { ...c, name: cleanName(archive.linkedChats(c.identity)[0]?.title ?? '') })),
    [contacts, archive],
  );
  const chips = contacts.map((contact) => `${CONTACT_PREFIX}${contact.identity}`);
  const selectedContact = selected?.startsWith(CONTACT_PREFIX) ? selected : null;
  const talkie = selectedContact ? talkies.has(selectedContact) : false;
  listening.current = shown && appActive ? selectedContact : null;
  const selectedTimer = contacts.find((c) => c.identity === selectedIdentity)?.timer ?? 0;
  // Under the note that it was added, while its chat shows and it has no name: given one in its details (Rename), it goes.
  const connectShown = shown && !!connecting && selected === `${CONTACT_PREFIX}${connecting}` && canConnect && !contacts.find((c) => c.identity === connecting)?.name;
  const firstImported = Math.max(0, imported.length - importedShown);
  // Without a relay queue the link has only the keys: who adds it reaches this phone nearby.
  const ownLink = !e2e
    ? null
    : !hiddenKey && accountLink()
      ? accountLink()
      : ownQueue
      ? contactLink({
          // The queue the link names, which a deletion or a block leaves as it is (lib/queue-move.ts),
          // and while that is the own queue, its backup queue: the one that moves with the own one
          // goes in no link, as the own one does not.
          senderHex: (linkQueue ?? ownQueue).senderHex,
          relayUrl: relayUrl.trim(),
          key: toBase64Url(e2e.bundle),
          relayKey: ownRelayKey || undefined,
          spare: linkSpare(linkQueue?.senderHex ?? '', ownQueue.senderHex, spareCode(e2e.spare())),
          lend: ownTicket || undefined,
        })
      : hiddenKey
        ? null
        : contactLink({ senderHex: '', relayUrl: '', key: toBase64Url(e2e.bundle) });
  // A phone with no relay yet, in the space's chats: it starts with an invite, or by signing in,
  // and sees nothing of relays unless it sets one up itself.
  const newcomer = loaded && !hiddenKey && !accountLink() && !relayUrl.trim();
  // With a relay queue, this phone invites someone new (lib/welcome.ts).
  const canWelcome = !hiddenKey && !accountLink() && !!relayUrl.trim() && !!ownQueue && !!ownLink;

  const selectedName = selected ? label(selected, shownContacts) : '';
  const selectedOnline = !!selectedIdentity && !selectedHidden && !!e2e && e2e.onlineUntil(selectedIdentity, now) > 0;
  const selectedNearby = !!selectedIdentity && !hiddenKey && nearby.isNear(selectedIdentity);
  const selectedTyping = !!selected && !selectedHidden && (typing[selected] ?? 0) > Date.now();
  const subtitle = selectedContact
    ? selectedTyping
      ? t('typing…')
      : selectedOnline
        ? selectedNearby
          ? t('Online · nearby')
          : t('Online')
        : selectedNearby
          ? t('Nearby · end-to-end encrypted')
          : selectedTimer
            ? t('End-to-end encrypted · {time} after read', { time: timerLabel(selectedTimer) })
            : t('End-to-end encrypted')
    : '';

  // The bar under the name says less: whether they are typing, online or near, or that it is encrypted
  // (with the stopwatch beside it when the chat's messages disappear). All of it is read out.
  const headerSays = selectedTyping
    ? t('typing…')
    : selectedOnline
      ? selectedNearby
        ? t('Online · nearby')
        : t('Online')
      : selectedNearby
        ? t('Nearby')
        : t('Encrypted');

  // What "+" opens under the message bar: what can be sent, as tiles, then how the next message
  // goes, as rows. "Send as SMS" (a chat whose contact has a phone number linked) goes last of the
  // rows and of the send arrow's menu, a plain grey tile, as it is the one way not end-to-end encrypted.
  const tiles: ComposerTile[] = [{ key: 'photo', title: t('Photo'), icon: 'photo', onPress: () => sendPhoto('photos') }];
  if (CAN_TAKE_PHOTOS) tiles.push({ key: 'camera', title: t('Camera'), icon: 'camera', onPress: () => sendPhoto('camera') });
  tiles.push(
    { key: 'file', title: t('File'), icon: 'file', onPress: sendPickedFile },
    { key: 'sticker', title: t('Sticker'), icon: 'sticker', onPress: () => afterSheet(() => setStickering(true)) },
  );
  if (CAN_PLACE) tiles.push({ key: 'place', title: t('Location'), icon: 'place', onPress: () => afterSheet(() => void locate()) });
  tiles.push({ key: 'poll', title: t('Poll'), icon: 'poll', onPress: () => afterSheet(() => setPolling(true)) });
  const ways: ComposerWay[] = selectedContact
    ? [
        {
          key: 'vanish',
          title: t('Disappearing message'),
          description: t('Deleted once it is read'),
          icon: 'timer',
          value: vanishing ? timerLabel(vanishFor) : t('Off'),
          // On, it shows over the field, with how long; the panel gives way to it.
          onPress: () => afterSheet(() => setVanishing(true)),
        },
        {
          key: 'talkie',
          title: t('Talkie'),
          description: t('Your voice plays as soon as it arrives'),
          icon: 'talkie',
          on: talkie,
          onPress: () => toggleTalkie(selectedContact),
        },
        {
          key: 'later',
          title: t('Send later'),
          description: t('Goes at the time you choose'),
          icon: 'later',
          value: laterFor !== null ? laterLabel(laterFor) : undefined,
          onPress: () => setChoosingLater(true),
        },
      ]
    : [];
  if (selectedContact && chatSms.number) {
    ways.push({
      key: 'sms',
      title: t('Send as SMS'),
      description: t('Not encrypted · {number}', { number: chatSms.number }),
      icon: 'sms',
      plain: true,
      onPress: () => (draft.text().trim() ? afterSheet(() => void sendAsSms()) : setNote(t('Type the message first, then send it as an SMS.'))),
    });
  }
  // Held down, the send arrow: what is typed goes without a sound, later, or disappearing.
  const sendWays: SendWay[] = [
    {
      key: 'quiet',
      title: t('Without sound'),
      icon: 'quiet',
      hint: t('Their phone shows it without a sound or vibration. Erevos as a web app cannot tell, and sounds as usual.'),
      onPress: () => void send(undefined, true),
    },
    {
      key: 'later',
      title: t('Later…'),
      icon: 'later',
      hint: t('Choose when it goes'),
      onPress: () => {
        setChoosingLater(true);
        setAttaching(true);
      },
    },
    {
      key: 'vanish',
      title: t('Disappear'),
      icon: 'timer',
      hint: t('Choose how long it stays once read, then send'),
      onPress: () => setVanishing(true),
    },
  ];
  if (selectedContact && chatSms.number) {
    sendWays.push({
      key: 'sms',
      title: t('As SMS'),
      icon: 'sms',
      hint: t('A plain SMS to {number}, not encrypted', { number: chatSms.number }),
      onPress: () => void sendAsSms(),
    });
  }

  const selectedLook = contacts.find((c) => c.identity === selectedIdentity)?.look ?? null;
  const selectedAvatar = contacts.find((c) => c.identity === selectedIdentity)?.avatar ?? null;
  const signAvatar = selectedAvatar?.kind === 'emoji' ? selectedAvatar : null;
  useEffect(() => {
    if (!shown) return;
    if (!e2e || !selectedIdentity) {
      onLook(null);
      return;
    }
    onLook({
      look: selectedLook,
      save: async (look) => {
        await e2e.setLook(selectedIdentity, look);
        setContacts(e2e.contacts());
      },
    });
  }, [shown, e2e, selectedIdentity, selectedLook, onLook]);

  // Undo shows just above the thread's end.
  const measured = (change: Partial<typeof edges.current>) => {
    edges.current = { ...edges.current, ...change };
    setUndoAt(Math.max(0, edges.current.height - edges.current.end));
  };

  // What the back arrow and a swipe to the right do: out of a chat to the list of them when it was
  // opened from there, out of hidden chats closes them, else the screen before.
  const goBack =
    selected && (hiddenKey || !initial)
      ? () => setSelected(null)
      : hiddenKey && onHidden
        ? onHidden
        : () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SwipeBack onBack={goBack}>
      <View style={styles.container} onLayout={(event) => measured({ height: event.nativeEvent.layout.height })}>
        <Modal visible={styling && shown} animationType="slide" statusBarTranslucent onRequestClose={() => setStyling(false)}>
          <ScreenBackdrop>
            <View style={{ flex: 1, backgroundColor: colors.ground }}>
              <AppearanceEditor
                title={selectedName ? t('Look of {name}', { name: selectedName }) : t('Look of this chat')}
                top={
                  <View style={styles.section}>
                    <Text variant="caption" tone="muted">
                      {selectedLook
                        ? t('This chat has its own look, kept only on this phone. The rest of the app keeps its own.')
                        : t("This chat follows the app's look. Change anything below to give it its own.")}
                    </Text>
                    <Row wrap>
                      <Button title={t('Done')} compact onPress={() => setStyling(false)} />
                      {selectedLook && e2e ? (
                        <TextButton
                          title={t('Same as the app')}
                          onPress={() => {
                            void e2e.setLook(selectedIdentity, null).then(() => setContacts(e2e.contacts()));
                          }}
                        />
                      ) : null}
                    </Row>
                  </View>
                }
              />
            </View>
          </ScreenBackdrop>
        </Modal>
        <Modal
          visible={details && shown && !!selected}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setDetails(false)}
        >
          <ScreenBackdrop>
            <SwipeBack onBack={() => setDetails(false)}>
              <View style={{ flex: 1, backgroundColor: colors.ground }}>
                <View style={styles.sheetBar}>
                  <BackButton onPress={() => setDetails(false)} />
                  <Text variant="heading" style={styles.grow}>
                    {t('Details')}
                  </Text>
                  <TextButton title={t('Done')} onPress={() => setDetails(false)} />
                </View>
                <KeyboardAwareScrollView
                  contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + space.xl }]}
                  keyboardShouldPersistTaps="handled"
                  bottomOffset={space.xl}
                >
                  <View style={styles.hero}>
                    <Pressable
                      onPress={selectedContact ? () => setOpened((now) => (now === 'picture' ? null : 'picture')) : undefined}
                      accessibilityRole={selectedContact ? 'button' : undefined}
                      accessibilityLabel={selectedContact ? t('Change picture') : undefined}
                    >
                      {selectedContact ? (
                        <KeyFace identity={selectedIdentity} name={contactName(selectedContact, shownContacts) ?? ''} size={104} avatar={selectedAvatar} />
                      ) : null}
                      {selectedContact ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>✎</Text>
                        </View>
                      ) : null}
                    </Pressable>
                    <Text variant="title" numberOfLines={2} style={[styles.heroName, !contactName(selected ?? '', shownContacts) && styles.monoName]}>
                      {selectedName}
                    </Text>
                    <View style={styles.subtitle}>
                      {selectedContact ? <ShieldIcon color={colors.success} size={12} /> : null}
                      {selectedOnline ? <View style={[styles.onlineDot, { backgroundColor: colors.success }]} /> : null}
                      <Text variant="caption" tone="muted">
                        {subtitle}
                      </Text>
                    </View>
                  </View>
                  {selectedContact ? (
                    <>
                      <View style={styles.actions}>
                        <QuickAction title={t('Call')} sign="☏" onPress={() => {
                          setDetails(false);
                          void startCall(false);
                        }} />
                        <QuickAction title={t('Video')} sign="▶" onPress={() => {
                          setDetails(false);
                          void startCall(true);
                        }} />
                        <QuickAction title={t('Rename')} sign="✎" on={renaming === selectedContact} onPress={() => startRenaming(selectedContact)} />
                        <QuickAction title={t('Picture')} sign="☺" on={opened === 'picture'} onPress={() => setOpened((now) => (now === 'picture' ? null : 'picture'))} />
                      </View>
                      {renaming === selectedContact ? (
                        <View style={styles.group}>
                          <Text variant="caption" tone="muted">
                            {t('A name for them, only on this phone.')}
                          </Text>
                          <Row>
                            <Input
                              value={nameDraft}
                              onChangeText={setNameDraft}
                              onSubmitEditing={() => void rename(selectedContact)}
                              placeholder={t('Name')}
                              maxLength={MAX_NAME}
                              autoFocus
                              style={styles.grow}
                            />
                            <Button title={t('Save')} compact onPress={() => void rename(selectedContact)} />
                          </Row>
                        </View>
                      ) : null}
                      {opened === 'picture' ? (
                        <View style={styles.group}>
                          <Text variant="caption" tone="muted">
                            {t('A picture for them, only on this phone. Without one, their picture is drawn from their key.')}
                          </Text>
                          <View style={styles.signs}>
                            {AVATAR_SIGNS.map((emoji) => (
                              <Pressable
                                key={emoji}
                                onPress={() => void changeAvatar(selectedContact, { kind: 'emoji', emoji, color: signAvatar?.color ?? AVATAR_COLORS[5] })}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: signAvatar?.emoji === emoji }}
                                accessibilityLabel={emoji}
                                style={[styles.sign, signAvatar?.emoji === emoji && styles.signOn]}
                              >
                                <Text style={styles.signText}>{emoji}</Text>
                              </Pressable>
                            ))}
                          </View>
                          {signAvatar ? (
                            <View style={styles.signs}>
                              {AVATAR_COLORS.map((color) => (
                                <Pressable
                                  key={color}
                                  onPress={() => void changeAvatar(selectedContact, { ...signAvatar, color })}
                                  accessibilityRole="radio"
                                  accessibilityState={{ selected: signAvatar.color === color }}
                                  accessibilityLabel={t('Colour {color}', { color })}
                                  style={[styles.swatch, { backgroundColor: color }, signAvatar.color === color && styles.swatchOn]}
                                />
                              ))}
                            </View>
                          ) : null}
                          <Row wrap>
                            <Button title={t('Photo')} kind="secondary" compact onPress={() => void choosePhoto(selectedContact, 'photos')} />
                            {CAN_TAKE_PHOTOS ? <Button title={t('Take photo')} kind="secondary" compact onPress={() => void choosePhoto(selectedContact, 'camera')} /> : null}
                            {selectedAvatar ? <TextButton title={t('Picture from their key')} onPress={() => void changeAvatar(selectedContact, null)} /> : null}
                          </Row>
                        </View>
                      ) : null}
                      <Text variant="overline" tone="muted" style={styles.groupTitle}>
                        {t('Chat')}
                      </Text>
                      <View style={styles.group}>
                        <DetailRow
                          title={t('Search in this chat')}
                          onPress={() => {
                            setDetails(false);
                            setSearching('');
                            setSearchAt(0);
                          }}
                        />
                        <View style={styles.rule} />
                        <DetailRow
                          title={t('Disappearing messages')}
                          value={timerLabel(selectedTimer)}
                          open={opened === 'timer'}
                          onPress={() => setOpened((now) => (now === 'timer' ? null : 'timer'))}
                        />
                        {opened === 'timer' ? (
                          <View style={styles.rowMore}>
                            <Text variant="caption" tone="muted">
                              {t('New messages, sent or received, disappear from both phones this long after they are read. Messages already here stay.')}
                            </Text>
                            <Row wrap>
                              {TIMERS.map((timer) => (
                                <Chip key={timer} label={timerLabel(timer)} selected={timer === selectedTimer} onPress={() => void changeTimer(selectedContact, timer)} />
                              ))}
                            </Row>
                          </View>
                        ) : null}
                        <View style={styles.rule} />
                        <DetailRow
                          title={t('Appear offline')}
                          checked={selectedHidden}
                          onPress={() => void changeHidden(selectedContact, !selectedHidden)}
                        />
                        <Text variant="caption" tone="muted" style={styles.rowMore}>
                          {selectedHidden
                            ? t('They do not see when you are online, nor that their messages came or were read, until you write. You do not see when they are online either.')
                            : t('They see when you are online, and which of their messages you read.')}
                        </Text>
                        {CAN_PREVIEW && !hiddenKey ? (
                          <>
                            <View style={styles.rule} />
                            <DetailRow title={t('Link previews')} checked={previews} onPress={() => changePreviews(!previews)} />
                            <Text variant="caption" tone="muted" style={styles.rowMore}>
                              {throughTor()
                                ? t('None while this space goes through Tor: Erevos sends only relay requests through it.')
                                : previews
                                  ? t("When you send a link, this phone fetches its page straight from the site and sends its title, a line and a small picture inside the message. The site sees this phone's internet address. In all chats of this space, not in hidden chats.")
                                  : t("Links go as they are. Turned on, this phone fetches a link's page as you send it, and the site sees this phone's internet address. The phone that gets it fetches nothing.")}
                            </Text>
                          </>
                        ) : null}
                        <View style={styles.rule} />
                        <DetailRow
                          title={t('Chat look')}
                          value={selectedLook ? t('Its own') : t('Same as the app')}
                          onPress={() => {
                            setDetails(false);
                            setStyling(true);
                          }}
                        />
                        <View style={styles.rule} />
                        <DetailRow
                          title={t('Starred messages')}
                          value={starredHere.length > 0 ? String(starredHere.length) : ''}
                          open={opened === 'starred'}
                          onPress={() => setOpened((now) => (now === 'starred' ? null : 'starred'))}
                        />
                        {opened === 'starred' ? (
                          <View style={styles.rowMore}>
                            {starredHere.length === 0 ? (
                              <Text variant="caption" tone="muted">
                                {t('No starred messages. Press and hold a message in a chat, then tap Star.')}
                              </Text>
                            ) : null}
                            {starredHere.map((m) => (
                              <Pressable
                                key={m.id}
                                onPress={() => {
                                  setDetails(false);
                                  setTimeout(() => goTo(m.peer, m.tag), 300);
                                }}
                                accessibilityRole="button"
                                style={({ pressed }) => [styles.found, pressed && { opacity: 0.6 }]}
                              >
                                <Text numberOfLines={2}>{messageLine(m)}</Text>
                                <Text variant="caption" tone="muted">
                                  {`${m.mine ? t('You') : selectedName} · ${dayLabel(m.at)} ${clock(m.at)}`}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                        {!hiddenKey ? (
                          <>
                            <View style={styles.rule} />
                            <DetailRow title={t('Export chat')} onPress={() => void exportChat()} />
                          </>
                        ) : null}
                        {chatSms.number ? (
                          <>
                            <View style={styles.rule} />
                            <DetailRow
                              title={t('Plain SMS')}
                              value={chatSms.number}
                              onPress={() => {
                                setDetails(false);
                                setAttaching(false);
                                router.push(plainSmsHref(chatSms.number));
                              }}
                            />
                            <Text variant="caption" tone="muted" style={styles.rowMore}>
                              {t('The SMS with this number show in the chat too, marked SMS. This opens their SMS conversation, to write one when there is no internet, say. An SMS is not encrypted: the phone company can read it.')}
                            </Text>
                          </>
                        ) : null}
                      </View>
                      <Text variant="overline" tone="muted" style={styles.groupTitle}>
                        {t('Privacy')}
                      </Text>
                      <View style={styles.group}>
                        <DetailRow
                          title={t('Safety number')}
                          value={t('End-to-end encrypted')}
                          open={safety?.peer === selectedContact}
                          onPress={() => void toggleSafety(selectedContact)}
                        />
                        {safety?.peer === selectedContact ? (
                          <View style={styles.rowMore}>
                            <Text variant="caption" tone="muted">
                              {t('Compare it with theirs, in person or on a call: if both phones show the same, no one is in between.')}
                            </Text>
                            <Text selectable variant="mono" style={styles.safety}>
                              {safety.number.split(' ').reduce((lines, group, i) => lines + (i === 0 ? '' : i % 4 === 0 ? '\n' : '  ') + group, '')}
                            </Text>
                            {safety.devices > 0 ? (
                              <Text variant="caption" tone="muted">
                                {t('The list of their linked devices last changed on {day}. Your messages go to each place in it too, used by a device or not. If they did not link or unlink one then, ask them.', { day: dayText(safety.devices) })}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {!hiddenKey ? (
                          <>
                            <View style={styles.rule} />
                            <DetailRow
                              title={t('Move to hidden chats')}
                              open={opened === 'move'}
                              onPress={() => {
                                setOpened((now) => (now === 'move' ? null : 'move'));
                                setMoveNote('');
                                setStartingNew(false);
                                setNewPocket(null);
                              }}
                            />
                            {opened === 'move' ? (
                              <View style={styles.rowMore}>
                                <Text variant="caption" tone="muted">
                                  {t('The chat leaves this list and goes into the hidden chats, sealed with their PIN. To open them, type the PIN in the search on the home screen and press Enter. Nothing shows that they exist.')}
                                </Text>
                                <Input
                                  value={pinDraft}
                                  onChangeText={(text) => {
                                    setPinDraft(text);
                                    setMoveNote('');
                                  }}
                                  placeholder={t('PIN of the hidden chats, {n} or more characters', { n: MIN_PIN })}
                                  secureTextEntry
                                  autoCapitalize="none"
                                  autoCorrect={false}
                                  onSubmitEditing={() => !startingNew && void moveToHidden(selectedContact, pinDraft, null)}
                                />
                                {startingNew ? (
                                  <>
                                    <Text variant="caption" tone="muted">
                                      {t('Pick a place for them, 1 to {n}, and remember it: Erevos cannot tell which are used.', { n: POCKETS })}
                                    </Text>
                                    <Row wrap>
                                      {Array.from({ length: POCKETS }, (_, place) => (
                                        <Chip key={place} label={t('Place {n}', { n: place + 1 })} selected={newPocket === place} onPress={() => setNewPocket(place)} />
                                      ))}
                                    </Row>
                                    {newPocket !== null ? (
                                      <Text variant="caption" style={{ color: colors.danger }}>
                                        {t('New hidden chats start in place {n} with this PIN. If that place held hidden chats, they can no longer be opened.', { n: newPocket + 1 })}
                                      </Text>
                                    ) : null}
                                  </>
                                ) : null}
                                {moveNote ? (
                                  <Text variant="caption" style={{ color: colors.danger }}>
                                    {moveNote}
                                  </Text>
                                ) : null}
                                <Row wrap>
                                  <Button
                                    title={startingNew ? t('Start and move') : t('Move')}
                                    compact
                                    loading={moving}
                                    disabled={pinDraft.length < MIN_PIN || (startingNew && newPocket === null)}
                                    onPress={() => void moveToHidden(selectedContact, pinDraft, startingNew ? newPocket : null)}
                                  />
                                  <Button
                                    title={startingNew ? t('Cancel') : t('New hidden chats')}
                                    kind="secondary"
                                    compact
                                    disabled={moving}
                                    onPress={() => {
                                      setStartingNew((on) => !on);
                                      setNewPocket(null);
                                    }}
                                  />
                                </Row>
                                <Text variant="caption" tone="muted">
                                  {t('Their phone is told at once where to write from now on. A message they send in that moment may not come.')}
                                </Text>
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <View style={styles.rule} />
                            <DetailRow
                              title={t('Move back to my chats')}
                              open={opened === 'back'}
                              onPress={() => {
                                setOpened((now) => (now === 'back' ? null : 'back'));
                                setMoveNote('');
                              }}
                            />
                            {opened === 'back' ? (
                              <View style={styles.rowMore}>
                                <Text variant="caption" tone="muted">
                                  {t('The chat leaves the hidden chats with its messages, name, picture and look, and shows again among the chats of this space, which anyone who opens Erevos with its password sees. The safety number stays the same.')}
                                </Text>
                                {moveNote ? (
                                  <Text variant="caption" style={{ color: colors.danger }}>
                                    {moveNote}
                                  </Text>
                                ) : null}
                                <Row wrap>
                                  <Button title={t('Move')} compact loading={moving} onPress={() => void moveToSpace(selectedContact)} />
                                </Row>
                                <Text variant="caption" tone="muted">
                                  {t('Their phone is told at once where to write from now on. A message they send in that moment may not come.')}
                                </Text>
                              </View>
                            ) : null}
                          </>
                        )}
                      </View>
                      <View style={[styles.group, styles.groupGap]}>
                        <DetailRow
                          title={t('Delete messages')}
                          danger
                          onPress={() => {
                            setDetails(false);
                            deleteMessages(selectedContact);
                          }}
                        />
                        <DetailRow title={t('Delete contact')} danger onPress={() => deleteContact(selectedContact, false)} />
                        <DetailRow title={t('Block contact')} danger onPress={() => deleteContact(selectedContact, true)} />
                      </View>
                    </>
                  ) : null}
                </KeyboardAwareScrollView>
              </View>
            </SwipeBack>
          </ScreenBackdrop>
        </Modal>
        <WelcomeInvite
          visible={welcoming && shown && canWelcome}
          onClose={() => setWelcoming(false)}
          e2e={e2e}
          relay={relayUrl.trim() && relayToken.trim() && !isLentToken(relayToken) ? { url: relayUrl.trim(), token: relayToken.trim() } : null}
          contactLink={ownLink}
          onNote={setNote}
        />
        <Sheet visible={showQr && shown && !!ownLink} onClose={() => setShowQr(false)} title={t('My QR code')}>
          {ownLink ? <QrCode text={ownLink} size={240} /> : null}
          <Text variant="caption" tone="muted">
            {t("Scan it with the other phone's camera and open the link in Erevos. If the camera only shows the text, copy it and paste it in Relay and new contacts on that phone.")}
          </Text>
          <Row wrap>
            <Button title={t('Done')} compact onPress={() => setShowQr(false)} />
            {ownLink ? (
              <Button
                title={Platform.OS === 'web' ? t('Copy my contact link') : t('Share my contact link')}
                kind="secondary"
                compact
                onPress={() => void shareLink(ownLink)}
              />
            ) : null}
          </Row>
        </Sheet>
        {/* The chat's bar, on the bars' glass from the top of the screen, behind the status bar. */}
        <View style={[styles.topBar, { marginTop: -(insets.top + space.sm), paddingTop: insets.top + 2 }, barBlur]}>
          {hiddenKey ? (
            <Text variant="overline" tone="muted" style={styles.kicker}>
              {t('Hidden chats')}
            </Text>
          ) : null}
          <View style={styles.header}>
            <BackButton onPress={goBack} />
            {selected ? (
              <Pressable
                style={({ pressed }) => [styles.who, pressed && styles.pressed]}
                onPress={() => setDetails(true)}
                accessibilityRole="button"
                accessibilityLabel={selectedContact ? `${selectedName}, ${subtitle}` : selectedName}
                accessibilityHint={t('Chat details')}
              >
                <KeyFace identity={selectedIdentity} name={contactName(selected, shownContacts) ?? ''} size={narrow ? 36 : 40} avatar={selectedAvatar} />
                <View style={styles.grow}>
                  <Text variant="heading" numberOfLines={1} style={[styles.name, !contactName(selected, shownContacts) && styles.monoName]}>
                    {selectedName}
                  </Text>
                  {selectedContact ? (
                    <View style={styles.subtitle}>
                      {selectedOnline ? (
                        <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
                      ) : !selectedTyping && !narrow ? (
                        <ShieldIcon color={colors.success} size={11} />
                      ) : null}
                      {selectedTimer ? <TimerIcon color={colors.textMuted} size={11} /> : null}
                      <Text variant="caption" numberOfLines={1} color={selectedTyping ? colors.accentText : colors.textMuted} style={styles.grow}>
                        {headerSays}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ) : (
              <Text variant="title" style={styles.grow}>
                {hiddenKey ? t('Hidden chats') : t('Chat')}
              </Text>
            )}
            {selectedContact ? (
              <>
                <IconButton label={t('Video call')} onPress={() => void startCall(true)}>
                  <VideoIcon color={colors.text} size={24} />
                </IconButton>
                <IconButton label={t('Voice call')} onPress={() => void startCall(false)}>
                  <PhoneIcon color={colors.text} size={21} />
                </IconButton>
              </>
            ) : null}
            {selected ? (
              // Apart from the calls, so a slip calls no one; upright on Android, as its apps have it.
              <View style={styles.moreGap}>
                <IconButton label={t('Chat details')} onPress={() => setDetails(true)}>
                  <MoreIcon color={colors.text} size={Platform.OS === 'web' ? 20 : 18} upright={Platform.OS !== 'web'} />
                </IconButton>
              </View>
            ) : hiddenKey && onChangePassword ? (
              <View style={styles.headerLinks}>
                <TextButton title={t('Contacts')} onPress={() => router.push('/contacts?hidden=1')} />
                <TextButton title={t('Change PIN')} onPress={onChangePassword} />
              </View>
            ) : null}
          </View>
        </View>
        {!selected ? (
          <ScrollView style={styles.top} contentContainerStyle={styles.topContent} keyboardShouldPersistTaps="handled">
            {chips.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces} keyboardShouldPersistTaps="handled">
                {chips.map((peer) => {
                  const named = contactName(peer, shownContacts);
                  return (
                    <Pressable
                      key={peer}
                      onPress={() => setSelected(peer)}
                      accessibilityRole="button"
                      accessibilityLabel={label(peer, shownContacts)}
                      style={styles.face}
                    >
                      <View style={styles.ring}>
                        <KeyFace
                          identity={peer.slice(CONTACT_PREFIX.length)}
                          name={named ?? ''}
                          size={48}
                          avatar={contacts.find((c) => `${CONTACT_PREFIX}${c.identity}` === peer)?.avatar}
                        />
                      </View>
                      <Text variant="caption" numberOfLines={1} style={[styles.faceName, !named && styles.monoSmall]}>
                        {named ?? peer.slice(CONTACT_PREFIX.length, CONTACT_PREFIX.length + 8)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : newcomer ? null : (
              <Text tone="muted">
                {hiddenKey
                  ? t('No hidden chats yet. Add a contact through the relay below, or move a chat here from its details.')
                  : Platform.OS === 'web'
                    ? t('No chats yet. Add a contact through the relay, under Relay.')
                    : t('No chats yet. Add a contact under Relay. Your contacts reach you nearby too, over Wi-Fi or Bluetooth, without the internet.')}
              </Text>
            )}
            {newcomer ? (
              <View style={styles.panel}>
                <Text variant="label">{t('Start with an invite')}</Text>
                <Text tone="muted">
                  {t('Ask someone who uses Erevos for an invite. Scan its QR code with the camera, or open the link they send: this phone joins, typing nothing, and they are your contact at once.')}
                </Text>
                <Row wrap>
                  {CAN_TAKE_PHOTOS ? <Button title={t('Take a photo of the invite')} compact onPress={() => void addFromQr('camera')} /> : null}
                  <Button title={t('Choose a photo of the invite')} kind="secondary" compact onPress={() => void addFromQr('photos')} />
                </Row>
                <Row>
                  <Input
                    value={inviteDraft}
                    onChangeText={setInviteDraft}
                    placeholder={t('Or paste the invite link')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.grow}
                  />
                  <Button title={t('Join')} compact onPress={() => addContact(inviteDraft) && setInviteDraft('')} />
                </Row>
                <RelaySignIn url={START_RELAY} token="" onToken={(token, name) => void tookToken(START_RELAY, token, name, true)} onNote={setNote} brief />
              </View>
            ) : null}
            <View style={styles.panel}>
              {hiddenKey && canRingInBackground ? (
                <>
                  <DetailRow title={t('Say when a message comes')} checked={watched} onPress={() => void changeWatched(!watched)} />
                  <Text variant="caption" tone="muted">
                    {watched
                      ? t('While these hidden chats are closed and Erevos is in the background, a notice says only "New message", or how many came, as for the other chats; that a message came or was read makes none. Whoever sees it and finds nothing new in your chats may guess there are more.')
                      : t('Closed, these hidden chats say nothing: their messages wait on the relay until you open them.')}
                  </Text>
                  {watchNote ? <Text variant="caption" tone="muted">{watchNote}</Text> : null}
                  <DetailRow title={t('Ring calls when closed')} checked={ringing} onPress={() => void changeRinging(!ringing)} />
                  <Text variant="caption" tone="muted">
                    {ringing
                      ? t('While these hidden chats are closed and Erevos is in the background, a call from one of their contacts makes the phone ring and show "Incoming call" with no name. On the ringing screen, tap the small sign and type the PIN to answer. Whoever holds the phone sees a call that is in none of your chats, and may guess there are more.')
                      : t('Closed, these hidden chats do not ring: a call from their contacts rings only while they are open.')}
                  </Text>
                  {ringNote ? <Text variant="caption" tone="muted">{ringNote}</Text> : null}
                </>
              ) : null}
              <Row wrap>
                {canWelcome ? <Button title={t('Invite someone')} compact onPress={() => setWelcoming(true)} /> : null}
                <TextButton
                  title={showRelay ? t('Hide relay and new contacts') : newcomer ? t('Set it up yourself') : t('Relay and new contacts')}
                  onPress={() => {
                    // Setting it up yourself is setting the relay up.
                    if (!showRelay && newcomer) setRelayShown(true);
                    setShowRelay((on) => !on);
                  }}
                />
              </Row>
              {showRelay ? (
                <View style={styles.section}>
                  {ownLink ? (
                    <View style={styles.section}>
                      <Text tone="muted">
                        {ownQueue
                          ? t('Your relay queue is ready. Give your contact link to whoever may write to you.')
                          : t('No relay queue yet. Your contact link has only your keys: who adds it reaches you nearby, over Wi-Fi or Bluetooth, until you have a relay.')}
                      </Text>
                      <Row wrap>
                        <Button title={t('Show my QR code')} compact onPress={() => setShowQr(true)} />
                        <Button
                          title={Platform.OS === 'web' ? t('Copy my contact link') : t('Share my contact link')}
                          kind="secondary"
                          compact
                          onPress={() => void shareLink(ownLink)}
                        />
                        {ownQueue && !accountLink() ? <Button title={t('New contact link')} kind="secondary" compact onPress={newContactLink} /> : null}
                      </Row>
                      {ownQueue && canSharePlace ? (
                        <View>
                          <DetailRow
                            title={t('Share a place on my relay with this link')}
                            checked={sharePlace}
                            onPress={() => setSharePlace(!sharePlace)}
                          />
                          <Text variant="caption" tone="muted">
                            {sharePlace
                              ? t('For a month, whoever adds you with this link and has no relay of their own can take a place on your relay. Anyone who sees the link can, so give it only to whom you mean to.')
                              : t('The link has no place on your relay in it. Turn this on for someone with no relay of their own.')}
                          </Text>
                          {placeNote ? <Text variant="caption" tone="muted">{placeNote}</Text> : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  <Text tone="muted">{t('Add a contact by the contact link they gave you:')}</Text>
                  <Row>
                    <Input
                      value={contactDraft}
                      onChangeText={setContactDraft}
                      placeholder={t('erevos://contact link')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.grow}
                    />
                    <Button title={t('Add')} compact onPress={() => addContact()} />
                  </Row>
                  {/* Not in hidden chats: a photo leaves Erevos, which closes them. */}
                  {!hiddenKey ? (
                    <Row wrap>
                      {CAN_TAKE_PHOTOS ? <Button title={t('Take a photo of the QR code')} kind="secondary" compact onPress={() => void addFromQr('camera')} /> : null}
                      <Button title={t('Choose a photo of the QR code')} kind="secondary" compact onPress={() => void addFromQr('photos')} />
                    </Row>
                  ) : null}
                  <TextButton title={relayShown ? t('Hide relay settings') : t('Relay settings')} onPress={() => setRelayShown((on) => !on)} />
                  {relayShown ? (
                    <View style={styles.section}>
                      <Field label={t('Relay address')}>
                        <Input
                          value={typedRelay.shown}
                          onChangeText={typedRelay.type}
                          onBlur={typedRelay.done}
                          placeholder="ws://computer-address:7879"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                        />
                      </Field>
                      {isLentToken(relayToken) ? (
                        <Text variant="caption" tone="muted">
                          {t("A place lent on this relay through a contact's link: no token of your own is needed. Type another relay to use that one instead.")}
                        </Text>
                      ) : (
                        <Field label={t('Token (optional)')}>
                          <Input
                            value={typedToken.shown}
                            onChangeText={typedToken.type}
                            onBlur={typedToken.done}
                            placeholder={t('Token, if the relay needs one')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            secureTextEntry
                          />
                        </Field>
                      )}
                      {!hiddenKey && relayUrl.trim() ? (
                        <RelaySignIn
                          url={relayUrl.trim()}
                          token={relayToken.trim()}
                          onToken={(token, name) => void tookToken(relayUrl.trim(), token, name)}
                          onNote={setNote}
                        />
                      ) : null}
                      {!hiddenKey && relayUrl.trim() && relayToken.trim() && !isLentToken(relayToken) ? (
                        <RelayInvites relay={{ url: relayUrl.trim(), token: relayToken.trim() }} onNote={setNote} />
                      ) : null}
                      <Field label={t('Second relay (optional)')}>
                        <Input
                          value={typedVia.shown}
                          onChangeText={typedVia.type}
                          onBlur={typedVia.done}
                          placeholder="wss://another-relay"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                        />
                      </Field>
                      {typedVia.shown.trim() ? (
                        <Field label={t('Second relay token (optional)')}>
                          <Input
                            value={typedViaToken.shown}
                            onChangeText={typedViaToken.type}
                            onBlur={typedViaToken.done}
                            placeholder={t('Token, if the second relay needs one')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            secureTextEntry
                          />
                        </Field>
                      ) : null}
                      <Text variant="caption" tone="muted">
                        {t("With a second relay, what you send goes through it first, sealed for your relay. Your relay then never sees your phone's address, and the second relay never sees who a message is for. Taking messages still goes straight to your relay.")}
                      </Text>
                      <Button title={t('Create my relay queue')} compact onPress={createOwnQueue} />
                      {hiddenKey ? (
                        <>
                          <Field label={t('Home relay for these hidden chats (optional)')}>
                            <Input
                              value={homeUrl}
                              onChangeText={setHomeUrl}
                              placeholder="wss://relay.at-home.example"
                              autoCapitalize="none"
                              autoCorrect={false}
                              keyboardType="url"
                            />
                          </Field>
                          {homeUrl.trim() ? (
                            <Field label={t('Home relay token (optional)')}>
                              <Input
                                value={homeToken}
                                onChangeText={setHomeToken}
                                placeholder={t('Token, if the home relay needs one')}
                                autoCapitalize="none"
                                autoCorrect={false}
                                secureTextEntry
                              />
                            </Field>
                          ) : null}
                          <Text variant="caption" tone="muted">
                            {t("A second relay with a queue of their own, which contacts write to while your relay cannot be reached. It is kept with these hidden chats only, so the space knows nothing of it, and it is looked at while they are open. Use another one than the space's home relay.")}
                          </Text>
                          <Button title={t('Save home relay')} kind="secondary" compact onPress={() => void saveHome()} />
                          {homeNote ? <Text variant="caption" tone="muted">{homeNote}</Text> : null}
                        </>
                      ) : null}
                    </View>
                  ) : null}
                  {/* On a linked computer the phone keeps who is blocked. */}
                  {!accountLink() ? (
                    <View style={styles.section}>
                      <Text variant="label">{t('Blocked contacts')}</Text>
                      {blocked.length === 0 ? (
                        <Text variant="caption" tone="muted">
                          {t('No one is blocked.')}
                        </Text>
                      ) : (
                        blocked.map((b) => (
                          <Row key={b.identity}>
                            <Text style={[styles.grow, !b.name && styles.monoName]} numberOfLines={1}>
                              {b.name || b.identity.slice(0, 16)}
                            </Text>
                            <TextButton title={t('Unblock')} onPress={() => void unblock(b.identity)} />
                          </Row>
                        ))
                      )}
                    </View>
                  ) : null}
                  {HAS_LINKS && !hiddenKey ? (
                    <View>
                      <DetailRow title={t('Find Erevos on the same Wi-Fi')} checked={lanOn} onPress={() => changeLan(!lanOn)} />
                      <Text variant="caption" tone="muted">
                        {lanOn
                          ? t('While a space is open, Erevos phones and computers on the same Wi-Fi or hotspot find each other and talk directly, even with no internet. Anyone on that Wi-Fi can tell an Erevos app is there, not whose.')
                          : HAS_RADIO
                            ? t('Only Bluetooth and Wi-Fi Aware look for phones nearby.')
                            : t('Nothing looks for Erevos nearby.')}
                      </Text>
                      {CAN_DIRECT && lanOn ? (
                        <>
                          <DetailRow title={t('Make a Wi-Fi with phones nearby')} checked={directOn} onPress={() => changeDirect(!directOn)} />
                          <Text variant="caption" tone="muted">
                            {directOn
                              ? t('With no Wi-Fi in common, two Erevos phones near each other make a small Wi-Fi of their own (Wi-Fi Direct): faster than Bluetooth, and calls go over it with no internet. Anyone near can tell an Erevos phone is there and could join that Wi-Fi, getting only sealed bytes.')
                              : t('Erevos phones meet only on a Wi-Fi they share, or over Bluetooth and Wi-Fi Aware.')}
                          </Text>
                        </>
                      ) : null}
                      <DetailRow title={t('Carry messages for others')} checked={carrying} onPress={() => changeCarrying(!carrying)} />
                      <Text variant="caption" tone="muted">
                        {carrying
                          ? t("When the relay cannot be reached, Erevos phones nearby give each other what they could not send, sealed for the contact's relay. This phone keeps those it gets, three days at most, and hands them to that relay through yours. It cannot read them, nor tell who they are from or for: it sees only the relay's address.")
                          : t('Off unless you turn it on: this phone keeps nothing for others. What it cannot send, phones nearby carry for you if theirs is on.')}
                      </Text>
                      {canLora() ? (
                        <>
                          <DetailRow title={t('LoRa radio')} value={t(LORA_SHOWN[lora.state().status])} onPress={() => router.push('/lora')} />
                          <Text variant="caption" tone="muted">
                            {t('With a Meshtastic radio, text goes kilometres with no internet, when nothing else takes it.')}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </ScrollView>
        ) : selectedContact && contacts.some((c) => c.request && `${CONTACT_PREFIX}${c.identity}` === selectedContact) ? (
          <View style={styles.panel}>
            <Text>{t('Message request')}</Text>
            <Text variant="caption" tone="muted">
              {t('Someone with your contact link wrote to you. Until you accept, their phone is not told that their messages came or were read. Writing to them accepts too.')}
            </Text>
            <Row wrap>
              <TextButton title={t('Accept')} onPress={() => void acceptRequest(selectedContact)} />
              <TextButton title={t('Refuse')} onPress={() => refuseRequest(selectedContact)} />
              <TextButton title={t('Block')} onPress={() => deleteContact(selectedContact, true)} />
            </Row>
          </View>
        ) : null}
        {searching !== null ? (
          <Row style={styles.searchBar}>
            <Input
              value={searching}
              onChangeText={(text) => {
                setSearching(text);
                setSearchAt(0);
              }}
              onSubmitEditing={() => goToHit(searchAt)}
              placeholder={t('Search in this chat')}
              autoFocus
              returnKeyType="search"
              style={styles.grow}
            />
            <Text variant="caption" tone="muted">
              {searching.trim() ? (hits.length > 0 ? t('{n} of {count}', { n: searchAt + 1, count: hits.length }) : t('None')) : ''}
            </Text>
            <SearchStep sign="▲" label={t('Earlier')} onPress={() => goToHit(Math.min(hits.length - 1, searchAt + 1))} />
            <SearchStep sign="▼" label={t('Later')} onPress={() => goToHit(Math.max(0, searchAt - 1))} />
            <SearchStep sign="✕" label={t('Close')} onPress={() => setSearching(null)} />
          </Row>
        ) : null}
        {pinnedNow ? (
          <Pinned
            line={messageLine(pinnedNow)}
            index={pinShown % pins.length}
            count={pins.length}
            onPress={() => {
              goTo(pinnedNow.peer, pinnedNow.tag);
              setPinShown((n) => (n + 1) % pins.length);
            }}
          />
        ) : null}
        <ScrollView
          ref={thread}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          onLayout={(event) => {
            measured({ end: event.nativeEvent.layout.y + event.nativeEvent.layout.height });
            if (atEnd.current) thread.current?.scrollToEnd({ animated: false });
          }}
          onContentSizeChange={() => {
            if (holdScroll.current) holdScroll.current = false;
            else thread.current?.scrollToEnd({ animated: true });
          }}
          // Read to the end, the thread stays at its end as the keyboard, the panel under the bar or
          // what the bar shows over the field take room from it.
          onScroll={(event) => {
            const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
            atEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 48;
          }}
          scrollEventThrottle={100}
        >
          {firstLine > 0 ? (
            <TextButton
              title={t('Show earlier messages ({n} more)', { n: firstLine })}
              onPress={() => {
                holdScroll.current = true;
                setThreadShown((count) => count + THREAD_PAGE * 3);
              }}
            />
          ) : (
            // What was imported, before the thread, once all of the thread shows.
            <>
              {firstImported > 0 ? (
                <TextButton
                  title={t('Show earlier imported messages ({n} more)', { n: firstImported })}
                  onPress={() => {
                    holdScroll.current = true;
                    setImportedShown((count) => count + IMPORTED_PAGE * 4);
                  }}
                />
              ) : null}
              {imported.length > 0 ? (
                <Text variant="caption" tone="muted" style={styles.divider}>
                  {t('Imported from {from}: only on this phone, only to read.', { from: importedFrom })}
                </Text>
              ) : null}
              {imported.slice(firstImported).map((message, i) => {
                const files = mediaText(message.media);
                const ink = message.mine ? [styles.mineText, b.mineText] : [styles.theirsText, b.theirsText];
                return (
                  <View key={`imported-${firstImported + i}`} style={[styles.bubble, message.mine ? b.mine : b.theirs, styles.imported]}>
                    {importedGroup && !message.mine && message.sender ? <Text style={[ink, styles.sender]}>{message.sender}</Text> : null}
                    {message.files.map((file, n) => (
                      <Pressable key={`${file.id}-${n}`} onPress={() => setViewingImported(file)} accessibilityRole="button">
                        <Attachment file={file} uri={photos[file.id]} ink={ink} />
                      </Pressable>
                    ))}
                    {message.text ? <Text style={ink}>{message.text}</Text> : null}
                    {files ? <Text style={[ink, styles.files]}>{t('{files}, not imported', { files })}</Text> : null}
                    {message.at ? <Text style={[ink, styles.time]}>{shownTime(message.at)}</Text> : null}
                  </View>
                );
              })}
              {imported.length > 0 ? (
                <Text variant="caption" tone="muted" style={styles.divider}>
                  {t('Continued in Erevos')}
                </Text>
              ) : null}
            </>
          )}
          {selected && visible.length === 0 && imported.length === 0 && chatSms.messages.length === 0 ? (
            <View style={styles.hello}>
              <ShieldIcon color={colors.textFaint} size={28} />
              <Text variant="caption" tone="muted" style={styles.divider}>
                {t('No messages yet. What you write here is end-to-end encrypted, and kept sealed on this phone.')}
              </Text>
            </View>
          ) : null}
          {lines.slice(firstLine).map((line, k) => {
            const i = firstLine + k;
            const before = k === 0 ? undefined : lines[i - 1];
            const after = lines[i + 1];
            const newDay = !before || dayOf(before.at) !== dayOf(line.at);
            // The last of a run from one side gets the bubble's tail, and room after it; an SMS and a
            // message of the chat are never one run.
            const tail = !after || after.mine !== line.mine || after.kind !== line.kind || dayOf(after.at) !== dayOf(line.at);
            if (line.kind === 'sms') {
              const id = smsLineId(line.sms);
              return (
                <SmsLine key={`sms-${id}`} sms={line.sms} earlier={!!line.earlier} newDay={newDay} tail={tail} lit={lit === id} styles={styles} b={b} colors={colors} acts={rowActs} />
              );
            }
            const message = line.message;
            return (
              <MessageLine
                key={message.id}
                message={message}
                quoted={message.re ? byTag.get(message.re) : undefined}
                name={selectedName}
                newDay={newDay}
                tail={tail}
                lit={lit === message.id}
                played={playingId === message.id ? played : null}
                photo={message.file ? photos[message.file.id] : undefined}
                taking={taking[`${message.peer}|${message.tag}`]}
                plays={lines.length - i <= PLAYS_LAST}
                canAnswer={theyHave(message)}
                waits={scheduled(message)}
                styles={styles}
                b={b}
                colors={colors}
                acts={rowActs}
              />
            );
          })}
        </ScrollView>
        {note ? <Text variant="caption" style={styles.note}>{note}</Text> : null}
        {connectShown ? (
          <Row wrap>
            <TextButton
              title={t('Connect to one of my contacts')}
              onPress={() => {
                setPickNote('');
                setPicking(true);
              }}
            />
            <TextButton title={t('Not now')} onPress={() => setConnecting(null)} />
          </Row>
        ) : null}
        {selectedContact ? (
          <View style={styles.dock}>
            <DraftComposer
              draft={draft}
              onChangeText={typed}
              placeholder={t('Message {name}', { name: selectedName })}
              maxLength={4000}
              enterSends
              onSend={() => void send()}
              sendWays={sendWays}
              voice={{ recording: talking, start: startTalking, stop: (cancel) => void stopTalking(cancel) }}
              talkie={{ on: talkie, onOff: () => toggleTalkie(selectedContact) }}
              vanish={{
                on: vanishing,
                seconds: vanishFor,
                choices: TIMERS.slice(1),
                label: timerLabel,
                onToggle: () => setVanishing((on) => !on),
                onChoose: setVanishFor,
              }}
              answering={
                replying && replying.peer === selected
                  ? {
                      name: replying.mine ? t('You') : selectedName,
                      line: messageLine(replying),
                      onPress: () => goTo(replying.peer, replying.tag),
                      onClose: () => setReplying(null),
                    }
                  : null
              }
              later={
                laterFor !== null
                  ? { line: t('The next photo, file or voice message goes on {when}.', { when: laterLabel(laterFor) }), onCancel: () => setLaterFor(null) }
                  : null
              }
              onSticker={() => afterSheet(() => setStickering(true))}
              panel={
                <ComposerPanel
                  tiles={tiles}
                  quality={{ value: quality, onChange: chooseQuality }}
                  ways={ways}
                  foot={t('A file goes as it is, up to 100 MB, with whatever it says inside. The relay keeps it, encrypted, until {name} takes it, 14 days at most.', { name: selectedName })}
                  page={
                    choosingLater
                      ? {
                          title: t('Send later'),
                          onBack: () => setChoosingLater(false),
                          children: (
                            <>
                              <LaterPicker onPick={(at) => void sendLater(at)} />
                              <Text variant="caption" tone="muted">
                                {nothingTyped ? `${t('With nothing typed, the next photo, file or voice message goes then.')} ` : ''}
                                {hiddenKey
                                  ? t('The relay keeps it and sends it at that time, even if this phone is off then. In hidden chats the relay has to be reachable now.')
                                  : t('The relay keeps it and sends it at that time, even if this phone is off then.')}
                              </Text>
                            </>
                          ),
                        }
                      : null
                  }
                />
              }
              panelOpen={attaching && shown}
              onPanel={(open) => {
                setAttaching(open);
                if (!open) setChoosingLater(false);
              }}
            />
          </View>
        ) : null}
        <MessageMenu
          visible={menuFor !== null && shown}
          onClose={() => setMenuFor(null)}
          line={menuFor ? messageLine(menuFor) : ''}
          reaction={menuFor?.myReaction}
          onReact={menuFor && theyHave(menuFor) ? (emoji) => void react(menuFor, emoji) : undefined}
          actions={menuFor ? menuActions(menuFor) : []}
        />
        <MessageMenu
          visible={smsMenuFor !== null && shown}
          onClose={() => setSmsMenuFor(null)}
          line={smsMenuFor ? smsMenuFor.text.split('\n')[0].trim() || t('Picture') : ''}
          actions={smsMenuFor ? smsActions(smsMenuFor) : []}
        />
        <SmsForward
          message={shown ? smsForwarding : null}
          contacts={shownContacts.map((c) => ({ identity: c.identity, name: c.name, request: c.request, phone: e2e?.phones().find((p) => p.identity === c.identity)?.phone }))}
          onClose={() => setSmsForwarding(null)}
          onNote={setNote}
          onChat={(identity, text) => {
            setSelected(`${CONTACT_PREFIX}${identity}`);
            draft.set((typed) => (typed.trim() ? `${typed}\n${text}` : text));
          }}
        />
        <PollSheet visible={polling && shown} onClose={() => setPolling(false)} onSend={sendPoll} />
        <Sheet visible={!!placeFound && shown} onClose={() => setPlaceFound(null)} title={t('Send where you are?')}>
          {placeFound ? (
            <>
              <Text selectable>{placeText(placeFound)}</Text>
              {placeFound.acc !== undefined ? (
                <Text variant="caption" tone="muted">
                  {t('Within about {m} m', { m: placeFound.acc })}
                </Text>
              ) : null}
              <Text variant="caption" tone="muted">
                {t('{name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.', { name: selectedName })}
              </Text>
              <Row wrap>
                <Button title={t('Send')} compact onPress={() => sendPlace(placeFound)} />
                <TextButton title={t('Open in maps')} onPress={() => openPlace(placeFound)} />
                <TextButton title={t('Cancel')} onPress={() => setPlaceFound(null)} />
              </Row>
            </>
          ) : null}
        </Sheet>
        <ConnectPicker visible={picking && shown && !!connecting} among={among} identity={connecting ?? ''} onPick={(card) => void connectTo(card)} onClose={() => setPicking(false)} note={pickNote} />
        <Sheet visible={stickering && shown} onClose={() => setStickering(false)} title={t('Send a sticker')}>
          <StickerPicker onPick={sendSticker} mine={{ place: stickerPlace, onPick: sendOwnSticker }} />
        </Sheet>
        <Sheet visible={!!forwarding && shown} onClose={() => setForwarding(null)} title={t('Forward to')}>
          {forwarding ? (
            <>
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {messageLine(forwarding)}
              </Text>
              {shownContacts
                .filter((c) => !c.request)
                .map((c) => (
                  <TextButton key={c.identity} title={label(`${CONTACT_PREFIX}${c.identity}`, shownContacts)} onPress={() => void forwardTo(forwarding, `${CONTACT_PREFIX}${c.identity}`)} />
                ))}
              {forwardGroups.map((group) => (
                <TextButton key={group.id} title={t('{name} (group)', { name: group.name })} onPress={() => void forwardToGroupChat(forwarding, group.id)} />
              ))}
              <Text variant="caption" tone="muted">
                {t('It goes as a copy, sent anew and end-to-end encrypted, marked as forwarded but not from where.')}
              </Text>
            </>
          ) : null}
        </Sheet>
        {shown ? <UndoBar bottom={undoAt + space.sm} /> : null}
        <FileViewer
          file={viewing?.file ?? viewingImported}
          uri={viewing?.file ? photos[viewing.file.id] : viewingImported ? photos[viewingImported.id] : undefined}
          onSave={(choose) => (viewing ? void saveAttachment(viewing, choose) : viewingImported && void saveImported(viewingImported, choose))}
          onClose={() => {
            setViewing(null);
            setViewingImported(null);
          }}
        />
      </View>
    </SwipeBack>
  );
}

// A round button under the picture in a chat's details, with its name under it.
function QuickAction({ title, sign, on = false, onPress }: { title: string; sign: string; on?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ alignItems: 'center', gap: 6, minWidth: 64, opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: on ? colors.primary : withAlpha(colors.border, 0.6),
        }}
      >
        <Text style={{ fontSize: 20, lineHeight: 24, color: on ? colors.onPrimary : colors.accentText }}>{sign}</Text>
      </View>
      <Text variant="caption" tone={on ? undefined : 'muted'}>
        {title}
      </Text>
    </Pressable>
  );
}

// A row in a chat's details: its name, and its value or a switch, with an arrow when it opens more.
function DetailRow({ title, value, right, checked, open, danger = false, onPress }: {
  title: string;
  value?: string;
  right?: ReactNode;
  /** A switch, on or off, in place of the arrow; the row is read out as a switch. */
  checked?: boolean;
  /** Whether what it opens under it shows; without it, the row goes somewhere or acts at once. */
  open?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={checked === undefined ? 'button' : 'switch'}
      accessibilityState={checked !== undefined ? { checked } : open === undefined ? undefined : { expanded: open }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        minHeight: 48,
        paddingVertical: 6,
        borderRadius: radius.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ flex: 1, color: danger ? colors.danger : colors.text }}>{title}</Text>
      {value ? (
        <Text tone="muted" numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
          {value}
        </Text>
      ) : null}
      {right}
      {checked !== undefined ? <Toggle on={checked} /> : null}
      {!right && checked === undefined && !danger ? (
        <Text style={{ fontSize: 20, lineHeight: 22, color: colors.textFaint, transform: [{ rotate: open ? '90deg' : '0deg' }] }}>›</Text>
      ) : null}
    </Pressable>
  );
}

/** A step of the search in a chat: to what it found earlier or later, or closing it. */
function SearchStep({ sign, label, onPress }: { sign: string; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontSize: 16, color: colors.accentText }}>{sign}</Text>
    </Pressable>
  );
}

const dayOf = (at: number) => new Date(at).toDateString();

// A day as the chat's details say it, in the app's language: 21 October 2026.
function dayText(at: number): string {
  try {
    return new Date(at).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return new Date(at).toLocaleDateString();
  }
}

const clock = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Above the first message of a day: Today, Yesterday, or its date.
function dayLabel(at: number): string {
  const d = new Date(at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return t('Today');
  if (d.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString()) return t('Yesterday');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// What a line of the thread does when pressed, held or laid out (ChatScreen's rowDo).
type RowActs = {
  play: (message: Message) => void;
  open: (message: Message) => void;
  menu: (message: Message) => void;
  goTo: (peer: string, tag: string) => void;
  vote: (message: Message, option: number) => void;
  placed: (message: Message, y: number) => void;
  smsAgain: (sms: SmsMessage) => void;
  smsMenu: (sms: SmsMessage) => void;
  smsEarlier: () => void;
  smsPlaced: (id: string, y: number) => void;
};

/** One RowActs that stays the same, doing what the latest render's does. */
function steadyActs(latest: RefObject<RowActs | null>): RowActs {
  const now = () => latest.current!;
  return {
    play: (message) => now().play(message),
    open: (message) => now().open(message),
    menu: (message) => now().menu(message),
    goTo: (peer, tag) => now().goTo(peer, tag),
    vote: (message, option) => now().vote(message, option),
    placed: (message, y) => now().placed(message, y),
    smsAgain: (sms) => now().smsAgain(sms),
    smsMenu: (sms) => now().smsMenu(sms),
    smsEarlier: () => now().smsEarlier(),
    smsPlaced: (id, y) => now().smsPlaced(id, y),
  };
}

type LineLook = { styles: ReturnType<typeof makeStyles>; b: ReturnType<typeof bubbleStyles>; colors: Colors; acts: RowActs };

// A message of the thread. It draws again only when what it shows changes, not each time the
// chat does (a voice message playing, a note), which keeps a long thread light to scroll.
const MessageLine = memo(function MessageLine({ message, quoted, name, newDay, tail, lit, played, photo, taking, plays, canAnswer, waits, styles, b, colors, acts }: LineLook & {
  message: Message;
  /** The message it answers, when here. */
  quoted?: Message;
  /** The contact's name. */
  name: string;
  newDay: boolean;
  tail: boolean;
  lit: boolean;
  /** How far it has played, ms, while it is the voice message playing. */
  played: number | null;
  photo?: string;
  taking?: string;
  /** A sticker among the last of the thread, which moves. */
  plays: boolean;
  /** They have it, so it can be voted on. */
  canAnswer: boolean;
  /** Ours sent for later, its time not come yet (scheduled): it says when it goes, until then. */
  waits: boolean;
}) {
  useLang();
  const ink = message.mine ? [styles.mineText, b.mineText] : [styles.theirsText, b.theirsText];
  // A sticker, built in or made from a photo, shows on its own, with no bubble.
  const stuck = !!message.sticker || !!message.file?.sticker;
  return (
    <View onLayout={(event) => acts.placed(message, event.nativeEvent.layout.y)}>
      {newDay && message.at ? (
        <Text variant="caption" tone="muted" style={[styles.divider, styles.day]}>
          {dayLabel(message.at)}
        </Text>
      ) : null}
      <Pressable
        onPress={message.voice ? () => acts.play(message) : message.file ? () => acts.open(message) : undefined}
        onLongPress={() => acts.menu(message)}
        accessibilityHint={message.voice ? t('Tap to play, hold for more') : message.file ? t('Tap to open, hold for more') : t('Hold for more')}
        style={[
          styles.bubble,
          message.mine ? b.mine : b.theirs,
          message.file?.kind === 'photo' && !stuck && styles.photoBubble,
          tail && !stuck && (message.mine ? [b.mineTail, styles.mineTail] : [b.theirsTail, styles.theirsTail]),
          stuck && styles.stickerBubble,
          (message.myReaction || message.theirReaction) && styles.reacted,
          lit && styles.lit,
        ]}
      >
        {message.re ? (
          <Quote
            name={quoted ? (quoted.mine ? t('You') : name) : ''}
            line={quoted ? messageLine(quoted) : ''}
            ink={ink}
            onPress={() => acts.goTo(message.peer, message.re!)}
          />
        ) : null}
        {message.sticker ? (
          <StickerView name={message.sticker} fallback={message.text} play={plays} tap onLongPress={() => acts.menu(message)} />
        ) : message.file?.sticker ? (
          <PhotoSticker uri={photo} status={comingText(message.file, taking)} />
        ) : message.place ? (
          <PlaceCard place={message.place} ink={ink} />
        ) : message.poll ? (
          <PollCard
            poll={message.poll}
            voters={[
              { name: t('You'), chose: message.myVote ?? [] },
              { name, chose: message.theirVote ?? [] },
            ]}
            mine={message.myVote ?? []}
            onChoose={canAnswer ? (option) => acts.vote(message, option) : undefined}
            ink={ink}
          />
        ) : message.file ? (
          <Attachment file={message.file} uri={photo} state={taking} ink={ink} />
        ) : (
          <Text style={ink}>
            {message.voice
              ? played !== null
                ? `■  ${t('Playing, {time}', { time: voiceDuration(Math.max(0, message.voice.ms - played)) })}`
                : `▶  ${t('Voice message, {time}', { time: voiceDuration(message.voice.ms) })}`
              : <LinkedText text={shownLine(message.text)} />}
          </Text>
        )}
        {message.preview && !message.voice && !message.file ? <PreviewCard preview={message.preview} ink={ink} /> : null}
        <Text style={[ink, styles.time, stuck && { color: colors.textMuted }]}>
          {[message.forwarded ? t('Forwarded') : '', message.at && !waits ? clock(message.at) : '', caption(message)].filter(Boolean).join('  ·  ')}
        </Text>
      </Pressable>
      <Reactions
        signs={[message.theirReaction, message.myReaction].filter((sign): sign is string => !!sign)}
        mine={message.myReaction}
        mineSide={message.mine}
        onPress={() => acts.menu(message)}
      />
    </View>
  );
});

// An SMS or MMS with their number among the thread's messages, drawn again only when it changes.
const SmsLine = memo(function SmsLine({ sms: m, earlier, newDay, tail, lit, styles, b, colors, acts }: LineLook & {
  sms: SmsMessage;
  /** The first SMS read, with a way to ask for earlier ones above it. */
  earlier: boolean;
  newDay: boolean;
  tail: boolean;
  lit: boolean;
}) {
  useLang();
  const id = smsLineId(m);
  const ink = m.mine ? [styles.mineText, b.mineText] : [styles.theirsText, b.theirsText];
  return (
    <View onLayout={(event) => acts.smsPlaced(id, event.nativeEvent.layout.y)}>
      {earlier ? <TextButton title={t('Show earlier SMS')} onPress={acts.smsEarlier} /> : null}
      {newDay ? (
        <Text variant="caption" tone="muted" style={[styles.divider, styles.day]}>
          {dayLabel(m.at)}
        </Text>
      ) : null}
      <Pressable
        onPress={smsFailed(m) ? () => acts.smsAgain(m) : undefined}
        onLongPress={() => acts.smsMenu(m)}
        accessibilityHint={smsFailed(m) ? t('Tap to send it again.') : t('Hold for more')}
        style={[
          styles.bubble,
          m.mine ? b.mine : b.theirs,
          tail && (m.mine ? [b.mineTail, styles.mineTail] : [b.theirsTail, styles.theirsTail]),
          styles.sms,
          lit && styles.lit,
        ]}
      >
        {(m.pictures ?? []).map((p) => (
          <Image key={p.uri} source={{ uri: p.uri }} style={styles.smsPicture} resizeMode="cover" accessibilityLabel={t('Picture')} />
        ))}
        {m.text ? (
          <Text style={ink}>
            <LinkedText text={m.text} />
          </Text>
        ) : null}
        {/* Marked plain: what the SMS screen says of every SMS, and its marks. */}
        <Text style={[ink, styles.time]}>
          {[m.kind === 'mms' ? t('MMS (not encrypted)') : t('SMS (not encrypted)'), clock(m.at), m.mine ? smsMark(m.state) : ''].filter(Boolean).join('  ·  ')}
        </Text>
        {smsFailed(m) ? <Text style={[styles.time, { color: colors.danger }]}>{t('Tap to send it again.')}</Text> : null}
      </Pressable>
    </View>
  );
});

const layout = StyleSheet.create({
  screen: {
    flex: 1,
  },
  gone: {
    display: 'none',
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: space.lg,
      paddingTop: space.sm,
      gap: space.sm,
      backgroundColor: colors.ground,
    },
    kicker: {
      paddingHorizontal: space.md,
    },
    // The chat's bar at the top, across the screen and behind the status bar, on the bars' glass.
    topBar: {
      marginHorizontal: -space.lg,
      backgroundColor: colors.sheet,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    // The buttons' own room (44 across, the icon in the middle) spaces them, so the name has the rest.
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 60,
    },
    // The contact's picture and name: tapped, it shows or hides the chat's details.
    who: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      paddingLeft: 2,
      paddingRight: 2,
      borderRadius: radius.lg,
    },
    name: {
      fontSize: 17,
      lineHeight: 22,
    },
    // ⋯ keeps apart from the calls beside it, so a slip on it calls no one.
    moreGap: {
      marginLeft: space.sm,
    },
    // Hidden chats' links at the bar's end, apart from each other and from the screen's edge.
    headerLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.lg,
      paddingRight: space.lg,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    subtitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    monoName: {
      fontFamily: 'monospace',
      fontSize: 16,
    },
    monoSmall: {
      fontFamily: 'monospace',
      fontSize: 11,
    },
    section: {
      gap: space.sm,
    },
    // A group of the chat's details, on a card.
    panel: {
      gap: space.sm,
      padding: space.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.5),
    },
    faces: {
      gap: space.md,
      paddingVertical: 2,
    },
    face: {
      width: 64,
      alignItems: 'center',
      gap: 4,
    },
    ring: {
      padding: 3,
      borderRadius: 30,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    ringOn: {
      borderColor: colors.primary,
    },
    faceName: {
      fontSize: 12,
      maxWidth: 64,
      textAlign: 'center',
    },
    grow: {
      flex: 1,
      // A browser's field otherwise keeps its own width and pushes the button beside it out.
      minWidth: 0,
    },
    // Under the messages: the message bar (components/composer.tsx), across the screen, and the
    // panel "+" opens under it.
    dock: {
      marginHorizontal: -space.lg,
      marginTop: -space.xs,
    },
    // The chat's details between the title and the messages: they give way, and scroll, when the
    // keyboard leaves too little room, so the message field stays in view.
    top: {
      flexGrow: 0,
      flexShrink: 1,
    },
    topContent: {
      gap: space.sm,
    },
    thread: {
      flex: 1,
    },
    threadContent: {
      gap: 3,
      paddingVertical: space.sm,
    },
    hello: {
      alignItems: 'center',
      gap: space.md,
      paddingTop: space.xxl * 2,
      paddingHorizontal: space.xl,
    },
    bubble: {
      maxWidth: '82%',
      paddingTop: space.sm,
      paddingBottom: 6,
      paddingHorizontal: space.md,
      gap: 2,
    },
    // A message with reactions leaves room for them under it.
    reacted: {
      marginBottom: 0,
    },
    // A sticker stands on its own, with no bubble behind it.
    stickerBubble: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      paddingHorizontal: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
    // The search in the chat, over its thread.
    searchBar: {
      paddingHorizontal: space.lg,
      paddingBottom: space.xs,
      gap: space.xs,
    },
    // A message found, or starred, in the chat's details.
    found: {
      gap: 2,
      paddingVertical: space.sm,
    },
    // One of the phone's SMS among the messages: edged, as it is plain (lib/sms-chat.ts).
    sms: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.warning,
    },
    smsPicture: {
      width: 220,
      height: 220,
      borderRadius: radius.md,
      backgroundColor: colors.border,
    },
    // A message gone to, lit a moment.
    lit: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    // A photo fills its bubble, with a thin edge.
    photoBubble: {
      paddingTop: 4,
      paddingHorizontal: 4,
    },
    // The last message of a run leaves room before the next run (its corner: theme/bubbles.ts).
    mineTail: {
      marginBottom: space.sm,
    },
    theirsTail: {
      marginBottom: space.sm,
    },
    // Imported messages: a little fainter, with their time.
    imported: {
      opacity: 0.8,
      marginBottom: 3,
    },
    divider: {
      alignSelf: 'center',
      textAlign: 'center',
    },
    day: {
      marginVertical: space.sm,
      paddingHorizontal: space.md,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: withAlpha(colors.surfaceAlt, 0.7),
      overflow: 'hidden',
      fontSize: 12,
    },
    sender: {
      fontSize: 13,
      fontWeight: '700',
    },
    files: {
      fontSize: 13,
      fontStyle: 'italic',
    },
    time: {
      fontSize: 11,
      opacity: 0.7,
      alignSelf: 'flex-end',
    },
    mineText: {
      fontSize: 15,
      lineHeight: 21,
    },
    theirsText: {
      fontSize: 15,
      lineHeight: 21,
    },
    note: {
      color: colors.accentText,
      paddingHorizontal: 2,
    },
    // A chat's details, over the chat.
    sheetBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.lg,
      paddingVertical: space.xs,
    },
    sheetContent: {
      gap: space.sm,
      paddingHorizontal: space.lg,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
    hero: {
      alignItems: 'center',
      gap: space.xs,
      paddingTop: space.md,
      paddingBottom: space.sm,
    },
    heroName: {
      textAlign: 'center',
      marginTop: space.sm,
    },
    badge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: colors.ground,
    },
    badgeText: {
      fontSize: 14,
      lineHeight: 18,
      color: colors.onPrimary,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: space.md,
      paddingBottom: space.sm,
    },
    groupTitle: {
      paddingHorizontal: space.xs,
      marginTop: space.sm,
    },
    group: {
      gap: space.xs,
      paddingVertical: space.xs,
      paddingHorizontal: space.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.5),
    },
    groupGap: {
      marginTop: space.md,
    },
    rowMore: {
      gap: space.sm,
      paddingBottom: space.sm,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    // The signs and colours offered for a contact's picture.
    signs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    sign: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    signOn: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    signText: {
      fontSize: 22,
      lineHeight: 28,
    },
    swatch: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    swatchOn: {
      borderWidth: 3,
      borderColor: colors.text,
    },
    safety: {
      fontSize: 15,
      lineHeight: 24,
    },
  });
