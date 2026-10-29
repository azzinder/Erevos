# Erevos web app

Erevos for an iPhone without an Apple account, and for any browser: the app's web build, with
the core in WebAssembly, added to the home screen from Safari. It is served from your own server
(`deploy/web/`), and it runs only code signed with a release key that you hold and the server
does not.

## The problem it answers

A web app is code the server sends, every time. A server that is broken into, or ordered to,
could send changed code to everyone, or to one person, and that code could read the chats. An
app from a store is installed once and changes only when updated.

## What it does about it

- **One key signs every release.** `pwa/build.mjs` lists every file of the app with its SHA-256
  in `release.json`; `pwa/release.mjs sign` signs that list with an Ed25519 key kept on your own
  computer, encrypted with a passphrase. The public half is in `pwa/release-key.pub` and inside
  the service worker. The server has neither the key nor a way to make a signature.
- **The code is kept on the device and checked.** On first start the service worker (`sw.js`)
  fetches the list and its signature, checks the signature and every file, and keeps them. From
  then on it serves the app only from what it kept: a file not on the list is not served, and the
  server is not asked for code again. `boot.js` starts the app only once the worker serves it,
  so not even the first start runs the app's code straight from the server.
- **Updates must be signed and newer.** The worker looks for a new release every 6 hours (and
  under Settings → Privacy and security → This web app → Look for an update). It takes one only if
  it is signed with the same key and has a higher version; it starts the next time the app opens.
  An unsigned one, a second different one with the same version, or an older one (with faults
  fixed since) is refused, and the app says so.
- **The worker itself is watched.** The browser fetches `sw.js` by itself, at least once a day,
  and installs a different one without asking the worker in charge. When it does, `boot.js`
  hashes the new `sw.js` and asks the worker whether a signed release lists it. If not, the app
  warns: **Erevos was tampered with**.
- **The server is watched.** `node pwa/release.mjs verify https://<address>` checks the
  signature and every file the server gives out; anyone can run it.
  `.github/workflows/web-watch.yml` runs it every Monday once the repository variable
  `EREVOS_WEB_URL` is set. `deploy/web/deploy.sh` keeps each signed list in `pwa/releases/`, so
  every release is on record.
- **The page is shut to anything else**: a Content-Security-Policy that allows scripts only from
  the app's own origin (and WebAssembly), one frame (Element Call's, from its own address, below),
  no forms, no referrer; it connects only over HTTPS and WebSocket, to the relays and the Matrix,
  XMPP and Nostr servers the owner adds. The same policy is in the signed `index.html` and added by
  the worker, so a server that drops the header loosens nothing. The app has its own subdomain,
  apart from the relay.
- **Data on the device** is in the browser's IndexedDB (`app/lib/web-store.ts`): the sealed files
  as on the phone, and the keystore's values sealed with a non-extractable AES key (Safari keeps
  it wrapped with a key in the Keychain). An app on the home screen is not cleared after 7 days as
  a Safari tab is.

## What it does not do

- **Trust on first start.** The first time, the server sends `boot.js` and `sw.js`, the part that
  checks. A server that is already bad then can send a worker that checks nothing. The app shows
  the release key's fingerprint under Settings → Privacy and security → This web app: comparing it
  with the one given with the address (in person, or over another app) catches that.
- **The browser replaces the worker.** The check of a new `sw.js` is made by the page, with a
  request the server can tell apart from the browser's own, so a server that knows about it can
  give the check the right file and the browser another. Then the new worker takes over once the
  app is closed. No web page can stop the browser doing this. What remains: the warning when the
  server is careless, the weekly check of the server, and the password lock, which keeps the chats
  sealed from code that does not know the password (it would have to ask for it).
- **One person singled out.** A server that gives changed code only to one person is not seen
  by the weekly check, only by that person's app, as above.
- **The browser itself.** Apple makes Safari and could change what it does, as with any iPhone
  app.
