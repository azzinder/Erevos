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
  under Lock → This web app → Look for an update). It takes one only if it is signed with the same
  key and has a higher version; it starts the next time the app opens. An unsigned one, a second
  different one with the same version, or an older one (with faults fixed since) is refused, and
  the app says so.
- **The worker itself is watched.** The browser fetches `sw.js` by itself, at least once a day,
  and installs a different one without asking the worker in charge. When it does, `boot.js`
  hashes the new `sw.js` and asks the worker whether a signed release lists it. If not, the app
  warns: **Erevos was tampered with**.
- **The server is watched.** `node pwa/release.mjs verify https://<address>` checks the
  signature and every file the server gives out; anyone can run it.
  `.github/workflows/web-watch.yml` runs it every day once the repository variable
  `EREVOS_WEB_URL` is set. `deploy/web/deploy.sh` keeps each signed list in `pwa/releases/`, so
  every release is on record.
- **The page is shut to anything else**: a Content-Security-Policy that allows scripts only from
  the app's own origin (and WebAssembly), no frames, no forms, no referrer; the same policy is in
  the signed `index.html` and added by the worker, so a server that drops the header loosens
  nothing. The app has its own subdomain, apart from the relay.
- **Data on the device** is in the browser's IndexedDB (`app/lib/web-store.ts`): the sealed files
  as on the phone, and the keystore's values sealed with a non-extractable AES key (Safari keeps
  it wrapped with a key in the Keychain). An app on the home screen is not cleared after 7 days as
  a Safari tab is.

## What it does not do

- **Trust on first start.** The first time, the server sends `boot.js` and `sw.js`, the part that
  checks. A server that is already bad then can send a worker that checks nothing. The app shows
  the release key's fingerprint under Lock → This web app: comparing it with the one given with
  the address (in person, or over another app) catches that.
- **The browser replaces the worker.** The check of a new `sw.js` is made by the page, with a
  request the server can tell apart from the browser's own, so a server that knows about it can
  give the check the right file and the browser another. Then the new worker takes over once the
  app is closed. No web page can stop the browser doing this. What remains: the warning when the
  server is careless, the daily check of the server, and the password lock, which keeps the chats
  sealed from code that does not know the password (it would have to ask for it).
- **One person singled out.** A server that gives changed code only to one person is not seen
  by the daily check, only by that person's app, as above.
- **The browser itself.** Apple makes Safari and could change what it does, as with any iPhone
  app.
- **Not while closed.** iOS stops web apps in the background: messages wait on the relay until
  the app opens. Notifications can say that some came (Lock → Notifications while closed, off
  unless turned on): the relay pushes through the browser's push service, at most once in 15
  seconds (`crates/erevos-relay/src/push.rs`, `lib/web-push.web.ts`), for the space's own queue,
  its groups' and each contact's own queue (`lib/push-queues.ts`), all with the browser's one push
  address; with no Tor here the relay sees the contacts' queues waited on together anyway, from one
  address, while the app is open. Each push holds how many
  messages came, encrypted for the browser, as the sending phones marked them: a message someone
  reads counts, word between phones (that a message came or was read, new keys) pushes nothing,
  and a call that rings pushes and says so without counting. The service worker then shows "3 new
  messages", in the app's language, or "Call" when only a call rang. It shows "New message",
  or "New messages" once more came since Erevos was last open, without a number, when the push
  is empty (a relay from before the counts) or the relay could not count all of it (a sender's
  Erevos from before the marks, or a message other phones carried to the relay, which cannot say
  what it holds), until Erevos is open again. The worker keeps which queues pushed, to count each
  message once, only until Erevos opens or closes: a short tag of each, unsealed, which shows how
  many contacts wrote, never who. The push service sees when a message comes, and that
  the device uses Erevos; never what or from whom (though pushes more than 15 seconds apart can be
  counted, and the queues that got messages push in turn, so a run of them can hint how many
  contacts wrote at once). The pushes also put a number on Erevos's icon (the Badging API: on an
  iPhone or iPad from 16.4, for the web app on the home screen, once notifications are allowed; a
  Mac's Safari web app; Chrome or Edge on Windows, macOS or ChromeOS): what the open space had not
  read when the app last counted it (`lib/unread.ts`, `lib/icon-number.ts`, told by
  `lib/push-notice.web.ts` as Erevos shows and leaves, and while it shows), never a hidden chat's,
  and what the pushes said came since, each push or send that did not say how many as one. Only for
  a space with notifications on; with no space open (at the password) the number stays. A push
  that comes after Erevos left the screen for a message it had taken there (a push service slow to
  bring it, or one the relay held back for its gap) counts that message once more, until Erevos shows.
  **Number on the icon** (Settings → Notifications) turns it off on the device. The worker keeps
  that number unsealed beside the count, also after Erevos opens, and for it its own tags of the
  queues that pushed, until the app next counts with a space open.
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

The address needs its own DNS name (an A record to the server), apart from the relay's.

## Files

- `sw.js`: the service worker; `build.mjs` writes the public key into it.
- `boot.js`, `boot.css`: the page's first script, and its screens before the app starts.
- `i/`: the page an invite sent by text message opens, `/i#<invite>`.
- `build.mjs`: makes the web app from the web build, with the icons from `brand/`.
- `release.mjs`: `keygen`, `sign`, `verify`.
- `release-key.pub`: the release key's public half (made by `keygen`).
- `releases/`: the signed list of every release served.
- In the app: `lib/web-store.ts` (storage), `lib/integrity.web.ts` and
  `components/integrity-card.tsx` (what the worker says), `lib/hand-over.web.ts` (files out through
  the share sheet).
