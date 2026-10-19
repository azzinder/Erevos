import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { smsOrderChanged, type SmsFolder } from '../lib/sms-folders';
import { sameConversation } from '../lib/sms-group';
import { SmsLink } from '../lib/sms-link';
import { currentSpace } from '../lock/keys';
import { MAX_PINS, TRASH_DAYS } from '../lock/sms-data';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';
import { Sheet, Text } from './ui';
import { offerUndo } from './undo-bar';

// What can be done to an SMS conversation, from the list (held down), a folder, or the conversation
// itself (⋮): pin it at the top, archive it, or put it in the Trash. Each but pinning shows Undo for
// a few seconds after (components/undo-bar.tsx). Pins, the Archive and the Trash are this space's
// own, sealed in it (lock/sms-data.ts).

/** A conversation: its address, the name it shows, its latest message's time, and where it is. */
export type SmsTarget = { address: string; name: string; at: number; folder: SmsFolder };

type State = { link: SmsLink };

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Does something to the space's SMS, tells the screens to read their order again, and offers to
 *  undo it; or says why it could not be done. */
function run(link: SmsLink | null | undefined, work: (link: SmsLink) => Promise<unknown>, done?: { text: string; undo: (link: SmsLink) => Promise<unknown> }) {
  const opened = link ? Promise.resolve(link) : SmsLink.open(currentSpace().space, currentSpace().key);
  void opened
    .then(async (kept) => {
      await work(kept);
      smsOrderChanged();
      if (done) offerUndo({ text: done.text, undo: () => done.undo(kept).then(smsOrderChanged) });
    })
    .catch((error) => ask(t('Not done'), errorText(error), [{ text: t('OK') }]));
}

/** Archives a conversation (`on`), or takes it out of the Archive, with Undo, which brings back its
 *  pin or its place in the Archive too. */
export function archiveConversation(address: string, on: boolean, link?: SmsLink): void {
  let was: { pinned: boolean; at: number } = { pinned: false, at: 0 };
  run(
    link,
    (l) => {
      was = { pinned: l.state.pinned.some((p) => sameConversation(p.address, address)), at: l.state.archived.find((a) => sameConversation(a.address, address))?.at ?? 0 };
      return l.archive(address, on);
    },
    on
      ? {
          text: t('Archived. A new SMS from them brings it back.'),
          undo: async (l) => {
            await l.archive(address, false);
            if (was.pinned) await l.pin(address, true);
          },
        }
      : { text: t('Back in the list.'), undo: (l) => l.archive(address, true, was.at || Date.now()) },
  );
}

/** Puts a conversation in the Trash, its messages up to `at`, with Undo, which brings back its pin
 *  or its place in the Archive too. */
export function trashConversation(address: string, at: number, link?: SmsLink): void {
  let was: { pinned: boolean; archived: number | null } = { pinned: false, archived: null };
  run(
    link,
    async (l) => {
      was = { pinned: l.state.pinned.some((p) => sameConversation(p.address, address)), archived: l.state.archived.find((a) => sameConversation(a.address, address))?.at ?? null };
      if (!(await l.trash(address, at))) throw new Error(t('The Trash is full. Empty it first.'));
    },
    {
      text: t('In the Trash. It goes from the phone in {days} days.', { days: TRASH_DAYS }),
      undo: async (l) => {
        await l.untrash(address);
        if (was.archived !== null) await l.archive(address, true, was.archived);
        else if (was.pinned) await l.pin(address, true);
      },
    },
  );
}

export function SmsActions({ target, onClose, onTrashed }: {
  target: SmsTarget | null;
  onClose: () => void;
  /** It was put in the Trash. */
  onTrashed?: () => void;
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    setState(null);
    if (!target) return;
    let active = true;
    const { space: current, key } = currentSpace();
    void SmsLink.open(current, key)
      .then((link) => {
        if (active) setState({ link });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [target?.address]);

  if (!target) return null;
  const address = target.address;
  const data = state?.link.state;
  const pinned = !!data?.pinned.some((p) => sameConversation(p.address, address));
  const archived = data?.archived.find((a) => sameConversation(a.address, address)) ?? null;

  function pin() {
    onClose();
    run(state?.link, async (link) => {
      if (!(await link.pin(address, !pinned))) throw new Error(t('At most {n} conversations stay pinned. Unpin one first.', { n: MAX_PINS }));
    });
  }

  function archive() {
    onClose();
    archiveConversation(address, !archived, state?.link);
  }

  function trash() {
    onClose();
    trashConversation(address, target!.at, state?.link);
    onTrashed?.();
  }

  const rows: { label: string; run: () => void; danger?: boolean }[] = [];
  if (target.folder === 'list') rows.push({ label: pinned ? t('Unpin') : t('Pin to the top'), run: pin });
  rows.push({ label: archived ? t('Unarchive') : t('Archive'), run: archive });
  rows.push({ label: t('Delete'), run: trash, danger: true });

  return (
    <Sheet visible onClose={onClose} title={target.name}>
      {rows.map((row) => (
        <Pressable
          key={row.label}
          accessibilityRole="button"
          disabled={!state}
          onPress={row.run}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text variant="bodyStrong" color={row.danger ? colors.danger : undefined} tone={state ? undefined : 'faint'}>
            {row.label}
          </Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    row: { paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.md },
    pressed: { backgroundColor: colors.surfacePressed },
  });
