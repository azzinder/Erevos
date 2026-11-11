// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View, type StyleProp, type TextStyle } from 'react-native';

import { cardFields, cardOf, cardShown } from '../lib/card-share';
import { allowPhoneContacts, dialCards, sealedCards, type Among, type Card } from '../lib/contact-book';
import { fillText, matches } from '../lib/contacts';
import { t } from '../lib/i18n';
import { placeOf } from '../lib/sealed-contacts';
import { contactsReady, contactsStatus } from '../modules/erevos-contacts';
import { space } from '../theme/colors';

import { Input, Sheet, Text, TextButton } from './ui';

// A contact card, in a contact's chat (app/chat.tsx) and in a group (components/group-messages.tsx):
// the sheet to choose a contact to send, from the phone's contacts and those kept only in Erevos,
// or, among the hidden chats, from theirs only; and the card in its bubble, with what it says and a
// button to add it to this phone's contacts (app/contact-edit.tsx), there among the hidden chats.

/**
 * The sheet to choose a contact whose card goes, one with a number or an email, `among` the space's
 * contacts or the open hidden chats' (none while those are closed). `foot`, said under it in place
 * of its going end-to-end encrypted, where it does not (a chat of another network).
 */
export function CardSheet({ visible, onClose, onSend, among, foot }: { visible: boolean; onClose: () => void; onSend: (card: string) => void; among: Among; foot?: string }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setCards(null);
    let live = true;
    void (async () => {
      if (among === 'space' && Platform.OS === 'android' && contactsReady() && !contactsStatus().read) await allowPhoneContacts();
      const found = await (!among ? Promise.resolve([]) : among === 'space' ? dialCards(true) : sealedCards(placeOf(among))).catch((): Card[] => []);
      if (live) setCards(found.filter((c) => c.name.trim() && (c.phones.length > 0 || c.emails.length > 0)));
    })();
    return () => {
      live = false;
    };
  }, [visible, among]);
  const shown = (cards ?? []).filter((c) => matches(c, query));
  return (
    <Sheet visible={visible} onClose={onClose} title={t('Contact card')}>
      <Input value={query} onChangeText={setQuery} placeholder={t('Search contacts')} />
      <ScrollView nestedScrollEnabled style={{ maxHeight: 360 }} contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
        {cards && shown.length === 0 ? (
          <Text tone="muted">{t('No contacts yet.')}</Text>
        ) : (
          shown.map((c) => (
            <TextButton
              key={c.key}
              title={[c.name, c.phones[0]?.value ?? c.emails[0]?.value].filter(Boolean).join(' · ')}
              onPress={() => {
                const card = cardOf(c);
                if (card) onSend(card);
              }}
            />
          ))
        )}
      </ScrollView>
      <Text variant="caption" tone="muted">
        {foot ?? t('Only its name, numbers and email addresses go, end-to-end encrypted.')}
      </Text>
    </Sheet>
  );
}

/** Opens a new contact filled with a card's name, numbers and emails, to keep once saved: among the hidden chats' contacts, there (`hidden`). */
export function saveCard(card: string, hidden: boolean): void {
  const fields = cardFields(card);
  if (fields) router.push(`/contact-edit?fill=${encodeURIComponent(fillText(fields))}${hidden ? '&hidden=1' : ''}`);
}

/** A contact card in its bubble: the name, each number and email, and a button to add it to the contacts here (`onSave`). */
export function CardBubble({ card, ink, onSave }: { card: string; ink?: StyleProp<TextStyle>; onSave?: () => void }) {
  const { name, phones, emails } = cardShown(card);
  return (
    <View style={{ gap: 2, minWidth: 200 }}>
      <Text style={[ink, { fontWeight: '700' }]}>👤 {name}</Text>
      {[...phones, ...emails].map((line, i) => (
        <Text key={i} style={ink} selectable>
          {line}
        </Text>
      ))}
      {onSave ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSave}
          style={({ pressed }) => ({ marginTop: space.xs, alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={[ink, { fontWeight: '700', textDecorationLine: 'underline' }]}>{t('Add to contacts')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
