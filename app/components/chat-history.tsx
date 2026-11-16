// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Platform } from 'react-native';

import { choose } from '../lib/alert';
import { chatText, exportName } from '../lib/chat-export';
import { drawnTo, firstOfDay, historyDays, historyMedia, historyWritten, joined, searchHistory, type HistoryMessage } from '../lib/chat-history';
import { t } from '../lib/i18n';
import { saveText } from '../lib/save-file';
import { space } from '../theme/colors';
import { ChatMedia, DayCalendar } from './chat-media';
import { SearchStep } from './chat-thread-lines';
import { Button, Input, Row, Text, TextButton } from './ui';

// Search in this chat, Media, links and files, Go to a day and Export chat, for a chat on Matrix,
// XMPP, Nostr or SMS, as an Erevos chat has them (app/chat.tsx), over the messages the phone keeps
// of it (lib/chat-history.ts). The search bar shows over the thread, and steps through what it
// found, the latest first; each is gone to in the thread, and one the thread does not draw yet
// (an older SMS) is drawn first. Where the chat can fetch older messages from its server (Matrix),
// the search offers to, as the top of the thread does. The media list and the calendar are an Erevos chat's own
// (components/chat-media.tsx). The export writes the chat out as an Erevos chat's, after the same
// warning; a hidden place's chat is not written out, as a file outside Erevos would show it is
// there. Nothing of the search leaves the phone.

type Tool = 'search' | 'media' | 'day';

/** Which of the chat's tools is open, and the export, as ChatHistory makes it. */
export type HistoryTools = { tool: Tool | null; open: (tool: Tool | null) => void; exportNow: MutableRefObject<(() => void) | null> };

/** The chat's tools, held by the screen (before anything it draws), opened by HistoryButtons or historyRows, drawn by ChatHistory. */
export function useHistoryTools(): HistoryTools {
  const [tool, open] = useState<Tool | null>(null);
  const exportNow = useRef<(() => void) | null>(null);
  return { tool, open, exportNow };
}

/** The four, as a menu's rows (an SMS conversation's ⋮): Export only where the chat may be written out. */
export function historyRows(tools: HistoryTools, exportable: boolean): { label: string; run: () => void }[] {
  return [
    { label: t('Search in this chat'), run: () => tools.open('search') },
    { label: t('Media, links and files'), run: () => tools.open('media') },
    { label: t('Go to a day'), run: () => tools.open('day') },
    ...(exportable ? [{ label: t('Export chat'), run: () => tools.exportNow.current?.() }] : []),
  ];
}

/** The four, as buttons, among a chat's own under its thread. */
export function HistoryButtons({ tools, exportable, onRun }: { tools: HistoryTools; exportable: boolean; /** Called first: a sheet they show in closes, so the tool is not under it. */ onRun?: () => void }) {
  return (
    <Row wrap>
      {historyRows(tools, exportable).map((row) => (
        <Button
          key={row.label}
          title={row.label}
          kind="secondary"
          compact
          onPress={() => {
            onRun?.();
            row.run();
          }}
        />
      ))}
    </Row>
  );
}

// How often, and how many times, a message the thread is drawing is looked for, to go to it.
const STEP_MS = 150;
const TRIES = 30;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

