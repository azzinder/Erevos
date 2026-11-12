// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The warnings that this phone's internet address may be seen (lib/ip-warning.ts, components/ip-warning.tsx) in Spanish (i18n/es/index.ts).
export const ipWarningStrings: Record<string, string> = {
  "Your internet address can be seen": "Tu dirección de internet puede verse",
  "On {network}, what you send here can go without Tor. The servers that carry it, yours and your contact's, can then see this phone's internet address (IP address), though not what you wrote.": "En {network}, lo que envías aquí puede ir sin Tor. Los servidores que lo llevan, el tuyo y el de tu contacto, pueden entonces ver la dirección de internet (dirección IP) de este teléfono, aunque no lo que escribiste.",
  "Calls never go through Tor. The call relay that carries the sound and picture, yours or your contact's, sees this phone's internet address (IP address), though not what is said.": "Las llamadas nunca van por Tor. El relay de llamadas que lleva el sonido y la imagen, el tuyo o el de tu contacto, ve la dirección de internet (dirección IP) de este teléfono, aunque no lo que se dice.",
  "This file is on a server your contact chose. Fetched without Tor, that server sees this phone's internet address (IP address), though not what the file holds.": "Este archivo está en un servidor que eligió tu contacto. Si se descarga sin Tor, ese servidor ve la dirección de internet (dirección IP) de este teléfono, aunque no lo que contiene el archivo.",
  "The site sees this phone's internet address (IP address), as any web page you open does. To hide it, open links in Tor Browser.": "El sitio ve la dirección de internet (dirección IP) de este teléfono, como cualquier página web que abres. Para ocultarla, abre los enlaces en Tor Browser.",
  "To show a link's preview, the page is fetched from its site. Without Tor, the site sees this phone's internet address (IP address).": "Para mostrar la vista previa de un enlace, la página se descarga de su sitio. Sin Tor, el sitio ve la dirección de internet (dirección IP) de este teléfono.",
  "On {network}, joining goes through a server. Without Tor, it sees this phone's internet address (IP address).": "En {network}, unirse pasa por un servidor. Sin Tor, ese servidor ve la dirección de internet (dirección IP) de este teléfono.",
  "Guide": "Guía",
  "Through Tor for this chat": "Por Tor para este chat",
};
