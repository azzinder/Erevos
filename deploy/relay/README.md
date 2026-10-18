# Running the relay on a server

This sets up the relay on a Debian or Ubuntu server so phones can reach it from
anywhere, as `wss://<domain>`:

- The relay listens on `127.0.0.1` only. Caddy sits in front of it, gets a TLS
  certificate from Let's Encrypt and renews it.
- A random token is required on every connection.
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

Every phone uses the same address and token. Do not post the token where
others can read it.

To change the token, run `sudo rm /etc/erevos-relay.env` on the server, run
the install again, and type the new token into every phone.

## Where things are

- `/usr/local/bin/erevos-relay`: the relay.
- `/etc/systemd/system/erevos-relay.service`: the service.
- `/etc/erevos-relay.env`: the token, and the secret the relay shares with the
  call relay, readable by root only.
- `/etc/turnserver.conf`: the call relay's settings, with that secret. If the
  file was there before, the original is kept as `turnserver.conf.orig`.
- `/var/lib/erevos-relay/queues.journal`: queues and waiting messages. A
  message nobody takes expires after 14 days (`EREVOS_RELAY_TTL_DAYS` in the
  service changes that), and only the hour it came is kept. The
  service runs as a temporary user, so systemd keeps the file under
  `/var/lib/private/erevos-relay/`.
- `/var/lib/erevos-relay/relay.key`: the relay's key for sealed sends from
  other relays (two-hop sending), made on first start, in the same private
  place. Keep it: phones that send through a second relay seal to it, and a
  new key only means they fetch it again.
- `/var/lib/erevos-relay/files/`: the chunks of photos and files that phones
  send, encrypted on the phone, one file per chunk, in the same private place.
  The contact deletes them once it has them; the rest expire like messages.
  They may take 1024 MB together (`EREVOS_RELAY_FILES_MB` in the service
  changes that); past it, phones are told the relay is full.
- `/etc/caddy/erevos-relay.caddy`: the Caddy site, imported from
  `/etc/caddy/Caddyfile`. If that file was the one the package ships, the
  original is kept as `Caddyfile.orig`.

`journalctl -u erevos-relay` shows the relay's start-up lines and errors.
`systemctl status erevos-relay caddy coturn` shows whether all three run.

## What the server can see

Whoever runs the server can see the IP addresses that connect, the queue ids,
when messages arrive and how big they are, and for files the number of chunks
and their size class. Messages and files are encrypted end to end, so the
server cannot read them. During a call it sees the IP addresses of the phones
in it, when the call starts and ends, and how much passes, but not what is
said or shown: calls are end-to-end encrypted too. Run the relay on a server
you control, and keep its disk encrypted if the provider offers it.

## Remove

    sudo systemctl disable --now erevos-relay
    sudo rm /etc/systemd/system/erevos-relay.service /usr/local/bin/erevos-relay /etc/erevos-relay.env
    sudo rm -r /var/lib/erevos-relay /var/lib/private/erevos-relay
    sudo rm /etc/caddy/erevos-relay.caddy
    sudo systemctl disable --now coturn
    sudo rm /etc/turnserver.conf

Then delete the `import /etc/caddy/erevos-relay.caddy` line from
`/etc/caddy/Caddyfile` and run `sudo systemctl reload caddy`.
