// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ask } from '../lib/alert';
import { isContactNumber } from '../lib/contact-book';
import { newContactHref } from '../lib/contacts';
import { t } from '../lib/i18n';
import { isBlocked, smsOrderChanged, smsTitle, spamMark, type SmsFolder } from '../lib/sms-folders';
import { groupName, sameConversation, smsNumbers } from '../lib/sms-group';
import { SmsLink } from '../lib/sms-link';
import { currentSpace } from '../lock/keys';
import { MAX_PINS, SMS_TITLE, TRASH_DAYS } from '../lock/sms-data';
import { blockedNumbers, blockNumber, canBlockNumbers, smsMirrored, unblockNumber } from '../modules/erevos-sms';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';
import { OwnName } from './own-name';
import { Sheet, Text } from './ui';
import { offerUndo } from './undo-bar';

// What can be done to an SMS conversation, from the list (held down), a folder, or the conversation
// itself (⋮): add its number to the contacts when it is none, give a group's a name of its own here,
// pin it at the top, archive it, say it is spam or not, block its number in Android's own list, or
// put it in the Trash. Each but pinning and naming shows Undo for a few seconds after
// (components/undo-bar.tsx). Pins, the Archive, the Trash and spam marks are this space's own,
// sealed in it (lock/sms-data.ts); the blocked numbers are Android's, the same in every space.

/** A conversation: its address, the name it shows, its latest message's time, and where it is. */
export type SmsTarget = { address: string; name: string; at: number; folder: SmsFolder };

type State = { link: SmsLink; blocked: boolean | null; known: boolean | null };

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
  // Naming a group's conversation: its field shows in place of the actions.
  const [naming, setNaming] = useState(false);
  const numbers = target ? smsNumbers(target.address) : [];
  const one = numbers.length === 1 ? numbers[0] : null;

  useEffect(() => {
    setState(null);
    setNaming(false);
    if (!target) return;
    let active = true;
    const { space: current, key } = currentSpace();
    void Promise.all([SmsLink.open(current, key), canBlockNumbers(), blockedNumbers(), one ? isContactNumber(one) : null])
      .then(([link, can, blocked, known]) => {
        if (active) setState({ link, blocked: can && one ? isBlocked(target.address, blocked) : null, known });
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
  const mark = data ? spamMark(address, data) : null;
  const spam = target.folder === 'spam';

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

  function markSpam() {
    onClose();
    if (!one) return;
    const before = mark;
    run(state?.link, (link) => link.markSpam(one, !spam), { text: spam ? t('Not spam: back in the list.') : t('Marked as spam: it is in Spam.'), undo: (link) => link.markSpam(one, before) });
  }

  function block() {
    onClose();
    if (!one || !state || state.blocked === null) return;
    if (state.blocked) {
      run(state.link, () => unblockNumber(one), { text: t('Unblocked.'), undo: () => blockNumber(one) });
      return;
    }
    ask(
      t('Block {number}?', { number: one }),
      t("It goes into Android's own list of blocked numbers: Android rejects its SMS, MMS and calls, in every space and in the phone app too, until you unblock it. The conversation goes to Spam."),
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Block'), style: 'destructive', onPress: () => run(state.link, () => blockNumber(one), { text: t('Blocked.'), undo: () => unblockNumber(one) }) },
      ],
    );
  }

  function trash() {
    onClose();
    trashConversation(address, target!.at, state?.link);
    onTrashed?.();
  }

  function addContact() {
    onClose();
    if (one) router.push(newContactHref(one));
  }

  const rows: { label: string; run: () => void; danger?: boolean }[] = [];
  if (one && state?.known === false) rows.push({ label: t('Add to contacts'), run: addContact });
  // A group MMS has no name of its own: one can be given here, for this space's eyes only.
  if (numbers.length > 1) rows.push({ label: t('Name it here'), run: () => setNaming(true) });
  if (target.folder === 'list') rows.push({ label: pinned ? t('Unpin') : t('Pin to the top'), run: pin });
  if (target.folder !== 'spam') rows.push({ label: archived ? t('Unarchive') : t('Archive'), run: archive });
  if (one && state?.blocked !== true) rows.push({ label: spam ? t('Not spam') : t('Mark as spam'), run: markSpam });
  if (one && state && state.blocked !== null) rows.push({ label: state.blocked ? t('Unblock {number}', { number: one }) : t('Block {number}', { number: one }), run: block });
  // On a linked device the SMS are the phone's: only the phone deletes them.
  if (!smsMirrored()) rows.push({ label: t('Delete'), run: trash, danger: true });

  return (
    <Sheet visible onClose={onClose} title={target.name}>
      {naming && state ? (
        <OwnName
          open
          label={t('Name it here')}
          current={smsTitle(data, address)}
          placeholder={groupName(numbers)}
          max={SMS_TITLE}
          hint={t('Only on this device: nobody is told. Empty, its usual name shows again.')}
          onSave={async (name) => {
            await state.link.setTitle(address, name);
            smsOrderChanged();
            onClose();
          }}
        />
      ) : null}
      {naming ? null : rows.map((row) => (
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
