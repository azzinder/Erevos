// Erevos web app: the first script of the page (index.html, written by pwa/build.mjs). It starts
// the app only once the service worker (pwa/sw.js) serves it, so the app's code is always the
// signed release's, never whatever the server sends:
// - the first time, it installs the worker, which checks the release, and opens the page again
//   from it;
// - every time, it watches for a new worker that the browser fetched by itself, and checks that a
//   signed release lists it (README.md says how far that check goes);
// - it passes the worker's news to the app (lib/integrity.web.ts) as `erevos-integrity` events,
//   and keeps the last ones in `window.erevosIntegrity`.
// On an iPhone, in Safari, it first shows how to add Erevos to the home screen.
(() => {
  const script = document.currentScript;
  const entry = script?.dataset.entry;
  const news = [];
  window.erevosIntegrity = news;

  function say(message) {
    news.push(message);
    window.dispatchEvent(new CustomEvent('erevos-integrity', { detail: message }));
  }

  function screen(title, text, action) {
    const box = document.createElement('div');
    box.className = 'erevos-boot';
    const heading = document.createElement('h1');
    heading.textContent = title;
    box.append(heading);
    for (const line of [].concat(text)) {
      const p = document.createElement('p');
      p.textContent = line;
      box.append(p);
    }
    if (action) {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.onclick = () => {
        box.remove();
        action.run();
      };
      box.append(button);
    }
    document.querySelector('.erevos-boot')?.remove();
    document.body.append(box);
  }

  function startApp() {
    document.querySelector('.erevos-boot')?.remove();
    const app = document.createElement('script');
    app.src = entry;
    app.defer = true;
    document.body.append(app);
  }

  /** Asks the worker in charge, and waits for its answer. */
  function ask(question) {
    const worker = navigator.serviceWorker.controller;
    if (!worker) return Promise.resolve(null);
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => resolve(event.data);
      worker.postMessage(question, [channel.port2]);
      setTimeout(() => resolve(null), 20_000);
    });
  }
  window.erevosWorker = ask;

  async function hashOf(url) {
    const bytes = await (await fetch(url, { cache: 'no-store' })).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  let checkedLoader = false;

  // A new worker, fetched by the browser: is it one a signed release lists?
  async function checkLoader() {
    if (checkedLoader || !navigator.serviceWorker.controller) return;
    checkedLoader = true;
    try {
      const answer = await ask({ erevos: 'check-loader', hash: await hashOf('/sw.js') });
      if (answer && !answer.known) say({ kind: 'bad-loader' });
    } catch {
      say({ kind: 'bad-loader' });
    }
  }

  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function install() {
    screen(
      'Add Erevos to your home screen',
      [
        'In Safari, tap Share, then Add to Home Screen, then open Erevos from there.',
        'Installed, Erevos keeps its code on the phone and checks every update against the release key, and Safari keeps its data. In a Safari tab, Safari deletes it after 7 days without a visit, and the app on the home screen does not see it.',
      ],
      { label: 'Use it in Safari anyway', run: () => (sessionStorage.setItem('erevos-in-safari', '1'), begin()) },
    );
  }

  async function begin() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      screen('Erevos cannot check itself here', [
        'This browser does not let Erevos keep and check its own code (it needs a service worker, over https). In a private window most browsers do not.',
        'Open Erevos in a normal window, or install it on the home screen.',
      ]);
      return;
    }
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.erevos) say(event.data.erevos);
    });
    if (navigator.serviceWorker.controller) {
      startApp();
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
        registration.addEventListener('updatefound', () => void checkLoader());
        if (registration.installing || registration.waiting) void checkLoader();
      } catch {
        // The worker in charge goes on serving the release it has.
      }
      return;
    }
    // The first start: the worker checks the release, keeps it, and takes over; then the page opens again from it.
    screen('Checking Erevos…', 'Erevos is fetching its code and checking it against the release key.');
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    const failed = (reason) =>
      screen('Erevos did not pass its check', ['Its code could not be fetched or did not match the signed release, so it was not started.', reason], {
        label: 'Try again',
        run: () => window.location.reload(),
      });
    let reason = '';
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.erevos?.kind === 'install-failed') reason = event.data.erevos.reason;
    });
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      const worker = registration.installing ?? registration.waiting;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'redundant') setTimeout(() => failed(reason), 100);
      });
    } catch (error) {
      failed(String(error?.message ?? error));
    }
  }

  if (iphone && !installed && !sessionStorage.getItem('erevos-in-safari')) install();
  else void begin();
})();
