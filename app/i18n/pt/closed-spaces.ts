// The Portuguese of a closed space that says a message came while another is open (app/security.tsx,
// lib/closed-notices.ts), and of a message that came or went through Nostr (app/chat.tsx) (i18n/pt/index.ts).
export const closedSpaces: Record<string, string> = {
  'Went through Nostr.': 'Foi pelo Nostr.',
  'Came through Nostr.': 'Veio pelo Nostr.',
  'This space only while open': 'Este espaço só enquanto aberto',
  'Also while another space is open': 'Também enquanto outro espaço está aberto',
  'While another space is open, this one says only "New message", as that one does, never which space; its hidden chats say nothing then. For it the phone keeps the addresses of its queues at its relay outside its password, never its keys, contacts or messages, and its relay may tell that the two spaces are on one phone. Through Tor, if this space goes through Tor, and only while the open one has Tor ready.': 'Enquanto outro espaço está aberto, este diz só “Nova mensagem”, como aquele, nunca qual espaço; as conversas ocultas dele não dizem nada então. Para isso o celular guarda os endereços das filas dele no relay fora da senha dele, nunca as chaves, os contatos ou as mensagens, e o relay dele pode perceber que os dois espaços estão no mesmo celular. Pelo Tor, se este espaço vai pelo Tor, e só enquanto o aberto tem o Tor pronto.',
  'Closed, this space receives nothing: its messages wait at its relay and come when it opens.': 'Fechado, este espaço não recebe nada: as mensagens dele esperam no relay e chegam quando ele abre.',
  'This space has no queue at a relay yet: it can say nothing while closed.': 'Este espaço ainda não tem uma fila em um relay: fechado, não pode dizer nada.',
  'Tor is not ready.': 'O Tor não está pronto.',
};
