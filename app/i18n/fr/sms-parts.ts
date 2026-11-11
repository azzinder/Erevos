// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The French of what an SMS carries besides its words, pins for the owner alone and choosing
// several SMS (lib/sms-parts.ts, app/sms.tsx) (i18n/fr/index.ts).
export const smsParts: Record<string, string> = {
  'Pin for me': 'Épingler pour moi',
  'Contact card': 'Carte de contact',
  '{what} · {size} KB · remove': '{what} · {size} Ko · retirer',
  '{n} message goes from the phone.': '{n} message est supprimé du téléphone.',
  '{n} messages go from the phone.': '{n} messages sont supprimés du téléphone.',
  '{n} messages deleted.': '{n} messages supprimés.',
};