- **Not while closed.** iOS stops web apps in the background: messages wait on the relay until the
  app opens. Notifications can say that some came (Settings → Notifications → Notifications while
  closed, off unless turned on): the relay pushes through the browser's push service, at most once
  in 15 seconds (`crates/erevos-relay/src/push.rs`, `lib/web-push.web.ts`), for the space's own
  queue, its groups' and each contact's own queue (`lib/push-queues.ts`), all with the browser's one
  push address; with no Tor here the relay sees the contacts' queues waited on together anyway, from
  one address, while the app is open. Each push holds how many messages came, encrypted for the
  browser, as the sending phones marked them: a message someone reads counts, word between phones
  (that a message came or was read, new keys) pushes nothing, and a call that rings pushes and says
  so without counting. The service worker then shows "3 new messages", in the app's language, or
  "Call" when only a call rang. It shows "New message", or "New messages" once more came since
  Erevos was last open, without a number, when the push is empty (a relay from before the counts) or
  the relay could not count all of it (a sender's Erevos from before the marks, or a message other
  phones carried to the relay, which cannot say what it holds), until Erevos is open again. The
  worker keeps which queues pushed, to count each message once, only until Erevos opens or closes: a
  short tag of each, unsealed, which shows how many contacts wrote, never who. After, it keeps the
  rounds it counted, up to 128, with their counts and no tag: their numbers, which the relay draws
  at random, name no queue, and a push of one that comes late counts nothing twice. Each push also
  says when the relay sent it. The worker keeps when the app last took from its relay, as the app
  says when Erevos shows or leaves and when it counts, and how late the last 32 pushes came, which
  puts the relay's clock on the phone's: a push of a round it never had, sent more than 30 seconds
  before the app last took from its relay, was held back by its push service (the phone was
  offline), so it counts nothing, and what comes after it in its round counts. The push service sees
  when a message comes, and that the device uses Erevos; never what or from whom (though pushes more
  than 15 seconds apart can be counted, and the queues that got messages push in turn, so a run of
  them can hint how many contacts wrote at once). The pushes also put a number on Erevos's icon (the
  Badging API: on an iPhone or iPad from 16.4, for the web app on the home screen, once
  notifications are allowed; a Mac's Safari web app; Chrome or Edge on Windows, macOS or ChromeOS):
  what the open space had not read when the app last counted it (`lib/unread.ts`,
  `lib/icon-number.ts`, told by `lib/push-notice.web.ts` as Erevos shows and leaves, and while it
  shows), never a hidden chat's, and what the pushes said came since, each push or send that did not
  say how many as one. Only for a space with notifications on; with no space open (at the password)
  the number stays. A push that comes after Erevos left the screen for a message it had taken there,
  sent less than 30 seconds before the app last took from its relay (or by a relay from before the
  time in the pushes), counts that message once more, until Erevos shows. **Number on the icon**
  (Settings → Notifications) turns it off on the device. The worker keeps that number unsealed
  beside the count, also after Erevos opens, and for it its own tags of the queues that pushed,
  until the app next counts with a space open, then their rounds as above.
- **No Bluetooth, nearby link or SMS**, which Safari does not allow, and no automatic backups: a
  browser gives out a file only after a tap.

## The invite page

An invite sent by text message is a link to `/i#<invite>` (`app/lib/text-invite.ts`): the invite
is the part after `#`, which the browser never sends to the server. `/i/` is a page of its own in
every release (`pwa/i/`), signed with the rest. It reads the invite on the device and shows who
invites and until when, and how to take it: on Android, Erevos and then
`erevos://text-invite?d=<invite>`; on an iPhone, the link copied, Erevos added to the home screen
and the link pasted in New chat; elsewhere, the app or the web app. Where the web app's own
worker serves the page, it can also hand the invite to it at `/text-invite?d=<invite>`, which the
worker answers without the server; not in Safari on an iPhone, whose web app is the one on the
home screen. The server needs nothing new: Apache sends `/i` on to `/i/`, which keeps the part
after `#`, and the worker gives the page at both; the page then shows `/i` again, the link the app
takes. `deploy.sh` checks that `/i` gives the page. A browser whose worker came before the page
opens the app at `/i` until it takes the new worker, once every Erevos window is closed.

The first time, the page comes straight from the server, unchecked, as the web app's own first
start does. A server that is broken into could send a page that passes the invite on: an invite is
as safe as the text message that carries it, for the 2 days it lasts.

## The contact page