export function ChatHistory({ tools, name, messages, kept, goTo, drawMore, earlier, exportable, shown = true, say }: {
  tools: HistoryTools;
  /** The chat's name: the export's, and the media list's. */
  name: string;
  /** The messages the thread shows, the oldest first (lib/chat-history-adapters.ts): read only while a tool is open. */
  messages: () => HistoryMessage[];
  /** Every message the phone keeps of the chat, where the thread draws only the latest (an SMS
   *  conversation's): read as a tool opens, and for the export. */
  kept?: () => Promise<HistoryMessage[]>;
  /** Goes to a message of the thread, by its id: false when the thread does not draw it (yet). */
  goTo: (id: string) => boolean;
  /** Draws at least the latest `count` messages, to show one further back. */
  drawMore?: (count: number) => void;
  /** Fetches older messages from the chat's server, while it has more. */
  earlier?: () => Promise<unknown>;
  /** Whether the chat may be written out: not a hidden place's. */
  exportable: boolean;
  /** Whether the chat is on the screen: the lists show over it only then. */
  shown?: boolean;
  /** Says how the export went, where the chat says such things. */
  say: (text: string) => void;
}) {
  const { tool, open } = tools;
  const [searching, setSearching] = useState('');
  const [searchAt, setSearchAt] = useState(0);
  // What the phone keeps besides what the thread shows, read as a tool opened.
  const [all, setAll] = useState<HistoryMessage[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const now = useRef({ messages, kept, goTo });
  now.current = { messages, kept, goTo };

  const opened = tool !== null;
  useEffect(() => {
    if (!opened || !now.current.kept) return;
    let here = true;
    now.current.kept().then(
      (list) => here && setAll(list),
      () => undefined,
    );
    return () => {
      here = false;
    };
  }, [opened]);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const list = opened ? joined(messages(), all) : [];

  // Goes to a message: at once when the thread draws it, else once it drew it, after drawing back to it.
  function reach(id: string, at: number) {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (now.current.goTo(id)) return;
    drawMore?.(drawnTo(list, at));
    let tries = 0;
    timer.current = setInterval(() => {
      if (now.current.goTo(id) || ++tries >= TRIES) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
      }
    }, STEP_MS);
  }

  const hits = tool === 'search' && searching.trim() ? searchHistory(list, searching) : [];
  // Goes to what the search found, the `n`th from the latest.
  const goToHit = (n: number) => {
    const hit = hits[n];
    if (!hit) return;
    setSearchAt(n);
    reach(hit.tag, hit.at);
  };
  const closeSearch = () => {
    open(null);
    setSearching('');
    setSearchAt(0);
  };

  // Writes the chat out as text where the owner picks (lib/chat-export.ts), once they say so.
  async function exportChat() {
    if (!exportable) return;
    const asked = t('Its messages are written to a text file, with their times and who wrote them, saved where you choose. The file is not encrypted: anyone who has it, or any app that reads where it is, can read the chat. Photos, files and voice messages are only named, and messages that disappear are left out.');
    if (!(await choose(t('Export this chat?'), asked, t('Cancel'), t('Export')))) return;
    const at = Date.now();
    try {
      const { messages: shownNow, kept: keptNow } = now.current;
      const written = historyWritten(joined(shownNow(), keptNow ? await keptNow() : null));
      const where = await saveText(exportName(name, at), chatText(written, name, at));
      if (where) say(t('Saved in {where}. There it is outside Erevos, not sealed.', { where }));
    } catch (error) {
      say(t('Not saved. {error}', { error: errorText(error) }));
    }
  }
  tools.exportNow.current = () => void exportChat();

  return (
    <>
      {tool === 'search' ? (
        <Row style={{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: space.lg, paddingVertical: space.xs, gap: space.xs }}>
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
          <SearchStep sign="▲" label={t('Earlier')} onPress={() => goToHit(Math.min(hits.length - 1, searchAt + 1))} />
          <SearchStep sign="▼" label={t('Later')} onPress={() => goToHit(Math.max(0, searchAt - 1))} />
          <SearchStep sign="✕" label={t('Close')} onPress={closeSearch} />
        </Row>
      ) : null}
      {tool === 'search' && earlier && searching.trim() ? (
        <Row style={{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: space.lg, paddingBottom: space.xs }}>
          <TextButton
            title={fetching ? t('Fetching…') : t('Load earlier messages')}
            onPress={() => {
              if (fetching) return;
              setFetching(true);
              void earlier().finally(() => setFetching(false));
            }}
          />
        </Row>
      ) : null}
      <ChatMedia visible={tool === 'media' && shown} items={tool === 'media' ? historyMedia(list) : []} name={name} onClose={() => open(null)} onShow={(item) => reach(item.tag, item.at)} />
      <DayCalendar
        visible={tool === 'day' && shown}
        days={tool === 'day' ? historyDays(list) : new Set<string>()}
        start={list[list.length - 1]?.at ?? Date.now()}
        onPick={(day) => {
          open(null);
          const first = firstOfDay(list, day);
          if (first) setTimeout(() => reach(first.id, first.at), Platform.OS === 'web' ? 0 : 300);
        }}
        onClose={() => open(null)}
      />
    </>
  );
}
