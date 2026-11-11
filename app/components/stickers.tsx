// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, ScrollView, Text as RNText, View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { stickerPhoto } from '../lib/own-stickers';
import { photoUri, releaseUri } from '../lib/photo-uri';
import { pickSticker } from '../lib/pick-avatar';
import { ART, type Corners, type Shape } from '../lib/sticker-art';
import { MOTIONS, motionFor, type Move } from '../lib/sticker-motion';
import { SETS, stickerOf, stickersIn, wordsSize, type StickerSet } from '../lib/stickers';
import { addOwnSticker, loadOwnStickers, MAX_OWN_STICKERS, openOwnSticker, removeOwnSticker, type OwnSticker, type StickerPlace } from '../lock/sticker-data';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

import { SwipeTabs } from './swipe-tabs';
import { Button, Chip, font, Row, Text } from './ui';

// The stickers: the built-in ones (lib/stickers.ts), drawn here from their shapes on a grid of 100
// by 100 (lib/sticker-art.ts) scaled to the size asked, and those made from photos
// (lib/own-stickers.ts). One this Erevos does not have shows the emoji that came with it.
//
// A built-in sticker that moves (lib/sticker-motion.ts) plays once for a few seconds when it is
// asked to as it shows (the thread's last few, one that comes, the picker's), and again when it is
// tapped; then it rests, still, and nothing runs. With the phone's reduce motion setting on it
// never moves. Only its parts' turn, shift, size and fading move, which the phone draws itself.

/** How large a sticker shows in a thread. */
export const STICKER_SIZE = 128;

/** How many of a thread's last messages play their sticker as they show: about a screenful. */
export const PLAYS_LAST = 8;

// Whether the phone asks for less motion: null until it said, and then whenever it changes.
let reduceMotion: boolean | null = null;
const watchers = new Set<() => void>();
let watching = false;

function setReduceMotion(on: boolean) {
  reduceMotion = on;
  for (const watcher of watchers) watcher();
}

function watchReduceMotion(watcher: () => void): () => void {
  watchers.add(watcher);
  if (!watching) {
    watching = true;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion, () => setReduceMotion(true));
    AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
  }
  return () => watchers.delete(watcher);
}

/** Whether the phone's reduce motion setting is on; null until it is known. */
export function useReduceMotion(): boolean | null {
  return useSyncExternalStore(watchReduceMotion, () => reduceMotion, () => null);
}

// Turned, grown or shifted on the web the phone's way; the native driver is the phone's.
const NATIVE = Platform.OS !== 'web';
// Each step of a move eases in and out.
const EASE = Easing.inOut(Easing.sin);

type Layer = (part: string, nodes: ReactNode[]) => ReactNode;

const full = (k: number): ViewStyle => ({ position: 'absolute', left: 0, top: 0, width: 100 * k, height: 100 * k });

// What turns a layer about a point of the grid: there and back around what it does.
const about = (k: number, [x, y]: [number, number], turns: object[]) => [
  { translateX: (x - 50) * k },
  { translateY: (y - 50) * k },
  ...turns,
  { translateX: -(x - 50) * k },
  { translateY: -(y - 50) * k },
];

/** How a move shows as `progress` goes from 0 to 1: its part's shift, turn, size and fading. */
function moveStyle(move: Move, progress: Animated.Value, k: number) {
  const along = <T extends number | string>(values: T[]) =>
    progress.interpolate({ inputRange: move.at, outputRange: values as number[] | string[], easing: move.ease === 'linear' ? Easing.linear : EASE });
  const shifts = [
    ...(move.x ? [{ translateX: along(move.x.map((x) => x * k)) }] : []),
    ...(move.y ? [{ translateY: along(move.y.map((y) => y * k)) }] : []),
  ];
  const turns = [
    ...(move.turn ? [{ rotate: along(move.turn.map((turn) => `${turn}deg`)) }] : []),
    ...(move.scale ? [{ scale: along(move.scale) }] : []),
    ...(move.sx ? [{ scaleX: along(move.sx) }] : []),
    ...(move.sy ? [{ scaleY: along(move.sy) }] : []),
  ];
  return {
    transform: [...shifts, ...(turns.length > 0 ? about(k, move.about ?? [50, 50], turns) : [])],
    ...(move.opacity ? { opacity: along(move.opacity) } : {}),
  } as unknown as Animated.WithAnimatedObject<ViewStyle>;
}

