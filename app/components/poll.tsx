// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type TextStyle } from 'react-native';

import { MAX_OPTION, MAX_OPTIONS, MAX_QUESTION, pollOf, tally, type Poll } from '../lib/chat-parts';
import { t } from '../lib/i18n';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

import { Button, Chip, Field, Input, Row, Sheet, Text, TextButton } from './ui';

// A poll, in a contact's chat (app/chat.tsx) and in a group (components/group-chat.tsx): the sheet to make one,
// and the poll in its bubble, where a tap on an option chooses it, or takes the choice back. One its
// sender ended (End poll) shows how the votes stood, and takes no more.

/** One who voted: their name, as the chat shows it, and the options they chose. */
export type Voter = { name: string; chose: number[] };

/**
 * A poll in its bubble: its question, then each option with how many chose it and who. `mine`: the
 * options we chose. Without `onChoose` (ours waiting to go, or a group we left), nothing is chosen;
 * `ended`, its sender ended it: nothing is chosen either, and it says so.
 */
export function PollCard({ poll, voters, mine, onChoose: choosing, ink, ended = false }: {
  poll: Poll;
  voters: Voter[];
  mine: number[];
  onChoose?: (option: number) => void;
  ink?: StyleProp<TextStyle>;
  ended?: boolean;
}) {
  const colors = useColors();
  const onChoose = ended ? undefined : choosing;
  const counts = tally(poll, voters.map((voter) => voter.chose));
  const most = Math.max(1, ...counts);
  return (
    <View style={{ gap: space.xs, minWidth: 220 }}>
      <Text style={[ink, { fontWeight: '700' }]}>{poll.q}</Text>
      <Text style={[ink, { fontSize: 12, opacity: 0.8 }]}>{ended ? t('Poll ended') : poll.m ? t('Poll · choose one or more') : t('Poll · choose one')}</Text>
      {poll.o.map((option, i) => {
        const chosen = mine.includes(i);
        const who = voters.filter((voter) => voter.chose.includes(i)).map((voter) => voter.name);
        return (
          <Pressable
            key={i}
            onPress={onChoose ? () => onChoose(i) : undefined}
            disabled={!onChoose}
            accessibilityRole={poll.m ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: chosen, disabled: !onChoose }}
            accessibilityLabel={`${option}, ${counts[i]}`}
            style={({ pressed }) => ({
              gap: 3,
              paddingVertical: 6,
              paddingHorizontal: space.sm,
              borderRadius: radius.sm,
              backgroundColor: withAlpha(colors.text, pressed ? 0.14 : 0.06),
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text style={[ink, { fontSize: 16 }]}>{poll.m ? (chosen ? '☑' : '☐') : chosen ? '◉' : '○'}</Text>
              <Text style={[ink, { flex: 1 }]}>{option}</Text>
              <Text style={[ink, { fontWeight: '700' }]}>{counts[i]}</Text>
            </View>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: withAlpha(colors.text, 0.08) }}>
              <View style={{ height: 3, borderRadius: 2, width: `${(counts[i] / most) * 100}%`, backgroundColor: colors.primary }} />
            </View>
            {who.length > 0 ? <Text style={[ink, { fontSize: 12, opacity: 0.8 }]}>{who.join(', ')}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** The sheet to make a poll: its question, two options or more, and whether more than one can be chosen. */
export function PollSheet({ visible, onClose, onSend }: { visible: boolean; onClose: () => void; onSend: (poll: Poll) => void }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiple, setMultiple] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setQuestion('');
    setOptions(['', '']);
    setMultiple(false);
  }, [visible]);
  const poll = pollOf(question, options, multiple);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('New poll')}>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
        <Field label={t('Question')}>
          <Input value={question} onChangeText={setQuestion} maxLength={MAX_QUESTION} placeholder={t('Ask something')} autoFocus />
        </Field>
        <Field label={t('Options')}>
          <View style={{ gap: space.xs }}>
            {options.map((option, i) => (
              <Input
                key={i}
                value={option}
                onChangeText={(text) => setOptions((now) => now.map((o, j) => (j === i ? text : o)))}
                maxLength={MAX_OPTION}
                placeholder={t('Option {n}', { n: i + 1 })}
              />
            ))}
          </View>
        </Field>
      </ScrollView>
      <Row wrap>
        {options.length < MAX_OPTIONS ? <TextButton title={t('Add an option')} onPress={() => setOptions((now) => [...now, ''])} /> : null}
        <Chip label={t('More than one answer')} selected={multiple} onPress={() => setMultiple((now) => !now)} />
      </Row>
      <Button title={t('Send')} disabled={!poll} onPress={() => poll && onSend(poll)} />
    </Sheet>
  );
}
