// The Portuguese of the SMS screen's own tools: pinning, archive, drafts, blocking and the like (i18n/pt/index.ts).
export const smsTools: Record<string, string> = {
  // The list and its folders (app/index.tsx, app/sms-folder.tsx, components/sms-actions.tsx).
  Names: 'Nomes',
  'All messages': 'Todos',
  'Archived · {n}': 'Arquivadas · {n}',
  'Spam · {n}': 'Spam · {n}',
  'Trash · {n}': 'Lixeira · {n}',
  'Draft': 'Rascunho',
  'Archive': 'Arquivar',
  'Unarchive': 'Desarquivar',
  'Archived conversations': 'Conversas arquivadas',
  'Spam': 'Spam',
  'Trash': 'Lixeira',
  'Pin to the top': 'Fixar no topo',
  'Unpin': 'Desafixar',
  'Mark as spam': 'Marcar como spam',
  'Not spam': 'Não é spam',
  'Block {number}': 'Bloquear {number}',
  'Unblock {number}': 'Desbloquear {number}',
  'Undo': 'Desfazer',
  'Not done': 'Não deu certo',
  'OK': 'OK',
  'Archived. A new SMS from them brings it back.': 'Arquivada. Um novo SMS desse número a traz de volta.',
  'Back in the list.': 'De volta à lista.',
  'The Trash is full. Empty it first.': 'A lixeira está cheia. Esvazie-a primeiro.',
  'In the Trash. It goes from the phone in {days} days.': 'Na lixeira. Ela some do celular em {days} dias.',
  'At most {n} conversations stay pinned. Unpin one first.': 'No máximo {n} conversas podem ficar fixadas. Desafixe uma primeiro.',
  'Not spam: back in the list.': 'Não é spam: de volta à lista.',
  'Marked as spam: it is in Spam.': 'Marcada como spam: está no Spam.',
  'Block {number}?': 'Bloquear {number}?',
  "It goes into Android's own list of blocked numbers: Android rejects its SMS, MMS and calls, in every space and in the phone app too, until you unblock it. The conversation goes to Spam.":
    'Ele entra na lista de números bloqueados do próprio Android: o Android rejeita os SMS, MMS e chamadas dele, em todos os espaços e também no app de telefone, até você desbloquear. A conversa vai para o Spam.',
  'Blocked.': 'Bloqueado.',
  'Unblocked.': 'Desbloqueado.',
  'Empty the Trash': 'Esvaziar a lixeira',
  'Delete {n} conversation from the phone now? They cannot be brought back.': 'Apagar {n} conversa do celular agora? Não será possível recuperá-la.',
  'Delete {n} conversations from the phone now? They cannot be brought back.':
    'Apagar {n} conversas do celular agora? Não será possível recuperá-las.',
  'Delete the SMS with {name} from the phone now? They cannot be brought back.':
    'Apagar os SMS com {name} do celular agora? Não será possível recuperá-los.',
  'Delete for good': 'Apagar de vez',
  'Some could not be deleted. Try again.': 'Algumas não puderam ser apagadas. Tente de novo.',
  'Only the SMS app can delete SMS: make Erevos the SMS app under SMS in the menu.':
    'Só o app de SMS pode apagar SMS: torne o Erevos o app de SMS em “SMS” no menu.',
  'This build of Erevos cannot delete SMS yet.': 'Esta versão do Erevos ainda não consegue apagar SMS.',
  'Deleted on {when}. Goes from the phone on {then}.': 'Apagada em {when}. Some do celular em {then}.',
  'Bring back': 'Recuperar',
  'Delete now': 'Apagar agora',
  'The Trash is empty.': 'A lixeira está vazia.',
  'No spam.': 'Nenhum spam.',
  'Nothing archived.': 'Nada arquivado.',
  "Conversations you deleted, kept {days} days in case you want them back, then deleted from the phone. Only this space hides them meanwhile: they are still in the phone's SMS.":
    'Conversas que você apagou, guardadas por {days} dias caso você as queira de volta, e depois apagadas do celular. Enquanto isso, só este espaço as esconde: elas continuam nos SMS do celular.',
  'SMS from numbers you blocked or marked as spam, and those the spam filter caught. The filter works on this phone alone and sends nothing anywhere. Hold one down to say it is not spam.':
    'SMS de números que você bloqueou ou marcou como spam, e os que o filtro de spam pegou. O filtro funciona só neste celular e não envia nada a lugar nenhum. Toque e segure um para dizer que não é spam.',
  'Conversations you archived. One comes back to the list when a new SMS comes from them. Hold one down for more.':
    'Conversas que você arquivou. Uma volta para a lista quando chega um novo SMS dela. Toque e segure uma para ver mais opções.',

  // A conversation (app/sms.tsx).
  'In Spam': 'No Spam',
  'Archived': 'Arquivada',
  'In the Trash': 'Na lixeira',
  'More': 'Mais',
  'The messages before are in the Trash.': 'As mensagens anteriores estão na lixeira.',
  'Tap to send it again.': 'Toque para enviar de novo.',
  'Send it again?': 'Enviar de novo?',
  'Send again': 'Enviar de novo',
  'This build of Erevos cannot send an MMS again yet.': 'Esta versão do Erevos ainda não consegue reenviar um MMS.',
  'Message deleted.': 'Mensagem apagada.',
  'Hold the words down to copy them.': 'Toque e segure o texto para copiá-lo.',
  'Goes in {n} s · tap to take it back': 'Sai em {n} s · toque para desfazer',
  'It writes with a name, not a number, so it cannot be answered.':
    'Este remetente escreve com um nome, não com um número, então não é possível responder.',
  'Forward': 'Encaminhar',
  'It opens in the conversation you choose, to read and send there. To a number its picture goes too, as an MMS; into a chat only its words.':
    'A mensagem abre na conversa que você escolher, para você ler e enviar lá. Para um número, a imagem vai junto, como MMS; para uma conversa do Erevos, só o texto.',
  'It opens in the conversation you choose, to read and send there.': 'A mensagem abre na conversa que você escolher, para você ler e enviar lá.',
  'Into an Erevos chat': 'Numa conversa do Erevos',

  // The SMS settings (app/sms-settings.tsx).
  'With the names come the pictures your contacts have, in the list and in the conversation. They too are read only to show them.':
    'Junto com os nomes vêm as fotos que os seus contatos têm, na lista e na conversa. Elas também são lidas só para serem mostradas.',
  'Archived, Spam and Trash': 'Arquivadas, Spam e Lixeira',
  "In the list, swipe an SMS conversation to the right to archive it, to the left to delete it, or hold it down to pin it at the top and more. This space keeps its own pins, archived conversations, Trash and spam marks, sealed with its password; the SMS stay in the phone's SMS, where another space sees them as they are.":
    'Na lista, deslize uma conversa de SMS para a direita para arquivá-la, para a esquerda para apagá-la, ou toque e segure para fixá-la no topo e mais. Este espaço guarda as próprias conversas fixadas, arquivadas, lixeira e marcas de spam, seladas com a senha dele; os SMS ficam nos SMS do celular, onde outro espaço os vê como são.',
  'Spam filter': 'Filtro de spam',
  'It works on this phone alone, by rules, and sends nothing anywhere. An SMS from a number that is no contact and was never answered goes to Spam when it has a link with words that try to fool, like a parcel held or a prize, or one of your words below. A number you marked as spam always goes there, one you marked not spam never does.':
    'Ele funciona só neste celular, por regras, e não envia nada a lugar nenhum. Um SMS de um número que não é contato e que você nunca respondeu vai para o Spam quando tem um link com palavras que tentam enganar, como uma encomenda retida ou um prêmio, ou uma das suas palavras abaixo. Um número que você marcou como spam sempre vai para lá; um que você marcou como não spam, nunca.',
  'Turn the spam filter off': 'Desativar o filtro de spam',
  'Turn the spam filter on': 'Ativar o filtro de spam',
  'Let links from unknown numbers through': 'Deixar passar links de números desconhecidos',
  'Send every link from unknown numbers to Spam': 'Mandar para o Spam todo link de números desconhecidos',
  'Your words': 'Suas palavras',
  'An SMS with one of them goes to Spam, from any number or sender that is no contact. Tap a word to remove it.':
    'Um SMS com uma delas vai para o Spam, de qualquer número ou remetente que não seja contato. Toque numa palavra para removê-la.',
  'A word or a few': 'Uma palavra ou algumas',
  'At most {n} words, each up to {length} letters.': 'No máximo {n} palavras, cada uma com até {length} letras.',
  'A notice still says "New message" when spam comes, as it shows before Erevos is opened. Block a number to hear nothing more from it.':
    'Uma notificação ainda diz “New message” quando chega spam, porque ela aparece antes de o Erevos ser aberto. Bloqueie um número para não receber mais nada dele.',
  'Blocked numbers': 'Números bloqueados',
  "These are Android's own blocked numbers: Android rejects their SMS, MMS and calls. Every space, and the phone app, sees the same list. Block one from its conversation, with ⋮, or here.":
    'Estes são os números bloqueados do próprio Android: o Android rejeita os SMS, MMS e chamadas deles. Todos os espaços, e o app de telefone, veem a mesma lista. Bloqueie um pela conversa dele, com ⋮, ou aqui.',
  'Only the SMS app or the phone app can see and change them: make Erevos the SMS app above.':
    'Só o app de SMS ou o app de telefone pode ver e alterar esses números: torne o Erevos o app de SMS acima.',
  'This build of Erevos cannot block numbers yet.': 'Esta versão do Erevos ainda não consegue bloquear números.',
  'No number is blocked.': 'Nenhum número bloqueado.',
  'Type one phone number.': 'Digite um único número de telefone.',
  'Unblock {number}?': 'Desbloquear {number}?',
  'Its SMS, MMS and calls reach the phone again.': 'Os SMS, MMS e chamadas dele voltam a chegar ao celular.',
  'Unblock': 'Desbloquear',
  'Taking an SMS back': 'Desfazer envio de SMS',
  'An SMS you send waits this long at the end of the conversation before it goes: tap it then to take it back. When you leave Erevos, it goes at once.':
    'Um SMS que você envia aguarda esse tempo no fim da conversa antes de sair: toque nele nesse meio-tempo para desfazer o envio. Quando você sai do Erevos, ele é enviado na hora.',

  // The phone's SMS in backups (app/backup.tsx).
  "The phone's SMS": 'Os SMS do celular',
  "Backups can hold the phone's SMS and MMS too, with up to {mb} MB of their pictures, sealed with the backup's password. Restoring the backup puts back into the phone's SMS each one it does not have, and deletes none.":
    'Os backups também podem incluir os SMS e MMS do celular, com até {mb} MB das imagens deles, selados com a senha do backup. Restaurar o backup devolve aos SMS do celular cada um que ele não tiver, e não apaga nenhum.',
  'Erevos reads them only while it is the SMS app: make it the SMS app under SMS in the menu.':
    'O Erevos só os lê enquanto é o app de SMS: torne-o o app de SMS em “SMS” no menu.',
  'Put the SMS in backups': 'Incluir os SMS nos backups',
  'Leave the SMS out': 'Deixar os SMS de fora',
  "It holds {sms} SMS and {mms} MMS of the phone's.": 'Ele contém {sms} SMS e {mms} MMS do celular.',
  '{n} picture did not fit and stayed out.': '{n} imagem não coube e ficou de fora.',
  '{n} pictures did not fit and stayed out.': '{n} imagens não couberam e ficaram de fora.',
  'SMS in this backup': 'SMS neste backup',
  "This backup also holds the phone's SMS. They go back into the phone's SMS only while Erevos is the SMS app: make it the SMS app under SMS in the menu, then restore again. Or restore the rest now, without them.":
    'Este backup também contém os SMS do celular. Eles só voltam para os SMS do celular enquanto o Erevos for o app de SMS: torne-o o app de SMS em “SMS” no menu e restaure de novo. Ou restaure o resto agora, sem eles.',
  'Without the SMS': 'Sem os SMS',
  'Putting the SMS back into the phone…': 'Devolvendo os SMS ao celular…',
  "{sms} SMS and {mms} MMS went back into the phone's SMS. Those it had already stayed as they were.":
    '{sms} SMS e {mms} MMS voltaram para os SMS do celular. Os que ele já tinha ficaram como estavam.',
  'A newer Erevos made this backup: what this one does not know yet stays out. Update Erevos first to restore all of it.':
    'Este backup foi feito por um Erevos mais novo: o que este ainda não conhece fica de fora. Atualize o Erevos primeiro para restaurar tudo.',
  "The SMS could not go back into the phone's SMS: {error}": 'Não foi possível devolver os SMS aos SMS do celular: {error}',
  'Copy code': 'Copiar código',
  'The code is copied: any app that reads the clipboard can read it.': 'O código foi copiado: qualquer app que leia a área de transferência pode lê-lo.',
  'The code could not be copied.': 'Não foi possível copiar o código.',
};
