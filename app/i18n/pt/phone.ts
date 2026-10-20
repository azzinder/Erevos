// The Portuguese of the Phone and Contacts screens (app/phone.tsx and what goes with it) (i18n/pt/index.ts).
export const phone: Record<string, string> = {
  // The Phone screen (app/phone.tsx) and its place in the menu.
  Phone: 'Telefone',
  'Erevos as the phone app: the keypad, the calls and the favourites': 'Erevos como app de telefone: o teclado, as chamadas e os favoritos',
  'This build of Erevos has no phone part yet. It comes with the next build of the app.':
    'Esta versão do Erevos ainda não tem a parte de telefone. Ela vem na próxima versão do app.',
  'Only Android lets another app be the phone app.': 'Só o Android deixa outro app ser o app de telefone.',
  'Erevos may not make calls. Make it the phone app under Settings.':
    'O Erevos não tem permissão para fazer chamadas. Torne-o o app de telefone em “Configurações”.',
  'Not called. {error}': 'Não foi possível ligar. {error}',
  Contacts: 'Contatos',
  Settings: 'Configurações',
  'Back to the call': 'Voltar para a chamada',
  'Erevos is not the phone app': 'O Erevos não é o app de telefone',
  "Calls made here show on Android's own call screen until you make Erevos the phone app, under Settings.":
    'As chamadas feitas daqui aparecem na tela de chamada do próprio Android até você tornar o Erevos o app de telefone, em “Configurações”.',
  Number: 'Número',
  'Call on': 'Ligar com',
  "Without that, calls go on the phone's default SIM.": 'Sem isso, as chamadas saem pelo chip padrão do celular.',
  'Erevos keeps this SIM for the number, sealed in this space, and calls it on the same SIM next time.':
    'O Erevos guarda este chip para o número, selado neste espaço, e liga para ele pelo mesmo chip da próxima vez.',
  Keypad: 'Teclado',
  Recents: 'Recentes',
  Favourites: 'Favoritos',

  // The calls (Android's call history) and the favourites, on the Phone screen (lib/phone-log.ts).
  All: 'Todas',
  Missed: 'Perdidas',
  Incoming: 'Recebidas',
  Outgoing: 'Realizadas',
  Blocked: 'Bloqueadas',
  'Incoming call': 'Chamada recebida',
  'Outgoing call': 'Chamada realizada',
  'Declined call': 'Chamada recusada',
  'Blocked call': 'Chamada bloqueada',
  'Private number': 'Número privado',
  Payphone: 'Telefone público',
  'Unknown number': 'Número desconhecido',
  'Wi-Fi calling': 'Chamada por Wi-Fi',
  'HD voice': 'Voz HD',
  'Android does not let Erevos read the call history yet.': 'O Android ainda não deixa o Erevos ler o histórico de chamadas.',
  'Allow the call history': 'Permitir o histórico de chamadas',
  'Android did not allow it. Under Settings, Allow calls and contacts says how to.':
    'O Android não permitiu. Em “Configurações”, “Permitir chamadas e contatos” explica como.',
  'No calls of this kind.': 'Nenhuma chamada desse tipo.',
  'No calls yet.': 'Ainda não há chamadas.',
  'Call on {sim}': 'Ligar com {sim}',
  'Call {name}': 'Ligar para {name}',
  'Send an SMS': 'Enviar um SMS',
  'Change the number before calling': 'Alterar o número antes de ligar',
  'Block this number': 'Bloquear este número',
  'Unblock this number': 'Desbloquear este número',
  'Blocked {who}.': 'Bloqueado: {who}.',
  'Unblocked {who}.': 'Desbloqueado: {who}.',
  'Delete this call': 'Apagar esta chamada',
  'Delete these {n} calls': 'Apagar estas {n} chamadas',
  'Delete every call with this number': 'Apagar todas as chamadas com este número',
  'Call deleted.': 'Chamada apagada.',
  '{n} calls deleted.': '{n} chamadas apagadas.',
  'The calls with {who} were deleted.': 'As chamadas com {who} foram apagadas.',
  'The calls were not deleted. {error}': 'As chamadas não foram apagadas. {error}',
  "Android does not let Erevos read the phone's contacts yet.": 'O Android ainda não deixa o Erevos ler os contatos do celular.',
  'Allow the contacts': 'Permitir os contatos',
  'No favourites yet. The contacts you star show here, to call at a tap.':
    'Ainda não há favoritos. Os contatos que você marcar como favoritos aparecem aqui, para ligar com um toque.',

  // The phone's settings (app/phone-settings.tsx).
  'Phone settings': 'Configurações do telefone',
  'Erevos is the phone app': 'O Erevos é o app de telefone',
  "As the phone app, Erevos shows every call on its own screen: who calls, with their photo, over the lock screen too, without unlocking Erevos. Its Phone screen, with the keypad, the calls and the favourites, stays behind Erevos's password, unless you let it open without it, below. Phone calls are plain phone calls: the phone company carries them, as it carries every call.":
    'Como app de telefone, o Erevos mostra cada chamada na própria tela: quem está ligando, com a foto, também sobre a tela de bloqueio, sem desbloquear o Erevos. A tela “Telefone” dele, com o teclado, as chamadas e os favoritos, fica protegida pela senha do Erevos, a menos que você a deixe abrir sem ela, abaixo. As chamadas telefônicas são chamadas comuns: passam pela operadora, como toda chamada.',
  'Make Erevos the phone app': 'Tornar o Erevos o app de telefone',
  'Android did not make Erevos the phone app': 'O Android não tornou o Erevos o app de telefone',
  "Choose Erevos in Android's Default apps → Phone app. If Android says it is a restricted setting, open Erevos's App info, tap ⋮ at the top right → Allow restricted settings, and choose Erevos again.":
    'Escolha o Erevos em “Apps padrão → App de telefone” do Android. Se o Android disser que é uma configuração restrita, abra as informações do app Erevos, toque em ⋮ no canto superior direito → “Permitir configurações restritas”, e escolha o Erevos de novo.',
  "Android did not allow it all. In Erevos's App info, under Permissions, call logs may say Restricted setting: then go back, tap ⋮ at the top right → Allow restricted settings, and allow Phone, Call logs and Contacts under Permissions.":
    'O Android não permitiu tudo. Nas informações do app Erevos, em “Permissões”, o registro de chamadas pode aparecer como “Configuração restrita”: então volte, toque em ⋮ no canto superior direito → “Permitir configurações restritas”, e permita Telefone, Registro de chamadas e Contatos em “Permissões”.',
  'Android holds back part of what the phone app needs': 'O Android nega parte do que o app de telefone precisa',
  'Calls, the SIMs, the call history or the names of your contacts may not show. Android holds this back from an app installed from a browser, until you allow it.':
    'As chamadas, os chips, o histórico de chamadas ou os nomes dos seus contatos podem não aparecer. O Android nega isso a um app instalado pelo navegador, até você permitir.',
  'Allow calls and contacts': 'Permitir chamadas e contatos',
  'So a call that comes shows no Answer and Decline outside the call screen.':
    'Por isso uma chamada recebida não mostra “Atender” e “Recusar” fora da tela de chamada.',
  'Android does not let Erevos show a call that comes over the lock screen: it shows as a notice only.':
    'O Android não deixa o Erevos mostrar uma chamada recebida sobre a tela de bloqueio: ela aparece só como notificação.',
  'This device has no phone part, so it cannot make calls.': 'Este dispositivo não tem a parte de telefone, então não consegue fazer chamadas.',
  'Quick replies': 'Respostas rápidas',
  'Message, on the call screen of a call that rings, declines it with one of these, which the phone sends the caller as an SMS. They are kept on the phone, not sealed, as the call screen shows them with Erevos locked.':
    '“Mensagem”, na tela de uma chamada que está tocando, recusa a chamada com uma destas respostas, que o celular envia por SMS a quem está ligando. Elas ficam guardadas no celular, sem selo, porque a tela de chamada as mostra com o Erevos bloqueado.',
  Remove: 'Remover',
  'Add a reply': 'Adicionar uma resposta',
  'Use the usual replies': 'Usar as respostas de sempre',

  // Opening the Phone without the password (app/phone-settings.tsx, lib/phone-open.ts).
  'Open Erevos': 'Abrir o Erevos',
  'Open the Phone without the password': 'Abrir o Telefone sem a senha',
  "With Erevos locked, the Phone's icon, a tel: link and the notice of a missed call then open the keypad, the calls and the favourites, which Android keeps for every phone app. Anyone holding the unlocked phone sees your calls and favourites, with the names of the phone's contacts only, never those kept only in Erevos or in hidden chats. Calls can be made there, nothing changed; everything else stays behind the password.":
    'Com o Erevos bloqueado, o ícone do Telefone, um link tel: e o aviso de uma chamada perdida abrem então o teclado, as chamadas e os favoritos, que o Android guarda para todo app de telefone. Quem estiver com o celular desbloqueado vê suas chamadas e favoritos, só com os nomes dos contatos do celular, nunca os que só o Erevos ou as conversas ocultas guardam. Dali dá para ligar, sem mudar nada; todo o resto fica protegido pela senha.',
  'The Phone opens without the password.': 'O Telefone abre sem a senha.',
  'Keep the Phone behind the password': 'Proteger o Telefone com a senha de novo',

  // Blocking calls (app/phone-settings.tsx, lib/phone-rules.ts).
  Blocking: 'Bloqueio de chamadas',
  "A blocked call does not ring and leaves no notice; it shows under Blocked in the calls. The telemarketing ranges and your prefixes never block a number in the phone's contacts. What is blocked is the same in every space, and keeps no names.":
    'Uma chamada bloqueada não toca e não deixa notificação; ela aparece em “Bloqueadas”, nas chamadas. As faixas de telemarketing e os seus prefixos nunca bloqueiam um número dos contatos do celular. O que é bloqueado é igual em todos os espaços, e não guarda nomes.',
  'Block telemarketing': 'Bloquear telemarketing',
  'Stop blocking telemarketing': 'Parar de bloquear telemarketing',
  'The numbers these countries keep for telemarketing calls:': 'Os números que estes países reservam para chamadas de telemarketing:',
  France: 'França',
  Spain: 'Espanha',
  Chile: 'Chile',
  India: 'Índia',
  Brazil: 'Brasil',
  'optional for the callers since August 2025': 'opcional para quem faz as chamadas desde agosto de 2025',
  'Numbers starting with': 'Números que começam com',
  Block: 'Bloquear',
  'Type the start of the numbers to block, with the country code or as you dial it here: +33 162 or 0162.':
    'Digite o começo dos números a bloquear, com o código do país ou como você os disca aqui: +33 162 ou 0162.',
  'Erevos does not screen calls yet, so a blocked call rings a moment before Erevos ends it.':
    'O Erevos ainda não filtra chamadas, então uma chamada bloqueada toca por um instante antes de o Erevos encerrá-la.',
  'Let Erevos screen calls': 'Deixar o Erevos filtrar chamadas',
  "Android's own blocked numbers, the same list as under SMS: Android rejects their calls before they ring, and their SMS and MMS. Every space sees the same list.":
    'Os números bloqueados do próprio Android, a mesma lista de “SMS”: o Android rejeita as chamadas deles antes de tocarem, e também os SMS e MMS. Todos os espaços veem a mesma lista.',
  'Only the phone app or the SMS app may see them: make Erevos the phone app above.':
    'Só o app de telefone ou o app de SMS pode vê-los: torne o Erevos o app de telefone acima.',
  'Block a contact group': 'Bloquear um grupo de contatos',
  "The calls of a group's contacts, as your phone's contacts label them, are blocked for a while: for an hour, until tomorrow morning, or until you lift it.":
    'As chamadas dos contatos de um grupo, como os contatos do seu celular os agrupam, ficam bloqueadas por um tempo: por uma hora, até amanhã de manhã ou até você liberar.',
  'Your phone has no contact groups yet.': 'O seu celular ainda não tem grupos de contatos.',
  Lift: 'Liberar',
  '{n} contact': '{n} contato',
  '{n} contacts': '{n} contatos',
  'For an hour': 'Por uma hora',
  'Until tomorrow morning': 'Até amanhã de manhã',
  'Until I lift it': 'Até eu liberar',
  'Blocked until you lift it': 'Bloqueado até você liberar',
  'Blocked until {time}': 'Bloqueado até as {time}',
  'Blocked until tomorrow, {time}': 'Bloqueado até amanhã, às {time}',
  'Calls from the group {group} are blocked': 'As chamadas do grupo {group} estão bloqueadas',
  'Calls from a contact group are blocked': 'As chamadas de um grupo de contatos estão bloqueadas',
};
