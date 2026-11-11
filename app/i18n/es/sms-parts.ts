// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Spanish of what an SMS carries besides its words, pins for the owner alone and choosing
// several SMS (lib/sms-parts.ts, app/sms.tsx) (i18n/es/index.ts).
export const smsParts: Record<string, string> = {
  'Pin for me': 'Fijar solo para mí',
  'Contact card': 'Tarjeta de contacto',
  '{what} · {size} KB · remove': '{what} · {size} KB · quitar',
  '{n} message goes from the phone.': '{n} mensaje se elimina del teléfono.',
  '{n} messages go from the phone.': '{n} mensajes se eliminan del teléfono.',
  '{n} messages deleted.': '{n} mensajes eliminados.',
};
