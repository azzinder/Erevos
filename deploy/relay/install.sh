#!/bin/sh
# Installs the Erevos relay behind Caddy, which gets a TLS certificate from
# Let's Encrypt, on a Debian or Ubuntu server. Run as root from an Erevos
# source tree:
#
#   sh deploy/relay/install.sh relay.example.org
#
# Without a domain (or with "auto") it uses <ip-with-dashes>.sslip.io, a name
# that points at this server's public IPv4 address by itself.
#
# The domain's DNS must already point at this server, and ports 80 and 443
# must be open to the internet, and for calls port 3478 (UDP and TCP) and the
# UDP ports 50000 to 50999. Running it again rebuilds and restarts the relay
# and keeps its token, its call relay secret and its queues.
set -eu

domain=${1:-auto}
if [ "$(id -u)" -ne 0 ]; then
	echo "install.sh: run this as root, for example with sudo" >&2
	exit 1
fi
if [ "$domain" = auto ]; then
	ip=$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p')
	case $ip in
	'' | 10.* | 192.168.* | 172.1[6-9].* | 172.2[0-9].* | 172.3[01].* | 100.6[4-9].* | 100.[7-9][0-9].* | 100.1[01][0-9].* | 100.12[0-7].*)
		echo "install.sh: this server has no public IPv4 address of its own. Give a domain: sh deploy/relay/install.sh relay.example.org" >&2
		exit 1
		;;
	esac
	domain=$(printf '%s' "$ip" | tr . -).sslip.io
	echo "== Using $domain"
fi
case $domain in
'' | *[!A-Za-z0-9.-]*)
	echo "usage: sh deploy/relay/install.sh [domain]" >&2
	exit 2
	;;
esac
if ! getent hosts "$domain" >/dev/null; then
	echo "install.sh: $domain does not resolve. Point its DNS A record at this server first." >&2
	exit 1
fi
here=$(cd "$(dirname "$0")" && pwd)
src=$(cd "$here/../.." && pwd)

echo "== Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q build-essential curl ca-certificates coturn
if ! apt-cache show caddy >/dev/null 2>&1; then
	# Older releases (Ubuntu 22.04, Debian 11) have no caddy package: use Caddy's own.
	apt-get install -y -q gnupg
	curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key |
		gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt >/etc/apt/sources.list.d/caddy-stable.list
	apt-get update -q
fi
apt-get install -y -q caddy

echo "== Building the relay"
# The distribution's Rust is often too old for the dependencies, so use rustup.
if [ ! -x "$HOME/.cargo/bin/cargo" ]; then
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi
# A small server runs out of memory while compiling, so lend it swap until the build ends.
swap=
if [ "$(sed -n 's/^MemTotal: *\([0-9]*\).*/\1/p' /proc/meminfo)" -lt 3000000 ] && [ ! -e /erevos-build.swap ]; then
	if fallocate -l 2G /erevos-build.swap 2>/dev/null || dd if=/dev/zero of=/erevos-build.swap bs=1M count=2048 status=none; then
		chmod 600 /erevos-build.swap
		mkswap /erevos-build.swap >/dev/null && swapon /erevos-build.swap && swap=/erevos-build.swap
	fi
fi
(cd "$src" && "$HOME/.cargo/bin/cargo" build --release --locked -p erevos-relay)
if [ -n "$swap" ]; then
	swapoff "$swap" && rm -f "$swap"
fi
install -m 0755 "$src/target/release/erevos-relay" /usr/local/bin/erevos-relay

echo "== Token"
if [ ! -s /etc/erevos-relay.env ]; then
	token=$(od -An -tx1 -N32 /dev/urandom | tr -d ' \n')
	(umask 077 && printf 'EREVOS_RELAY_TOKEN=%s\n' "$token" >/etc/erevos-relay.env)
fi
if ! grep -q '^EREVOS_TURN_SECRET=' /etc/erevos-relay.env; then
	secret=$(od -An -tx1 -N32 /dev/urandom | tr -d ' \n')
	printf 'EREVOS_TURN_SECRET=%s\n' "$secret" >>/etc/erevos-relay.env
fi
sed -i '/^EREVOS_TURN_URLS=/d' /etc/erevos-relay.env
printf 'EREVOS_TURN_URLS=turn:%s:3478,turn:%s:3478?transport=tcp\n' "$domain" "$domain" >>/etc/erevos-relay.env
chmod 600 /etc/erevos-relay.env

echo "== Call relay (coturn)"
# Calls go through it, so neither phone learns the other's address. It hands
# on only what the phones encrypted end to end, and logs nothing.
secret=$(sed -n 's/^EREVOS_TURN_SECRET=//p' /etc/erevos-relay.env)
conf=/etc/turnserver.conf
if [ -f "$conf" ] && ! grep -q 'Written by the Erevos relay installer' "$conf"; then
	mv "$conf" "$conf.orig"
fi
(umask 027 && sed -e "s/@SECRET@/$secret/" -e "s/@DOMAIN@/$domain/" "$here/turnserver.conf" >"$conf")
chgrp turnserver "$conf" 2>/dev/null || true
if [ -f /etc/default/coturn ]; then
	sed -i 's/^#*TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
fi
systemctl enable coturn
systemctl restart coturn

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
	ufw allow 3478/udp
	ufw allow 3478/tcp
	ufw allow 50000:50999/udp
fi

echo
echo "Done. Relay address for the phones: wss://$domain"
echo "Token for the phones: sudo cat /etc/erevos-relay.env"
echo "Calls go through the call relay on port 3478; the phones get its address from the relay."
systemctl --no-pager --lines=5 status erevos-relay coturn || true
