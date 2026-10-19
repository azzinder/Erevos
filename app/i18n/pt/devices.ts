// The Portuguese of linked devices: the account on the phone and on a computer (lib/devices.ts, app/devices.tsx; i18n/pt/index.ts).
export const devices: Record<string, string> = {
  // Linking and the links (lib/devices.ts).
  Computer: 'Computador',
  'Linked devices could not open.': 'Não foi possível abrir os dispositivos conectados.',
  'That device is linked already.': 'Esse dispositivo já está conectado.',
  'That is not a code from Linked devices.': 'Esse não é um código de “Dispositivos conectados”.',
  'The code changed. Compare it again.': 'O código mudou. Compare de novo.',
  'This device is no longer linked to a phone.': 'Este dispositivo não está mais conectado a um celular.',
  'This is a linked device. Link from the phone that holds the account.':
    'Este é um dispositivo conectado. Faça a conexão pelo celular que tem a conta.',
  'This space has chats of its own. Link from a space with none, such as one that opens with a new password.':
    'Este espaço tem conversas próprias. Faça a conexão por um espaço sem nenhuma, como um que abre com uma senha nova.',
  'This space is linked already.': 'Este espaço já está conectado.',
  'Too long to go through the phone.': 'Longo demais para passar pelo celular.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Digite primeiro o endereço do relay em “Relay”: os dispositivos conectados chegam a este celular por ele.',
  '{n} devices are linked already, the most there can be.': '{n} dispositivos já estão conectados, o máximo possível.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Dispositivos conectados',
  'This account on a computer or in a browser too': 'Esta conta também num computador ou num navegador',
  "This chat is the phone's: move it into hidden chats there.": 'Esta conversa é do celular: mova-a para as conversas ocultas por lá.',

  // A call answered on another device of the account (components/call-screen.tsx, lib/call-lines.ts).
  'Answered on another device': 'Atendida em outro dispositivo',
  'answered on another device': 'atendida em outro dispositivo',

  // Linked devices (app/devices.tsx).
  'All of it': 'Todas',
  'The last month': 'Do último mês',
  'The last week': 'Da última semana',
  None: 'Nenhuma',
  'Web browser': 'Navegador',
  'Code copied. Paste it on the phone in Menu → Linked devices.': 'Código copiado. Cole no celular em “Menu → Dispositivos conectados”.',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Conectado. As conversas vêm do celular, e com elas as mensagens que ele escolheu trazer.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'Não conectado. Outra pessoa pode ter lido o código. Gere um novo e conecte de novo.',
  'Now the computer shows a code too. If it is {code}, tap They match there.':
    'Agora o computador também mostra um código. Se for {code}, toque em “São iguais” lá.',
  'Unlink this device': 'Desconectar este dispositivo',
  'Unlink {name}': 'Desconectar {name}',
  "The account's chats leave this device, messages and all. The phone keeps them.":
    'As conversas da conta saem deste dispositivo, com mensagens e tudo. O celular continua com elas.',
  'Nothing more goes to it, and nothing it sends is taken. What it has stays on it, behind its own lock.':
    'Nada mais vai para ele, e nada do que ele enviar é aceito. O que ele tem fica nele, atrás do próprio bloqueio.',
  'Unlinked.': 'Desconectado.',
  'Unlinked here. The phone was not told: unlink this device there too.':
    'Desconectado aqui. O celular não foi avisado: desconecte este dispositivo lá também.',
  'Unlinked. The device was not told, and gets nothing more.': 'Desconectado. O dispositivo não foi avisado, e não recebe mais nada.',
  'The messages go to it now. What it has already is not kept twice.':
    'As mensagens estão indo para ele agora. O que ele já tem não fica guardado duas vezes.',
  'Messages to bring over': 'Mensagens a trazer',
  'Photos and files too': 'Fotos e arquivos também',
  'Linked to {name}': 'Conectado a {name}',
  'Since {when}. Last heard from {last}.': 'Desde {when}. Último contato: {last}.',
  'This device has the chats and groups of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls ring here too. New groups, public groups and group calls stay on the phone for now.':
    'Este dispositivo tem as conversas e os grupos do celular que tem a conta. O que você escreve aqui passa pelo celular, que precisa estar ligado e acessar o relay. As chamadas também tocam aqui. Por enquanto, novos grupos, grupos públicos e chamadas em grupo ficam no celular.',
  'Make or join groups on the phone that holds this account.': 'Crie grupos ou entre em grupos pelo celular que tem esta conta.',
  'Group calls ring on the phone that holds this account, for now. Call from there.':
    'Por enquanto, as chamadas em grupo tocam no celular que tem esta conta. Ligue de lá.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go.':
    'A mesma conta num computador ou num navegador. A conta continua sendo a do celular: ele repassa, criptografado de ponta a ponta, o que chega e o que o computador escreve, então os contatos não veem nada de novo. As conversas ocultas e o que uma segunda senha abre nunca vão.',
  'Link {name}': 'Conectar {name}',
  'Once you tap Link, the computer shows this code. Link only if it shows the same:':
    'Assim que você tocar em “Conectar”, o computador mostra este código. Só conecte se ele mostrar o mesmo:',
  Link: 'Conectar',
  Devices: 'Dispositivos',
  'Linked {when}. Last heard from {last}.': 'Conectado em {when}. Último contato: {last}.',
  'Linked {when}.': 'Conectado em {when}.',
  'Waiting for They match to be tapped on it.': 'Aguardando tocarem em “São iguais” nele.',
  'Bringing over messages: {n} so far.': 'Trazendo as mensagens: {n} até agora.',
  'Bring over': 'Trazer',
  'Bring over messages again': 'Trazer as mensagens de novo',
  'Link a computer to this phone': 'Conectar um computador a este celular',
  "On the computer, open Menu → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'No computador, abra “Menu → Dispositivos conectados → Conectar ao meu celular”. Depois escaneie o código dele com a câmera deste celular, ou copie lá e cole aqui.',
  'Code from the computer': 'Código do computador',
  Next: 'Avançar',
  'Link to my phone': 'Conectar ao meu celular',
  'The phone read the code. Does it show this one too?': 'O celular leu o código. Ele também mostra este?',
  'They match': 'São iguais',
  'They differ': 'São diferentes',
  'On the phone that holds the account, scan this code with the camera, or paste it in Menu → Linked devices. This space must have no chats of its own.':
    'No celular que tem a conta, escaneie este código com a câmera, ou cole em “Menu → Dispositivos conectados”. Este espaço não pode ter conversas próprias.',
  'Copy the code': 'Copiar o código',
  'Share the code': 'Compartilhar o código',
  'Waiting for the phone. The code works for half an hour.': 'Aguardando o celular. O código vale por meia hora.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'Use isto quando este dispositivo for o computador: as conversas dele passam a ser as do celular que tem a conta.',
  'Name of this device': 'Nome deste dispositivo',
};
