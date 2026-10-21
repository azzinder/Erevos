// O português (do Brasil) das conversas ocultas que tocam as chamadas dos seus contatos enquanto
// estão fechadas (lock/hidden-ring.ts, components/hidden-ring-screen.tsx, o botão em app/chat.tsx)
// (i18n/pt/index.ts).
export const hiddenRing: Record<string, string> = {
  'Ring calls when closed': 'Tocar as chamadas quando fechadas',
  'While these hidden chats are closed and Erevos is in the background, a call from one of their contacts makes the phone ring and show "Incoming call" with no name. On the ringing screen, tap the small sign and type the PIN to answer. Whoever holds the phone sees a call that is in none of your chats, and may guess there are more.':
    'Enquanto estas conversas ocultas estão fechadas e o Erevos está em segundo plano, uma chamada de um dos contatos delas faz o telefone tocar e mostra «Chamada recebida» sem nome. Na tela da chamada, toque no pequeno sinal e digite o PIN para atender. Quem estiver com o telefone vê uma chamada que não está em nenhuma das suas conversas, e pode suspeitar que há mais.',
  'Closed, these hidden chats do not ring: a call from their contacts rings only while they are open.':
    'Fechadas, estas conversas ocultas não tocam: uma chamada dos contatos delas toca só enquanto estão abertas.',
  PIN: 'PIN',
  Connect: 'Conectar',
};
