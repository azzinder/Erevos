// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';
// Erevos on a computer (Linux, macOS and Windows) is the web build inside a small Electron shell
// (desktop/main.js), and on Sailfish OS inside Sailfish WebView, served by a small server of the
// app's own (sailfish/src/shellserver.cpp). The build says which (EXPO_PUBLIC_SHELL=electron or
// sailfish); the phone and the plain web builds have none. Both shells answer the same paths;
// on Sailfish OS backups go to Documents/Erevos and saved files to Downloads, without asking, and
// files to send are picked with the browser's own picker. The shell serves the app from its own origin and answers a few paths there,
// only with the token it put in the page's address (#erevos-token=…), so nothing else can use them:
//   /__secret?key=…   the keystore (lib/secure.ts): small values, sealed with the system's keyring
//                     (on a Mac the Keychain)
//   /__file?name=…    the app's files (lib/files.ts), in its own folder; /__files?prefix=… lists them
//   /__folder         asks for a folder for backups (lib/backup-place.web.ts), and remembers it
//   /__backup?…       writes a backup into such a folder, keeping the newest
//   /__pick           asks for a file to open (lib/pick-file.web.ts), and gives its bytes
//   /__latest         the latest release's version.json (lib/updates.ts), which a page cannot read
//   /__webdav?…       on a computer, one request to the server backups go to (lib/backup-http.web.ts),
//                     which a page may not make itself (CORS)
//   /__window         the computer's window (lib/desktop.ts): kept running when closed, brought back
//   /__watch          on Sailfish OS, the open space's queues for its helper to wait on while Erevos
//                     is closed (lib/shell-watch.ts)
// The computer's shell also says in the address which of its packages it runs from
// (#erevos-system=…), so Check for updates can name the file to take (lib/updates.ts packageFile).

const BUILT_FOR = process.env.EXPO_PUBLIC_SHELL;
export const SHELL: 'electron' | 'sailfish' | null = BUILT_FOR === 'electron' || BUILT_FOR === 'sailfish' ? BUILT_FOR : null;

const TOKEN_KEY = 'erevos-shell-token';
const SYSTEM_KEY = 'erevos-shell-system';
let token = '';
let system = '';

/** Takes the shell's token, and the package it says it is, from the page's address, before anything asks the shell. */
export function setupShell(): void {
  if (!SHELL || typeof window === 'undefined') return;
  const match = /[#&]erevos-token=([\w-]+)/.exec(window.location.hash);
  if (match) {
    token = match[1];
    system = /[#&]erevos-system=([\w-]+)/.exec(window.location.hash)?.[1] ?? '';
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(SYSTEM_KEY, system);
    } catch {
      // Kept in memory only: a reload then cannot reach the shell.
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } else {
    try {
      token = sessionStorage.getItem(TOKEN_KEY) ?? '';
      system = sessionStorage.getItem(SYSTEM_KEY) ?? '';
    } catch {
      token = '';
    }
  }
}

/** Which package of the computer's shell this is ('windows', 'windows-portable', 'macos', 'linux', 'linux-appimage'), or '' when it does not say. */
export function shellSystem(): string {
  return system;
}

/** Brings the computer's window back, closed into the tray or behind another: a call came, a notice was tapped. */
export function showWindow(): void {
  if (SHELL === 'electron') void shellFetch('/__window?show=1', { method: 'PUT' }).catch(() => undefined);
}

export class ShellError extends Error {}

// Answers that are not errors: nothing there (404), or too large to give (413).
const TOLD = [404, 413];

/** A request to one of the shell's paths. Throws ShellError when it answers with an error. */
export async function shellFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-Erevos-Token', token);
  const response = await fetch(path, { ...init, headers });
  if (response.status === 503 && response.headers.get('X-Erevos-Secret-Store') === 'no-keyring') {
    throw new ShellError(
      t('This computer has no keyring to seal Erevos’s keys with, so Erevos keeps none. Start a keyring (KWallet, or GNOME Keyring with --password-store=gnome-libsecret), or start Erevos with --plain-secrets to keep them unsealed, readable by your user, and set a password lock.'),
    );
  }
  if (!response.ok && !TOLD.includes(response.status)) throw new ShellError((await response.text()) || t('The desktop app answered {status}.', { status: response.status }));
  return response;
}
