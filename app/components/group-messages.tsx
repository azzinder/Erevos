import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Platform, Pressable, ScrollView, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ask } from '../lib/alert';
import { bytesSource, takeOffRelay } from '../lib/attachments';
import { chatText, exportName } from '../lib/chat-export';
import { choose as chooseOption, editableWords, placeText, placeWords, pollWords, stillEditable, type Place, type Poll } from '../lib/chat-parts';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { canForward, forwardToGroup, handForward, type Forwardable } from '../lib/forward';
import { sendGroupFile } from '../lib/group-media';
import { asChatMessage, type Marked } from '../lib/group-parts';
import { memberName, type GroupInfo } from '../lib/groups';
import { t } from '../lib/i18n';
import { firstLink, fitPreview } from '../lib/link-preview';
import { CAN_PREVIEW, makePreview } from '../lib/make-preview';
import { messageLine } from '../lib/message-line';
import { searchMessages, type Findable } from '../lib/message-search';
import { keepAsSticker, stickerMeta } from '../lib/own-stickers';
import { CAN_PLACE, findPlace } from '../lib/place';
import { throughTor } from '../lib/relay';
import { saveText } from '../lib/save-file';
import { stickerOf } from '../lib/stickers';
import type { FileRef } from '../lock/attachment-files';
import type { GroupMessage, GroupParts } from '../lock/group-data';
import { openOwnSticker, type OwnSticker } from '../lock/sticker-data';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

import type { Answering, ComposerTile, DraftBox, Editing } from './composer';
import { useGroupsWhere } from './groups-at';
import { MessageMenu, type MenuAction } from './message-menu';
import { openPlace, PlaceCard, Pinned, PreviewCard, Quote, Reactions } from './message-parts';
import { PollCard, PollSheet } from './poll';
import { PLAYS_LAST, StickerPicker, StickerView } from './stickers';
import { Button, Input, Row, Sheet, Text, TextButton } from './ui';

