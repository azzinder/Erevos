#!/bin/sh
# Copies the relay source of this checkout (its last commit) to a server and
# runs install.sh there. Run it from your own computer:
#
#   deploy/relay/deploy.sh user@server relay.example.org
#
# Leave out the domain to use <ip-with-dashes>.sslip.io.
#
# The server user must be root or able to use sudo.
set -eu

target=${1:-}
domain=${2:-auto}
case $domain in
'' | *[!A-Za-z0-9.-]*)
	echo "usage: deploy/relay/deploy.sh <user@server> [domain]" >&2
	exit 2
	;;
esac
if [ -z "$target" ]; then
	echo "usage: deploy/relay/deploy.sh <user@server> [domain]" >&2
	exit 2
fi
root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)

echo "== Copying the source to $target"
git -C "$root" archive --format=tar HEAD Cargo.toml Cargo.lock crates deploy |
	ssh "$target" 'rm -rf erevos-relay-src && mkdir erevos-relay-src && tar -x -C erevos-relay-src'

echo "== Installing on $target"
ssh -t "$target" "cd erevos-relay-src && if [ \"\$(id -u)\" -eq 0 ]; then sh deploy/relay/install.sh $domain; else sudo sh deploy/relay/install.sh $domain; fi"
