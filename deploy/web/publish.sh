#!/bin/sh
# Serves the web app of a GitHub release (v2.0.0 and up, or v0.1.N before, made by
# .github/workflows/release.yml from the same commit as the other packages) from your own server. Run it on the computer that holds the
# release key:
#
#   deploy/web/publish.sh [--files-only] 2.0.0 user@server app.example.org [private key file]
#
# It downloads erevos-web.tar.gz from the public download repository, checks it against the
# release's SHA256SUMS and its number, signs it with the release key (default
# ~/.erevos/web-release.key; it asks for the passphrase) and puts it on the server with deploy.sh,
# which checks the server afterwards. Nothing is built here. --files-only goes to deploy.sh.
set -eu

files_only=
if [ "${1:-}" = --files-only ]; then
	files_only=--files-only
	shift
fi
version=${1:-}
target=${2:-}
domain=${3:-}
key=${4:-$HOME/.erevos/web-release.key}
case $version in
[0-9]*.[0-9]*.[0-9]*) ;;
*)
	echo "usage: deploy/web/publish.sh [--files-only] <version, e.g. 2.0.0> <user@server> <domain> [private key file]" >&2
	exit 2
	;;
esac
if [ -z "$target" ] || [ -z "$domain" ]; then
	echo "usage: deploy/web/publish.sh [--files-only] <version, e.g. 2.0.0> <user@server> <domain> [private key file]" >&2
	exit 2
fi
if [ ! -f "$key" ]; then
	echo "No release key at $key." >&2
	exit 1
fi
root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
repo=${EREVOS_RELEASES_REPO:-azzinder/erevos-releases}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "== Downloading the web app of v$version"
base=${EREVOS_RELEASES_URL:-https://github.com/$repo/releases/download}/v$version
curl -fsSL "$base/SHA256SUMS" -o "$work/SHA256SUMS"
curl -fL --progress-bar "$base/erevos-web.tar.gz" -o "$work/erevos-web.tar.gz"
if ! grep -q ' erevos-web.tar.gz$' "$work/SHA256SUMS"; then
	echo "v$version has no web app in its SHA256SUMS." >&2
	exit 1
fi
(cd "$work" && grep ' erevos-web.tar.gz$' SHA256SUMS | sha256sum -c -)
mkdir "$work/web"
tar -xzf "$work/erevos-web.tar.gz" -C "$work/web"
label=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1])).label ?? '')" "$work/web/release.json")
if [ "$label" != "$version" ]; then
	echo "The web app in v$version says it is ${label:-unnumbered}." >&2
	exit 1
fi

echo "== Signing it"
node "$root/pwa/release.mjs" sign "$work/web" "$key"
node "$root/pwa/release.mjs" verify "$work/web"

"$root/deploy/web/deploy.sh" $files_only "$target" "$domain" "$work/web"
