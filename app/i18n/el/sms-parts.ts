// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Greek of what an SMS carries besides its words, pins for the owner alone and choosing
// several SMS (lib/sms-parts.ts, app/sms.tsx) (i18n/el/index.ts).
export const smsParts: Record<string, string> = {
  'Pin for me': 'Καρφίτσωμα για μένα',
  'Contact card': 'Κάρτα επαφής',
  '{what} · {size} KB · remove': '{what} · {size} KB · αφαίρεση',
  '{n} message goes from the phone.': '{n} μήνυμα θα διαγραφεί από το τηλέφωνο.',
  '{n} messages go from the phone.': '{n} μηνύματα θα διαγραφούν από το τηλέφωνο.',
  '{n} messages deleted.': 'Διαγράφηκαν {n} μηνύματα.',
};
