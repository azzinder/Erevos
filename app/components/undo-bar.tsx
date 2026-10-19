import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useStyles } from '../theme/context';
import { Text, TextButton } from './ui';

// What was just done to an SMS conversation or message (archived, put in the Trash, deleted), or
// to calls in the phone's Recents (deleted), with Undo for a few seconds, on
// whichever screen with the bar shows next: the one it was done on, or the list it goes back to.
// One at a time; a new one takes the place of the last.

export type Offer = { text: string; undo: () => unknown };

/** Seconds an offer to undo shows. */
export const UNDO_SHOWS = 6;

let current: { offer: Offer; until: number } | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((listener) => listener());

/** Shows what was done, with Undo. */
export function offerUndo(offer: Offer): void {
  current = { offer, until: Date.now() + UNDO_SHOWS * 1000 };
  tell();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const shown = () => current;

/** The bar, while there is something to undo. `bottom`: how far above the screen's bottom. */
export function UndoBar({ bottom = 0 }: { bottom?: number }) {
  const styles = useStyles(makeStyles);
  const now = useSyncExternalStore(subscribe, shown, shown);

  useEffect(() => {
    if (!now) return;
    const timer = setTimeout(() => {
      if (current === now) {
        current = null;
        tell();
      }
    }, Math.max(0, now.until - Date.now()));
    return () => clearTimeout(timer);
  }, [now]);

  if (!now || now.until <= Date.now()) return null;
  return (
    <View style={[styles.bar, { bottom }]} pointerEvents="box-none">
      <View style={styles.inner}>
        <Text variant="label" style={styles.text} numberOfLines={2}>
          {now.offer.text}
        </Text>
        <TextButton
          title={t('Undo')}
          onPress={() => {
            current = null;
            tell();
            void Promise.resolve(now.offer.undo()).catch(() => undefined);
          }}
        />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    bar: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg },
    inner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      width: '100%',
      maxWidth: 520,
      paddingVertical: space.md,
      paddingHorizontal: space.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.popover,
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.8),
      boxShadow: `0px 6px 18px ${withAlpha('#000000', 0.3)}`,
    },
    text: { flex: 1 },
  });