// What a group's messages do beyond words and files (lib/group-parts.ts), in its thread
// (components/group-chat.tsx), as in a contact's chat: a message held down opens its menu (react, reply,
// forward, star, pin, copy, delete), and its bubble shows what it answers, a sticker, a place, a
// poll, a link's preview, its reactions, and that it was forwarded or is starred. The messages
// pinned show over the thread; a search goes through the group's messages. Under "+", and the
// message bar's sticker button: a sticker, built in or one of the space's made from photos (sent as
// a photo is); under "+" too, where you are, and a poll.
// Photos, files and voice messages themselves are components/group-media.tsx's.

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
  scroll: RefObject<ScrollView | null>;
  at?: string;
  draft?: DraftBox;
}) {
  const colors = useColors();
  const where = useGroupsWhere();
  const { at: groupsAt } = where;
  const [menuFor, setMenuFor] = useState<GroupMessage | null>(null);
  const [replying, setReplying] = useState<GroupMessage | null>(null);
  // The message of ours the bar gives new words, while it does.
  const [editing, setEditing] = useState<GroupMessage | null>(null);
  const [forwarding, setForwarding] = useState<GroupMessage | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [stickering, setStickering] = useState(false);
  const [polling, setPolling] = useState(false);
  const [placeFound, setPlaceFound] = useState<Place | null>(null);
  const [pinShown, setPinShown] = useState(0);
  const [previews, setPreviews] = useState(false);
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
  // The last few messages play their sticker as they show.
  const playing = new Set(messages.slice(-PLAYS_LAST).map((m) => m.tag));

  useEffect(() => {
    where.previews().then(setPreviews, () => setPreviews(false));
  }, [where]);

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
    if (!m.poll) return;
    void mark({ t: 'vote', tag: m.tag, chose: chooseOption(m.votes?.[''] ?? [], option, !!m.poll.m) });
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
    const here = () =>
      void groupsAt
        .groups()
        .then((groups) => groups.deleteHere(id, m.tag))
        .catch((error) => onNote(errorText(error)));
    const everyone = async () => {
      const gone = await mark({ t: 'erase', tag: m.tag });
      if (gone?.put) await takeOffRelay(await groupsAt.relay(), gone.put).catch(() => undefined);
    };
    ask(t('Delete message'), t('Delete this message? It cannot be brought back.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('This phone'), onPress: here },
      ...(!m.from && !out ? [{ text: t('Everyone'), style: 'destructive' as const, onPress: () => void everyone() }] : []),
    ]);
  }

  const forwardable = (m: GroupMessage): Forwardable => {
    const { text, file, ms, sticker, place, poll, preview } = m;
    return { text, file, ms, sticker, place, poll, preview };
  };

  // Asks where a message goes: to a contact's chat, or another group, of the space or the hidden place.
  async function startForward(m: GroupMessage) {
    setForwarding(m);
    setTargets([]);
    const [chats, groups] = await Promise.all([groupsAt.chats().catch(() => null), groupsAt.groups().catch(() => null)]);
    const contacts: Target[] = (chats?.e2e.contacts() ?? [])
      .filter((c) => !c.request)
      .map((c) => ({
        key: `contact:${c.identity}`,
        name: memberName(c.identity, [c]),
        go: async () => {
          handForward(`contact:${c.identity}`, forwardable(m));
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
          await forwardToGroup(g.id, forwardable(m), groupsAt);
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
    if (canForward(m)) actions.push({ title: t('Forward'), onPress: () => void startForward(m) });
    actions.push({ title: m.starred ? t('Unstar') : t('Star'), onPress: () => star(m) });
    if (!out) actions.push({ title: m.pinned ? t('Unpin') : t('Pin'), onPress: () => void mark({ t: 'pin', tag: m.tag, on: !m.pinned }) });
    if (CAN_COPY && m.text && !m.sticker && !m.place && !m.poll) actions.push({ title: t('Copy'), onPress: () => void copy(m) });
    if (canEdit(m)) actions.push({ title: t('Edit'), onPress: () => startEditing(m) });
    if (m.file?.sticker && !m.file.from) actions.push({ title: t('Add to my stickers'), onPress: () => void addToStickers(m.file!) });
    actions.push({ title: t('Delete'), danger: true, onPress: () => remove(m) });
    return actions;
  }

  // The preview of the first link in words typed, when this phone makes them (lib/make-preview.ts).
  async function previewOf(text: string): Promise<GroupParts> {
    const link = previews && CAN_PREVIEW && !throughTor() ? firstLink(text) : null;
    if (!link) return {};
    onNote(t('Making the link’s preview…'));
    const made = await makePreview(link);
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
    const carried = parts ?? { ...(replying ? { re: replying.tag } : {}), ...(await previewOf(text)) };
    await (await groupsAt.groups()).send(id, text, groupsAt.transport, carried);
    stays.current = false;
    if (!parts) setReplying(null);
  }

  function sendParts(text: string, parts: GroupParts) {
    send(text, parts).catch((error) => onNote(errorText(error)));
  }

  // Sends a sticker made from a photo: as a photo goes, marked as a sticker (lib/own-stickers.ts).
  async function sendOwnSticker(sticker: OwnSticker) {
    setStickering(false);
    try {
      const picture = await openOwnSticker(sticker);
      if (!picture) throw new Error(t('This sticker\'s picture is gone.'));
      onNote(t('Sending the sticker…'));
      await sendGroupFile(await groupsAt.groups(), id, await groupsAt.relay(), bytesSource(picture), stickerMeta(picture), undefined, groupsAt.transport);
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

  async function locate() {
    onNote(t('Finding where you are…'));
    try {
      const place = await findPlace();
      onNote('');
      setPlaceFound(place);
    } catch (error) {
      onNote(errorText(error));
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
    /** A sticker, a place or a poll, in place of the words; null for others. */
    body: (m: GroupMessage, ink: StyleProp<TextStyle>): ReactNode => {
      if (m.sticker) return <StickerView name={m.sticker} fallback={m.text} play={playing.has(m.tag)} tap onLongPress={() => setMenuFor(m)} />;
      if (m.place) return <PlaceCard place={m.place} ink={ink} />;
      if (m.poll) {
        const voters = Object.entries(m.votes ?? {}).map(([member, chose]) => ({ name: member ? name(member) : t('You'), chose }));
        return <PollCard poll={m.poll} voters={voters} mine={m.votes?.[''] ?? []} onChoose={out ? undefined : (option) => vote(m, option)} ink={ink} />;
      }
      return null;
    },
    /** A link's preview, under the words. */
    preview: (m: GroupMessage, ink: StyleProp<TextStyle>): ReactNode => (m.preview && !m.file ? <PreviewCard preview={m.preview} ink={ink} /> : null),
    /** What goes beside a message's time: that it was forwarded or edited, its star, and, on a linked device, that the phone could not send it. */
    caption: (m: GroupMessage): string => [m.forwarded ? t('Forwarded') : '', m.edited ? t('Edited') : '', m.starred ? '★' : '', m.unsent ? t('Not sent by the phone') : ''].filter(Boolean).join('  ·  '),
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
    /** The panel's tiles after the photos and files: a sticker, where you are, a poll. */
    attachMore: (afterPanel: (then: () => void) => void): ComposerTile[] => [
      { key: 'sticker', title: t('Sticker'), icon: 'sticker', onPress: () => afterPanel(() => setStickering(true)) },
      ...(CAN_PLACE ? [{ key: 'place', title: t('Location'), icon: 'place' as const, onPress: () => afterPanel(() => void locate()) }] : []),
      { key: 'poll', title: t('Poll'), icon: 'poll', onPress: () => afterPanel(() => setPolling(true)) },
    ],
    sheets: (
      <>
        <MessageMenu
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
                {lineOf(forwarding)}
              </Text>
              {targets.map((target) => (
                <TextButton
                  key={target.key}
                  title={target.name}
                  onPress={() => {
                    setForwarding(null);
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
        <Sheet visible={!!placeFound} onClose={() => setPlaceFound(null)} title={t('Send where you are?')}>
          {placeFound ? (
            <>
              <Text selectable>{placeText(placeFound)}</Text>
              {placeFound.acc !== undefined ? (
                <Text variant="caption" tone="muted">
                  {t('Within about {m} m', { m: placeFound.acc })}
                </Text>
              ) : null}
              <Text variant="caption" tone="muted">
                {t('Everyone in {name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.', { name: info?.name ?? '' })}
              </Text>
              <Row wrap>
                <Button
                  title={t('Send')}
                  compact
                  onPress={() => {
                    setPlaceFound(null);
                    sendParts(placeWords(placeFound), { place: placeFound });
                  }}
                />
                <TextButton title={t('Open in maps')} onPress={() => openPlace(placeFound)} />
                <TextButton title={t('Cancel')} onPress={() => setPlaceFound(null)} />
              </Row>
            </>
          ) : null}
        </Sheet>
      </>
    ),
  };
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