A contact link for a website (**Link for a website**, under New chat → Your contact link) is a
link to `/c#<the contact link's fields>[&n=<name>]` (`app/lib/contact-code.ts`, `contactPageLink`),
for a page anyone may open, such as a contact page. `/c/` is a page of its own in every release
(`pwa/c/`, with the invite page's style), signed with the rest, served as `/i/` is. It reads the
link on the device and shows whom it adds and how: on Android, Erevos and then
`erevos://contact?<fields>`; on an iPhone, the link copied, Erevos added to the home screen and the
link pasted in New chat; elsewhere, the app or the web app; where the web app's worker serves the
page, `/contact?<fields>`. The link has no place on a relay in it, and it lasts as long as the
contact link does (New contact link ends it). Whoever adds it writes a message request first.

## Matrix calls

A Matrix call opens Element Call (Element's call app, AGPL-3.0, from the npm package
`@element-hq/element-call-embedded` that `app/package.json` pins) over the app, as on Android
(`docs/matrix.md`). It is code Erevos does not write, so it never runs where Erevos's keys are:

- **An address of its own.** Element Call comes from a second address on the same server,
  `erevos-call.<…>` (`build.mjs --call-origin`), so the browser keeps it apart from the app: it
  cannot read the app's storage, its keys or its chats, nor its worker's files. The app's page may
  show only that one frame (`frame-src`), and Element Call's pages may be shown only in the app
  (`frame-ancestors`). `app/lib/element-call-window.web.ts` opens it and speaks the Widget API with
  it by `postMessage`, only to and from that address.
- **The same signed release.** `pwa/element-call.mjs` copies Element Call's files into the release
  (as Android leaves out the source maps, the background blur and Matrix's own encryption in
  WebAssembly), takes out the page's two inline scripts into `erevos-call.js`, and empties
  `config.json`, so it reports to no one. Both addresses serve the same `release.json`,
  `release.sig` and `sw.js`. `build.mjs` writes both addresses into the worker, which keeps and
  serves on each only its own files: on Element Call's only `/element-call/`, on the app's all else.
  Each address installs and checks its own copy of the worker against the same signed list.
- **Checked before it runs.** The frame first opens `element-call/start.html`, which installs the
  worker on Element Call's address and opens Element Call only once the worker serves it; a
  browser with no service worker there gets no call, and the app says why. The first call takes a
  moment longer: the worker fetches about 7 MB once. `erevos-call.js` checks a new `sw.js` the
  browser fetches there, as `boot.js` does for the app's, and the app warns when no signed release
  lists it.
- **Nothing else reached.** On Element Call's address the worker refuses its requests to trackers
  (PostHog, Sentry, Google's) and to any `/_matrix/` address: it reaches the homeserver only
  through Erevos, by the Widget API, which allows it only what a call needs. It reaches the media
  server the homeserver names (LiveKit) itself, over HTTPS and WebSocket.
- **The server.** The second address needs its own DNS name and certificate, served with the
  headers of `deploy/web/install.sh` (which makes both Caddy sites); the app's address answers 404
  for `/element-call/`, and `deploy.sh` checks that it does. `release.mjs verify` checks the files
  of both addresses; a second address that gives no release yet (not set up) only gets a warning,
  as Matrix calls cannot start from it. A release is made for its two addresses: `publish.sh` and `deploy.sh` refuse
  one made for others, and `release.sh` makes one for yours (`--origin`, `--call-origin`).

What remains:

- **Trust on first start, again.** The first time, Element Call's address sends `start.html` and
  `sw.js` unchecked, as the app's does. A server that is already bad could send a worker there
  that checks nothing. It would see the call (its sound, picture and keys), not the app's keys or
  chats, and the weekly check of the server checks that address too.
- **Workers from before.** A worker from a release before this one does not know the second
  address. Until the browser replaces it, it keeps Element Call's files of a new release too, and
  would give them on the app's address to a page opened there by hand; the app itself opens them
  only from the second address, and the new worker refuses them on the app's.
- **The browser decides the media.** Which camera, microphone and speaker a call uses is the
  browser's to list, so Element Call shows the device's own (no choice through Erevos).

## Making a release

Once, on your own computer, make the key and commit its public half:

    node pwa/release.mjs keygen ~/.erevos/web-release.key
    git add pwa/release-key.pub && git commit -m "Web app: the release key"

Keep `~/.erevos/web-release.key` and its passphrase, and a copy of both offline. Without them no
update can be signed, and every installed app would have to be removed and added again with a
new key. The fingerprint it shows is the one people compare.

Then, for each release: every GitHub release, `v2.0.0` and up (`.github/workflows/release.yml`),
carries the web app built from the same commit as the other packages, numbered like them, but not
signed (`erevos-web.tar.gz`). On the computer with the key:

    deploy/web/publish.sh 2.0.0 root@<server> <app.example.org>

It downloads it, checks it against the release's `SHA256SUMS` and its number, signs it (and, with
the same passphrase, the release's Android app by its build and SHA-256, `android-update.json`,
which Check for updates on Android needs before it installs it), checks it, copies it to the server, serves it with Caddy (Let's Encrypt, HSTS, the headers above) and
checks what the server then gives out. A server with its own web server (Apache, nginx) takes
`--files-only` before the number: it then only switches `/var/www/erevos-web/current`, which
that web server serves with the headers of `deploy/web/install.sh`. Commit
`pwa/releases/<version>/` afterwards.

Signing what GitHub built means trusting GitHub's build of that commit; the key never leaves your
computer, so no one else can sign. To build it yourself instead, from a clean checkout:

    deploy/web/release.sh ~/.erevos/web-release.key /tmp/erevos-web
    deploy/web/deploy.sh root@<server> <app.example.org> /tmp/erevos-web

The address needs its own DNS name (an A record to the server), apart from the relay's, and Element
Call's second address another one. Without Element Call (`build.mjs --no-element-call`) the web
app makes no Matrix calls and needs no second address.

## Files

- `sw.js`: the service worker; `build.mjs` writes the public key into it.
- `boot.js`, `boot.css`: the page's first script, and its screens before the app starts.
- `i/`: the page an invite sent by text message opens, `/i#<invite>`.
- `c/`: the page a contact link for a website opens, `/c#<contact link>`.
- `element-call.mjs`: makes Element Call ready for its frame, for the web app and the computer.
- `build.mjs`: makes the web app from the web build, with the icons from `brand/`.
- `release.mjs`: `keygen`, `sign`, `verify`.
- `release-key.pub`: the release key's public half (made by `keygen`).
- `releases/`: the signed list of every release served.
- In the app: `lib/web-store.ts` (storage), `lib/integrity.web.ts` and
  `components/integrity-card.tsx` (what the worker says), `lib/hand-over.web.ts` (files out through
  the share sheet).
