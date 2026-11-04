// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { canTor } from '../lib/core';
import { t } from '../lib/i18n';
import { rowTime } from '../lib/inbox';
import { npubOf, shortMentions, shortNpub } from '../lib/nostr-dm';
import { nostrChatsThroughTor } from '../lib/nostr-dm-net';
import { nostrDmFeed, nostrDmFeedDone, nostrDmNow, nostrDmStart } from '../lib/nostr-dm-store';
import { morePosts, type FeedPost } from '../lib/nostr-feed';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

import { KeyFace } from './key-face';
import { Button, Chip, Row, Sheet, Text, TextButton } from './ui';

// The Nostr tab of home (app/index.tsx) in two parts, as Amethyst or Telegram have them: **Posts**,
// the public posts of the people the space's Nostr key follows and those they shared again, newest
// first, thirty at a time, more as the list comes to its end, the newest again when it is pulled
// down; and **Chats**, its chats with other Nostr apps, one tap away, with how many are not read.
// Read only: nothing is posted, answered or reacted to from here. They are looked up only while the
// posts show (lib/nostr-dm-store.ts nostrDmFeed), as the space's Tor way says, and held here only
// while they show, never kept; nothing is fetched for a post, so a picture or a link is its
// address, as written. Tapping who wrote one offers their public posts (app/nostr-posts.tsx) and a
// chat with them (app/nostr-chat.tsx). Always the space's own key: home never shows a hidden place's.

export type NostrPart = 'posts' | 'chats';

/** Whether a row of home's list is a post of the feed. */
export const isFeedPost = (item: object): item is FeedPost => 'note' in item && 'by' in item;

/** The two parts of the Nostr tab, as chips under home's: the posts first, then the chats. */
export function NostrParts({ part, onChange, unread }: { part: NostrPart; onChange: (part: NostrPart) => void; unread: number }) {
  return (
    <Row>
      <Chip label={t('Posts')} selected={part === 'posts'} onPress={() => onChange('posts')} />
      <Chip label={t('Chats')} selected={part === 'chats'} count={unread} onPress={() => onChange('chats')} />
    </Row>
  );
}

// Longer posts show this many characters until Show all.
const LONG = 700;

type Feed = { posts: FeedPost[]; until?: number; older: boolean };
const NO_FEED: Feed = { posts: [], older: false };

/** What the space's Nostr account is: still loading, without a key, or with one. */
export type NostrAccount = 'loading' | 'none' | 'ready';

/**
 * The feed of the Nostr tab, for home's list to show while `shown`: its posts and how each shows,
 * the words above them, what shows with none or under them, pulling down for the newest
 * (`refreshControl`), coming to the end for older ones (`more`), and the sheet of someone
 * tapped. What it found goes as soon as it is no longer shown.
 */
