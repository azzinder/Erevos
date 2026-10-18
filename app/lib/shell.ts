// Erevos on a computer (Linux and macOS) is the web build inside a small Electron shell
// (desktop/main.js). The build says so (EXPO_PUBLIC_SHELL=electron); the phone and the plain web
// builds have none. The shell serves the app from its own origin and answers a few paths there,
// only with the token it put in the page's address (#erevos-token=…), so nothing else can use them:
//   /__secret?key=…   the keystore (lib/secure.ts): small values, sealed with the system's keyring
//                     (on a Mac the Keychain)
//   /__file?name=…    the app's files (lib/files.ts), in its own folder; /__files?prefix=… lists them
//   /__folder         asks for a folder for backups (lib/backup-place.web.ts), and remembers it
//   /__backup?…       writes a backup into such a folder, keeping the newest
//   /__pick           asks for a file to open (lib/pick-file.web.ts), and gives its bytes

export const SHELL: 'electron' | null = process.env.EXPO_PUBLIC_SHELL === 'electron' ? 'electron' : null;

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
