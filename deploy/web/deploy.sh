#!/bin/sh

# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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

# A web app is made for one address and Element Call's second one (pwa/build.mjs): another
# address needs one made for it.
made_for=$(node -e "const r = JSON.parse(require('fs').readFileSync(process.argv[1])); console.log(r.origins ? r.origins.app : '')" "$release/release.json")
if [ -n "$made_for" ] && [ "$made_for" != "https://$domain" ]; then
	echo "This web app is made for $made_for, not https://$domain: make one for your addresses with deploy/web/release.sh and its --origin and --call-origin." >&2
	exit 1
fi

echo "== Copying it to $target"
tar -C "$release" -c . | ssh "$target" 'rm -rf erevos-web-release && mkdir erevos-web-release && tar -x -C erevos-web-release'
cat "$root/deploy/web/install.sh" | ssh "$target" 'cat > erevos-web-install.sh'

echo "== Serving it"
ssh -t "$target" "if [ \"\$(id -u)\" -eq 0 ]; then sh erevos-web-install.sh $files_only $domain erevos-web-release; else sudo sh erevos-web-install.sh $files_only $domain erevos-web-release; fi"

echo "== Checking the server"
sleep 3
node "$root/pwa/release.mjs" verify "https://$domain"
# The addresses an invite sent by text message and a contact link for a website open must give
# their pages, not the app.
for page in i c; do
	own=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$release/release.json')).files['/$page/index.html'] ?? '')")
	if [ -n "$own" ]; then
		if [ "$(curl -fsSL "https://$domain/$page" | sha256sum | cut -d' ' -f1)" = "$own" ]; then
			echo "OK: https://$domain/$page gives its page."
		else
			echo "WARNING: https://$domain/$page does not give its page ($page/index.html), so links to it open the app instead. The web server must serve /$page/ as a folder, as Apache and Caddy do with install.sh's settings, not send it to index.html." >&2
		fi
	fi
done

# Element Call's files are served only at its own address (pwa/README.md): the app's must not give
# them, so that no page of Element Call's ever runs where Erevos's keys are.
call=$(node -e "const r = JSON.parse(require('fs').readFileSync(process.argv[1])); console.log(r.origins ? r.origins.call : '')" "$release/release.json")
if [ -n "$call" ]; then
	if curl -fsS -o /dev/null "https://$domain/element-call/index.html" 2>/dev/null; then
		echo "WARNING: https://$domain/element-call/ gives Element Call's files. The web server must answer 404 there, as install.sh's settings do, and serve them only at $call." >&2
	else
		echo "OK: Element Call's files only at $call."
	fi
fi

version=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$release/release.json')).version)")
mkdir -p "$root/pwa/releases/$version"
cp "$release/release.json" "$release/release.sig" "$root/pwa/releases/$version/"
echo "Kept the signed list of release $version in pwa/releases/$version: commit it, so every release stays on record."