export function useNostrFeed(account: NostrAccount, shown: boolean) {
  const colors = useColors();
  const [feed, setFeed] = useState<Feed>(NO_FEED);
  const [names, setNames] = useState<Record<string, string>>({});
  const [looking, setLooking] = useState<'newest' | 'older' | null>(null);
  const [looked, setLooked] = useState(false);
  const [follows, setFollows] = useState<number | null>(null);
  const [said, setSaid] = useState('');
  const [person, setPerson] = useState<string | null>(null);
  const [personSaid, setPersonSaid] = useState('');
  const current = useRef(feed);
  current.current = feed;
  // Which showing a look-up is for, and whether one is going.
  const showing = useRef(0);
  const busy = useRef(false);
  const on = shown && account === 'ready';
  const me = nostrDmNow().state?.public ?? '';

  async function look(older: boolean) {
    if (busy.current) return;
    const before = older ? current.current : NO_FEED;
    if (older && (!before.older || before.until === undefined)) return;
    busy.current = true;
    const at = showing.current;
    setLooking(older ? 'older' : 'newest');
    setSaid('');
    try {
      const page = await nostrDmFeed(older ? before.until : undefined, before.posts);
      if (at !== showing.current) return;
      setFollows(page.follows);
      setNames((known) => ({ ...(older ? known : {}), ...page.names }));
      setFeed({ posts: morePosts(before.posts, page.posts), until: page.until, older: page.older });
      if (!page.answered) setSaid(t('No relay answered. Try again in a while.'));
    } catch (error) {
      if (at === showing.current) setSaid(error instanceof Error ? error.message : String(error));
    } finally {
      if (at === showing.current) {
        busy.current = false;
        setLooking(null);
        setLooked(true);
      }
    }
  }

  useEffect(() => {
    if (!on) return;
    void look(false);
    return () => {
      // Nothing of it stays once it is not shown.
      showing.current += 1;
      busy.current = false;
      setFeed(NO_FEED);
      setNames({});
      setLooking(null);
      setLooked(false);
      setFollows(null);
      setSaid('');
      setPerson(null);
      nostrDmFeedDone();
    };
  }, [on, me]);

  const nameOf = (key: string) => names[key] || shortNpub(npubOf(key));
  const now = Date.now();
  const lookAgain = <Button title={t('Look again')} kind="secondary" compact onPress={() => void look(false)} />;

  const intro = (
    <View style={styles.intro}>
      <Text variant="caption" tone="muted">
        {t('The public posts of the people you follow, newest first. Read only, and not kept.')}
      </Text>
      {canTor() ? (
        <Text variant="caption" tone="faint">
          {nostrChatsThroughTor()
            ? t('Through Tor: the Nostr relays do not see your address.')
            : t('Not through Tor now: the Nostr relays see your address. Tor is under Settings → Relay and networks → Tor.')}
        </Text>
      ) : null}
      {/* No pulling down in a browser. */}
      {Platform.OS === 'web' && looked && !looking && feed.posts.length ? <Row>{lookAgain}</Row> : null}
    </View>
  );

  const empty =
    account === 'loading' ? null : account === 'none' ? (
      <View style={styles.empty}>
        <Text tone="muted">{t('This space has no Nostr key yet. Make one, or bring the one of your other Nostr app, under Nostr chats.')}</Text>
        <Row>
          <Button title={t('Nostr chats')} kind="secondary" compact onPress={() => router.push('/nostr-chats')} />
        </Row>
      </View>
    ) : looking || !looked ? (
      <Text tone="muted" style={styles.empty}>
        {t('Looking…')}
      </Text>
    ) : (
      <View style={styles.empty}>
        <Text tone="muted">
          {said ||
            (follows === 0
              ? t('Your Nostr key follows no one yet. Follow people with it in another Nostr app, such as Amethyst or Primal, and their posts show here.')
              : t('No public posts were found.'))}
        </Text>
        <Row>{lookAgain}</Row>
      </View>
    );

  const footer = feed.posts.length ? (
    <View style={styles.footer}>
      {looking === 'older' ? <Text tone="muted">{t('Looking…')}</Text> : null}
      {said && !looking ? <Text tone="muted">{said}</Text> : null}
      {feed.older && !looking ? (
        <Row>
          <Button title={t('Older posts')} kind="secondary" compact onPress={() => void look(true)} />
        </Row>
      ) : null}
    </View>
  ) : null;

  async function write(key: string) {
    setPersonSaid('');
    try {
      const chat = nostrDmNow().state?.chats[key] ? key : await nostrDmStart(npubOf(key));
      setPerson(null);
      router.push({ pathname: '/nostr-chat', params: { key: chat } });
    } catch (error) {
      setPersonSaid(error instanceof Error ? error.message : String(error));
    }
  }

  const named = person ? names[person] : undefined;
  const sheet = (
    <Sheet visible={person !== null} onClose={() => setPerson(null)} title={person ? nameOf(person) : undefined}>
      {person ? (
        <>
          <Text selectable variant="mono" tone="faint">
            {npubOf(person)}
          </Text>
          <Button
            title={t('Public posts')}
            kind="secondary"
            onPress={() => {
              setPerson(null);
              router.push({ pathname: '/nostr-posts', params: { key: person, ...(named ? { name: named } : {}) } });
            }}
          />
          {person !== me ? <Button title={t('Write to them')} onPress={() => void write(person)} /> : null}
          {personSaid ? <Text tone="muted">{personSaid}</Text> : null}
        </>
      ) : null}
    </Sheet>
  );

  const open = (key: string) => {
    setPersonSaid('');
    setPerson(key);
  };

  const refreshing = on && looking === 'newest' && feed.posts.length > 0;
  return {
    posts: feed.posts,
    render: (post: FeedPost): ReactElement => <FeedRow post={post} nameOf={nameOf} named={(key) => !!names[key]} now={now} onPerson={open} borderColor={colors.border} />,
    intro,
    empty,
    footer,
    sheet,
    // Pulled down, the posts show the newest again. For the list always, on only while they show:
    // Android puts a list that has one in a view of its own, which would draw the list anew. Not
    // in a browser, which has no pulling down, and where it would keep the list from scrolling.
    refreshControl:
      Platform.OS === 'web' ? undefined : (
        <RefreshControl
          enabled={on}
          refreshing={refreshing}
          onRefresh={() => {
            if (on) void look(false);
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      ),
    // Coming to the end of the list, the older ones.
    more: () => {
      if (on && feed.posts.length && !looking) void look(true);
    },
    // For the list to draw its rows again when a name or the feed changes.
    extra: { feed, names },
  };
}

function FeedRow({ post, nameOf, named, now, onPerson, borderColor }: {
  post: FeedPost;
  nameOf: (key: string) => string;
  named: (key: string) => boolean;
  now: number;
  onPerson: (key: string) => void;
  borderColor: string;
}) {
  // A post with a content warning keeps its words covered until asked for; a long one shows its start.
  const [open, setOpen] = useState(post.warning === undefined);
  const [whole, setWhole] = useState(false);
  const author = post.sharedFrom ?? post.by;
  const name = nameOf(author);
  const long = post.text.length > LONG;
  const text = shortMentions(long && !whole ? `${post.text.slice(0, LONG)}…` : post.text);
  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      {post.sharedFrom ? (
        <Pressable onPress={() => onPerson(post.by)} accessibilityRole="button" hitSlop={4}>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {t('Shared by {name}', { name: nameOf(post.by) })}
          </Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => onPerson(author)} accessibilityRole="button" accessibilityLabel={name} style={({ pressed }) => [styles.author, pressed && { opacity: 0.6 }]}>
        <KeyFace identity={author} name={named(author) ? name : undefined} size={36} />
        <View style={styles.who}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          {/* Anyone can take any name: the key tells two of the same name apart. */}
          {named(author) ? (
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {shortNpub(npubOf(author))}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" tone="faint">
          {rowTime(post.at, now)}
        </Text>
      </Pressable>
      {post.answer ? (
        <Text variant="caption" tone="muted">
          {t('An answer to another post')}
        </Text>
      ) : null}
      {open ? (
        <>
          <Text selectable>{text}</Text>
          {long && !whole ? <TextButton title={t('Show all')} onPress={() => setWhole(true)} /> : null}
        </>
      ) : (
        <>
          <Text tone="muted">{post.warning ? t('Content warning: {reason}', { reason: post.warning }) : t('Content warning')}</Text>
          <Row>
            <Button title={t('Show')} kind="secondary" compact onPress={() => setOpen(true)} />
          </Row>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: 2,
  },
  empty: {
    gap: space.md,
    paddingTop: space.xl,
  },
  footer: {
    gap: space.sm,
    paddingTop: space.lg,
  },
  row: {
    gap: space.xs + 2,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  who: {
    flex: 1,
    gap: 1,
  },
});
