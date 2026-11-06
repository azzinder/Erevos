// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Greek of payment requests (lib/pay.ts, components/pay-card.tsx) (i18n/el/index.ts).
export const payText: Record<string, string> = {
  'Payment request': 'Αίτημα πληρωμής',
  'Paid': 'Πληρώθηκε',
  'Paid ✓': 'Πληρώθηκε ✓',
  'Waiting to be paid': 'Περιμένει πληρωμή',
  'Not paid yet': 'Δεν έχει πληρωθεί ακόμα',
  'Mark in Fasouli': 'Σημείωσέ το στο Fasouli',
  '{name} marked your payment request paid.': 'Η επαφή {name} σημείωσε ότι πλήρωσε το αίτημα πληρωμής σου.',
  'Mark it paid?': 'Να σημειωθεί ως πληρωμένο;',
  '{name} is told that you paid {amount}. It cannot be taken back.': 'Η επαφή {name} θα μάθει ότι πλήρωσες {amount}. Δεν αναιρείται.',
  'Fasouli is not installed on this phone.': 'Το Fasouli δεν είναι εγκατεστημένο σε αυτό το τηλέφωνο.',
  'Send this payment request?': 'Να σταλεί αυτό το αίτημα πληρωμής;',
  '{name} is asked to pay {amount}{what}. Erevos moves no money: the request only says it.': 'Η επαφή {name} θα δει αίτημα να πληρώσει {amount}{what}. Το Erevos δεν μεταφέρει χρήματα: το αίτημα απλώς το λέει.',
  'Payment request: {amount}{what}': 'Αίτημα πληρωμής: {amount}{what}',
  'The chat you pick asks before the request goes. Only Erevos chats, never hidden chats.': 'Η συνομιλία που θα διαλέξεις ρωτά πριν φύγει το αίτημα. Μόνο συνομιλίες Erevos, ποτέ κρυφές.',
  'This payment request cannot be read.': 'Αυτό το αίτημα πληρωμής δεν διαβάζεται.',
};
