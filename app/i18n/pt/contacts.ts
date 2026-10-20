// The Portuguese of the Contacts screens: the phone's contacts, their groups, merging, vCards, QR codes,
// birthdays and contacts kept only in Erevos (app/contacts.tsx and what goes with it) (i18n/pt/index.ts).
export const contacts: Record<string, string> = {
  "The phone's contacts, their groups and birthdays": 'Os contatos do celular, os grupos e os aniversários deles',
  'This build of Erevos has no contacts part yet. It comes with the next build of the app.':
    'Esta versão do Erevos ainda não tem a parte de contatos. Ela vem na próxima versão do app.',
  "Only Erevos on Android reads the phone's contacts.": 'Só o Erevos no Android lê os contatos do celular.',
  'Search contacts': 'Buscar contatos',
  "Erevos may not read the phone's contacts yet": 'O Erevos ainda não tem permissão para ler os contatos do celular',
  "Erevos reads and changes them only in Android's own contacts, where they stay for your other apps. It sends them nowhere.":
    'O Erevos só os lê e altera nos contatos do próprio Android, onde eles ficam para os seus outros apps. Ele não os envia a lugar nenhum.',
  'Allow contacts': 'Permitir contatos',
  "Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info.":
    'Sem isso, o Erevos não consegue mostrar os contatos do celular. Permita Contatos nas informações do app Erevos.',
  "The phone's contacts could not be read: {error}": 'Não foi possível ler os contatos do celular: {error}',
  'No contact has “{query}” in it.': 'Nenhum contato tem “{query}”.',
  'No favourites yet. Tap the star on a contact.': 'Ainda não há favoritos. Toque na estrela de um contato.',
  'No contacts yet.': 'Ainda não há contatos.',
  "These are the phone's contacts, kept in Android's own contacts: every app allowed to read them sees them, and an account (Google) may sync them. Those with a lock are kept only in Erevos, sealed in this space.":
    'Estes são os contatos do celular, guardados nos contatos do próprio Android: todo app com permissão para lê-los os vê, e uma conta (Google) pode sincronizá-los. Os que têm um cadeado ficam só no Erevos, selados neste espaço.',
  'New contact': 'Novo contato',

  // One contact.
  'This contact is no longer on the phone.': 'Este contato não está mais no celular.',
  'Delete contact': 'Apagar contato',
  'Delete {name} from the phone? It goes from every account it is kept in, and cannot be brought back.':
    'Apagar {name} do celular? O contato sai de todas as contas em que está salvo, e não será possível recuperá-lo.',
  'Remove from favourites': 'Remover dos favoritos',
  'Add to favourites': 'Adicionar aos favoritos',
  'Favourite': 'Favorito',
  'Birthday': 'Aniversário',
  'Note': 'Observação',
  'Edit': 'Editar',
  'Mobile': 'Celular',
  'Home': 'Casa',
  'Work': 'Trabalho',
  'Main': 'Principal',
  'Fax': 'Fax',
  'Pager': 'Pager',
  'Other': 'Outro',
  'Birthday today, turns {age}': 'Aniversário hoje, faz {age} anos',
  'Birthday today': 'Aniversário hoje',
  'Birthday tomorrow, turns {age}': 'Aniversário amanhã, faz {age} anos',
  'Birthday tomorrow': 'Aniversário amanhã',
  'Birthday in {n} days, turns {age}': 'Aniversário em {n} dias, faz {age} anos',
  'Birthday in {n} days': 'Aniversário em {n} dias',
  'Add a photo': 'Adicionar uma foto',
  'Choose a photo': 'Escolher uma foto',
  'Remove the photo': 'Remover a foto',
  "The photo is kept with the contact in Android's contacts, where the phone shows it when they call, and its account (Google) syncs it.":
    'A foto fica com o contato nos contatos do Android, onde o celular a mostra quando a pessoa liga, e a conta dele (Google) a sincroniza.',
  'Ringtone': 'Toque',
  "The phone's own": 'O do celular',
  'A ringtone of its own': 'Um toque próprio',
  'Choose ringtone': 'Escolher toque',

  // Writing a contact.
  'Edit contact': 'Editar contato',
  'First name': 'Nome',
  'Last name': 'Sobrenome',
  'Company': 'Empresa',
  'Job title': 'Cargo',
  'Phone numbers': 'Números de telefone',
  'Add a number': 'Adicionar um número',
  'Emails': 'E-mails',
  'Add an email': 'Adicionar um e-mail',
  'Addresses': 'Endereços',
  'Add an address': 'Adicionar um endereço',
  'Day/month/year, or day/month without the year.': 'Dia/mês/ano, ou dia/mês sem o ano.',
  'Write the birthday as day/month/year, or day/month.': 'Escreva o aniversário como dia/mês/ano, ou dia/mês.',
  'Give the contact a name, a number or an email.': 'Dê ao contato um nome, um número ou um e-mail.',
  'Kept in': 'Salvo em',
  'On this phone only': 'Só neste celular',
  "In Android's contacts, synced with {account}.": 'Nos contatos do Android, sincronizado com {account}.',
  "In Android's contacts on this phone, synced nowhere.": 'Nos contatos do Android neste celular, sem sincronizar com nada.',

  // Groups.
  'Groups': 'Grupos',
  'Family, Work, and your own: make, rename, who is in them': 'Família, Trabalho e os seus: criar, renomear, quem está neles',
  "Android's own groups of contacts, such as Family or Work. Your other apps see them too, and an account (Google) syncs its own.":
    'Os grupos de contatos do próprio Android, como Família ou Trabalho. Os seus outros apps também os veem, e uma conta (Google) sincroniza os dela.',
  'No groups yet.': 'Ainda não há grupos.',
  'Group without a name': 'Grupo sem nome',
  'Family': 'Família',
  'A contact joins a group only in the account the group is kept in.': 'Um contato só entra num grupo na conta em que o grupo está salvo.',
  'The group could not be made. {error}': 'Não foi possível criar o grupo. {error}',
  'This group is no longer on the phone.': 'Este grupo não está mais no celular.',
  'Delete group': 'Apagar grupo',
  'Delete the group {name}? Its contacts stay on the phone.': 'Apagar o grupo {name}? Os contatos dele continuam no celular.',
  'Add contacts': 'Adicionar contatos',
  'No one in this group yet.': 'Ainda não há ninguém neste grupo.',
  'Take {name} out of the group': 'Remover {name} do grupo',
  '{n} contact could not join: it is kept in another account than this group.':
    '{n} contato não pôde entrar: ele está salvo numa conta diferente da deste grupo.',
  '{n} contacts could not join: they are kept in another account than this group.':
    '{n} contatos não puderam entrar: eles estão salvos numa conta diferente da deste grupo.',
  'Add {n} contact': 'Adicionar {n} contato',
  'Add {n} contacts': 'Adicionar {n} contatos',
  'In no group': 'Em nenhum grupo',
  'Choose groups': 'Escolher grupos',
  'No groups yet. Make one under Groups in the menu of Contacts.': 'Ainda não há grupos. Crie um em “Grupos”, no menu de “Contatos”.',
  '{name} is kept in another account than the group {group}, so it cannot join it.':
    '{name} está salvo numa conta diferente da do grupo {group}, então não pode entrar nele.',

  // vCard files.
  'Import from a .vcf file': 'Importar de um arquivo .vcf',
  'Contacts another phone or app saved as a vCard': 'Contatos que outro celular ou app salvou como vCard',
  'Save as a .vcf file': 'Salvar como arquivo .vcf',
  'The {n} contact shown, in a folder you choose': 'O {n} contato mostrado, numa pasta que você escolher',
  'The {n} contacts shown, in a folder you choose': 'Os {n} contatos mostrados, numa pasta que você escolher',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read these contacts.':
    'Salvo como {name}. O arquivo fica fora do Erevos: qualquer pessoa que o tenha pode ler estes contatos.',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read this contact.':
    'Salvo como {name}. O arquivo fica fora do Erevos: qualquer pessoa que o tenha pode ler este contato.',
  'Import contacts': 'Importar contatos',
  'Choose a .vcf file (a vCard), as other phones and apps save their contacts. Erevos reads it here and sends it nowhere.':
    'Escolha um arquivo .vcf (um vCard), como outros celulares e apps salvam os contatos deles. O Erevos o lê aqui e não o envia a lugar nenhum.',
  'Choose a .vcf file': 'Escolher um arquivo .vcf',
  'There are no contacts in {file}.': 'Não há contatos em {file}.',
  'The file is larger than {n} MB.': 'O arquivo tem mais de {n} MB.',
  'It has {n} contact.': 'Ele tem {n} contato.',
  'It has {n} contacts.': 'Ele tem {n} contatos.',
  '{n} of them is on the phone already, and is left out.': '{n} deles já está no celular e fica de fora.',
  '{n} of them are on the phone already, and are left out.': '{n} deles já estão no celular e ficam de fora.',
  'Importing… {done} of {total}': 'Importando… {done} de {total}',
  'Import {n} contact': 'Importar {n} contato',
  'Import {n} contacts': 'Importar {n} contatos',
  'Nothing new to import.': 'Nada de novo para importar.',
  '{n} contact imported.': '{n} contato importado.',
  '{n} contacts imported.': '{n} contatos importados.',
  '{n} contact could not be saved.': '{n} contato não pôde ser salvo.',
  '{n} contacts could not be saved.': '{n} contatos não puderam ser salvos.',

  // QR codes.
  'This contact holds too much for a QR code. Save it as a .vcf file instead.':
    'Este contato tem informação demais para um código QR. Salve-o como arquivo .vcf.',
  "Another phone's camera reads it as a contact to add: its name, numbers, emails, addresses and note, without its photo. Whoever sees the code can read it.":
    'A câmera de outro celular o lê como um contato para adicionar: o nome, os números, os e-mails, os endereços e a observação, sem a foto. Quem vir o código pode lê-lo.',
  "Another phone's camera reads it as a contact to add, without its photo, and without its note or addresses, which do not fit. Whoever sees the code can read it.":
    'A câmera de outro celular o lê como um contato para adicionar, sem a foto, e sem a observação nem os endereços, que não cabem. Quem vir o código pode lê-lo.',
  "Read a contact's QR code": 'Ler o código QR de um contato',
  'From a photo of it, read on the phone': 'A partir de uma foto dele, lida no celular',
  'Take a photo of the code, or choose one. It is read here and not kept; what it holds starts a new contact, saved only when you save it.':
    'Tire uma foto do código, ou escolha uma. Ela é lida aqui e não fica guardada; o que ela contém começa um novo contato, salvo só quando você salvar.',
  'This QR code holds no contact.': 'Este código QR não contém nenhum contato.',
  'No QR code was found in the photo. Take it again closer, with all of the code in it.':
    'Nenhum código QR foi encontrado na foto. Tire de novo mais de perto, com o código inteiro nela.',

  // Duplicates.
  'Find duplicates': 'Encontrar duplicados',
  'The same person kept twice, to merge into one': 'A mesma pessoa salva duas vezes, para mesclar numa só',
  'There is nothing to merge.': 'Não há nada para mesclar.',
  'The same name': 'O mesmo nome',
  'The same number': 'O mesmo número',
  'The same email': 'O mesmo e-mail',
  'Merge': 'Mesclar',
  'Merge these {n} into {name}? The others are deleted, from every account they are kept in.':
    'Mesclar estes {n} em {name}? Os outros são apagados, de todas as contas em que estão salvos.',
  'Merge all': 'Mesclar todos',
  'Merge {n} set of contacts, each into its fullest? The others are deleted.':
    'Mesclar {n} conjunto de contatos, cada um no mais completo? Os outros são apagados.',
  'Merge {n} sets of contacts, each into its fullest? The others are deleted.':
    'Mesclar {n} conjuntos de contatos, cada um no mais completo? Os outros são apagados.',
  '{n} set could not be merged.': '{n} conjunto não pôde ser mesclado.',
  '{n} sets could not be merged.': '{n} conjuntos não puderam ser mesclados.',
  'Duplicates': 'Duplicados',
  'Contacts that look like the same person: the same name, number or email. Merging keeps the fullest, with every number, email and address of the others, and deletes the others.':
    'Contatos que parecem ser a mesma pessoa: o mesmo nome, número ou e-mail. Mesclar mantém o mais completo, com todos os números, e-mails e endereços dos outros, e apaga os outros.',
  'No duplicates found.': 'Nenhum duplicado encontrado.',
  'Not the same': 'Não são iguais',
  'Kept, with the others in it': 'Fica, com os outros mesclados nele',

  // Birthdays.
  'Birthdays': 'Aniversários',
  "Without notices, Erevos cannot remind you of birthdays. Allow Notifications in Erevos's App info.":
    'Sem notificações, o Erevos não consegue lembrar você dos aniversários. Permita Notificações nas informações do app Erevos.',
  'No contact has a birthday yet. Add one in Edit.': 'Nenhum contato tem aniversário ainda. Adicione um em “Editar”.',
  'Birthday reminders: on': 'Lembretes de aniversário: ativados',
  'Birthday reminders: off': 'Lembretes de aniversário: desativados',
  "A notice on the morning of each phone contact's birthday": 'Uma notificação na manhã do aniversário de cada contato do celular',

  // The SIM.
  'SIM contacts': 'Contatos do chip',
  'Copy the contacts on the SIM card to the phone': 'Copiar os contatos do chip para o celular',
  "The contacts kept on the phone's SIM cards. Copied, they are in Android's contacts like the others; the SIM keeps its own.":
    'Os contatos guardados nos chips do celular. Depois de copiados, eles ficam nos contatos do Android como os outros; o chip mantém os dele.',
  'Reading the SIM…': 'Lendo o chip…',
  'No contacts on the SIM, or the phone does not let Erevos read it.': 'Não há contatos no chip, ou o celular não deixa o Erevos lê-lo.',
  'The SIM has {n} contact.': 'O chip tem {n} contato.',
  'The SIM has {n} contacts.': 'O chip tem {n} contatos.',
  'Copying… {done} of {total}': 'Copiando… {done} de {total}',
  'Copy {n} contact to the phone': 'Copiar {n} contato para o celular',
  'Copy {n} contacts to the phone': 'Copiar {n} contatos para o celular',
  'Choose who to copy': 'Escolher quem copiar',
  '{n} contact copied to the phone.': '{n} contato copiado para o celular.',
  '{n} contacts copied to the phone.': '{n} contatos copiados para o celular.',
  'SIM {n}': 'Chip {n}',

  // Kept only in Erevos, and in hidden chats.
  'Only in Erevos': 'Só no Erevos',
  "Sealed in this space, and not in the phone's contacts: no other app sees it, nor any account the phone syncs with.":
    'Selado neste espaço, e fora dos contatos do celular: nenhum outro app o vê, nem qualquer conta com que o celular sincroniza.',
  'No contact is kept only in Erevos yet. Choose Only in Erevos when you make one.':
    'Nenhum contato está guardado só no Erevos ainda. Escolha “Só no Erevos” ao criar um.',
  'Erevos keeps {n} contacts of its own at most.': 'O Erevos guarda no máximo {n} contatos próprios.',
  'This contact is no longer kept in Erevos.': 'Este contato não está mais guardado no Erevos.',
  'Delete {name}? It is kept only in Erevos, and cannot be brought back.':
    'Apagar {name}? O contato está guardado só no Erevos, e não será possível recuperá-lo.',
  'Keep only in Erevos': 'Guardar só no Erevos',
  "Move {name} into Erevos? It is sealed in this space and deleted from the phone's contacts, from every account it is kept in: other apps no longer see it, and the phone no longer shows its name when it calls.":
    'Mover {name} para o Erevos? O contato é selado neste espaço e apagado dos contatos do celular, de todas as contas em que está salvo: outros apps não o veem mais, e o celular não mostra mais o nome quando essa pessoa liga.',
  "Move to the phone's contacts": 'Mover para os contatos do celular',
  "Move {name} to the phone's contacts? Every app allowed to read them sees it there, and it is no longer kept in Erevos.":
    'Mover {name} para os contatos do celular? Lá, todo app com permissão para lê-los o vê, e ele não fica mais guardado no Erevos.',
  "Kept only in Erevos, sealed in this space. Not in the phone's contacts.":
    'Guardado só no Erevos, selado neste espaço. Fora dos contatos do celular.',
  'The photo is sealed with the contact, in a file of its own: only Erevos shows it.':
    'A foto é selada com o contato, num arquivo próprio: só o Erevos a mostra.',
  'Hidden contacts': 'Contatos ocultos',
  'The hidden chats are closed.': 'As conversas ocultas foram fechadas.',
  "Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.":
    'Guardados só aqui, selados com as conversas ocultas: não aparecem em nenhum outro lugar, nem nos contatos do espaço.',
  'Kept only in these hidden chats, sealed.': 'Guardado só nestas conversas ocultas, selado.',
  'favourite': 'favorito',
  'only in Erevos': 'só no Erevos',

  // Erevos contacts, and a contact's history.
  'Erevos contacts': 'Contatos do Erevos',
  'Erevos contact': 'Contato do Erevos',
  'with an Erevos chat': 'com conversa no Erevos',
  'No Erevos contacts yet. Add one in Chat, with their link or QR code.':
    'Ainda não há contatos do Erevos. Adicione um em “Conversa”, com o link ou o código QR dele.',
  'A contact of your Erevos chats. Add it to your contacts to give it numbers, an email and more.':
    'Um contato das suas conversas no Erevos. Adicione-o aos seus contatos para dar a ele números, um e-mail e mais.',
  'In Erevos': 'No Erevos',
  'The Erevos contact {name}': 'O contato do Erevos {name}',
  'End-to-end encrypted, through Erevos instead of the phone company.': 'Criptografado de ponta a ponta, pelo Erevos em vez da operadora.',
  'Not this Erevos contact': 'Não é este contato do Erevos',
  'One of its numbers is linked to this Erevos contact, in its chat.':
    'Um dos números dele está vinculado a este contato do Erevos, na conversa dele.',
  'Link to an Erevos contact': 'Vincular a um contato do Erevos',
  "The same person in your Erevos chats: this card then shows their chat and calls. The link is sealed in Erevos, never in the phone's contacts.":
    'A mesma pessoa nas suas conversas no Erevos: este cartão passa a mostrar a conversa e as chamadas dela. O vínculo fica selado no Erevos, nunca nos contatos do celular.',
  'Add to contacts': 'Adicionar aos contatos',
  'History': 'Histórico',
  'No calls or messages with this contact yet.': 'Ainda não há chamadas nem mensagens com este contato.',
  "Its calls show here once Erevos may read the phone's call log. Erevos only shows them, and keeps no copy.":
    'As chamadas dele aparecem aqui assim que o Erevos puder ler o registro de chamadas do celular. O Erevos só as mostra, e não guarda cópia.',
  'Show calls': 'Mostrar chamadas',
  'Incoming call, {time}': 'Chamada recebida, {time}',
  'Outgoing call, {time}': 'Chamada realizada, {time}',
  'Outgoing call, no answer': 'Chamada realizada, não atendida',

  // Other apps' contacts.
  'Add {what} to a contact': 'Adicionar {what} a um contato',
  'Tap the contact to add it to, or make a new one.': 'Toque no contato ao qual adicionar, ou crie um novo.',

  // A contact's Erevos ID (components/erevos-id.tsx).
  'Erevos ID': 'ID do Erevos',
  'Erevos ID: {id}': 'ID do Erevos: {id}',
  'That is not an Erevos ID: an Erevos ID is a contact link starting with erevos://contact':
    'Isso não é um ID do Erevos: um ID do Erevos é um link de contato que começa com erevos://contact',
  'Their contact link from Erevos, to link this contact to another Erevos contact instead.':
    'O link de contato do Erevos, para vincular este contato a outro contato do Erevos.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Once saved, they join your Erevos chats, and the contact shows their chat and calls.':
    'O link de contato que o Erevos da pessoa mostra, em “Copiar meu link de contato” ou como código QR. Depois de salvar, ela entra nas suas conversas no Erevos, e o contato mostra a conversa e as chamadas dela.',
  "Choose them among these hidden chats' contacts: this card then shows their chat and calls.":
    'Escolha entre os contatos destas conversas ocultas: este cartão passa a mostrar a conversa e as chamadas dela.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Added here, they join your Erevos chats, and this card shows their chat and calls, end-to-end encrypted.':
    'O link de contato que o Erevos da pessoa mostra, em “Copiar meu link de contato” ou como código QR. Adicionado aqui, ela entra nas suas conversas no Erevos, e este cartão mostra a conversa e as chamadas dela, com criptografia de ponta a ponta.',
  'Add to Erevos': 'Adicionar ao Erevos',
  'Choose from my Erevos chats': 'Escolher nas minhas conversas no Erevos',
  'That QR code holds no Erevos ID.': 'Esse código QR não tem nenhum ID do Erevos.',
  'Take a photo of the QR code': 'Tirar foto do código QR',
  'Choose a photo of the QR code': 'Escolher foto do código QR',
  'The photo could not be read. Choose another one, or take it again.': 'Não foi possível ler a foto. Escolha outra ou tire-a de novo.',
};
