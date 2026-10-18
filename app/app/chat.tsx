import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HAS_LINKS, HAS_RADIO, onLinkEvent, sendLink, setLanLinks, startLinks, stopLinks } from '../lib/radio';
import { nearby, type Delivery } from '../lib/nearby';
import { currentCall } from '../lib/call';
import { currentGroupCall } from '../lib/group-call';
import { callPermissions } from '../lib/call-permissions';
import { CALL_LINE, callLineMessage, callSignal, endCallsOf, startCall as beginCall, type CallPlace } from '../lib/calls';
import { onSpaceCallLine, spaceCalls } from '../lib/space-calls';
import { rtc } from '../lib/webrtc';
import { clearLeftovers, playVoice, useVoiceRecorder } from '../lib/audio';
import { MAX_VOICE_MS, VoiceAssembler, voiceDuration } from '../lib/voice';
import { loadClip, saveClip, type VoiceRef } from '../lock/voice-clips';
import { FileGoneError, fileSize, MAX_FILE, offerRef, readFile, sendFile, takeFile, bytesSource, type Source } from '../lib/attachments';
import { cleanFileName, cleanMime, deleteChunks, mimeOf, type FileKind, type FileRef } from '../lock/attachment-files';
import { CAN_TAKE_PHOTOS, NoCameraError, pickPhoto, type PhotoQuality } from '../lib/pick-photo';
import { pickSource, TooLargeError } from '../lib/pick-file';
import { loadPhotoQuality, QUALITIES, qualityNote, savePhotoQuality } from '../lib/photo-quality';
import { photoUri, releaseUri } from '../lib/photo-uri';
import { CAN_CHOOSE_FOLDER, saveFile } from '../lib/save-file';
import { KeyboardPaddedView } from '../components/keyboard';
import { PasswordSheet } from '../components/PasswordSheet';
import { QrCode } from '../components/QrCode';
import { ShieldIcon, TimerIcon } from '../components/icons';
import { AVATAR_COLORS, AVATAR_SIGNS, KeyFace } from '../components/key-face';
import { Button, Chip, Field, Input, Page, Row, Sheet, Text, TextButton } from '../components/ui';
import { ask } from '../lib/alert';
import { contactLink, onContactOffered, parseContact, type ContactCode } from '../lib/contact-code';
import { canRelaySeal, hasCore } from '../lib/core';
import { E2E, fromBase64Url, ONLINE, toBase64Url, type ContactInfo, type Where, type Erase, type Extra } from '../lib/e2e';
import { mediaText, shownTime, SOURCE_LABELS } from '../lib/imports';
import { Archive } from '../lock/archive';
import { MIN_PIN, openHidden, setHiddenPassword } from '../lock/hidden';
import { moveChat } from '../lock/move-chat';
import { SamePasswordError } from '../lock/config';
import { LockedOutError, lockedOutMessage } from '../lock/tries';
import { cleanName, MAX_NAME, type Avatar } from '../lock/e2e-data';
import { savePhoto } from '../lock/avatar-photos';
import { pickAvatar } from '../lib/pick-avatar';
import { takeHidden } from '../lib/hidden-handoff';
import { History, newTag, type Mark, type Message as Kept } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadHiddenData, updateCurrentSpaceData, updateHiddenData, type Queue, type SpaceData } from '../lock/space-data';
import { isGroupPacket } from '../lib/groups';
import { takeGroupPacket, takeGroupSignal } from '../lib/space-groups';
import { callRelay, carryTo, createQueue, fromHex, isQueueNotFound, receiveMessage, relayKey, sameRelay, sendMessage, toHex, type CallRelay, type Relay } from '../lib/relay';
import { answersAsk, appShown, holdReceiver } from '../lib/receiver';
import { answerInvites, linkInviter, refreshSmsLink, takeInviteAnswer } from '../lib/sms-relay';
import { carriedFor, contactTarget, relayFor, spaceChats } from '../lib/space-chats';
import { secureGet, secureSet } from '../lib/secure';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { bubbleStyles } from '../theme/bubbles';
import { useColors, useStyles, useTheme } from '../theme/context';
import { ChatTheme } from '../theme/chat-theme';
import type { Look } from '../theme/look';
import { ScreenBackdrop } from '../components/backdrop';
import { AppearanceEditor } from './appearance';

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
// Voice is held (lib/audio.ts), travel in parts (lib/voice.ts), and each one's sound is kept in a
// sealed file of its own (lock/voice-clips.ts). Photos and files go through the relay's file store
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

// `tag` names a message with a contact on both phones (lock/history.ts).
// `until`: when it disappears, milliseconds, or 0. `lasts`: seconds it lasts once read, while it
// waits for that. `mark`: as lock/history.ts keeps it.
// `at`: when it was sent or came, milliseconds. `voice`: where a voice message's sound is.
// `file`: where a photo or file is, or where to take it from.
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
};

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

// Messages opened from the relay in one look at it, at most: a minute's voice message comes in one.
const RECEIVE_BATCH = 50;

// Where the phone keeps whether it carries messages for others, and whether it looks for Erevos on
// the same Wi-Fi (lib/secure.ts): 'off', or on.
const CARRY_KEY = 'erevos.carry';
const LAN_KEY = 'erevos.lan';

// Their photos and files up to this size are taken from the relay as soon as they come.
const AUTO_TAKE = 16 * 1000 * 1000;

// Photos shown in the thread at once, the latest: each is held whole in memory while shown. The
// others show when tapped. A computer has the memory for all of them.
const SHOWN_PHOTOS = Platform.OS === 'web' ? 200 : 6;

// Contacts are named by their identity key, after this prefix.
const CONTACT_PREFIX = 'contact:';

function contactName(peer: string, contacts: ContactInfo[]): string | null {
  const identity = peer.slice(CONTACT_PREFIX.length);
  return contacts.find((contact) => contact.identity === identity)?.name || null;
}

function label(peer: string, contacts: ContactInfo[]): string {
  if (!peer.startsWith(CONTACT_PREFIX)) return peer;
  return contactName(peer, contacts) ?? `contact ${peer.slice(CONTACT_PREFIX.length, CONTACT_PREFIX.length + 8)}`;
}

// The first line only: Android's errors carry their whole stack after it.
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

const NO_CORE = 'This build cannot encrypt, so chats through the relay are off. Rebuild the app.';

// The times a chat's messages can disappear after, seconds. 0 keeps them.
const TIMERS = [0, 5 * 60, 3600, 24 * 3600, 7 * 24 * 3600];

const pad = (n: number) => String(n).padStart(2, '0');

