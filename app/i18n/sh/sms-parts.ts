// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Serbo-Croatian of what an SMS carries besides its words, pins for the owner alone and choosing
// several SMS (lib/sms-parts.ts, app/sms.tsx) (i18n/sh/index.ts).
export const smsParts: Record<string, string> = {
  'Pin for me': 'Prikvači samo za mene',
  'Contact card': 'Kontakt kartica',
  '{what} · {size} KB · remove': '{what} · {size} KB · ukloni',
  '{n} message goes from the phone.': '{n} poruka se briše s telefona.',
  '{n} messages go from the phone.': '{n} poruka se briše s telefona. | {n} poruke se brišu s telefona. | {n} poruka se briše s telefona.',
  '{n} messages deleted.': '{n} poruka je obrisana. | {n} poruke su obrisane. | {n} poruka je obrisano.',
};