const corners = (r: Corners, k: number): ViewStyle =>
  typeof r === 'number'
    ? { borderRadius: r * k }
    : { borderTopLeftRadius: r[0] * k, borderTopRightRadius: r[1] * k, borderBottomRightRadius: r[2] * k, borderBottomLeftRadius: r[3] * k };

/** A sticker's shapes as views, `k` points to a step of the grid. `words` are a Words sticker's, `layer` wraps its parts. */
function drawn(shapes: Shape[], k: number, words: string, layer: Layer, prefix = ''): ReactNode[] {
  return shapes.map((shape, i) => {
    const key = `${prefix}${i}`;
    switch (shape.s) {
      case 'dot': {
        const { x, y, d, c } = shape;
        return <View key={key} style={{ position: 'absolute', left: (x - d / 2) * k, top: (y - d / 2) * k, width: d * k, height: d * k, borderRadius: (d * k) / 2, backgroundColor: c }} />;
      }
      case 'oval': {
        // A disc as wide as the oval, pressed to its height.
        const { x, y, w, h, c, turn = 0 } = shape;
        return (
          <View
            key={key}
            style={{ position: 'absolute', left: (x - w / 2) * k, top: (y - w / 2) * k, width: w * k, height: w * k, borderRadius: (w * k) / 2, backgroundColor: c, transform: [{ rotate: `${turn}deg` }, { scaleY: h / w }] }}
          />
        );
      }
      case 'ring': {
        // Pressed to its height and turned as an oval is, its edge with it.
        const { x, y, d, w, c, h = d, turn = 0 } = shape;
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: (x - d / 2) * k,
              top: (y - d / 2) * k,
              width: d * k,
              height: d * k,
              borderRadius: (d * k) / 2,
              borderWidth: w * k,
              borderColor: c,
              ...(h !== d || turn ? { transform: [{ rotate: `${turn}deg` }, { scaleY: h / d }] } : {}),
            }}
          />
        );
      }
      case 'arc': {
        const { x, y, d, w, side, c } = shape;
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: (x - d / 2) * k,
              top: (y - d / 2) * k,
              width: d * k,
              height: d * k,
              borderRadius: (d * k) / 2,
              borderWidth: w * k,
              borderColor: 'transparent',
              ...{ top: { borderTopColor: c }, bottom: { borderBottomColor: c }, left: { borderLeftColor: c }, right: { borderRightColor: c } }[side],
            }}
          />
        );
      }
      case 'tri': {
        // A box of no size whose bottom border is the triangle, its sides clear.
        const { x, y, w, h, c, turn = 0 } = shape;
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: (x - w / 2) * k,
              top: (y - h / 2) * k,
              width: 0,
              height: 0,
              borderLeftWidth: (w / 2) * k,
              borderRightWidth: (w / 2) * k,
              borderBottomWidth: h * k,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: c,
              transform: [{ rotate: `${turn}deg` }],
            }}
          />
        );
      }
      case 'heart': {
        // A square turned on its corner, with two discs.
        const { x, y, size, c } = shape;
        const a = size / 1.5;
        return (
          <View key={key} style={{ position: 'absolute', left: (x - 0.75 * a) * k, top: (y - 0.65 * a) * k, width: 1.5 * a * k, height: 1.5 * a * k, transform: [{ rotate: '45deg' }] }}>
            <View style={{ position: 'absolute', left: 0.5 * a * k, top: 0.5 * a * k, width: a * k, height: a * k, backgroundColor: c }} />
            <View style={{ position: 'absolute', left: 0, top: 0.5 * a * k, width: a * k, height: a * k, borderRadius: (a * k) / 2, backgroundColor: c }} />
            <View style={{ position: 'absolute', left: 0.5 * a * k, top: 0, width: a * k, height: a * k, borderRadius: (a * k) / 2, backgroundColor: c }} />
          </View>
        );
      }
      case 'box': {
        const { x, y, w, h, c, r = 0, turn = 0, edge, inside } = shape;
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: x * k,
              top: y * k,
              width: w * k,
              height: h * k,
              backgroundColor: c,
              ...corners(r, k),
              ...(edge ? { borderWidth: edge.w * k, borderColor: edge.c } : {}),
              ...(turn ? { transform: [{ rotate: `${turn}deg` }] } : {}),
              ...(inside ? { overflow: 'hidden' as const } : {}),
            }}
          >
            {inside ? drawn(inside, k, words, layer, `${key}.`) : null}
          </View>
        );
      }
      case 'bar': {
        // A rounded box as long as the stroke and its round ends, turned along it.
        const { x1, y1, x2, y2, w, c } = shape;
        const length = Math.hypot(x2 - x1, y2 - y1) + w;
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: ((x1 + x2) / 2 - length / 2) * k,
              top: ((y1 + y2) / 2 - w / 2) * k,
              width: length * k,
              height: w * k,
              borderRadius: (w * k) / 2,
              backgroundColor: c,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      }
      case 'words': {
        const { x, y, w, h, c } = shape;
        const size = wordsSize(words);
        return (
          <View key={key} style={{ position: 'absolute', left: x * k, top: y * k, width: w * k, height: h * k, alignItems: 'center', justifyContent: 'center' }}>
            <RNText
              numberOfLines={2}
              adjustsFontSizeToFit
              allowFontScaling={false}
              style={[{ color: c, fontSize: size * k, lineHeight: size * 1.15 * k, textAlign: 'center' }, font('800')]}
            >
              {words}
            </RNText>
          </View>
        );
      }
      case 'svg': {
        // A drawing of curves, its viewBox stretched over the box.
        const { x, y, w, h, xml } = shape;
        return (
          <View key={key} style={{ position: 'absolute', left: x * k, top: y * k, width: w * k, height: h * k }}>
            <SvgXml xml={xml} width={w * k} height={h * k} />
          </View>
        );
      }
      case 'tilt':
        return (
          <View key={key} style={[full(k), { transform: about(k, shape.about, [{ rotate: `${shape.turn}deg` }]) as ViewStyle['transform'] }]}>
            {drawn(shape.shapes, k, words, layer, `${key}.`)}
          </View>
        );
      case 'part':
        return <Fragment key={key}>{layer(shape.name, drawn(shape.shapes, k, words, layer, `${key}.`))}</Fragment>;
    }
  });
}

