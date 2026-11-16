// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, View, type LayoutChangeEvent, type ScrollViewInstance, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ask } from '../lib/alert';
import { bytesSource, readFile, takeOffRelay } from '../lib/attachments';
import { cardWords } from '../lib/card-share';
import { chatText, exportName } from '../lib/chat-export';
import { choose as chooseOption, editableWords, joinedText, placeWords, pollOpen, pollWords, stillEditable, threadRoots, threadSizes, type Place, type Poll } from '../lib/chat-parts';
import { CAN_COPY, copyText } from '../lib/clipboard';
import type { Among } from '../lib/contact-book';
import { canForward, forwardToGroup, handForward, type Forwardable } from '../lib/forward';
import { sendGroupFile } from '../lib/group-media';
import { asChatMessage, seenMark, type Marked } from '../lib/group-parts';
import { memberName, type GroupInfo } from '../lib/groups';
import { useOpenHiddenPlace } from '../lib/hidden-contacts';
import { plural, t } from '../lib/i18n';
import { firstLink, fitPreview, previewWay } from '../lib/link-preview';
import { CAN_PREVIEW, makePreview } from '../lib/make-preview';
import { mentionsIn } from '../lib/mentions';
import { messageLine } from '../lib/message-line';
import { searchMessages, type Findable } from '../lib/message-search';
import { CAN_COLLECT, importFromChat } from '../lib/collection-import';
import { useModules } from '../lib/modules';
import { keepAsSticker, stickerMeta } from '../lib/own-stickers';
import { CAN_PLACE } from '../lib/place';
import { throughTor } from '../lib/relay';
import { IpStop } from '../lib/ip-warning';
import { groupIpGate } from './ip-warning';
import { saveText } from '../lib/save-file';
import { stickerOf } from '../lib/stickers';
import type { FileRef } from '../lock/attachment-files';
import type { GroupMessage, GroupParts } from '../lock/group-data';
import { openOwnSticker, type OwnSticker } from '../lock/sticker-data';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

import { CardBubble, CardSheet, saveCard } from './card-share';
import type { Answering, ComposerTile, DraftBox, Editing } from './composer';
import { useGroupsWhere } from './groups-at';
import { MessageMenu, type MenuAction } from './message-menu';
import { PlaceCard, Pinned, PreviewCard, Quote, Reactions } from './message-parts';
import { PlaceSheet } from './place-sheet';
import { PollCard, PollSheet } from './poll';
import { SpeechSheet } from './speech-sheet';
import { TranslateSheet } from './translate-sheet';
import { canWriteOut } from '../lib/speech';
import { canTranslate } from '../lib/translate';
import { languageOf } from '../lib/translate-ways';
import { SelectBar, selectAction, useSelection } from './select-bar';
import { PLAYS_LAST, StickerPicker, StickerView } from './stickers';
import { Button, Input, Row, Sheet, Text, TextButton } from './ui';
import { WhoRead } from './who-read';

// What a group's messages do beyond words and files (lib/group-parts.ts), in its thread
// (components/group-chat.tsx), as in a contact's chat: a message held down opens its menu (react, reply,
// forward, star, pin, copy, delete), and its bubble shows what it answers, a sticker, a place, a
// poll, a link's preview, its reactions, and that it was forwarded or is starred. The messages
// pinned show over the thread; a search goes through the group's messages. Under "+", and the
// message bar's sticker button: a sticker, built in or one of the space's made from photos (sent as
// a photo is); under "+" too, where you are, and a poll.
// Photos, files and voice messages themselves are components/group-media.tsx's.
// Ours, in a group that is not public, are marked as a contact's chat marks them: ✓ sent, ✓✓ once
// it reached the phone of every member who was in the group then, ✓✓✓ once every one read it
// (lib/group-parts.ts seenMark); held down, Who read it lists each member, and when.
// A message answered shows how many answers its thread has (answer after answer, lib/chat-parts.ts
// threadRoots); tapped, or Reply in thread, the thread shows alone, and what is sent there answers
// its first message, or the one answered: an Erevos from before shows them as answers. Select, in
// the menu, chooses several messages to copy, forward or delete together (components/select-bar.tsx).
// Its sender ends a poll (End poll), and a contact card goes under "+" (components/card-share.tsx).

const MARKS = ['✓', '✓✓', '✓✓✓'];

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

type Asked = 'search' | 'export';

// What a public group's own screen (app/public-group.tsx), which has its search and export, asked
// of the group's thread it goes to.
let askedOf: { id: string; what: Asked } | null = null;

/** Has group `id`'s thread, as it shows next, open its search or write the group out. */
export function askThread(id: string, what: Asked): void {
  askedOf = { id, what };
}

