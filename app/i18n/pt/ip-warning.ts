// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The warnings that this phone's internet address may be seen (lib/ip-warning.ts, components/ip-warning.tsx) in Portuguese (i18n/pt/index.ts).
export const ipWarningStrings: Record<string, string> = {
  "Your internet address can be seen": "Seu endereço de internet pode ser visto",
  "On {network}, what you send here can go without Tor. The servers that carry it, yours and your contact's, can then see this phone's internet address (IP address), though not what you wrote.": "Em {network}, o que você envia aqui pode ir sem Tor. Os servidores que o levam, o seu e o do seu contato, podem então ver o endereço de internet (endereço IP) deste celular, mas não o que você escreveu.",
  "On {network}, what you send here can go without Tor. Your {network} server then sees this phone's internet address (IP address), though not what you wrote.": "Em {network}, o que você envia aqui pode ir sem Tor. Seu servidor do {network} vê então o endereço de internet (endereço IP) deste celular, mas não o que você escreveu.",
  "Calls never go through Tor. The call relay that carries the sound and picture, yours or your contact's, sees this phone's internet address (IP address), though not what is said.": "As chamadas nunca passam pelo Tor. O relay de chamadas que leva o som e a imagem, o seu ou o do seu contato, vê o endereço de internet (endereço IP) deste celular, mas não o que é dito.",
  "This file is on a server your contact chose. Fetched without Tor, that server sees this phone's internet address (IP address), though not what the file holds.": "Este arquivo está num servidor que seu contato escolheu. Baixado sem Tor, esse servidor vê o endereço de internet (endereço IP) deste celular, mas não o que o arquivo contém.",
  "The site sees this phone's internet address (IP address), as any web page you open does. To hide it, open links in Tor Browser.": "O site vê o endereço de internet (endereço IP) deste celular, como qualquer página da web que você abre. Para escondê-lo, abra os links no Tor Browser.",
  "To show a link's preview, the page is fetched from its site. Without Tor, the site sees this phone's internet address (IP address).": "Para mostrar a prévia de um link, a página é baixada do site dele. Sem Tor, o site vê o endereço de internet (endereço IP) deste celular.",
  "On {network}, joining goes through a server. Without Tor, it sees this phone's internet address (IP address).": "Em {network}, entrar passa por um servidor. Sem Tor, ele vê o endereço de internet (endereço IP) deste celular.",
  "Guide": "Guia",
  "Through Tor for this chat": "Pelo Tor para esta conversa",
  "A station plays straight from its server, which then sees this phone's internet address (IP address) for as long as it plays, as any site does.": "Uma estação toca direto do servidor dela, que então vê o endereço de internet (endereço IP) deste celular enquanto toca, como qualquer site.",
  "A TV channel plays straight from its server, which then sees this phone's internet address (IP address) for as long as it plays, as any site does.": "Um canal de TV toca direto do servidor dele, que então vê o endereço de internet (endereço IP) deste celular enquanto toca, como qualquer site.",
};