/**
 * A sticker by its name, `size` across; one this Erevos does not have shows `fallback`, the emoji
 * that came with it. With `play` it moves once as it shows; with `tap`, again when tapped, and
 * `onLongPress` is what holding it does.
 */
export function StickerView({ name, size = STICKER_SIZE, fallback = '', play = false, tap = false, onLongPress }: {
  name: string;
  size?: number;
  fallback?: string;
  play?: boolean;
  tap?: boolean;
  onLongPress?: () => void;
}) {
  const colors = useColors();
  const sticker = stickerOf(name);
  const shapes = ART[name];
  const reduce = useReduceMotion();
  const motion = motionFor(name, reduce);
  const progress = useRef(new Animated.Value(0)).current;
  const k = size / 100;
  // Each moving part's layers, one for each of its moves, made once for its size.
  const styles = useMemo(() => {
    const byPart = new Map<string, ReturnType<typeof moveStyle>[]>();
    for (const move of MOTIONS[name]?.moves ?? []) byPart.set(move.part, [...(byPart.get(move.part) ?? []), moveStyle(move, progress, k)]);
    return byPart;
  }, [name, k]);

  function run() {
    if (!motion) return;
    progress.stopAnimation();
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: motion.ms, easing: Easing.linear, useNativeDriver: NATIVE }).start(() => progress.setValue(0));
  }

  // Plays once motion is known to be allowed; stops, still, once it is not.
  useEffect(() => {
    if (motion && play) run();
    if (!motion) {
      progress.stopAnimation();
      progress.setValue(0);
    }
  }, [!!motion]);
  useEffect(() => () => progress.stopAnimation(), []);

  if (!sticker || !shapes) {
    return (
      <View
        accessibilityLabel={t('Sticker')}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: size / 6, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
      >
        <Text style={{ fontSize: size / 2.6, lineHeight: size / 2 }}>{fallback || '?'}</Text>
      </View>
    );
  }
  // A part's shapes inside a layer for each of its moves, one in another.
  const layer: Layer = (part, nodes) =>
    (styles.get(part) ?? []).reduceRight<ReactNode>(
      (inside, style, i) => (
        <Animated.View key={`${part}${i}`} pointerEvents="none" style={[full(k), style]}>
          {inside}
        </Animated.View>
      ),
      <Fragment key={part}>{nodes}</Fragment>,
    );
  const label = t(sticker.label);
  const body = (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size }}>
      {layer('all', drawn(shapes, k, label, layer))}
    </View>
  );
  if (!tap) return body;
  return (
    <Pressable onPress={run} onLongPress={onLongPress} accessibilityHint={t('Hold for more')}>
      {body}
    </Pressable>
  );
}

