// O português dos backups para um servidor (lib/backup-cloud.ts, app/backup.tsx) (i18n/pt/index.ts).
export const cloudBackup: Record<string, string> = {
  'Made a backup in {folder}, but it did not go to the server. {error}': 'Backup feito em {folder}, mas não chegou ao servidor. {error}',
  'Made a backup in {folder} and sent it to {server}.': 'Backup feito em {folder} e enviado para {server}.',
  'Stop sending to the server': 'Parar de enviar ao servidor',
  'Automatic backups will go only to the folder from now on. Those already on the server stay there until you delete them.':
    'De agora em diante os backups automáticos vão só para a pasta. Os que já estão no servidor ficam lá até você apagar.',
  'Backups no longer go to the server.': 'Os backups não vão mais para o servidor.',
  'To a server too': 'Também para um servidor',
  'To {server}': 'Para {server}',
  'Last one sent {when}.': 'O último enviado {when}.',
  'None sent yet.': 'Nenhum enviado ainda.',
  'Each automatic backup goes there too, and the server keeps the {n} newest.': 'Cada backup automático vai também para lá, e o servidor guarda os {n} mais recentes.',
  'The last one did not go: {error} Erevos tries again next time it opens.': 'O último não foi: {error} O Erevos tenta de novo na próxima vez que abrir.',
  'Stop sending': 'Parar de enviar',
  'Folder address (WebDAV)': 'Endereço da pasta (WebDAV)',
  'In Nextcloud: Files → Files settings → WebDAV gives the start; add a folder you made for backups, like …/remote.php/dav/files/NAME/Backups':
    'No Nextcloud: Arquivos → Configurações de arquivos → WebDAV dá o começo; acrescente uma pasta que você criou para os backups, como …/remote.php/dav/files/NOME/Backups',
  'User name': 'Nome de usuário',
  "Best an app password made for Erevos alone, in the server's security settings: you can take it back there without changing your own.":
    'Melhor uma senha de aplicativo só para o Erevos, nas configurações de segurança do servidor: você pode revogá-la lá sem mudar a sua.',
  'Add a server': 'Adicionar um servidor',
  'That is not a folder address. It starts with https://': 'Isso não é um endereço de pasta. Ele começa com https://',
  'The address has to start with https://, so the password and backups go encrypted.': 'O endereço tem que começar com https://, para que a senha e os backups vão criptografados.',
  'Put the user name and password in their own fields, not in the address.': 'Coloque o nome de usuário e a senha nos campos deles, não no endereço.',
  'The server did not take that user name and password.': 'O servidor não aceitou esse nome de usuário e essa senha.',
  'That folder is not on the server. Make it there first.': 'Essa pasta não existe no servidor. Crie-a lá primeiro.',
  'The server has no room left for it.': 'O servidor não tem mais espaço para ele.',
  'The server answered {status}.': 'O servidor respondeu {status}.',
  'Could not reach the server. {error}': 'Não foi possível chegar ao servidor. {error}',
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, when one comes and roughly how big it is, and your address unless the backup goes through Tor, as the space's Tor setting says. Nothing goes until you add one.":
    "Cada backup automático também pode ir para uma pasta num servidor que você escolher, como o seu Nextcloud, por WebDAV. O servidor recebe bytes aleatórios com um nome aleatório: não consegue abri-los nem saber que são do Erevos. Ainda assim vê sua conta, quando chega um e mais ou menos o tamanho, e seu endereço, a não ser que o backup passe pelo Tor, como diz a configuração de Tor do espaço. Nada é enviado até você adicionar um.",
  "This space sends Everything through Tor, and Tor here cannot reach a server, so nothing went to it.":
    "Este espaço envia Tudo pelo Tor, e aqui o Tor não consegue chegar a um servidor, então nada foi para ele.",
  "Through Tor: the server does not see your address.":
    "Pelo Tor: o servidor não vê o seu endereço.",
  "Not through Tor now: the server sees your address. Tor is under Settings → Relay and networks → Tor.":
    "Agora não pelo Tor: o servidor vê o seu endereço. O Tor fica em Configurações → Relay e redes → Tor.",
  "There is no Erevos backup in that folder.":
    "Não há nenhum backup do Erevos nessa pasta.",
  "Restore from a server":
    "Restaurar de um servidor",
  "The folder on your server that automatic backups went to. The password is used for this restore only and not kept.":
    "A pasta no seu servidor para onde iam os backups automáticos. A senha é usada só para esta restauração e não fica guardada.",
  "Look there":
    "Procurar lá",
  "Backups on {server}, newest first. Choose one, then type its password.":
    "Backups em {server}, os mais recentes primeiro. Escolha um e depois digite a senha dele.",
  "Backups to a server do not work here yet.":
    "Backups para um servidor ainda não funcionam aqui.",
  "In a browser the server has to let the web app in (CORS), and this one did not, or could not be reached.":
    "Num navegador o servidor tem de deixar o web app entrar (CORS), e este não deixou ou não pôde ser alcançado.",
  "Erevos forgets the server and its password here. The backups already on it stay there until you delete them.":
    "O Erevos esquece aqui o servidor e a senha dele. Os backups que já estão nele ficam lá até você apagá-los.",
  "Sent a backup to {server}. Keep its password: nothing opens the backup without it.":
    "Um backup foi enviado para {server}. Guarde a senha dele: nada abre o backup sem ela.",
  "Send a backup there now and then; the server keeps the {n} newest.":
    "Envie um backup para lá de vez em quando; o servidor guarda os {n} mais recentes.",
  "The last one did not go: {error}":
    "O último não foi: {error}",
  "Send a backup now":
    "Enviar um backup agora",
  "A backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV, each time you send one. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.":
    "Um backup também pode ir para uma pasta num servidor que você escolher, como o seu Nextcloud, por WebDAV, cada vez que você enviar um. O servidor recebe bytes aleatórios com um nome aleatório: não consegue abri-los nem saber que são do Erevos. Ainda assim vê sua conta, seu endereço, quando chega um e mais ou menos o tamanho. Nada é enviado até você adicionar um.",
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.":
    "Cada backup automático também pode ir para uma pasta num servidor que você escolher, como o seu Nextcloud, por WebDAV. O servidor recebe bytes aleatórios com um nome aleatório: não consegue abri-los nem saber que são do Erevos. Ainda assim vê sua conta, seu endereço, quando chega um e mais ou menos o tamanho. Nada é enviado até você adicionar um.",
  "In a browser this works only with a server set to let the web app in (CORS), which Nextcloud is not as it comes. The desktop app and Android need nothing of it.":
    "Num navegador isto só funciona com um servidor configurado para deixar o web app entrar (CORS), o que o Nextcloud não é de fábrica. O app para computador e o Android não precisam de nada disso.",
};
