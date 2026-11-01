// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';

import { Button, Page, Text } from '../components/ui';
import { amongPlace } from '../lib/contact-book';
import { offerContact } from '../lib/contact-code';
import { useOpenHiddenPlace } from '../lib/hidden-contacts';
import { t } from '../lib/i18n';
import { makerContact } from '../lib/maker';

// Contact (Settings → General): adds the maker of Erevos as a contact, from the link that comes
// with the app (lib/maker.ts), and opens the chats, as a contact link does (app/contact.tsx). With
// hidden chats open beneath, the contact goes to them, as there.
export default function ContactMaker() {
  const maker = makerContact();
  const hiddenOpen = useOpenHiddenPlace();

  function chat() {
    if (!maker) return;
    const into = amongPlace(hiddenOpen ?? 'space');
    offerContact(maker.code, into ? { place: into, name: maker.name } : undefined);
    router.dismissTo('/chat');
  }

  return (
    <Page>
      <Text variant="title">{t('Contact')}</Text>
      <Text tone="muted">
        {t('Write to the maker of Erevos in Erevos itself: end-to-end encrypted, with no phone number and no email. For a fault, an idea or a question.')}
      </Text>
      <Text tone="muted">
        {t('The button adds the maker as a contact, from the contact link that comes with Erevos, and opens the chats. If the maker is one of your contacts already, nothing new is added.')}
      </Text>
      <Button title={t('Chat with the maker')} onPress={chat} disabled={!maker} />
    </Page>
  );
}
