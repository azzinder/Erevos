#!/bin/sh
# Puts a signed release of the Erevos web app on a server and serves it there (install.sh). Run it
# from your own computer, after deploy/web/release.sh:
#
#   deploy/web/deploy.sh [--files-only] user@server app.example.org <release folder>
#
# --files-only leaves the server's own web server as it is (install.sh says what it must serve).
#
# It checks the release against pwa/release-key.pub before sending it, and the server after.
set -eu

files_only=
if [ "${1:-}" = --files-only ]; then
	files_only=--files-only
	shift
fi
target=${1:-}
domain=${2:-}
release=${3:-}
case $domain in
'' | *[!A-Za-z0-9.-]*)
	echo "usage: deploy/web/deploy.sh [--files-only] <user@server> <domain> <release folder>" >&2
	exit 2
	;;
esac
if [ -z "$target" ] || [ -z "$release" ]; then
	echo "usage: deploy/web/deploy.sh [--files-only] <user@server> <domain> <release folder>" >&2
	exit 2
fi
root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)

echo "== Checking the release"
node "$root/pwa/release.mjs" verify "$release"

echo "== Copying it to $target"
tar -C "$release" -c . | ssh "$target" 'rm -rf erevos-web-release && mkdir erevos-web-release && tar -x -C erevos-web-release'
cat "$root/deploy/web/install.sh" | ssh "$target" 'cat > erevos-web-install.sh'

echo "== Serving it"
ssh -t "$target" "if [ \"\$(id -u)\" -eq 0 ]; then sh erevos-web-install.sh $files_only $domain erevos-web-release; else sudo sh erevos-web-install.sh $files_only $domain erevos-web-release; fi"

echo "== Checking the server"
sleep 3
node "$root/pwa/release.mjs" verify "https://$domain"
# The address an invite sent by text message opens must give the invite page, not the app.
invite=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$release/release.json')).files['/i/index.html'] ?? '')")
if [ -n "$invite" ]; then
	if [ "$(curl -fsSL "https://$domain/i" | sha256sum | cut -d' ' -f1)" = "$invite" ]; then
		echo "OK: https://$domain/i gives the invite page."
	else
		echo "WARNING: https://$domain/i does not give the invite page (i/index.html), so invites sent by text message open the app instead. The web server must serve /i/ as a folder, as Apache and Caddy do with install.sh's settings, not send it to index.html." >&2
	fi
fi

version=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$release/release.json')).version)")
mkdir -p "$root/pwa/releases/$version"
cp "$release/release.json" "$release/release.sig" "$root/pwa/releases/$version/"
echo "Kept the signed list of release $version in pwa/releases/$version: commit it, so every release stays on record."
