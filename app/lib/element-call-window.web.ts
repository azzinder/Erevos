import { ask } from './alert';
import { t } from './i18n';
import { callWindowClosed, callWindowMessage, type CallWindow, type MatrixCallsSpace } from './matrix-calls';
import { matrixCallAccount } from './matrix-store';
import { SHELL } from './shell';

// Element Call's window in the web app and on the computer, for Matrix calls (lib/matrix-calls.ts):
// a frame over the app, from an origin of its own, so Element Call can read nothing of the app's
// (pwa/element-call.mjs). The web app's is its second address, which its index.html names
// (pwa/build.mjs --call-origin): there the web app's service worker serves Element Call from the
// signed release too, and start.html runs it only once it does. The computer's is
// app://element-call (desktop/main.js). The Widget API goes both ways by postMessage, only to that
// origin and only from the frame. Element Call's back arrow, or Escape, puts the frame small in a
// corner over the app, as Android's picture in picture does; a tap on it brings it back. Until
// Element Call first speaks, a Close button under it ends the call, should it never start. Where the
// sound goes is the browser's to list, so Element Call shows the computer's own (hostAudio false).
// Sailfish OS has no Element Call.

const DESKTOP_CALL = 'app://element-call';

/** Element Call's origin here, or null where there is none. */
function callOrigin(): string | null {
  if (typeof document === 'undefined') return null;
  if (SHELL === 'electron') return DESKTOP_CALL;
  if (SHELL) return null;
  const named = document.querySelector('meta[name="erevos-call"]')?.getAttribute('content') ?? '';
  try {
    const origin = new URL(named).origin;
    return /^https?:\/\//.test(origin) && origin !== window.location.origin ? origin : null;
  } catch {
    return null;
  }
}

/** Element Call's first page, and the address Erevos says it is at (the Widget API's parentUrl). */
function pages(origin: string): { page: string; parentUrl: string } {
  if (origin === DESKTOP_CALL) return { page: `${DESKTOP_CALL}/index.html`, parentUrl: 'app://erevos/' };
  return { page: `${origin}/element-call/start.html`, parentUrl: `${window.location.origin}/` };
}

const FULL = 'position:fixed;inset:0;z-index:2147483000;background:#000;box-sizing:border-box;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
const SMALL =
  'position:fixed;z-index:2147483000;background:#000;right:calc(12px + env(safe-area-inset-right));bottom:calc(84px + env(safe-area-inset-bottom));width:144px;height:256px;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.6)';

type Shown = { box: HTMLDivElement; frame: HTMLIFrameElement; cover: HTMLButtonElement; leave: HTMLButtonElement };

/** Element Call's window and the space's account for it, while the space is open; null where
 *  Erevos cannot show it. `stop` stops listening to it. */
export function elementCall(): { window: CallWindow; space: MatrixCallsSpace; stop(): void } | null {
  const origin = callOrigin();
  if (!origin) return null;
  let shown: Shown | null = null;

  const tellFrame = (message: unknown) => shown?.frame.contentWindow?.postMessage(message, origin);

  function small(on: boolean): void {
    if (!shown) return;
    shown.box.style.cssText = on ? SMALL : FULL;
    shown.cover.style.display = on ? 'block' : 'none';
    shown.leave.style.visibility = on ? 'hidden' : 'visible';
    tellFrame({ erevos: { small: on } });
  }

  function close(): void {
    shown?.box.remove();
    shown = null;
  }

  function heard(event: MessageEvent): void {
    if (!shown || event.source !== shown.frame.contentWindow || event.origin !== origin) return;
    const data: unknown = event.data;
    if (!data || typeof data !== 'object') return;
    const ours = (data as { erevos?: unknown }).erevos;
    if (ours === undefined) {
      shown.leave.remove();
      callWindowMessage(data);
      return;
    }
    if (ours === 'back') small(true);
    else if (ours === 'bad-loader') {
      // As pwa/boot.js says it for the app's own worker (lib/integrity.web.ts raises the alarm).
      const page = window as Window & { erevosIntegrity?: unknown[] };
      page.erevosIntegrity?.push({ kind: 'bad-loader' });
      window.dispatchEvent(new CustomEvent('erevos-integrity', { detail: { kind: 'bad-loader' } }));
    } else if (typeof ours === 'object' && ours && 'failed' in ours) {
      // The service worker could not check Element Call on its origin: it does not run.
      close();
      callWindowClosed();
      const reason = String((ours as { failed: unknown }).failed ?? '');
      ask(t('Matrix calls are not ready on this device.'), reason, [{ text: t('OK') }]);
    }
  }
  window.addEventListener('message', heard);

  const { page, parentUrl } = pages(origin);
  return {
    window: {
      open(url) {
        close();
        const box = document.createElement('div');
        box.style.cssText = FULL;
        const frame = document.createElement('iframe');
        frame.allow = 'camera; microphone; autoplay; screen-wake-lock; fullscreen';
        frame.referrerPolicy = 'no-referrer';
        frame.title = 'Element Call';
        frame.style.cssText = 'border:0;width:100%;height:100%;display:block;background:#000';
        // Over the small frame: a tap brings the call back.
        const cover = document.createElement('button');
        cover.type = 'button';
        cover.title = t('Back to the call');
        cover.setAttribute('aria-label', t('Back to the call'));
        cover.style.cssText = 'position:absolute;inset:0;display:none;background:transparent;border:0;padding:0;cursor:pointer';
        cover.onclick = () => small(false);
        const leave = document.createElement('button');
        leave.type = 'button';
        leave.textContent = t('Close');
        leave.style.cssText =
          'position:absolute;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:10px 24px;border:0;border-radius:22px;background:#2B2621;color:#F2EDE6;font:500 15px system-ui,sans-serif;cursor:pointer';
        leave.onclick = () => {
          close();
          callWindowClosed();
        };
        box.append(frame, cover, leave);
        document.body.append(box);
        shown = { box, frame, cover, leave };
        frame.src = url;
      },
      post: (message) => tellFrame(message),
      close,
    },
    space: { ...matrixCallAccount, page, parentUrl, hostAudio: false },
    stop() {
      window.removeEventListener('message', heard);
      close();
    },
  };
}

/** Whether Matrix calls can be made here. */
export function canElementCall(): boolean {
  return callOrigin() !== null;
}
