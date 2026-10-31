// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// El español de los chats ocultos que suenan las llamadas de sus contactos mientras están cerrados
// (lock/hidden-ring.ts, components/hidden-ring-screen.tsx, el interruptor en app/chat.tsx)
// (i18n/es/index.ts).
export const hiddenRing: Record<string, string> = {
  'Ring calls when closed': 'Sonar las llamadas cuando están cerrados',
  'While these hidden chats are closed, with Erevos in the background or on any screen, a call from one of their contacts makes the phone ring and show "Incoming call" with no name. On the ringing screen, tap the small sign and type the PIN to answer. Whoever holds the phone sees a call that is in none of your chats, and may guess there are more.':
    'Mientras estos chats ocultos están cerrados, con Erevos en segundo plano o en cualquier pantalla, una llamada de uno de sus contactos hace sonar el teléfono y muestra «Llamada entrante» sin nombre. En la pantalla de la llamada, toca la pequeña señal y escribe el PIN para contestar. Quien tenga el teléfono ve una llamada que no está en ninguno de tus chats, y puede sospechar que hay más.',
  'Closed, these hidden chats do not ring: a call from their contacts rings only while they are open.':
    'Cerrados, estos chats ocultos no suenan: una llamada de sus contactos suena solo mientras están abiertos.',
  'Nothing rings for now: it needs Receive and ring, under Settings → Notifications → In the background.':
    'Por ahora no suena nada: hace falta «Recibir y sonar», en Ajustes → Notificaciones → En segundo plano.',
  PIN: 'PIN',
  Connect: 'Conectar',
};
