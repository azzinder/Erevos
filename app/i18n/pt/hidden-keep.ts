// The Portuguese of hidden chats that receive while they are closed (lock/hidden-keep.ts,
// lib/place-receiver.ts, the toggle at the top of an open place in app/chat.tsx) (i18n/pt/index.ts).
export const hiddenKeep: Record<string, string> = {
  'Receive while closed': 'Receber quando fechadas',
  'Closed, these hidden chats receive as your other chats do: their contacts see at once that a message came, a notice says only "New message", and a call rings with no name, answered with the PIN. For it, their key is kept encrypted with the space, so whoever opens the space and copies what the phone keeps could open them too; the PIN still keeps them out of sight.':
    'Fechadas, estas conversas ocultas recebem como as suas outras conversas: os seus contatos veem logo que uma mensagem chegou, um aviso diz apenas «New message», e uma chamada toca sem nome e é atendida com o PIN. Para isso, a chave delas fica guardada cifrada com o espaço, então quem abrir o espaço e copiar o que o telefone guarda poderia abri-las também; o PIN continua a mantê-las fora de vista.',
  'Closed, nothing reads these hidden chats: their key is only behind the PIN, and their messages wait on the relay until you open them.':
    'Fechadas, nada lê estas conversas ocultas: a chave delas está só atrás do PIN, e as suas mensagens esperam no relay até você abri-las.',
};
