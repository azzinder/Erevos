#!/bin/sh

# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# Serves the Erevos web app (pwa/) behind Caddy, which gets a TLS certificate from Let's Encrypt,
# on a Debian or Ubuntu server. Run as root, with a signed release in a folder:
#
#   sh install.sh [--files-only] app.example.org /path/to/release
#
# With --files-only it only puts the release in place, for a server whose own web server (Apache,
# nginx) already serves /var/www/erevos-web/current for that address with the headers below.
#
# A release with Element Call (Matrix calls) names a second address in release.json (origins.call,
# pwa/build.mjs --call-origin), which needs its own DNS name too: Element Call's frame comes from
# there, apart from the app. It serves the same folder, but only /element-call/, /sw.js,
# /release.json and /release.sig, with the second set of headers below; the app's address never
# serves /element-call/. Any other web server must do the same.
#
# Each release goes to its own folder under /var/www/erevos-web, and a link, current, points at
# the one served, so a release is switched whole. The server holds no key: it only gives out the
# files and their signature, which every installed app checks.
set -eu

files_only=
if [ "${1:-}" = --files-only ]; then
	files_only=1
	shift
fi
domain=${1:-}
release=${2:-}
case $domain in
'' | *[!A-Za-z0-9.-]*)
	echo "usage: sh install.sh [--files-only] <domain> <release folder>" >&2
	exit 2
	;;
esac
if [ ! -f "$release/release.json" ] || [ ! -f "$release/release.sig" ] || [ ! -f "$release/sw.js" ]; then
	echo "$release is not a signed Erevos web release (release.json, release.sig, sw.js)." >&2
	exit 2
fi
if [ "$(id -u)" -ne 0 ]; then
	echo "Run as root." >&2
	exit 1
fi

version=$(sed -n 's/^ *"version": *\([0-9]*\),*$/\1/p' "$release/release.json" | head -n 1)
# Element Call's address, when the release has one: its host.
call=$(sed -n 's/^ *"call": *"https:\/\/\([A-Za-z0-9.-]*\)",*$/\1/p' "$release/release.json" | head -n 1)
case $version in
'' | *[!0-9]*)
	echo "No version in $release/release.json." >&2
	exit 2
	;;
esac

if [ -z "$files_only" ]; then
	echo "== Caddy"
	if ! command -v caddy >/dev/null 2>&1; then
		apt-get update -q
		apt-get install -y -q caddy
	fi
fi

echo "== Release $version"
base=/var/www/erevos-web
mkdir -p "$base"
rm -rf "$base/$version.new"
cp -r "$release" "$base/$version.new"
chmod -R a+rX,go-w "$base/$version.new"
rm -rf "$base/$version"
mv "$base/$version.new" "$base/$version"
ln -sfn "$version" "$base/current.new"
mv -T "$base/current.new" "$base/current"
# The newest three are kept, to go back to by hand.
ls -1 "$base" | grep -E '^[0-9]+$' | sort -n | head -n -3 | while read -r old; do rm -rf "${base:?}/$old"; done

if [ -n "$files_only" ]; then
	echo "== Done: $base/current is release $version; your web server serves it at https://$domain${call:+, and Element Call at https://$call}."
	exit 0
fi

# The app may show Element Call's frame, and lend it the camera and the microphone.
frames=
media="camera=(self), microphone=(self)"
if [ -n "$call" ]; then
	frames="; frame-src https://$call"
	media="camera=(self \"https://$call\"), microphone=(self \"https://$call\")"
fi

echo "== The site"
site=/etc/caddy/erevos-web.caddy
cat >"$site" <<CADDY
# Written by the Erevos web app installer (deploy/web/install.sh).
$domain {
	root * $base/current
	header {
		Strict-Transport-Security "max-age=63072000"
		Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' blob: https: ws: wss:; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'$frames"
		X-Content-Type-Options nosniff
		Referrer-Policy no-referrer
		Cross-Origin-Opener-Policy same-origin
		Cross-Origin-Resource-Policy same-origin
		Permissions-Policy "$media, geolocation=(), payment=(), usb=()"
		-Server
	}
	@fresh path /sw.js /boot.js /release.json /release.sig /android-update.json /index.html / /i /i/ /i/index.html /c /c/ /c/index.html
	header @fresh Cache-Control "no-cache"
	@call path /element-call /element-call/*
	respond @call 404
	try_files {path} {path}/index.html /index.html
	file_server
}
CADDY
if [ -n "$call" ]; then
	cat >>"$site" <<CADDY

# Element Call, for Matrix calls, in the app's frame: only its files, the release and the worker.
$call {
	root * $base/current
	header {
		Strict-Transport-Security "max-age=63072000"
		Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' blob: data: https: wss:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors https://$domain"
		X-Content-Type-Options nosniff
		Referrer-Policy no-referrer
		Cross-Origin-Resource-Policy same-origin
		Permissions-Policy "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()"
		-Server
	}
	@served path /element-call/* /sw.js /release.json /release.sig
	@fresh path /sw.js /release.json /release.sig /element-call/start.html /element-call/start.js /element-call/index.html /element-call/erevos-call.js /element-call/config.json
	header @fresh Cache-Control "no-cache"
	handle @served {
		file_server
	}
	handle {
		respond 404
	}
}
CADDY
fi
caddyfile=/etc/caddy/Caddyfile
line="import $site"
if grep -q 'The Caddyfile is an easy way to configure your Caddy web server' "$caddyfile" 2>/dev/null; then
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

echo "== Done: https://$domain serves release $version${call:+, and https://$call its Element Call}."
