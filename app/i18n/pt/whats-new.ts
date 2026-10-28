// The Portuguese of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/pt/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Novidades',
  'What each version changed': 'O que mudou em cada versão',
  'What each version of Erevos changed, the newest first.': 'O que mudou em cada versão do Erevos, da mais nova para a mais antiga.',
  'Not out yet': 'Ainda não lançada',
  'This version': 'Esta versão',
  'For you': 'Para você',
  'Under the hood': 'Nos bastidores',
  // Not out yet.
  '**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).':
    '**Novidades em duas partes**: cada versão diz primeiro o que muda para você e depois o que mudou nos bastidores: correções, velocidade, bateria e segurança por dentro. Veja [Atualizações](#updates).',
  '**A contact\'s SMS no longer stay counted as new**: opening their chat reads all of them, the earlier ones too, not only those that show.':
    '**Os SMS de um contato não ficam mais contados como novos**: abrir a conversa lê todos, também os anteriores, não só os que aparecem.',
  '**A message no longer waits when Tor cannot reach the relay**: with Tor for messages, it goes straight at once, as the Tor settings say. See [Through Tor](#tor).':
    '**Uma mensagem não fica mais esperando quando o Tor não chega ao relay**: com o Tor para as mensagens, ela sai direto na hora, como dizem as configurações do Tor. Veja [Pelo Tor](#tor).',
  '**Background notices no longer stop after a network change**: when the connection of a wait at the relay died on the way (Wi-Fi to mobile data, the relay restarting), Erevos took the relay for one from before, which cannot wait, for the whole run: contacts\' messages then came up to ten minutes late, and hidden chats, closed spaces and hidden rings said nothing until Erevos was restarted. See [Chat through a relay](#relay).':
    '**Os avisos em segundo plano não param mais depois de uma troca de rede**: quando a conexão de uma espera no relay morria no caminho (de Wi-Fi para dados móveis, reinício do relay), o Erevos tomava o relay por um antigo, que não sabe esperar, durante toda a execução: as mensagens dos contatos chegavam até dez minutos atrasadas, e as conversas ocultas, os espaços fechados e os toques ocultos não diziam nada até reiniciar o Erevos. Veja [Conversar por um relay](#relay).',
  '**A call hung up at once no longer rings**: when the hang-up came in the same look as the call, the phone rang 45 seconds for a call nobody was on; the same for a group call its starter left at once. See [Chat through a relay](#relay).':
    '**Uma chamada desligada na hora não toca mais**: quando o desligamento chegava no mesmo olhar que a chamada, o telefone tocava 45 segundos por uma chamada em que não havia ninguém; o mesmo para uma chamada de grupo que quem a começou deixou na hora. Veja [Conversar por um relay](#relay).',
  '**A hidden call rings once**: a place with Receive while closed and a ring queue rang twice for one call, and a call taken while hidden chats were open rang again as they closed. See [Hidden chats](#hidden).':
    '**Uma chamada oculta toca uma vez**: um lugar com Receber quando fechadas e uma fila de toque tocava duas vezes por uma chamada, e uma chamada atendida com as conversas ocultas abertas voltava a tocar quando elas fechavam. Veja [Conversas ocultas](#hidden).',
  '**A member\'s contact link no longer says New message**: the answer to an ask from a group only adds the contact, with no notice. See [Group chats](#groups).':
    '**O link de contato de um membro não diz mais Nova mensagem**: a resposta a um pedido feito de um grupo só adiciona o contato, sem aviso. Veja [Conversas em grupo](#groups).',
  '**The birthday notice and the phone\'s incoming call no longer replace each other**: they had the same notice number. See [Contacts](#contacts).':
    '**O aviso de aniversário e a chamada recebida do telefone não se substituem mais**: tinham o mesmo número de aviso. Veja [Contatos](#contacts).',
  '**A closed space tells of its contacts\' messages too**: since each contact writes to a queue of their own, a space that says a message came while another is open told only of group messages and first messages from new contacts. It now asks about its contacts\' queues too, up to 64. See [Chat through a relay](#relay).':
    '**Um espaço fechado avisa também das mensagens dos contatos dele**: como cada contato escreve numa fila própria, um espaço que avisa que chegou mensagem enquanto outro está aberto só avisava de mensagens de grupos e de primeiras mensagens de contatos novos. Agora ele pergunta também pelas filas dos contatos dele, até 64. Veja [Conversar por um relay](#relay).',
  '**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).':
    '**O guia de uso está em todos os idiomas do app**: aparece no que você escolheu e chama os botões como o app os mostra. Veja [Idioma](#start).',
  '**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).':
    '**Localização encontra onde você está, também em lugares fechados**: o celular procura por satélite e pela rede dele ao mesmo tempo, uma folha diz que está procurando, e quando nada é encontrado diz por quê, com Tentar de novo. Veja [Conversar por um relay](#relay).',
  '**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).':
    '**O ícone do app web conta o que não foi lido**: num iPhone, com as notificações ativas para o espaço, o ícone do Erevos na tela de início mostra quantas mensagens não foram lidas, nunca as de uma conversa oculta, a não ser que você o desligue em Configurações → Notificações → Número no ícone. Veja [Num iPhone](#iphone).',
  "**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).":
    "**Notificações para cada conversa**: no Android, silencie uma conversa ou um grupo por 8 horas, uma semana ou sempre, e dê às mensagens e chamadas dela um som próprio, ou nenhum. Veja [Conversar por um relay](#relay).",
  "**A chat locked with its own PIN stays locked**: when its contact's Erevos started a new conversation, as it does about once a month, the chat lost its PIN, and a public group joined again lost its own. See [Hidden chats](#hidden).":
    "**Uma conversa bloqueada com um PIN próprio continua bloqueada**: quando o Erevos do contato começava uma conversa nova, como faz mais ou menos uma vez por mês, a conversa perdia o PIN, e um grupo público em que você entrou de novo perdia o seu. Veja [Conversas ocultas](#hidden).",
  "**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings → Notifications → Number on the icon turns it off. See [Chat through a relay](#relay).":
    "**O ícone do Erevos guarda o número de mensagens não lidas, no Android**: ao sair do Erevos com mensagens não lidas, uma notificação sem som guarda quantas são até você lê-las, e o launcher a mostra no ícone, como número ou ponto. Configurações → Notificações → Número no ícone o desliga. Veja [Conversar por um relay](#relay).",
  "**The web app's notifications, more dependable**: no New message over Erevos while it is open, and a push held back while the phone was offline no longer counts messages you already read (both with your relay updated), every notice sounds in Chrome, Firefox and Edge, they come back by themselves when the browser changes its push address, and Notifications while closed says when the browser blocks them or your relay was not told yet that they are off. See [On an iPhone](#iphone).":
    "**As notificações do app web, mais confiáveis**: nenhuma Nova mensagem por cima do Erevos enquanto ele está aberto, e um push retido enquanto o celular estava sem conexão não conta mais as mensagens que você já leu (as duas coisas com o seu relay atualizado), cada aviso faz som no Chrome, no Firefox e no Edge, elas voltam sozinhas quando o navegador muda o endereço de push dele, e Notificações com o app fechado diz quando o navegador as bloqueia ou quando o seu relay ainda não foi avisado de que elas estão desativadas. Veja [Num iPhone](#iphone).",
  "**Calls ring in the web app, on the computer and on Sailfish OS**: a call that comes while Erevos is open now rings, where only its screen showed, and vibrates where the phone can. On an iPhone it rings once you have touched Erevos, and not on silent. See [On an iPhone](#iphone).":
    "**As chamadas tocam no app web, no computador e no Sailfish OS**: uma chamada que chega enquanto o Erevos está aberto agora toca, onde antes só aparecia a tela dela, e vibra onde o telefone pode. Num iPhone ela toca depois que você tocou no Erevos, e não no silencioso. Veja [Num iPhone](#iphone).",
  '**Erevos on a computer keeps running with its window closed**: in the system tray (on a Mac, in the Dock) it goes on receiving, a call rings and brings the window back, and a notification says how many messages are not read, never who or what. Turn it off under Settings → Notifications → In the background. See [On a computer](#desktop).':
    '**O Erevos no computador continua rodando com a janela fechada**: na bandeja do sistema (num Mac, no Dock) ele continua recebendo, uma chamada toca e traz a janela de volta, e uma notificação diz quantas mensagens não foram lidas, nunca de quem nem o quê. Desligue em Configurações → Notificações → Em segundo plano. Veja [Num computador](#desktop).',
  "**Erevos on Sailfish OS tells of messages and calls while it is closed**: while it is out of sight or closed, a small helper waits at the relay for the open space, a notification says how many messages came, never who or what, and a call rings with the phone's ringtone. See [On Sailfish OS](#sailfish).":
    "**O Erevos no Sailfish OS avisa de mensagens e chamadas enquanto está fechado**: enquanto não está à vista ou está fechado, um pequeno ajudante espera no relay pelo espaço aberto, uma notificação diz quantas mensagens chegaram, nunca de quem nem o quê, e uma chamada toca com o toque do celular. Veja [No Sailfish OS](#sailfish).",
  "**The relay's pushes to the web app, sturdier**: a push the push service could not take just then is sent again, a call goes before the messages waiting their turn, and whoever runs the relay can allow another push service. Your relay needs an update for it.":
    "**Os pushes do relay para o app web, mais robustos**: um push que o serviço de push não pôde aceitar naquele momento é enviado de novo, uma chamada passa na frente das mensagens que esperam a vez delas, e quem cuida do relay pode permitir outro serviço de push. O seu relay precisa de uma atualização para isso.",
  "**Permissions checks every notice Erevos uses**: on Android, the message notice without sound or with a chat's own sound, and the reminders', turned off, now show there, with a button to each. See [Chat through a relay](#relay).":
    "**Permissões verifica cada aviso que o Erevos usa**: no Android, o aviso de mensagens sem som ou com o som próprio de uma conversa, e o dos lembretes, quando desativados, agora aparecem ali, com um botão para cada um. Veja [Conversar por um relay](#relay).",
  '**Hidden chats say what their switches need**: Say when a message comes and Ring calls when closed say so when Settings → Notifications → In the background lets them do nothing. See [Hidden chats](#hidden).':
    '**As conversas ocultas dizem do que os interruptores delas precisam**: Avisar quando chega uma mensagem e Tocar as chamadas quando fechadas avisam quando Configurações → Notificações → Em segundo plano não as deixa fazer nada. Veja [Conversas ocultas](#hidden).',
  "**Truer words about notices**: Settings and the guide give the notices' own words and say what each one needs. See [Chat through a relay](#relay).":
    "**Palavras mais fiéis sobre os avisos**: as Configurações e o guia dão as próprias palavras dos avisos e dizem do que cada um precisa. Veja [Conversar por um relay](#relay).",
  "**Calls ring as they should**: with Do Not Disturb only when their notice may break through, with a phone's clock off too once the relay is updated, and to the end on Android 7 and 8; a second call is told busy, and a ring stops only for its own call. See [Chat through a relay](#relay).":
    "**As chamadas tocam como devem**: com o Não perturbe só quando o aviso delas pode passar por ele, também com o relógio de um celular errado assim que o relay for atualizado, e até o fim no Android 7 e 8; uma segunda chamada recebe sinal de ocupado, e um toque só para por causa da própria chamada. Veja [Conversar por um relay](#relay).",
  '**Hidden calls**: one turned down no longer leaves Erevos over the lock screen, one that comes while the password screen shows comes over it, and none rings twice. See [Hidden chats](#hidden).':
    '**Chamadas ocultas**: uma recusada não deixa mais o Erevos sobre a tela de bloqueio, uma que chega enquanto a tela da senha aparece vem por cima dela, e nenhuma toca duas vezes. Veja [Conversas ocultas](#hidden).',
  '**Notices come again at once after a change of network**, and receiving starts again as Erevos shows when Android refused it. See [Chat through a relay](#relay).':
    '**Os avisos voltam a chegar na hora depois de uma mudança de rede**, e o recebimento começa de novo quando o Erevos aparece na tela, se o Android o tinha recusado. Veja [Conversar por um relay](#relay).',
  "**Hidden chats' notices tell each message once**: what came since a place last looked is told as it closes, a call that rang is not told again as a message, and a place whose queue the relay lost keeps its switch on. See [Hidden chats](#hidden).":
    "**Os avisos das conversas ocultas falam de cada mensagem uma vez**: o que chegou desde a última vez que uma posição olhou é avisado quando ela fecha, uma chamada que tocou não é avisada de novo como mensagem, e uma posição cuja fila o relay perdeu mantém o interruptor dela ativado. Veja [Conversas ocultas](#hidden).",
  '**Hidden chats close while Erevos is away**, after 30 seconds, so a call to them meanwhile rings with their PIN to answer. See [Hidden chats](#hidden).':
    '**As conversas ocultas fecham enquanto o Erevos está fora da tela**, depois de 30 segundos, então uma chamada para elas nesse meio-tempo toca com o PIN delas para atender. Veja [Conversas ocultas](#hidden).',
  '**A voice message counts once**, on its last part, also when it goes again whole.':
    '**Uma mensagem de voz conta uma vez**, na última parte dela, também quando ela vai de novo inteira.',
  '**The number on the icon counts only what is still there**: a message deleted for everyone, or read on a linked computer, no longer counts. See [Chat through a relay](#relay).':
    '**O número no ícone conta só o que ainda está lá**: uma mensagem apagada para todos, ou lida num computador conectado, deixa de contar. Veja [Conversar por um relay](#relay).',
  '**Messages sent for later** tell of themselves only while their space is open, without sound if sent so.':
    '**As mensagens agendadas** só avisam de si enquanto o espaço delas está aberto, sem som se foram enviadas assim.',
  '**SMS**: one to the chat on screen only sounds there, they are marked read only while their screen shows, and Android names their notices SMS. See [SMS](#sms).':
    '**SMS**: um para a conversa na tela só toca ali, eles só são marcados como lidos enquanto a tela deles aparece, e o Android chama os avisos deles de SMS. Veja [SMS](#sms).',
  "**Reminders**: one seen in Chat with myself goes from the notice, a hidden place's go with a new PIN, and birthdays come at 9:00. See [Getting started](#start).":
    "**Lembretes**: um visto na Conversa comigo sai do aviso, os de uma posição oculta saem com um PIN novo, e os aniversários chegam às 9:00. Veja [Primeiros passos](#start).",
  '**Nostr reads as soon as Tor is ready.** See [Through Nostr](#nostr).':
    '**O Nostr lê assim que o Tor está pronto.** Veja [Pelo Nostr](#nostr).',
  "**Erevos's notices show its mark** in the status bar.":
    "**Os avisos do Erevos mostram a marca dele** na barra de status.",
  '**Notices are asked for with receiving off too**, when Say a message came is on.':
    '**Os avisos são pedidos também com o recebimento desativado**, quando Avisar quando chega mensagem está ativado.',
  "**Photos open on the whole screen**: tap one to see it edge to edge, zoom in with two fingers or a double tap, and tap again to hide or show what is around it; big photos open as small ones do. Erevos also turns with the phone while the phone's Auto-rotate is on, and a photo shown on its own even when it is off. See [Chat through a relay](#relay).":
    '**As fotos abrem na tela inteira**: toque numa para vê-la de ponta a ponta, amplie com dois dedos ou um toque duplo, e toque de novo para esconder ou mostrar o que há em volta; fotos grandes abrem como as pequenas. O Erevos também gira com o telefone enquanto Girar automaticamente estiver ativado nele, e uma foto vista sozinha mesmo quando está desativado. Veja [Conversar por um relay](#relay).',
  "**Matrix accounts in Erevos**: sign a space in to Matrix and chat with people who use Element or another Matrix app, end-to-end encrypted, under Settings → Relay and networks → Matrix. These chats are not anonymous, and say so: the Matrix server sees who talks with whom. Text, photos and files. See [Matrix](#matrix).":
    "**Contas Matrix no Erevos**: entre no Matrix com um espaço e converse com pessoas que usam o Element ou outro app Matrix, com criptografia de ponta a ponta, em Configurações → Relay e redes → Matrix. Essas conversas não são anônimas, e avisam: o servidor Matrix vê quem fala com quem. Texto, fotos e arquivos. Veja [Matrix](#matrix).",
  "**Every network's chats on the home screen**: once you sign in to Matrix, its chats are in the list with the Erevos chats and the SMS, newest first, each marked Matrix, and the Matrix chip shows them alone, as SMS and Erevos do. See [Matrix](#matrix).":
    "**As conversas de todas as redes na tela inicial**: depois que você entra no Matrix, as conversas dele ficam na lista com as conversas do Erevos e os SMS, as mais recentes primeiro, cada uma marcada Matrix, e o chip Matrix mostra só elas, como SMS e Erevos. Veja [Matrix](#matrix).",
  '**Test versions before a release**: Erevos reads a version such as 4.0.0-rc.1, a test version that comes before 4.0.0, when it looks for updates, tells of a new version and shows what is new. See [Updates](#updates).':
    '**Versões de teste antes de uma versão**: o Erevos lê uma versão como 4.0.0-rc.1, uma versão de teste que vem antes da 4.0.0, ao procurar atualizações, ao avisar de uma nova versão e ao mostrar as novidades. Veja [Atualizações](#updates).',
  "**Check Matrix devices by emoji**: in a chat with one person on Matrix, Check by emoji shows you both seven pictures; if they match, nobody sits in between, and Element sees the check too. Check this device with another of yours makes your own Element trust Erevos. See [Matrix](#matrix).":
    "**Verificar dispositivos do Matrix por emoji**: numa conversa com uma pessoa no Matrix, Verificar por emoji mostra aos dois sete imagens; se forem iguais, ninguém está no meio, e o Element também vê a verificação. Verificar este dispositivo com outro seu faz o seu próprio Element confiar no Erevos. Veja [Matrix](#matrix).",
  "**Automatic backups to your own server too**: on Android, each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. Off until you add one. The server gets random bytes under a random name and cannot open them; it still sees your account, your address and when. See [Backups](#backup).":
    "**Backups automáticos também para o seu próprio servidor**: no Android, cada backup automático também pode ir para uma pasta num servidor que você escolher, como o seu Nextcloud, por WebDAV. Desligado até você adicionar um. O servidor recebe bytes aleatórios com um nome aleatório e não consegue abri-los; ainda assim vê sua conta, seu endereço e quando. Veja [Backups](#backup).",
  "**Matrix Security Key and key backup**: enter the Security Key Element made, under Settings → Relay and networks → Matrix, and earlier messages open, new keys are backed up, and your other devices trust Erevos. An account with none can set one up there. See [Matrix](#matrix).":
    "**Chave de segurança e backup de chaves do Matrix**: digite a chave de segurança que o Element criou, em Configurações → Relay e redes → Matrix, e as mensagens anteriores abrem, as chaves novas ganham backup, e seus outros dispositivos confiam no Erevos. Uma conta sem ela pode criar uma ali. Veja [Matrix](#matrix).",
  "**Matrix through Tor**: on Android, a space's Matrix account follows its choice under Settings → Relay and networks → Tor, so the Matrix server no longer sees where you are; the Matrix screen says when it goes through Tor. See [Matrix](#matrix).":
    "**Matrix pelo Tor**: no Android, a conta Matrix de um espaço segue a escolha dele em Configurações → Relay e redes → Tor, então o servidor Matrix não vê mais onde você está; a tela do Matrix diz quando vai pelo Tor. Veja [Matrix](#matrix).",
  "**XMPP accounts in Erevos**: sign a space in to XMPP, under Settings → Relay and networks → XMPP, and chat with people who use Conversations, Monal, Gajim, Dino or another XMPP app, encrypted with OMEMO. These chats are not anonymous, and say so: the XMPP server sees who talks with whom. Text with delivery and read marks, in the home list under an XMPP chip of its own, and through Tor on Android as you chose. See [XMPP](#xmpp).":
    "**Contas XMPP no Erevos**: faça um espaço entrar no XMPP, em Configurações → Relay e redes → XMPP, e converse com pessoas que usam o Conversations, o Monal, o Gajim, o Dino ou outro app XMPP, criptografado com OMEMO. Essas conversas não são anônimas, e dizem isso: o servidor XMPP vê quem fala com quem. Texto com marcas de entrega e de leitura, na lista da tela inicial sob um chip XMPP próprio, e pelo Tor no Android como você escolheu. Veja [XMPP](#xmpp).",
  "**Voice and video calls with people on XMPP**: the two tiles at the top of an XMPP chat call the person, and their calls ring on the same screen as Erevos's own, with apps that call as Conversations does. The call goes through your call relay or the XMPP server's, so they do not learn your address; the key that proves it passes through the XMPP servers, which could put themselves in between. See [XMPP](#xmpp).":
    "**Chamadas de voz e vídeo com pessoas no XMPP**: os dois blocos no topo de uma conversa XMPP ligam para a pessoa, e as chamadas dela tocam na mesma tela que as do Erevos, com apps que ligam como o Conversations. A chamada passa pelo seu relay de chamadas ou pelo do servidor XMPP, então ela não fica sabendo seu endereço; a chave que a comprova passa pelos servidores XMPP, que poderiam se colocar no meio. Veja [XMPP](#xmpp).",
  "**Voice and video calls with people on Matrix**: on Android, the two tiles at the top of a Matrix chat call with Element Call, the call app of Element and Element X, which opens inside Erevos in a window of its own, and their calls ring here as Erevos's own do. Sound and picture are end-to-end encrypted and go through the media server your Matrix server names, never through Tor. See [Matrix](#matrix).":
    "**Chamadas de voz e vídeo com pessoas no Matrix**: no Android, os dois blocos no topo de uma conversa Matrix ligam com o Element Call, o app de chamadas do Element e do Element X, que abre dentro do Erevos numa janela própria, e as chamadas delas tocam aqui como as do Erevos. Som e imagem são criptografados de ponta a ponta e passam pelo servidor de mídia que o seu servidor Matrix indica, nunca pelo Tor. Veja [Matrix](#matrix).",
  "**Chats with people on other Nostr apps**: give a space a Nostr key of its own, under Settings → Relay and networks → Nostr chats, and chat one to one with people who use Damus, Amethyst, Primal, 0xchat or another Nostr app, encrypted as NIP-17 asks: the relays see whom a message is for, not who wrote it. These chats are not anonymous, and say so: your key is the same to everyone you write to. Text, in the home list under a Nostr chip of its own, and through Tor on Android as you chose. See [Chats with other Nostr apps](#nostr-chats).":
    "**Conversas com pessoas em outros apps Nostr**: dê a um espaço uma chave Nostr própria, em Configurações → Relay e redes → Conversas Nostr, e converse a dois com pessoas que usam Damus, Amethyst, Primal, 0xchat ou outro app Nostr, criptografado como o NIP-17 pede: os relays veem para quem é uma mensagem, não quem a escreveu. Estas conversas não são anônimas, e dizem isso: sua chave é a mesma para todos com quem você fala. Texto, na lista da tela inicial sob um botão Nostr próprio, e pelo Tor no Android como você escolheu. Veja [Conversas com outros apps Nostr](#nostr-chats).",
  "**Notices for Matrix, XMPP and Nostr messages**: a message in a chat on Matrix, XMPP or Nostr shows a notice and counts in the number on Erevos's icon, as in Erevos's own chats. On Android, Notifications at the bottom of such a chat mutes it or gives it a sound of its own, and an XMPP call rings with its chat's ringtone. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats).":
    "**Avisos das mensagens de Matrix, XMPP e Nostr**: uma mensagem numa conversa de Matrix, XMPP ou Nostr mostra um aviso e conta no número do ícone do Erevos, como nas conversas do próprio Erevos. No Android, Notificações, no fim de uma conversa assim, silencia ela ou dá a ela um som próprio, e uma chamada XMPP toca com o toque da conversa dela. Veja [Matrix](#matrix), [XMPP](#xmpp) e [Conversas com outros apps Nostr](#nostr-chats).",
  // 3.4.2
  '**A message sent as a chat opens waits for it**, marked Sending…, and goes as soon as the chat is open, never saying that Erevos cannot encrypt.':
    '**Uma mensagem enviada enquanto uma conversa abre espera por ela**, marcada Enviando…, e vai assim que a conversa abre, sem dizer que o Erevos não pode criptografar.',
  '**What you read as a chat opens stays read**: the home screen no longer counts it as new.':
    '**O que você lê enquanto uma conversa abre fica lido**: a tela inicial não conta mais como novo.',
  '**No question from Samsung about its sharing**: on a Samsung phone, Wi-Fi Aware and the Wi-Fi with phones nearby stay off until you turn them on. See [Chat with a nearby phone](#nearby).':
    '**Nenhuma pergunta da Samsung sobre o compartilhamento dela**: em um celular Samsung, o Wi-Fi Aware e a rede Wi-Fi com celulares por perto ficam desligados até você ligá-los. Veja [Conversar com um celular por perto](#nearby).',
  '**The SMS field keeps its width on a small screen**: Photo and Send beside it are round buttons, as in a chat.':
    '**O campo do SMS mantém a largura numa tela pequena**: Foto e Enviar ao lado são botões redondos, como numa conversa.',
  // 3.4.1
  '**Send answers at once**: a short buzz as you press it, the field empties and the message shows, marked Sending…, so it never goes twice.':
    '**Enviar responde na hora**: uma vibração curta ao tocar, o campo se esvazia e a mensagem aparece, marcada Enviando…, então nunca sai duas vezes.',
  '**The screen no longer stays pushed up** after the keyboard closed behind a sheet, a dialog or another app.':
    '**A tela não fica mais empurrada para cima** depois que o teclado se fechou atrás de um painel, de um diálogo ou de outro app.',
  '**Importing a chat with its photos no longer freezes Erevos**: the screen moves while the files come in, says what share of them is in, and **Cancel** stops it. A chat moved into hidden chats takes the chats imported into it along. See [Imported chats](#import).':
    '**Importar uma conversa com suas fotos não trava mais o Erevos**: a tela responde enquanto os arquivos chegam, diz que parte já chegou e **Cancelar** interrompe. Uma conversa movida para as conversas ocultas leva junto as conversas importadas nela. Veja [Conversas importadas](#import).',
  // 3.4.0
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**O seu relay prova a própria chave**: cada conexão com ele começa com uma verificação em que só passa o relay que tem essa chave, então ninguém no meio pode se passar por ele. Depois que ele prova uma vez, o Erevos nunca mais se conecta a ele sem a verificação. Para isso, o seu relay precisa de uma atualização.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Transparência](#transparency), uma nova parte do guia: o que o servidor por trás do Erevos guarda e por quanto tempo, o que ele não guarda e quem mais vê alguma coisa.',
  "**What's new**: this list, in Settings → General, by version.": '**Novidades**: esta lista, em Configurações → Geral, por versão.',
  "**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through.":
    "**Nada aparece atrás do PIN de uma conversa**: nenhuma mensagem de uma conversa bloqueada com um PIN é mostrada antes de o PIN ser digitado, e com vidro, um papel de parede ou um estilo com cena própria, a tela do PIN é um fosco denso que não deixa ver nada.",
  "**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat.":
    "**Videochamada de grupo no topo do grupo**: uma câmera azul ao lado do fone verde, como na conversa com um contato.",
  "**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it.":
    "**Uma fila do relay para cada contato**: cada contato escreve numa fila que só ele conhece, então o relay não consegue saber que dois contatos escrevem para o mesmo telefone, e apagar ou bloquear alguém apaga só a dele. Seu relay precisa ser atualizado para isso.",
  "**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden).":
    "**As conversas ocultas, mais como as outras**: fecham após 30 segundos em segundo plano, não de imediato, e nunca durante uma chamada nem enquanto você escolhe uma foto ou um arquivo; abertas, uma mensagem toca o seu som, e as pré-visualizações de links têm ali um interruptor próprio. Veja [Conversas ocultas](#hidden).",
  "**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden).":
    "**Conversas ocultas que recebem quando fechadas**: um interruptor no topo de cada lugar, ligado nos lugares novos, faz com que recebam como as suas outras conversas: os contatos delas veem na hora que uma mensagem chegou, um aviso diz só “Nova mensagem”, e uma chamada toca sem nome. Veja [Conversas ocultas](#hidden).",
  "**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden).":
    "**As conversas ocultas também aguardam e importam**: o que não pode sair agora aguarda, marcado “Aguardando”, e sai sozinho pelo relay delas; “Enviar mais tarde” funciona ali como nas suas outras conversas; e uma conversa do Telegram, WhatsApp ou Viber pode ser importada para uma conversa oculta, guardada só ali. Veja [Conversas ocultas](#hidden).",
  "**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden).":
    "**As conversas ocultas em lista como as suas conversas**: abrem numa lista como a da tela inicial, com o que foi dito por último e quantas não foram lidas, e cada posição tem no topo a sua própria Conversa comigo. Veja [Conversas ocultas](#hidden).",
  "**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden).":
    "**Mais nas conversas ocultas**: com Receber quando fechadas, o que lhes chega pelo Nostr também é lido enquanto estão fechadas; e lá é possível adicionar um contato a partir de uma foto do código QR dele e dar uma foto a um contato oculto. Veja [Conversas ocultas](#hidden).",
  "**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden).":
    "**Conversas ocultas sem relay**: como as suas outras conversas, podem começar só pelo Nostr: o link de contato e o código QR delas dizem onde leem lá, e textos e reações vão para lá. Veja [Conversas ocultas](#hidden).",
  "**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden).":
    "**Grupos nas conversas ocultas**: abaixo da lista delas, Novo grupo cria um grupo com os contatos delas; ele aparece entre as conversas delas, passa só pelo relay delas e é lido enquanto estão fechadas se Receber quando fechadas estiver ativado. Veja [Conversas ocultas](#hidden).",
  "**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy).":
    "**Sem a linha de versão de teste**: a tela inicial não termina mais dizendo que esta é uma versão de teste. O guia continua dizendo exatamente o que está protegido, e que nada foi auditado ainda. Veja [O que está protegido hoje](#privacy).",
  "**The contacts menu in hidden chats**: their Contacts has a menu again, with what is theirs only: a .vcf file imported into them, their contacts saved as a .vcf file, and a contact's QR code read from a photo. An Erevos ID typed there adds them to the hidden chats. See [Contacts](#contacts).":
    "**O menu de contatos nas conversas ocultas**: os Contatos delas voltam a ter um menu, só com o que é delas: um arquivo .vcf importado nelas, seus contatos salvos como arquivo .vcf e o código QR de um contato lido de uma foto. Um ID do Erevos digitado ali adiciona a pessoa às conversas ocultas. Veja [Contatos](#contacts).",
  // 3.3.2
  '**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.':
    '**O botão de chamada comum para mais contatos**: o teclado laranja no topo da conversa de um contato também usa o número do contato a que você o vinculou (**Vincular a um dos meus contatos**), primeiro o celular.',
  // 3.3.1
  '**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.':
    '**Conversas do Viber podem ser importadas**: do arquivo HTML do app Android Backup Text for Viber, só os textos.',
  // 3.3.0
  '**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.':
    '**Começar sem relay, pelo Nostr**: **Começar sem relay** em Nova conversa. Textos, figurinhas, reações, edições e as marcas de entregue e lida vão pelo Nostr, via Tor. Fotos, mensagens de voz, arquivos e chamadas ainda precisam de um relay ou de um celular por perto.',
  '**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.':
    '**O relay chega sozinho**: quem tem um relay que faz convites envia uma vez um convite a um contato sem relay, dentro da conversa, e o outro celular o aceita sozinho.',
  '**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.':
    '**Aviso quando sai uma versão nova** (Android): uma vez por dia o Erevos pergunta ao servidor do LPHL e então mostra uma linha fixada do Erevos e uma notificação, só para uma versão assinada pelo computador de versões. Dá para desativar em Configurações → Geral → Atualizações.',
  '**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.':
    '**Bloquear uma conversa com um PIN**: Detalhes → Bloquear com um PIN, para conversas e grupos. Nada dela aparece na busca, nas mensagens favoritas nem nas importações. Nas conversas ocultas, não pede PIN.',
  '**A new handset** on the green tiles: Phone, and the call in a chat.': '**Um novo ícone de fone** nos blocos verdes: Telefone, e a chamada em uma conversa.',
  '**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.':
    '**Uma nova tela de Nova conversa**: Como você se conecta agora no topo, três cartões grandes para um celular sem relay (Tenho um convite, Entrar com LPHL, Começar sem relay) e a parte técnica em Para usuários avançados.',
  '**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.':
    '**Nostr mais estável pelo Tor**: cada relay Nostr tem o próprio caminho pelo Tor e, depois de uma falha, tenta uma nova saída. Um erro mais claro na tela do Nostr.',
  '**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.':
    '**Quando a conexão com o relay cai** enquanto o Erevos espera por ele, o Erevos percebe e se conecta de novo, onde antes ficava travado.',
  '**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.':
    '**Convidar por SMS** (Android): no cartão de um contato do celular, para uma pessoa, por 2 dias. O link abre uma página que oferece o Erevos (o APK para Android, o app web para iPhone ou computador) e depois abre o convite. O código QR e Compartilhar o convite continuam como estavam.',
  '**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.':
    '**Correções no convite por SMS**: um link copiado como /i/#… também funciona, um app web mais antigo também abre o convite e, no iOS 26, avisa que Compartilhar fica em •••.',
  '**A phone call button** in Erevos chats and SMS chats.': '**Um botão de chamada telefônica** nas conversas do Erevos e nas conversas por SMS.',
  // 3.2.1
  '**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.':
    '**Editar uma mensagem** que você enviou, até um dia depois: para contatos, grupos e dispositivos conectados, com Editada ao lado do horário.',
  '**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.':
    '**O Nostr diz o que fez**: Enviada pelo Nostr, e na tela do Nostr o que cada relay fez por último.',
  '**Coloured call buttons** at the top of a chat: video blue, voice green.': '**Botões de chamada coloridos** no topo de uma conversa: vídeo azul, voz verde.',
  // 3.2.0
  'Arrows to the start and the end of a chat; earlier messages come by themselves as you scroll.':
    'Setas para o início e o fim de uma conversa; as mensagens mais antigas carregam sozinhas conforme você rola.',
  'Chats imported from Telegram and WhatsApp look like Erevos messages: bubbles, days, photos, voice messages, search.':
    'As conversas importadas do Telegram e do WhatsApp aparecem como mensagens do Erevos: balões, dias, fotos, mensagens de voz, busca.',
  'Dogs instead of cats in the stickers.': 'Cachorros em vez de gatos nas figurinhas.',
  'Screenshots: a switch in Settings → Privacy and security.': 'Capturas de tela: uma opção em Configurações → Privacidade e segurança.',
  'Hidden chats from New chat: hold it for a second.': 'Conversas ocultas a partir de Nova conversa: mantenha pressionado por um segundo.',
  'Coloured tiles on the home screen: Phone green, Contacts violet, the lock orange.': 'Blocos coloridos na tela inicial: Telefone verde, Contatos roxo, o cadeado laranja.',
  '**Chat with myself**, always first, and **Remind me**, the orange bell.': '**Conversa comigo**, sempre em primeiro, e **Lembrar-me**, o sino laranja.',
  '**Media, links and files** in a chat’s Details, with a calendar and Go to a day.':
    '**Mídia, links e arquivos** nos Detalhes de uma conversa, com um calendário e Ir para um dia.',
  'Import a chat from inside the chat: Details → Imported chats.': 'Importar uma conversa de dentro da própria conversa: Detalhes → Conversas importadas.',
  'A closed space can say that a message came while another space is open.': 'Um espaço fechado pode avisar que chegou uma mensagem enquanto outro espaço está aberto.',
  'The message menu says when a message went or came through Nostr.': 'O menu da mensagem diz quando uma mensagem foi ou veio pelo Nostr.',
  '**Support Erevos**: Liberapay, PayPal, Monero, Bitcoin.': '**Apoiar o Erevos**: Liberapay, PayPal, Monero, Bitcoin.',
  'Who makes Erevos and why, in About Erevos; the guide says why everywhere.': 'Quem faz o Erevos e por quê, em Sobre o Erevos; o guia explica o porquê em toda parte.',
  // 3.1.2
  '**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.':
    '**Configurações em 8 grupos**, com busca: Geral, Aparência, Notificações, Privacidade e segurança, Relay e redes, Telefone e SMS, Dados e dispositivos, Para testes. O ⋯ da tela inicial fica só com os lugares, e Configurações por último.',
  // 3.1.1
  'Check for updates says what stopped an update.': 'Procurar atualizações diz o que impediu uma atualização.',
  'Invite someone is not made from a token for all; it asks you to sign in to the relay first.':
    'Convidar alguém não usa mais um token compartilhado; antes, pede que você entre no relay.',
  'The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).':
    'O token compartilhado do relay vira sozinho um token próprio do celular (precisa do relay atualizado).',
  'A relay that refuses through Tor says why.': 'Um relay que recusa pelo Tor diz por quê.',
  // 3.1.0
  'Less battery in the background: the relay, Tor and the nearby radios.': 'Menos bateria em segundo plano: o relay, o Tor e os rádios para celulares por perto.',
  'Erevos no longer closes when you make a sticker from a photo.': 'O Erevos não fecha mais quando você faz uma figurinha a partir de uma foto.',
  'Hidden chats’ notices are right.': 'As notificações das conversas ocultas estão corretas.',
  'Hidden chats by holding New chat.': 'Conversas ocultas mantendo Nova conversa pressionado.',
  'A search for contacts on the Phone.': 'Busca de contatos no Telefone.',
  'New chat shows first how to add a contact.': 'Nova conversa mostra primeiro como adicionar um contato.',
  'A call shows over the screen saver, and the screen wakes.': 'Uma chamada aparece sobre o protetor de tela, e a tela acende.',
  'Erevos in other apps’ Share.': 'O Erevos no Compartilhar dos outros apps.',
  'A sound for every new message, also while Erevos shows.': 'Um som para cada mensagem nova, também com o Erevos na tela.',
  'The SMS settings say right what holding does.': 'As configurações de SMS dizem corretamente o que acontece ao manter pressionado.',
  // 3.0.0
  'Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.': 'Cada ícone abre o que o nome diz: Erevos, SMS, Telefone, Contatos, o widget.',
  '**Messages through Tor by default**: Messages, Everything or Nothing.': '**Mensagens pelo Tor por padrão**: Mensagens, Tudo ou Nada.',
  '**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.':
    '**Textos pelo Nostr**: três relays públicos, pelo Tor, com o seu próprio relay como reserva depois de 5 minutos.',
  // 2.0.3
  'One invite for everything: the relay and the contact together.': 'Um convite para tudo: o relay e o contato juntos.',
  'Spam rules for senders and numbers abroad, with the reason.': 'Regras de spam para remetentes e números do exterior, com o motivo.',
  '480 stickers in 20 sets.': '480 figurinhas em 20 pacotes.',
  'Lighter chats on older phones; QR codes at once.': 'Conversas mais leves em celulares antigos; códigos QR na hora.',
  'Copy code for one-time codes in SMS.': 'Copiar código para os códigos de uso único nos SMS.',
  'Locked, Erevos keeps receiving.': 'Bloqueado, o Erevos continua recebendo.',
  'Faster contacts; the hidden chats’ notice counts only messages.': 'Contatos mais rápidos; a notificação das conversas ocultas conta só mensagens.',
  'The relay tries every address: push, other relays, the LPHL sign-in.': 'O relay tenta todos os endereços: push, outros relays, o login do LPHL.',
  // 2.0.2
  'Swiping on the tabs only changes the tab.': 'Deslizar nas abas só troca de aba.',
  'The icons fill the launcher’s shape.': 'Os ícones preenchem o formato do launcher.',
  // 2.0.1
  'Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.':
    'Ícones coloridos (Erevos vermelho, Telefone verde, SMS azul, Contatos roxo) e um novo ícone de SMS.',
  'A colour for each icon, and the order of the widget’s buttons.': 'Uma cor para cada ícone, e a ordem dos botões do widget.',
  'Swipe to go back, and between tabs.': 'Deslizar para voltar, e entre as abas.',
  // 2.0.0
  'An update of the WebView no longer closes Erevos.': 'Uma atualização do WebView não fecha mais o Erevos.',
  'Deleting or blocking a contact gives you a new queue on the relay.': 'Apagar ou bloquear um contato dá a você uma nova fila no relay.',
  'A new contact can take the name of a contact on the phone.': 'Um novo contato pode usar o nome de um contato do celular.',
  '**Sign in to the relay with LPHL**, and **invites to the relay**.': '**Entrar no relay com LPHL**, e **convites para o relay**.',
  'Permissions in the web app, and more on Android; the web app’s notice says how many came.':
    'Permissões no app web, e mais no Android; a notificação do app web diz quantas mensagens chegaram.',
  'Hidden chats can ring calls while they are closed.': 'As conversas ocultas podem tocar as chamadas enquanto estão fechadas.',
  'New keys every month in chats, every week in groups.': 'Chaves novas todo mês nas conversas, toda semana nos grupos.',
  'Linked devices work with the phone off.': 'Os dispositivos conectados funcionam com o celular desligado.',
  'A new chat screen; QR codes from a photo; the Phone for small screens.': 'Uma nova tela de conversa; códigos QR a partir de uma foto; o Telefone para telas pequenas.',
  'Add as contact inside a group.': 'Adicionar como contato dentro de um grupo.',
  'Stickers in sets, moving, and your own.': 'Figurinhas em pacotes, animadas, e as suas próprias.',
  'SMS inside the Erevos chat.': 'SMS dentro da conversa do Erevos.',
  'Android updates need the release computer’s signature.': 'As atualizações para Android precisam da assinatura do computador de versões.',
  'An F-Droid build; Serbo-Croatian; new version numbers.': 'Uma versão para o F-Droid; servo-croata; novos números de versão.',
  'Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.':
    'Muito para a segurança: Argon2id, mensagens criptografadas também para o relay, um token para cada celular, nenhum link inicia uma chamada.',
  // 0.1.16
  'Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.': 'As importações do Telegram e do WhatsApp trazem fotos, vídeos, mensagens de voz e arquivos.',
  'A phone without a relay talks through a place on a contact’s relay.': 'Um celular sem relay se comunica por um lugar no relay de um contato.',
  // 0.1.14
  'Back to my chats, for hidden chats.': 'Voltar para minhas conversas, para as conversas ocultas.',
  'Erevos receives and rings even after you swipe it away from the recent apps.': 'O Erevos recebe e toca mesmo depois que você o fecha nos apps recentes.',
  // 0.1.12
  'Hidden chats can say a message came.': 'As conversas ocultas podem avisar que chegou uma mensagem.',
  'Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.': 'Correções: menus, códigos QR a partir de uma foto, Bluetooth no Android 17, listas longas.',
  // 0.1.11
  'The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.':
    'O Telefone sem a senha, se você permitir; um widget para a tela inicial; um filtro de SMS e Erevos.',
  // 0.1.10
  'Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.': 'Os links esperam a senha; ícones de Telefone e Contatos; o ID do Erevos em um contato.',
  // 0.1.8
  '61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.':
    '61 recursos novos: 5 idiomas novos, dispositivos conectados, grupos públicos, respostas, reações, enquetes, enviar mais tarde, o Erevos como app de telefone e de contatos, pontes do Tor, a impressão digital, Windows e mais.',
  // 0.1.7 to 0.1.2
  'SMS notices in the background.': 'Notificações de SMS em segundo plano.',
  'The web app comes out with every release.': 'O app web sai junto com cada versão.',
  'Greek in the whole app.': 'Grego no app inteiro.',
  'Web Push in the web app.': 'Web Push no app web.',
  'The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.':
    'A primeira versão assinada para Android: conversas criptografadas, chamadas, grupos, conversas ocultas, backups, importações e celulares por perto sem internet.',
  "**Two new sticker sets of 24 moods**: **Tux**, the Linux penguin as he is drawn, and **Aikido**, an aikidoka in keikogi and a wide hakama, who also bows, sits in seiza and rolls.":
    "**Dois novos conjuntos de figurinhas com 24 humores**: **Tux**, o pinguim do Linux tal como é desenhado, e **Aikido**, um aikidoka de keikogi e hakama largo, que também se curva, senta-se em seiza e rola.",
};