// When a disappearing message goes: the time today, or the date too.
function disappearsAt(until: number): string {
  const d = new Date(until);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString() ? `at ${time}` : `on ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
}

// How long a voice message is: 0:07.
// Under a message to or from a contact: its mark if it is ours, and when it disappears.
function caption(message: Message): string {
  const parts: string[] = [];
  if (message.mine && message.tag && !isCallLine(message.text)) parts.push(MARKS[message.mark]);
  if (message.until) parts.push(`Disappears ${disappearsAt(message.until)}`);
  else if (message.lasts) parts.push(`Disappears ${timerLabel(message.lasts).toLowerCase()} after it is read`);
  return parts.join('  ·  ');
}

function timerLabel(seconds: number): string {
  const units: [number, string][] = [[7 * 24 * 3600, 'week'], [24 * 3600, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']];
  if (seconds <= 0) return 'Off';
  const [size, unit] = units.find(([size]) => seconds % size === 0) ?? [1, 'second'];
  const count = seconds / size;
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

// Imported messages shown at first, and added each time earlier ones are asked for.
const IMPORTED_PAGE = 50;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // A contact to open with (from the home screen, or an imported chat that goes on with them),
  // hidden chats opened from the home screen's search (their key handed over in memory), or the
  // relay settings to show at once.
  const { contact, hidden, setup, phone } = useLocalSearchParams<{ contact?: string; hidden?: string; setup?: string; phone?: string }>();
  const fromSearch = hidden === 'open';
  const [hiddenKey, setHiddenKey] = useState<Uint8Array | null>(() => (fromSearch ? takeHidden() : null));
  // Hidden chats opened from the search close back to the home screen.
  const closeHidden = () => {
    setHiddenKey(null);
    if (fromSearch) router.canGoBack() ? router.back() : router.replace('/');
  };
  const [asking, setAsking] = useState(false);
  const initial = typeof contact === 'string' && /^[0-9a-f]{64}$/.test(contact) ? `${CONTACT_PREFIX}${contact}` : null;
  // A number linked by hand from its SMS conversation (app/sms.tsx).
  const linkNumber = initial && typeof phone === 'string' && /^\+?\d{3,20}$/.test(phone) ? phone : '';
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
          <Text tone="muted">Chat runs on Android and on a computer for now.</Text>
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
        <KeyboardPaddedView bottom={insets.bottom} style={[layout.screen, { paddingTop: insets.top }]}>
          <View style={[layout.screen, hiddenKey && layout.gone]}>
            <Chat hiddenKey={null} initial={initial} linkNumber={linkNumber} setup={setup === '1'} shown={!hiddenKey} onLook={setChatLook} />
          </View>
          {hiddenKey ? (
            <Chat hiddenKey={hiddenKey} shown onHidden={closeHidden} onChangePassword={() => setAsking(true)} onLook={setChatLook} />
          ) : null}
          <PasswordSheet
            visible={asking}
            title="Change hidden chats PIN"
            repeat
            submitLabel="Save"
            onClose={() => setAsking(false)}
            onSubmit={async (password) => {
              await setHiddenPassword(currentSpace().space, password, hiddenKey);
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
      accessibilityLabel="Back"
      hitSlop={8}
      style={({ pressed }) => [layout.back, pressed && { opacity: 0.6 }]}
    >
      <Text style={{ fontSize: 34, lineHeight: 36, color: colors.text, marginTop: -4 }}>‹</Text>
    </Pressable>
  );
}

// One chat: the space's own (`hiddenKey` null), or its hidden chats, sealed with that key.
function Chat({ hiddenKey, initial = null, linkNumber = '', setup = false, shown, onHidden, onChangePassword, onLook }: {
  hiddenKey: Uint8Array | null;
  initial?: string | null;
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
  const [carrying, setCarrying] = useState(true);
  const [lanOn, setLanOn] = useState(true);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(initial);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [showRelay, setShowRelay] = useState(setup);
  // The chat's details, over the chat: its picture, name, timer, look, safety number, moving it.
  const [details, setDetails] = useState(false);
  // The chat's own look being chosen, over the chat.
  const [styling, setStyling] = useState(false);
  const insets = useSafeAreaInsets();
  const [relayUrl, setRelayUrl] = useState('');
  const [relayToken, setRelayToken] = useState('');
  // Our relay's key for sealed sends, put in our link so contacts on other relays can reach us.
  const [ownRelayKey, setOwnRelayKey] = useState('');
  // The second relay for two-hop sending (lib/relay.ts), empty when not used.
  const [viaUrl, setViaUrl] = useState('');
  const [viaToken, setViaToken] = useState('');
  const [ownQueue, setOwnQueue] = useState<Queue | null>(null);
  const [contactDraft, setContactDraft] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [safety, setSafety] = useState<{ peer: string; number: string } | null>(null);
  // The contact being named, and the name typed so far.
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  // The part of the details opened under its row: the picture, the timer, or moving the chat.
  const [opened, setOpened] = useState<'picture' | 'timer' | 'move' | null>(null);
  // Moving the chat into the hidden chats: the PIN typed, whether new hidden chats are being
  // started with it (asked a second time), what went wrong, and while it moves.
  const [pinDraft, setPinDraft] = useState('');
  const [startingNew, setStartingNew] = useState(false);
  const [moveNote, setMoveNote] = useState('');
  const [moving, setMoving] = useState(false);
  const router = useRouter();
  const [e2e, setE2E] = useState<E2E | null>(null);
  // Chats imported into this space. Hidden chats have none.
  const [archive, setArchive] = useState<Archive | null>(null);
  const [importedShown, setImportedShown] = useState(IMPORTED_PAGE);
  // Set when earlier imported messages are shown, so the thread does not jump to its end.
  const holdScroll = useRef(false);
  // Choosing how long a single message lasts, before sending it.
  const [vanishing, setVanishing] = useState(false);
  const receipts = useRef<Receipts>({});
  // Contacts who asked whether this phone is open, to answer with the next look at the relay.
  const answers = useRef(new Set<string>());
  // Now, a few seconds behind at most: until when a contact shows open is checked against it.
  const [now, setNow] = useState(Date.now());
  const voiceParts = useRef(new VoiceAssembler());
  const recorder = useVoiceRecorder();
  // While Voice is held, and the recording it started.
  const [talking, setTalking] = useState(false);
  const holding = useRef(false);
  const recording = useRef<Promise<boolean> | null>(null);
  const longest = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // The sheet for sending a photo or file, and how photos go.
  const [attaching, setAttaching] = useState(false);
  const [quality, setQuality] = useState<PhotoQuality>('original');
  // How far each file being taken from the relay is, by `${peer}|${tag}`; 'failed' or 'gone' if it did not come.
  const [taking, setTaking] = useState<Record<string, string>>({});
  // Files already tried, so one that failed is taken again only when tapped.
  const tried = useRef(new Set<string>());
  // The photo or file shown on its own, to look at or save.
  const [viewing, setViewing] = useState<Message | null>(null);
  // Photos shown, by file id, as addresses an Image can show (lib/photo-uri.ts).
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const thread = useRef<ScrollView>(null);
  const styles = useStyles(makeStyles);
  const { colors, look } = useTheme();
  // How messages are drawn: the look's bubbles (theme/bubbles.ts).
  const b = useMemo(() => bubbleStyles(look.bubbles, colors), [look.bubbles, colors]);

  // Where contacts reach this chat: our relay and its key, told to them in our link and messages.
  function here(url = relayUrl): Where {
    return { relay: url.trim(), relayKey: url.trim() === relayUrl.trim() ? ownRelayKey : '' };
  }

  function relayTarget(url = relayUrl): Relay | null {
    return relayFor(url, relayToken, viaUrl, viaToken);
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
        await sendToContact(target, peer.slice(CONTACT_PREFIX.length), '', { got, read, on: appShown() ? ONLINE : 0 });
      } catch {
        if (got.length + read.length === 0) continue;
        const now = receipts.current[peer] ?? { got: [], read: [] };
        receipts.current[peer] = { got: [...got, ...now.got], read: [...read, ...now.read] };
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
        await sendMessage(contactTarget(target, { relay, relayKey: key }), fromHex(sender), first);
        await chats.firstSent(identity);
      } catch {
        // Tried again with the next message, or the next look at the relay.
      }
    }
  }

  // Carries messages from phones nearby to their relays, or no longer (lib/nearby.ts).
  function changeCarrying(on: boolean) {
    nearby.setCarrying(on);
    setCarrying(on);
    secureSet(CARRY_KEY, on ? 'on' : 'off').catch(() => setNote('Changed until Erevos closes: the phone could not keep it.'));
  }

  // Looks for Erevos on the same Wi-Fi or hotspot too, or no longer (lib/radio.ts).
  function changeLan(on: boolean) {
    setLanLinks(on);
    setLanOn(on);
    secureSet(LAN_KEY, on ? 'on' : 'off').catch(() => setNote('Changed until Erevos closes: the phone could not keep it.'));
  }

  // Adds a contact from a code: typed or pasted here, or scanned and opened on the contact screen.
  async function acceptContact(code: ContactCode) {
    if (!e2e) {
      setNote(NO_CORE);
      return;
    }
    if (code.senderHex === ownQueue?.senderHex) {
      setNote("Not added. That is this chat's own code.");
      return;
    }
    const ours = relayUrl.trim();
    if (code.relayUrl && ours && !sameRelay(code.relayUrl, ours) && !code.relayKey) {
      setNote(
        `Not added. That contact uses the relay at ${code.relayUrl}, and its link has no key for that relay. Ask them for a new link from an updated Erevos.`,
      );
      return;
    }
    const url = ours || code.relayUrl;
    if (code.relayUrl && !ours) setRelayUrl(code.relayUrl);
    const target = relayTarget(url);
    if (!target && !code.key) {
      setNote('Not added. Type the relay address in Relay first.');
      return;
    }
    try {
      // The contact answers through our own queue, so there has to be one when there is a relay.
      // Without one, they reach this phone nearby only, until it has a queue and tells them.
      let queue = ownQueue;
      if (!queue && target) {
        const ids = await createQueue(target);
        queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
        setOwnQueue(queue);
      }
      const { identity, added } = await e2e.addContact(code, queue?.senderHex ?? '', target ? here(url) : here(''));
      setContacts(e2e.contacts());
      setSelected(`${CONTACT_PREFIX}${identity}`);
      if (target) await sendPending(e2e, target);
      const nearbyOnly = !target || !code.senderHex;
      setNote(
        added
          ? `Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs.${nearbyOnly ? ' Until you both have a relay, you reach each other nearby only.' : ''}`
          : 'Already a contact. Where to reach them is updated.',
      );
    } catch (error) {
      setNote(`Not added. ${errorText(error)}`);
    }
  }

  // The links nearby belong to the phone, not to a space: the radio, and the same Wi-Fi or hotspot
  // (lib/radio.ts). What comes on them is sealed for a contact (lib/nearby.ts), so it opens only in
  // the chats of the space that has them. The rest is kept a while for the other spaces. Hidden
  // chats use the relay only.
  useEffect(() => {
    if (!HAS_LINKS || hiddenKey) return;
    let active = true;
    const stopNearby = nearby.start(sendLink);
    secureGet(CARRY_KEY)
      .then((value) => {
        nearby.setCarrying(value !== 'off');
        if (active) setCarrying(value !== 'off');
      })
      .catch(() => {
        // Carrying stays as it was.
      });
    const stopWatching = nearby.onChange(() => setNearbyChanged((n) => n + 1));
    const subscriptions = [
      onLinkEvent('onPeer', ({ id, kind }) => {
        if (kind !== 'ble') nearby.linkUp(id); // 'ble' is presence only, not a data link
      }),
      onLinkEvent('onText', ({ peer, text }) => {
        const packet = nearby.frameIn(peer, text);
        if (packet) void nearbyCame.current(peer, packet);
      }),
    ];
    secureGet(LAN_KEY)
      .catch(() => null)
      .then((value) => {
        if (!active) return;
        setLanOn(value !== 'off');
        startLinks({ lan: value !== 'off' });
      });
    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription.remove());
      stopWatching();
      stopNearby();
      stopLinks();
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

  // What came nearby for this space while another was open, once its chats are.
  useEffect(() => {
    if (!e2e || hiddenKey) return;
    void (async () => {
      for (const packet of nearby.heldPackets()) await nearbyCame.current(null, packet);
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
    (hiddenKey ? loadHiddenData(space, hiddenKey) : loadCurrentSpaceData())
      .then((data) => {
        if (!active) return;
        setRelayUrl(data.url);
        setRelayToken(data.token);
        setViaUrl(data.via);
        setViaToken(data.viaToken);
        setOwnQueue(data.ownQueue);
      })
      .catch(() => {
        // Nothing usable saved. Start empty.
      })
      .then(async () => {
        if (!hasCore()) {
          setNote(NO_CORE);
          return;
        }
        await held;
        if (!active) return;
        const shared = hiddenKey ? null : await spaceChats();
        const kept = shared?.history ?? (await History.open('hidden', space, hiddenKey!));
        if (!active) return;
        if (shared) voiceParts.current = shared.voiceParts;
        history.current = kept;
        // What disappeared while the chat was closed goes first.
        await kept.expire(Date.now());
        if (!active) return;
        // Ahead of anything the radio brought while it loaded.
        setMessages((list) => [
          ...kept.messages().map((m) => ({ ...m, until: m.until ?? 0, lasts: m.lasts ?? 0, mark: m.mark ?? 0, id: nextId.current++ })),
          ...list,
        ]);
        const chats = shared?.e2e ?? (await E2E.open('hidden', space, hiddenKey!));
        if (!active) return;
        if (linkNumber && initial?.startsWith(CONTACT_PREFIX)) {
          await chats.linkPhone(initial.slice(CONTACT_PREFIX.length), linkNumber);
          setNote(`Messages to ${linkNumber} now go through Erevos, end-to-end encrypted.`);
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
        if (active) setNote(`Chats through the relay could not open. ${errorText(error)}`);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      void held?.then((release) => release());
    };
  }, []);

  // Another chat starts with its latest imported messages.
  useEffect(() => setImportedShown(IMPORTED_PAGE), [selected]);

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
    (hiddenKey ? updateHiddenData(currentSpace().space, hiddenKey, data) : updateCurrentSpaceData(data)).catch(() => {
      // A failed save only means the next launch starts empty.
    });
  }, [loaded, relayUrl, relayToken, viaUrl, viaToken, ownQueue]);

  // Takes a contact opened from a scanned code, once the saved contacts are loaded so they
  // cannot overwrite it.
  useEffect(() => {
    if (!loaded || !shown) return;
    return onContactOffered((code) => void acceptContact(code));
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

  // Looks at our own relay queue every few seconds and opens what came. Without the core nothing
  // could open it, so the queue is left alone, and its messages wait on the relay.
  useEffect(() => {
    const url = relayUrl.trim();
    if (!url || !ownQueue || !e2e) return;
    // Taking messages goes straight to our relay; sending goes through the second relay if set.
    const own: Relay = { url, token: relayToken.trim() || undefined };
    const sends = relayFor(url, relayToken, viaUrl, viaToken) ?? own;
    const recipient = fromHex(ownQueue.recipientHex);
    const ownSender = ownQueue.senderHex;
    let active = true;
    let busy = false;
    // The note shown while the relay could not be reached, taken back once it answers again.
    let failed: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function look() {
      if (busy || !e2e) return;
      busy = true;
      try {
        await sendPending(e2e, sends);
        // What this phone carries for its relays, from phones nearby or its own (lib/nearby.ts).
        if (!hiddenKey) void nearby.uploadCarried((url, sealed) => carryTo(sends, url, sealed)).catch(() => undefined);
        // An SMS invite sent from the SMS screen since: its answer may be on its way.
        if (!hiddenKey) await refreshSmsLink().catch(() => undefined);
        for (let i = 0; i < RECEIVE_BATCH && active; i++) {
          const bytes = await receiveMessage(own, recipient);
          if (failed !== null && active) {
            const shown = failed;
            setNote((current) => (current === shown ? 'The relay answers again.' : current));
            failed = null;
          }
          if (!bytes) break;
          // A group's message (lib/groups.ts), to the space's queue only.
          if (!hiddenKey && isGroupPacket(bytes)) {
            await takeGroupPacket(bytes).catch(() => undefined);
            continue;
          }
          // An answer to an SMS invite sent from here: their contact link.
          const invited = hiddenKey ? null : await takeInviteAnswer(e2e, bytes, ownSender, here()).catch(() => null);
          if (invited) {
            if (active) setContacts(e2e.contacts());
            if (active) setNote(`${invited.number} has Erevos. Messages to that number now go through Erevos, end-to-end encrypted.`);
            continue;
          }
          // Taken from the relay, so kept even if the chat closed meanwhile.
          let received = await e2e.receive(bytes);
          // Someone whose SMS invite was answered here: a contact at once, not a message request.
          const number = !hiddenKey && received.kind === 'message' && received.added ? await linkInviter(e2e, received.identity).catch(() => null) : null;
          if (number && received.kind === 'message') received = { ...received, request: false };
          handle(received);
          if (number && active) setNote(`${number} has Erevos and is now a contact. Messages to that number go through Erevos.`);
        }
        if (!hiddenKey) await answerInvites(e2e, ownSender, here(), sends).catch(() => undefined);
        await sendReceipts(sends);
      } catch (error) {
        if (!active) return;
        if (!isQueueNotFound(error)) {
          failed = errorText(error);
          setNote(failed);
          return;
        }
        // The relay no longer has our queue (deleted, or a relay that keeps queues in memory
        // was restarted). Make a new one so messages can reach us again.
        try {
          const ids = await createQueue(own);
          if (!active) return;
          setOwnQueue({ recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
          setNote(
            'The relay had lost your queue, so a new one was made. Your contacts learn it from your next message to them.',
          );
        } catch (retry) {
          if (active) setNote(errorText(retry));
        }
      } finally {
        busy = false;
      }
    }
    function next() {
      timer = setTimeout(async () => {
        await look();
        if (active) next();
      }, currentCall() || currentGroupCall() ? LOOK_IN_CALL : LOOK_EVERY);
    }
    next();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [relayUrl, relayToken, viaUrl, viaToken, ownQueue, e2e]);

  // What one message from the relay, or from a phone nearby, brings.
  function handle(received: Awaited<ReturnType<E2E['receive']>>) {
    if (!e2e) return;
    if (received.kind === 'refused') {
      if (received.reason === 'plain') setNote('A message that was not end-to-end encrypted came, and was not shown.');
      return;
    }
    const peer = `${CONTACT_PREFIX}${received.identity}`;
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
    if (received.voice) {
      const whole = voiceParts.current.add(peer, received.voice);
      const { tag, timer } = received;
      if (whole) {
        saveClip(whole.audio, whole.ms)
          .then((voice) => {
            addMessage(peer, '', false, tag, timer, voice);
            if (tag) receipt(peer, 'got', [tag]);
          })
          .catch((error) => setNote(`A voice message came but could not be kept. ${errorText(error)}`));
      }
    }
    if (received.file) {
      // Taken from the relay by the effect that watches for files waiting.
      const tag = addMessage(peer, '', false, received.tag, received.timer, undefined, offerRef(received.file));
      receipt(peer, 'got', [tag]);
    }
    if (received.text) {
      addMessage(peer, received.text, false, received.tag, received.timer);
      if (received.tag) receipt(peer, 'got', [received.tag]);
    }
    // Marked on the screen at once. A mark the history could not keep is the old one when the chat next opens.
    if (received.got.length > 0) markMessages(peer, true, 1, received.got).catch(() => undefined);
    if (received.read.length > 0) markMessages(peer, true, 2, received.read).catch(() => undefined);
    const name = label(peer, e2e.contacts());
    if (received.timerChanged) {
      setNote(
        received.timer
          ? `${name} set new messages in this chat to disappear ${timerLabel(received.timer).toLowerCase()} after they are read.`
          : `${name} turned disappearing messages off in this chat.`,
      );
    }
    if (received.erase && 'all' in received.erase) {
      forgetChat(peer);
      setNote(`${name} deleted the messages of this chat on both phones.`);
    } else if (received.erase) {
      forgetMessage({ id: -1, peer, text: '', mine: false, tag: received.erase.tag, until: 0, lasts: 0, mark: 0, at: 0 });
      setNote(`${name} deleted a message on both phones.`);
    }
    if (received.added && received.request) {
      setNote(`Message request from ${name}: they have your contact link. Accept it to answer, or refuse it.`);
    } else if (received.added) {
      setNote(`New chat with ${name}: they added your contact link. Compare the safety number with theirs.`);
    }
  }

  // Shows a message, and keeps it on the phone when it is with a contact, for `timer` seconds once
  // read if it disappears. A contact's message from an Erevos before tags gets one known to this
  // phone only. Returns its tag.
  function addMessage(peer: string, text: string, mine: boolean, tag = '', timer = 0, voice?: VoiceRef, file?: FileRef): string {
    const contact = peer.startsWith(CONTACT_PREFIX);
    const kept = contact ? tag || newTag() : '';
    const at = Date.now();
    const lasts = contact ? timer : 0;
    setMessages((list) => [...list, { id: nextId.current++, peer, text, mine, tag: kept, until: 0, lasts, mark: 0, at, voice, file }]);
    if (contact) {
      history.current?.add({ peer, text, mine, at, tag: kept, lasts, voice, file }).catch(() => {
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
        if (m.peer !== peer || m.mine !== mine || m.mark >= mark || (tags && !tags.includes(m.tag))) return m;
        return { ...m, mark, ...(mark === 2 && !m.until && m.lasts ? { until: now + m.lasts * 1000, lasts: 0 } : {}) };
      }),
    );
    return history.current?.mark(peer, mine, mark, now, tags) ?? Promise.resolve([]);
  }

  function forgetChat(peer: string) {
    setMessages((list) => list.filter((message) => message.peer !== peer));
    history.current?.clear(peer).catch((error) => setNote(errorText(error)));
  }

  function forgetMessage(message: Message) {
    setMessages((list) => list.filter((m) => m.id !== message.id && !(message.tag && m.peer === message.peer && m.tag === message.tag)));
    if (message.tag) history.current?.remove(message.peer, message.tag).catch((error) => setNote(errorText(error)));
  }

  // Asks the contact's phone to delete messages too, and deletes them here once the relay has
  // taken that. If it cannot, nothing is deleted.
  async function eraseOnBoth(peer: string, erase: Erase, here: () => void) {
    const target = relayTarget();
    if (!target) {
      setNote('Not deleted. Type the relay address in Relay first.');
      return;
    }
    try {
      await sendToContact(target, peer.slice(CONTACT_PREFIX.length), '', { erase });
      here();
      setNote(`Deleted here. ${label(peer, shownContacts)}'s phone deletes them too when it next looks at the relay.`);
    } catch (error) {
      setNote(notSent(error).replace('Not sent.', 'Not deleted.'));
    }
  }

  function deleteMessages(peer: string) {
    const name = label(peer, shownContacts);
    const kept = archive && archive.linked(peer.slice(CONTACT_PREFIX.length)).length > 0 ? ' Imported messages stay: delete them in Imported chats.' : '';
    ask('Delete messages', `Delete the messages with ${name}? They cannot be brought back.${kept}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'This phone', onPress: () => forgetChat(peer) },
      { text: 'Both phones', style: 'destructive', onPress: () => void eraseOnBoth(peer, { all: true }, () => forgetChat(peer)) },
    ]);
  }

  function deleteMessage(message: Message) {
    const both = message.peer.startsWith(CONTACT_PREFIX) && message.tag;
    ask('Delete message', 'Delete this message? It cannot be brought back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'This phone', onPress: () => forgetMessage(message) },
      ...(both
        ? [{ text: 'Both phones', style: 'destructive' as const, onPress: () => void eraseOnBoth(message.peer, { tag: message.tag }, () => forgetMessage(message)) }]
        : []),
    ]);
  }

  function keep(peer: string, text: string, tag = '', timer = 0) {
    addMessage(peer, text, true, tag, timer);
    setDraft('');
  }

  // Seals a message for a contact and hands it to their phone (handOver). Returns the message's
  // tag, how long it lasts, and how it went.
  async function sendToContact(target: Relay | null, identity: string, text: string, extra: Extra = {}): Promise<{ tag: string; timer: number; way: Delivery }> {
    if (!e2e) throw new Error(NO_CORE);
    const sealed = await e2e.seal(identity, text, ownQueue?.senderHex ?? '', { ...extra, at: here() });
    // What is only a mark, or asks whether their phone is open, is not worth carrying for days.
    const way = await handOver(e2e, target, identity, sealed, [sealed.packet], !!text || !!extra.erase);
    // Writing to a message request accepts it.
    if (text) setContacts(e2e.contacts());
    return { tag: sealed.tag, timer: sealed.timer, way };
  }

  // Hands a contact's packets to their phone, after the first packet of the conversation if the
  // relay has not taken that yet: nearby when they are, and through the relay (lib/nearby.ts).
  // When neither, and they went to the phones nearby, those phones may carry them to the
  // contact's relay too (`carried`). Hidden chats go through the relay only.
  function handOver(
    chats: E2E,
    target: Relay | null,
    identity: string,
    sealed: { sender: string; relay: string; relayKey: string; first: Uint8Array | null },
    packets: Uint8Array[],
    carried = false,
  ): Promise<Delivery> {
    const relay = target && sealed.sender
      ? async () => {
          const to = contactTarget(target, sealed);
          if (sealed.first) {
            await sendMessage(to, fromHex(sealed.sender), sealed.first);
            await chats.firstSent(identity);
          }
          for (const packet of packets) await sendMessage(to, fromHex(sealed.sender), packet);
        }
      : null;
    if (hiddenKey) {
      if (!relay) return Promise.reject(new Error('Type the relay address in Relay first.'));
      return relay().then(() => 'relay');
    }
    const all = sealed.first ? [sealed.first, ...packets] : packets;
    const carry = carried ? () => carriedFor(sealed, all, { url: relayUrl, key: ownRelayKey }) : null;
    return nearby.deliver(identity, all, relay, carry);
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
      if (!target) throw new Error('No relay.');
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
        'Call without a call relay?',
        "Your relay has no call relay beside it, so the call would go straight between the phones. That only works on the same Wi-Fi, and each phone sees the other's address on it. With a call relay, neither does.",
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Call', onPress: () => resolve(true) },
        ],
      ),
    );
  }

  async function startCall(video: boolean) {
    if (!selectedContact) {
      setNote(`${video ? 'Video calls' : 'Calls'} go to contacts through the relay. Pick one first.`);
      return;
    }
    const peer = selectedContact;
    const identity = peer.slice(CONTACT_PREFIX.length);
    if (contacts.find((c) => c.identity === identity)?.request) {
      setNote('Accept the message request first. Then you can call.');
      return;
    }
    if (currentCall() || currentGroupCall()) {
      setNote('There is a call already.');
      return;
    }
    if (!e2e || !ownQueue || !relayUrl.trim()) {
      setNote(e2e ? 'Calls are set up through the relay. Type its address in Relay first.' : NO_CORE);
      return;
    }
    if (!(await callPermissions(video))) {
      setNote(video ? 'A video call needs the camera and the microphone.' : 'A call needs the microphone.');
      return;
    }
    let relay: CallRelay | null;
    try {
      relay = await ownCallRelay();
    } catch (error) {
      setNote(`Could not call. ${errorText(error)}`);
      return;
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
    if (way === 'nearby') return `${what} nearby, end-to-end encrypted.`;
    if (way === 'relay') return `${what} through the relay, end-to-end encrypted.`;
    if (way === 'carried') {
      return `${what} to the Erevos phones nearby, end-to-end encrypted, as the relay could not be reached. If ${name}'s is not one of them, they hand it to ${name}'s relay once they reach the internet, and so does this phone.`;
    }
    return `${what} to the Erevos phones nearby, end-to-end encrypted, as the relay could not be reached. It comes only if ${name}'s is one of them.`;
  }

  function notSent(error: unknown): string {
    return isQueueNotFound(error)
      ? "Not sent. The relay does not have this contact's queue any more. Ask them to write to you, or for their new contact link."
      : `Not sent. ${errorText(error)}`;
  }

  // Sends the message typed. With `lasts` (seconds), only this one disappears, that long after it is read.
  async function send(lasts = 0) {
    const text = draft.trim();
    if (!text || !selected?.startsWith(CONTACT_PREFIX)) return;
    setVanishing(false);
    if (!e2e) {
      setNote(NO_CORE);
      return;
    }
    try {
      const { tag, timer, way } = await sendToContact(relayTarget(), selected.slice(CONTACT_PREFIX.length), text, { lasts });
      keep(selected, text, tag, timer);
      const sent = sentNote(way, 'Sent', label(selected, contacts));
      setNote(timer ? `${sent} It disappears from both phones ${timerLabel(timer).toLowerCase()} after it is read.` : sent);
    } catch (error) {
      setNote(notSent(error));
    }
  }

  async function shareLink(link: string) {
    try {
      // A computer has no share sheet: the link is copied, to paste where it should go.
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(link);
        setNote('Contact link copied.');
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
      setSafety({ peer, number: await e2e.safetyNumber(peer.slice(CONTACT_PREFIX.length)) });
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

  // Refusing forgets them and their messages here. Their phone is not told.
  function refuseRequest(peer: string) {
    ask('Refuse request', `Refuse ${label(peer, contacts)}? Their messages go, and anything they send later is not shown.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Refuse',
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

  // Starts recording while Voice is held. Letting go sends it; a minute sends it anyway.
  function startTalking() {
    if (!selectedContact) {
      setNote('Voice messages go to contacts through the relay. Pick one first.');
      return;
    }
    holding.current = true;
    const started = recorder.start().then((ok) => {
      if (!ok) {
        setNote('Erevos may not use the microphone. Allow it in the phone settings to send voice messages.');
        return false;
      }
      if (!holding.current) {
        // Let go while the microphone was getting ready.
        void recorder.stop().catch(() => undefined);
        setNote('Hold Voice while you talk, and let go to send.');
        return false;
      }
      setTalking(true);
      longest.current = setTimeout(() => void stopTalking(), MAX_VOICE_MS);
      return true;
    });
    recording.current = started.catch((error) => {
      setNote(`Cannot record. ${errorText(error)}`);
      return false;
    });
  }

  async function stopTalking() {
    holding.current = false;
    if (longest.current) clearTimeout(longest.current);
    longest.current = null;
    const started = recording.current;
    recording.current = null;
    if (!started || !(await started)) return;
    setTalking(false);
    try {
      const recorded = await recorder.stop();
      if (!recorded) {
        setNote('Hold Voice while you talk, and let go to send.');
        return;
      }
      await sendVoice(recorded.audio, recorded.ms);
    } catch (error) {
      setNote(`Not sent. ${errorText(error)}`);
    }
  }

  // Seals a voice message for the contact picked, hands its parts to their phone in turn (nearby,
  // or through the relay), and keeps its sound sealed. If nothing took all of it, it is not kept.
  async function sendVoice(audio: Uint8Array, ms: number) {
    const peer = selectedContact;
    if (!peer) return;
    if (!e2e) {
      setNote(NO_CORE);
      return;
    }
    const identity = peer.slice(CONTACT_PREFIX.length);
    try {
      const sealed = await e2e.sealVoice(identity, audio, ms, ownQueue?.senderHex ?? '', { at: here() });
      const way = await handOver(e2e, relayTarget(), identity, sealed, sealed.packets, true);
      addMessage(peer, '', true, sealed.tag, sealed.timer, await saveClip(audio, ms));
      // Writing to a message request accepts it.
      setContacts(e2e.contacts());
      setNote(sentNote(way, 'Voice message sent', label(peer, contacts)));
    } catch (error) {
      setNote(notSent(error));
    }
  }

  // Plays a voice message, or stops it if it is the one playing.
  async function play(message: Message) {
    stopPlaying.current?.();
    if (playingId === message.id || !message.voice) return;
    try {
      const audio = await loadClip(message.voice);
      if (!audio) {
        setNote("This voice message's sound is gone.");
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
        setPlayed,
      );
    } catch (error) {
      setNote(`Cannot play it. ${errorText(error)}`);
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
      const taken = await takeFile(own, ref, (done, count) => setTaking((now) => ({ ...now, [key]: `${Math.floor((done / count) * 100)}%` })));
      setMessages((list) => list.map((m) => (m.peer === peer && m.tag === tag ? { ...m, file: taken } : m)));
      // Deleted while it came: its chunks go too.
      if (history.current && !(await history.current.setFile(peer, tag, taken))) await deleteChunks(taken.id, taken.count);
      setTaking(({ [key]: _done, ...rest }) => rest);
    } catch (error) {
      setTaking((now) => ({ ...now, [key]: error instanceof FileGoneError ? 'gone' : 'failed' }));
      setNote(`${ref.kind === 'photo' ? 'A photo' : 'A file'} did not come. ${errorText(error)}`);
    } finally {
      takingNow.current.delete(key);
    }
  }

  // Their photos and files up to AUTO_TAKE are taken as soon as they come, or when the chat opens.
  useEffect(() => {
    const own = ownRelay();
    if (!loaded || !own) return;
    for (const m of messages) {
      if (m.mine || !m.file?.from || m.file.size > AUTO_TAKE || tried.current.has(`${m.peer}|${m.tag}`)) continue;
      void take(own, m.peer, m.tag, m.file);
    }
  }, [loaded, relayUrl, relayToken, messages]);

  useEffect(() => {
    loadPhotoQuality().then(setQuality, () => undefined);
  }, []);

  function chooseQuality(next: PhotoQuality) {
    setQuality(next);
    savePhotoQuality(next).catch((error) => setNote(errorText(error)));
  }

  type Picked = { name: string; mime: string; source: Source; w?: number; h?: number; close?: () => void };

  // Sends a photo or file to the contact picked: its chunks to our relay, then, end-to-end
  // encrypted, where they are and their key. Kept here as it went. If any of it cannot go,
  // nothing is kept.
  async function sendAttachment(kind: FileKind, get: () => Promise<Picked | null>) {
    const peer = selectedContact;
    const target = relayTarget();
    const own = ownRelay();
    if (!peer || !target || !own) {
      setNote('Photos and files go to contacts through the relay. Type its address in Relay, and pick a contact.');
      return;
    }
    if (!e2e) {
      setNote(NO_CORE);
      return;
    }
    let picked: Picked | null;
    try {
      picked = await get();
    } catch (error) {
      setNote(
        error instanceof TooLargeError
          ? 'Not sent. Files can be 100 MB at most.'
          : error instanceof NoCameraError
            ? error.message
            : `Cannot open it. ${errorText(error)}`,
      );
      return;
    }
    if (!picked) return;
    const what = kind === 'photo' ? 'photo' : 'file';
    let kept: FileRef | null = null;
    try {
      if (picked.source.size > MAX_FILE) throw new TooLargeError();
      setNote(`Sending the ${what}…`);
      const size = picked.w && picked.h ? { w: picked.w, h: picked.h } : {};
      const sent = await sendFile(own, picked.source, { name: picked.name, mime: picked.mime, kind, ...size }, (done, count) => {
        if (count > 1) setNote(`Sending the ${what}, ${Math.floor((done / count) * 100)}%`);
      });
      kept = sent.ref;
      const identity = peer.slice(CONTACT_PREFIX.length);
      const sealed = await e2e.sealFile(identity, sent.offer, ownQueue?.senderHex ?? '', { at: here() });
      await handOver(e2e, target, identity, sealed, [sealed.packet]);
      addMessage(peer, '', true, sealed.tag, sealed.timer, undefined, sent.ref);
      kept = null;
      // Writing to a message request accepts it.
      setContacts(e2e.contacts());
      setNote(`${kind === 'photo' ? 'Photo' : 'File'} sent through the relay, end-to-end encrypted.`);
    } catch (error) {
      if (kept) await deleteChunks(kept.id, kept.count).catch(() => undefined);
      setNote(error instanceof TooLargeError ? 'Not sent. Files can be 100 MB at most.' : notSent(error));
    } finally {
      picked.close?.();
    }
  }

  // The phone's picker opens once the sheet has gone.
  function afterSheet(then: () => void) {
    setAttaching(false);
    setTimeout(then, Platform.OS === 'web' ? 0 : 350);
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
      else setNote('Type the relay address in Relay first.');
      return;
    }
    setViewing(message);
  }

  async function saveAttachment(message: Message, choose: boolean) {
    if (!message.file) return;
    try {
      const where = await saveFile(message.file, choose);
      if (!where) return;
      setViewing(null);
      setNote(`Saved in ${where}. There it is outside Erevos, not sealed.`);
    } catch (error) {
      setViewing(null);
      setNote(`Not saved. ${errorText(error)}`);
    }
  }

  const loadingPhotos = useRef(new Set<string>());

  // Reads a photo into memory to show it.
  function showPhoto(ref: FileRef) {
    if (ref.from || photosRef.current[ref.id] || loadingPhotos.current.has(ref.id)) return;
    loadingPhotos.current.add(ref.id);
    readFile(ref)
      .then((bytes) => {
        if (bytes) setPhotos((now) => ({ ...now, [ref.id]: photoUri(bytes, ref.mime) }));
      })
      .catch((error) => setNote(`Cannot show the photo. ${errorText(error)}`))
      .finally(() => loadingPhotos.current.delete(ref.id));
  }

  // Photos held in memory go when the chat closes.
  useEffect(
    () => () => {
      for (const uri of Object.values(photosRef.current)) releaseUri(uri);
    },
    [],
  );

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
      setNote(`You appear offline to ${label(peer, shownContacts)}. They see that messages came and were read once you write to them.`);
      return;
    }
    const target = relayTarget();
    try {
      if (!target) throw new Error('Type the relay address in Relay first.');
      await sendToContact(target, identity, '', { on: appShown() ? ONLINE : 0 });
      setNote(`${label(peer, shownContacts)} sees again when you are online, and which messages you read.`);
    } catch {
      setNote(`${label(peer, shownContacts)} sees again when you are online. What you read is told with your next message.`);
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
  async function moveToHidden(peer: string, pin: string, fresh: boolean) {
    if (!e2e || !history.current || moving) return;
    const identity = peer.slice(CONTACT_PREFIX.length);
    if (pin.length < MIN_PIN) {
      setMoveNote(`The PIN needs ${MIN_PIN} characters at least.`);
      return;
    }
    setMoving(true);
    setMoveNote('');
    try {
      const { space } = currentSpace();
      const key = fresh ? await setHiddenPassword(space, pin, null) : await openHidden(space, pin);
      if (!key) {
        setMoveNote('Wrong PIN.');
        return;
      }
      // Hidden chats reach the relay as the space does until they are given their own settings.
      const data = await loadHiddenData(space, key);
      const settings = data.url.trim()
        ? { url: data.url, token: data.token, via: data.via, viaToken: data.viaToken }
        : { url: relayUrl, token: relayToken, via: viaUrl, viaToken };
      const target = relayFor(settings.url, settings.token, settings.via, settings.viaToken);
      if (!target) throw new Error('Type the relay address in Relay first.');
      let queue = data.ownQueue;
      if (!queue) {
        const ids = await createQueue(target);
        queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
      }
      await updateHiddenData(space, key, { ...settings, ownQueue: queue });
      const hiddenChats = await E2E.open('hidden', space, key);
      const hiddenHistory = await History.open('hidden', space, key);
      await moveChat(identity, { e2e, history: history.current, archive }, { e2e: hiddenChats, history: hiddenHistory });
      setMessages((list) => list.filter((m) => m.peer !== peer));
      setContacts(e2e.contacts());
      setPinDraft('');
      setStartingNew(false);
      setOpened(null);
      setDetails(false);
      setSelected(null);
      // Where to write from now on, said from the hidden chats.
      try {
        const where = { relay: settings.url.trim(), relayKey: settings.url.trim() === relayUrl.trim() ? ownRelayKey : '' };
        const sealed = await hiddenChats.seal(identity, '', queue.senderHex, { at: where });
        const to = contactTarget(target, sealed);
        if (sealed.first) {
          await sendMessage(to, fromHex(sealed.sender), sealed.first);
          await hiddenChats.firstSent(identity);
        }
        await sendMessage(to, fromHex(sealed.sender), sealed.packet);
        setNote('Moved to the hidden chats. Type their PIN in the search on the home screen to open them.');
      } catch {
        setNote('Moved to the hidden chats. Their phone learns where to write when you next write to them from there.');
      }
      if (initial) router.canGoBack() ? router.back() : router.replace('/');
    } catch (error) {
      setMoveNote(
        error instanceof SamePasswordError
          ? 'Use a PIN other than the password that opens Erevos.'
          : error instanceof LockedOutError
            ? lockedOutMessage(error.until)
            : `Not moved. ${errorText(error)}`,
      );
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
      ? `New messages in this chat now disappear from both phones ${timerLabel(timer).toLowerCase()} after they are read.`
      : 'New messages in this chat no longer disappear.';
    const target = relayTarget();
    try {
      if (!target) throw new Error('Type the relay address in Relay first.');
      await sendToContact(target, identity, '');
      setNote(set);
    } catch (error) {
      setNote(`${set} ${label(peer, shownContacts)}'s phone learns it with your next message. ${notSent(error).replace('Not sent. ', '')}`);
    }
  }

  async function createOwnQueue() {
    const target = relayTarget();
    if (!target) {
      setNote('Type the relay address first.');
      return;
    }
    try {
      const ids = await createQueue(target);
      setOwnQueue({ recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
      setNote('Relay queue created.');
    } catch (error) {
      setNote(errorText(error));
    }
  }

  function addContact() {
    const code = parseContact(contactDraft);
    if (!code) {
      setNote('That is not an Erevos contact link.');
      return;
    }
    setContactDraft('');
    void acceptContact(code);
  }

  const visible = messages.filter((message) => message.peer === selected);
  // The photos shown: the latest in the thread, and the one looked at on its own.
  const shownPhotos = visible
    .filter((m) => m.file?.kind === 'photo' && !m.file.from)
    .slice(-SHOWN_PHOTOS)
    .map((m) => m.file!);
  if (viewing?.file?.kind === 'photo' && !viewing.file.from) shownPhotos.push(viewing.file);
  const shownKey = shownPhotos.map((file) => file.id).join(',');
  useEffect(() => {
    const wanted = new Set(shownPhotos.map((file) => file.id));
    for (const file of shownPhotos) showPhoto(file);
    setPhotos((now) => {
      const gone = Object.keys(now).filter((id) => !wanted.has(id));
      if (gone.length === 0) return now;
      const kept = { ...now };
      for (const id of gone) {
        releaseUri(kept[id]);
        delete kept[id];
      }
      return kept;
    });
  }, [shownKey]);
  const selectedIdentity = selected?.startsWith(CONTACT_PREFIX) ? selected.slice(CONTACT_PREFIX.length) : '';
  const imported = useMemo(() => (archive && selectedIdentity ? archive.linked(selectedIdentity) : []), [archive, selectedIdentity]);
  const importedFrom = [...new Set(imported.map((m) => SOURCE_LABELS[m.source]))].join(' and ');
  // In an imported group, each message says who wrote it.
  const importedGroup = useMemo(() => new Set(imported.filter((m) => !m.mine && m.sender).map((m) => m.sender)).size > 1, [imported]);
  // A contact without a name shows as the imported chat that goes on with them.
  const shownContacts = useMemo(
    () => contacts.map((c) => (c.name || !archive ? c : { ...c, name: cleanName(archive.linkedChats(c.identity)[0]?.title ?? '') })),
    [contacts, archive],
  );
  const chips = contacts.map((contact) => `${CONTACT_PREFIX}${contact.identity}`);
  const selectedContact = selected?.startsWith(CONTACT_PREFIX) ? selected : null;
  const selectedTimer = contacts.find((c) => c.identity === selectedIdentity)?.timer ?? 0;
  const firstImported = Math.max(0, imported.length - importedShown);
  // Without a relay queue the link has only the keys: who adds it reaches this phone nearby.
  const ownLink = !e2e
    ? null
    : ownQueue
      ? contactLink({ senderHex: ownQueue.senderHex, relayUrl: relayUrl.trim(), key: toBase64Url(e2e.bundle), relayKey: ownRelayKey || undefined })
      : hiddenKey
        ? null
        : contactLink({ senderHex: '', relayUrl: '', key: toBase64Url(e2e.bundle) });

  const selectedName = selected ? label(selected, shownContacts) : '';
  const selectedOnline = !!selectedIdentity && !selectedHidden && !!e2e && e2e.onlineUntil(selectedIdentity, now) > 0;
  const selectedNearby = !!selectedIdentity && !hiddenKey && nearby.isNear(selectedIdentity);
  const subtitle = selectedContact
    ? selectedOnline
      ? selectedNearby
        ? 'Online · nearby'
        : 'Online'
      : selectedNearby
        ? 'Nearby · end-to-end encrypted'
        : selectedTimer
          ? `End-to-end encrypted · ${timerLabel(selectedTimer).toLowerCase()} after read`
          : 'End-to-end encrypted'
    : '';

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

  return (
    <View style={styles.container}>
      <Modal visible={styling && shown} animationType="slide" statusBarTranslucent onRequestClose={() => setStyling(false)}>
        <ScreenBackdrop>
          <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.ground }}>
            <AppearanceEditor
              title={`Look of ${selectedName || 'this chat'}`}
              top={
                <View style={styles.section}>
                  <Text variant="caption" tone="muted">
                    {selectedLook
                      ? 'This chat has its own look, kept only on this phone. The rest of the app keeps its own.'
                      : 'This chat follows the app\'s look. Change anything below to give it its own.'}
                  </Text>
                  <Row wrap>
                    <Button title="Done" compact onPress={() => setStyling(false)} />
                    {selectedLook && e2e ? (
                      <TextButton
                        title="Same as the app"
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
          <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.ground }}>
            <View style={styles.sheetBar}>
              <BackButton onPress={() => setDetails(false)} />
              <Text variant="heading" style={styles.grow}>
                Details
              </Text>
              <TextButton title="Done" onPress={() => setDetails(false)} />
            </View>
            <ScrollView
              contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + space.xl }]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.hero}>
                <Pressable
                  onPress={selectedContact ? () => setOpened((now) => (now === 'picture' ? null : 'picture')) : undefined}
                  accessibilityRole={selectedContact ? 'button' : undefined}
                  accessibilityLabel={selectedContact ? 'Change picture' : undefined}
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
                    <QuickAction title="Call" sign="☏" onPress={() => {
                      setDetails(false);
                      void startCall(false);
                    }} />
                    <QuickAction title="Video" sign="▶" onPress={() => {
                      setDetails(false);
                      void startCall(true);
                    }} />
                    <QuickAction title="Rename" sign="✎" on={renaming === selectedContact} onPress={() => startRenaming(selectedContact)} />
                    <QuickAction title="Picture" sign="☺" on={opened === 'picture'} onPress={() => setOpened((now) => (now === 'picture' ? null : 'picture'))} />
                  </View>
                  {renaming === selectedContact ? (
                    <View style={styles.group}>
                      <Text variant="caption" tone="muted">
                        A name for them, only on this phone.
                      </Text>
                      <Row>
                        <Input
                          value={nameDraft}
                          onChangeText={setNameDraft}
                          onSubmitEditing={() => void rename(selectedContact)}
                          placeholder="Name"
                          maxLength={MAX_NAME}
                          autoFocus
                          style={styles.grow}
                        />
                        <Button title="Save" compact onPress={() => void rename(selectedContact)} />
                      </Row>
                    </View>
                  ) : null}
                  {opened === 'picture' ? (
                    <View style={styles.group}>
                      <Text variant="caption" tone="muted">
                        A picture for them, only on this phone. Without one, their picture is drawn from their key.
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
                              accessibilityLabel={`Colour ${color}`}
                              style={[styles.swatch, { backgroundColor: color }, signAvatar.color === color && styles.swatchOn]}
                            />
                          ))}
                        </View>
                      ) : null}
                      <Row wrap>
                        <Button title="Photo" kind="secondary" compact onPress={() => void choosePhoto(selectedContact, 'photos')} />
                        {CAN_TAKE_PHOTOS ? <Button title="Take photo" kind="secondary" compact onPress={() => void choosePhoto(selectedContact, 'camera')} /> : null}
                        {selectedAvatar ? <TextButton title="Picture from their key" onPress={() => void changeAvatar(selectedContact, null)} /> : null}
                      </Row>
                    </View>
                  ) : null}
                  <Text variant="overline" tone="muted" style={styles.groupTitle}>
                    Chat
                  </Text>
                  <View style={styles.group}>
                    <DetailRow
                      title="Disappearing messages"
                      value={timerLabel(selectedTimer)}
                      open={opened === 'timer'}
                      onPress={() => setOpened((now) => (now === 'timer' ? null : 'timer'))}
                    />
                    {opened === 'timer' ? (
                      <View style={styles.rowMore}>
                        <Text variant="caption" tone="muted">
                          New messages, sent or received, disappear from both phones this long after they are read.
                          Messages already here stay.
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
                      title="Appear offline"
                      right={<Toggle on={selectedHidden} />}
                      onPress={() => void changeHidden(selectedContact, !selectedHidden)}
                    />
                    <Text variant="caption" tone="muted" style={styles.rowMore}>
                      {selectedHidden
                        ? 'They do not see when you are online, nor that their messages came or were read, until you write. You do not see when they are online either.'
                        : 'They see when you are online, and which of their messages you read.'}
                    </Text>
                    <View style={styles.rule} />
                    <DetailRow
                      title="Chat look"
                      value={selectedLook ? 'Its own' : 'Same as the app'}
                      onPress={() => {
                        setDetails(false);
                        setStyling(true);
                      }}
                    />
                  </View>
                  <Text variant="overline" tone="muted" style={styles.groupTitle}>
                    Privacy
                  </Text>
                  <View style={styles.group}>
                    <DetailRow
                      title="Safety number"
                      value="End-to-end encrypted"
                      open={safety?.peer === selectedContact}
                      onPress={() => void toggleSafety(selectedContact)}
                    />
                    {safety?.peer === selectedContact ? (
                      <View style={styles.rowMore}>
                        <Text variant="caption" tone="muted">
                          Compare it with theirs, in person or on a call: if both phones show the same, no one is in between.
                        </Text>
                        <Text selectable variant="mono" style={styles.safety}>
                          {safety.number.split(' ').reduce((lines, group, i) => lines + (i === 0 ? '' : i % 4 === 0 ? '\n' : '  ') + group, '')}
                        </Text>
                      </View>
                    ) : null}
                    {!hiddenKey ? (
                      <>
                        <View style={styles.rule} />
                        <DetailRow
                          title="Move to hidden chats"
                          open={opened === 'move'}
                          onPress={() => {
                            setOpened((now) => (now === 'move' ? null : 'move'));
                            setMoveNote('');
                            setStartingNew(false);
                          }}
                        />
                        {opened === 'move' ? (
                          <View style={styles.rowMore}>
                            <Text variant="caption" tone="muted">
                              The chat leaves this list and goes into the hidden chats, sealed with their PIN. To open them,
                              type the PIN in the search on the home screen and press Enter. Nothing shows that they exist.
                            </Text>
                            <Input
                              value={pinDraft}
                              onChangeText={(text) => {
                                setPinDraft(text);
                                setMoveNote('');
                              }}
                              placeholder={`PIN of the hidden chats, ${MIN_PIN} or more characters`}
                              secureTextEntry
                              autoCapitalize="none"
                              autoCorrect={false}
                              onSubmitEditing={() => void moveToHidden(selectedContact, pinDraft, startingNew)}
                            />
                            {startingNew ? (
                              <Text variant="caption" style={{ color: colors.danger }}>
                                New hidden chats start with this PIN. Hidden chats this space had before, if any, can no
                                longer be opened. Tap again to go on.
                              </Text>
                            ) : null}
                            {moveNote ? (
                              <Text variant="caption" style={{ color: colors.danger }}>
                                {moveNote}
                              </Text>
                            ) : null}
                            <Row wrap>
                              <Button
                                title={startingNew ? 'Start and move' : 'Move'}
                                compact
                                loading={moving}
                                disabled={pinDraft.length < MIN_PIN}
                                onPress={() => void moveToHidden(selectedContact, pinDraft, startingNew)}
                              />
                              <Button
                                title={startingNew ? 'Cancel' : 'New hidden chats'}
                                kind="secondary"
                                compact
                                disabled={moving}
                                onPress={() => setStartingNew((on) => !on)}
                              />
                            </Row>
                            <Text variant="caption" tone="muted">
                              Their phone is told at once where to write from now on. A message they send in that moment may not come.
                            </Text>
                          </View>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                  <View style={[styles.group, styles.groupGap]}>
                    <DetailRow
                      title="Delete messages"
                      danger
                      onPress={() => {
                        setDetails(false);
                        deleteMessages(selectedContact);
                      }}
                    />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </ScreenBackdrop>
      </Modal>
      <Sheet visible={showQr && shown && !!ownLink} onClose={() => setShowQr(false)} title="My QR code">
        {ownLink ? <QrCode text={ownLink} size={240} /> : null}
        <Text variant="caption" tone="muted">
          Scan it with the other phone's camera and open the link in Erevos. If the camera only shows the text, copy it and
          paste it in Relay and new contacts on that phone.
        </Text>
        <Row wrap>
          <Button title="Done" compact onPress={() => setShowQr(false)} />
          {ownLink ? (
            <Button
              title={Platform.OS === 'web' ? 'Copy my contact link' : 'Share my contact link'}
              kind="secondary"
              compact
              onPress={() => void shareLink(ownLink)}
            />
          ) : null}
        </Row>
      </Sheet>
      {hiddenKey ? (
        <Text variant="overline" tone="muted" style={styles.kicker}>
          Hidden chats
        </Text>
      ) : null}
      <View style={styles.header}>
        <BackButton
          onPress={
            selected && (hiddenKey || !initial) ? () => setSelected(null) : hiddenKey ? onHidden : undefined
          }
        />
        {selected ? (
          <Pressable
            style={({ pressed }) => [styles.who, pressed && styles.pressed]}
            onPress={() => setDetails(true)}
            accessibilityRole="button"
            accessibilityLabel="Chat details"
          >
            <KeyFace identity={selectedIdentity} name={contactName(selected, shownContacts) ?? ''} size={42} avatar={selectedAvatar} />
            <View style={styles.grow}>
              <Text variant="heading" numberOfLines={1} style={!contactName(selected, shownContacts) && styles.monoName}>
                {selectedName}
              </Text>
              <View style={styles.subtitle}>
                {selectedContact ? <ShieldIcon color={colors.success} size={11} /> : null}
                {selectedContact && selectedTimer ? <TimerIcon color={colors.textMuted} size={11} /> : null}
                {selectedOnline ? <View style={[styles.onlineDot, { backgroundColor: colors.success }]} /> : null}
                <Text variant="caption" tone="muted" numberOfLines={1} style={styles.grow}>
                  {subtitle}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <Text variant="title" style={styles.grow}>
            {hiddenKey ? 'Hidden chats' : 'Chat'}
          </Text>
        )}
        {selected ? (
          <Pressable
            onPress={() => setDetails(true)}
            accessibilityRole="button"
            accessibilityLabel="Chat details"
            hitSlop={6}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          >
            <Text style={styles.moreText}>⋯</Text>
          </Pressable>
        ) : hiddenKey && onChangePassword ? (
          <TextButton title="Change PIN" onPress={onChangePassword} />
        ) : null}
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
                      {named ?? label(peer, shownContacts).replace(/^contact /, '')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text tone="muted">
              {hiddenKey
                ? 'No hidden chats yet. Add a contact through the relay below, or move a chat here from its details.'
                : Platform.OS === 'web'
                  ? 'No chats yet. Add a contact through the relay, under Relay.'
                  : 'No chats yet. Add a contact under Relay. Your contacts reach you nearby too, over Wi-Fi or Bluetooth, without the internet.'}
            </Text>
          )}
          <View style={styles.panel}>
            <Row wrap>
              <TextButton title={showRelay ? 'Hide relay' : 'Relay and new contacts'} onPress={() => setShowRelay((on) => !on)} />
            </Row>
            {showRelay ? (
              <View style={styles.section}>
                <Field label="Relay address">
                  <Input
                    value={relayUrl}
                    onChangeText={setRelayUrl}
                    placeholder="ws://computer-address:7879"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </Field>
                <Field label="Token (optional)">
                  <Input
                    value={relayToken}
                    onChangeText={setRelayToken}
                    placeholder="Token, if the relay needs one"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                  />
                </Field>
                <Field label="Second relay (optional)">
                  <Input
                    value={viaUrl}
                    onChangeText={setViaUrl}
                    placeholder="wss://another-relay"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </Field>
                {viaUrl.trim() ? (
                  <Field label="Second relay token (optional)">
                    <Input
                      value={viaToken}
                      onChangeText={setViaToken}
                      placeholder="Token, if the second relay needs one"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />
                  </Field>
                ) : null}
                <Text variant="caption" tone="muted">
                  With a second relay, what you send goes through it first, sealed for your relay. Your relay then never sees
                  your phone's address, and the second relay never sees who a message is for. Taking messages still goes
                  straight to your relay.
                </Text>
                <Button title="Create my relay queue" compact onPress={createOwnQueue} />
                {ownLink ? (
                  <View style={styles.section}>
                    <Text tone="muted">
                      {ownQueue
                        ? 'Your relay queue is ready. Give your contact link to whoever may write to you.'
                        : 'No relay queue yet. Your contact link has only your keys: who adds it reaches you nearby, over Wi-Fi or Bluetooth, until you have a relay.'}
                    </Text>
                    <Row wrap>
                      <Button title="Show my QR code" compact onPress={() => setShowQr(true)} />
                      <Button
                        title={Platform.OS === 'web' ? 'Copy my contact link' : 'Share my contact link'}
                        kind="secondary"
                        compact
                        onPress={() => void shareLink(ownLink)}
                      />
                    </Row>
                  </View>
                ) : null}
                <Text tone="muted">Add a contact by the contact link they gave you:</Text>
                <Row>
                  <Input
                    value={contactDraft}
                    onChangeText={setContactDraft}
                    placeholder="erevos://contact link"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.grow}
                  />
                  <Button title="Add" compact onPress={addContact} />
                </Row>
                {HAS_LINKS && !hiddenKey ? (
                  <View>
                    <DetailRow title="Find Erevos on the same Wi-Fi" right={<Toggle on={lanOn} />} onPress={() => changeLan(!lanOn)} />
                    <Text variant="caption" tone="muted">
                      {lanOn
                        ? 'While Chat is open, Erevos phones and computers on the same Wi-Fi or hotspot find each other and talk directly, even with no internet. Anyone on that Wi-Fi can tell an Erevos app is there, not whose.'
                        : HAS_RADIO
                          ? 'Only Bluetooth and Wi-Fi Aware look for phones nearby.'
                          : 'Nothing looks for Erevos nearby.'}
                    </Text>
                    <DetailRow title="Carry messages for others" right={<Toggle on={carrying} />} onPress={() => changeCarrying(!carrying)} />
                    <Text variant="caption" tone="muted">
                      {carrying
                        ? "When the relay cannot be reached, Erevos phones nearby give each other what they could not send, sealed for the contact's relay. This phone keeps those it gets, three days at most, and hands them to that relay through yours. It cannot read them, nor tell who they are from or for: it sees only the relay's address."
                        : 'This phone keeps nothing for others. What it cannot send, phones nearby still carry for you.'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : selectedContact && contacts.some((c) => c.request && `${CONTACT_PREFIX}${c.identity}` === selectedContact) ? (
        <View style={styles.panel}>
          <Text>Message request</Text>
          <Text variant="caption" tone="muted">
            Someone with your contact link wrote to you. Until you accept, their phone is not told that their messages
            came or were read. Writing to them accepts too.
          </Text>
          <Row wrap>
            <TextButton title="Accept" onPress={() => void acceptRequest(selectedContact)} />
            <TextButton title="Refuse" onPress={() => refuseRequest(selectedContact)} />
          </Row>
        </View>
      ) : null}
      <ScrollView
        ref={thread}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        onContentSizeChange={() => {
          if (holdScroll.current) holdScroll.current = false;
          else thread.current?.scrollToEnd({ animated: true });
        }}
      >
        {firstImported > 0 ? (
          <TextButton
            title={`Show earlier imported messages (${firstImported} more)`}
            onPress={() => {
              holdScroll.current = true;
              setImportedShown((count) => count + IMPORTED_PAGE * 4);
            }}
          />
        ) : null}
        {imported.length > 0 ? (
          <Text variant="caption" tone="muted" style={styles.divider}>
            Imported from {importedFrom}: only on this phone, only to read.
          </Text>
        ) : null}
        {imported.slice(firstImported).map((message, i) => {
          const files = mediaText(message.media);
          const ink = message.mine ? [styles.mineText, b.mineText] : [styles.theirsText, b.theirsText];
          return (
            <View key={`imported-${firstImported + i}`} style={[styles.bubble, message.mine ? b.mine : b.theirs, styles.imported]}>
              {importedGroup && !message.mine && message.sender ? <Text style={[ink, styles.sender]}>{message.sender}</Text> : null}
              {message.text ? <Text style={ink}>{message.text}</Text> : null}
              {files ? <Text style={[ink, styles.files]}>{`${files}, not imported`}</Text> : null}
              {message.at ? <Text style={[ink, styles.time]}>{shownTime(message.at)}</Text> : null}
            </View>
          );
        })}
        {imported.length > 0 ? (
          <Text variant="caption" tone="muted" style={styles.divider}>
            Continued in Erevos
          </Text>
        ) : null}
        {selected && visible.length === 0 && imported.length === 0 ? (
          <View style={styles.hello}>
            <ShieldIcon color={colors.textFaint} size={28} />
            <Text variant="caption" tone="muted" style={styles.divider}>
              No messages yet. What you write here is end-to-end encrypted, and kept sealed on this phone.
            </Text>
          </View>
        ) : null}
        {visible.map((message, i) => {
          const before = visible[i - 1];
          const after = visible[i + 1];
          const newDay = !before || dayOf(before.at) !== dayOf(message.at);
          // The last of a run from one side gets the bubble's tail, and room after it.
          const tail = !after || after.mine !== message.mine || dayOf(after.at) !== dayOf(message.at);
          const ink = message.mine ? [styles.mineText, b.mineText] : [styles.theirsText, b.theirsText];
          return (
            <View key={message.id}>
              {newDay && message.at ? (
                <Text variant="caption" tone="muted" style={[styles.divider, styles.day]}>
                  {dayLabel(message.at)}
                </Text>
              ) : null}
              <Pressable
                onPress={message.voice ? () => void play(message) : message.file ? () => openFile(message) : undefined}
                onLongPress={() => deleteMessage(message)}
                accessibilityHint={
                  message.voice ? 'Tap to play, long press to delete' : message.file ? 'Tap to open, long press to delete' : 'Long press to delete'
                }
                style={[
                  styles.bubble,
                  message.mine ? b.mine : b.theirs,
                  message.file?.kind === 'photo' && styles.photoBubble,
                  tail && (message.mine ? [b.mineTail, styles.mineTail] : [b.theirsTail, styles.theirsTail]),
                ]}
              >
                {message.file ? (
                  <Attachment file={message.file} uri={photos[message.file.id]} state={taking[`${message.peer}|${message.tag}`]} ink={ink} />
                ) : (
                  <Text style={ink}>
                    {message.voice
                      ? playingId === message.id
                        ? `■  Playing, ${voiceDuration(Math.max(0, message.voice.ms - played))}`
                        : `▶  Voice message, ${voiceDuration(message.voice.ms)}`
                      : message.text}
                  </Text>
                )}
                <Text style={[ink, styles.time]}>{[message.at ? clock(message.at) : '', caption(message)].filter(Boolean).join('  ·  ')}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      {note ? <Text variant="caption" style={styles.note}>{note}</Text> : null}
      <View style={styles.dock}>
        <Input
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => void send()}
          placeholder={selected ? `Message ${selectedName}` : 'Message'}
          maxLength={4000}
          style={styles.field}
        />
        <Row style={styles.tools}>
          <Row wrap style={[styles.grow, styles.toolsLeft]}>
            {selectedContact ? <Tool title="Disappear" on={vanishing} onPress={() => setVanishing((on) => !on)} /> : null}
            {selectedContact ? <Tool title="Attach" on={attaching} onPress={() => setAttaching(true)} /> : null}
            <Tool title={talking ? 'Let go to send' : 'Voice'} on={talking} onPressIn={startTalking} onPressOut={() => void stopTalking()} />
            <Tool title="Call" onPress={() => void startCall(false)} />
            <Tool title="Video" onPress={() => void startCall(true)} />
          </Row>
          <Button title="Send" compact disabled={!draft.trim() || !selected} onPress={() => void send()} style={styles.action} />
        </Row>
        {vanishing && selectedContact ? (
          <Row wrap>
            <Text variant="caption" tone="muted">
              Disappears after it is read, in:
            </Text>
            {TIMERS.slice(1).map((timer) => (
              <Chip key={timer} label={timerLabel(timer)} selected={false} onPress={() => void send(timer)} />
            ))}
            <TextButton title="Cancel" onPress={() => setVanishing(false)} />
          </Row>
        ) : null}
      </View>
      <Sheet visible={attaching} onClose={() => setAttaching(false)} title="Send a photo or file">
        <Row wrap>
          <Button title="Photo" compact onPress={() => sendPhoto('photos')} />
          {CAN_TAKE_PHOTOS ? <Button title="Take photo" compact onPress={() => sendPhoto('camera')} /> : null}
          <Button title="File" kind="secondary" compact onPress={sendPickedFile} />
        </Row>
        <Text variant="label">Photo quality</Text>
        <Row wrap>
          {QUALITIES.map(({ value, label: shown }) => (
            <Chip key={shown} label={shown} selected={quality === value} onPress={() => chooseQuality(value)} />
          ))}
        </Row>
        <Text variant="caption" tone="muted">
          {qualityNote(quality)}
        </Text>
        <Text variant="caption" tone="muted">
          A file goes as it is, up to 100 MB, with whatever it says inside. The relay keeps it, encrypted, until
          {` ${selectedName} `}takes it, 14 days at most.
        </Text>
      </Sheet>
      <Modal visible={viewing !== null} animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={[styles.viewer, { paddingTop: Math.max(space.lg, insets.top), paddingBottom: Math.max(space.lg, insets.bottom) }]}>
          {viewing?.file?.kind === 'photo' ? (
            <>
              {photos[viewing.file.id] ? (
                <Image source={{ uri: photos[viewing.file.id] }} style={styles.viewerPhoto} resizeMode="contain" accessibilityLabel="Photo" />
              ) : (
                <Text tone="muted" style={styles.viewerPhoto}>
                  Opening the photo…
                </Text>
              )}
              <Text tone="muted">
                {viewing.file.w && viewing.file.h ? `${viewing.file.w} × ${viewing.file.h} · ` : ''}
                {fileSize(viewing.file.size)}
              </Text>
            </>
          ) : viewing?.file ? (
            <View style={styles.viewerFile}>
              <Text variant="heading">{viewing.file.name}</Text>
              <Text tone="muted">{fileSize(viewing.file.size)}</Text>
            </View>
          ) : null}
          <Row wrap style={styles.viewerTools}>
            <Button title="Save" compact onPress={() => viewing && void saveAttachment(viewing, false)} />
            {CAN_CHOOSE_FOLDER ? (
              <Button title="Save in another folder" kind="secondary" compact onPress={() => viewing && void saveAttachment(viewing, true)} />
            ) : null}
            <Button title="Close" kind="secondary" compact onPress={() => setViewing(null)} />
          </Row>
        </View>
      </Modal>
    </View>
  );
}

// A photo or file in the thread: the photo itself once it is here and shown, otherwise what it
// is and how far it has come.
function Attachment({ file, uri, state, ink }: { file: FileRef; uri?: string; state?: string; ink: StyleProp<TextStyle> }) {
  const colors = useColors();
  const status = !file.from
    ? null
    : state === 'gone'
      ? 'No longer on the relay'
      : state === 'failed'
        ? 'Did not come · tap to try again'
        : state
          ? `Coming, ${state}`
          : `Tap to take it, ${fileSize(file.size)}`;
  if (file.kind === 'photo') {
    const width = 240;
    const height = Math.round(Math.min(320, Math.max(120, file.w && file.h ? (width * file.h) / file.w : 180)));
    return uri ? (
      <Image source={{ uri }} style={{ width, height, borderRadius: radius.md }} resizeMode="cover" resizeMethod="resize" accessibilityLabel="Photo" />
    ) : (
      <View style={{ width, height, borderRadius: radius.md, backgroundColor: withAlpha(colors.text, 0.08), alignItems: 'center', justifyContent: 'center', padding: space.md }}>
        <Text style={[ink, { textAlign: 'center' }]}>{status ?? 'Photo · tap to see it'}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 2, minWidth: 160 }}>
      <Text style={[ink, { fontWeight: '600' }]} numberOfLines={2}>
        {file.name}
      </Text>
      <Text style={[ink, { fontSize: 13, opacity: 0.8 }]}>{status ?? `${fileSize(file.size)} · tap to save`}</Text>
    </View>
  );
}

// A button under the message field: small, so a row of them fits beside Send. Voice is held, not tapped.
type ToolProps = { title: string; on?: boolean; onPress?: () => void; onPressIn?: () => void; onPressOut?: () => void };

function Tool({ title, on = false, onPress, onPressIn, onPressOut }: ToolProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({
        minHeight: 40,
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: on ? colors.primary : withAlpha(colors.border, 0.7),
        backgroundColor: pressed ? colors.surfacePressed : on ? withAlpha(colors.primary, 0.14) : colors.surfaceAlt,
      })}
    >
      <Text variant="label" color={on ? colors.accentText : colors.text} style={{ fontSize: 14 }}>
        {title}
      </Text>
    </Pressable>
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
function DetailRow({ title, value, right, open, danger = false, onPress }: {
  title: string;
  value?: string;
  right?: ReactNode;
  /** Whether what it opens under it shows; without it, the row goes somewhere or acts at once. */
  open?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={open === undefined ? undefined : { expanded: open }}
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
      {!right && !danger ? (
        <Text style={{ fontSize: 20, lineHeight: 22, color: colors.textFaint, transform: [{ rotate: open ? '90deg' : '0deg' }] }}>›</Text>
      ) : null}
    </Pressable>
  );
}

// A switch, drawn: on, it fills with the accent and its knob goes right.
function Toggle({ on }: { on: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        padding: 3,
        justifyContent: 'center',
        alignItems: on ? 'flex-end' : 'flex-start',
        backgroundColor: on ? colors.primary : withAlpha(colors.textMuted, 0.3),
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: on ? colors.onPrimary : colors.surface }} />
    </View>
  );
}

const dayOf = (at: number) => new Date(at).toDateString();

const clock = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Above the first message of a day: Today, Yesterday, or its date.
function dayLabel(at: number): string {
  const d = new Date(at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString()) return 'Yesterday';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const layout = StyleSheet.create({
  screen: {
    flex: 1,
  },
  gone: {
    display: 'none',
  },
  back: {
    width: 32,
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
      paddingHorizontal: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.sm,
    },
    // The contact's picture and name: tapped, it shows or hides the chat's details.
    who: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: 4,
      paddingRight: space.sm,
      borderRadius: radius.lg,
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
    },
    // Under the messages: the message field across, and the buttons under it.
    dock: {
      gap: space.sm,
      marginHorizontal: -space.lg,
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.sm,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: withAlpha(colors.border, 0.5),
    },
    field: {
      borderRadius: radius.pill,
      paddingHorizontal: space.lg,
    },
    // The buttons under the message field, narrow enough for a row of them.
    action: {
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
    },
    // Send keeps to the right of the row, and the others wrap beside it when the phone is narrow.
    tools: {
      alignItems: 'flex-end',
    },
    toolsLeft: {
      gap: 6,
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
    // A photo fills its bubble, with a thin edge.
    photoBubble: {
      paddingTop: 4,
      paddingHorizontal: 4,
    },
    viewer: {
      flex: 1,
      gap: space.md,
      paddingHorizontal: space.lg,
      backgroundColor: colors.ground,
    },
    viewerPhoto: {
      flex: 1,
      width: '100%',
      textAlign: 'center',
      textAlignVertical: 'center',
    },
    viewerFile: {
      flex: 1,
      gap: space.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewerTools: {
      justifyContent: 'center',
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
    more: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.surfaceAlt, 0.8),
    },
    moreText: {
      fontSize: 22,
      lineHeight: 24,
      color: colors.text,
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
