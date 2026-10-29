#!/bin/sh
# Checks the Sailfish shell's same Wi-Fi link (src/lanlink.cpp, /__lan in src/shellserver.cpp)
# against desktop/lan.js on this computer, without a phone: builds the shell's server with Qt 5
# (qtbase5-dev; no Sailfish libraries), then links the two over real UDP broadcasts and TCP, as the
# page would (app/lib/radio.ts). Needs qmake, make, a C++ compiler and Node.
set -e
here=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
qmake "$here/lan-check.pro" >/dev/null
make -s >/dev/null
node "$here/check.cjs" "$work/lan-probe"
