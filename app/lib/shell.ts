// Erevos on a computer (Linux and macOS) is the web build inside a small Electron shell
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

const BUILT_FOR = process.env.EXPO_PUBLIC_SHELL;
export const SHELL: 'electron' | 'sailfish' | null = BUILT_FOR === 'electron' || BUILT_FOR === 'sailfish' ? BUILT_FOR : null;

const TOKEN_KEY = 'erevos-shell-token';
let token = '';

/** Takes the shell's token from the page's address, before anything asks the shell. */
export function setupShell(): void {
  if (!SHELL || typeof window === 'undefined') return;
  const match = /[#&]erevos-token=([\w-]+)/.exec(window.location.hash);
  if (match) {
    token = match[1];
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Kept in memory only: a reload then cannot reach the shell.
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } else {
    try {
      token = sessionStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      token = '';
    }
  }
}

export class ShellError extends Error {}

// Answers that are not errors: nothing there (404), or too large to give (413).
const TOLD = [404, 413];

/** A request to one of the shell's paths. Throws ShellError when it answers with an error. */
export async function shellFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-Erevos-Token', token);
  const response = await fetch(path, { ...init, headers });
  if (!response.ok && !TOLD.includes(response.status)) throw new ShellError((await response.text()) || `The desktop app answered ${response.status}.`);
  return response;
}
