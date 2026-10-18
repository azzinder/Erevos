#!/bin/sh
# Builds a release of the Erevos web app from this checkout and signs it with the release key:
#
#   deploy/web/release.sh <private key file> <out folder>
#
# Needs Node, Rust with the wasm32-unknown-unknown target and wasm-bindgen-cli 0.2.129 (as
# app/scripts/build-web-core.mjs says). Then put it on the server with deploy/web/deploy.sh.
set -eu

key=${1:-}
out=${2:-}
if [ -z "$key" ] || [ -z "$out" ]; then
	echo "usage: deploy/web/release.sh <private key file> <out folder>" >&2
	exit 2
fi
root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
if [ -n "$(git -C "$root" status --porcelain -- app crates pwa Cargo.lock)" ]; then
	echo "The checkout has changes not committed: a release is made from a commit, so it can be built again." >&2
	exit 1
fi
web=$(mktemp -d)
trap 'rm -rf "$web"' EXIT

echo "== Building the core and the web build"
cd "$root/app"
npm ci --no-audit --no-fund
node scripts/build-web-core.mjs
EXPO_NO_TELEMETRY=1 npx expo export --platform web --output-dir "$web"

echo "== Making and signing the web app"
node "$root/pwa/build.mjs" "$web" "$out"
node "$root/pwa/release.mjs" sign "$out" "$key"
node "$root/pwa/release.mjs" verify "$out"
