// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Platform, Pressable, View, type StyleProp, type TextStyle } from 'react-native';

import { locale, t } from '../lib/i18n';
import { payAmount, type Pay } from '../lib/pay';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

import { Text } from './ui';

// A payment request in its bubble, in a contact's chat (app/chat.tsx; lib/pay.ts): the amount and
// what it is for, and whether it was paid. Theirs offers **Paid** until it is; ours, once paid
// and asked for from Fasouli, offers **Mark in Fasouli**, which only Android can open.

export function PayCard({ pay, mine, paid, onPaid, onFasouli, ink }: {
  pay: Pay;
  mine: boolean;
  /** When it was marked paid. */
  paid?: number;
  /** Marks theirs paid: missing on ours, and once it is paid. */
  onPaid?: () => void;
  /** Opens Fasouli to mark ours collected there. */
  onFasouli?: () => void;
  ink?: StyleProp<TextStyle>;
}) {
  const colors = useColors();
  const state = paid ? t('Paid ✓') : mine ? t('Waiting to be paid') : t('Not paid yet');
  const button = (title: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: space.sm,
        borderRadius: radius.sm,
        backgroundColor: withAlpha(colors.text, pressed ? 0.16 : 0.08),
      })}
    >
      <Text style={[ink, { fontWeight: '700' }]}>{title}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: space.xs, minWidth: 220 }}>
      <Text style={[ink, { fontSize: 12, opacity: 0.8 }]}>{`💶 ${t('Payment request')}`}</Text>
      <Text style={[ink, { fontSize: 22, fontWeight: '700' }]} selectable>
        {payAmount(pay, locale())}
      </Text>
      {pay.w ? (
        <Text style={ink} selectable>
          {pay.w}
        </Text>
      ) : null}
      <Text style={[ink, { fontSize: 12, opacity: 0.8 }]}>{state}</Text>
      {!mine && !paid && onPaid ? button(t('Paid'), onPaid) : null}
      {mine && paid && onFasouli && Platform.OS === 'android' ? button(t('Mark in Fasouli'), onFasouli) : null}
    </View>
  );
}
