#!/bin/sh
# Installs the Erevos relay behind Caddy, which gets a TLS certificate from
# Let's Encrypt, on a Debian or Ubuntu server. Run as root from an Erevos
# source tree:
#
#   sh deploy/relay/install.sh relay.example.org
#
# The domain's DNS must already point at this server, and ports 80 and 443
# must be open to the internet. Running it again rebuilds and restarts the
# relay and keeps its token and its queues.
set -eu

domain=${1:-}
case $domain in
'' | *[!A-Za-z0-9.-]*)
	echo "usage: sh deploy/relay/install.sh <domain>" >&2
	exit 2
	;;
esac
if [ "$(id -u)" -ne 0 ]; then
	echo "install.sh: run this as root, for example with sudo" >&2
	exit 1
fi
if ! getent hosts "$domain" >/dev/null; then
	echo "install.sh: $domain does not resolve. Point its DNS A record at this server first." >&2
	exit 1
fi
here=$(cd "$(dirname "$0")" && pwd)
src=$(cd "$here/../.." && pwd)

echo "== Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q build-essential curl caddy

echo "== Building the relay"
# The distribution's Rust is often too old for the dependencies, so use rustup.
if [ ! -x "$HOME/.cargo/bin/cargo" ]; then
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi
(cd "$src" && "$HOME/.cargo/bin/cargo" build --release --locked -p erevos-relay)
install -m 0755 "$src/target/release/erevos-relay" /usr/local/bin/erevos-relay

echo "== Token"
if [ ! -s /etc/erevos-relay.env ]; then
	token=$(od -An -tx1 -N32 /dev/urandom | tr -d ' \n')
	(umask 077 && printf 'EREVOS_RELAY_TOKEN=%s\n' "$token" >/etc/erevos-relay.env)
fi
chmod 600 /etc/erevos-relay.env

echo "== Service"
install -m 0644 "$here/erevos-relay.service" /etc/systemd/system/erevos-relay.service
systemctl daemon-reload
systemctl enable erevos-relay
systemctl restart erevos-relay

echo "== TLS with Caddy"
site=/etc/caddy/erevos-relay.caddy
printf '# Written by the Erevos relay installer.\n%s {\n\treverse_proxy 127.0.0.1:7879\n}\n' "$domain" >"$site"
caddyfile=/etc/caddy/Caddyfile
line="import $site"
if grep -q 'The Caddyfile is an easy way to configure your Caddy web server' "$caddyfile" 2>/dev/null; then
	# The file the package ships, which only serves a placeholder page on port 80.
	mv "$caddyfile" "$caddyfile.orig"
	printf '%s\n' "$line" >"$caddyfile"
elif ! grep -qxF "$line" "$caddyfile" 2>/dev/null; then
	printf '\n%s\n' "$line" >>"$caddyfile"
fi
caddy validate --adapter caddyfile --config "$caddyfile"
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then
	echo "== Firewall"
	ufw allow 80/tcp
	ufw allow 443/tcp
fi

echo
echo "Done. Relay address for the phones: wss://$domain"
echo "Token for the phones: sudo cat /etc/erevos-relay.env"
systemctl --no-pager --lines=5 status erevos-relay || true
