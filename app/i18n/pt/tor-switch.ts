// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The «Through Tor» switch of a feature and what it says (components/tor-switch.tsx, lib/net-http.ts) in Portuguese (i18n/pt/index.ts).
export const torSwitch: Record<string, string> = {
  "This goes only through Tor, which this build of Erevos does not have.": "Isto passa só pelo Tor, que esta versão do Erevos não tem.",
  "Through Tor: the server does not see this phone's internet address. It is slower, and waits while Tor starts.": "Pelo Tor: o servidor não vê o endereço de internet deste celular. É mais lento e espera enquanto o Tor inicia.",
  "This build of Erevos has no Tor, so with this on nothing goes to the server.": "Esta versão do Erevos não tem Tor, então com isto ativado nada vai para o servidor.",
  "Straight: the server sees this phone's internet address.": "Direto: o servidor vê o endereço de internet deste celular.",
  "This space sends everything through Tor, so this goes through Tor too: the server does not see this phone's internet address.": "Este espaço manda tudo pelo Tor, então isto também passa pelo Tor: o servidor não vê o endereço de internet deste celular.",
  "As this space's Tor setting says: through Tor while Tor is ready, straight while it starts or fails, and then the server sees this phone's internet address.": "Como diz a definição de Tor deste espaço: pelo Tor enquanto o Tor está pronto, direto enquanto ele inicia ou falha, e então o servidor vê o endereço de internet deste celular.",
};
