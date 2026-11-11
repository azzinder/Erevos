// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Portuguese of what an SMS carries besides its words, pins for the owner alone and choosing
// several SMS (lib/sms-parts.ts, app/sms.tsx) (i18n/pt/index.ts).
export const smsParts: Record<string, string> = {
  'Pin for me': 'Fixar só para mim',
  'Contact card': 'Cartão de contato',
  '{what} · {size} KB · remove': '{what} · {size} KB · remover',
  '{n} message goes from the phone.': '{n} mensagem é apagada do telefone.',
  '{n} messages go from the phone.': '{n} mensagens são apagadas do telefone.',
  '{n} messages deleted.': '{n} mensagens apagadas.',
};