/** A sticker made from a photo: its picture (`uri`, once it is read) or, until then, `status`. */
export function PhotoSticker({ uri, size = STICKER_SIZE, status }: { uri?: string; size?: number; status?: string | null }) {
  const colors = useColors();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 8 }} resizeMode="contain" accessibilityLabel={t('Sticker')} />;
  return (
    <View
      accessibilityLabel={t('Sticker')}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', padding: space.sm, borderRadius: size / 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
    >
      <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {status ?? t('Sticker')}
      </Text>
    </View>
  );
}

// The pictures of a place's own stickers, read into memory while the picker shows them, by id.
function useOwnPictures(stickers: OwnSticker[]): Record<string, string> {
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const held = useRef(pictures);
  held.current = pictures;
  const ids = stickers.map((sticker) => sticker.id).join(',');
  useEffect(() => {
    let active = true;
    for (const sticker of stickers) {
      if (held.current[sticker.id]) continue;
      openOwnSticker(sticker)
        .then((bytes) => {
          if (!bytes || !active) return;
          const uri = photoUri(bytes, stickerMime(bytes));
          setPictures((now) => ({ ...now, [sticker.id]: uri }));
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [ids]);
  useEffect(
    () => () => {
      for (const uri of Object.values(held.current)) releaseUri(uri);
    },
    [],
  );
  return pictures;
}

const stickerMime = (bytes: Uint8Array) => (bytes[0] === 0x89 ? 'image/png' : 'image/jpeg');

type Tab = StickerSet | 'mine';

// The set the picker showed last in each place, while the app is open: what hidden chats' picker
// showed never shows outside them.
const lastTabs = new Map<string, Tab>();

/**
 * Every sticker, to pick one, in its sets: tapped, a built-in one is `onPick`ed. With `mine`, the
 * stickers made from photos in `mine.place`, in their own set: one tapped is `mine.onPick`ed, one
 * held is deleted, and a new one is made from a photo. With `ownTab` instead, a chat on another
 * network (components/matrix-stickers.tsx and its kin) shows its own Mine, `ownTab.view`, in that
 * set, beside the built-in ones.
 */
export function StickerPicker({ onPick, mine, ownTab }: {
  onPick: (name: string) => void;
  mine?: { place: StickerPlace; onPick: (sticker: OwnSticker) => void };
  ownTab?: { place: StickerPlace | null; view: ReactNode };
}) {
  const colors = useColors();
  const place = mine?.place ?? null;
  const at = place ?? ownTab?.place ?? null;
  const where = at ? `${at.holder}/${at.space}` : '';
  const hasMine = !!mine || !!ownTab;
  const [tab, setTab] = useState<Tab>(() => {
    const last = lastTabs.get(where);
    return last && (last !== 'mine' || hasMine) ? last : 'moons';
  });
  const [own, setOwn] = useState<OwnSticker[]>([]);
  const [note, setNote] = useState('');
  const [making, setMaking] = useState(false);
  const pictures = useOwnPictures(tab === 'mine' ? own : []);

  const choose = (next: Tab) => {
    lastTabs.set(where, next);
    setTab(next);
    setNote('');
  };

  useEffect(() => {
    if (!place) return;
    let active = true;
    loadOwnStickers(place).then(
      (list) => active && setOwn(list),
      () => active && setOwn([]),
    );
    return () => {
      active = false;
    };
  }, [place?.holder, place?.space, place?.key]);

  async function make() {
    if (!place || making) return;
    if (own.length >= MAX_OWN_STICKERS) {
      setNote(t('You have {n} stickers, the most there can be. Delete one to make room.', { n: MAX_OWN_STICKERS }));
      return;
    }
    setMaking(true);
    setNote('');
    try {
      const picture = await pickSticker();
      if (!picture) return;
      setNote(t('Making the sticker…'));
      const made = await addOwnSticker(place, stickerPhoto(picture));
      setOwn((list) => [...list, made]);
      setNote('');
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setMaking(false);
    }
  }

  function remove(sticker: OwnSticker) {
    if (!place) return;
    ask(t('Delete sticker'), t('Delete this sticker of yours? Where it was sent, it stays.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: () =>
          void removeOwnSticker(place, sticker.id).then(
            () => setOwn((list) => list.filter((s) => s.id !== sticker.id)),
            (error) => setNote(error instanceof Error ? error.message : String(error)),
          ),
      },
    ]);
  }

  const tabs: Tab[] = [...SETS.map(({ set }) => set), ...(hasMine ? ['mine' as const] : [])];
  const cell = ({ pressed }: { pressed: boolean }) => ({ padding: 6, borderRadius: radius.md, backgroundColor: pressed ? colors.surfacePressed : 'transparent' });
  return (
    <View style={{ gap: space.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {SETS.map(({ set, label }) => (
          <Chip key={set} label={t(label)} selected={tab === set} onPress={() => choose(set)} />
        ))}
        {hasMine ? <Chip label={t('Mine')} selected={tab === 'mine'} onPress={() => choose('mine')} /> : null}
      </ScrollView>
      {/* A swipe to the side goes to the set beside, as its chip does. */}
      <SwipeTabs tabs={tabs} current={tab} onChange={choose} grow={false}>
        {tab !== 'mine' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
            {stickersIn(tab).map((sticker) => (
              <Pressable key={sticker.name} onPress={() => onPick(sticker.name)} accessibilityRole="button" accessibilityLabel={t(sticker.label)} style={cell}>
                <StickerView name={sticker.name} size={72} play />
              </Pressable>
            ))}
          </View>
        ) : ownTab ? (
          ownTab.view
        ) : (
          <>
            <Row wrap>
              <Button title={t('New sticker from a photo')} compact loading={making} onPress={() => void make()} />
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
              {own.map((sticker) => (
                <Pressable
                  key={sticker.id}
                  onPress={() => mine?.onPick(sticker)}
                  onLongPress={() => remove(sticker)}
                  accessibilityRole="button"
                  accessibilityLabel={t('Sticker')}
                  accessibilityHint={t('Tap to send, hold to delete')}
                  style={cell}
                >
                  <PhotoSticker uri={pictures[sticker.id]} size={72} status="" />
                </Pressable>
              ))}
            </View>
            <Text variant="caption" tone="muted">
              {place?.holder === 'space'
                ? t('Stickers you make from photos stay in this space, sealed, and go end-to-end encrypted as photos do. Hold one to delete it.')
                : t('Stickers you make here stay in these hidden chats only, sealed, and go end-to-end encrypted as photos do. Hold one to delete it.')}
            </Text>
          </>
        )}
      </SwipeTabs>
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}