type Target = { key: string; name: string; go: () => Promise<void> };

/**
 * The parts of group `id`'s messages (`messages`, as `info` says the group is), with `name` naming
 * a member by identity and `onNote` showing what went wrong. `scroll` is the thread, to go to a
 * message; `at`, the tag of one to go to once it shows; `draft`, what the message bar holds, which
 * takes the words of one of ours to edit.
 */
export function useGroupMessages({ id, info, messages, name, onNote, scroll, at, draft }: {
  id: string;
  info: GroupInfo | null;
  messages: GroupMessage[];
  name: (identity: string) => string;
  onNote: (text: string) => void;
  scroll: RefObject<ScrollViewInstance | null>;
  at?: string;
  draft?: DraftBox;
}) {
  const colors = useColors();
  const where = useGroupsWhere();
  const { at: groupsAt } = where;
  const [menuFor, setMenuForNow] = useState<GroupMessage | null>(null);
  // Each opening of a message's menu, so each is a menu of its own (components/message-menu.tsx).
  const [menuTurn, setMenuTurn] = useState(0);
  const setMenuFor = (m: GroupMessage | null) => {
    if (m) setMenuTurn((n) => n + 1);
    setMenuForNow(m);
  };
  const [replying, setReplying] = useState<GroupMessage | null>(null);
  // The message of ours the bar gives new words, while it does.
  const [editing, setEditing] = useState<GroupMessage | null>(null);
  // The messages being forwarded (one, or those chosen), while where is picked.
  const [forwarding, setForwarding] = useState<GroupMessage[] | null>(null);
  // One of ours whose readers are shown.
  const [readers, setReaders] = useState<GroupMessage | null>(null);
  // A voice message being written out (components/speech-sheet.tsx): how its sound is read.
  const [hearing, setHearing] = useState<(() => Promise<Uint8Array | null>) | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [stickering, setStickering] = useState(false);
  const [polling, setPolling] = useState(false);
  // A contact's card being chosen to send: among the space's contacts, or the hidden chats'.
  const [sharingCard, setSharingCard] = useState(false);
  const hiddenLent = useOpenHiddenPlace();
  const among: Among = where.at.hidden ? hiddenLent : 'space';
  // The thread shown alone, by the tag of its first message (null: the whole group).
  const [thread, setThread] = useState<string | null>(null);
  // The messages chosen to copy, forward or delete together, by tag.
  const selection = useSelection<string>();
  const [placing, setPlacing] = useState(false);
  const [pinShown, setPinShown] = useState(0);
  const [previews, setPreviews] = useState(false);
  const [previewsTor, setPreviewsTor] = useState(false);
  // What is looked for in the group (null: no search), and which of what it found is gone to.
  const [searching, setSearching] = useState<string | null>(null);
  const [searchAt, setSearchAt] = useState(0);
  // Where each message is in the thread, by tag, the one to go to once it shows, and the one lit.
  const placed = useRef(new Map<string, number>());
  const goal = useRef(at ?? null);
  const [lit, setLit] = useState<string | null>(null);
  // Once a message was gone to, the thread stays there as it changes, until we write.
  const stays = useRef(false);
  // What a public group's own screen asked, taken as the thread shows.
  const [asked, setAsked] = useState<Asked | null>(null);

  const out = !info || info.status !== 'in';
  // The stickers made from photos of the space, or of the hidden place the group is in.
  const stickerPlace = useMemo(() => where.stickers(), [where]);
  const modules = useModules();
  // The last few messages play their sticker as they show.
  const playing = new Set(messages.slice(-PLAYS_LAST).map((m) => m.tag));

  useEffect(() => {
    where.previews().then(setPreviews, () => setPreviews(false));
    where.previewsTor().then(setPreviewsTor, () => setPreviewsTor(false));
  }, [where]);

  // Who else is in the group, by identity: null in a public group, whose members say nothing of
  // what came and was read. Each one's latest joining, so one of ours waits only for who was there.
  const [others, setOthers] = useState<string[] | null>(null);
  useEffect(() => {
    let active = true;
    void groupsAt
      .groups()
      .then(async (groups) => (groups.isPublic(id) ? null : (await groups.members(id)).flatMap((m) => (m.about && !m.me ? [m.about.id] : []))))
      .then((list) => {
        if (active) setOthers(list);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, groupsAt, info]);
  const joined = useMemo(() => {
    const at = new Map<string, number>();
    for (const m of messages) if (m.note && m.text.endsWith('|joined')) at.set(m.text.slice(0, m.text.indexOf('|')), m.at);
    return at;
  }, [messages]);
  const meantFor = (m: GroupMessage) => (others ?? []).filter((member) => (joined.get(member) ?? 0) <= m.at);
  // How far one of ours went, as its mark; none for a member's, or in a public group.
  const markOf = (m: GroupMessage) => (m.from || !m.tag || m.unsent || others === null ? '' : MARKS[seenMark(m, meantFor(m))]);

  useFocusEffect(
    useCallback(() => {
      if (askedOf?.id !== id) return;
      setAsked(askedOf.what);
      askedOf = null;
    }, [id]),
  );

  useEffect(() => {
    if (!asked) return;
    setAsked(null);
    if (asked === 'export') {
      void exportGroup();
      return;
    }
    setSearching('');
    setSearchAt(0);
  }, [asked]);

  useEffect(() => {
    if (!lit) return;
    const timer = setTimeout(() => setLit(null), 1600);
    return () => clearTimeout(timer);
  }, [lit]);

  const byTag = (tag: string) => messages.find((m) => !m.note && m.tag === tag);
  const who = (m: GroupMessage) => (m.from ? name(m.from) : t('You'));
  const lineOf = (m: GroupMessage) => messageLine(asChatMessage(m));

  // Each message's thread, by tag, and how many answers each thread has.
  const roots = useMemo(() => threadRoots(messages.filter((m) => !m.note && m.tag)), [messages]);
  const sizes = useMemo(() => threadSizes(roots), [roots]);
  // A thread whose first message is gone shows no more; another group shown leaves it, and the choosing.
  useEffect(() => {
    if (thread && !roots.has(thread)) setThread(null);
  }, [thread, roots]);
  useEffect(() => {
    setThread(null);
    selection.clear();
  }, [id]);
  // Back ends the choosing, then leaves the thread.
  useEffect(() => {
    if (!selection.on && !thread) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selection.on) selection.clear();
      else setThread(null);
      return true;
    });
    return () => subscription.remove();
  }, [selection.on, thread]);

  // Shows a thread alone, from its first message.
  function openThread(root: string) {
    selection.clear();
    setReplying(null);
    setThread(root);
    stays.current = false;
  }

  // Goes to one of the group's messages, by its tag, and lights it a moment.
  function goTo(tag: string) {
    const y = placed.current.get(tag);
    if (y === undefined) {
      onNote(t('That message is not on this phone.'));
      return;
    }
    stays.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, y - 96), animated: true });
    setLit(tag);
  }

  // Says something of a message for every member; what went wrong shows.
  async function mark(marked: Marked): Promise<GroupMessage | null> {
    try {
      return await (await groupsAt.groups()).mark(id, marked, groupsAt.transport);
    } catch (error) {
      onNote(t('Not sent. {reason}', { reason: errorText(error) }));
      return null;
    }
  }

  function react(m: GroupMessage, emoji: string) {
    void mark({ t: 'react', tag: m.tag, emoji: m.reactions?.[''] === emoji ? '' : emoji });
  }

  function vote(m: GroupMessage, option: number) {
    if (!m.poll || !pollOpen(m)) return;
    void mark({ t: 'vote', tag: m.tag, chose: chooseOption(m.votes?.[''] ?? [], option, !!m.poll.m) });
  }

  // Ends a poll of ours, for every member: it takes no more votes. An Erevos from before shows it still open.
  function endPoll(m: GroupMessage) {
    if (m.from || !pollOpen(m)) return;
    void mark({ t: 'close', tag: m.tag });
  }

  function star(m: GroupMessage) {
    void groupsAt
      .groups()
      .then((groups) => groups.star(id, m.tag, !m.starred))
      .catch((error) => onNote(errorText(error)));
  }

  async function copy(m: GroupMessage) {
    onNote((await copyText(m.text)) ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'));
  }

  // Deletes a message here, or, ours, for every member: then its file leaves our relay too.
  function remove(m: GroupMessage) {
    ask(t('Delete message'), t('Delete this message? It cannot be brought back.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('This phone'), onPress: () => void deleteHere([m]) },
      ...(!m.from && !out ? [{ text: t('Everyone'), style: 'destructive' as const, onPress: () => void eraseForEveryone([m]) }] : []),
    ]);
  }

  // Deletes messages from this phone only.
  async function deleteHere(list: GroupMessage[]) {
    try {
      const groups = await groupsAt.groups();
      for (const m of list) await groups.deleteHere(id, m.tag);
    } catch (error) {
      onNote(errorText(error));
    }
  }

  // Deletes messages of ours for every member, one by one as one alone goes: each one's file leaves our relay too.
  async function eraseForEveryone(list: GroupMessage[]) {
    for (const m of list) {
      const gone = await mark({ t: 'erase', tag: m.tag });
      if (!gone) return;
      if (gone.put) await takeOffRelay(await groupsAt.relay(), gone.put).catch(() => undefined);
    }
  }

  // Deletes the messages chosen, after one question, each as Delete does it alone: for every member
  // too when all of them are ours.
  function removeChosen(list: GroupMessage[]) {
    if (list.length === 0) return;
    const ours = !out && list.every((m) => !m.from);
    ask(t('Delete messages'), plural(list.length, 'Delete this message? It cannot be brought back.', 'Delete these {n} messages? They cannot be brought back.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('This phone'),
        onPress: () => {
          selection.clear();
          void deleteHere(list);
        },
      },
      ...(ours
        ? [
            {
              text: t('Everyone'),
              style: 'destructive' as const,
              onPress: () => {
                selection.clear();
                void eraseForEveryone(list);
              },
            },
          ]
        : []),
    ]);
  }

  // Copies the words of the messages chosen, one after the other: of several, each with when and who wrote it.
  async function copyChosen(list: GroupMessage[]) {
    selection.clear();
    const lines = list.map((m) => ({ at: m.at, who: who(m), text: m.text && !m.sticker && !m.place && !m.poll && !m.file ? m.text : lineOf(m) }));
    onNote((await copyText(joinedText(lines))) ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'));
  }

  const forwardable = (m: GroupMessage): Forwardable => {
    const { text, file, ms, sticker, place, poll, preview, card } = m;
    return { text, file, ms, sticker, place, poll, preview, card };
  };

  // Asks where messages go (one, or those chosen, in the order they were sent): to a contact's chat,
  // or another group, of the space or the hidden place.
  async function startForward(chosen: GroupMessage[]) {
    const list = [...chosen].sort((a, b) => a.at - b.at);
    setForwarding(list);
    setTargets([]);
    const [chats, groups] = await Promise.all([groupsAt.chats().catch(() => null), groupsAt.groups().catch(() => null)]);
    const contacts: Target[] = (chats?.e2e.contacts() ?? [])
      .filter((c) => !c.request)
      .map((c) => ({
        key: `contact:${c.identity}`,
        name: memberName(c.identity, [c]),
        go: async () => {
          for (const m of list) handForward(`contact:${c.identity}`, forwardable(m));
          where.openContact(c.identity);
        },
      }));
    const others: Target[] = (groups?.list() ?? [])
      .filter((g) => g.status === 'in')
      .map((g) => ({
        key: `group:${g.id}`,
        name: t('{name} (group)', { name: g.name }),
        go: async () => {
          onNote(t('Forwarding…'));
          for (const m of list) await forwardToGroup(g.id, forwardable(m), groupsAt);
          onNote('');
          if (g.id !== id) where.openGroup(g.id);
        },
      }));
    setTargets([...contacts, ...others]);
  }

  // Whether a message of ours can take new words, for every member: words of our own (lib/chat-parts.ts)
  // the phone sent, within the last day (EDIT_FOR).
  const canEdit = (m: GroupMessage) => !out && !m.from && !m.note && !!m.tag && !m.unsent && editableWords(m) && stillEditable(m.at, Date.now());

  function startEditing(m: GroupMessage) {
    setReplying(null);
    setEditing(m);
    draft?.set(m.text);
  }

  function stopEditing() {
    setEditing(null);
    draft?.set('');
  }

  function menuActions(m: GroupMessage): MenuAction[] {
    const actions: MenuAction[] = [];
    if (!out) actions.push({ title: t('Reply'), onPress: () => setReplying(m) });
    if (!thread && !out) actions.push({ title: t('Reply in thread'), onPress: () => openThread(roots.get(m.tag) ?? m.tag) });
    if (canForward(m)) actions.push({ title: t('Forward'), onPress: () => void startForward([m]) });
    actions.push({ title: m.starred ? t('Unstar') : t('Star'), onPress: () => star(m) });
    if (!out) actions.push({ title: m.pinned ? t('Unpin') : t('Pin'), onPress: () => void mark({ t: 'pin', tag: m.tag, on: !m.pinned }) });
    if (CAN_COPY && m.text && !m.sticker && !m.place && !m.poll) actions.push({ title: t('Copy'), onPress: () => void copy(m) });
    if (canTranslate() && m.text && !m.sticker && !m.place && !m.poll && languageOf(m.text)) {
      const said = m.text;
      actions.push({ title: t('Translate'), onPress: () => setTranslating(said) });
    }
    if (m.file && m.ms !== undefined && !m.file.from && canWriteOut()) {
      const file = m.file;
      actions.push({ title: t('In words'), onPress: () => setHearing(() => () => readFile(file)) });
    }
    if (canEdit(m)) actions.push({ title: t('Edit'), onPress: () => startEditing(m) });
    if (!out && !m.from && !m.unsent && pollOpen(m)) actions.push({ title: t('End poll'), onPress: () => endPoll(m) });
    if (markOf(m)) actions.push({ title: t('Who read it'), onPress: () => setReaders(m) });
    if (m.file?.sticker && !m.file.from) actions.push({ title: t('Add to my stickers'), onPress: () => void addToStickers(m.file!) });
    // A photo or file that is here goes into the Collection of the group's place too: the space's, or the hidden place's the group lives in.
    if (m.file && !m.file.sticker && !m.file.once && !m.file.from && CAN_COLLECT && modules.has('collection')) actions.push({ title: t('Save to the Collection'), onPress: () => void saveToCollection(m.file!) });
    actions.push(selectAction(() => selection.start(m.tag)));
    actions.push({ title: t('Delete'), danger: true, onPress: () => remove(m) });
    return actions;
  }

  // The preview of the first link in words typed, when this phone makes them, only through Tor
  // with their own Tor switch on (lib/link-preview.ts previewWay, lib/make-preview.ts).
  async function previewOf(text: string): Promise<GroupParts> {
    const way = CAN_PREVIEW ? previewWay(previews, previewsTor, throughTor()) : 'none';
    const link = way !== 'none' ? firstLink(text) : null;
    if (!link) return {};
    onNote(t('Making the link’s preview…'));
    const made = await makePreview(link, way === 'tor');
    onNote('');
    const preview = made && fitPreview(text, made);
    return preview ? { preview } : {};
  }

  /**
   * Sends words, typed (with what they answer and a link's preview) or, given `parts`, a sticker's, a
   * place's or a poll's; or, while one of ours is edited, gives it the words typed, for every member.
   */
  async function send(text: string, parts?: GroupParts): Promise<void> {
    if (!parts && editing) {
      if (text !== editing.text) {
        try {
          await (await groupsAt.groups()).mark(id, { t: 'edit', tag: editing.tag, text }, groupsAt.transport);
        } catch (error) {
          throw new Error(t('Not edited. {reason}', { reason: errorText(error) }));
        }
        onNote(t('Edited for everyone.'));
      }
      setEditing(null);
      return;
    }
    // That the relays that carry it see this phone's internet address is said once for the group,
    // before (components/ip-warning.tsx). Cancel there sends nothing, and says nothing more.
    if (!(await groupIpGate(id, groupsAt.hidden))) throw new IpStop();
    const groups = await groupsAt.groups();
    // The members named with @ and their whole name (lib/mentions.ts): told in a muted group too.
    const named = parts ? [] : mentionsIn(text, (await groups.members(id).catch(() => [])).flatMap((m) => (m.about && !m.me ? [{ identity: m.about.id, name: name(m.about.id) }] : [])));
    // In a thread, what goes answers the one answered, or else its first message.
    const re = replying?.tag ?? thread ?? undefined;
    const carried = parts ? { ...(thread && !parts.re ? { re: thread } : {}), ...parts } : { ...(re ? { re } : {}), ...(await previewOf(text)), ...(named.length > 0 ? { named } : {}) };
    await groups.send(id, text, groupsAt.transport, carried);
    stays.current = false;
    if (!parts) setReplying(null);
  }

  function sendParts(text: string, parts: GroupParts) {
    send(text, parts).catch((error) => {
      if (!(error instanceof IpStop)) onNote(errorText(error));
    });
  }

  // Sends a sticker made from a photo: as a photo goes, marked as a sticker (lib/own-stickers.ts).
  async function sendOwnSticker(sticker: OwnSticker) {
    setStickering(false);
    try {
      const picture = await openOwnSticker(sticker);
      if (!picture) throw new Error(t('This sticker\'s picture is gone.'));
      onNote(t('Sending the sticker…'));
      await sendGroupFile(await groupsAt.groups(), id, await groupsAt.relay(), bytesSource(picture), stickerMeta(picture), undefined, groupsAt.transport, undefined, thread ? { re: thread } : {});
      stays.current = false;
      onNote('');
    } catch (error) {
      onNote(t('Not sent. {reason}', { reason: errorText(error) }));
    }
  }

  // Keeps a sticker that came as one of the space's own.
  async function addToStickers(file: FileRef) {
    try {
      await keepAsSticker(stickerPlace, file);
      onNote(t('Added to your stickers.'));
    } catch (error) {
      onNote(errorText(error));
    }
  }

  // Copies a photo or file of the group, as the same bytes, into the Collection of this group's place.
  async function saveToCollection(file: FileRef) {
    try {
      await importFromChat(stickerPlace, file);
      onNote(t('Saved to the Collection.'));
    } catch (error) {
      onNote(t('Not added. {error}', { error: errorText(error) }));
    }
  }

  // Writes the group out as text where the owner picks (lib/chat-export.ts), once they say so.
  async function exportGroup() {
    if (!info) return;
    const asked = t('Its messages are written to a text file, with their times and who wrote them, saved where you choose. The file is not encrypted: anyone who has it, or any app that reads where it is, can read the chat. Photos, files and voice messages are only named, and messages that disappear are left out.');
    const go = await new Promise<boolean>((resolve) =>
      ask(t('Export this chat?'), asked, [
        { text: t('Cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('Export'), onPress: () => resolve(true) },
      ]),
    );
    if (!go) return;
    const now = Date.now();
    const written = messages
      .filter((m) => !m.note)
      .map((m) => ({
        ...asChatMessage(m),
        mine: !m.from,
        by: m.from ? name(m.from) : undefined,
        reactedBy: Object.entries(m.reactions ?? {}).map(([member, emoji]) => ({ emoji, name: member ? name(member) : t('You') })),
        votedBy: Object.entries(m.votes ?? {}).map(([member, chose]) => ({ chose, name: member ? name(member) : t('You') })),
      }));
    try {
      const where = await saveText(exportName(info.name, now), chatText(written, info.name, now));
      if (where) onNote(t('Saved in {where}. There it is outside Erevos, not sealed.', { where }));
    } catch (error) {
      onNote(t('Not saved. {error}', { error: errorText(error) }));
    }
  }

  // The messages chosen, in the thread's order, those still here.
  const chosenNow = selection.on ? messages.filter((m) => !m.note && m.tag && selection.chosen.has(m.tag)) : [];
  const pins = messages.filter((m) => !m.note && m.pinned).sort((a, b) => b.pinned! - a.pinned!);
  const pinnedNow = pins.length > 0 ? pins[pinShown % pins.length] : null;
  const findable: Findable[] = messages.filter((m) => !m.note).map((m) => ({ ...asChatMessage(m), peer: `group:${id}`, mine: !m.from }));
  const hits = searching ? searchMessages(findable, searching) : [];
  const goToHit = (n: number) => {
    const hit = hits[n];
    if (!hit) return;
    setSearchAt(n);
    goTo(hit.tag);
  };

  return {
    /** Opens a message's menu. */
    hold: (m: GroupMessage) => {
      if (!m.note && m.tag) setMenuFor(m);
    },
    /** Where a message is in the thread, as it lays out, to go to it; the one to go to is gone to once it shows. */
    placedAt: (m: GroupMessage) => (event: LayoutChangeEvent) => {
      if (!m.tag) return;
      placed.current.set(m.tag, event.nativeEvent.layout.y);
      if (goal.current === m.tag) {
        goal.current = null;
        setTimeout(() => goTo(m.tag), 400);
      }
    },
    /** Goes to one of the group's messages, by its tag, and lights it a moment. */
    goTo,
    /** Where a message begins in the thread, by its tag: undefined while it is not laid out. */
    yOf: (tag: string) => placed.current.get(tag),
    /** Whether the thread follows what comes, to its end: not once a message was gone to, until we write. */
    follows: () => !stays.current,
    /** As its arrows go: kept where it is read, at its start, or following what comes again, at its end. */
    stay: (on: boolean) => {
      stays.current = on;
    },
    /** A bubble's look while it is the one gone to. */
    litStyle: (m: GroupMessage): StyleProp<ViewStyle> => (lit && m.tag === lit ? { borderWidth: 2, borderColor: colors.primary } : null),
    /** What a message answers, at the top of its bubble. */
    quote: (m: GroupMessage, ink: StyleProp<TextStyle>): ReactNode => {
      if (!m.re) return null;
      const quoted = byTag(m.re);
      return <Quote name={quoted ? who(quoted) : ''} line={quoted ? lineOf(quoted) : ''} ink={ink} onPress={() => goTo(m.re!)} />;
    },
    /** A sticker, a place, a poll or a contact card, in place of the words; null for others. */
    body: (m: GroupMessage, ink: StyleProp<TextStyle>): ReactNode => {
      if (m.sticker) return <StickerView name={m.sticker} fallback={m.text} play={playing.has(m.tag)} tap onLongPress={() => setMenuFor(m)} />;
      if (m.place) return <PlaceCard place={m.place} ink={ink} />;
      if (m.poll) {
        const voters = Object.entries(m.votes ?? {}).map(([member, chose]) => ({ name: member ? name(member) : t('You'), chose }));
        return <PollCard poll={m.poll} voters={voters} mine={m.votes?.[''] ?? []} onChoose={out ? undefined : (option) => vote(m, option)} ink={ink} ended={!!m.closed} />;
      }
      if (m.card) return <CardBubble card={m.card} ink={ink} onSave={() => saveCard(m.card!, where.at.hidden)} />;
      return null;
    },
    /** Under a message answered, outside a thread: how many answers its thread has, to show it. */
    threadCount: (m: GroupMessage): ReactNode => {
      const n = thread || m.note ? 0 : (sizes.get(m.tag) ?? 0);
      if (!n) return null;
      return (
        <View style={{ alignSelf: m.from ? 'flex-start' : 'flex-end', paddingHorizontal: space.sm }}>
          <TextButton title={plural(n, '{n} answer in the thread', '{n} answers in the thread')} onPress={() => openThread(m.tag)} />
        </View>
      );
    },
    /** The thread shown alone, by the tag of its first message, or null. */
    thread,
    /** Whether a message shows: in the thread shown, or any while none is. */
    inThread: (m: GroupMessage): boolean => !thread || (!m.note && roots.get(m.tag) === thread),
    /** Shows the whole group again. */
    closeThread: () => setThread(null),
    /** Messages are being chosen: a tap on one adds it or takes it out. */
    choosing: selection.on,
    /** Whether a message is one of those chosen. */
    chosen: (m: GroupMessage): boolean => selection.on && selection.chosen.has(m.tag),
    /** Adds a message to those chosen, or takes it out. */
    choose: (m: GroupMessage) => {
      if (!m.note && m.tag) selection.toggle(m.tag);
    },
    /** The bar over the thread while messages are chosen, in place of the group's. */
    selectBar: selection.on ? (
      <SelectBar
        count={chosenNow.length}
        onCancel={selection.clear}
        onAll={() => selection.set(messages.filter((m) => !m.note && m.tag && (!thread || roots.get(m.tag) === thread)).map((m) => m.tag))}
        onCopy={CAN_COPY && chosenNow.length > 0 ? () => void copyChosen(chosenNow) : undefined}
        onForward={chosenNow.length > 0 && chosenNow.every(canForward) ? () => void startForward(chosenNow) : undefined}
        onDelete={chosenNow.length > 0 ? () => removeChosen(chosenNow) : undefined}
      />
    ) : null,
    /** A link's preview, under the words. */
    preview: (m: GroupMessage, ink: StyleProp<TextStyle>): ReactNode => (m.preview && !m.file ? <PreviewCard preview={m.preview} ink={ink} /> : null),
    /** What goes beside a message's time: that it was forwarded or edited, its star, and, on a linked device, that the phone could not send it. */
    caption: (m: GroupMessage): string => [m.forwarded ? t('Forwarded') : '', m.edited ? t('Edited') : '', m.starred ? '★' : '', m.unsent ? t('Not sent by the phone') : '', markOf(m)].filter(Boolean).join('  ·  '),
    /** The reactions under a bubble. */
    reactions: (m: GroupMessage): ReactNode => (
      <Reactions signs={Object.values(m.reactions ?? {})} mine={m.reactions?.['']} mineSide={!m.from} onPress={() => setMenuFor(m)} />
    ),
    /** The messages pinned, over the thread. */
    pinned: pinnedNow ? (
      <Pinned
        line={lineOf(pinnedNow)}
        index={pinShown % pins.length}
        count={pins.length}
        onPress={() => {
          goTo(pinnedNow.tag);
          setPinShown((n) => (n + 1) % pins.length);
        }}
      />
    ) : null,
    /** The search, over the thread while it is open. */
    search:
      searching !== null ? (
        <Row style={{ paddingHorizontal: space.lg }}>
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
            style={{ flex: 1 }}
          />
          <Text variant="caption" tone="muted">
            {searching.trim() ? (hits.length > 0 ? t('{n} of {count}', { n: searchAt + 1, count: hits.length }) : t('None')) : ''}
          </Text>
          <Step sign="▲" label={t('Earlier')} onPress={() => goToHit(Math.min(hits.length - 1, searchAt + 1))} />
          <Step sign="▼" label={t('Later')} onPress={() => goToHit(Math.max(0, searchAt - 1))} />
          <Step sign="✕" label={t('Close')} onPress={() => setSearching(null)} />
        </Row>
      ) : null,
    /** Opens the search. */
    startSearch: () => {
      setSearching('');
      setSearchAt(0);
    },
    exportGroup: () => void exportGroup(),
    /** What the next message answers, over the field, with ✕ to drop it. */
    answering: replying && !editing ? ({ name: who(replying), line: lineOf(replying), onPress: () => goTo(replying.tag), onClose: () => setReplying(null) } satisfies Answering) : null,
    /** The message of ours the bar edits, over the field, with ✕ to stop. */
    editing: editing ? ({ line: lineOf(editing), onClose: stopEditing } satisfies Editing) : null,
    send,
    /** Opens the stickers, from the message bar's button. */
    openStickers: () => setStickering(true),
    /** The panel's tiles after the photos and files: a sticker, where you are, a poll, a contact card. */
    attachMore: (afterPanel: (then: () => void) => void): ComposerTile[] => [
      { key: 'sticker', title: t('Sticker'), icon: 'sticker', onPress: () => afterPanel(() => setStickering(true)) },
      ...(CAN_PLACE ? [{ key: 'place', title: t('Location'), icon: 'place' as const, onPress: () => afterPanel(() => setPlacing(true)) }] : []),
      { key: 'poll', title: t('Poll'), icon: 'poll', onPress: () => afterPanel(() => setPolling(true)) },
      { key: 'card', title: t('Contact card'), icon: 'contact', onPress: () => afterPanel(() => setSharingCard(true)) },
    ],
    sheets: (
      <>
        <MessageMenu
          key={`menu-${menuTurn}`}
          visible={menuFor !== null}
          onClose={() => setMenuFor(null)}
          line={menuFor ? lineOf(menuFor) : ''}
          reaction={menuFor?.reactions?.['']}
          onReact={menuFor && !out ? (emoji) => react(menuFor, emoji) : undefined}
          actions={menuFor ? menuActions(menuFor) : []}
        />
        <Sheet visible={!!forwarding} onClose={() => setForwarding(null)} title={t('Forward to')}>
          {forwarding ? (
            <>
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {forwarding.map(lineOf).join(' · ')}
              </Text>
              {targets.map((target) => (
                <TextButton
                  key={target.key}
                  title={target.name}
                  onPress={() => {
                    setForwarding(null);
                    selection.clear();
                    setTimeout(() => void target.go().catch((error) => onNote(t('Not sent. {reason}', { reason: errorText(error) }))), Platform.OS === 'web' ? 0 : 300);
                  }}
                />
              ))}
              <Text variant="caption" tone="muted">
                {t('It goes as a copy, sent anew and end-to-end encrypted, marked as forwarded but not from where.')}
              </Text>
            </>
          ) : null}
        </Sheet>
        <SpeechSheet sound={hearing} onClose={() => setHearing(null)} />
        <TranslateSheet text={translating} onClose={() => setTranslating(null)} />
        <Sheet visible={!!readers} onClose={() => setReaders(null)} title={t('Who read it')}>
          {readers ? <Readers m={readers} members={meantFor(readers)} name={name} /> : null}
        </Sheet>
        <Sheet visible={stickering} onClose={() => setStickering(false)} title={t('Send a sticker')}>
          <StickerPicker
            onPick={(sticker) => {
              setStickering(false);
              const drawn = stickerOf(sticker);
              if (drawn) sendParts(drawn.emoji, { sticker });
            }}
            mine={{ place: stickerPlace, onPick: (sticker) => void sendOwnSticker(sticker) }}
          />
        </Sheet>
        <PollSheet
          visible={polling}
          onClose={() => setPolling(false)}
          onSend={(poll: Poll) => {
            setPolling(false);
            sendParts(pollWords(poll), { poll });
          }}
        />
        <CardSheet
          visible={sharingCard}
          onClose={() => setSharingCard(false)}
          among={among}
          onSend={(card) => {
            setSharingCard(false);
            sendParts(cardWords(card), { card });
          }}
        />
        <PlaceSheet
          visible={placing}
          onClose={() => setPlacing(false)}
          onSend={(place: Place) => {
            setPlacing(false);
            sendParts(placeWords(place), { place });
          }}
          said={t('Everyone in {name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.', { name: info?.name ?? '' })}
        />
      </>
    ),
  };
}

// Each member one of ours was for: who read it and when, whose phone it reached and when, and who has neither yet.
function Readers({ m, members, name }: { m: GroupMessage; members: string[]; name: (identity: string) => string }) {
  const read = members.flatMap((member) => (m.read?.[member] !== undefined ? [{ key: member, name: name(member), at: m.read[member] }] : []));
  const came = members.flatMap((member) => (m.read?.[member] === undefined && m.got?.[member] !== undefined ? [{ key: member, name: name(member), at: m.got[member] }] : []));
  const waiting = members.filter((member) => m.read?.[member] === undefined && m.got?.[member] === undefined).map((member) => ({ key: member, name: name(member) }));
  return <WhoRead read={read} came={came} waiting={waiting} note={t('Each member’s phone tells you, end-to-end encrypted. A member whose Erevos is older than these marks tells nothing, and stays under Not yet.')} />;
}

function Step({ sign, label, onPress }: { sign: string; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1 })}>
      <View>
        <Text style={{ fontSize: 16, color: colors.accentText }}>{sign}</Text>
      </View>
    </Pressable>
  );
}
