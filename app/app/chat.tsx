import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Modal, PermissionsAndroid, Platform, Pressable, ScrollView, Share, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onRadioEvent, sendText, startRadio, stopRadio } from '../modules/erevos-radio';
import { currentCall } from '../lib/call';
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
import { openHidden, setHiddenPassword } from '../lock/hidden';
import { cleanName, MAX_NAME, type Avatar } from '../lock/e2e-data';
import { savePhoto } from '../lock/avatar-photos';
import { pickAvatar } from '../lib/pick-avatar';
import { History, newTag, type Mark, type Message as Kept } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadHiddenData, updateCurrentSpaceData, updateHiddenData, type Queue, type SpaceData } from '../lock/space-data';
import { callRelay, createQueue, fromHex, isQueueNotFound, receiveMessage, relayKey, sameRelay, sendMessage, toHex, type CallRelay, type Relay } from '../lib/relay';
import { answersAsk, appShown, holdReceiver } from '../lib/receiver';
import { contactTarget, relayFor, spaceChats } from '../lib/space-chats';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { bubbleStyles } from '../theme/bubbles';
import { useColors, useStyles, useTheme } from '../theme/context';
import { ChatTheme } from '../theme/chat-theme';
import type { Look } from '../theme/look';
import { ScreenBackdrop } from '../components/backdrop';
import { AppearanceEditor } from './appearance';

// Chat with contacts through the relay, end-to-end encrypted (lib/e2e.ts), and with nearby phones
// over the radio link, not encrypted yet. A contact is added from their contact link, which
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
// beside our relay when it has one; each call leaves a line in the chat. Messages over the radio
// link are kept in memory only, so they are gone when the chat closes.
//
// Every space also has hidden chats (lock/hidden.ts), opened with their own password from the
// Hidden chats button, which every space shows whether it has hidden chats or not. They are a
// second chat with their own relay queue, account and contacts, over the relay only (the radio
// link is the phone's, and its chats are the open space's). The other chats stay open underneath and
// keep receiving. Hidden chats close when the app goes to the background or this screen closes,
// and their messages go with them.
//
// A chat brought in from another messenger (lock/archive.ts) can go on with one of the space's
// contacts: its messages show ahead of theirs, only to read, and a contact without a name takes
// the imported chat's. They are never sent, and stay when this chat's messages are deleted.

// `tag` names a message with a contact on both phones (lock/history.ts). Radio messages have none.
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

// Their photos and files up to this size are taken from the relay as soon as they come.
const AUTO_TAKE = 16 * 1000 * 1000;

// Photos shown in the thread at once, the latest: each is held whole in memory while shown. The
// others show when tapped. A computer has the memory for all of them.
const SHOWN_PHOTOS = Platform.OS === 'web' ? 200 : 6;

// Contacts are named by their identity key, after this prefix. Radio peers by their link id.
const CONTACT_PREFIX = 'contact:';

