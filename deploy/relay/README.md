# Running the relay on a server

This sets up the relay on a Debian or Ubuntu server so phones can reach it from
anywhere, as `wss://<domain>`:

- The relay listens on `127.0.0.1` only. Caddy sits in front of it, gets a TLS
  certificate from Let's Encrypt and renews it.
- A random token is required on every connection from a phone. Only the two
  paths other relays use need none: `/sealed`, which takes nothing but sealed
  messages for this relay's own queues, and `/files`, which hands out or
  deletes a chunk of a file only to whoever knows its id. With lending turned
  on (see [Lending places](#lending-places)), a phone may also come with a
  ticket from a contact link or with the lent token it got for it.
- Queues and waiting messages are kept on disk, so a restart or a reboot loses
  nothing.
- No request is logged, by the relay or by Caddy.
- A call relay (coturn) runs beside it, so calls go between phones without
  either learning the other's IP address. Phones get credentials for it from
  the relay, so only phones with the token can use it.

## What you need

- A server (VPS) running Debian 12 or later, or Ubuntu 22.04 or later, with a
  public IP address and SSH access as root or as a user who can use `sudo`.
- A domain or subdomain whose DNS A record points at that IP address. Without
  one, `<ip-with-dashes>.sslip.io` names the same address (for `203.0.113.7`,
  `203-0-113-7.sslip.io`). Let's Encrypt usually issues certificates for those
  names, but its limits are shared with everyone who uses them.
- Ports 80 and 443 open to the internet, including in the provider's firewall
  if it has one. Port 80 is only used to get the certificate.
- For calls, port 3478 (UDP and TCP) and the UDP ports 50000 to 50999 open as
  well. A server whose public IP address is not on its own network card (the
  provider maps it, as AWS and Google Cloud do) also needs
  `external-ip=<public IP>/<private IP>` added to `/etc/turnserver.conf`.

## Install or update

From your checkout, on the commit you want to run:

    deploy/relay/deploy.sh root@203.0.113.7 relay.example.org

This copies the source to the server and runs `install.sh` there, which
installs Caddy and Rust, builds the relay, creates the token and starts both
services. Run it again to update. The token and the queues are kept.

Without a domain, leave it out: the server then uses
`<ip-with-dashes>.sslip.io` by itself.

### From a phone, with no computer

You need a way into the server's shell (an SSH app, or the provider's web
console) and a GitHub token that can read this repository: on GitHub,
Settings, Developer settings, Fine-grained tokens, Generate new token, only
this repository, Contents read-only, expiring tomorrow. Then, as root on the
server, paste this; it asks for the token without showing it:

    read -rp 'GitHub token: ' -s t; echo; curl -fsSL -H "Authorization: Bearer $t" https://api.github.com/repos/azzinder/erevos/tarball/main -o /root/erevos.tgz && rm -rf /root/erevos-relay-src && mkdir /root/erevos-relay-src && tar -xzf /root/erevos.tgz -C /root/erevos-relay-src --strip-components=1 && sh /root/erevos-relay-src/deploy/relay/install.sh; unset t

Delete the token on GitHub afterwards. Paste the same line again to update.

Already on the server with the source? Run `sudo sh deploy/relay/install.sh
relay.example.org` from the top of it instead.

## In the app

- Relay address: `wss://relay.example.org`
- Token: the part after `EREVOS_RELAY_TOKEN=` in the output of
  `sudo cat /etc/erevos-relay.env` on the server.

Every phone uses the same address. With only the relay's token, every phone
uses that one too; give each phone a token of its own instead (see
[Phones' own tokens](#phones-own-tokens)) to take one phone's access back
without touching the others. Do not post a token where others can read it.

To change the relay's token, run `sudo rm /etc/erevos-relay.env` on the
server, run the install again, and type the new token into every phone that
used it.

## Phones' own tokens

Each phone can have a token of its own, beside the relay's one, which keeps
working. Add a line to `/etc/erevos-relay.env`:

    EREVOS_RELAY_TOKENS=/etc/erevos-relay.tokens

and restart. Then, for each phone, run on the server:

    erevos-relay new-token Nekten-Pixel

It prints the phone's token, to type into its Relay settings as the token, and
a line to add to `/etc/erevos-relay.tokens`:

    echo '<the line it printed>' | sudo tee -a /etc/erevos-relay.tokens

The file holds only each token's SHA-256 and the name you gave, so reading it
does not let anyone connect. The relay reads it again whenever it changes,
with no restart, and says in its log how many tokens it holds. To take a
phone's access back, delete its line: from the next connection on its token is
refused, as a wrong one is, and a connection already open goes on until it
ends, five minutes after its last request at most. Lines that start with `#`
are left out. The relay must be able to read the file: if its log says it
cannot, run `sudo chmod 644 /etc/erevos-relay.tokens`.

Once every phone has its own, remove `EREVOS_RELAY_TOKEN` from
`/etc/erevos-relay.env` and restart: then only the phones on the list come in.

## Where things are

- `/usr/local/bin/erevos-relay`: the relay.
- `/etc/systemd/system/erevos-relay.service`: the service.
- `/etc/erevos-relay.env`: the token, and the secret the relay shares with the
  call relay, readable by root only.
- `/etc/turnserver.conf`: the call relay's settings, with that secret. If the
  file was there before, the original is kept as `turnserver.conf.orig`.
- `/var/lib/erevos-relay/queues.journal`: queues and waiting messages. A
  message nobody takes expires after 14 days (`EREVOS_RELAY_TTL_DAYS`, see
  [Settings](#settings), changes that), and only the hour it came is kept. The
  service runs as a temporary user, so systemd keeps the file under
  `/var/lib/private/erevos-relay/`.
- `/var/lib/erevos-relay/relay.key`: the relay's key for sealed sends from
  other relays (two-hop sending), made on first start, in the same private
  place. Keep it: phones that send through a second relay seal to it, and a
  new key only means they fetch it again.
- `/var/lib/erevos-relay/files/`: the chunks of photos and files that phones
  send, encrypted on the phone, one file per chunk, in the same private place.
  The contact deletes them once it has them; the rest expire like messages.
  They may take 1024 MB together (`EREVOS_RELAY_FILES_MB` changes that);
  past it, phones are told the relay is full.
- `/var/lib/erevos-relay/relay.key.lent-counts` and
  `/var/lib/erevos-relay/relay.key.revoked`, only with lending turned on: see
  [Lending places](#lending-places).
- `/etc/caddy/erevos-relay.caddy`: the Caddy site, imported from
  `/etc/caddy/Caddyfile`. If that file was the one the package ships, the
  original is kept as `Caddyfile.orig`.

`journalctl -u erevos-relay` shows the relay's start-up lines and errors.
`systemctl status erevos-relay caddy coturn` shows whether all three run.

If a part of the relay fails while it holds the queues or the files, the relay
stops with a line saying so rather than run on half broken, and systemd
starts it again two seconds later. It reads its queues and files back as after
any restart.

## Settings

The relay takes its settings from `/etc/erevos-relay.env`, one `NAME=value`
line each. An update keeps the lines you add there (the service file itself is
replaced on every update). After a change, run
`sudo systemctl restart erevos-relay`; `journalctl -u erevos-relay` then shows
what it took. A value it cannot take stops it at start, with a line saying
which. The ones below are all optional.

| Setting | Unless set | What it does |
| --- | --- | --- |
| `EREVOS_RELAY_TOKENS` | none | The file of the phones' own tokens. |
| `EREVOS_RELAY_TTL_DAYS` | 14 | Days a message, or a chunk of a file, waits for its contact. |
| `EREVOS_RELAY_FILES_MB` | 1024 | Room for chunks of files, all together. |
| `EREVOS_RELAY_MAX_CONNECTIONS` | 512 | Connections at once. |
| `EREVOS_RELAY_MAX_TOKENLESS_CONNECTIONS` | 128 | Of those, connections at once on `/sealed` and `/files`. |
| `EREVOS_RELAY_PRIVATE_PEERS` | `deny` | `allow` lets forwards go to relays at private addresses. |
| `EREVOS_RELAY_MAX_QUEUES` | 100000 | Queues the relay holds. |
| `EREVOS_RELAY_QUEUE_DAYS` | 180 | Days a queue lasts once its phone stops using it. |
| `EREVOS_RELAY_LEND` | `off` | `on` lends places to phones that have no relay. |
| `EREVOS_RELAY_LEND_REVOKED` | `relay.key.revoked` beside the key | The file of revoked tickets. |

## Connections

Each connection costs the relay a thread, so it takes only so many at once:
512, both ways in together, of which at most 128 on the two paths that need no
token (`/sealed` and `/files`), so that connections from anyone cannot take
the places your own phones need. Past the first number a new connection is
closed as soon as it comes; past the second the relay answers it with 503 and
closes it. Phones try again later by themselves. Behind Caddy, every phone's
connection is one connection to the relay too.

A connection that sends nothing for five minutes is closed (a WebSocket is
told so first), and so is one whose WebSocket handshake is not over 30 seconds
after it came, or that takes nothing of a reply for a minute. The app never
leaves a connection quiet that long: most carry one request and close once it
is answered, a phone waiting for messages included (the relay waits then, up
to a minute, not the phone), and one that carries a file's chunks sends the
next as soon as it has it ready.

Raising `EREVOS_RELAY_MAX_CONNECTIONS` far, past a thousand or so, also needs
more open files than systemd gives a service by default. Run
`sudo systemctl edit erevos-relay` and put these two lines in what it opens;
an update leaves them in place:

    [Service]
    LimitNOFILE=8192

## Relays on a private network

A phone's message to a contact on another relay goes through this relay
(two-hop sending), and so does a file taken from another relay: the phone names
that relay, and this one connects to it. The relay connects only to addresses
on the public internet, not to itself, to the machines on its network, to
`169.254.169.254` where cloud providers keep their metadata, or to any other
private, shared, link-local, multicast or reserved address. It looks the name
up once and connects to the address it checked. A phone that names such an
address is told the other relay cannot be reached, as when it is down.

If you run relays that reach each other at private addresses, a home relay at
`192.168.x.x` and another on the same network say, add
`EREVOS_RELAY_PRIVATE_PEERS=allow`. Phones on the network may then have the
relay connect to anything on it, so only do that where you trust them.

## Queues

The relay holds at most 100000 queues (`EREVOS_RELAY_MAX_QUEUES`). Past that,
a phone that asks for a new one is told the relay is full, and nothing else
changes. A queue whose phone has not taken from it or waited on it for 180
days (`EREVOS_RELAY_QUEUE_DAYS`) expires, with whatever waits in it; messages
sent to it do not keep it, so nobody can keep a queue alive by sending to it.
The relay notes only the day a queue was last used, and writes it down at most
once a day. Queues already in the journal from before count as used the day
the new relay first starts.

The journal is now written so that an older relay does not take it: put back
in place of this one, an older relay stops at start with a line saying the
file is not a journal, rather than cutting it short. Going back means moving
the journal aside, which loses the queues in it.

## Lending places

A relay can lend places to phones that have no relay of their own. Off unless
you turn it on: add `EREVOS_RELAY_LEND=on` to `/etc/erevos-relay.env` and
restart. It needs the relay's key, which the installer sets up.

With lending on, a phone with the token asks the relay for a ticket and puts it
in its contact link. Whoever adds that contact with no relay of their own takes
a place here with it: a queue, and a lent token that goes where the token goes
from then on. A ticket lasts 30 days and gives at most 4 places. With a lent
token a phone may:

- use its queue as a phone with the token does, waiting on it included, and
  make 4 more queues a day;
- put 50 MB of files a day, and take, keep and delete chunks;
- send to contacts on this relay;
- ask for a push to a web app.

It may not have this relay connect anywhere for it (forward a message, take a
file from another relay, or hold a message for later), take credentials for
the call relay, or ask for tickets of its own. It reaches contacts on other
relays itself, at their `/sealed` and `/files` paths, as anyone may. How many
places each ticket
gave and what each place used today are kept in
`/var/lib/private/erevos-relay/relay.key.lent-counts`, so a restart does not
start them again.

A new relay key takes back every place lent, but also makes every phone that
sends through a second relay fetch the key again. To take back the places of
one ticket only, put its nonce on a line of
`/var/lib/private/erevos-relay/relay.key.revoked` (or the file named by
`EREVOS_RELAY_LEND_REVOKED`). The ticket is the `lend=` part of the contact
link: `ticket.` and then, in hex, 16 characters for when it expires, 32 for
its nonce and 32 for its code. The nonce is the 32 in the middle; the whole
ticket on a line works too. For example:

    echo 0123456789abcdef0123456789abcdef | sudo tee -a /var/lib/private/erevos-relay/relay.key.revoked

The relay reads the file again whenever it changes, with no restart, and
says in its log how many tickets it holds and any line it cannot read. From
the next connection on, the ticket takes no more places and every place it
gave is refused, as a wrong token is; a connection already open goes on until
it ends, five minutes after its last request at most. The queues those places
made stay until they expire unused. Lines that start with `#` are left out, so
you can note why. Taking a line out gives the places back. The relay must be
able to read the file: if its log says it cannot, run
`sudo chmod 644 /var/lib/private/erevos-relay/relay.key.revoked`.

## What the server can see

Whoever runs the server can see the IP addresses that connect, the queue ids,
when messages arrive and how big they are, and for files the number of chunks
and their size class. Messages and files are encrypted end to end, so the
server cannot read them. During a call it sees the IP addresses of the phones
in it, when the call starts and ends, and how much passes, but not what is
said or shown: calls are end-to-end encrypted too. With lending on, it can
also see how many places each ticket gave and how much each place used today,
but not which queue is whose. Run the relay on a server you control, and keep
its disk encrypted if the provider offers it.

## Remove

    sudo systemctl disable --now erevos-relay
    sudo rm /etc/systemd/system/erevos-relay.service /usr/local/bin/erevos-relay /etc/erevos-relay.env
    sudo rm -r /var/lib/erevos-relay /var/lib/private/erevos-relay
    sudo rm /etc/caddy/erevos-relay.caddy
    sudo systemctl disable --now coturn
    sudo rm /etc/turnserver.conf

Then delete the `import /etc/caddy/erevos-relay.caddy` line from
`/etc/caddy/Caddyfile` and run `sudo systemctl reload caddy`.
