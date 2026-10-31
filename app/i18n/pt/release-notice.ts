// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Portuguese of the notice that a new version is out, and of Updates around it (app/updates.tsx, app/index.tsx, lib/release-notice.ts) (i18n/pt/index.ts).
export const releaseNotice: Record<string, string> = {
  "Erevos asks GitHub for updates only when you tap the button: a regular check would tell GitHub that this device has Erevos. GitHub then sees this device's internet address, nothing else, and on Android so does the web app's server, which holds the release computer's signature of the update.": "O Erevos só pergunta ao GitHub por atualizações quando você toca no botão: uma verificação regular contaria ao GitHub que este aparelho tem o Erevos. O GitHub então vê o endereço de internet deste aparelho, nada mais, e no Android o servidor do app web também, que guarda a assinatura da atualização feita no computador de versões.",
  "Tell me when a new version is out": "Avise-me quando sair uma versão nova",
  "Once a day Erevos asks LPHL's server, which runs the relay too, whether a new version is out, and says so at the top of the chats and in a notice. It asks only while this space uses LPHL's relay and does not send everything through Tor, so the server learns nothing it did not know. The answer counts only when signed by the release computer.": "Uma vez por dia o Erevos pergunta ao servidor do LPHL, que também roda o relay, se saiu uma versão nova, e avisa no topo das conversas e numa notificação. Ele só pergunta enquanto este espaço usa o relay do LPHL e não manda tudo pelo Tor, então o servidor não fica sabendo de nada que já não soubesse. A resposta só vale com a assinatura do computador de versões.",
  "Erevos does not ask whether a new version is out: only Check for updates tells you.": "O Erevos não pergunta se saiu uma versão nova: só Procurar atualizações avisa você.",
  "Erevos {name} is out. Tap to see what is new and update.": "Saiu o Erevos {name}. Toque para ver o que há de novo e atualizar.",
};