const PERMISSIONS: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [
  'android.permission.NEARBY_WIFI_DEVICES',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.ACCESS_FINE_LOCATION',
];

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
  const [hiddenKey, setHiddenKey] = useState<Uint8Array | null>(null);
  const insets = useSafeAreaInsets();
  // A contact to open with (from the home screen, or an imported chat that goes on with them),
  // the hidden chats' password to ask for at once, or the relay settings to show at once.
  const { contact, hidden, setup } = useLocalSearchParams<{ contact?: string; hidden?: string; setup?: string }>();
  const [asking, setAsking] = useState<'open' | 'change' | null>(hidden === '1' ? 'open' : null);
  const initial = typeof contact === 'string' && /^[0-9a-f]{64}$/.test(contact) ? `${CONTACT_PREFIX}${contact}` : null;
  // The look of the chat in view (its own, or the space's), as the chat showing says.
  const [chatLook, setChatLook] = useState<ChatLook | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        setHiddenKey(null);
        setAsking(null);
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
            <Chat hiddenKey={null} initial={initial} setup={setup === '1'} shown={!hiddenKey} onHidden={() => setAsking('open')} onLook={setChatLook} />
          </View>
          {hiddenKey ? (
            <Chat hiddenKey={hiddenKey} shown onHidden={() => setHiddenKey(null)} onChangePassword={() => setAsking('change')} onLook={setChatLook} />
          ) : null}
          <PasswordSheet
            visible={asking === 'open'}
            title="Hidden chats"
            repeat={false}
            submitLabel="Open"
            onClose={() => setAsking(null)}
            onSubmit={async (password) => {
              const key = await openHidden(currentSpace().space, password);
              if (!key) return false;
              setAsking(null);
              setHiddenKey(key);
            }}
          />
          <PasswordSheet
            visible={asking === 'change'}
            title="Change hidden chats password"
            repeat
            submitLabel="Save"
            onClose={() => setAsking(null)}
            onSubmit={async (password) => {
              await setHiddenPassword(currentSpace().space, password, hiddenKey);
              setAsking(null);
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

/** Back to the screen before, or home when the chat was opened first. */
function BackButton() {
  const router = useRouter();
  const colors = useColors();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
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
function Chat({ hiddenKey, initial = null, setup = false, shown, onHidden, onChangePassword, onLook }: {
  hiddenKey: Uint8Array | null;
  initial?: string | null;
  /** Opens with the relay settings and adding a contact in view. */
  setup?: boolean;
  shown: boolean;
  onHidden: () => void;
  onChangePassword?: () => void;
  /** Told the look of the chat in view while this one shows: its contact's own, or none. */
  onLook: (look: ChatLook | null) => void;
}) {
  // Nearby phones on the radio link.
  const [peers, setPeers] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(initial);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [showRelay, setShowRelay] = useState(setup);
  // The chat's details above the messages: safety number, name, timer, deleting, other chats.
  const [details, setDetails] = useState(setup || !initial);
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
  // The contact whose disappearing messages timer is being picked.
  const [timing, setTiming] = useState<string | null>(null);
  // The contact whose picture is being chosen, in the chat's details.
  const [picturing, setPicturing] = useState<string | null>(null);
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
  async function sendReceipts(target: Relay) {
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
    if (!target) {
      setNote('Not added. Type the relay address in Relay first.');
      return;
    }
    try {
      // The contact answers through our own queue, so there has to be one.
      let queue = ownQueue;
      if (!queue) {
        const ids = await createQueue(target);
        queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
        setOwnQueue(queue);
      }
      const { identity, added } = await e2e.addContact(code, queue.senderHex, here(url));
      setContacts(e2e.contacts());
      setSelected(`${CONTACT_PREFIX}${identity}`);
      await sendPending(e2e, target);
      setNote(
        added
          ? 'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs.'
          : 'Already a contact. Where to reach them is updated.',
      );
    } catch (error) {
      setNote(`Not added. ${errorText(error)}`);
    }
  }

  // The radio link belongs to the phone, not to a space: until messages are sealed for each
  // space's own keys, a nearby phone's message shows in whichever space is open.
  useEffect(() => {
    if (Platform.OS !== 'android' || hiddenKey) return;
    let active = true;
    const subscriptions = [
      onRadioEvent('onPeer', ({ id, kind }) => {
        if (kind === 'ble') return; // presence only, not a data link
        setPeers((list) => (list.includes(id) ? list : [...list, id]));
        setSelected((current) => current ?? id);
      }),
      onRadioEvent('onText', ({ peer, text }) => {
        addMessage(peer, text, false);
      }),
    ];
    PermissionsAndroid.requestMultiple(PERMISSIONS).finally(() => {
      if (active) startRadio();
    });
    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription?.remove());
      stopRadio();
    };
  }, []);

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
  // one is. A chat that appears offline asks nothing, so it does not learn it either.
  const selectedHidden = contacts.some((c) => `${CONTACT_PREFIX}${c.identity}` === selected && c.hide);
  const selectedAccepted = contacts.some((c) => `${CONTACT_PREFIX}${c.identity}` === selected && !c.request && c.sender);
  useEffect(() => {
    if (!shown || !appActive || !e2e || !selected?.startsWith(CONTACT_PREFIX) || selectedHidden || !selectedAccepted) return;
    const identity = selected.slice(CONTACT_PREFIX.length);
    const ask = () => {
      const target = relayTarget();
      // Said a moment ago already: they know, and answer that.
      if (!target || Date.now() - e2e.toldAt(identity) < (ONLINE * 1000) / 3) return;
      sendToContact(target, identity, '', { ask: true, on: ONLINE }).catch(() => {
        // Asked again in a while.
      });
    };
    ask();
    const timer = setInterval(ask, ASK_EVERY);
    return () => clearInterval(timer);
  }, [shown, appActive, e2e, selected, selectedHidden, selectedAccepted, relayUrl, relayToken, viaUrl, viaToken, ownQueue]);

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
        for (let i = 0; i < RECEIVE_BATCH && active; i++) {
          const bytes = await receiveMessage(own, recipient);
          if (failed !== null && active) {
            const shown = failed;
            setNote((current) => (current === shown ? 'The relay answers again.' : current));
            failed = null;
          }
          if (!bytes) break;
          // Taken from the relay, so kept even if the chat closed meanwhile.
          handle(await e2e.receive(bytes));
        }
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
      }, currentCall() ? LOOK_IN_CALL : LOOK_EVERY);
    }
    next();

    // What one message from the relay brings.
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

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [relayUrl, relayToken, viaUrl, viaToken, ownQueue, e2e]);

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

  // Seals a message for a contact and hands it to the relay, after the first packet of the
  // conversation if the relay has not taken that yet. Returns the message's tag and how long it lasts.
  async function sendToContact(target: Relay, identity: string, text: string, extra: Extra = {}): Promise<{ tag: string; timer: number }> {
    if (!e2e) throw new Error(NO_CORE);
    const sealed = await e2e.seal(identity, text, ownQueue?.senderHex ?? '', { ...extra, at: here() });
    const to = contactTarget(target, sealed);
    if (sealed.first) {
      await sendMessage(to, fromHex(sealed.sender), sealed.first);
      await e2e.firstSent(identity);
    }
    await sendMessage(to, fromHex(sealed.sender), sealed.packet);
    // Writing to a message request accepts it.
    if (text) setContacts(e2e.contacts());
    return { tag: sealed.tag, timer: sealed.timer };
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
    if (currentCall()) {
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

  function notSent(error: unknown): string {
    return isQueueNotFound(error)
      ? "Not sent. The relay does not have this contact's queue any more. Ask them to write to you, or for their new contact link."
      : `Not sent. ${errorText(error)}`;
  }

  // Sends the message typed. With `lasts` (seconds), only this one disappears, that long after it is read.
  async function send(lasts = 0) {
    const text = draft.trim();
    if (!text || !selected) return;
    setVanishing(false);
    if (!selected.startsWith(CONTACT_PREFIX)) {
      if (sendText(selected, text)) {
        keep(selected, text);
        setNote('Sent over the radio link, not encrypted.');
      } else {
        setNote('Not sent. The link to this phone is not ready.');
      }
      return;
    }
    const target = relayTarget();
    if (!target) {
      setNote('Not sent. Type the relay address in Relay first.');
      return;
    }
    if (!e2e) {
      setNote(NO_CORE);
      return;
    }
    try {
      const { tag, timer } = await sendToContact(target, selected.slice(CONTACT_PREFIX.length), text, { lasts });
      keep(selected, text, tag, timer);
      setNote(
        timer
          ? `Sent through the relay, end-to-end encrypted. It disappears from both phones ${timerLabel(timer).toLowerCase()} after it is read.`
          : 'Sent through the relay, end-to-end encrypted.',
      );
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

  // Seals a voice message for the contact picked, hands its parts to the relay in turn, and keeps
  // its sound sealed. If the relay cannot take all of it, it is not kept.
  async function sendVoice(audio: Uint8Array, ms: number) {
    const peer = selectedContact;
    const target = relayTarget();
    if (!peer || !target) {
      setNote('Not sent. Type the relay address in Relay first.');
      return;
    }
    if (!e2e) {
      setNote(NO_CORE);
      return;
    }
    const identity = peer.slice(CONTACT_PREFIX.length);
    try {
      const sealed = await e2e.sealVoice(identity, audio, ms, ownQueue?.senderHex ?? '', { at: here() });
      const to = contactTarget(target, sealed);
      if (sealed.first) {
        await sendMessage(to, fromHex(sealed.sender), sealed.first);
        await e2e.firstSent(identity);
      }
      for (const packet of sealed.packets) await sendMessage(to, fromHex(sealed.sender), packet);
      addMessage(peer, '', true, sealed.tag, sealed.timer, await saveClip(audio, ms));
      // Writing to a message request accepts it.
      setContacts(e2e.contacts());
      setNote('Voice message sent through the relay, end-to-end encrypted.');
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
      const to = contactTarget(target, sealed);
      if (sealed.first) {
        await sendMessage(to, fromHex(sealed.sender), sealed.first);
        await e2e.firstSent(identity);
      }
      await sendMessage(to, fromHex(sealed.sender), sealed.packet);
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

  async function changeTimer(peer: string, timer: number) {
    if (!e2e) return;
    const identity = peer.slice(CONTACT_PREFIX.length);
    try {
      await e2e.setTimer(identity, timer);
      setContacts(e2e.contacts());
      setTiming(null);
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
  const chips = [...peers, ...contacts.map((contact) => `${CONTACT_PREFIX}${contact.identity}`)];
  const selectedContact = selected?.startsWith(CONTACT_PREFIX) ? selected : null;
  const selectedTimer = contacts.find((c) => c.identity === selectedIdentity)?.timer ?? 0;
  const firstImported = Math.max(0, imported.length - importedShown);
  const ownLink =
    ownQueue && e2e ? contactLink({ senderHex: ownQueue.senderHex, relayUrl: relayUrl.trim(), key: toBase64Url(e2e.bundle), relayKey: ownRelayKey || undefined }) : null;

  const selectedName = selected ? label(selected, shownContacts) : '';
  const selectedOnline = !!selectedIdentity && !selectedHidden && !!e2e && e2e.onlineUntil(selectedIdentity, now) > 0;
  const subtitle = selectedContact
    ? selectedOnline
      ? 'Online'
      : selectedTimer
      ? `End-to-end encrypted · ${timerLabel(selectedTimer).toLowerCase()} after read`
      : 'End-to-end encrypted'
    : selected
      ? 'Nearby · not encrypted yet'
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
      {hiddenKey ? (
        <Text variant="overline" tone="muted" style={styles.kicker}>
          Hidden chats
        </Text>
      ) : null}
      <View style={styles.header}>
        <BackButton />
        {selected ? (
          <Pressable
            style={({ pressed }) => [styles.who, pressed && styles.pressed]}
            onPress={() => setDetails((on) => !on)}
            accessibilityRole="button"
            accessibilityLabel={details ? 'Hide chat details' : 'Show chat details'}
          >
            {selectedContact ? (
              <KeyFace identity={selectedIdentity} name={contactName(selectedContact, shownContacts) ?? ''} size={42} avatar={selectedAvatar} />
            ) : (
              <NearbyFace size={42} />
            )}
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
        <Row>
          {selected ? <TextButton title={details ? 'Done' : 'Details'} onPress={() => setDetails((on) => !on)} /> : null}
          {hiddenKey && onChangePassword && details ? <TextButton title="Change password" onPress={onChangePassword} /> : null}
          {hiddenKey ? <TextButton title="Close" onPress={onHidden} /> : selected ? null : <TextButton title="Hidden chats" onPress={onHidden} />}
        </Row>
      </View>
      {details || !selected ? (
        <ScrollView style={styles.top} contentContainerStyle={styles.topContent} keyboardShouldPersistTaps="handled">
          {chips.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces} keyboardShouldPersistTaps="handled">
              {chips.map((peer) => {
                const named = contactName(peer, shownContacts);
                const on = peer === selected;
                return (
                  <Pressable
                    key={peer}
                    onPress={() => {
                      setSelected(peer);
                      setDetails(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={label(peer, shownContacts)}
                    style={styles.face}
                  >
                    <View style={[styles.ring, on && styles.ringOn]}>
                      {peer.startsWith(CONTACT_PREFIX) ? (
                        <KeyFace
                          identity={peer.slice(CONTACT_PREFIX.length)}
                          name={named ?? ''}
                          size={48}
                          avatar={contacts.find((c) => `${CONTACT_PREFIX}${c.identity}` === peer)?.avatar}
                        />
                      ) : (
                        <NearbyFace size={48} />
                      )}
                    </View>
                    <Text variant="caption" tone={on ? undefined : 'muted'} numberOfLines={1} style={[styles.faceName, !named && styles.monoSmall]}>
                      {named ?? label(peer, shownContacts).replace(/^contact /, '')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text tone="muted">
              {hiddenKey
                ? 'No hidden chats yet. Add a contact through the relay below.'
                : Platform.OS === 'web'
                  ? 'No chats yet. Add a contact through the relay, under Relay.'
                  : 'Looking for a nearby Erevos phone. Contacts through the relay are under Relay.'}
            </Text>
          )}
          {selectedContact && contacts.some((c) => c.request && `${CONTACT_PREFIX}${c.identity}` === selectedContact) ? (
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
          {selectedContact ? (
            <View style={styles.panel}>
              <Text variant="caption" tone="muted">
                End-to-end encrypted. Compare the safety number with theirs, in person or on a call: if both phones show
                the same, no one is in between.
              </Text>
              <Row wrap>
                <TextButton
                  title={safety?.peer === selectedContact ? 'Hide safety number' : 'Show safety number'}
                  onPress={() => void toggleSafety(selectedContact)}
                />
                <TextButton title="Rename" onPress={() => startRenaming(selectedContact)} />
                <TextButton title="Picture" onPress={() => setPicturing((current) => (current === selectedContact ? null : selectedContact))} />
                <TextButton title="Chat look" onPress={() => setStyling(true)} />
                <TextButton title="Delete messages" onPress={() => deleteMessages(selectedContact)} />
                <TextButton
                  title={`Disappearing: ${timerLabel(selectedTimer)}`}
                  onPress={() => setTiming((current) => (current === selectedContact ? null : selectedContact))}
                />
                <TextButton
                  title={selectedHidden ? 'Appear offline: on' : 'Appear offline: off'}
                  onPress={() => void changeHidden(selectedContact, !selectedHidden)}
                />
              </Row>
              {selectedHidden ? (
                <Text variant="caption" tone="muted">
                  You appear offline to them: they do not see when you are online, nor that their messages came or were
                  read, until you write. Then you show online for a while, and what you read shows read. You do not see
                  when they are online either.
                </Text>
              ) : null}
              {timing === selectedContact ? (
                <View style={styles.section}>
                  <Text variant="caption" tone="muted">
                    New messages, sent or received, disappear from both phones this long after they are read. Messages
                    already here stay.
                  </Text>
                  <Row wrap>
                    {TIMERS.map((timer) => (
                      <Chip
                        key={timer}
                        label={timerLabel(timer)}
                        selected={timer === selectedTimer}
                        onPress={() => void changeTimer(selectedContact, timer)}
                      />
                    ))}
                  </Row>
                </View>
              ) : null}
              {picturing === selectedContact ? (
                <View style={styles.section}>
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
                    <TextButton title="Photo" onPress={() => void choosePhoto(selectedContact, 'photos')} />
                    {CAN_TAKE_PHOTOS ? <TextButton title="Take photo" onPress={() => void choosePhoto(selectedContact, 'camera')} /> : null}
                    {selectedAvatar ? <TextButton title="Picture from their key" onPress={() => void changeAvatar(selectedContact, null)} /> : null}
                  </Row>
                </View>
              ) : null}
              {renaming === selectedContact ? (
                <Row>
                  <Input
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    onSubmitEditing={() => void rename(selectedContact)}
                    placeholder="Name, only on this phone"
                    maxLength={MAX_NAME}
                    autoFocus
                    style={styles.grow}
                  />
                  <Button title="Save" compact onPress={() => void rename(selectedContact)} />
                </Row>
              ) : null}
              {safety?.peer === selectedContact ? (
                <Text selectable variant="mono" style={styles.safety}>
                  {safety.number.split(' ').reduce((lines, group, i) => lines + (i === 0 ? '' : i % 4 === 0 ? '\n' : '  ') + group, '')}
                </Text>
              ) : null}
            </View>
          ) : selected ? (
            <View style={styles.panel}>
              <Text variant="caption" tone="muted">
                Nearby radio link: not end-to-end encrypted yet. Anyone nearby with the right tools could read it.
              </Text>
            </View>
          ) : null}
          <View style={styles.panel}>
            <Row wrap>
              <TextButton title={showRelay ? 'Hide relay' : 'Relay and new contacts'} onPress={() => setShowRelay((on) => !on)} />
              {!hiddenKey && selected ? <TextButton title="Hidden chats" onPress={onHidden} /> : null}
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
                    <Text tone="muted">Your relay queue is ready. Give your contact link to whoever may write to you.</Text>
                    <Row wrap>
                      <TextButton title={showQr ? 'Hide my QR code' : 'Show my QR code'} onPress={() => setShowQr((on) => !on)} />
                      <TextButton title={Platform.OS === 'web' ? 'Copy my contact link' : 'Share my contact link'} onPress={() => void shareLink(ownLink)} />
                    </Row>
                    {showQr ? (
                      <>
                        <QrCode text={ownLink} />
                        <Text variant="caption" tone="muted">
                          Scan it with the other phone's camera and open the link in Erevos. If the camera only
                          shows the text, copy it and paste it below on that phone.
                        </Text>
                      </>
                    ) : null}
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
              </View>
            ) : null}
          </View>
        </ScrollView>
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
            {selectedContact ? <ShieldIcon color={colors.textFaint} size={28} /> : <NearbyFace size={40} />}
            <Text variant="caption" tone="muted" style={styles.divider}>
              {selectedContact
                ? 'No messages yet. What you write here is end-to-end encrypted, and kept sealed on this phone.'
                : 'No messages yet. Nearby messages are not encrypted yet, and go when the chat closes.'}
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

// A nearby phone's picture: rings, for the radio.
function NearbyFace({ size }: { size: number }) {
  const colors = useColors();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
      {[0.7, 0.42, 0.14].map((part) => (
        <View
          key={part}
          style={{
            position: 'absolute',
            width: size * part,
            height: size * part,
            borderRadius: size,
            borderWidth: part < 0.2 ? 0 : 1.5,
            borderColor: colors.accentText,
            backgroundColor: part < 0.2 ? colors.accentText : 'transparent',
          }}
        />
      ))}
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
