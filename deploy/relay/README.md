# Running the relay on a server

This sets up the relay on a Debian or Ubuntu server so phones can reach it from
anywhere, as `wss://<domain>`:

- The relay listens on `127.0.0.1` only. Caddy sits in front of it, gets a TLS
  certificate from Let's Encrypt and renews it.
- A random token is required on every connection.
- Queues and waiting messages are kept on disk, so a restart or a reboot loses
  nothing.
- No request is logged, by the relay or by Caddy.

## What you need

- A server (VPS) running Debian 12 or later, or Ubuntu 22.04 or later, with a
  public IP address and SSH access as root or as a user who can use `sudo`.
- A domain or subdomain whose DNS A record points at that IP address. Without
  one, `<ip-with-dashes>.sslip.io` names the same address (for `203.0.113.7`,
  `203-0-113-7.sslip.io`). Let's Encrypt usually issues certificates for those
  names, but its limits are shared with everyone who uses them.
- Ports 80 and 443 open to the internet, including in the provider's firewall
  if it has one. Port 80 is only used to get the certificate.

## Install or update

From your checkout, on the commit you want to run:

    deploy/relay/deploy.sh root@203.0.113.7 relay.example.org

This copies the source to the server and runs `install.sh` there, which
installs Caddy and Rust, builds the relay, creates the token and starts both
services. Run it again to update. The token and the queues are kept.

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
- `/etc/erevos-relay.env`: the token, readable by root only.
- `/var/lib/erevos-relay/queues.journal`: queues and waiting messages. The
  service runs as a temporary user, so systemd keeps the file under
  `/var/lib/private/erevos-relay/`.
- `/var/lib/erevos-relay/relay.key`: the relay's key for sealed sends from
  other relays (two-hop sending), made on first start, in the same private
  place. Keep it: phones that send through a second relay seal to it, and a
  new key only means they fetch it again.
- `/etc/caddy/erevos-relay.caddy`: the Caddy site, imported from
  `/etc/caddy/Caddyfile`. If that file was the one the package ships, the
  original is kept as `Caddyfile.orig`.

`journalctl -u erevos-relay` shows the relay's start-up lines and errors.
`systemctl status erevos-relay caddy` shows whether both run.

## What the server can see

Whoever runs the server can see the IP addresses that connect, the queue ids,
when messages arrive and how big they are. The chat does not encrypt messages
end to end yet, so the server can also read them. Until it does, run the relay
only on a server you control, and keep its disk encrypted if the provider
offers it.

## Remove

    sudo systemctl disable --now erevos-relay
    sudo rm /etc/systemd/system/erevos-relay.service /usr/local/bin/erevos-relay /etc/erevos-relay.env
    sudo rm -r /var/lib/erevos-relay /var/lib/private/erevos-relay
    sudo rm /etc/caddy/erevos-relay.caddy

Then delete the `import /etc/caddy/erevos-relay.caddy` line from
`/etc/caddy/Caddyfile` and run `sudo systemctl reload caddy`.
